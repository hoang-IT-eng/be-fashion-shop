import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { ChatInputDto } from './dto/chat-input.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { StyleProfile } from './entities/style-profile.entity';
import { GeminiClientService } from './gemini-client.service';
import { AiChatResponse, ProductSearchFilters } from './interfaces/ai-chat.interface';

@Injectable()
export class AiChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(StyleProfile)
    private readonly styleProfileRepo: Repository<StyleProfile>,
    private readonly productsService: ProductsService,
    private readonly geminiClientService: GeminiClientService,
  ) {}

  async processMessage(params: {
    userId?: number;
    guestId?: string;
    input: ChatInputDto;
  }): Promise<AiChatResponse> {
    const session = await this.resolveSession({
      sessionId: params.input.sessionId,
      userId: params.userId,
      guestId: params.guestId,
    });

    await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        role: 'user',
        content: params.input.message,
        metadata: null,
      }),
    );

    const isShoppingIntent =
      await this.geminiClientService.detectShoppingIntent(params.input.message);
    let metadata: Record<string, unknown>;
    let response: AiChatResponse;

    if (!isShoppingIntent) {
      const message = await this.geminiClientService.generateGeneralMessage(
        params.input.message,
      );
      metadata = { type: 'text' };
      response = {
        type: 'text',
        sessionId: session.id,
        message,
      };
    } else {
      const styleProfile = params.userId
        ? await this.styleProfileRepo.findOneBy({ userId: params.userId })
        : null;
      const extractedFilters = await this.geminiClientService.extractProductFilters(
        params.input.message,
        styleProfile,
      );
      const mergedFilters = this.mergeFilters(extractedFilters, styleProfile);

      const products = await this.productsService.searchForAi({
        category: mergedFilters.category,
        color: mergedFilters.color,
        style: mergedFilters.style,
        minPrice: mergedFilters.minPrice,
        maxPrice: mergedFilters.maxPrice,
        keywords: mergedFilters.keywords,
        limit: 20,
      });

      if (params.userId) {
        await this.upsertStyleProfile(params.userId, mergedFilters);
      }

      const message =
        await this.geminiClientService.generateRecommendationMessage(
          params.input.message,
          products,
        );
      metadata = {
        type: 'product_recommendations',
        filters: mergedFilters,
        productIds: products.map((product) => product.id),
      };
      response = {
        type: 'product_recommendations',
        sessionId: session.id,
        message,
        products,
        filters: mergedFilters,
      };
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        role: 'assistant',
        content: response.message,
        metadata,
      }),
    );

    return response;
  }

  private async resolveSession(params: {
    sessionId?: string;
    userId?: number;
    guestId?: string;
  }): Promise<ChatSession> {
    if (params.sessionId) {
      const existing = await this.sessionRepo.findOneBy({ id: params.sessionId });
      if (existing) return existing;
    }

    const created = this.sessionRepo.create({
      userId: params.userId ?? null,
      guestId: params.userId ? null : (params.guestId ?? null),
      isGuest: !params.userId,
    });

    return this.sessionRepo.save(created);
  }

  private mergeFilters(
    extracted: ProductSearchFilters,
    styleProfile?: StyleProfile | null,
  ): ProductSearchFilters {
    const categories = extracted.categories ?? styleProfile?.categories ?? [];
    const colors = extracted.colors ?? styleProfile?.colors ?? [];
    const keywords = extracted.keywords ?? styleProfile?.keywords ?? [];

    return {
      ...extracted,
      category: extracted.category ?? categories[0],
      color: extracted.color ?? colors[0],
      style: extracted.style ?? styleProfile?.style ?? undefined,
      categories,
      colors,
      keywords,
    };
  }

  private async upsertStyleProfile(
    userId: number,
    filters: ProductSearchFilters,
  ): Promise<void> {
    const existing = await this.styleProfileRepo.findOneBy({ userId });
    const profile = existing ?? this.styleProfileRepo.create({ userId });

    profile.style = filters.style ?? profile.style ?? null;
    profile.colors = this.mergeArray(profile.colors, filters.colors, filters.color);
    profile.categories = this.mergeArray(
      profile.categories,
      filters.categories,
      filters.category,
    );
    profile.keywords = this.mergeArray(profile.keywords, filters.keywords);

    await this.styleProfileRepo.save(profile);
  }

  private mergeArray(
    current: string[] | null,
    incoming?: string[],
    single?: string,
  ): string[] {
    const merged = new Set<string>(current ?? []);
    for (const item of incoming ?? []) {
      if (item.trim()) merged.add(item.trim());
    }
    if (single?.trim()) merged.add(single.trim());
    return Array.from(merged).slice(0, 20);
  }
}

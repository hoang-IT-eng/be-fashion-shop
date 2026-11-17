import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatInputDto } from './dto/chat-input.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { StyleProfile } from './entities/style-profile.entity';
import { GeminiClientService } from './gemini-client.service';
import { HybridRagRouterService } from './hybrid-rag-router.service';
import {
  AiChatResponse,
  GenerativeUiBlock,
  ProductSearchFilters,
} from './interfaces/ai-chat.interface';
import { Product } from '../products/product.entity';

@Injectable()
export class AiChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(StyleProfile)
    private readonly styleProfileRepo: Repository<StyleProfile>,
    private readonly geminiClientService: GeminiClientService,
    private readonly hybridRagRouter: HybridRagRouterService,
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

    const trimmedMessage = params.input.message.trim();

    await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        role: 'user',
        content: trimmedMessage,
        metadata: null,
      }),
    );

    const styleProfile = params.userId
      ? await this.styleProfileRepo.findOneBy({ userId: params.userId })
      : null;

    const hasGemini = this.geminiClientService.hasValidApiKey();
    let engine: 'gemini-tools' | 'hybrid-local-rag' = 'hybrid-local-rag';
    let toolsInvoked: string[] = [];
    let uiBlocks: GenerativeUiBlock[] = [];
    let products: Product[] = [];
    let filters: ProductSearchFilters = {};
    let replyMessage = '';

    // Attempt Gemini Level-3 Function Calling when key is configured
    if (hasGemini) {
      const planned = await this.geminiClientService.planToolCall(
        trimmedMessage,
        styleProfile,
      );
      if (planned) {
        engine = 'gemini-tools';
        toolsInvoked = [planned.name];

        if (planned.name === 'search_products_hybrid') {
          filters = {
            category: planned.args.category,
            color: planned.args.color,
            size: planned.args.size,
            minPrice: planned.args.minPrice,
            maxPrice: planned.args.maxPrice,
          };
          const res = await this.hybridRagRouter.searchProductsHybrid(
            planned.args.query || trimmedMessage,
            filters,
            4,
          );
          products = res.products;
          if (products.length > 0) {
            uiBlocks.push(
              this.hybridRagRouter.buildProductCardsBlock(
                'ARCHIVAL SELECTION',
                products,
                res.scores,
              ),
            );
          }
          replyMessage = await this.geminiClientService.synthesizeStylistReply(
            trimmedMessage,
            JSON.stringify(
              products.map((p) => ({ name: p.name, price: Number(p.price) })),
            ),
            `Curated ${products.length} pieces matching your brief.`,
          );
        } else if (planned.name === 'check_variant_stock') {
          const stockInfo = await this.hybridRagRouter.checkVariantStock(
            planned.args.productQuery,
            planned.args.size,
          );
          const res = await this.hybridRagRouter.searchProductsHybrid(
            planned.args.productQuery,
            { size: planned.args.size },
            3,
          );
          products = res.products;
          if (products.length > 0) {
            uiBlocks.push(
              this.hybridRagRouter.buildProductCardsBlock(
                'LIVE SKU STOCK VERIFICATION',
                products,
                res.scores,
              ),
            );
          }
          replyMessage = await this.geminiClientService.synthesizeStylistReply(
            trimmedMessage,
            JSON.stringify(stockInfo),
            `Verified live variant stock across ${products.length} archive items.`,
          );
        } else if (planned.name === 'get_live_auctions') {
          const lots = await this.hybridRagRouter.getLiveAuctions();
          if (lots.length > 0) {
            uiBlocks.push({
              kind: 'auction_card',
              title: 'LIVE GRAIL AUCTIONS',
              lots,
            });
          }
          replyMessage = await this.geminiClientService.synthesizeStylistReply(
            trimmedMessage,
            JSON.stringify(lots),
            `${lots.length} Grail auction lots are currently live.`,
          );
        } else if (planned.name === 'get_order_status') {
          const order = await this.hybridRagRouter.getOrderStatus({
            orderId: planned.args.orderId,
            userId: params.userId,
          });
          if (order) {
            uiBlocks.push({
              kind: 'order_stepper',
              title: `ORDER #${order.id} TELEMETRY`,
              order,
            });
          }
          replyMessage = await this.geminiClientService.synthesizeStylistReply(
            trimmedMessage,
            JSON.stringify(order),
            order
              ? `Order #${order.id} is currently ${order.status.toUpperCase()}.`
              : 'Specify your order number or sign in to view live order telemetry.',
          );
        } else if (planned.name === 'validate_coupon') {
          const coupon = await this.hybridRagRouter.validateCoupon(
            planned.args.code,
            planned.args.subtotal,
          );
          replyMessage = await this.geminiClientService.synthesizeStylistReply(
            trimmedMessage,
            JSON.stringify(coupon),
            coupon.message,
          );
        }
      }
    }

    // Zero-Key Smart Local Hybrid BM25 + Intent Router (or fallback if Gemini didn't pick a tool)
    if (!replyMessage) {
      const localResult = await this.hybridRagRouter.routeAndExecute({
        message: trimmedMessage,
        userId: params.userId,
        styleProfile,
      });
      replyMessage = localResult.message;
      toolsInvoked = localResult.toolsInvoked;
      uiBlocks = localResult.uiBlocks;
      products = localResult.products;
      filters = localResult.filters;
    }

    if (
      params.userId &&
      (filters.color || filters.category || filters.keywords?.length)
    ) {
      await this.upsertStyleProfile(params.userId, filters);
    }

    const responseType =
      products.length > 0
        ? 'product_recommendations'
        : uiBlocks.length > 0
          ? 'generative_ui'
          : 'text';

    const response: AiChatResponse = {
      type: responseType,
      sessionId: session.id,
      message: replyMessage,
      engine,
      toolsInvoked,
      uiBlocks,
      products: products.length > 0 ? products : undefined,
      filters,
    };

    await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        role: 'assistant',
        content: response.message,
        metadata: {
          type: response.type,
          engine,
          toolsInvoked,
          uiBlocksCount: uiBlocks.length,
          productIds: products.map((p) => p.id),
        },
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
      try {
        const existing = await this.sessionRepo.findOneBy({
          id: params.sessionId,
        });
        if (existing) return existing;
      } catch {
        // Ignore non-UUID client session IDs and issue a clean DB session
      }
    }

    const created = this.sessionRepo.create({
      userId: params.userId ?? null,
      guestId: params.userId ? null : (params.guestId ?? null),
      isGuest: !params.userId,
    });

    return this.sessionRepo.save(created);
  }

  private async upsertStyleProfile(
    userId: number,
    filters: ProductSearchFilters,
  ): Promise<void> {
    const existing = await this.styleProfileRepo.findOneBy({ userId });
    const profile = existing ?? this.styleProfileRepo.create({ userId });

    profile.style = filters.style ?? profile.style ?? null;
    profile.colors = this.mergeArray(
      profile.colors,
      filters.colors,
      filters.color,
    );
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

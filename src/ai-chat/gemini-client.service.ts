import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Product } from '../products/product.entity';
import { ProductSearchFilters } from './interfaces/ai-chat.interface';
import { StyleProfile } from './entities/style-profile.entity';

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);
  private readonly genAi: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ??
      this.configService.get<string>('gemini_api');
    if (!apiKey) {
      throw new Error(
        'Missing GEMINI_API_KEY. Please set this variable in your environment.',
      );
    }

    this.genAi = new GoogleGenerativeAI(apiKey);
    this.modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-1.5-flash',
    );
  }

  async extractProductFilters(
    userMessage: string,
    styleProfile?: StyleProfile | null,
  ): Promise<ProductSearchFilters> {
    const model = this.genAi.getGenerativeModel({
      model: this.modelName,
      tools: [
        {
          functionDeclarations: [
            {
              name: 'searchProducts',
              description:
                'Extract shopping filters from natural language request',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  category: { type: SchemaType.STRING },
                  color: { type: SchemaType.STRING },
                  style: { type: SchemaType.STRING },
                  minPrice: { type: SchemaType.NUMBER },
                  maxPrice: { type: SchemaType.NUMBER },
                  keywords: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  categories: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  colors: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                },
              },
            },
          ],
        },
      ],
    });

    const profileContext = styleProfile
      ? `Saved style profile: ${JSON.stringify({
          style: styleProfile.style,
          colors: styleProfile.colors ?? [],
          categories: styleProfile.categories ?? [],
          keywords: styleProfile.keywords ?? [],
        })}`
      : 'No saved style profile';

    const prompt = [
      'You are a shopping intent parser for a fashion e-commerce chat.',
      'Call the function searchProducts only when the user is asking to find, suggest, compare, or buy products.',
      'Only include filters that can be inferred confidently from user input.',
      profileContext,
      `User message: ${userMessage}`,
    ].join('\n');

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const parts = result.response.candidates?.[0]?.content?.parts ?? [];
      const functionCallPart = parts.find((part) =>
        Boolean((part as { functionCall?: unknown }).functionCall),
      ) as { functionCall?: { args?: Record<string, unknown> } } | undefined;

      const args = functionCallPart?.functionCall?.args ?? {};
      return this.normalizeFilters(args);
    } catch (error) {
      this.logger.error('Failed to parse filters with Gemini', error);
      return {};
    }
  }

  async generateRecommendationMessage(
    userMessage: string,
    products: Product[],
  ): Promise<string> {
    if (products.length === 0) {
      return 'Mình chưa tìm thấy sản phẩm phù hợp. Bạn thử nới màu, kiểu hoặc khoảng giá nhé!';
    }

    const productSummary = products.slice(0, 5).map((product) => ({
      name: product.name,
      category: product.category,
      price: Number(product.price),
      colors: product.colors ?? [],
    }));

    const prompt = [
      'You are a fashion assistant.',
      'Reply in the same language as the user.',
      'Write 1-2 concise sentences and mention that product cards are shown.',
      `User message: ${userMessage}`,
      `Matched products: ${JSON.stringify(productSummary)}`,
    ].join('\n');

    try {
      const model = this.genAi.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text || 'Đây là các sản phẩm phù hợp gu của bạn!';
    } catch (error) {
      this.logger.error('Failed to generate recommendation message', error);
      return 'Đây là những sản phẩm phù hợp gu của bạn!';
    }
  }

  async detectShoppingIntent(userMessage: string): Promise<boolean> {
    const normalizedMessage = userMessage.trim().toLowerCase();
    const shoppingKeywords = [
      'mua',
      'tìm',
      'gợi ý',
      'sản phẩm',
      'áo',
      'quần',
      'giày',
      'phụ kiện',
      'size',
      'màu',
      'giá',
      'shop',
      'product',
      'buy',
      'recommend',
      'suggest',
      'price',
      'color',
    ];

    if (shoppingKeywords.some((keyword) => normalizedMessage.includes(keyword))) {
      return true;
    }

    try {
      const model = this.genAi.getGenerativeModel({ model: this.modelName });
      const prompt = [
        'Classify the user message intent.',
        'Return exactly one word: SHOPPING or GENERAL.',
        'SHOPPING means searching/recommending/comparing products or asking about price, size, color, stock.',
        'GENERAL means greeting, small talk, or non-shopping questions.',
        `User message: ${userMessage}`,
      ].join('\n');
      const result = await model.generateContent(prompt);
      const label = result.response.text().trim().toUpperCase();
      return label.includes('SHOPPING');
    } catch (error) {
      this.logger.error('Failed to detect shopping intent', error);
      return false;
    }
  }

  async generateGeneralMessage(userMessage: string): Promise<string> {
    try {
      const model = this.genAi.getGenerativeModel({ model: this.modelName });
      const prompt = [
        'You are a friendly shopping assistant.',
        'Reply in the same language as the user.',
        'For non-shopping messages, answer naturally in 1-2 short sentences.',
        'If appropriate, invite user to describe desired outfit to get recommendations.',
        `User message: ${userMessage}`,
      ].join('\n');
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text || 'Xin chào! Mình có thể giúp bạn tìm đồ theo style, màu hoặc mức giá bạn muốn.';
    } catch (error) {
      this.logger.error('Failed to generate general message', error);
      return 'Xin chào! Mình có thể giúp bạn tìm đồ theo style, màu hoặc mức giá bạn muốn.';
    }
  }

  private normalizeFilters(
    rawArgs: Record<string, unknown>,
  ): ProductSearchFilters {
    const takeString = (value: unknown): string | undefined =>
      typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : undefined;

    const takeNumber = (value: unknown): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return undefined;
    };

    const takeStringArray = (value: unknown): string[] | undefined =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : undefined;

    return {
      category: takeString(rawArgs.category),
      color: takeString(rawArgs.color),
      style: takeString(rawArgs.style),
      minPrice: takeNumber(rawArgs.minPrice),
      maxPrice: takeNumber(rawArgs.maxPrice),
      keywords: takeStringArray(rawArgs.keywords),
      categories: takeStringArray(rawArgs.categories),
      colors: takeStringArray(rawArgs.colors),
    };
  }
}

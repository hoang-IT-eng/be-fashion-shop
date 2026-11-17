import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { StyleProfile } from './entities/style-profile.entity';

export type GeminiPlannedToolCall =
  | {
      name: 'search_products_hybrid';
      args: {
        query?: string;
        category?: string;
        color?: string;
        size?: string;
        minPrice?: number;
        maxPrice?: number;
      };
    }
  | {
      name: 'check_variant_stock';
      args: { productQuery: string; size?: string };
    }
  | {
      name: 'get_live_auctions';
      args: Record<string, unknown>;
    }
  | {
      name: 'get_order_status';
      args: { orderId?: number };
    }
  | {
      name: 'validate_coupon';
      args: { code: string; subtotal?: number };
    };

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-1.5-flash',
    );
  }

  /**
   * Safe check — NEVER throws when GEMINI_API_KEY is missing, empty, or placeholder.
   */
  hasValidApiKey(): boolean {
    const raw = (
      this.configService.get<string>('GEMINI_API_KEY') ??
      this.configService.get<string>('gemini_api') ??
      ''
    ).trim();
    if (!raw) return false;
    if (
      raw === 'your_gemini_api_key' ||
      raw.startsWith('your_') ||
      raw === 'changeme'
    ) {
      return false;
    }
    return true;
  }

  private getClientOrNull(): GoogleGenerativeAI | null {
    if (!this.hasValidApiKey()) return null;
    const apiKey = (
      this.configService.get<string>('GEMINI_API_KEY') ??
      this.configService.get<string>('gemini_api') ??
      ''
    ).trim();
    return new GoogleGenerativeAI(apiKey);
  }

  /**
   * Uses Gemini Function Calling when GEMINI_API_KEY is configured.
   * Returns null if key is missing or Gemini request fails so caller seamlessly uses HybridRagRouterService.
   */
  async planToolCall(
    userMessage: string,
    styleProfile?: StyleProfile | null,
  ): Promise<GeminiPlannedToolCall | null> {
    const client = this.getClientOrNull();
    if (!client) return null;

    const model = client.getGenerativeModel({
      model: this.modelName,
      tools: [
        {
          functionDeclarations: [
            {
              name: 'search_products_hybrid',
              description:
                'Search authenticated luxury streetwear, sneakers, outerwear, and grails using hybrid BM25 + filters',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  query: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING },
                  color: { type: SchemaType.STRING },
                  size: { type: SchemaType.STRING },
                  minPrice: { type: SchemaType.NUMBER },
                  maxPrice: { type: SchemaType.NUMBER },
                },
              },
            },
            {
              name: 'check_variant_stock',
              description:
                'Check live SKU size and colorway stock for a specific product',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  productQuery: { type: SchemaType.STRING },
                  size: { type: SchemaType.STRING },
                },
                required: ['productQuery'],
              },
            },
            {
              name: 'get_live_auctions',
              description:
                'Fetch currently live Grail auction lots, current bids, and countdowns',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {},
              },
            },
            {
              name: 'get_order_status',
              description:
                'Track customer order status by order ID or latest order',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  orderId: { type: SchemaType.NUMBER },
                },
              },
            },
            {
              name: 'validate_coupon',
              description:
                'Validate a promotional or secret initiation coupon code like ENIGMA15',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  code: { type: SchemaType.STRING },
                  subtotal: { type: SchemaType.NUMBER },
                },
                required: ['code'],
              },
            },
          ],
        },
      ],
    });

    const codexContext = styleProfile?.archetype
      ? `Customer Taste Codex Archetype: ${styleProfile.archetype} (${(styleProfile.keywords ?? []).join(', ')})`
      : 'No saved Taste Codex yet.';

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'You are the ENIGMA Archive Stylist & Grail Concierge.',
                  'Select the single most relevant tool call if the user asks about products, stock, auctions, orders, or coupon codes.',
                  codexContext,
                  `User message: ${userMessage}`,
                ].join('\n'),
              },
            ],
          },
        ],
      });

      const parts = result.response.candidates?.[0]?.content?.parts ?? [];
      const fnPart = parts.find((part) =>
        Boolean((part as { functionCall?: unknown }).functionCall),
      ) as
        | {
            functionCall?: {
              name: GeminiPlannedToolCall['name'];
              args?: Record<string, unknown>;
            };
          }
        | undefined;

      if (!fnPart?.functionCall?.name) return null;
      return {
        name: fnPart.functionCall.name,
        args: (fnPart.functionCall.args ?? {}) as never,
      };
    } catch (error) {
      this.logger.warn(
        `Gemini function-calling unavailable, falling back to local Hybrid RAG router: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return null;
    }
  }

  async synthesizeStylistReply(
    userMessage: string,
    contextSummary: string,
    fallbackReply: string,
  ): Promise<string> {
    const client = this.getClientOrNull();
    if (!client) return fallbackReply;

    try {
      const model = client.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(
        [
          'You are ENIGMA — an avant-garde luxury streetwear & grail auction stylist.',
          'Reply in the same language as the user (Vietnamese or English) in 1-2 crisp, refined editorial sentences.',
          `User message: ${userMessage}`,
          `Live Vault Context: ${contextSummary}`,
        ].join('\n'),
      );
      const text = result.response.text().trim();
      return text || fallbackReply;
    } catch {
      return fallbackReply;
    }
  }
}

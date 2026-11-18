import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

const FUNCTION_DECLARATIONS = [
  {
    name: 'search_products_hybrid',
    description:
      'Search authenticated luxury streetwear, sneakers, outerwear, and grails using hybrid BM25 + filters',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING' },
        category: { type: 'STRING' },
        color: { type: 'STRING' },
        size: { type: 'STRING' },
        minPrice: { type: 'NUMBER' },
        maxPrice: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'check_variant_stock',
    description:
      'Check live SKU size and colorway stock for a specific product',
    parameters: {
      type: 'OBJECT',
      properties: {
        productQuery: { type: 'STRING' },
        size: { type: 'STRING' },
      },
      required: ['productQuery'],
    },
  },
  {
    name: 'get_live_auctions',
    description:
      'Fetch currently live Grail auction lots, current bids, and countdowns',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_order_status',
    description: 'Track customer order status by order ID or latest order',
    parameters: {
      type: 'OBJECT',
      properties: {
        orderId: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'validate_coupon',
    description:
      'Validate a promotional or secret initiation coupon code like ENIGMA15',
    parameters: {
      type: 'OBJECT',
      properties: {
        code: { type: 'STRING' },
        subtotal: { type: 'NUMBER' },
      },
      required: ['code'],
    },
  },
];

interface GeminiResponsePart {
  text?: string;
  functionCall?: {
    name?: string;
    args?: Record<string, unknown>;
  };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
  }>;
}

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-3.8-flash',
    );
  }

  private getRawApiKey(): string {
    return (
      this.configService.get<string>('GEMINI_API_KEY') ??
      this.configService.get<string>('gemini_api') ??
      ''
    ).trim();
  }

  /**
   * Safe check — supports both Google AI Studio (`AIza...`) and Vertex AI Express Mode (`AQ....`) keys.
   */
  hasValidApiKey(): boolean {
    const raw = this.getRawApiKey();
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

  /**
   * Dispatches native `generateContent` requests across a model fallback
   * chain (configured model first, then the other Gemini flash models) and,
   * per model, across Vertex AI Express (`AQ.`) and AI Studio (`AIza`)
   * endpoints. A single overloaded model (503) no longer disables the
   * Gemini tier — the chain falls through to the next model.
   */
  private async callGenerateContent(
    payload: Record<string, unknown>,
  ): Promise<GeminiGenerateContentResponse | null> {
    if (!this.hasValidApiKey()) return null;
    const apiKey = this.getRawApiKey();
    const encodedKey = encodeURIComponent(apiKey);
    const modelChain = [
      ...new Set([
        this.modelName,
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3-flash-preview',
      ]),
    ];

    let lastErr = 'unknown';
    for (const model of modelChain) {
      const vertexUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encodedKey}`;
      const studioUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodedKey}`;
      const endpoints = apiKey.startsWith('AQ.')
        ? [vertexUrl, studioUrl]
        : [studioUrl, vertexUrl];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(18000),
          });
          if (res.ok) {
            return (await res.json()) as GeminiGenerateContentResponse;
          }
          lastErr = `${model} HTTP ${res.status}`;
        } catch (err) {
          lastErr = `${model} ${err instanceof Error ? err.message : 'network error'}`;
        }
      }
    }

    this.logger.warn(
      `Gemini generateContent unavailable (${lastErr}), falling back to local Hybrid RAG router.`,
    );
    return null;
  }

  /**
   * Uses Gemini Function Calling when GEMINI_API_KEY is configured (`AQ.` Vertex Express or `AIza` AI Studio).
   */
  async planToolCall(
    userMessage: string,
    styleProfile?: StyleProfile | null,
  ): Promise<GeminiPlannedToolCall | null> {
    if (!this.hasValidApiKey()) return null;

    const codexContext = styleProfile?.archetype
      ? `Customer Taste Codex Archetype: ${styleProfile.archetype} (${(styleProfile.keywords ?? []).join(', ')})`
      : 'No saved Taste Codex yet.';

    const data = await this.callGenerateContent({
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
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    });

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const fnPart = parts.find((part) => Boolean(part.functionCall?.name));
    if (!fnPart?.functionCall?.name) return null;

    return {
      name: fnPart.functionCall.name as GeminiPlannedToolCall['name'],
      args: (fnPart.functionCall.args ?? {}) as never,
    };
  }

  async synthesizeStylistReply(
    userMessage: string,
    contextSummary: string,
    fallbackReply: string,
  ): Promise<string> {
    const data = await this.callGenerateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'You are ENIGMA — an avant-garde luxury streetwear & grail auction stylist.',
                'Reply in the same language as the user (Vietnamese or English) in 1-2 crisp, refined editorial sentences.',
                `User message: ${userMessage}`,
                `Live Vault Context: ${contextSummary}`,
              ].join('\n'),
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.25, maxOutputTokens: 280 },
    });

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((p) => (typeof p.text === 'string' ? p.text : ''))
      .join('')
      .trim();
    return text || fallbackReply;
  }
}

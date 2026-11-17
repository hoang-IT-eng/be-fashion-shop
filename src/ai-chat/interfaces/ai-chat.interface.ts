import { Product } from '../../products/product.entity';

export type ProductSearchFilters = {
  category?: string;
  color?: string;
  size?: string;
  style?: string;
  minPrice?: number;
  maxPrice?: number;
  keywords?: string[];
  categories?: string[];
  colors?: string[];
};

export type GenerativeUiBlock =
  | {
      kind: 'product_cards';
      title: string;
      products: {
        id: number;
        name: string;
        brand?: string | null;
        category?: string | null;
        releaseType?: string | null;
        condition?: string | null;
        price: number;
        stock: number;
        imageUrl?: string | null;
        sizes: string[];
        colors: string[];
        variants?: {
          id: number;
          size: string | null;
          color: string | null;
          stock: number;
          sku: string | null;
        }[];
        bm25Score?: number;
      }[];
    }
  | {
      kind: 'comparison_table';
      title: string;
      columns: {
        id: number;
        name: string;
        brand: string;
        category: string;
        price: number;
        releaseType: string;
        condition: string;
        sizes: string;
        colors: string;
        stock: number;
        imageUrl?: string | null;
      }[];
      verdict: string;
    }
  | {
      kind: 'auction_card';
      title: string;
      lots: {
        id: number;
        title: string;
        subtitle?: string | null;
        imageUrl?: string | null;
        currentBid: number;
        nextMinimumBid: number;
        bidCount: number;
        endsAt: string;
        remainingSeconds: number;
        reserveMet: boolean;
      }[];
    }
  | {
      kind: 'order_stepper';
      title: string;
      order: {
        id: number;
        status: string;
        paymentMethod: string;
        paymentStatus: string;
        total: number;
        createdAt: string;
        itemCount: number;
        currentStageIndex: number;
        stages: { key: string; label: string; completed: boolean }[];
      };
    }
  | {
      kind: 'taste_codex_prompt';
      title: string;
      subtitle: string;
      currentArchetype?: string | null;
      suggestedTierSlug: string;
      ctaUrl: string;
    };

export type AiChatResponseType =
  | 'text'
  | 'product_recommendations'
  | 'generative_ui';

export type AiChatResponse = {
  type: AiChatResponseType;
  sessionId: string;
  message: string;
  engine: 'gemini-tools' | 'hybrid-local-rag';
  toolsInvoked: string[];
  uiBlocks: GenerativeUiBlock[];
  products?: Product[];
  filters?: ProductSearchFilters;
};

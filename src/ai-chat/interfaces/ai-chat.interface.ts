import { Product } from '../../products/product.entity';

export type ProductSearchFilters = {
  category?: string;
  color?: string;
  style?: string;
  minPrice?: number;
  maxPrice?: number;
  keywords?: string[];
  categories?: string[];
  colors?: string[];
};

export type AiChatResponseType = 'text' | 'product_recommendations';

export type AiChatResponse = {
  type: AiChatResponseType;
  sessionId: string;
  message: string;
  products?: Product[];
  filters?: ProductSearchFilters;
};

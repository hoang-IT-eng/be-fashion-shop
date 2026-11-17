import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { AuctionsService } from '../auctions/auctions.service';
import { OrdersService } from '../orders/orders.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { Product } from '../products/product.entity';
import { StyleProfile } from './entities/style-profile.entity';
import {
  GenerativeUiBlock,
  ProductSearchFilters,
} from './interfaces/ai-chat.interface';

const SYNONYM_MAP: Record<string, string[]> = {
  giay: ['sneaker', 'runner', 'footwear', 'boot', 'giày', 'high-top'],
  sneaker: ['giày', 'runner', 'footwear', 'high-top', 'obsidian', 'bone'],
  ao: ['hoodie', 'bomber', 'jacket', 'coat', 'shirt', 'tee', 'áo', 'outerwear'],
  khoac: [
    'bomber',
    'jacket',
    'coat',
    'outerwear',
    'trench',
    'leather',
    'áo khoác',
  ],
  bomber: ['leather', 'jacket', 'outerwear', 'horsehide', 'áo khoác'],
  hoodie: ['sweatshirt', 'cotton', '650gsm', 'shadow', 'áo'],
  quan: ['cargo', 'denim', 'jean', 'trousers', 'pants', 'bottoms', 'quần'],
  cargo: ['vanguard', 'trousers', 'waxed', 'quần', 'bottoms'],
  dongho: ['chronograph', 'watch', 'relic', 'titanium', 'phụ kiện'],
  watch: ['chronograph', 'relic', 'titanium', 'skeleton', 'phụ kiện'],
  den: ['black', 'obsidian', 'charcoal', 'shadow', 'đen'],
  black: ['obsidian', 'charcoal', 'shadow', 'đen'],
  trang: ['white', 'bone', 'ecru', 'trắng'],
  be: ['bone', 'beige', 'sand', 'ecru', 'suede'],
};

const ORDER_STAGES = [
  { key: 'pending', label: 'Order Initiated' },
  { key: 'confirmed', label: 'Authenticated & Verified' },
  { key: 'shipping', label: 'Armored Transit' },
  { key: 'delivered', label: 'Vault Delivered' },
];

export function stripAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function tokenize(text: string): string[] {
  const normalized = stripAccents(text.toLowerCase());
  return normalized.split(/[^a-z0-9]+/).filter((tok) => tok.length >= 2);
}

@Injectable()
export class HybridRagRouterService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auctionsService: AuctionsService,
    private readonly ordersService: OrdersService,
    private readonly vouchersService: VouchersService,
  ) {}

  /**
   * Level 2 Hybrid BM25 + Metadata RAG search over real DB catalog
   */
  async searchProductsHybrid(
    query: string,
    filters: ProductSearchFilters = {},
    limit = 6,
  ): Promise<{ products: Product[]; scores: Map<number, number> }> {
    const allProducts = await this.productsService.findAllActiveWithVariants();
    if (allProducts.length === 0) {
      return { products: [], scores: new Map() };
    }

    const rawTokens = tokenize(
      [
        query,
        filters.category ?? '',
        filters.color ?? '',
        filters.style ?? '',
        ...(filters.keywords ?? []),
      ].join(' '),
    );

    // Semantic synonym expansion
    const expandedTerms = new Set<string>(rawTokens);
    for (const tok of rawTokens) {
      for (const syn of SYNONYM_MAP[tok] ?? []) {
        for (const sub of tokenize(syn)) {
          expandedTerms.add(sub);
        }
      }
    }
    const queryTerms = Array.from(expandedTerms);

    // Filter pass for hard constraints (price, explicit size)
    let candidates = allProducts.filter((p) => {
      const price = Number(p.price);
      if (filters.minPrice !== undefined && price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && price > filters.maxPrice) {
        return false;
      }
      if (filters.size) {
        const sizeUpper = filters.size.toUpperCase();
        const sizes = (p.sizes ?? []).map((s) => s.toUpperCase());
        if (sizes.length > 0 && !sizes.some((s) => s.includes(sizeUpper))) {
          return false;
        }
      }
      return true;
    });

    if (candidates.length === 0) {
      candidates = allProducts;
    }

    // Build BM25 corpus (k1 = 1.5, b = 0.75)
    const k1 = 1.5;
    const b = 0.75;
    const docs = candidates.map((p) => {
      const docText = [
        p.name,
        p.name, // Boost title weight 2x
        p.brand ?? '',
        p.category ?? '',
        p.releaseType ?? '',
        p.condition ?? '',
        p.description ?? '',
        ...(p.colors ?? []),
        ...(p.sizes ?? []),
      ].join(' ');
      const tokens = tokenize(docText);
      const tf = new Map<string, number>();
      for (const t of tokens) {
        tf.set(t, (tf.get(t) ?? 0) + 1);
      }
      return { product: p, tokens, length: Math.max(1, tokens.length), tf };
    });

    const avgDl =
      docs.reduce((sum, d) => sum + d.length, 0) / Math.max(1, docs.length);
    const N = docs.length;

    const df = new Map<string, number>();
    for (const term of queryTerms) {
      let count = 0;
      for (const d of docs) {
        if (d.tf.has(term)) count += 1;
      }
      df.set(term, count);
    }

    const scores = new Map<number, number>();
    for (const d of docs) {
      let score = 0;
      for (const term of queryTerms) {
        const termFreq = d.tf.get(term) ?? 0;
        if (termFreq === 0) continue;
        const docFreq = df.get(term) ?? 0;
        const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
        const numerator = termFreq * (k1 + 1);
        const denominator =
          termFreq + k1 * (1 - b + b * (d.length / Math.max(1, avgDl)));
        score += idf * (numerator / denominator);
      }
      // Subtle boost for in-stock luxury grails
      if (d.product.stock > 0) score += 0.15;
      if (
        d.product.releaseType === 'grail' ||
        d.product.releaseType === 'reborn'
      ) {
        score += 0.1;
      }
      scores.set(d.product.id, Number(score.toFixed(3)));
    }

    const ranked = [...docs]
      .sort(
        (a, b) =>
          (scores.get(b.product.id) ?? 0) - (scores.get(a.product.id) ?? 0),
      )
      .slice(0, limit)
      .map((d) => d.product);

    return { products: ranked, scores };
  }

  /**
   * Tool: check_variant_stock
   */
  async checkVariantStock(productQuery: string, size?: string) {
    const { products } = await this.searchProductsHybrid(
      productQuery,
      { size },
      3,
    );
    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      totalStock: p.stock,
      variants: (p.variants ?? [])
        .filter((v) =>
          size
            ? (v.size ?? '').toUpperCase().includes(size.toUpperCase())
            : true,
        )
        .map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: v.stock,
          sku: v.sku,
        })),
    }));
  }

  /**
   * Tool: get_live_auctions
   */
  async getLiveAuctions() {
    const lots = await this.auctionsService.findAll('live');
    return lots.slice(0, 4);
  }

  /**
   * Tool: get_order_status
   */
  async getOrderStatus(params: { orderId?: number; userId?: number }) {
    try {
      if (params.orderId) {
        const order = await this.ordersService.getOrderById(
          params.orderId,
          params.userId,
          params.userId === undefined,
        );
        return this.formatOrderStepper(order);
      }
      if (params.userId) {
        const myOrders = await this.ordersService.getMyOrders(params.userId);
        if (myOrders.length > 0) {
          const latest = [...myOrders].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0];
          return this.formatOrderStepper(latest);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Tool: validate_coupon
   */
  async validateCoupon(code: string, subtotal = 2500000) {
    try {
      return await this.vouchersService.validate(code, subtotal);
    } catch (err) {
      return {
        valid: false,
        code: code.toUpperCase(),
        message: err instanceof Error ? err.message : 'Invalid voucher code',
      };
    }
  }

  /**
   * Smart Local Intent & Tool Router (Zero-Key Fallback + Deterministic Generative UI Builder)
   */
  async routeAndExecute(params: {
    message: string;
    userId?: number;
    styleProfile?: StyleProfile | null;
  }): Promise<{
    message: string;
    toolsInvoked: string[];
    uiBlocks: GenerativeUiBlock[];
    products: Product[];
    filters: ProductSearchFilters;
  }> {
    const raw = params.message.trim();
    const lower = raw.toLowerCase();
    const ascii = stripAccents(lower);
    const isVi =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        raw,
      ) ||
      /\b(mua|tim|goi y|ao|quan|giay|don hang|dau gia|ma giam|so sanh|size|gia)\b/.test(
        ascii,
      );

    const toolsInvoked: string[] = [];
    const uiBlocks: GenerativeUiBlock[] = [];
    let matchedProducts: Product[] = [];
    const parsedFilters = this.extractLocalFilters(raw, params.styleProfile);

    // 1. Check Auction Intent
    if (
      /\b(auctions?|bids?|bidding|grail lots?|live lots?|snipe|dau gia|đấu giá)\b/i.test(
        raw,
      ) ||
      ascii.includes('dau gia')
    ) {
      toolsInvoked.push('get_live_auctions');
      const lots = await this.getLiveAuctions();
      if (lots.length > 0) {
        uiBlocks.push({
          kind: 'auction_card',
          title: 'LIVE GRAIL AUCTIONS',
          lots: lots.map((l) => ({
            id: l.id,
            title: l.title,
            subtitle: l.subtitle,
            imageUrl: l.imageUrl,
            currentBid: l.currentBid,
            nextMinimumBid: l.nextMinimumBid,
            bidCount: l.bidCount,
            endsAt: l.endsAt,
            remainingSeconds: l.remainingSeconds,
            reserveMet: l.reserveMet,
          })),
        });
      }
      const reply =
        lots.length > 0
          ? isVi
            ? `Hiện có ${lots.length} phiên đấu giá Grail đang mở trực tiếp với cơ chế bảo vệ Anti-Snipe (+120s khi có bid dưới 60s cuối). Bạn có thể đặt giá ngay bên dưới.`
            : `${lots.length} authenticated Grail lots are live on the block right now, protected by our <60s Anti-Snipe (+120s) protocol.`
          : isVi
            ? 'Hiện chưa có phiên đấu giá nào đang mở. Khám phá bộ sưu tập Grail bên dưới nhé.'
            : 'No auction lots are active at this exact moment — explore our archive drops or set an alert.';

      return {
        message: reply,
        toolsInvoked,
        uiBlocks,
        products: [],
        filters: parsedFilters,
      };
    }

    // 2. Check Order Tracking Intent
    const orderIdMatch = raw.match(/#?(\d{1,6})/);
    if (
      /\b(order|track|tracking|shipping|delivery|don hang|đơn hàng|vận chuyển|giao hàng)\b/i.test(
        raw,
      ) ||
      ascii.includes('don hang')
    ) {
      toolsInvoked.push('get_order_status');
      const explicitOrderId = orderIdMatch
        ? Number(orderIdMatch[1])
        : undefined;
      const stepperOrder = await this.getOrderStatus({
        orderId: explicitOrderId,
        userId: params.userId,
      });

      if (stepperOrder) {
        uiBlocks.push({
          kind: 'order_stepper',
          title: `ORDER #${stepperOrder.id} TELEMETRY`,
          order: stepperOrder,
        });
        const reply = isVi
          ? `Đơn hàng #${stepperOrder.id} hiện ở trạng thái "${stepperOrder.status.toUpperCase()}". Xem tiến trình xác thực & vận chuyển chi tiết bên dưới.`
          : `Order #${stepperOrder.id} is currently marked ${stepperOrder.status.toUpperCase()}. Live fulfillment telemetry is rendered below.`;
        return {
          message: reply,
          toolsInvoked,
          uiBlocks,
          products: [],
          filters: parsedFilters,
        };
      }

      const fallbackMsg = isVi
        ? 'Vui lòng đăng nhập hoặc nhập mã đơn (ví dụ: "kiểm tra đơn #1") để tra cứu trạng thái vận chuyển.'
        : 'Sign in or specify your order number (e.g. "Track order #1") to inspect live fulfillment stages.';
      return {
        message: fallbackMsg,
        toolsInvoked,
        uiBlocks,
        products: [],
        filters: parsedFilters,
      };
    }

    // 3. Check Voucher / Coupon Validation Intent
    const codeMatch = raw.match(
      /\b(ENIGMA15|CULT10|VAULT500K|[A-Z]{4,12}\d{1,4})\b/i,
    );
    if (
      codeMatch ||
      /\b(voucher|coupon|promo|discount|code|ma giam|mã giảm|initiation)\b/i.test(
        raw,
      )
    ) {
      const targetCode = codeMatch ? codeMatch[1].toUpperCase() : 'ENIGMA15';
      toolsInvoked.push('validate_coupon');
      const validation = await this.validateCoupon(targetCode, 3000000);
      const reply = validation.valid
        ? isVi
          ? `Mã ưu đãi ${targetCode} hợp lệ: ${'description' in validation ? validation.description : ''}. Áp dụng tại bước Checkout để nhận đặc quyền!`
          : `Privilege code ${targetCode} verified — ${'description' in validation ? validation.description : 'active'}. Apply it directly in your bag or checkout.`
        : isVi
          ? `Mã "${targetCode}" chưa khả dụng (${validation.message}). Mẹo: gõ tổ hợp phím bí mật ENIGMA ngoài khung nhập liệu để mở khóa đặc quyền Inner Circle!`
          : `Code "${targetCode}" could not be verified (${validation.message}). Hint: type ENIGMA anywhere on the storefront to unlock Inner Circle privilege.`;
      return {
        message: reply,
        toolsInvoked,
        uiBlocks,
        products: [],
        filters: parsedFilters,
      };
    }

    // 4. Check Mystery Box / Style Quiz / Taste Codex Intent
    if (
      /\b(mystery|chest|vault|quiz|codex|archetype|decode|phối đồ|phong cách|gu thời trang)\b/i.test(
        raw,
      )
    ) {
      uiBlocks.push({
        kind: 'taste_codex_prompt',
        title: 'DECODE YOUR TASTE CODEX',
        subtitle:
          'Complete the 8-step Enigma Initiation to unlock your archival archetype and matched Mystery Chest.',
        currentArchetype: params.styleProfile?.archetype ?? null,
        suggestedTierSlug:
          params.styleProfile?.recommendedTier ?? 'inner-circle-chest',
        ctaUrl: '/mystery-boxes',
      });
      toolsInvoked.push('search_products_hybrid');
      const { products, scores } = await this.searchProductsHybrid(
        raw,
        parsedFilters,
        3,
      );
      matchedProducts = products;
      if (products.length > 0) {
        uiBlocks.push(
          this.buildProductCardsBlock(
            'CURATED ARCHIVE ROTATION',
            products,
            scores,
          ),
        );
      }
      return {
        message: isVi
          ? 'Mình đã mở thẻ giải mã Taste Codex 8 bước cùng các thiết kế tuyển chọn theo định hướng thẩm mỹ của bạn.'
          : 'Your 8-step Taste Codex initiation card is ready below, paired with archival pieces aligned to your silhouette.',
        toolsInvoked,
        uiBlocks,
        products: matchedProducts,
        filters: parsedFilters,
      };
    }

    // 5. Check Side-by-Side Comparison Intent
    if (
      /\b(compare|vs|versus|difference|so sánh|khác nhau|chọn cái nào)\b/i.test(
        raw,
      ) ||
      ascii.includes('so sanh')
    ) {
      toolsInvoked.push('search_products_hybrid');
      const { products } = await this.searchProductsHybrid(
        raw,
        parsedFilters,
        3,
      );
      matchedProducts = products;
      if (products.length >= 2) {
        const cols = products.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand ?? 'ENIGMA ATELIER',
          category: p.category ?? 'Archive',
          price: Number(p.price),
          releaseType: (p.releaseType ?? 'drop').toUpperCase(),
          condition: p.condition ?? 'Authenticated Mint',
          sizes: (p.sizes ?? []).join(', ') || 'OS',
          colors: (p.colors ?? []).join(' / ') || 'Obsidian',
          stock: p.stock,
          imageUrl: p.imageUrl,
        }));
        uiBlocks.push({
          kind: 'comparison_table',
          title: 'SIDE-BY-SIDE GRAIL MATRIX',
          columns: cols,
          verdict: isVi
            ? `${cols[0].name} nổi bật về độ hiếm & cấu trúc chất liệu, trong khi ${cols[1].name} linh hoạt cho rotation hằng ngày.`
            : `${cols[0].name} commands stronger archival rarity, whereas ${cols[1].name} offers versatile daily rotation.`,
        });
        return {
          message: isVi
            ? `Bảng đối chiếu trực tiếp giữa ${cols.map((c) => c.name).join(' và ')} theo mức giá, phiên bản, bảng size và tồn kho thực tế:`
            : `Side-by-side specification matrix comparing ${cols.map((c) => c.name).join(' vs. ')} across provenance, sizing, and live vault stock:`,
          toolsInvoked,
          uiBlocks,
          products: matchedProducts,
          filters: parsedFilters,
        };
      }
    }

    // 6. Stock / Size Check or Product Search Intent
    const isStockCheck =
      /\b(stock|available|availability|con hang|còn hàng|còn size|ton kho)\b/i.test(
        raw,
      ) || ascii.includes('con hang');

    if (isStockCheck) {
      toolsInvoked.push('check_variant_stock');
    }
    toolsInvoked.push('search_products_hybrid');

    const { products, scores } = await this.searchProductsHybrid(
      raw,
      parsedFilters,
      4,
    );
    matchedProducts = products;

    if (products.length > 0) {
      uiBlocks.push(
        this.buildProductCardsBlock(
          isStockCheck ? 'LIVE SKU STOCK VERIFICATION' : 'ARCHIVAL SELECTION',
          products,
          scores,
        ),
      );
      const reply = isVi
        ? `Mình tìm thấy ${products.length} thiết kế khớp với yêu cầu của bạn từ kho lưu trữ ENIGMA. Bạn có thể chọn nhanh size và thêm trực tiếp vào giỏ ngay trên thẻ sản phẩm.`
        : `Curated ${products.length} authenticated pieces from the ENIGMA vault matching your brief. Select your size directly on any card below.`;
      return {
        message: reply,
        toolsInvoked,
        uiBlocks,
        products: matchedProducts,
        filters: parsedFilters,
      };
    }

    return {
      message: isVi
        ? 'Chào mừng đến với ENIGMA Concierge. Bạn có thể yêu cầu tìm sneaker/áo khoác theo tầm giá, so sánh 2 món đồ, xem phiên đấu giá trực tiếp, kiểm tra đơn hàng hoặc xác thực mã ENIGMA15.'
        : 'Welcome to the ENIGMA Stylist Desk. Ask me to source archival pieces by silhouette or budget, compare grails side-by-side, inspect live auctions, track an order, or decode your style.',
      toolsInvoked,
      uiBlocks,
      products: [],
      filters: parsedFilters,
    };
  }

  buildProductCardsBlock(
    title: string,
    products: Product[],
    scores?: Map<number, number>,
  ): GenerativeUiBlock {
    return {
      kind: 'product_cards',
      title,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        releaseType: p.releaseType,
        condition: p.condition,
        price: Number(p.price),
        stock: p.stock,
        imageUrl: p.imageUrl,
        sizes: p.sizes ?? [],
        colors: p.colors ?? [],
        variants: (p.variants ?? []).map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: v.stock,
          sku: v.sku,
        })),
        bm25Score: scores?.get(p.id),
      })),
    };
  }

  extractLocalFilters(
    message: string,
    styleProfile?: StyleProfile | null,
  ): ProductSearchFilters {
    const lower = message.toLowerCase();
    const ascii = stripAccents(lower);
    const filters: ProductSearchFilters = {};

    // Budget extraction (supports "dưới 2 triệu", "under 3m", "< 1500000", "500k")
    const underMillion = ascii.match(
      /(?:duoi|under|max|<\s*|toi da)\s*(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|m)\b/,
    );
    const underThousand = ascii.match(
      /(?:duoi|under|max|<\s*|toi da)\s*(\d+)\s*k\b/,
    );
    const underRaw = ascii.match(/(?:duoi|under|<\s*)\s*(\d{5,9})\b/);

    if (underMillion) {
      filters.maxPrice =
        parseFloat(underMillion[1].replace(',', '.')) * 1_000_000;
    } else if (underThousand) {
      filters.maxPrice = parseInt(underThousand[1], 10) * 1_000;
    } else if (underRaw) {
      filters.maxPrice = parseInt(underRaw[1], 10);
    }

    // Size extraction
    const sizeMatch = message.match(/\bsize\s*(XS|S|M|L|XL|XXL|\d{2})\b/i);
    const euSizeMatch = message.match(/\b(?:EU|US)\s*(\d{2})\b/i);
    if (sizeMatch) {
      filters.size = sizeMatch[1].toUpperCase();
    } else if (euSizeMatch) {
      filters.size = euSizeMatch[1];
    }

    // Color extraction
    if (/\b(black|obsidian|charcoal|den)\b/.test(ascii)) {
      filters.color = 'Obsidian';
    } else if (/\b(bone|white|ecru|trang|be)\b/.test(ascii)) {
      filters.color = 'Bone';
    }

    const tokens = tokenize(message).filter(
      (t) =>
        ![
          'mua',
          'tim',
          'cho',
          'minh',
          'toi',
          'voi',
          'san',
          'pham',
          'show',
          'find',
          'the',
          'with',
          'under',
          'duoi',
          'size',
        ].includes(t),
    );
    filters.keywords = tokens.slice(0, 8);
    if (styleProfile?.archetype && !filters.style) {
      filters.style = styleProfile.archetype;
    }
    return filters;
  }

  private formatOrderStepper(order: {
    id: number;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    total: number;
    createdAt: Date;
    items?: unknown[];
  }) {
    const statusOrder = ['pending', 'confirmed', 'shipping', 'delivered'];
    const currentIdx = Math.max(0, statusOrder.indexOf(order.status));
    const isCancelled = order.status === 'cancelled';

    return {
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      createdAt: new Date(order.createdAt).toISOString(),
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      currentStageIndex: isCancelled ? -1 : currentIdx,
      stages: ORDER_STAGES.map((s, idx) => ({
        key: s.key,
        label: s.label,
        completed: !isCancelled && idx <= currentIdx,
      })),
    };
  }
}

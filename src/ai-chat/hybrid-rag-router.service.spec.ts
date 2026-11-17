import { HybridRagRouterService } from './hybrid-rag-router.service';
import { ProductsService } from '../products/products.service';
import { AuctionsService } from '../auctions/auctions.service';
import { OrdersService } from '../orders/orders.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { DiscountType } from '../vouchers/voucher.entity';

describe('HybridRagRouterService (Zero-Key Fallback & Tool-Use)', () => {
  let router: HybridRagRouterService;

  beforeEach(() => {
    const mockProducts = [
      {
        id: 1,
        name: 'ENIGMA 01 Obsidian Monolith High-Top',
        brand: 'ENIGMA ATELIER',
        category: 'Sneakers',
        releaseType: 'grail',
        condition: 'Deadstock',
        description: 'Italian calfskin sneaker with aged bone sole',
        price: 8900000,
        stock: 12,
        imageUrl: '/images/enigma/grail-sneaker-obsidian.jpg',
        sizes: ['41', '42', '43'],
        colors: ['Obsidian'],
        variants: [
          { id: 101, size: '42', color: 'Obsidian', stock: 5, sku: 'ENG-1-42' },
        ],
        isActive: true,
      },
      {
        id: 2,
        name: 'Aether Bone Suede & Carbon Runner',
        brand: 'VANGUARD LAB',
        category: 'Sneakers',
        releaseType: 'drop',
        condition: 'Deadstock',
        description: 'Warm bone suede technical runner',
        price: 6800000,
        stock: 15,
        imageUrl: '/images/enigma/grail-runner-bone.jpg',
        sizes: ['41', '42'],
        colors: ['Warm Bone'],
        variants: [
          {
            id: 102,
            size: '42',
            color: 'Warm Bone',
            stock: 6,
            sku: 'ENG-2-42',
          },
        ],
        isActive: true,
      },
    ];

    const productsService = {
      findAllActiveWithVariants: jest.fn().mockResolvedValue(mockProducts),
    } as unknown as ProductsService;

    const auctionsService = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 7,
          title: 'LOT 01 · Prototype Bomber',
          subtitle: '1/1 Sample',
          imageUrl: '/images/enigma/grail-leather-bomber.jpg',
          currentBid: 13200000,
          nextMinimumBid: 13450000,
          bidCount: 3,
          endsAt: new Date(Date.now() + 3600_000).toISOString(),
          remainingSeconds: 3600,
          reserveMet: true,
        },
      ]),
    } as unknown as AuctionsService;

    const ordersService = {
      getOrderById: jest.fn().mockResolvedValue({
        id: 12,
        status: 'shipping',
        paymentMethod: 'vnpay',
        paymentStatus: 'paid',
        total: 8900000,
        createdAt: new Date(),
        items: [{ productId: 1 }],
      }),
      getMyOrders: jest.fn().mockResolvedValue([]),
    } as unknown as OrdersService;

    const vouchersService = {
      validate: jest.fn().mockResolvedValue({
        valid: true,
        code: 'ENIGMA15',
        description: 'Inner Circle Initiation — 15% Privilege',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        discountAmount: 450000,
        finalTotal: 2550000,
        isSecretInitiation: true,
        message: 'Verified',
      }),
    } as unknown as VouchersService;

    router = new HybridRagRouterService(
      productsService,
      auctionsService,
      ordersService,
      vouchersService,
    );
  });

  it('ranks sneakers via Hybrid BM25 + Vietnamese synonym expansion and emits product_cards', async () => {
    const res = await router.routeAndExecute({
      message: 'Tìm giày sneaker đen size 42 dưới 10 triệu',
    });

    expect(res.toolsInvoked).toContain('search_products_hybrid');
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.products[0].name).toContain('Obsidian');
    expect(res.uiBlocks[0]?.kind).toBe('product_cards');
  });

  it('builds side-by-side comparison_table block when comparing items', async () => {
    const res = await router.routeAndExecute({
      message: 'So sánh 2 mẫu sneaker Obsidian và Bone Runner',
    });

    expect(res.uiBlocks[0]?.kind).toBe('comparison_table');
  });

  it('routes live auction queries to get_live_auctions and emits auction_card', async () => {
    const res = await router.routeAndExecute({
      message: 'Show me live grail auctions right now',
    });

    expect(res.toolsInvoked).toContain('get_live_auctions');
    expect(res.uiBlocks[0]?.kind).toBe('auction_card');
  });

  it('routes order tracking queries to get_order_status and emits order_stepper', async () => {
    const res = await router.routeAndExecute({
      message: 'Kiểm tra đơn hàng #12',
    });

    expect(res.toolsInvoked).toContain('get_order_status');
    expect(res.uiBlocks[0]?.kind).toBe('order_stepper');
  });
});

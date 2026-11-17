import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { AuctionLot, AuctionStatus } from '../auctions/auction-lot.entity';
import {
  ConciergeRequest,
  ConciergeStatus,
} from '../concierge/concierge-request.entity';
import { StyleProfile } from '../ai-chat/entities/style-profile.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(AuctionLot)
    private readonly auctionRepo: Repository<AuctionLot>,
    @InjectRepository(ConciergeRequest)
    private readonly conciergeRepo: Repository<ConciergeRequest>,
    @InjectRepository(StyleProfile)
    private readonly styleProfileRepo: Repository<StyleProfile>,
  ) {}

  async getLatest2Orders(): Promise<Order[]> {
    return this.orderRepo.find({
      order: { createdAt: 'DESC' },
      take: 2,
    });
  }

  async getStats() {
    const [
      totalUsers,
      products,
      variants,
      orders,
      auctions,
      conciergeList,
      profiles,
    ] = await Promise.all([
      this.userRepo.count(),
      this.productRepo.find(),
      this.variantRepo.find(),
      this.orderRepo.find({ order: { createdAt: 'DESC' } }),
      this.auctionRepo.find({ order: { endsAt: 'ASC' } }),
      this.conciergeRepo.find({ order: { createdAt: 'DESC' } }),
      this.styleProfileRepo.find(),
    ]);

    const totalProducts = products.length;
    const totalOrders = orders.length;

    const validOrders = orders.filter(
      (o) => o.status !== OrderStatus.CANCELLED,
    );
    const totalRevenue = Number(
      validOrders.reduce((sum, o) => sum + Number(o.total), 0).toFixed(2),
    );
    const averageOrderValue =
      validOrders.length > 0
        ? Number((totalRevenue / validOrders.length).toFixed(2))
        : 0;

    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.PENDING,
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newOrdersToday = orders.filter(
      (o) => new Date(o.createdAt) >= today,
    ).length;

    const ordersByStatus = {
      pending: orders.filter((o) => o.status === OrderStatus.PENDING).length,
      confirmed: orders.filter((o) => o.status === OrderStatus.CONFIRMED)
        .length,
      shipping: orders.filter((o) => o.status === OrderStatus.SHIPPING).length,
      delivered: orders.filter((o) => o.status === OrderStatus.DELIVERED)
        .length,
      cancelled: orders.filter((o) => o.status === OrderStatus.CANCELLED)
        .length,
    };

    // 14-day GMV time series
    const gmvTimeSeries = Array.from({ length: 14 }, (_, idx) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - idx));
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayOrders = validOrders.filter((o) => {
        const t = new Date(o.createdAt);
        return t >= d && t < next;
      });
      const gmv = Number(
        dayOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2),
      );
      return {
        date: d.toISOString().slice(0, 10),
        gmv,
        orders: dayOrders.length,
      };
    });

    // Category, Size & Colorway velocity
    const productById = new Map(products.map((p) => [p.id, p]));
    const categoryMap = new Map<
      string,
      { category: string; units: number; revenue: number }
    >();
    const sizeMap = new Map<string, number>();
    const colorMap = new Map<string, number>();

    for (const order of validOrders) {
      for (const item of order.items ?? []) {
        const prod = productById.get(item.productId);
        const cat = prod?.category || 'Archive';
        const prevCat = categoryMap.get(cat) ?? {
          category: cat,
          units: 0,
          revenue: 0,
        };
        prevCat.units += item.quantity;
        prevCat.revenue = Number(
          (prevCat.revenue + Number(item.price) * item.quantity).toFixed(2),
        );
        categoryMap.set(cat, prevCat);

        if (item.size) {
          sizeMap.set(item.size, (sizeMap.get(item.size) ?? 0) + item.quantity);
        }
        if (item.color) {
          colorMap.set(
            item.color,
            (colorMap.get(item.color) ?? 0) + item.quantity,
          );
        }
      }
    }

    const categoryVelocity = Array.from(categoryMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
    const sizeVelocity = Array.from(sizeMap.entries())
      .map(([size, units]) => ({ size, units }))
      .sort((a, b) => b.units - a.units);
    const colorVelocity = Array.from(colorMap.entries())
      .map(([color, units]) => ({ color, units }))
      .sort((a, b) => b.units - a.units);

    // Conversion funnel breakdown
    const denom = Math.max(1, totalOrders);
    const conversionBreakdown = {
      fulfillmentRate: Number(
        ((ordersByStatus.delivered / denom) * 100).toFixed(1),
      ),
      activePipelineRate: Number(
        (
          ((ordersByStatus.confirmed + ordersByStatus.shipping) / denom) *
          100
        ).toFixed(1),
      ),
      cancellationRate: Number(
        ((ordersByStatus.cancelled / denom) * 100).toFixed(1),
      ),
    };

    // Active Auction Heat
    const liveAuctions = auctions.filter(
      (a) => a.status === AuctionStatus.LIVE,
    );
    const totalBids = auctions.reduce((s, a) => s + (a.bidCount ?? 0), 0);
    const highestActiveBid = liveAuctions.reduce(
      (max, a) => Math.max(max, Number(a.currentBid)),
      0,
    );
    const activeAuctionValue = Number(
      liveAuctions.reduce((s, a) => s + Number(a.currentBid), 0).toFixed(2),
    );

    const auctionHeat = {
      liveCount: liveAuctions.length,
      totalLots: auctions.length,
      totalBids,
      highestActiveBid,
      activeAuctionValue,
      hotLots: liveAuctions.slice(0, 4).map((a) => ({
        id: a.id,
        title: a.title,
        currentBid: Number(a.currentBid),
        bidCount: a.bidCount,
        endsAt: a.endsAt,
      })),
    };

    // Low-stock SKU alerts
    const lowStockSkus = variants
      .filter((v) => v.stock <= 5)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 12)
      .map((v) => ({
        variantId: v.id,
        productId: v.productId,
        productName:
          productById.get(v.productId)?.name ?? `Product #${v.productId}`,
        sku: v.sku ?? `SKU-${v.productId}-${v.id}`,
        size: v.size,
        color: v.color,
        stock: v.stock,
      }));

    // Recent Concierge requests
    const pendingConciergeCount = conciergeList.filter(
      (c) =>
        c.status === ConciergeStatus.PENDING ||
        c.status === ConciergeStatus.REVIEWING,
    ).length;
    const recentConciergeRequests = conciergeList.slice(0, 6).map((c) => ({
      id: c.id,
      requesterName: c.requesterName,
      itemName: c.itemName,
      size: c.size,
      targetPrice: Number(c.targetPrice),
      status: c.status,
      createdAt: c.createdAt,
    }));

    // Taste Codex archetype distribution
    const codexCounts = new Map<string, number>();
    for (const p of profiles) {
      const key = p.archetype || p.style || 'Unassigned';
      codexCounts.set(key, (codexCounts.get(key) ?? 0) + 1);
    }
    const codexDistribution = Array.from(codexCounts.entries()).map(
      ([archetype, count]) => ({ archetype, count }),
    );

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      pendingOrders,
      newOrdersToday,
      ordersByStatus,
      conversionBreakdown,
      gmvTimeSeries,
      categoryVelocity,
      sizeVelocity,
      colorVelocity,
      auctionHeat,
      lowStockSkus,
      pendingConciergeCount,
      recentConciergeRequests,
      codexDistribution,
    };
  }

  async getRevenueByMonth(year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.createdAt >= :start', { start })
      .andWhere('order.createdAt < :end', { end })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .getMany();

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
      orderCount: 0,
    }));

    for (const order of orders) {
      const monthIndex = new Date(order.createdAt).getMonth();
      months[monthIndex].revenue += Number(order.total);
      months[monthIndex].orderCount += 1;
    }

    months.forEach((m) => {
      m.revenue = Number(m.revenue.toFixed(2));
    });

    return { year, months };
  }

  parseYear(year?: string): number {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    if (Number.isNaN(y) || y < 2000 || y > 2100) {
      throw new BadRequestException(
        'Tham số year không hợp lệ (ví dụ: year=2026)',
      );
    }
    return y;
  }
}

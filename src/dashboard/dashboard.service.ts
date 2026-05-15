import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Order, OrderStatus } from '../orders/order.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async getLatest2Orders(): Promise<Order[]> {
    return this.orderRepo.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
  }

  async getStats() {
    const [totalUsers, totalProducts, totalOrders, orders] = await Promise.all([
      this.userRepo.count(),
      this.productRepo.count(),
      this.orderRepo.count(),
      this.orderRepo.find(),
    ]);

    const totalRevenue = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.total), 0);

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

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      newOrdersToday,
      ordersByStatus,
    };
  }

  async getRevenueByMonth(year: number) {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .where('EXTRACT(YEAR FROM order.createdAt) = :year', { year })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .getMany();

    // Khởi tạo mảng 12 tháng với revenue = 0
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
      orders: 0,
    }));

    for (const order of orders) {
      const month = new Date(order.createdAt).getMonth(); // 0-indexed
      monthly[month].revenue += Number(order.total);
      monthly[month].orders += 1;
    }

    return { year, data: monthly };
  }
}

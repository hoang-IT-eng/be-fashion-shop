import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { VnpayService } from '../vnpay/vnpay.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly vnpayService: VnpayService,
  ) {}

  async createOrder(
    userId: number,
    dto: CreateOrderDto,
    ipAddr: string,
  ): Promise<{ order: Order; paymentUrl?: string }> {
    const order = this.orderRepo.create({ ...dto, userId });
    const saved = await this.orderRepo.save(order);

    let paymentUrl: string | undefined;
    if (dto.paymentMethod === PaymentMethod.VNPAY) {
      paymentUrl = this.vnpayService.createPaymentUrl(
        saved.id,
        dto.total,
        ipAddr,
      );
    }

    return { order: saved, paymentUrl };
  }

  async getMyOrders(userId: number): Promise<Order[]> {
    return this.orderRepo.findBy({ userId });
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getOrderById(id: number): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng id=${id}`);
    return order;
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.getOrderById(id);
    order.status = status;
    return this.orderRepo.save(order);
  }

  async handleVnpayReturn(query: Record<string, string>): Promise<{ success: boolean; orderId: number }> {
    try {
      const result = this.vnpayService.verifyReturn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query as any,
      );
      const orderId = Number(query['vnp_TxnRef']);
      const order = await this.orderRepo.findOneBy({ id: orderId });

      if (order) {
        if (result.isVerified && query['vnp_ResponseCode'] === '00') {
          order.paymentStatus = PaymentStatus.PAID;
          order.vnpayTransactionId = query['vnp_TransactionNo'] ?? null;
        } else {
          order.paymentStatus = PaymentStatus.FAILED;
        }
        await this.orderRepo.save(order);
      }

      return {
        success: result.isVerified && query['vnp_ResponseCode'] === '00',
        orderId,
      };
    } catch {
      const orderId = Number(query['vnp_TxnRef'] ?? 0);
      return { success: false, orderId };
    }
  }

  async deleteOrder(id: number): Promise<{ message: string }> {
    const order = await this.getOrderById(id);
    await this.orderRepo.remove(order);
    return { message: `Đã hủy đơn hàng id=${id}` };
  }
}

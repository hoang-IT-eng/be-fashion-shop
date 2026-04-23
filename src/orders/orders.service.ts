import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async createOrder(userId: number, dto: CreateOrderDto): Promise<Order> {
    const order = this.orderRepo.create({ ...dto, userId });
    return this.orderRepo.save(order);
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

  async deleteOrder(id: number): Promise<{ message: string }> {
    const order = await this.getOrderById(id);
    await this.orderRepo.remove(order);
    return { message: `Đã hủy đơn hàng id=${id}` };
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { VnpayService } from '../vnpay/vnpay.service';
import { Product } from '../products/product.entity';

// Workflow hợp lệ: từ trạng thái hiện tại có thể chuyển sang trạng thái nào
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], // không thể chuyển tiếp
  [OrderStatus.CANCELLED]: [], // không thể chuyển tiếp
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly vnpayService: VnpayService,
  ) {}

  async createOrder(
    userId: number,
    dto: CreateOrderDto,
    ipAddr: string,
  ): Promise<{ order: Order; paymentUrl?: string }> {
    if (dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];

    const saved = await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const orderRepo = manager.getRepository(Order);

      const products = await productRepo.find({
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' },
      });
      if (products.length !== productIds.length) {
        throw new NotFoundException('Một hoặc nhiều sản phẩm không tồn tại');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      const qtyByProduct = new Map<number, number>();
      for (const item of dto.items) {
        qtyByProduct.set(
          item.productId,
          (qtyByProduct.get(item.productId) ?? 0) + item.quantity,
        );
      }
      for (const [pid, totalQty] of qtyByProduct) {
        const p = productMap.get(pid);
        if (!p) {
          throw new NotFoundException(`Không tìm thấy sản phẩm id=${pid}`);
        }
        if (p.stock < totalQty) {
          throw new BadRequestException(
            `Sản phẩm "${p.name}" chỉ còn ${p.stock} trong kho (yêu cầu ${totalQty})`,
          );
        }
      }

      const normalizedItems = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: item.quantity,
        };
      });

      const calculatedTotal = normalizedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const roundedTotal = Number(calculatedTotal.toFixed(2));
      const roundedClientTotal = Number(dto.total.toFixed(2));

      if (roundedClientTotal !== roundedTotal) {
        throw new BadRequestException(
          'Tổng tiền không hợp lệ. Vui lòng tải lại giỏ hàng và thử lại.',
        );
      }

      const order = orderRepo.create({
        ...dto,
        userId,
        items: normalizedItems,
        total: roundedTotal,
      });
      const orderSaved = await orderRepo.save(order);

      for (const item of normalizedItems) {
        await productRepo.decrement({ id: item.productId }, 'stock', item.quantity);
      }

      return orderSaved;
    });

    let paymentUrl: string | undefined;
    if (dto.paymentMethod === PaymentMethod.VNPAY) {
      paymentUrl = this.vnpayService.createPaymentUrl(
        saved.id,
        Number(saved.total),
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

  // Lấy đơn hàng — kiểm tra ownership nếu không phải admin
  async getOrderById(
    id: number,
    requestUserId?: number,
    isAdmin = false,
  ): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng id=${id}`);
    if (
      !isAdmin &&
      requestUserId !== undefined &&
      order.userId !== requestUserId
    ) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }
    return order;
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng id=${id}`);

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ "${order.status}" sang "${status}"`,
      );
    }

    // Khôi phục stock nếu admin hủy đơn
    if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await this.productRepo.increment({ id: item.productId }, 'stock', item.quantity);
      }
    }

    order.status = status;
    return this.orderRepo.save(order);
  }

  // User tự hủy đơn — chỉ được hủy khi đang PENDING
  async cancelMyOrder(
    id: number,
    userId: number,
  ): Promise<{ message: string }> {
    const order = await this.orderRepo.findOneBy({ id });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng id=${id}`);
    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể hủy đơn hàng đang chờ xử lý');
    }
    // Khôi phục stock
    for (const item of order.items) {
      await this.productRepo.increment({ id: item.productId }, 'stock', item.quantity);
    }
    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);
    return { message: `Đã hủy đơn hàng id=${id}` };
  }

  // Admin xóa đơn hàng
  async deleteOrder(id: number): Promise<{ message: string }> {
    const order = await this.orderRepo.findOneBy({ id });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng id=${id}`);

    // Đơn đã hủy đã được hoàn stock khi chuyển sang CANCELLED
    if (order.status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await this.productRepo.increment({ id: item.productId }, 'stock', item.quantity);
      }
    }

    await this.orderRepo.remove(order);
    return { message: `Đã xóa đơn hàng id=${id}` };
  }

  async handleVnpayReturn(
    query: Record<string, string>,
  ): Promise<{ success: boolean; orderId: number }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = this.vnpayService.verifyReturn(query as any);
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
}

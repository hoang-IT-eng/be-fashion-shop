import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';

export interface Order extends CreateOrderDto {
  id: number;
}

@Injectable()
export class OrdersService {
  private orders: Order[] = [];

  createOrder(createOrderDto: CreateOrderDto) {
    const newOrder: Order = { 
      ...createOrderDto, 
      id: Date.now() 
    };
    this.orders.push(newOrder);
    return { message: 'Order created', order: newOrder };
  }

  getOrders() {
    return this.orders;
  }

  getOrderById(id: number) {
    return this.orders.find((order) => order.id === id);
  }

  deleteOrder(id: number) {
    const index = this.orders.findIndex(order => order.id === id);
    if (index !== -1) {
      const deletedOrder = this.orders.splice(index, 1);
      return { message: 'Order deleted', order: deletedOrder[0] };
    }
    return { message: 'Order not found' };
  }

  updateStatus(id: number, status: string) {
  const order = this.orders.find((o) => o.id === id);
  
  if (!order) {
    return { message: 'Không tìm thấy đơn hàng để cập nhật' };
  }
  order['status'] = status; 
  return { 
    message: 'Cập nhật trạng thái thành công', 
    order 
  };
}
}
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User, UserRole } from '../users/user.entity';
import { OrderStatus } from './order.entity';
import { ConfigService } from '@nestjs/config';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cfg: ConfigService,
  ) {}

  // POST /orders → user tạo đơn
  @Post()
  createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const user = req.user as User;
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    return this.ordersService.createOrder(user.id, dto, ip);
  }

  // GET /orders/my → lịch sử đơn của user hiện tại
  @Get('my')
  getMyOrders(@Req() req: Request) {
    const user = req.user as User;
    return this.ordersService.getMyOrders(user.id);
  }

  // VNPay callback — PHẢI đặt trước @Get(':id')
  @Get('vnpay-return')
  @Public()
  async vnpayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.ordersService.handleVnpayReturn(query);
    const feUrl = this.cfg.get<string>('FE_URL', 'http://localhost:5173');
    if (result.success) {
      return res.redirect(`${feUrl}/orders/${result.orderId}?payment=success`);
    }
    return res.redirect(`${feUrl}/orders/${result.orderId}?payment=failed`);
  }

  // GET /orders → admin xem tất cả đơn
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  // GET /orders/:id → user chỉ xem đơn của mình, admin xem tất cả
  @Get(':id')
  getOrderById(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as User;
    const isAdmin = user.role === UserRole.ADMIN;
    return this.ordersService.getOrderById(id, user.id, isAdmin);
  }

  // PATCH /orders/:id/status → admin cập nhật trạng thái
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }

  // DELETE /orders/:id/cancel → user tự hủy đơn (chỉ khi PENDING)
  @Delete(':id/cancel')
  cancelMyOrder(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as User;
    return this.ordersService.cancelMyOrder(id, user.id);
  }

  // DELETE /orders/:id → admin xóa đơn hàng
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.deleteOrder(id);
  }
}

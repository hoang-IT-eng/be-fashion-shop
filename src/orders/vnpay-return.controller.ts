import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Orders')
@Controller('orders')
export class VnpayReturnController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cfg: ConfigService,
  ) {}

  // GET /orders/vnpay-return — VNPay callback sau khi thanh toán
  @Get('vnpay-return')
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
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { VnpayModule } from '../vnpay/vnpay.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), VnpayModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

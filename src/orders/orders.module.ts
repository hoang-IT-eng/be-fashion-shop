import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { VnpayModule } from '../vnpay/vnpay.module';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, ProductVariant]),
    VnpayModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

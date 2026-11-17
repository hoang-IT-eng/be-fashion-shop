import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { Order } from '../orders/order.entity';
import { AuctionLot } from '../auctions/auction-lot.entity';
import { ConciergeRequest } from '../concierge/concierge-request.entity';
import { StyleProfile } from '../ai-chat/entities/style-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Product,
      ProductVariant,
      Order,
      AuctionLot,
      ConciergeRequest,
      StyleProfile,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

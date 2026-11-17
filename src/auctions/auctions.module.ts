import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionLot } from './auction-lot.entity';
import { AuctionBid } from './auction-bid.entity';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionsGateway } from './auctions.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([AuctionLot, AuctionBid])],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionsGateway],
  exports: [AuctionsService],
})
export class AuctionsModule {}

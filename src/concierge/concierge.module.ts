import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConciergeRequest } from './concierge-request.entity';
import { ConciergeService } from './concierge.service';
import { ConciergeController } from './concierge.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConciergeRequest]), AuthModule],
  controllers: [ConciergeController],
  providers: [ConciergeService],
  exports: [ConciergeService],
})
export class ConciergeModule {}

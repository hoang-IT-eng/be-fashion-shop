import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MysteryBox } from './mystery-box.entity';
import { StyleProfile } from '../ai-chat/entities/style-profile.entity';
import { MysteryBoxesService } from './mystery-boxes.service';
import { MysteryBoxesController } from './mystery-boxes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MysteryBox, StyleProfile]), AuthModule],
  controllers: [MysteryBoxesController],
  providers: [MysteryBoxesService],
  exports: [MysteryBoxesService],
})
export class MysteryBoxesModule {}

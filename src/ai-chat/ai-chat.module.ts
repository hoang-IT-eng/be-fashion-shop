import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { OrdersModule } from '../orders/orders.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { AiChatService } from './ai-chat.service';
import { GeminiClientService } from './gemini-client.service';
import { HybridRagRouterService } from './hybrid-rag-router.service';
import { ChatGateway } from './chat.gateway';
import { AiChatController } from './ai-chat.controller';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { StyleProfile } from './entities/style-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage, StyleProfile]),
    ProductsModule,
    AuctionsModule,
    OrdersModule,
    VouchersModule,
    AuthModule,
  ],
  controllers: [AiChatController],
  providers: [
    ChatGateway,
    AiChatService,
    GeminiClientService,
    HybridRagRouterService,
  ],
  exports: [AiChatService, HybridRagRouterService],
})
export class AiChatModule {}

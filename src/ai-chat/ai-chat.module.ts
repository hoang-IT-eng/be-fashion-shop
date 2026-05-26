import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { AiChatService } from './ai-chat.service';
import { GeminiClientService } from './gemini-client.service';
import { ChatGateway } from './chat.gateway';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { StyleProfile } from './entities/style-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage, StyleProfile]),
    ProductsModule,
    AuthModule,
  ],
  providers: [ChatGateway, AiChatService, GeminiClientService],
})
export class AiChatModule {}

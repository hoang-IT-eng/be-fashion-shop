import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../auth/decorators/public.decorator';
import { AiChatService } from './ai-chat.service';
import { ChatInputDto } from './dto/chat-input.dto';

@ApiTags('AI Stylist & Hybrid RAG')
@Controller('ai-chat')
export class AiChatController {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @Public()
  async sendMessage(@Req() req: Request, @Body() dto: ChatInputDto) {
    const userId = await this.extractOptionalUserId(req);
    return this.aiChatService.processMessage({
      userId,
      guestId: userId ? undefined : (req.ip ?? 'guest-rest'),
      input: dto,
    });
  }

  private async extractOptionalUserId(
    req: Request,
  ): Promise<number | undefined> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(
        auth.slice(7),
      );
      return payload.sub;
    } catch {
      return undefined;
    }
  }
}

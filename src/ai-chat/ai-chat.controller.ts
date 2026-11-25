import {
  Body,
  Controller,
  HttpCode,
  HttpException,
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

const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_BUCKETS = 5000;

@ApiTags('AI Stylist & Hybrid RAG')
@Controller('ai-chat')
export class AiChatController {
  private readonly rateBuckets = new Map<string, number[]>();

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @Public()
  async sendMessage(@Req() req: Request, @Body() dto: ChatInputDto) {
    const userId = await this.extractOptionalUserId(req);
    const rateKey = userId ? `user:${userId}` : `ip:${req.ip ?? 'unknown'}`;
    this.enforceRateLimit(rateKey);

    return this.aiChatService.processMessage({
      userId,
      guestId: userId ? undefined : (req.ip ?? 'guest-rest'),
      input: dto,
    });
  }

  private enforceRateLimit(key: string): void {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    if (this.rateBuckets.size > RATE_LIMIT_MAX_BUCKETS) {
      for (const [bucketKey, timestamps] of this.rateBuckets.entries()) {
        const active = timestamps.filter((ts) => ts > windowStart);
        if (active.length === 0) {
          this.rateBuckets.delete(bucketKey);
        } else {
          this.rateBuckets.set(bucketKey, active);
        }
      }
    }

    const recent = (this.rateBuckets.get(key) ?? []).filter(
      (ts) => ts > windowStart,
    );
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
      this.rateBuckets.set(key, recent);
      throw new HttpException(
        'Rate limit exceeded. Please wait a moment before sending more messages.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.rateBuckets.set(key, recent);
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

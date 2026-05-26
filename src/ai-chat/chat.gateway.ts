import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../auth/decorators/public.decorator';
import { AiChatService } from './ai-chat.service';
import { ChatInputDto } from './dto/chat-input.dto';

type JwtPayload = {
  sub: number;
  email: string;
};

type AuthenticatedSocket = Socket & {
  data: {
    userId?: number;
    guestId?: string;
  };
};

@Public()
@WebSocketGateway({
  namespace: '/ai-chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const userId = await this.extractUserId(client);
    if (userId) {
      client.data.userId = userId;
      client.emit('chat.welcome', {
        message: 'Connected to AI shopping assistant',
        mode: 'authenticated',
      });
      return;
    }

    client.data.guestId = client.id;
    client.emit('chat.welcome', {
      message: 'Connected as guest to AI shopping assistant',
      mode: 'guest',
    });
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    client.data = {};
  }

  @SubscribeMessage('chat.message')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async onChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ChatInputDto,
  ): Promise<void> {
    if (!body.message?.trim()) {
      client.emit('chat.error', {
        code: 'INVALID_MESSAGE',
        message: 'Message cannot be empty.',
      });
      return;
    }

    const result = await this.aiChatService.processMessage({
      userId: client.data.userId,
      guestId: client.data.guestId,
      input: {
        ...body,
        message: body.message.trim(),
      },
    });

    client.emit('chat.response', result);
  }

  private async extractUserId(client: Socket): Promise<number | undefined> {
    const authToken =
      this.getBearerToken(
        typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : undefined,
      ) ??
      this.getBearerToken(client.handshake.headers.authorization);

    if (!authToken) return undefined;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(authToken);
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  private getBearerToken(value?: string): string | undefined {
    if (!value) return undefined;
    if (value.startsWith('Bearer ')) {
      return value.slice(7);
    }
    return value;
  }
}

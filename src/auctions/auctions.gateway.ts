import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: '*' },
})
export class AuctionsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('auction:join')
  handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { auctionId?: number },
  ): void {
    if (payload?.auctionId) {
      void client.join(`auction:${payload.auctionId}`);
    }
  }

  broadcastBidPlaced(payload: {
    auctionId: number;
    currentBid: number;
    bidCount: number;
    endsAt: string;
    reserveMet: boolean;
    bid: {
      id: number;
      bidderAlias: string;
      amount: number;
      createdAt: string;
      triggeredExtension: boolean;
    };
  }): void {
    if (!this.server) return;
    this.server.emit('auction:bid_placed', payload);
    this.server
      .to(`auction:${payload.auctionId}`)
      .emit('auction:bid_placed', payload);
  }

  broadcastExtended(payload: {
    auctionId: number;
    endsAt: string;
    extendedBySeconds: number;
    antiSnipeCount: number;
  }): void {
    if (!this.server) return;
    this.server.emit('auction:extended', payload);
    this.server
      .to(`auction:${payload.auctionId}`)
      .emit('auction:extended', payload);
  }
}

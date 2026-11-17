import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuctionsService } from './auctions.service';
import { AuctionLot, AuctionStatus } from './auction-lot.entity';
import { AuctionBid } from './auction-bid.entity';
import { AuctionsGateway } from './auctions.gateway';

describe('AuctionsService', () => {
  let service: AuctionsService;
  let storedLot: AuctionLot;
  let broadcastBidMock: jest.Mock;
  let broadcastExtendedMock: jest.Mock;

  beforeEach(() => {
    const now = new Date('2026-11-17T20:00:00.000Z');
    storedLot = {
      id: 1,
      productId: 10,
      title: 'LOT 01 · Prototype Horsehide Bomber',
      subtitle: 'Atelier Sample',
      imageUrl: '/images/enigma/grail-leather-bomber.jpg',
      startingBid: 10000000,
      currentBid: 10000000,
      minIncrement: 250000,
      reservePrice: 11000000,
      bidCount: 0,
      endsAt: new Date(now.getTime() + 45_000), // 45s remaining (< 60s threshold)
      status: AuctionStatus.LIVE,
      winnerUserId: null,
      antiSnipeCount: 0,
      bids: [],
      createdAt: now,
      updatedAt: now,
    };

    broadcastBidMock = jest.fn();
    broadcastExtendedMock = jest.fn();

    const gateway = {
      broadcastBidPlaced: broadcastBidMock,
      broadcastExtended: broadcastExtendedMock,
    } as unknown as AuctionsGateway;

    const lotRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(storedLot)),
      findOneBy: jest.fn().mockImplementation(() => Promise.resolve(storedLot)),
      save: jest.fn().mockImplementation((lot: AuctionLot) => {
        storedLot = { ...storedLot, ...lot };
        return Promise.resolve(storedLot);
      }),
    } as unknown as Repository<AuctionLot>;

    const bidRepo = {
      create: jest.fn().mockImplementation((b: Partial<AuctionBid>) => ({
        id: 99,
        createdAt: new Date('2026-11-17T20:00:00.000Z'),
        ...b,
      })),
      save: jest.fn().mockImplementation((b: AuctionBid) => {
        storedLot.bids = [b, ...(storedLot.bids ?? [])];
        return Promise.resolve(b);
      }),
    } as unknown as Repository<AuctionBid>;

    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          (
            cb: (manager: {
              getRepository: (entity: unknown) => unknown;
            }) => Promise<unknown>,
          ) =>
            cb({
              getRepository: (entity: unknown) =>
                entity === AuctionLot ? lotRepo : bidRepo,
            }),
        ),
    } as unknown as DataSource;

    service = new AuctionsService(dataSource, lotRepo, bidRepo, gateway);
  });

  it('rejects a bid below currentBid + minIncrement', async () => {
    await expect(
      service.placeBid({
        auctionId: 1,
        userId: 5,
        userName: 'Kaelen',
        dto: { amount: 10100000 },
        now: new Date('2026-11-17T20:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('places valid bid and triggers +120s Anti-Snipe extension when <60s remain', async () => {
    const now = new Date('2026-11-17T20:00:00.000Z');
    const originalEndsAtMs = storedLot.endsAt.getTime();

    const res = await service.placeBid({
      auctionId: 1,
      userId: 7,
      userName: 'Kaelen',
      dto: { amount: 10500000 },
      now,
    });

    expect(res.antiSnipeExtended).toBe(true);
    expect(res.extendedBySeconds).toBe(120);
    expect(res.lot.currentBid).toBe(10500000);
    expect(res.lot.bidCount).toBe(1);
    expect(new Date(res.lot.endsAt).getTime()).toBe(originalEndsAtMs + 120_000);
    expect(broadcastBidMock).toHaveBeenCalledTimes(1);
    expect(broadcastExtendedMock).toHaveBeenCalledTimes(1);
  });
});

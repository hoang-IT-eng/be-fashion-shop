import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuctionLot, AuctionStatus } from './auction-lot.entity';
import { AuctionBid } from './auction-bid.entity';
import {
  CreateAuctionDto,
  PlaceBidDto,
  UpdateAuctionDto,
} from './dto/create-auction.dto';
import { AuctionsGateway } from './auctions.gateway';

export const ANTI_SNIPE_THRESHOLD_MS = 60_000; // < 60s remaining
export const ANTI_SNIPE_EXTENSION_MS = 120_000; // +120s extension

@Injectable()
export class AuctionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AuctionLot)
    private readonly lotRepo: Repository<AuctionLot>,
    @InjectRepository(AuctionBid)
    private readonly bidRepo: Repository<AuctionBid>,
    private readonly auctionsGateway: AuctionsGateway,
  ) {}

  async findAll(status?: string) {
    const qb = this.lotRepo
      .createQueryBuilder('lot')
      .leftJoinAndSelect('lot.bids', 'bid')
      .orderBy('lot.endsAt', 'ASC')
      .addOrderBy('bid.createdAt', 'DESC');

    if (status) {
      qb.where('lot.status = :status', { status });
    }

    const lots = await qb.getMany();
    return lots.map((lot) => this.serializeLot(lot));
  }

  async findOne(id: number) {
    const lot = await this.lotRepo.findOne({
      where: { id },
      relations: ['bids'],
    });
    if (!lot) {
      throw new NotFoundException(`Auction lot id=${id} not found`);
    }
    lot.bids = [...(lot.bids ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return this.serializeLot(lot);
  }

  async create(dto: CreateAuctionDto) {
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid endsAt timestamp');
    }
    const lot = this.lotRepo.create({
      productId: dto.productId ?? null,
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      imageUrl: dto.imageUrl ?? null,
      startingBid: dto.startingBid,
      currentBid: dto.startingBid,
      minIncrement: dto.minIncrement ?? 100000,
      reservePrice: dto.reservePrice ?? null,
      bidCount: 0,
      endsAt,
      status: dto.status ?? AuctionStatus.LIVE,
      winnerUserId: null,
      antiSnipeCount: 0,
    });
    const saved = await this.lotRepo.save(lot);
    return this.serializeLot({ ...saved, bids: [] });
  }

  async update(id: number, dto: UpdateAuctionDto) {
    const lot = await this.lotRepo.findOne({
      where: { id },
      relations: ['bids'],
    });
    if (!lot) {
      throw new NotFoundException(`Auction lot id=${id} not found`);
    }
    if (dto.title !== undefined) lot.title = dto.title;
    if (dto.subtitle !== undefined) lot.subtitle = dto.subtitle;
    if (dto.imageUrl !== undefined) lot.imageUrl = dto.imageUrl;
    if (dto.productId !== undefined) lot.productId = dto.productId;
    if (dto.startingBid !== undefined) lot.startingBid = dto.startingBid;
    if (dto.minIncrement !== undefined) lot.minIncrement = dto.minIncrement;
    if (dto.reservePrice !== undefined) lot.reservePrice = dto.reservePrice;
    if (dto.status !== undefined) lot.status = dto.status;
    if (dto.endsAt !== undefined) {
      const parsed = new Date(dto.endsAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid endsAt timestamp');
      }
      lot.endsAt = parsed;
    }
    const saved = await this.lotRepo.save(lot);
    return this.serializeLot(saved);
  }

  async placeBid(params: {
    auctionId: number;
    userId: number;
    userName?: string;
    dto: PlaceBidDto;
    now?: Date;
  }) {
    const now = params.now ?? new Date();
    const alias =
      params.dto.bidderAlias?.trim() ||
      this.formatBidderAlias(params.userName, params.userId);

    const outcome = await this.dataSource.transaction(async (manager) => {
      const lotRepo = manager.getRepository(AuctionLot);
      const bidRepo = manager.getRepository(AuctionBid);

      const lot = await lotRepo.findOne({
        where: { id: params.auctionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lot) {
        throw new NotFoundException(
          `Auction lot id=${params.auctionId} not found`,
        );
      }

      if (lot.status !== AuctionStatus.LIVE) {
        throw new BadRequestException(
          `Auction lot is not live (current status: ${lot.status})`,
        );
      }

      const endsAtTime = new Date(lot.endsAt).getTime();
      const remainingMs = endsAtTime - now.getTime();
      if (remainingMs <= 0) {
        lot.status = AuctionStatus.SETTLED;
        await lotRepo.save(lot);
        throw new BadRequestException('Auction has already ended');
      }

      const currentBidNum = Number(lot.currentBid);
      const minIncrementNum = Number(lot.minIncrement || 100000);
      const minimumAllowed = Number(
        (currentBidNum + minIncrementNum).toFixed(2),
      );

      if (params.dto.amount < minimumAllowed) {
        throw new BadRequestException(
          `Bid must be at least ${minimumAllowed} (currentBid ${currentBidNum} + minIncrement ${minIncrementNum})`,
        );
      }

      let extended = false;
      if (remainingMs < ANTI_SNIPE_THRESHOLD_MS) {
        lot.endsAt = new Date(endsAtTime + ANTI_SNIPE_EXTENSION_MS);
        lot.antiSnipeCount = (lot.antiSnipeCount ?? 0) + 1;
        extended = true;
      }

      lot.currentBid = params.dto.amount;
      lot.bidCount = (lot.bidCount ?? 0) + 1;
      lot.winnerUserId = params.userId;

      const savedLot = await lotRepo.save(lot);
      const savedBid = await bidRepo.save(
        bidRepo.create({
          auctionId: savedLot.id,
          userId: params.userId,
          bidderAlias: alias,
          amount: params.dto.amount,
          triggeredExtension: extended,
        }),
      );

      return { savedLot, savedBid, extended };
    });

    const reserveMet =
      outcome.savedLot.reservePrice === null ||
      Number(outcome.savedLot.currentBid) >=
        Number(outcome.savedLot.reservePrice);

    this.auctionsGateway.broadcastBidPlaced({
      auctionId: outcome.savedLot.id,
      currentBid: Number(outcome.savedLot.currentBid),
      bidCount: outcome.savedLot.bidCount,
      endsAt: outcome.savedLot.endsAt.toISOString(),
      reserveMet,
      bid: {
        id: outcome.savedBid.id,
        bidderAlias: outcome.savedBid.bidderAlias,
        amount: Number(outcome.savedBid.amount),
        createdAt: outcome.savedBid.createdAt.toISOString(),
        triggeredExtension: outcome.savedBid.triggeredExtension,
      },
    });

    if (outcome.extended) {
      this.auctionsGateway.broadcastExtended({
        auctionId: outcome.savedLot.id,
        endsAt: outcome.savedLot.endsAt.toISOString(),
        extendedBySeconds: ANTI_SNIPE_EXTENSION_MS / 1000,
        antiSnipeCount: outcome.savedLot.antiSnipeCount,
      });
    }

    return {
      lot: await this.findOne(outcome.savedLot.id),
      bid: {
        ...outcome.savedBid,
        amount: Number(outcome.savedBid.amount),
      },
      antiSnipeExtended: outcome.extended,
      extendedBySeconds: outcome.extended ? ANTI_SNIPE_EXTENSION_MS / 1000 : 0,
    };
  }

  async extendLot(id: number, seconds: number) {
    const lot = await this.lotRepo.findOneBy({ id });
    if (!lot) {
      throw new NotFoundException(`Auction lot id=${id} not found`);
    }
    const baseTime = Math.max(Date.now(), new Date(lot.endsAt).getTime());
    lot.endsAt = new Date(baseTime + seconds * 1000);
    if (lot.status === AuctionStatus.SETTLED) {
      lot.status = AuctionStatus.LIVE;
    }
    const saved = await this.lotRepo.save(lot);
    this.auctionsGateway.broadcastExtended({
      auctionId: saved.id,
      endsAt: saved.endsAt.toISOString(),
      extendedBySeconds: seconds,
      antiSnipeCount: saved.antiSnipeCount,
    });
    return this.findOne(saved.id);
  }

  async settleLot(id: number) {
    const lot = await this.lotRepo.findOneBy({ id });
    if (!lot) {
      throw new NotFoundException(`Auction lot id=${id} not found`);
    }
    lot.status = AuctionStatus.SETTLED;
    await this.lotRepo.save(lot);
    return this.findOne(id);
  }

  async remove(id: number) {
    const lot = await this.lotRepo.findOneBy({ id });
    if (!lot) {
      throw new NotFoundException(`Auction lot id=${id} not found`);
    }
    await this.lotRepo.remove(lot);
    return { message: `Deleted auction lot id=${id}` };
  }

  private formatBidderAlias(name: string | undefined, userId: number): string {
    const clean = (name ?? 'INITIATE')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    const suffix = String((userId * 37) % 100).padStart(2, '0');
    return `${clean || 'ARCHIVE'}_${suffix}`;
  }

  private serializeLot(lot: AuctionLot) {
    const currentBid = Number(lot.currentBid);
    const startingBid = Number(lot.startingBid);
    const minIncrement = Number(lot.minIncrement || 100000);
    const reservePrice =
      lot.reservePrice !== null && lot.reservePrice !== undefined
        ? Number(lot.reservePrice)
        : null;
    const endsAtIso = new Date(lot.endsAt).toISOString();
    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(lot.endsAt).getTime() - Date.now()) / 1000),
    );
    return {
      ...lot,
      startingBid,
      currentBid,
      minIncrement,
      nextMinimumBid: Number((currentBid + minIncrement).toFixed(2)),
      reservePrice,
      reserveMet: reservePrice === null || currentBid >= reservePrice,
      endsAt: endsAtIso,
      remainingSeconds,
      bids: (lot.bids ?? []).map((b) => ({
        ...b,
        amount: Number(b.amount),
      })),
    };
  }
}

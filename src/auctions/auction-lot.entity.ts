import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AuctionBid } from './auction-bid.entity';

export enum AuctionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
}

@Entity('auction_lots')
export class AuctionLot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  startingBid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  currentBid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 100000 })
  minIncrement: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  reservePrice: number | null;

  @Column({ type: 'int', default: 0 })
  bidCount: number;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    default: AuctionStatus.LIVE,
  })
  status: AuctionStatus;

  @Column({ type: 'int', nullable: true })
  winnerUserId: number | null;

  @Column({ type: 'int', default: 0 })
  antiSnipeCount: number;

  @OneToMany(() => AuctionBid, (bid) => bid.auction, { cascade: true })
  bids: AuctionBid[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

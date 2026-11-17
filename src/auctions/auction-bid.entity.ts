import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AuctionLot } from './auction-lot.entity';

@Entity('auction_bids')
export class AuctionBid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  auctionId: number;

  @ManyToOne(() => AuctionLot, (lot) => lot.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auctionId' })
  auction: AuctionLot;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 100 })
  bidderAlias: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'boolean', default: false })
  triggeredExtension: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

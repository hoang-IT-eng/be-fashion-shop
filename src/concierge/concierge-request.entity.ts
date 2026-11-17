import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ConciergeStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  COUNTERED = 'countered',
  ACCEPTED = 'accepted',
  SOURCED = 'sourced',
  DECLINED = 'declined',
}

@Entity('concierge_requests')
export class ConciergeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 150 })
  requesterName: string;

  @Column({ type: 'varchar', length: 255 })
  requesterEmail: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 60 })
  size: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  marketEstimate: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referenceImageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: ConciergeStatus,
    default: ConciergeStatus.PENDING,
  })
  status: ConciergeStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  counterOfferPrice: number | null;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

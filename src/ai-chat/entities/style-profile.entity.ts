import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('style_profiles')
export class StyleProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  style: string | null;

  @Column({ type: 'simple-array', nullable: true })
  colors: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  categories: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  keywords: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

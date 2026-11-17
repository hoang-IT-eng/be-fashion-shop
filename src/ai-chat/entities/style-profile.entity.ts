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

  @Column({ type: 'varchar', length: 120, nullable: true })
  archetype: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  archetypeCode: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  preferredFit: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  recommendedTier: string | null;

  @Column({ type: 'json', nullable: true })
  quizAnswers: Record<string, string> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

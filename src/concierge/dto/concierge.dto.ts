import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConciergeStatus } from '../concierge-request.entity';

export class CreateConciergeDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  requesterName?: string;

  @IsOptional()
  @IsEmail()
  requesterEmail?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  size: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  targetPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referenceImageUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewConciergeDto {
  @IsEnum(ConciergeStatus)
  status: ConciergeStatus;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  counterOfferPrice?: number;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

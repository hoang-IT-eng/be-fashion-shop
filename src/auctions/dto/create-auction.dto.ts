import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { AuctionStatus } from '../auction-lot.entity';

export class CreateAuctionDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  startingBid: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  minIncrement?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  reservePrice?: number;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;
}

export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {}

export class PlaceBidDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bidderAlias?: string;
}

export class ExtendAuctionDto {
  @IsNumber()
  @Min(30)
  @Type(() => Number)
  seconds: number;
}

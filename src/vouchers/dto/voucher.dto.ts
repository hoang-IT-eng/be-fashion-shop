import {
  IsBoolean,
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
import { DiscountType } from '../voucher.entity';

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  subtotal: number;
}

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usageLimit?: number;

  @IsOptional()
  @IsBoolean()
  isSecretInitiation?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {}

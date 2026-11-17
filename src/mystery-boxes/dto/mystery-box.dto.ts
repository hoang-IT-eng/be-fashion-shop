import {
  IsArray,
  IsBoolean,
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

export class DecodeStyleQuizDto {
  @IsString()
  @IsNotEmpty()
  silhouette: string;

  @IsString()
  @IsNotEmpty()
  palette: string;

  @IsString()
  @IsNotEmpty()
  era: string;

  @IsString()
  @IsNotEmpty()
  footwear: string;

  @IsString()
  @IsNotEmpty()
  fabric: string;

  @IsString()
  @IsNotEmpty()
  occasion: string;

  @IsString()
  @IsNotEmpty()
  grailPriority: string;

  @IsString()
  @IsNotEmpty()
  riskAppetite: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  preferredSize?: string;
}

export class CreateMysteryBoxDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tierSlug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  guaranteedMinValue: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  itemCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  archetypeMatch?: string[];

  @IsOptional()
  @IsArray()
  possibleDrops?: { title: string; rarity: string; odds: string }[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMysteryBoxDto extends PartialType(CreateMysteryBoxDto) {}

import { IsInt, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartDto {
  @IsInt()
  @Min(1)
  @IsPositive()
  @Type(() => Number)
  quantity: number;
}

import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../order.entity';

export class OrderItemDto {
  @IsNumber() productId: number;

  @IsOptional()
  @IsNumber()
  variantId?: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsString() @IsNotEmpty() name: string;
  @IsNumber() @IsPositive() price: number;
  @IsNumber() @IsPositive() quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @IsPositive()
  total: number;

  @IsString()
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  shippingName: string;

  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  shippingPhone: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  shippingAddress: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

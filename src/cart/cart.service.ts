import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepo: Repository<CartItem>,
  ) {}

  async getCart(userId: number): Promise<CartItem[]> {
    return this.cartRepo.findBy({ userId });
  }

  async addToCart(userId: number, dto: AddToCartDto): Promise<CartItem> {
    // Tìm item trùng: cùng productId + variantId (nếu có)
    const existing = await this.cartRepo.findOneBy({
      userId,
      productId: dto.productId,
      variantId: dto.variantId ?? (null as unknown as undefined),
    });

    if (existing) {
      existing.quantity += dto.quantity;
      return this.cartRepo.save(existing);
    }

    const item = this.cartRepo.create({
      ...dto,
      userId,
      variantId: dto.variantId ?? null,
      size: dto.size ?? null,
      color: dto.color ?? null,
    });
    return this.cartRepo.save(item);
  }

  async updateCart(
    userId: number,
    itemId: number,
    dto: UpdateCartDto,
  ): Promise<CartItem> {
    const item = await this.cartRepo.findOneBy({ id: itemId, userId });
    if (!item)
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    item.quantity = dto.quantity;
    return this.cartRepo.save(item);
  }

  async removeFromCart(
    userId: number,
    itemId: number,
  ): Promise<{ message: string }> {
    const item = await this.cartRepo.findOneBy({ id: itemId, userId });
    if (!item)
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    await this.cartRepo.remove(item);
    return { message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
  }
}

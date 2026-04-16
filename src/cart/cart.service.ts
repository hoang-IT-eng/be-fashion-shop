import { Injectable } from '@nestjs/common';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

// Phải có export để Controller không bị lỗi TS4053
export interface CartItem extends AddToCartDto {
  id: number;
}

@Injectable()
export class CartService {
  private cart: CartItem[] = []; 

  addToCart(addToCartDto: AddToCartDto) {
    const newItem: CartItem = {
      ...addToCartDto,    // Spread DTO trước
      id: Date.now(),     // Gán ID sau để đảm bảo không bị ghi đè
    };
    this.cart.push(newItem);
    return { message: 'Product added to cart', cart: this.cart };
  }

  updateCart(id: number, updateCartDto: UpdateCartDto) {
    const cartItem = this.cart.find((item) => item.id === id);
    if (cartItem) {
      Object.assign(cartItem, updateCartDto);
      return { message: 'Cart updated', cart: this.cart };
    }
    return { message: 'Item not found in cart' };
  }

  removeFromCart(id: number) {
    this.cart = this.cart.filter((item) => item.id !== id);
    return { message: 'Product removed from cart', cart: this.cart };
  }

  getCart() {
    return this.cart;
  }
}
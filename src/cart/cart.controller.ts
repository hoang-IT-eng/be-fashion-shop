import { Controller, Get, Post, Delete, Put, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('api/cart') // Khớp endpoint /api/cart
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get() // GET /api/cart
  getCart() {
    return this.cartService.getCart();
  }

  @Post() // POST /api/cart
  addToCart(@Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(addToCartDto);
  }

  @Put(':itemId') // PUT /api/cart/:itemId
  updateCart(@Param('itemId', ParseIntPipe) itemId: number, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.updateCart(itemId, updateCartDto);
  }

  @Delete(':itemId') // DELETE /api/cart/:itemId
  removeFromCart(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.cartService.removeFromCart(itemId);
  }
}
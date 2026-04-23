import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: Request) {
    const user = req.user as User;
    return this.cartService.getCart(user.id);
  }

  @Post()
  addToCart(@Req() req: Request, @Body() dto: AddToCartDto) {
    const user = req.user as User;
    return this.cartService.addToCart(user.id, dto);
  }

  @Put(':itemId')
  updateCart(
    @Req() req: Request,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartDto,
  ) {
    const user = req.user as User;
    return this.cartService.updateCart(user.id, itemId, dto);
  }

  @Delete(':itemId')
  removeFromCart(
    @Req() req: Request,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    const user = req.user as User;
    return this.cartService.removeFromCart(user.id, itemId);
  }
}

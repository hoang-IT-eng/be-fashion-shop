import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';

@ApiTags('Reviews')
@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // GET /products/:productId/reviews → public
  @Get()
  getByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.getByProduct(productId);
  }

  // POST /products/:productId/reviews → user đã đăng nhập
  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateReviewDto,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.reviewsService.create(user.id, productId, dto);
  }

  // DELETE /products/:productId/reviews/:id → chính user đó
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as User;
    return this.reviewsService.delete(id, user.id);
  }
}

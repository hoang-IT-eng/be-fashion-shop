import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async getByProduct(productId: number) {
    const reviews = await this.reviewRepo.find({
      where: { productId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return {
      total: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: { id: r.user.id, name: r.user.name },
      })),
    };
  }

  async create(userId: number, productId: number, dto: CreateReviewDto) {
    const existing = await this.reviewRepo.findOneBy({ userId, productId });
    if (existing) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi');
    }

    const review = this.reviewRepo.create({ ...dto, userId, productId });
    return this.reviewRepo.save(review);
  }

  async delete(id: number, userId: number) {
    const review = await this.reviewRepo.findOneBy({ id });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.userId !== userId)
      throw new BadRequestException('Bạn không có quyền xóa đánh giá này');
    await this.reviewRepo.remove(review);
    return { message: 'Đã xóa đánh giá' };
  }
}

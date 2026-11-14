import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { RedisCacheService } from '../cache/redis-cache.service';

const CATEGORIES_ACTIVE_KEY = 'cache:categories:active';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly cache: RedisCacheService,
  ) {}

  async findAll(): Promise<Category[]> {
    const cached = await this.cache.get<Category[]>(CATEGORIES_ACTIVE_KEY);
    if (cached) return cached;

    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    await this.cache.set(CATEGORIES_ACTIVE_KEY, categories);
    return categories;
  }

  findAllAdmin(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepo.findOneBy({ name: dto.name });
    if (existing) throw new ConflictException('Danh mục đã tồn tại');
    const category = this.categoryRepo.create(dto);
    const saved = await this.categoryRepo.save(category);
    await this.cache.del(CATEGORIES_ACTIVE_KEY);
    return saved;
  }

  async update(id: number, dto: Partial<CreateCategoryDto>): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category)
      throw new NotFoundException(`Không tìm thấy danh mục id=${id}`);
    Object.assign(category, dto);
    const saved = await this.categoryRepo.save(category);
    await this.cache.del(CATEGORIES_ACTIVE_KEY);
    return saved;
  }

  async toggle(id: number): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category)
      throw new NotFoundException(`Không tìm thấy danh mục id=${id}`);
    category.isActive = !category.isActive;
    const saved = await this.categoryRepo.save(category);
    await this.cache.del(CATEGORIES_ACTIVE_KEY);
    return saved;
  }

  async remove(id: number): Promise<{ message: string }> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category)
      throw new NotFoundException(`Không tìm thấy danh mục id=${id}`);
    await this.categoryRepo.remove(category);
    await this.cache.del(CATEGORIES_ACTIVE_KEY);
    return { message: `Đã xóa danh mục id=${id}` };
  }
}

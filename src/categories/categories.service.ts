import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findAllAdmin(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepo.findOneBy({ name: dto.name });
    if (existing) throw new ConflictException('Danh mục đã tồn tại');
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async update(id: number, dto: Partial<CreateCategoryDto>): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category)
      throw new NotFoundException(`Không tìm thấy danh mục id=${id}`);
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async toggle(id: number): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category)
      throw new NotFoundException(`Không tìm thấy danh mục id=${id}`);
    category.isActive = !category.isActive;
    return this.categoryRepo.save(category);
  }

  async remove(id: number): Promise<{ message: string }> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category)
      throw new NotFoundException(`Không tìm thấy danh mục id=${id}`);
    await this.categoryRepo.remove(category);
    return { message: `Đã xóa danh mục id=${id}` };
  }
}

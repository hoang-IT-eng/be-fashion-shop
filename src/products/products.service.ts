import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(query: QueryProductDto) {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = query;

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException('minPrice không được lớn hơn maxPrice');
    }

    const qb = this.productRepo.createQueryBuilder('product');

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }
    if (search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOneBy({ id });
    if (!product)
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${id}`);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findOne(id);
    await this.productRepo.remove(product);
    return { message: `Đã xóa sản phẩm id=${id} thành công` };
  }

  async findRelated(id: number, limit = 4): Promise<Product[]> {
    const product = await this.findOne(id);
    if (!product.category) return [];

    return this.productRepo
      .createQueryBuilder('product')
      .where('product.category = :category', { category: product.category })
      .andWhere('product.id != :id', { id })
      .andWhere('product.isActive = true')
      .orderBy('RANDOM()')
      .take(limit)
      .getMany();
  }

  async searchForAi(filters: {
    category?: string;
    color?: string;
    style?: string;
    minPrice?: number;
    maxPrice?: number;
    keywords?: string[];
    limit?: number;
  }): Promise<Product[]> {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .where('product.isActive = true')
      .andWhere('product.stock > 0');

    if (filters.category) {
      qb.andWhere('product.category ILIKE :category', {
        category: `%${filters.category}%`,
      });
    }

    if (filters.color) {
      qb.andWhere('product.colors ILIKE :color', {
        color: `%${filters.color}%`,
      });
    }

    if (filters.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    const searchableTerms = [
      filters.style,
      ...(filters.keywords ?? []),
    ].filter(Boolean) as string[];

    if (searchableTerms.length > 0) {
      qb.andWhere(
        searchableTerms
          .map(
            (_, idx) =>
              `(product.name ILIKE :term${idx} OR product.description ILIKE :term${idx} OR product.category ILIKE :term${idx})`,
          )
          .join(' OR '),
        Object.fromEntries(
          searchableTerms.map((term, idx) => [`term${idx}`, `%${term}%`]),
        ),
      );
    }

    const limit = filters.limit ?? 20;
    return qb.orderBy('product.createdAt', 'DESC').take(limit).getMany();
  }
}

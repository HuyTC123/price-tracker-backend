import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (dto.categoryId != null) {
        const cat = await tx.category.findUnique({
          where: { id: dto.categoryId },
        });
        if (!cat) throw new BadRequestException('Category không tồn tại');
      }

      const product = await tx.product.create({
        data: {
          name: dto.name,
          url: dto.url,
          imageUrl: dto.imageUrl,
          price: dto.price ?? null,
          categoryId: dto.categoryId ?? null,
        },
        include: { category: true },
      });

      if (dto.price != null) {
        await tx.priceHistory.create({
          data: {
            productId: product.id,
            price: dto.price,
          },
        });
      }

      return product;
    });
  }

  async findAll(filter?: { categoryId?: number; search?: string }) {
    const where: Prisma.ProductWhereInput | undefined = filter?.search
      ? {
          name: {
            contains: filter.search,
            mode: 'insensitive',
          },
        }
      : filter?.categoryId
      ? {
          categoryId: filter.categoryId,
        }
      : undefined;

    return this.prisma.product.findMany({
      where,
      orderBy: { id: 'desc' },
      include: { category: true },
    });
  }

  async setCategory(productId: number, categoryId: number | null) {
    if (categoryId !== null) {
      const cat = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!cat) throw new BadRequestException('Category không tồn tại');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: { categoryId },
      include: { category: true },
    });
  }
}
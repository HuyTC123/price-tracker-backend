import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================
  // ADD PRODUCT TO WATCHLIST
  // =========================
  async add(userId: number, productId: number) {
    // 1️⃣ check product tồn tại
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2️⃣ tạo watchlist (bắt lỗi duplicate / FK)
    try {
      return await this.prisma.watchlist.create({
        data: {
          userId,
          productId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // trùng unique (userId + productId)
        if (e.code === 'P2002') {
          throw new ConflictException('Already in watchlist');
        }

        // lỗi FK (user không tồn tại)
        if (e.code === 'P2003') {
          throw new NotFoundException('User or Product not found');
        }
      }
      throw e; // lỗi khác → 500
    }
  }

  // =========================
  // GET USER WATCHLIST
  // =========================
  async list(userId: number) {
    return this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      include: {
        product: true, // trả kèm product
      },
    });
  }

  // =========================
  // REMOVE FROM WATCHLIST
  // =========================
  async remove(userId: number, productId: number) {
    const item = await this.prisma.watchlist.findFirst({
      where: { userId, productId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Not in watchlist');
    }

    return this.prisma.watchlist.delete({
      where: { id: item.id },
    });
  }
}

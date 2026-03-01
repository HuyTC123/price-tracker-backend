// price-tracker-backend/src/alerts/alerts.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  // === Notifications (UI tab Alerts) ===
  getMyAlerts(userId: number) {
    return this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            url: true,
            imageUrl: true,
            rating: true,
            ratingCount: true,
          },
        },
      },
    });
  }

  markRead(userId: number, alertId: number) {
    return this.prisma.alert.updateMany({
      where: { id: alertId, userId },
      data: { isRead: true },
    });
  }

  // delete notification
  remove(userId: number, alertId: number) {
    return this.prisma.alert.deleteMany({
      where: { id: alertId, userId },
    });
  }

  // === Rules (UI Create Alert = tạo rule) ===
  async createRule(userId: number, dto: CreateAlertDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) throw new BadRequestException('Product not found');

    try {
      return await this.prisma.alertRule.create({
        data: {
          userId,
          productId: dto.productId,
          targetPrice: dto.targetPrice,
          isActive: true,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              url: true,
              imageUrl: true,
              rating: true,
              ratingCount: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (String(e?.code) === 'P2002') {
        throw new BadRequestException('Rule already exists for this product');
      }
      throw e;
    }
  }

  getMyRules(userId: number) {
    return this.prisma.alertRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            url: true,
            imageUrl: true,
            rating: true,
            ratingCount: true,
          },
        },
      },
    });
  }
}
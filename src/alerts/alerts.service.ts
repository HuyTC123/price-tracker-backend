import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

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

  remove(userId: number, alertId: number) {
    return this.prisma.alert.deleteMany({
      where: { id: alertId, userId },
    });
  }

  async createRule(userId: number, dto: CreateAlertDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });

    if (!product) throw new BadRequestException('Product not found');

    return this.prisma.alertRule.create({
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

  async toggleRule(userId: number, ruleId: number) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, userId },
      select: { id: true, isActive: true },
    });

    if (!rule) throw new NotFoundException('Rule not found');

    return this.prisma.alertRule.update({
      where: { id: ruleId },
      data: { isActive: !rule.isActive },
    });
  }

  async deleteRule(userId: number, ruleId: number) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, userId },
      select: { id: true },
    });

    if (!rule) throw new NotFoundException('Rule not found');

    return this.prisma.alertRule.delete({
      where: { id: ruleId },
    });
  }
}
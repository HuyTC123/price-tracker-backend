import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { PriceFetcherService } from "./price-fetcher.service";

@Injectable()
export class PricesService {
  // Logger: Công cụ để ghi lại nhật ký hoạt động của hệ thống, giúp theo dõi tiến độ Cron Job trong Terminal.
  private readonly logger = new Logger(PricesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceFetcher: PriceFetcherService,
  ) {}

  async getHistory(productId: number) {
    return this.prisma.priceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createSnapshot(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new Error("Product not found");

    // ✅ fetch giá thật + rating
    
    const info = await this.priceFetcher.fetchInfo(product.url); // ví dụ url là link shopee,tiki..
    const currentPrice = info.price;

    const last = await this.prisma.priceHistory.findFirst({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
    const lastPrice = last?.price ?? null;   // ?? gán tạm thời

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        price: currentPrice,
        lastCheckedAt: new Date(),
        rating: info.rating ?? null,
        ratingCount: info.ratingCount ?? null,
      },
    });

    // giữ behavior: luôn insert history
    const history = await this.prisma.priceHistory.create({
      data: { productId, price: currentPrice },
    });

    // alert kiểu cũ khi giá giảm cho watchers
    if (lastPrice !== null && currentPrice < lastPrice) {
      const watchers = await this.prisma.watchlist.findMany({
        where: { productId },
        select: { userId: true },
      });

      if (watchers.length > 0) {
        await this.prisma.alert.createMany({
          data: watchers.map((w) => ({
            userId: w.userId,
            productId,
            oldPrice: lastPrice,
            newPrice: currentPrice,
          })),
        });
      }
    }

    // ✅ AlertRule crossing
    const rules = await this.prisma.alertRule.findMany({
      where: { productId, isActive: true },
      select: { id: true, userId: true, targetPrice: true },
    });

    const crossed = rules.filter((r) => {
      if (lastPrice === null) return currentPrice <= r.targetPrice;
      return lastPrice > r.targetPrice && currentPrice <= r.targetPrice;
    });

    if (crossed.length > 0) {
      await this.prisma.alert.createMany({
        data: crossed.map((r) => ({
          userId: r.userId,
          productId,
          oldPrice: lastPrice ?? currentPrice,
          newPrice: currentPrice,
        })),
      });

      await this.prisma.alertRule.updateMany({
        where: { id: { in: crossed.map((r) => r.id) } },
        data: { isActive: false },
      });
    }

    return history;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async snapshotAllProducts() {
    this.logger.log("Cron snapshotAllProducts started");

    const products = await this.prisma.product.findMany({
      select: { id: true },
    });

    for (const p of products) {
      try {
        await this.createSnapshot(p.id);
      } catch (e: any) {
        this.logger.error(`Snapshot failed for productId=${p.id}: ${e?.message ?? e}`);
      }
    }

    this.logger.log("Cron snapshotAllProducts done");
  }
}
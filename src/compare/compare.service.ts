import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CompareService {
  constructor(private readonly prisma: PrismaService) {}

  async compare(ids: string) {
    const productIds = (ids || "")
      .split(",")   // .split(","): Biến chuỗi "1,2,3" thành mảng ["1", "2", "3"]
      .map((x) => Number(x.trim()))  // .map((x) => Number(x.trim())): Chuyển các ký tự thành kiểu số (Number) và xóa khoảng trắng thừa
      .filter((n) => Number.isFinite(n) && n > 0);       // .filter(...): Loại bỏ các giá trị không phải là số hoặc số âm để đảm bảo dữ liệu sạch

    if (productIds.length === 0) {
      throw new BadRequestException("ids is required. Example: ids=1,2,3");
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },  // Database sẽ trả về một danh sách (mảng) chứa tất cả các sản phẩm có ID khớp với những con số trong danh sách productIds
      select: {  // select: Chỉ lấy các thông tin cần thiết để so sánh (giá, rating...) nhằm tối ưu hiệu năng
        id: true,
        name: true,
        url: true,
        imageUrl: true,
        price: true,
        createdAt: true,
        lastCheckedAt: true,
        rating: true,
        ratingCount: true,
      },
    });

    if (products.length === 0) return [];

    const histories = await this.prisma.priceHistory.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, price: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const map: Record<number, { price: number; createdAt: Date }[]> = {};
    // map: Record<...> : để định nghĩa là cái map này phải có cấu trúc của 1 Record và cho cái j bậy vào   
    // Record<K, V> : K là nhãn và V là giá trị của nhãn 
    for (const h of histories) {
      (map[h.productId] ||= []).push({ price: h.price, createdAt: h.createdAt });
    }

    return products.map((p) => {
      const list = map[p.id] || [];

      const prices = list.map((x) => x.price);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const maxPrice = prices.length ? Math.max(...prices) : null;

      const latestHistory = list[0] || null;
      const prevHistory = list[1] || null;

      const currentPrice =
        typeof p.price === "number" ? p.price : latestHistory?.price ?? null;

      const previousPrice = prevHistory?.price ?? null;

      const priceChange =
        currentPrice != null && previousPrice != null
          ? currentPrice - previousPrice
          : null;

      const percentChange =
        priceChange != null && previousPrice != null && previousPrice !== 0
          ? (priceChange / previousPrice) * 100
          : null;

      return {
        id: p.id,
        name: p.name,
        url: p.url,
        imageUrl: p.imageUrl ?? null,

        rating: p.rating ?? null,
        ratingCount: p.ratingCount ?? null,

        currentPrice,
        lastCheckedAt: p.lastCheckedAt ?? p.createdAt,

        minPrice,
        maxPrice,
        priceChange,
        percentChange,
      };
    });
  }
}
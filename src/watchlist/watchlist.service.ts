import {   
  ConflictException,    // exception của NestJS dùng để báo lỗi 409 Conflict (thường dùng khi dữ liệu bị trùng).
  Injectable,          
  NotFoundException,   
} from '@nestjs/common';   // kết thúc import từ thư viện @nestjs/common.
import { PrismaService } from '../prisma/prisma.service';   // import PrismaService để service này có thể truy cập database thông qua Prisma ORM.
import { Prisma } from '@prisma/client';   // import namespace Prisma để sử dụng các type và error class của Prisma.

@Injectable()     // decorator của NestJS để đánh dấu class WatchlistService là provider (service) có thể được inject vào controller hoặc service khác.
export class WatchlistService {  // khai báo class WatchlistService và export để module khác có thể sử dụng.
  constructor(private readonly prisma: PrismaService) {}   // constructor sử dụng Dependency Injection để NestJS tự động inject PrismaService vào service này.

  // =========================
  // ADD PRODUCT TO WATCHLIST
  // =========================
  async add(userId: number, productId: number) {  // khai báo hàm add, nhận vào userId và productId, dùng async vì sẽ có thao tác database (await).
    // 1️⃣ check product tồn tại
    const product = await this.prisma.product.findUnique({   // gọi Prisma để tìm một product theo id trong database.
      where: { id: productId },   // điều kiện tìm product có id bằng productId.
      select: { id: true },  // chỉ lấy field id của product thay vì lấy toàn bộ dữ liệu.
    });

    if (!product) {   // nếu product không tồn tại (kết quả query trả về null).
      throw new NotFoundException('Product not found');  // ném exception 404 báo rằng product không tồn tại.
    }

    // 2️⃣ tạo watchlist (bắt lỗi duplicate / FK)
    try {    // bắt đầu khối try để xử lý lỗi khi insert database.
      return await this.prisma.watchlist.create({   // gọi Prisma để tạo record mới trong bảng watchlist.
        data: {   // bắt đầu object dữ liệu sẽ insert.
          userId,    // lưu userId vào record watchlist.
          productId,   // lưu productId vào record watchlist.
        },  // kết thúc object data.
      });  // kết thúc câu lệnh create.
    } catch (e) {   // nếu có lỗi xảy ra khi insert database thì bắt lỗi.
      if (e instanceof Prisma.PrismaClientKnownRequestError) {   // kiểm tra lỗi có phải là lỗi database do Prisma định nghĩa hay không.
        // trùng unique (userId + productId)
        if (e.code === 'P2002') {  // nếu lỗi có code P2002 (duplicate unique constraint).
          throw new ConflictException('Already in watchlist');  // ném lỗi 409 báo rằng sản phẩm đã tồn tại trong watchlist.
        }

        // lỗi FK (user không tồn tại)
        if (e.code === 'P2003') {   // nếu lỗi có code P2003 (foreign key constraint).
          throw new NotFoundException('User or Product not found');   // ném lỗi 404 nếu user hoặc product không tồn tại.
        }
      }
      throw e; // lỗi khác → 500
    }
  }

  // =========================
  // GET USER WATCHLIST
  // =========================
  async list(userId: number) {   // khai báo method list để lấy watchlist của user.
    return this.prisma.watchlist.findMany({   // query database để tìm nhiều record watchlist.
      where: { userId },   // chỉ lấy các watchlist có userId bằng user hiện tại.
      orderBy: { id: 'desc' },   // sắp xếp kết quả theo id giảm dần (mới nhất trước).
      include: {   // chỉ định các relation cần lấy kèm.
        product: true, // trả kèm product
      },
    });
  }

  // =========================
  // REMOVE FROM WATCHLIST
  // =========================
  async remove(userId: number, productId: number) {   // khai báo method remove để xóa watchlist item.
    const item = await this.prisma.watchlist.findFirst({   // tìm record watchlist đầu tiên thỏa điều kiện userId và productId.
      where: { userId, productId },   // điều kiện tìm record có userId và productId tương ứng.
      select: { id: true },   // chỉ lấy id của record watchlist.
    });

    if (!item) {
      throw new NotFoundException('Not in watchlist');   // ném lỗi 404 vì sản phẩm không có trong watchlist.
    }

    return this.prisma.watchlist.delete({   // gọi Prisma để xóa record watchlist.
      where: { id: item.id },   // xóa record có id tương ứng.
    });
  }
}

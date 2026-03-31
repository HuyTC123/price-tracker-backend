import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';  // import các decorator và utility cần thiết từ NestJS để định nghĩa controller và các route HTTP.
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'; // ✅ thêm // import các decorator từ Swagger để tạo tài liệu API tự động (Swagger documentation).
import { WatchlistService } from './watchlist.service';   // import WatchlistService để controller có thể gọi các logic trong service.
import { JwtAuthGuard } from '../auth/jwt-auth.guard';  // import JwtAuthGuard để bảo vệ các API, yêu cầu phải có JWT hợp lệ để truy cập.
import { CurrentUser } from '../auth/current-user.decorator';  // import decorator custom CurrentUser dùng để lấy thông tin user hiện tại từ request.

@ApiTags('Watchlist')          // ✅ thêm (để swagger nhóm đẹp)  // decorator từ Swagger dùng để nhóm các API trong controller này vào nhóm "Watchlist" trong giao diện Swagger UI.
@ApiBearerAuth('bearer')       // ✅ thêm (tên 'bearer' phải khớp với main.ts)  // decorator thông báo với Swagger rằng các API trong controller này yêu cầu Authorization header với Bearer token.
@UseGuards(JwtAuthGuard)      // áp dụng guard JwtAuthGuard để bảo vệ tất cả API trong controller này, chỉ người dùng với JWT hợp lệ mới có thể truy cập.
@Controller('watchlist')      // decorator định nghĩa đây là một controller với route base là /watchlist.
export class WatchlistController {     // khai báo class WatchlistController và xuất ra để các module khác có thể sử dụng.
  constructor(private readonly watchlistService: WatchlistService) {}    // constructor sử dụng Dependency Injection để NestJS tự động inject WatchlistService vào controller này.

  @Post(':productId')   // decorator @Post định nghĩa route HTTP POST với đường dẫn /watchlist/:productId. Đây là API để thêm sản phẩm vào watchlist.
  add(@CurrentUser() user: any, @Param('productId') productId: string) {  // method add dùng để xử lý thêm sản phẩm vào watchlist. // - @CurrentUser() lấy thông tin user từ request. // - @Param('productId') lấy productId từ URL parameter.
    return this.watchlistService.add(Number(user.id), Number(productId));  // gọi service watchlistService.add để thêm sản phẩm vào watchlist. Dữ liệu user.id và productId sẽ được convert sang kiểu number và truyền vào.
  }

  @Get()   // decorator @Get định nghĩa route HTTP GET với đường dẫn /watchlist. Đây là API để lấy danh sách các sản phẩm trong watchlist của user.
  list(@CurrentUser() user: any) {   // method list dùng để xử lý lấy danh sách watchlist của user hiện tại. @CurrentUser() lấy thông tin user từ request.
    return this.watchlistService.list(Number(user.id));  // gọi service watchlistService.list để lấy danh sách watchlist của user. Dữ liệu user.id sẽ được convert sang kiểu number và truyền vào.
  }

  @Delete(':productId')   // decorator @Delete định nghĩa route HTTP DELETE với đường dẫn /watchlist/:productId. Đây là API để xóa sản phẩm khỏi watchlist.
  remove(@CurrentUser() user: any, @Param('productId') productId: string) {   // method remove dùng để xử lý xóa sản phẩm khỏi watchlist. // - @CurrentUser() lấy thông tin user từ request.// - @Param('productId') lấy productId từ URL parameter.
    return this.watchlistService.remove(Number(user.id), Number(productId));  // gọi service watchlistService.remove để xóa sản phẩm khỏi watchlist. Dữ liệu user.id và productId sẽ được convert sang kiểu number và truyền vào.
  }
}
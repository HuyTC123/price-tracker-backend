import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'; // ✅ thêm
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Watchlist')          // ✅ thêm (để swagger nhóm đẹp)
@ApiBearerAuth('bearer')       // ✅ thêm (tên 'bearer' phải khớp với main.ts)
@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Post(':productId')
  add(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.watchlistService.add(Number(user.id), Number(productId));
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.watchlistService.list(Number(user.id));
  }

  @Delete(':productId')
  remove(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.watchlistService.remove(Number(user.id), Number(productId));
  }
}
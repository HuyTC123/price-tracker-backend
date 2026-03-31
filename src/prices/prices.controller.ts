import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PricesService } from './prices.service';
import { UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard"; // chỉnh path cho đúng


@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  // ==============================
  // GET /prices/:productId/history
  // ==============================
  @Get(':productId/history')
  getHistory(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.pricesService.getHistory(productId);
  }

  // ==============================
  // POST /prices/:productId/history
  // (manual snapshot)
  // ==============================
  @Post(':productId/history')
  createHistory(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.pricesService.createSnapshot(productId);
  }
  
}

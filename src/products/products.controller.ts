import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SetCategoryDto } from './dto/set-category.dto';
import { UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard"; // chỉnh path cho đúng

@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    const id = categoryId ? Number(categoryId) : undefined;
    return this.productsService.findAll({ categoryId: Number.isFinite(id) ? id : undefined });
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id/category')
  setCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetCategoryDto,
  ) {
    // dto.categoryId có thể undefined -> treat như null
    return this.productsService.setCategory(id, dto.categoryId ?? null);
  }
}

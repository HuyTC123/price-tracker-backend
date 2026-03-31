import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SetCategoryDto } from './dto/set-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    if (categoryId && search?.trim()) {
      throw new BadRequestException(
        'Chỉ được dùng search hoặc categoryId, không dùng cùng lúc',
      );
    }

    const id = categoryId ? Number(categoryId) : undefined;

    return this.productsService.findAll({
      categoryId: Number.isFinite(id) ? id : undefined,
      search: search?.trim() || undefined,
    });
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
    return this.productsService.setCategory(id, dto.categoryId ?? null);
  }
}
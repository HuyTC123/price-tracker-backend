import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 16' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://example.com/iphone-16' })
  @IsUrl()
  url: string;

  // ✅ NEW - bắt buộc có ảnh
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  // ✅ NEW - optional category
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  categoryId?: number;
}

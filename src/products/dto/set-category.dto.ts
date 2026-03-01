import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class SetCategoryDto {
  @ApiPropertyOptional({ example: 1, description: 'id category, null để bỏ category' })
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;
}

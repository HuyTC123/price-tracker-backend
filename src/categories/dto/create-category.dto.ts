import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Tai nghe' })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({ example: 'tai-nghe' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;
}

import { IsInt, IsNumber } from 'class-validator';

export class CreateAlertDto {
  @IsInt()
  productId: number;

  @IsNumber()
  targetPrice: number;
}

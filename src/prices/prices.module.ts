import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { PriceFetcherService } from './price-fetcher.service';

@Module({
  imports: [PrismaModule],
  controllers: [PricesController],
  providers: [PricesService, PriceFetcherService],
})
export class PricesModule {}

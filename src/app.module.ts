import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

import { CompareModule } from './compare/compare.module';

import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { PricesModule } from './prices/prices.module';
import { AlertsModule } from './alerts/alerts.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    ProductsModule,
    CategoriesModule,
    WatchlistModule,
    PricesModule,
    AlertsModule,
    DevicesModule,
    CompareModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

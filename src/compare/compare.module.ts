import { Module } from '@nestjs/common';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompareController],
  providers: [CompareService],
})
export class CompareModule {}

import { Controller, Get, Query } from '@nestjs/common';
import { CompareService } from './compare.service';
import { UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard"; // chỉnh path cho đúng

@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller('compare')
export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  // GET /compare?ids=1,2,3
  @Get()
  compare(@Query('ids') ids: string) {
    return this.compareService.compare(ids);
  }
}

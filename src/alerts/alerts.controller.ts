import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('alerts')
@ApiBearerAuth('bearer')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // UI section: "Alerts" (notifications)
  @Get()
  getMyAlerts(@CurrentUser() user: any) {
    return this.alertsService.getMyAlerts(user.id);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.alertsService.markRead(user.id, id);
  }

  // ✅ NEW: Delete notification (Alert)
  @Delete(':id')
  remove(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.alertsService.remove(user.id, id);
  }

  // UI button: "Create Alert" -> tạo rule
  @Post()
  createRule(@CurrentUser() user: any, @Body() dto: CreateAlertDto) {
    return this.alertsService.createRule(user.id, dto);
  }

  // (tuỳ chọn) debug rules
  @Get('rules')
  getMyRules(@CurrentUser() user: any) {
    return this.alertsService.getMyRules(user.id);
  }
}
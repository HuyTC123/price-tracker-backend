import { Controller } from '@nestjs/common';
import { UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard"; // chỉnh path cho đúng

@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {}

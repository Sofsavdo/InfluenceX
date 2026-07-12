import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // PRD Creator Dashboard "Analytics"
  @UseGuards(TelegramAuthGuard)
  @Get('creator')
  creatorAnalytics(@Req() req: Request & { userId: string }) {
    return this.analyticsService.creatorAnalytics(req.userId);
  }

  // PRD Business Dashboard "Analytics"
  @UseGuards(TelegramAuthGuard)
  @Get('business')
  businessAnalytics(@Req() req: Request & { userId: string }) {
    return this.analyticsService.businessAnalytics(req.userId);
  }
}

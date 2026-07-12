import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { EarningsService } from './earnings.service';

@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  // PRD Creator Dashboard "Earnings"
  @UseGuards(TelegramAuthGuard)
  @Get('creator')
  creatorSummary(@Req() req: Request & { userId: string }) {
    return this.earningsService.creatorSummary(req.userId);
  }

  // PRD Business Dashboard "Payments"
  @UseGuards(TelegramAuthGuard)
  @Get('business')
  businessSummary(@Req() req: Request & { userId: string }) {
    return this.earningsService.businessSummary(req.userId);
  }
}

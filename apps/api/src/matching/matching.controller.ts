import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { MatchingService } from './matching.service';

// PRD "AI Creator Matching" - faqat kampaniya egasi biznes o'z kampaniyasi uchun
// tavsiya etilgan kreatorlar ro'yxatini ko'ra oladi (xuddi applications.service.ts
// findForCampaign() bilan bir xil egalik tekshiruvi naqshi).
@Controller('campaigns')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @UseGuards(TelegramAuthGuard)
  @Get(':campaignId/recommended-creators')
  recommend(
    @Req() req: Request & { userId: string },
    @Param('campaignId') campaignId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : 20;
    return this.matchingService.recommendForCampaign(req.userId, campaignId, parsedLimit);
  }
}

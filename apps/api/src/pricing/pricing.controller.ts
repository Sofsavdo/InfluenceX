import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { PricingService } from './pricing.service';
import { PricingQueryDto } from './dto/pricing-query.dto';
import { ContentType, CollaborationModel } from '@influencex/shared';

// PRD "AI Pricing Engine" - biznes zayavkalarni ko'rib chiqayotganda yoki kreator
// o'z profilini to'ldirayotganda "adolatli bozor narxi" tavsiyasini ko'radi.
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @UseGuards(TelegramAuthGuard)
  @Get('recommend/:creatorId')
  recommend(@Param('creatorId') creatorId: string, @Query() query: PricingQueryDto) {
    return this.pricingService.recommendForCreator(
      creatorId,
      query.contentType ?? ContentType.REEL,
      query.collaborationModel ?? CollaborationModel.FIXED,
    );
  }
}

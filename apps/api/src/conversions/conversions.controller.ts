import { Body, Controller, Get, Param, Patch, Post, Redirect, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { UserRole } from '@influencex/shared';
import { ConversionsService } from './conversions.service';
import { ReportConversionDto } from './dto/report-conversion.dto';
import { RejectConversionDto } from './dto/reject-conversion.dto';
import { MarkConversionPaidDto } from './dto/mark-conversion-paid.dto';
import { WebhookConversionDto } from './dto/webhook-conversion.dto';

@Controller()
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

  // PRD "CPA": biznes haqiqiy sotuv/lid hodisasini qayd etadi
  @UseGuards(TelegramAuthGuard)
  @Post('applications/:id/conversions')
  report(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: ReportConversionDto,
  ) {
    return this.conversionsService.report(req.userId, id, dto);
  }

  @UseGuards(TelegramAuthGuard)
  @Get('applications/:id/conversions')
  listForApplication(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.conversionsService.listForApplication(req.userId, id);
  }

  @UseGuards(TelegramAuthGuard)
  @Patch('conversions/:id/confirm')
  confirm(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.conversionsService.confirm(req.userId, id);
  }

  @UseGuards(TelegramAuthGuard)
  @Patch('conversions/:id/reject')
  reject(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: RejectConversionDto,
  ) {
    return this.conversionsService.reject(req.userId, id, dto.note);
  }

  // Click'da avtomatik chiqim API'si yo'q - moderator/admin qo'lda to'lagach shu yerda belgilaydi.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Patch('conversions/:id/mark-paid')
  markPaid(@Param('id') id: string, @Body() dto: MarkConversionPaidDto) {
    return this.conversionsService.markPaid(id, dto.payoutReference);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get('conversions/unpaid')
  listUnpaid() {
    return this.conversionsService.listUnpaidForAdmin();
  }

  // PUBLIC (server-to-server) - biznesning o'z tizimi sotuv/obuna yakunlanganda shu yerga
  // signal beradi. Guard yo'q (Telegram/JWT foydalanuvchisi emas, biznesning backend'i) -
  // o'rniga imzo (HMAC-uslub) conversions.service.ts#reportViaWebhook ichida tekshiriladi.
  @Post('conversions/webhook/:campaignId')
  reportViaWebhook(@Param('campaignId') campaignId: string, @Body() dto: WebhookConversionDto) {
    return this.conversionsService.reportViaWebhook(campaignId, dto);
  }

  // PUBLIC - kreator trafigini kuzatish uchun (bio havolasi -> bu yerga -> campaign.landingUrl'ga redirect).
  // Guard yo'q, chunki bu havolani bosadigan tashqi auditoriya InfluenceX foydalanuvchisi emas.
  @Get('track/:applicationId')
  @Redirect()
  async track(@Param('applicationId') applicationId: string) {
    const url = await this.conversionsService.trackClick(applicationId);
    return { url, statusCode: 302 };
  }
}

import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { SubmitContentDto } from './dto/submit-content.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @UseGuards(TelegramAuthGuard)
  @Post()
  apply(@Req() req: Request & { userId: string }, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.apply(req.userId, dto);
  }

  @UseGuards(TelegramAuthGuard)
  @Get('mine')
  findMine(@Req() req: Request & { userId: string }) {
    return this.applicationsService.findMineAsCreator(req.userId);
  }

  // Faqat kampaniya egasi biznes ko'ra oladi - zayavkachilar ro'yxati (ism, taklif narxi,
  // xabar) shaxsiy ma'lumot hisoblanadi, ochiq API bo'lmasligi kerak.
  @UseGuards(TelegramAuthGuard)
  @Get('campaign/:campaignId')
  findForCampaign(
    @Req() req: Request & { userId: string },
    @Param('campaignId') campaignId: string,
  ) {
    return this.applicationsService.findForCampaign(req.userId, campaignId);
  }

  @UseGuards(TelegramAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(req.userId, id, dto.status);
  }

  // PRD v2 §4.3 workflow 8-bosqich: kreator ishlagan kontent havolasini yuboradi
  @UseGuards(TelegramAuthGuard)
  @Post(':id/submit-content')
  submitContent(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: SubmitContentDto,
  ) {
    return this.applicationsService.submitContent(req.userId, id, dto);
  }
}

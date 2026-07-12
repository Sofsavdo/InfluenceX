import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { FeatureCampaignDto } from './dto/feature-campaign.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @UseGuards(TelegramAuthGuard)
  @Post()
  create(@Req() req: Request & { userId: string }, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(req.userId, dto);
  }

  @Get()
  findPublic(
    @Query('contentType') contentType?: string,
    @Query('collaborationModel') collaborationModel?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.campaignsService.findPublic({
      contentType,
      collaborationModel,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @UseGuards(TelegramAuthGuard)
  @Get('mine')
  findMine(@Req() req: Request & { userId: string }) {
    return this.campaignsService.findMineAsBusiness(req.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @UseGuards(TelegramAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCampaignStatusDto,
  ) {
    return this.campaignsService.updateStatus(req.userId, id, dto);
  }

  // PRD "Featured Placement": "Businesses can promote campaigns"
  @UseGuards(TelegramAuthGuard)
  @Post(':id/feature')
  feature(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: FeatureCampaignDto,
  ) {
    return this.campaignsService.feature(req.userId, id, dto.days);
  }
}

import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @UseGuards(TelegramAuthGuard)
  @Post()
  create(@Req() req: Request & { userId: string }, @Body() dto: CreateRatingDto) {
    return this.ratingsService.create(req.userId, dto);
  }

  @Get('user/:userId')
  findForUser(@Param('userId') userId: string) {
    return this.ratingsService.findForUser(userId);
  }

  // Mini App "Baholang" tugmasini ko'rsatish/yashirish uchun - joriy foydalanuvchi shu
  // kampaniya bo'yicha allaqachon baho qo'yganmi (2026-07-12 qo'shildi).
  @UseGuards(TelegramAuthGuard)
  @Get('mine/has-rated')
  hasRated(@Req() req: Request & { userId: string }, @Query('campaignId') campaignId: string) {
    return this.ratingsService.hasRated(req.userId, campaignId);
  }
}

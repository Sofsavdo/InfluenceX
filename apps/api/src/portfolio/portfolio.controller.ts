import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { PortfolioService } from './portfolio.service';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @UseGuards(TelegramAuthGuard)
  @Post()
  add(@Req() req: Request & { userId: string }, @Body() dto: AddPortfolioItemDto) {
    return this.portfolioService.add(req.userId, dto);
  }

  @UseGuards(TelegramAuthGuard)
  @Get('mine')
  listMine(@Req() req: Request & { userId: string }) {
    return this.portfolioService.listMine(req.userId);
  }

  // PUBLIC - biznes zayavkachi kreatorning portfolio namunalarini ko'radi.
  @Get('creator/:creatorId')
  listForCreator(@Param('creatorId') creatorId: string) {
    return this.portfolioService.listForCreator(creatorId);
  }

  @UseGuards(TelegramAuthGuard)
  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.portfolioService.remove(req.userId, id);
  }
}

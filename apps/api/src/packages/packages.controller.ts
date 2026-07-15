import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

// HybridAuthGuard: Telegram Mini App ICHIDA va Telegram TASHQARISIDA (telefon+OTP orqali
// kirgan veb foydalanuvchi) - ikkalasi ham o'z paketlarini boshqara olishi kerak.
@Controller('creator-packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @UseGuards(HybridAuthGuard)
  @Post()
  create(@Req() req: Request & { userId: string }, @Body() dto: CreatePackageDto) {
    return this.packagesService.create(req.userId, dto);
  }

  @UseGuards(HybridAuthGuard)
  @Get('mine')
  listMine(@Req() req: Request & { userId: string }) {
    return this.packagesService.listMine(req.userId);
  }

  @UseGuards(HybridAuthGuard)
  @Patch(':id')
  update(@Req() req: Request & { userId: string }, @Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(req.userId, id, dto);
  }

  @UseGuards(HybridAuthGuard)
  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.packagesService.remove(req.userId, id);
  }
}

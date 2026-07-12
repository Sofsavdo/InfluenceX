import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetVisibilityDto } from './dto/set-visibility.dto';

// PRD kelajak reja "Shop Integrations" - yengil versiya (2026-07-12). Faqat biznes egasi
// o'z mahsulotlarini ko'radi/boshqaradi - ommaviy ko'rinish alohida "do'kon" endpoint'i
// orqali EMAS, balki avtomatik yaratilgan CPA kampaniya sifatida GET /campaigns (mavjud
// ommaviy feed) orqali chiqadi (campaigns.service.ts#findPublic).
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(TelegramAuthGuard)
  @Post()
  create(@Req() req: Request & { userId: string }, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.userId, dto);
  }

  @UseGuards(TelegramAuthGuard)
  @Get('mine')
  listMine(@Req() req: Request & { userId: string }) {
    return this.productsService.listMine(req.userId);
  }

  @UseGuards(TelegramAuthGuard)
  @Patch(':id')
  update(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(req.userId, id, dto);
  }

  @UseGuards(TelegramAuthGuard)
  @Patch(':id/visibility')
  setVisibility(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: SetVisibilityDto,
  ) {
    return this.productsService.setVisibility(req.userId, id, dto.visible);
  }

  @UseGuards(TelegramAuthGuard)
  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.productsService.remove(req.userId, id);
  }
}

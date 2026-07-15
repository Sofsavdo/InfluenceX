import { Controller, Get, Param, Query } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { PackagesService } from '../packages/packages.service';

// Hammasi PUBLIC - Collabstr'da ham kreator qidiruvi/profili ro'yxatdan o'tmasdan
// ko'rinadi ("Search Creators - Free to search"). Faqat aloqa/buyurtma bosqichida
// autentifikatsiya kerak bo'ladi (creator-packages.controller.ts, applications va h.k.).
@Controller('creators')
export class CreatorsController {
  constructor(
    private readonly creatorsService: CreatorsService,
    private readonly packagesService: PackagesService,
  ) {}

  @Get()
  search(
    @Query('category') category?: string,
    @Query('platform') platform?: string,
    @Query('country') country?: string,
    @Query('minFollowers') minFollowers?: string,
    @Query('maxFollowers') maxFollowers?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.creatorsService.search({
      category,
      platform,
      country,
      minFollowers: minFollowers ? parseInt(minFollowers, 10) : undefined,
      maxFollowers: maxFollowers ? parseInt(maxFollowers, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.creatorsService.getPublicProfile(id);
  }

  @Get(':id/packages')
  listPackages(@Param('id') id: string) {
    return this.packagesService.listForCreator(id);
  }
}

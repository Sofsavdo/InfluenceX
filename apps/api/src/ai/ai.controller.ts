import { Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { GenerateBriefDto } from './dto/generate-brief.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  // PRD: "Business describes product. AI generates professional campaign brief automatically."
  @UseGuards(TelegramAuthGuard)
  @Post('brief')
  async generateBrief(@Req() req: Request & { userId: string }, @Body() dto: GenerateBriefDto) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId: req.userId } });
    if (!business) {
      throw new ForbiddenException('AI Brief Generator faqat biznes profili to\'ldirilgandan keyin ishlaydi');
    }
    return this.aiService.generateBrief(dto);
  }
}

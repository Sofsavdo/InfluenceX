import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { UsersService } from './users.service';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { SubmitVerificationRequestDto } from './dto/submit-verification-request.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { PromoteProfileDto } from './dto/promote-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(TelegramAuthGuard)
  @Get('me')
  me(@Req() req: Request & { userId: string }) {
    return this.usersService.me(req.userId);
  }

  @UseGuards(TelegramAuthGuard)
  @Put('me/creator-profile')
  updateCreatorProfile(
    @Req() req: Request & { userId: string },
    @Body() dto: UpdateCreatorProfileDto,
  ) {
    return this.usersService.upsertCreatorProfile(req.userId, dto);
  }

  @UseGuards(TelegramAuthGuard)
  @Put('me/business-profile')
  updateBusinessProfile(
    @Req() req: Request & { userId: string },
    @Body() dto: UpdateBusinessProfileDto,
  ) {
    return this.usersService.upsertBusinessProfile(req.userId, dto);
  }

  @UseGuards(TelegramAuthGuard)
  @Post('me/verification-request')
  submitVerificationRequest(
    @Req() req: Request & { userId: string },
    @Body() dto: SubmitVerificationRequestDto,
  ) {
    return this.usersService.submitVerificationRequest(req.userId, dto);
  }

  // PRD "Subscription Plans"
  @UseGuards(TelegramAuthGuard)
  @Put('me/subscription-plan')
  updateSubscriptionPlan(
    @Req() req: Request & { userId: string },
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.usersService.updateSubscriptionPlan(req.userId, dto);
  }

  // PRD "Featured Placement": kreator o'z profilini reklama qiladi
  @UseGuards(TelegramAuthGuard)
  @Post('me/promote-profile')
  promoteProfile(@Req() req: Request & { userId: string }, @Body() dto: PromoteProfileDto) {
    return this.usersService.promoteProfile(req.userId, dto.days);
  }
}

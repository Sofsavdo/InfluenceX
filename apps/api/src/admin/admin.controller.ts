import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { UserRole } from '@influencex/shared';
import { AdminService } from './admin.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';

// PRD v2 par.2: Admin Panel - apps/admin (Next.js, desktop brauzer), Mini App emas.
// Shuning uchun TelegramAuthGuard emas, JwtAuthGuard (email+parol orqali olingan Bearer token).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.overview();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('campaigns')
  listCampaigns() {
    return this.adminService.listCampaigns();
  }

  @Get('escrows')
  listEscrows() {
    return this.adminService.listEscrows();
  }

  @Get('disputes')
  listDisputes() {
    return this.adminService.listDisputes();
  }

  @Get('verification-requests')
  listVerificationRequests() {
    return this.adminService.listVerificationRequests();
  }

  @Get('fraud-signals')
  fraudSignals() {
    return this.adminService.fraudSignals();
  }

  // PRD Admin Panel "Revenue Reports"
  @Get('revenue')
  revenueReport() {
    return this.adminService.revenueReport();
  }

  @Patch('verification-requests/:id')
  reviewVerification(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.adminService.reviewVerification(req.userId, id, dto);
  }
}

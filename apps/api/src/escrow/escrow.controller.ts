import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { UserRole } from '@influencex/shared';
import { EscrowService } from './escrow.service';
import { CreateDepositIntentDto } from './dto/create-deposit-intent.dto';
import { RaiseDisputeDto } from './dto/raise-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ConfirmManualPayoutDto } from './dto/confirm-manual-payout.dto';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @UseGuards(TelegramAuthGuard)
  @Post(':id/deposit-intent')
  initiateDeposit(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: CreateDepositIntentDto,
  ) {
    return this.escrowService.initiateDeposit(req.userId, id, dto.provider);
  }

  @UseGuards(TelegramAuthGuard)
  @Post(':id/release')
  approveAndRelease(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.escrowService.approveAndRelease(req.userId, id);
  }

  @UseGuards(TelegramAuthGuard)
  @Post(':id/refund')
  refund(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.escrowService.refund(req.userId, id);
  }

  @UseGuards(TelegramAuthGuard)
  @Post(':id/dispute')
  raiseDispute(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: RaiseDisputeDto,
  ) {
    return this.escrowService.raiseDispute(req.userId, id, dto);
  }

  // Faqat Moderator/Admin, Admin Panel orqali (JWT) - PRD: "Nizo holatida moderator dalillarni ko'rib chiqadi"
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Patch(':id/dispute/resolve')
  resolveDispute(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.escrowService.resolveDispute(req.userId, id, dto);
  }

  // Click'da avtomatik chiqim (payout) API'si yo'q - moderator/admin Click Business
  // ilovasi orqali blogerga QOʻLDA pul o'tkazgach, shu yerda tasdiqlaydi.
  // Bu InfluenceX↔bloger hamkorlik shartnomasi bo'yicha to'lov, escrow'dagi
  // "omonat" emas - RELEASE_PENDING -> RELEASED o'tishini yakunlaydi.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Patch(':id/confirm-manual-payout')
  confirmManualPayout(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: ConfirmManualPayoutDto,
  ) {
    return this.escrowService.confirmManualPayout(req.userId, id, dto.payoutReference);
  }
}

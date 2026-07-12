import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { EscrowWebhooksController } from './escrow-webhooks.controller';
import { ClickWebhookController } from './click-webhook.controller';
import { PaymeProvider } from './payment-providers/payme.provider';
import { ClickProvider } from './payment-providers/click.provider';
import { UzumProvider } from './payment-providers/uzum.provider';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [TelegramBotModule],
  controllers: [EscrowController, EscrowWebhooksController, ClickWebhookController],
  providers: [EscrowService, PaymeProvider, ClickProvider, UzumProvider],
  exports: [EscrowService],
})
export class EscrowModule {}

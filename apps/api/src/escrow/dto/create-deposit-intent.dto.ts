import { IsEnum } from 'class-validator';
import { PaymentProvider } from '@influencex/shared';

export class CreateDepositIntentDto {
  @IsEnum(PaymentProvider) provider: PaymentProvider;
}

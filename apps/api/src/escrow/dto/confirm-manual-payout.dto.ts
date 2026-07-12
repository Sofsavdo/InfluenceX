import { IsOptional, IsString } from 'class-validator';

export class ConfirmManualPayoutDto {
  @IsOptional()
  @IsString()
  payoutReference?: string;
}

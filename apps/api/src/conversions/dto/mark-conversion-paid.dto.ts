import { IsOptional, IsString } from 'class-validator';

export class MarkConversionPaidDto {
  @IsOptional()
  @IsString()
  payoutReference?: string;
}

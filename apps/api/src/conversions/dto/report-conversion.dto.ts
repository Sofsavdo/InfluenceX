import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ConversionType } from '@influencex/shared';

export class ReportConversionDto {
  @IsEnum(ConversionType)
  type: ConversionType;

  // Biznes ushbu konversiya uchun to'lashga rozi bo'lgan yalpi summa (odatda campaign.cpaRate,
  // lekin biznesga moslashuvchanlik uchun har bir konversiyada qayta ko'rsatish imkoniyati beriladi).
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  trackingRef?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

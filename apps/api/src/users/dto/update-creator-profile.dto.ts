import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Language, PaymentProvider } from '@influencex/shared';

export class UpdateCreatorProfileDto {
  @IsString() name: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() languages?: Language[];
  @IsOptional() @IsArray() categories?: string[];
  @IsOptional() socialLinks?: Record<string, string>;
  @IsOptional() @IsInt() @Min(0) followers?: number;
  @IsOptional() @IsInt() @Min(0) avgViews?: number;
  // 0-100 (%) - AI Pricing Engine (pricing.service.ts) va Fraud Detection
  // (fraud-detection.service.ts) shu maydonga bevosita tayanadi.
  @IsOptional() @IsNumber() @Min(0) @Max(100) engagementRate?: number;

  // PRD v2 §4.5: InfluenceX kreatorga hamkorlik haqini shu rekvizitlar orqali to'laydi
  // (o'z pudratchisiga xarajat sifatida - "biznes puli"ni uzatish emas).
  @IsOptional() @IsEnum(PaymentProvider) payoutProvider?: PaymentProvider;
  @IsOptional() @IsString() payoutAccount?: string; // Uzcard/Humo karta yoki Payme/Click hisobi
}

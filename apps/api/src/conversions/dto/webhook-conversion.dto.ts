import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ConversionType } from '@influencex/shared';

// CPA atributsiya - "WEBHOOK" darajasi (2026-07-12, eng ishonchli avtomatik mexanizm).
// Biznesning o'z sayti/ilovasi/boti sotuv/obuna/ro'yxatdan o'tish YAKUNLANGAN zahoti shu
// endpoint'ga so'rov yuboradi - inson tomonidan "keyinroq kiritish" yoki tanlab yashirish
// imkoniyatini yo'qqa chiqaradi (click.provider.ts'dagi Click imzo naqshiga mos).
export class WebhookConversionDto {
  // CampaignApplication.referralCode - qaysi bloger olib kelgan mijozni aniqlaydi.
  @IsString() referralCode: string;

  @IsEnum(ConversionType) type: ConversionType;

  @IsNumber() @Min(0) amount: number;

  // Biznes tizimidagi buyurtma/obuna ID (audit uchun ixtiyoriy dalil).
  @IsOptional() @IsString() externalRef?: string;

  // Imzo formulasi: sha256(`${campaignId}:${referralCode}:${type}:${amount}:${timestamp}:${webhookSecret}`)
  // Replay hujumidan himoya uchun timestamp yangiligi ham tekshiriladi (+-15 daqiqa).
  @IsString() timestamp: string;
  @IsString() signature: string;
}

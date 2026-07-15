import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Platform, ContentType } from '@influencex/shared';

// 2026-07-15 (Collabstr tahlili): kreator o'zi narxlagan tayyor xizmat -
// masalan "1 Instagram Reel - 700,000 UZS".
export class CreatePackageDto {
  @IsEnum(Platform) platform: Platform;
  @IsEnum(ContentType) contentType: ContentType;

  @IsString() title: string;
  @IsOptional() @IsString() description?: string;

  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsString() currency?: string; // standart UZS

  @IsOptional() @IsInt() @Min(0) deliveryDays?: number;
}

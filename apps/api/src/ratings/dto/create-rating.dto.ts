import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRatingDto {
  @IsString() targetUserId: string;
  // 2026-07-12 xavfsizlik tuzatishi: campaignId ENDI MAJBURIY - ratings.service.ts#create
  // buni haqiqiy tugallangan hamkorlikni tekshirish uchun ishlatadi (ixtiyoriy bo'lganda
  // hech qanday egalik tekshiruvi qilib bo'lmas edi).
  @IsString() campaignId: string;
  @IsInt() @Min(1) @Max(5) score: number;
  @IsOptional() @IsString() comment?: string;
}

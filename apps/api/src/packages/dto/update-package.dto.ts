import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Platform, ContentType } from '@influencex/shared';

export class UpdatePackageDto {
  @IsOptional() @IsEnum(Platform) platform?: Platform;
  @IsOptional() @IsEnum(ContentType) contentType?: ContentType;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;

  @IsOptional() @IsInt() @Min(0) deliveryDays?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

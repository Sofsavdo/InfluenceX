import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ContentType } from '@influencex/shared';

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsUrl({ require_tld: false }) externalUrl?: string;
  @IsOptional() @IsNumber() @Min(0) cpaRate?: number;
  @IsOptional() @IsEnum(ContentType) contentType?: ContentType;
}

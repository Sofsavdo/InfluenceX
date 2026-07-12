import { IsOptional, IsString, IsUrl } from 'class-validator';

export class AddPortfolioItemDto {
  // S3'ga yuklangan rasm/video URL'i (uploads/presign, purpose: 'portfolio')
  @IsUrl()
  mediaUrl: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

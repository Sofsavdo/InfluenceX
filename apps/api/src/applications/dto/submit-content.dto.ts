import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class SubmitContentDto {
  // Odatda S3'ga yuklangan fayl(lar) publicUrl'i (uploads/presign, purpose: portfolio)
  // yoki Instagram/TikTok/YouTube'dagi jonli post havolasi.
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  contentUrls: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

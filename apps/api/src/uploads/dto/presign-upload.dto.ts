import { IsIn, IsString, Matches } from 'class-validator';

// Ruxsat etilgan yuklash maqsadlari - har biri o'z S3 papkasiga va fayl hajmi/turi
// cheklovlariga ega bo'lishi mumkin (uploads.service.ts#PURPOSE_CONFIG).
export type UploadPurpose = 'avatar' | 'logo' | 'chat-attachment' | 'portfolio' | 'verification-document' | 'dispute-evidence' | 'content-submission';

export class PresignUploadDto {
  @IsIn(['avatar', 'logo', 'chat-attachment', 'portfolio', 'verification-document', 'dispute-evidence', 'content-submission'])
  purpose: UploadPurpose;

  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'fileName faqat harf, raqam, . _ - belgilaridan iborat bo\'lishi kerak' })
  fileName: string;

  @IsString()
  contentType: string;
}

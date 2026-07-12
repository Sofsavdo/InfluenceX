import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { UploadPurpose } from './dto/presign-upload.dto';

// Har bir maqsad uchun ruxsat etilgan MIME turlari va maksimal hajm (bayt).
// Client tomonidan yolg'on contentType yuborilishi mumkin - bu yerdagi tekshiruv
// faqat "ochiq xato" larni ushlaydi (masalan .exe yuklashga urinish), to'liq
// himoya uchun ishlab chiqarishda S3 bucket policy + antivirus skanerlash tavsiya etiladi.
const PURPOSE_CONFIG: Record<UploadPurpose, { prefix: string; allowedMime: string[]; maxBytes: number }> = {
  avatar: { prefix: 'avatars', allowedMime: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024 },
  logo: { prefix: 'logos', allowedMime: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024 },
  'chat-attachment': {
    prefix: 'chat-attachments',
    allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'],
    maxBytes: 25 * 1024 * 1024,
  },
  portfolio: {
    prefix: 'portfolio',
    allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    maxBytes: 100 * 1024 * 1024,
  },
  // Pasport/guvohnoma kabi hujjatlar - faqat moderator ko'radi (Admin Panel -> Verifikatsiya).
  'verification-document': {
    prefix: 'verification-documents',
    allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxBytes: 15 * 1024 * 1024,
  },
  // Nizo ochilganda dalil sifatida (screenshot, video) - moderator ko'radi.
  'dispute-evidence': {
    prefix: 'dispute-evidence',
    allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'],
    maxBytes: 50 * 1024 * 1024,
  },
  // Kreator ishlagan kontentni topshirganda (PRD workflow 8-bosqich).
  'content-submission': {
    prefix: 'content-submissions',
    allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    maxBytes: 200 * 1024 * 1024,
  },
};

export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSeconds: number;
}

/**
 * S3-compatible (AWS S3, MinIO, Selectel, Yandex Object Storage va h.k.) uchun
 * presigned URL generatori. Fayl binary'si API serveri orqali emas, to'g'ridan
 * to'g'ri client -> S3 ga (PUT so'rovi bilan) yuboriladi - bu API serverini
 * katta fayl trafigidan ozod qiladi va MVP uchun eng oddiy/arzon variant.
 */
@Injectable()
export class S3Service {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): S3Client {
    if (this.client) return this.client;

    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const region = this.config.get<string>('S3_REGION', 'eu-central-1');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'S3 sozlanmagan (S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY .env da yo\'q)',
      );
    }

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      // Ko'pchilik S3-compatible provayderlar (MinIO va h.k.) uchun path-style kerak bo'ladi;
      // haqiqiy AWS S3 uchun bu .env orqali S3_FORCE_PATH_STYLE=false qilib o'chiriladi.
      forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
    });
    return this.client;
  }

  async presignUpload(purpose: UploadPurpose, fileName: string, contentType: string): Promise<PresignResult> {
    const cfg = PURPOSE_CONFIG[purpose];
    if (!cfg.allowedMime.includes(contentType)) {
      throw new InternalServerErrorException(
        `"${purpose}" uchun "${contentType}" turi ruxsat etilmagan (ruxsat: ${cfg.allowedMime.join(', ')})`,
      );
    }

    const bucket = this.config.get<string>('S3_BUCKET');
    if (!bucket) throw new InternalServerErrorException('S3_BUCKET .env da yo\'q');

    const ext = fileName.includes('.') ? fileName.split('.').pop() : undefined;
    const key = `${cfg.prefix}/${randomUUID()}${ext ? `.${ext}` : ''}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const expiresInSeconds = 300; // 5 daqiqa - Mini App'da fayl tanlab, darhol yuklashga yetarli
    const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: expiresInSeconds });

    const publicUrlBase = this.config.get<string>('S3_PUBLIC_URL_BASE');
    const bucketEndpoint = this.config.get<string>('S3_ENDPOINT', '');
    const publicUrl = publicUrlBase
      ? `${publicUrlBase.replace(/\/$/, '')}/${key}`
      : `${bucketEndpoint.replace(/\/$/, '')}/${bucket}/${key}`;

    return { uploadUrl, publicUrl, key, expiresInSeconds };
  }
}

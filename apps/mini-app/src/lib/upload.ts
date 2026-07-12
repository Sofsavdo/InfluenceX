import { apiClient } from '../api/client';

export type UploadPurpose = 'avatar' | 'logo' | 'chat-attachment' | 'portfolio' | 'verification-document' | 'dispute-evidence' | 'content-submission';

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSeconds: number;
}

/**
 * apps/api/src/uploads bilan bog'lanadi: (1) API'dan presigned PUT URL so'raladi
 * (Telegram initData bilan himoyalangan), (2) fayl to'g'ridan-to'g'ri S3'ga PUT
 * qilinadi (API serveri orqali o'tmaydi), (3) natijaviy publicUrl qaytariladi -
 * shu URL keyin creatorProfile.avatarUrl / businessProfile.logoUrl / chat
 * attachmentUrl kabi maydonlarga saqlanadi.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<string> {
  const presign = await apiClient.post<PresignResponse>('/uploads/presign', {
    purpose,
    fileName: file.name,
    contentType: file.type,
  });

  const putRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`Faylni S3'ga yuklab bo'lmadi: ${putRes.status}`);
  }

  return presign.publicUrl;
}

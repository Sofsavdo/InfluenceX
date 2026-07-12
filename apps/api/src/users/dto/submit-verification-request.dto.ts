import { IsOptional, IsString } from 'class-validator';

export class SubmitVerificationRequestDto {
  @IsOptional() @IsString() documentUrl?: string; // uploads/presign (purpose: verification-document) orqali yuklanadi
  @IsOptional() @IsString() note?: string;
}

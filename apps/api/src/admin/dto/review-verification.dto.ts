import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '@influencex/shared';

export class ReviewVerificationDto {
  @IsEnum(VerificationStatus) status: VerificationStatus; // VERIFIED | REJECTED
  @IsOptional() @IsString() note?: string;
}

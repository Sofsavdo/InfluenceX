import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CollaborationModel, ContentType } from '@influencex/shared';

class CreatorRequirementsDto {
  @IsOptional() @IsInt() @Min(0) minFollowers?: number;
  @IsOptional() @IsInt() @Min(0) maxFollowers?: number;
  @IsOptional() platforms?: string[];
  @IsOptional() categories?: string[];
  @IsOptional() countries?: string[];
}

// PRD v2 §4.3 — Kampaniya yaratish uchun talab qilinadigan maydonlar (PRD v1'dan meros)
export class CreateCampaignDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsString() productOrService: string;
  @IsString() objective: string;

  @IsEnum(ContentType) contentType: ContentType;
  @IsEnum(CollaborationModel) collaborationModel: CollaborationModel;

  @IsNumber() @Min(0) budget: number;
  @IsOptional() @IsString() currency?: string; // standart UZS

  @IsInt() @Min(1) creatorsCount: number;
  @IsDateString() deadline: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatorRequirementsDto)
  requirements?: CreatorRequirementsDto;

  // PRD "CPA"/"Hybrid" modellari uchun - 2026-07-11 qo'shildi.
  @IsOptional() @IsNumber() @Min(0) cpaRate?: number;
  @IsOptional() @IsString() landingUrl?: string;
}

import { IsEnum, IsOptional } from 'class-validator';
import { ContentType, CollaborationModel } from '@influencex/shared';

export class PricingQueryDto {
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsEnum(CollaborationModel)
  collaborationModel?: CollaborationModel;
}

import { IsEnum } from 'class-validator';
import { CampaignStatus } from '@influencex/shared';

export class UpdateCampaignStatusDto {
  @IsEnum(CampaignStatus) status: CampaignStatus;
}

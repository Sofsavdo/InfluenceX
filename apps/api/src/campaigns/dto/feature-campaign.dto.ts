import { IsInt, Max, Min } from 'class-validator';

export class FeatureCampaignDto {
  // Necha kunga "Featured" qilib belgilash (PRD "Featured Placement").
  @IsInt()
  @Min(1)
  @Max(30)
  days: number;
}

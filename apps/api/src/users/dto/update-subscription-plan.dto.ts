import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '@influencex/shared';

export class UpdateSubscriptionPlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}

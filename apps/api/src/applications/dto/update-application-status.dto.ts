import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '@influencex/shared';

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus) status: ApplicationStatus;
}

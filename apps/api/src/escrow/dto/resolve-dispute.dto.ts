import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DisputeStatus } from '@influencex/shared';

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus) resolution: DisputeStatus; // RESOLVED_CREATOR | RESOLVED_BUSINESS | RESOLVED_SPLIT
  @IsOptional() @IsString() resolutionNote?: string;
}

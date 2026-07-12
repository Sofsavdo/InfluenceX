import { IsArray, IsOptional, IsString } from 'class-validator';

export class RaiseDisputeDto {
  @IsString() reason: string;
  @IsOptional() @IsArray() evidenceUrls?: string[];
}

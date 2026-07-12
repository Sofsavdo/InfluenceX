import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateApplicationDto {
  @IsString() campaignId: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsNumber() @Min(0) proposedPrice?: number;
}

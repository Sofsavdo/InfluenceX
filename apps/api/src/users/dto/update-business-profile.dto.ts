import { IsOptional, IsString } from 'class-validator';

export class UpdateBusinessProfileDto {
  @IsString() companyName: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() contactPerson?: string;
}

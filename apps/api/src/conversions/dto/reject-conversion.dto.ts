import { IsOptional, IsString } from 'class-validator';

export class RejectConversionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

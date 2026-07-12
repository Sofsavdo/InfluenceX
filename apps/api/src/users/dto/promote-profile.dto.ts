import { IsInt, Max, Min } from 'class-validator';

export class PromoteProfileDto {
  @IsInt()
  @Min(1)
  @Max(30)
  days: number;
}

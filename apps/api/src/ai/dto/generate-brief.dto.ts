import { IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateBriefDto {
  @IsString() @MinLength(10) productDescription: string;
  @IsOptional() @IsString() objectiveHint?: string; // masalan "sotuvni oshirish", "brend tanilishi"
  @IsOptional() @IsString() budgetHint?: string; // masalan "2,000,000 UZS atrofida"
}

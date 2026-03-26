import { IsString, IsNumber, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(10000)
  targetAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  targetYears?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentSavings?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.04)
  @Max(0.25)
  expectedReturnRate?: number;
}

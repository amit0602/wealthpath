import { IsString, IsNumber, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(10000)      // ₹10,000 minimum target
  targetAmount: number;

  @IsNumber()
  @Min(1)
  @Max(50)         // 1–50 years
  targetYears: number;

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

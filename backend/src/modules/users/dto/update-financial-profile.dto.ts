import { IsOptional, IsNumber, IsInt, IsString, Min, Max } from 'class-validator';

// riskAppetite values: conservative | moderate | aggressive
// retirementCityTier values: metro | tier1 | tier2 | tier3
export class UpdateFinancialProfileDto {
  @IsOptional() @IsNumber() monthlyGrossIncome?: number;
  @IsOptional() @IsNumber() monthlyTakeHome?: number;
  @IsOptional() @IsNumber() monthlyExpenses?: number;
  @IsOptional() @IsNumber() monthlyEmi?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10) dependentsCount?: number;
  @IsOptional() @IsString() riskAppetite?: string;
  @IsOptional() @IsInt() @Min(40) @Max(70) targetRetirementAge?: number;
  @IsOptional() @IsNumber() desiredMonthlyIncome?: number;
  @IsOptional() @IsString() retirementCity?: string;
  @IsOptional() @IsString() retirementCityTier?: string;
  @IsOptional() @IsNumber() @Min(0.02) @Max(0.12) inflationAssumption?: number;
  @IsOptional() @IsNumber() @Min(0.04) @Max(0.20) expectedReturnPre?: number;
  @IsOptional() @IsNumber() @Min(0.03) @Max(0.15) expectedReturnPost?: number;
  @IsOptional() @IsNumber() @Min(0.02) @Max(0.05) withdrawalRate?: number;
  @IsOptional() @IsInt() @Min(70) @Max(100) lifeExpectancy?: number;
}

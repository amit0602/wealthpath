import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertInsuranceDto {
  @IsOptional() @IsBoolean() hasTermInsurance?: boolean;
  @IsOptional() @IsNumber() @Min(0) termCoverAmount?: number;
  @IsOptional() @IsNumber() @Min(0) annualTermPremium?: number;
  @IsOptional() @IsBoolean() hasHealthInsurance?: boolean;
  @IsOptional() @IsNumber() @Min(0) healthCoverAmount?: number;
  @IsOptional() @IsNumber() @Min(0) annualHealthPremium?: number;
}

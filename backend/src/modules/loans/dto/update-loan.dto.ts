import { IsString, IsNumber, IsIn, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

const LOAN_TYPES = ['home', 'car', 'personal', 'education', 'other'];

export class UpdateLoanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(LOAN_TYPES)
  loanType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  outstandingBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  interestRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  remainingTenureMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  emiAmount?: number;
}

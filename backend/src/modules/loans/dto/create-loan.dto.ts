import { IsString, IsNumber, IsIn, Min, Max, MinLength, MaxLength } from 'class-validator';

const LOAN_TYPES = ['home', 'car', 'personal', 'education', 'other'];

export class CreateLoanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsIn(LOAN_TYPES)
  loanType: string;

  @IsNumber()
  @Min(1000)
  outstandingBalance: number;

  @IsNumber()
  @Min(1)
  @Max(50)          // annual interest rate %
  interestRate: number;

  @IsNumber()
  @Min(1)
  @Max(360)         // up to 30 years
  remainingTenureMonths: number;

  @IsNumber()
  @Min(1)
  emiAmount: number;
}

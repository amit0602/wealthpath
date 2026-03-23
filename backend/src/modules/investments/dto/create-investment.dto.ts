import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// InstrumentType values: epf | ppf | nps_tier1 | nps_tier2 | elss | fd | rd |
// direct_equity | real_estate | gold | sgb | mutual_fund_equity | mutual_fund_debt | other
export class CreateInvestmentDto {
  @ApiProperty({ example: 'mutual_fund_equity' })
  @IsString()
  instrumentType: string;

  @ApiProperty({ example: 'HDFC Flexi Cap Fund' })
  @IsString()
  name: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @Min(0)
  currentValue: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional() @IsNumber() @Min(0) monthlyContribution?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0) annualContribution?: number;

  @ApiPropertyOptional({ example: 0.12 })
  @IsOptional() @IsNumber() @Min(0) expectedReturnRate?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString() startDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString() maturityDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString() lockInUntil?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() interestRate?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;
}

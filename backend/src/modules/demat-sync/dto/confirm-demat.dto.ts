import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EquityHoldingDto {
  @IsString()
  companyName: string;

  @IsString()
  isin: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  currentValue: number;

  @IsNumber()
  @Min(0)
  costValue: number;

  @IsString()
  @IsIn(['direct_equity', 'sgb', 'gold', 'mutual_fund_equity', 'other'])
  instrumentType: string;

  @IsNumber()
  @Min(0)
  expectedReturnRate: number;

  @IsOptional()
  @IsString()
  depository?: string;
}

export class ConfirmDematDto {
  @IsString()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquityHoldingDto)
  holdings: EquityHoldingDto[];
}

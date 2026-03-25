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

export class HoldingDto {
  @IsString()
  schemeName: string;

  @IsOptional()
  @IsString()
  isin?: string;

  @IsNumber()
  @Min(0)
  units: number;

  @IsNumber()
  @Min(0)
  currentValue: number;

  @IsNumber()
  @Min(0)
  costValue: number;

  @IsString()
  @IsIn(['mutual_fund_equity', 'mutual_fund_debt', 'elss'])
  instrumentType: string;

  @IsNumber()
  @Min(0)
  expectedReturnRate: number;
}

export class ConfirmImportDto {
  @IsString()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HoldingDto)
  holdings: HoldingDto[];
}

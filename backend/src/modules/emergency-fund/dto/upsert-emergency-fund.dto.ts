import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpsertEmergencyFundDto {
  @IsNumber()
  @Min(0)
  liquidSavings: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  targetMonths?: number;
}

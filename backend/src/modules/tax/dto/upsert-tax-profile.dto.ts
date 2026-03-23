import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpsertTaxProfileDto {
  @IsNumber() @Min(0) grossSalary: number;
  @IsOptional() @IsNumber() @Min(0) hraReceived?: number;
  @IsOptional() @IsNumber() @Min(0) rentPaid?: number;
  @IsOptional() @IsBoolean() isMetro?: boolean;
  @IsOptional() @IsNumber() @Min(0) section80cUsed?: number;
  @IsOptional() @IsNumber() @Min(0) section80dUsed?: number;
  @IsOptional() @IsNumber() @Min(0) section80ccd1bUsed?: number;
  @IsOptional() @IsNumber() @Min(0) homeLoanInterest?: number;
}

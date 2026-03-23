import { IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FireCalculateDto {
  @ApiPropertyOptional({ description: 'Override target retirement age', example: 55 })
  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(70)
  targetRetirementAge?: number;

  @ApiPropertyOptional({ description: 'Override life expectancy', example: 85 })
  @IsOptional()
  @IsInt()
  @Min(70)
  @Max(100)
  lifeExpectancy?: number;

  @ApiPropertyOptional({ description: 'Override inflation rate', example: 0.06 })
  @IsOptional()
  @IsNumber()
  @Min(0.02)
  @Max(0.12)
  inflationRate?: number;

  @ApiPropertyOptional({ description: 'Override pre-retirement expected return', example: 0.12 })
  @IsOptional()
  @IsNumber()
  @Min(0.04)
  @Max(0.20)
  expectedReturnPre?: number;

  @ApiPropertyOptional({ description: 'Override post-retirement expected return', example: 0.07 })
  @IsOptional()
  @IsNumber()
  @Min(0.03)
  @Max(0.15)
  expectedReturnPost?: number;

  @ApiPropertyOptional({ description: 'Override withdrawal rate (3.33% recommended for India)', example: 0.0333 })
  @IsOptional()
  @IsNumber()
  @Min(0.02)
  @Max(0.05)
  withdrawalRate?: number;

  @ApiPropertyOptional({ description: 'Additional monthly SIP on top of existing contributions (what-if)', example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500000)
  additionalMonthlySip?: number;
}

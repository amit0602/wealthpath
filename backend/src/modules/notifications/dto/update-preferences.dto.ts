import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  driftAlertsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  taxRemindersEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  driftThresholdPercent?: number;
}

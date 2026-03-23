import { IsNumber, IsBoolean, Min } from 'class-validator';

export class HraCalculateDto {
  @IsNumber() @Min(0) basicSalary: number;
  @IsNumber() @Min(0) hraReceived: number;
  @IsNumber() @Min(0) rentPaid: number;
  @IsBoolean() isMetro: boolean;
}

import { IsOptional, IsString, IsDateString } from 'class-validator';

// employmentType values: salaried | self_employed | business | other
// cityTier values: metro | tier1 | tier2 | tier3
export class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() employmentType?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() cityTier?: string;
}

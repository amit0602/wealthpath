import { IsIn, IsString, Length } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  @Length(1, 512)
  token: string;

  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform: string;
}

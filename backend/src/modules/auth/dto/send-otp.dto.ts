import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Must be a valid Indian mobile number (+91XXXXXXXXXX)' })
  phoneNumber: string;
}

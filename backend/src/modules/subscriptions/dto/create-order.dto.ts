import { IsIn } from 'class-validator';

export class CreateOrderDto {
  @IsIn(['monthly', 'annual'])
  plan: 'monthly' | 'annual';
}

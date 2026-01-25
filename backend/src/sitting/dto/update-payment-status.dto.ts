import { IsIn } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsIn(['UNPAID', 'PAID', 'REFUNDED'])
  paymentStatus!: 'UNPAID' | 'PAID' | 'REFUNDED';
}

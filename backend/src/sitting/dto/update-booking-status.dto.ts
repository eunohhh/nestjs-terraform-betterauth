import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['CONFIRMED', 'COMPLETED', 'CANCELLED'])
  bookingStatus!: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

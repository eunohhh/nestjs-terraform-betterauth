import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSittingBookingDto {
  @IsOptional()
  @IsString()
  reservationKst?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  contactMethod?: string;

  @IsOptional()
  @IsString()
  catName?: string;

  @IsOptional()
  @IsString()
  addressSnapshot?: string;

  @IsOptional()
  @IsString()
  entryNoteSnapshot?: string;
}

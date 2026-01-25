import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSittingCareDto {
  @IsUUID()
  bookingId!: string;

  // KST 로컬 문자열: "2026-02-01T18:00:00"
  @IsString()
  careTimeKst!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

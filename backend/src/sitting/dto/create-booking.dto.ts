import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSittingBookingDto {
  @IsUUID()
  clientId!: string;

  // KST 로컬 문자열: "2026-02-01T10:30:00"
  @IsString()
  reservationKst!: string;

  @IsInt()
  @Min(0)
  expectedAmount!: number;

  @IsInt()
  @Min(0)
  amount!: number;

  // 선택: entryNoteSnapshot을 강제로 덮고 싶다면
  @IsOptional()
  @IsString()
  entryNoteSnapshotOverride?: string;

  // 선택: addressSnapshot을 강제로 덮고 싶다면
  @IsOptional()
  @IsString()
  addressSnapshotOverride?: string;

  // 선택: catName을 강제로 덮고 싶다면
  @IsOptional()
  @IsString()
  catNameOverride?: string;
}

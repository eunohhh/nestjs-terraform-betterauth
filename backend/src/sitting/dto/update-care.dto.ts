import { IsOptional, IsString } from 'class-validator';

export class UpdateSittingCareDto {
  @IsOptional()
  @IsString()
  careTimeKst?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

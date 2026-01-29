import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  morningAlertHour?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  beforeMinutes?: number;
}

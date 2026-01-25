import { IsOptional, IsString } from 'class-validator';

export class CreateSittingClientDto {
  @IsString()
  clientName!: string;

  @IsString()
  catName!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  entryNote?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  catPic?: string;
}

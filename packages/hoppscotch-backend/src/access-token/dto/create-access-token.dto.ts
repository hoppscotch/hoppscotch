import { IsNotEmpty, IsNumber, IsString, ValidateIf } from 'class-validator';

// Inputs to create a new PAT
export class CreateAccessTokenDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @ValidateIf((o) => o.expiryInDays !== null)
  @IsNumber()
  expiryInDays: number | null;
}

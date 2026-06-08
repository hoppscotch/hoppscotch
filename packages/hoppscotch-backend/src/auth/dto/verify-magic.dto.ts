import { IsNotEmpty, IsString } from 'class-validator';

// Inputs to verify and sign a user in via magic-link
export class VerifyMagicDto {
  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}

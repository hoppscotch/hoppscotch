import { IsEmail } from 'class-validator';

// Inputs to initiate Magic-Link auth flow
export class SignInMagicDto {
  @IsEmail()
  email: string;
}

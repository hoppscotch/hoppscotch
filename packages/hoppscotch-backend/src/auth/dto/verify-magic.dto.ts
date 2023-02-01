// Inputs to verify and sign a user in via magic-link
export class VerifyMagicDto {
  deviceIdentifier: string;
  token: string;
}

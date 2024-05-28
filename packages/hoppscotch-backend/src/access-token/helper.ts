import { AccessToken } from 'src/types/AccessToken';

// Response type of PAT creation method
export type CreateAccessTokenResponse = {
  token: string;
  info: AccessToken;
};

// Response type of any error in PAT module
export type CLIErrorResponse = {
  message: string;
};

// Return a CLIErrorResponse object
export function createCLIErrorResponse(message: string): CLIErrorResponse {
  return { message };
}

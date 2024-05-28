import { AccessToken } from 'src/types/AccessToken';

// Response type of PAT creation method
export type CreateAccessTokenResponse = {
  token: string;
  info: AccessToken;
};

// Response type of any error in PAT module
export type CLIErrorResponse = {
  reason: string;
};

// Return a CLIErrorResponse object
export function createCLIErrorResponse(reason: string): CLIErrorResponse {
  return { reason };
}

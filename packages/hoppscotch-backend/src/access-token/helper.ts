import { AccessToken } from 'src/types/AccessToken';

// Response type of PAT creation method
export type CreateAccessTokenResponse = {
  token: string;
  info: AccessToken;
};

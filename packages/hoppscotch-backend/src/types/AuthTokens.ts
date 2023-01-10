// refer to https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims#registered-claims
export interface AccessTokenPayload {
  iss: string; // iss:issuer
  sub: string; // sub:subject
  aud: [string]; // aud:audience
  iat?: number; // iat:issued at time
}

export interface RefreshTokenPayload {
  iss: string;
  sub: string;
  aud: [string];
  iat?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

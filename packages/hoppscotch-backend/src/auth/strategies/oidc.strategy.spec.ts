import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mockDeep, mockReset } from 'jest-mock-extended';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import {
  AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH,
  AUTH_EMAIL_NOT_VERIFIED_BY_OIDC,
} from 'src/errors';
import { AuthUser } from 'src/types/AuthUser';
import { UserService } from 'src/user/user.service';
import { AuthService } from '../auth.service';
import { OidcStrategy } from './oidc.strategy';

const mockAuthService = mockDeep<AuthService>();
const mockUserService = mockDeep<UserService>();
const mockConfigService = mockDeep<ConfigService>();

const infra: Record<string, string> = {
  'INFRA.OIDC_CLIENT_ID': 'client-id',
  'INFRA.OIDC_CLIENT_SECRET': 'client-secret',
  'INFRA.OIDC_CALLBACK_URL': 'http://localhost:3170/v1/auth/oidc/callback',
  'INFRA.OIDC_SCOPE': 'openid, email,profile',
  'INFRA.SESSION_SECRET': 'session-secret',
};
mockConfigService.get.mockImplementation((key: string) => infra[key]);

const strategy = new OidcStrategy(
  mockAuthService,
  mockUserService,
  mockConfigService,
  {
    issuer: 'https://idp.example.com',
    authorization_endpoint: 'https://idp.example.com/authorize',
    token_endpoint: 'https://idp.example.com/token',
    userinfo_endpoint: 'https://idp.example.com/userinfo',
  },
);

const currentTime = new Date();
const user: AuthUser = {
  uid: 'user-uid',
  email: 'pam@dundermifflin.com',
  displayName: 'Pam Beesly',
  photoURL: 'https://example.com/pam.png',
  isAdmin: false,
  refreshToken: null,
  lastLoggedOn: currentTime,
  lastActiveOn: currentTime,
  createdOn: currentTime,
  currentGQLSession: {},
  currentRESTSession: {},
};

const jwt = (claims: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

const validate = (
  idClaims: Record<string, unknown>,
  userinfo: Record<string, unknown> | undefined = undefined,
) =>
  strategy.validate(
    'https://idp.example.com',
    userinfo ? { _json: userinfo } : undefined,
    {},
    {},
    jwt(idClaims),
    'access-token',
    'refresh-token',
    {},
  );

beforeEach(() => {
  mockReset(mockAuthService);
  mockReset(mockUserService);
});

describe('OidcStrategy.validate', () => {
  test('does not request the openid scope twice', () => {
    expect((strategy as any)._scope).toEqual(['email', 'profile']);
  });

  test('receives the raw userinfo profile and ID token from passport-openidconnect', () => {
    // passport-openidconnect picks the verify signature by arity; 9 passes
    // (iss, uiProfile, idProfile, context, idToken, accessToken, refreshToken, params, cb)
    expect((strategy as any)._verify.length).toBe(9);
  });

  test('creates a new user mapped from the OIDC claims', async () => {
    mockUserService.findUserByEmail.mockResolvedValue(O.none);
    mockUserService.createUserSSO.mockResolvedValue(user as any);

    const result = await validate(
      { sub: 'sub-1', email: 'pam@dundermifflin.com' },
      {
        sub: 'sub-1',
        email_verified: true,
        name: 'Pam Beesly',
        picture: 'https://example.com/pam.png',
      },
    );

    expect(result).toEqual(user);
    expect(mockUserService.createUserSSO).toHaveBeenCalledWith(
      undefined,
      undefined,
      {
        provider: 'oidc',
        id: 'sub-1',
        displayName: 'Pam Beesly',
        emails: [{ value: 'pam@dundermifflin.com' }],
        photos: [{ value: 'https://example.com/pam.png' }],
      },
    );
  });

  test('links an OIDC account to an existing user with the same email', async () => {
    mockUserService.findUserByEmail.mockResolvedValue(O.some(user));
    mockAuthService.checkIfProviderAccountExists.mockResolvedValue(O.none);
    mockUserService.updateUserDetails.mockResolvedValue(E.right(user as any));

    const result = await validate({
      sub: 'sub-1',
      email: 'pam@dundermifflin.com',
    });

    expect(result).toEqual(user);
    expect(mockUserService.createUserSSO).not.toHaveBeenCalled();
    expect(mockUserService.createProviderAccount).toHaveBeenCalledWith(
      user,
      undefined,
      undefined,
      expect.objectContaining({ provider: 'oidc', id: 'sub-1' }),
    );
  });

  test('falls back to preferred_username when no name claim is present', async () => {
    mockUserService.findUserByEmail.mockResolvedValue(O.none);
    mockUserService.createUserSSO.mockResolvedValue(user as any);

    await validate({
      sub: 'sub-1',
      email: 'pam@dundermifflin.com',
      preferred_username: 'pbeesly',
    });

    expect(mockUserService.createUserSSO).toHaveBeenCalledWith(
      undefined,
      undefined,
      expect.objectContaining({ displayName: 'pbeesly', photos: undefined }),
    );
  });

  test.each([false, 'false'])(
    'rejects emails with email_verified=%p',
    async (emailVerified) => {
      await expect(
        validate(
          { sub: 'sub-1', email: 'pam@dundermifflin.com' },
          { sub: 'sub-1', email_verified: emailVerified },
        ),
      ).rejects.toThrow(
        new UnauthorizedException(AUTH_EMAIL_NOT_VERIFIED_BY_OIDC),
      );
      expect(mockUserService.findUserByEmail).not.toHaveBeenCalled();
    },
  );

  test('rejects a login without an email claim', async () => {
    await expect(validate({ sub: 'sub-1' })).rejects.toThrow(
      new UnauthorizedException(AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH),
    );
  });

  test('rejects a userinfo response for a different subject', async () => {
    await expect(
      validate(
        { sub: 'sub-1', email: 'pam@dundermifflin.com' },
        { sub: 'someone-else', email: 'pam@dundermifflin.com' },
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockUserService.findUserByEmail).not.toHaveBeenCalled();
  });
});

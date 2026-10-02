import { Strategy } from 'passport-openidconnect';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserService } from 'src/user/user.service';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { ConfigService } from '@nestjs/config';
import { validateEmail } from 'src/utils';
import {
  AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH,
  AUTH_EMAIL_NOT_VERIFIED_BY_OIDC,
} from 'src/errors';
import { StatelessStateStore } from '../stateless-state-store';
import { OIDC_METADATA, OidcMetadata } from '../oidc-discovery';

/** Value stored in Account.provider for users signing in via OIDC */
const OIDC_PROVIDER_ID = 'oidc';

/**
 * Decode the payload of a JWT without verifying it.
 * The ID token comes straight from the token endpoint over TLS, and
 * passport-openidconnect has already validated its iss/aud/azp/exp/nonce claims.
 */
const decodeJwtClaims = (jwt: string): Record<string, any> => {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
  } catch {
    return {};
  }
};

@Injectable()
// Passing `true` makes Nest expose validate()'s full arity to passport-openidconnect,
// which then hands us the raw userinfo profile and ID token (needed for `email_verified`)
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc', true) {
  constructor(
    private authService: AuthService,
    private usersService: UserService,
    private configService: ConfigService,
    @Inject(OIDC_METADATA) metadata: OidcMetadata,
  ) {
    super({
      issuer: metadata.issuer,
      authorizationURL: metadata.authorization_endpoint,
      tokenURL: metadata.token_endpoint,
      userInfoURL: metadata.userinfo_endpoint,
      clientID: configService.get<string>('INFRA.OIDC_CLIENT_ID'),
      clientSecret: configService.get<string>('INFRA.OIDC_CLIENT_SECRET'),
      callbackURL: configService.get<string>('INFRA.OIDC_CALLBACK_URL'),
      // passport-openidconnect always requests `openid` itself
      scope: configService
        .get<string>('INFRA.OIDC_SCOPE')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== 'openid'),
      store: new StatelessStateStore(
        configService.get<string>('INFRA.SESSION_SECRET'),
        undefined,
        (configService.get<string>('INFRA.SESSION_COOKIE_NAME') ||
          '__oauth_nonce') + '_oidc',
        configService.get<string>('INFRA.ALLOW_SECURE_COOKIES') === 'true',
      ),
    });
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- every parameter is required: passport-openidconnect dispatches on validate()'s arity */
  async validate(
    issuer: string,
    uiProfile,
    idProfile,
    context,
    idToken: string,
    accessToken: string,
    refreshToken: string,
    params,
  ) {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const idClaims = decodeJwtClaims(idToken);
    const uiClaims = uiProfile?._json ?? {};

    // https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse
    if (uiClaims.sub && uiClaims.sub !== idClaims.sub)
      throw new UnauthorizedException(AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH);

    const claims = { ...idClaims, ...uiClaims };
    const email = claims.email;

    if (!validateEmail(email))
      throw new UnauthorizedException(AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH);

    /**
     * Accounts are matched by email, so refuse emails the provider says it has not verified.
     * Some providers (e.g. Cognito) send the claim as a string.
     */
    if (claims.email_verified === false || claims.email_verified === 'false')
      throw new UnauthorizedException(AUTH_EMAIL_NOT_VERIFIED_BY_OIDC);

    const profile = {
      provider: OIDC_PROVIDER_ID,
      id: idClaims.sub,
      displayName: claims.name ?? claims.preferred_username ?? null,
      emails: [{ value: email }],
      photos: claims.picture ? [{ value: claims.picture }] : undefined,
    };

    const user = await this.usersService.findUserByEmail(email);

    if (O.isNone(user)) {
      const createdUser = await this.usersService.createUserSSO(
        undefined,
        undefined,
        profile,
      );
      return createdUser;
    }

    /**
     * displayName and photoURL maybe null if user logged-in via magic-link before SSO
     */
    if (!user.value.displayName || !user.value.photoURL) {
      const updatedUser = await this.usersService.updateUserDetails(
        user.value,
        profile,
      );
      if (E.isLeft(updatedUser)) {
        throw new UnauthorizedException(updatedUser.left);
      }
    }

    /**
     * Check to see if entry for OIDC is present in the Account table for user
     * If user was created with another provider findUserByEmail may return true
     */
    const providerAccountExists =
      await this.authService.checkIfProviderAccountExists(user.value, profile);

    if (O.isNone(providerAccountExists))
      await this.usersService.createProviderAccount(
        user.value,
        undefined,
        undefined,
        profile,
      );

    return user.value;
  }
}

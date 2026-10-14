import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { generators, Issuer, Client } from 'openid-client';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { validateEmail } from 'src/utils';
import { AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH } from 'src/errors';
import { StatelessStateStore } from './stateless-state-store';
import { AuthUser } from 'src/types/AuthUser';

type KeycloakFlowContext = {
  codeVerifier: string;
  nonce: string;
};

type KeycloakFlowState = {
  redirect_uri?: string;
};

const KEYCLOAK_STATE_MAX_AGE_MS = 600_000;

@Injectable()
export class KeycloakOIDCService {
  private clientPromise?: Promise<Client>;
  private stateStore?: StatelessStateStore;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly usersService: UserService,
  ) {}

  async getAuthorizationUrl(req: Request): Promise<string> {
    const client = await this.getClient();
    const codeVerifier = generators.codeVerifier();
    const nonce = generators.nonce();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = await this.storeState(req, {
      redirect_uri:
        typeof req.query.redirect_uri === 'string'
          ? req.query.redirect_uri
          : undefined,
    });
    this.setContextCookie(req, { codeVerifier, nonce });

    return client.authorizationUrl({
      redirect_uri: this.getCallbackUrl(),
      scope: this.getScope(),
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  async authenticateCallback(
    req: Request,
  ): Promise<{ user: AuthUser; state: KeycloakFlowState }> {
    const providedState = req.query.state;
    if (typeof providedState !== 'string' || !providedState) {
      throw new UnauthorizedException('Missing Keycloak authorization state');
    }

    const { state } = await this.verifyState(req, providedState);
    const context = this.readContextCookie(req);
    const client = await this.getClient();
    const tokenSet = await client.callback(
      this.getCallbackUrl(),
      client.callbackParams(req),
      {
        state: providedState,
        nonce: context.nonce,
        code_verifier: context.codeVerifier,
      },
    );
    const claims = tokenSet.claims();

    if (!claims.sub || !tokenSet.access_token) {
      throw new UnauthorizedException('Keycloak did not return a valid user');
    }

    const userInfo = await client.userinfo(tokenSet.access_token);
    if (userInfo.sub !== claims.sub) {
      throw new UnauthorizedException('Keycloak user subject did not match');
    }

    const email = userInfo.email;
    if (
      !validateEmail(email) ||
      (userInfo.email_verified !== true && claims.email_verified !== true)
    ) {
      throw new UnauthorizedException(AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH);
    }

    const profile = {
      provider: 'keycloak',
      id: claims.sub,
      displayName: userInfo.name || userInfo.preferred_username || null,
      emails: [{ value: email }],
      photos: userInfo.picture ? [{ value: userInfo.picture }] : undefined,
    };
    const refreshToken = tokenSet.refresh_token ?? '';
    const user = await this.usersService.findUserByEmail(email);

    if (O.isNone(user)) {
      return {
        user: await this.usersService.createUserSSO(
          tokenSet.access_token,
          refreshToken,
          profile,
        ),
        state,
      };
    }

    if (!user.value.displayName || !user.value.photoURL) {
      const updatedUser = await this.usersService.updateUserDetails(
        user.value,
        profile,
      );
      if (E.isLeft(updatedUser)) {
        throw new UnauthorizedException(updatedUser.left);
      }
    }

    const providerAccountExists =
      await this.authService.checkIfProviderAccountExists(user.value, profile);

    if (O.isNone(providerAccountExists)) {
      await this.usersService.createProviderAccount(
        user.value,
        tokenSet.access_token,
        refreshToken,
        profile,
      );
    }

    return { user: user.value, state };
  }

  private async getClient(): Promise<Client> {
    if (!this.clientPromise) {
      const issuerUrl = this.configService
        .get<string>('INFRA.KEYCLOAK_ISSUER')
        ?.trim();
      const clientId = this.configService.get<string>(
        'INFRA.KEYCLOAK_CLIENT_ID',
      );
      const clientSecret = this.configService.get<string>(
        'INFRA.KEYCLOAK_CLIENT_SECRET',
      );
      const callbackURL = this.getCallbackUrl();

      if (!issuerUrl || !clientId || !clientSecret || !callbackURL) {
        throw new Error('Keycloak OpenID Connect is not fully configured');
      }

      this.clientPromise = Issuer.discover(issuerUrl).then(
        (issuer) =>
          new issuer.Client({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uris: [callbackURL],
            response_types: ['code'],
          }),
      );

      this.clientPromise.catch(() => {
        this.clientPromise = undefined;
      });
    }

    return this.clientPromise;
  }

  private getCallbackUrl(): string {
    const callbackUrl = this.configService.get<string>(
      'INFRA.KEYCLOAK_CALLBACK_URL',
    );
    if (!callbackUrl) {
      throw new Error('Keycloak callback URL is not configured');
    }

    return callbackUrl;
  }

  private getScope(): string {
    const configuredScopes =
      this.configService.get<string>('INFRA.KEYCLOAK_SCOPE') ?? '';
    const scopes = configuredScopes
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);

    return [...new Set(['openid', ...scopes])].join(' ');
  }

  private getStateStore(): StatelessStateStore {
    if (!this.stateStore) {
      this.stateStore = new StatelessStateStore(
        this.configService.get<string>('INFRA.SESSION_SECRET'),
        undefined,
        `${
          this.configService.get<string>('INFRA.SESSION_COOKIE_NAME') ||
          '__oauth_nonce'
        }_keycloak`,
        this.configService.get<string>('INFRA.ALLOW_SECURE_COOKIES') === 'true',
      );
    }

    return this.stateStore;
  }

  private storeState(req: Request, state: KeycloakFlowState): Promise<string> {
    return new Promise((resolve, reject) => {
      this.getStateStore().store(req, undefined, state, {}, (error, value) => {
        if (error) {
          reject(error);
        } else if (!value) {
          reject(new Error('Keycloak state store did not return a state'));
        } else {
          resolve(value);
        }
      });
    });
  }

  private setContextCookie(req: Request, context: KeycloakFlowContext): void {
    if (!req.res) {
      throw new Error('Keycloak authorization response is unavailable');
    }

    req.res.cookie(
      this.getContextCookieName(),
      Buffer.from(JSON.stringify(context)).toString('base64url'),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          this.configService.get<string>('INFRA.ALLOW_SECURE_COOKIES') ===
          'true',
        maxAge: KEYCLOAK_STATE_MAX_AGE_MS,
        path: '/',
      },
    );
  }

  private readContextCookie(req: Request): KeycloakFlowContext {
    const cookieName = this.getContextCookieName();
    const rawContext = req.cookies?.[cookieName];

    req.res?.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure:
        this.configService.get<string>('INFRA.ALLOW_SECURE_COOKIES') === 'true',
    });

    if (typeof rawContext !== 'string') {
      throw new UnauthorizedException('Missing Keycloak authorization context');
    }

    try {
      const context = JSON.parse(
        Buffer.from(rawContext, 'base64url').toString('utf8'),
      );

      if (
        typeof context.codeVerifier !== 'string' ||
        typeof context.nonce !== 'string'
      ) {
        throw new Error('Invalid Keycloak authorization context');
      }

      return {
        codeVerifier: context.codeVerifier,
        nonce: context.nonce,
      };
    } catch {
      throw new UnauthorizedException('Invalid Keycloak authorization context');
    }
  }

  private getContextCookieName(): string {
    return `${
      this.configService.get<string>('INFRA.SESSION_COOKIE_NAME') ||
      '__oauth_nonce'
    }_keycloak_context`;
  }

  private verifyState(
    req: Request,
    providedState: string,
  ): Promise<{ state: KeycloakFlowState }> {
    return new Promise((resolve, reject) => {
      this.getStateStore().verify(
        req,
        providedState,
        (error, _context, state) => {
          if (error) {
            reject(error);
            return;
          }

          if (!_context || !state || typeof state !== 'object') {
            reject(
              new UnauthorizedException('Invalid Keycloak authorization state'),
            );
            return;
          }

          resolve({
            state: {
              redirect_uri:
                typeof state.redirect_uri === 'string'
                  ? state.redirect_uri
                  : undefined,
            },
          });
        },
      );
    });
  }
}

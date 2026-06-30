import { Strategy } from 'passport-microsoft';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserService } from 'src/user/user.service';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { ConfigService } from '@nestjs/config';
import { validateEmail } from 'src/utils';
import { AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH } from 'src/errors';
import { StatelessStateStore } from '../stateless-state-store';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private usersService: UserService,
    private configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>('INFRA.MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get<string>('INFRA.MICROSOFT_CLIENT_SECRET'),
      callbackURL: configService.get<string>('INFRA.MICROSOFT_CALLBACK_URL'),
      scope: configService.get<string>('INFRA.MICROSOFT_SCOPE').split(','),
      tenant: configService.get<string>('INFRA.MICROSOFT_TENANT'),
      store: new StatelessStateStore(
        configService.get<string>('INFRA.SESSION_SECRET'),
        undefined,
        (configService.get<string>('INFRA.SESSION_COOKIE_NAME') ||
          '__oauth_nonce') + '_microsoft',
        configService.get<string>('INFRA.ALLOW_SECURE_COOKIES') === 'true',
      ),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile, done) {
    const email = profile?.emails?.[0]?.value;

    if (!validateEmail(email))
      throw new UnauthorizedException(AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH);

    const user = await this.usersService.findUserByEmail(email);

    if (O.isNone(user)) {
      // 1. Check by provider account ID first (most authoritative)
      const userByProvider = await this.usersService.findUserByProviderAccount(
        profile.provider,
        profile.id,
      );

      // 2. If found by provider account, this is an existing user with possibly changed email
      if (O.isSome(userByProvider)) {
        let user = userByProvider.value;

        // Update email if it changed on the provider side
        if (user.email !== email) {
          const updatedUser = await this.usersService.updateUserEmail(
            user.uid,
            email,
          );
          if (E.isLeft(updatedUser)) {
            // Handle specific errors, e.g., if email is taken by another user
            throw new UnauthorizedException(updatedUser.left);
          }
          user = updatedUser.right;
        }

        if (!user.displayName || !user.photoURL) {
          const updatedUser = await this.usersService.updateUserDetails(
            user,
            profile,
          );
          if (E.isLeft(updatedUser)) {
            throw new UnauthorizedException(updatedUser.left);
          }
          user = updatedUser.right;
        }

        // Ensure the provider account entry exists for this user
        const providerAccountExists =
          await this.authService.checkIfProviderAccountExists(user, profile);

        if (O.isNone(providerAccountExists)) {
          await this.usersService.createProviderAccount(
            user,
            accessToken,
            refreshToken,
            profile,
          );
        }

        // Return the existing user (now updated with new email and/or profile info)
        return user;
      }

      // Truly new user — create them
      const createdUser = await this.usersService.createUserSSO(
        accessToken,
        refreshToken,
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
     * Check to see if entry for Microsoft is present in the Account table for user
     * If user was created with another provider findUserByEmail may return true
     */
    const providerAccountExists =
      await this.authService.checkIfProviderAccountExists(user.value, profile);

    if (O.isNone(providerAccountExists))
      await this.usersService.createProviderAccount(
        user.value,
        accessToken,
        refreshToken,
        profile,
      );

    return user.value;
  }
}

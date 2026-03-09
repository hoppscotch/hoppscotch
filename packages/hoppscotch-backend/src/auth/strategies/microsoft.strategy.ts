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
      store: true,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile, done) {
    const email = profile?.emails?.[0]?.value;

    if (!validateEmail(email))
      throw new UnauthorizedException(AUTH_EMAIL_NOT_PROVIDED_BY_OAUTH);

    const user = await this.usersService.findUserByEmail(email);

    if (O.isNone(user)) {
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

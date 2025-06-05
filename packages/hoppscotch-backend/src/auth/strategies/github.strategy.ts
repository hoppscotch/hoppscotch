import { Strategy, Profile } from 'passport-github2';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserService } from 'src/user/user.service';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private usersService: UserService,
    private configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>('INFRA.GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('INFRA.GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('INFRA.GITHUB_CALLBACK_URL'),
      scope: [configService.get<string>('INFRA.GITHUB_SCOPE')],
      store: true,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ): Promise<any> {
    try {
      if (!profile.emails || profile.emails.length === 0) {
        throw new UnauthorizedException('Email not provided by GitHub');
      }

      const email = profile.emails[0].value;
      const user = await this.usersService.findUserByEmail(email);

      if (O.isNone(user)) {
        const createdUser = await this.usersService.createUserSSO(
          accessToken,
          refreshToken,
          profile,
        );
        return done(null, createdUser);
      }

      if (!user.value.displayName || !user.value.photoURL) {
        const updatedUser = await this.usersService.updateUserDetails(
          user.value,
          profile,
        );
        if (E.isLeft(updatedUser)) {
          return done(new UnauthorizedException(updatedUser.left), false);
        }
      }

      const providerAccountExists =
        await this.authService.checkIfProviderAccountExists(user.value, profile);

      if (O.isNone(providerAccountExists)) {
        await this.usersService.createProviderAccount(
          user.value,
          accessToken,
          refreshToken,
          profile,
        );
      }

      return done(null, user.value);
    } catch (error) {
      return done(error, false);
    }
  }
}

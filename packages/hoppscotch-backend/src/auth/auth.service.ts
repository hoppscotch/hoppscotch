import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MailerService } from 'src/mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from 'src/user/user.model';
import { UserService } from 'src/user/user.service';
import { verifyMagicDto } from './dto/verify-magic.dto';
import { DateTime } from 'luxon';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { PasswordlessToken } from 'src/types/Passwordless';
import { EmailCodec } from 'src/types/Email';
import {
  INVALID_EMAIL,
  INVALID_MAGIC_LINK_DATA,
  PASSWORDLESS_DATA_NOT_FOUND,
  MAGIC_LINK_EXPIRED,
  TOKEN_EXPIRED,
  USER_NOT_FOUND,
} from 'src/errors';
import { pipe } from 'fp-ts/lib/function';
import { throwErr, validateEmail } from 'src/utils';
import {
  AccessTokenPayload,
  AuthTokens,
  RefreshTokenPayload,
} from 'src/types/AuthTokens';
import { ProviderAccount } from 'src/types/ProviderAccount';
import { JwtService } from '@nestjs/jwt';
import { pass } from 'fp-ts/lib/Writer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  // generate Id and token for email magiclink
  private async generatePasswordlessTokens(user: User) {
    const salt = await bcrypt.genSalt(10);
    const expiresOn = DateTime.now().plus({ hours: 3 }).toISO().toString();

    const idToken: PasswordlessToken =
      await this.prismaService.passwordlessVerification.create({
        data: {
          deviceIdentifier: salt,
          userUid: user.id,
          expiresOn: expiresOn,
        },
      });

    return idToken;
  }

  private async validatePasswordlessTokens(data: verifyMagicDto) {
    try {
      const tokens: PasswordlessToken =
        await this.prismaService.passwordlessVerification.findUniqueOrThrow({
          where: {
            passwordless_deviceIdentifier_tokens: {
              deviceIdentifier: data.deviceIdentifier,
              token: data.token,
            },
          },
        });
      return O.some(tokens);
    } catch (error) {
      return O.none;
    }
  }

  private async UpdateUserRefreshToken(tokenHash: string, userUid: string) {
    try {
      const user: User = await this.prismaService.user.update({
        where: {
          id: userUid,
        },
        data: {
          refreshToken: tokenHash,
        },
      });

      return E.right(user);
    } catch (error) {
      return E.left(USER_NOT_FOUND);
    }
  }

  private async generateRefreshToken(userUid: string) {
    const refreshTokenPayload: RefreshTokenPayload = {
      iss: process.env.APP_DOMAIN,
      sub: userUid,
      aud: [process.env.APP_DOMAIN],
    };

    const refreshToken = await this.jwtService.sign(refreshTokenPayload, {
      expiresIn: process.env.REFRESH_TOKEN_VALIDITY, //7 Days
    });

    const refreshTokenHash = await argon2.hash(refreshToken);

    const updatedUser = await this.UpdateUserRefreshToken(
      refreshTokenHash,
      userUid,
    );
    if (E.isLeft(updatedUser))
      throw new HttpException(updatedUser.left, HttpStatus.NOT_FOUND);

    return refreshToken;
  }

  async generateAuthTokens(userUid: string) {
    const accessTokenPayload: AccessTokenPayload = {
      iss: process.env.APP_DOMAIN,
      sub: userUid,
      aud: [process.env.APP_DOMAIN],
    };

    const refreshToken = await this.generateRefreshToken(userUid);

    return <AuthTokens>{
      access_token: await this.jwtService.sign(accessTokenPayload, {
        expiresIn: process.env.ACCESS_TOKEN_VALIDITY, //1 Day
      }),
      refresh_token: refreshToken,
    };
  }

  private async deletePasswordlessVerificationToken(
    passwordlessTokens: PasswordlessToken,
  ) {
    try {
      const deletedPasswordlessToken =
        await this.prismaService.passwordlessVerification.delete({
          where: {
            passwordless_deviceIdentifier_tokens: {
              deviceIdentifier: passwordlessTokens.deviceIdentifier,
              token: passwordlessTokens.token,
            },
          },
        });
      return E.right(deletedPasswordlessToken);
    } catch (error) {
      return E.left(PASSWORDLESS_DATA_NOT_FOUND);
    }
  }

  async checkIfProviderAccountExists(user: User, profile) {
    const provider: ProviderAccount =
      await this.prismaService.account.findUnique({
        where: {
          verifyProviderAccount: {
            provider: profile.provider,
            providerAccountId: profile.id,
          },
        },
      });

    if (!provider) return O.none;

    return O.some(provider);
  }

  async signIn(email: string) {
    if (!validateEmail(email))
      throw new HttpException(INVALID_EMAIL, HttpStatus.BAD_REQUEST);

    let user: User;
    const queriedUser = await this.usersService.findUserByEmail(email);

    if (O.isNone(queriedUser)) {
      user = await this.usersService.createUserMagic(email);
    } else {
      user = queriedUser.value;
    }

    const generatedTokens = await this.generatePasswordlessTokens(user);

    await this.mailerService.sendAuthEmail(email, {
      template: 'code-your-own',
      variables: {
        inviteeEmail: email,
        magicLink: `${process.env.APP_DOMAIN}/magic-link?token=${generatedTokens.token}`,
      },
    });

    return { deviceIdentifier: generatedTokens.deviceIdentifier };
  }

  async verify(data: verifyMagicDto) {
    const passwordlessTokens = await this.validatePasswordlessTokens(data);
    if (O.isNone(passwordlessTokens))
      throw new HttpException(INVALID_MAGIC_LINK_DATA, HttpStatus.NOT_FOUND);

    const currentTime = DateTime.now().toISOTime();

    if (currentTime > passwordlessTokens.value.expiresOn.toISOString()) {
      throw new HttpException(MAGIC_LINK_EXPIRED, HttpStatus.UNAUTHORIZED);
    }
    const tokens = await this.generateAuthTokens(
      passwordlessTokens.value.userUid,
    );

    const deletedPasswordlessToken =
      await this.deletePasswordlessVerificationToken(passwordlessTokens.value);
    if (E.isLeft(deletedPasswordlessToken))
      throw new HttpException(
        deletedPasswordlessToken.left,
        HttpStatus.NOT_FOUND,
      );

    return tokens;
  }
}

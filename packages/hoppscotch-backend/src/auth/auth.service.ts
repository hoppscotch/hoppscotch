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
import { DeviceIdentifierToken } from 'src/types/Passwordless';
import {
  INVALID_EMAIL,
  INVALID_MAGIC_LINK_DATA,
  PASSWORDLESS_DATA_NOT_FOUND,
  MAGIC_LINK_EXPIRED,
  USER_NOT_FOUND,
  INVALID_REFRESH_TOKEN,
} from 'src/errors';
import { validateEmail } from 'src/utils';
import {
  AccessTokenPayload,
  AuthTokens,
  RefreshTokenPayload,
} from 'src/types/AuthTokens';
import { JwtService } from '@nestjs/jwt';
import { AuthErrorHandler } from 'src/types/AuthErrorHandler';
import { AuthUser } from 'src/types/AuthUser';
import { isLeafType } from 'graphql';
import { PasswordlessVerification } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  //
  /**
   * Generate Id and token for email Magic-Link auth
   *
   * @param {AuthUser} user User Object
   * @returns {Promise<PasswordlessVerification>} Created PasswordlessVerification token
   */
  private async generatePasswordlessTokens(user: AuthUser) {
    const salt = await bcrypt.genSalt(10);
    const expiresOn = DateTime.now().plus({ hours: 3 }).toISO().toString();

    const idToken = await this.prismaService.passwordlessVerification.create({
      data: {
        deviceIdentifier: salt,
        userUid: user.uid,
        expiresOn: expiresOn,
      },
    });

    return idToken;
  }

  /**
   * Find and check passwordlessVerification exists or not
   *
   * @param {verifyMagicDto} data Object containing deviceIdentifier and token
   * @returns {Promise<O.None | O.Some<PasswordlessVerification>>} Option of PasswordlessVerification token
   */
  private async validatePasswordlessTokens(data: verifyMagicDto) {
    try {
      const tokens =
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

  /**
   * Update User with new generated hashed refresh token
   *
   * @param {string} tokenHash Hash of newly generated refresh token
   * @param {string} userUid User uid
   * @returns {Promise<E.Right<User> | E.Left<"user/not_found">>} Either of User with updated refreshToken
   */
  private async UpdateUserRefreshToken(tokenHash: string, userUid: string) {
    try {
      const user = await this.prismaService.user.update({
        where: {
          uid: userUid,
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

  /**
   * Generate new refresh token for user
   *
   * @param {string} userUid User Id
   * @returns {Promise<E.Left<AuthErrorHandler> | E.Right<string>>} Generated refreshToken
   */
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
      return E.left(<AuthErrorHandler>{
        message: updatedUser.left,
        statusCode: HttpStatus.NOT_FOUND,
      });

    return E.right(refreshToken);
  }

  /**
   * Generate access and refresh token pair
   *
   * @param {string} userUid User ID
   * @returns {Promise<E.Left<AuthErrorHandler> | E.Right<AuthTokens>>} Either of generated AuthTokens
   */
  async generateAuthTokens(userUid: string) {
    const accessTokenPayload: AccessTokenPayload = {
      iss: process.env.APP_DOMAIN,
      sub: userUid,
      aud: [process.env.APP_DOMAIN],
    };

    const refreshToken = await this.generateRefreshToken(userUid);
    if (E.isLeft(refreshToken))
      return E.left(<AuthErrorHandler>{
        message: refreshToken.left.message,
        statusCode: refreshToken.left.statusCode,
      });

    return E.right(<AuthTokens>{
      access_token: await this.jwtService.sign(accessTokenPayload, {
        expiresIn: process.env.ACCESS_TOKEN_VALIDITY, //1 Day
      }),
      refresh_token: refreshToken.right,
    });
  }

  /**
   * Deleted used PasswordlessVerification tokens
   *
   * @param {PasswordlessVerification} passwordlessTokens
   * @returns {Promise<E.Right<PasswordlessVerification> | E.Left<"auth/passwordless_token_data_not_found">>} Either of deleted PasswordlessVerification token
   */
  private async deletePasswordlessVerificationToken(
    passwordlessTokens: PasswordlessVerification,
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

  /**
   * Verify if Provider account exists for User
   *
   * @param {User} user User Object
   * @param profile Provider Account type (Magic,Google,Github,Microsoft)
   * @returns {Promise<O.None | O.Some<Account>>} Either of existing user provider Account
   */
  async checkIfProviderAccountExists(user: User, profile) {
    const provider = await this.prismaService.account.findUnique({
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

  /**
   * Send Magic-Link to provider User email
   *
   * @param {string} email User's email
   * @returns {Promise<E.Left<AuthErrorHandler> | E.Right<DeviceIdentifierToken>>} Either containing DeviceIdentifierToken
   */
  async signIn(email: string) {
    if (!validateEmail(email))
      return E.left({
        message: INVALID_EMAIL,
        statusCode: HttpStatus.BAD_REQUEST,
      });

    let user: AuthUser;
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

    return E.right(<DeviceIdentifierToken>{
      deviceIdentifier: generatedTokens.deviceIdentifier,
    });
  }

  /**
   * Verify and authenticate user from received data for Magic-Link
   *
   * @param {verifyMagicDto} data
   * @returns {Promise<E.Right<AuthTokens> | E.Left<AuthErrorHandler>>} Either of generated AuthTokens
   */
  async verifyPasswordlessTokens(
    data: verifyMagicDto,
  ): Promise<E.Right<AuthTokens> | E.Left<AuthErrorHandler>> {
    const passwordlessTokens = await this.validatePasswordlessTokens(data);
    if (O.isNone(passwordlessTokens))
      return E.left({
        message: INVALID_MAGIC_LINK_DATA,
        statusCode: HttpStatus.NOT_FOUND,
      });

    const user = await this.usersService.findUserById(
      passwordlessTokens.value.userUid,
    );
    if (O.isNone(user))
      return E.left({
        message: USER_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });

    /**
     * * Check to see if entry for Magic-Link is present in the Account table for user
     * * If user was created with another provider findUserById may return true
     */
    const profile = {
      provider: 'magic',
      id: user.value.email,
    };
    const providerAccountExists = await this.checkIfProviderAccountExists(
      user.value,
      profile,
    );

    if (O.isNone(providerAccountExists)) {
      await this.usersService.createProviderAccount(
        user.value,
        null,
        null,
        profile,
      );
    }

    const currentTime = DateTime.now().toISO();
    if (currentTime > passwordlessTokens.value.expiresOn.toISOString())
      return E.left({
        message: MAGIC_LINK_EXPIRED,
        statusCode: HttpStatus.UNAUTHORIZED,
      });

    const tokens = await this.generateAuthTokens(
      passwordlessTokens.value.userUid,
    );
    if (E.isLeft(tokens))
      return E.left({
        message: tokens.left.message,
        statusCode: tokens.left.statusCode,
      });

    const deletedPasswordlessToken =
      await this.deletePasswordlessVerificationToken(passwordlessTokens.value);
    if (E.isLeft(deletedPasswordlessToken))
      return E.left({
        message: deletedPasswordlessToken.left,
        statusCode: HttpStatus.NOT_FOUND,
      });

    return E.right(tokens.right);
  }

  /**
   * Refresh refresh and auth tokens
   *
   * @param {string} refresh_token Hashed refresh token received from client
   * @param {AuthUser} user User Object
   * @returns {Promise<E.Left<AuthErrorHandler> | E.Right<AuthTokens>>} Either of generated AuthTokens
   */
  async refreshAuthTokens(refresh_token: string, user: AuthUser) {
    if (!user)
      return E.left({
        message: USER_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });

    const isMatched = await argon2.verify(user.refreshToken, refresh_token);
    if (!isMatched)
      return E.left({
        message: INVALID_REFRESH_TOKEN,
        statusCode: HttpStatus.NOT_FOUND,
      });

    const generatedAuthTokens = await this.generateAuthTokens(user.uid);
    if (E.isLeft(generatedAuthTokens))
      return E.left({
        message: generatedAuthTokens.left.message,
        statusCode: generatedAuthTokens.left.statusCode,
      });

    return E.right(generatedAuthTokens.right);
  }
}

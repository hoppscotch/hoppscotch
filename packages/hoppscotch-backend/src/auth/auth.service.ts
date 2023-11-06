import { HttpStatus, Injectable } from '@nestjs/common';
import { MailerService } from 'src/mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { VerifyMagicDto } from './dto/verify-magic.dto';
import { DateTime } from 'luxon';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { DeviceIdentifierToken } from 'src/types/Passwordless';
import {
  INVALID_EMAIL,
  INVALID_MAGIC_LINK_DATA,
  VERIFICATION_TOKEN_DATA_NOT_FOUND,
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
import { AuthError } from 'src/types/AuthError';
import { AuthUser, IsAdmin } from 'src/types/AuthUser';
import { VerificationToken } from '@prisma/client';
import { Origin } from './helper';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Generate Id and token for email Magic-Link auth
   *
   * @param user User Object
   * @returns Created VerificationToken token
   */
  private async generateMagicLinkTokens(user: AuthUser) {
    const salt = await bcrypt.genSalt(
      parseInt(process.env.TOKEN_SALT_COMPLEXITY),
    );
    const expiresOn = DateTime.now()
      .plus({ hours: parseInt(process.env.MAGIC_LINK_TOKEN_VALIDITY) })
      .toISO()
      .toString();

    const idToken = await this.prismaService.verificationToken.create({
      data: {
        deviceIdentifier: salt,
        userUid: user.uid,
        expiresOn: expiresOn,
      },
    });

    return idToken;
  }

  /**
   * Check if VerificationToken exist or not
   *
   * @param magicLinkTokens Object containing deviceIdentifier and token
   * @returns Option of VerificationToken token
   */
  private async validatePasswordlessTokens(magicLinkTokens: VerifyMagicDto) {
    try {
      const tokens =
        await this.prismaService.verificationToken.findUniqueOrThrow({
          where: {
            passwordless_deviceIdentifier_tokens: {
              deviceIdentifier: magicLinkTokens.deviceIdentifier,
              token: magicLinkTokens.token,
            },
          },
        });
      return O.some(tokens);
    } catch (error) {
      return O.none;
    }
  }

  /**
   * Generate new refresh token for user
   *
   * @param userUid User Id
   * @returns Generated refreshToken
   */
  private async generateRefreshToken(userUid: string) {
    const refreshTokenPayload: RefreshTokenPayload = {
      iss: process.env.VITE_BASE_URL,
      sub: userUid,
      aud: [process.env.VITE_BASE_URL],
    };

    const refreshToken = await this.jwtService.sign(refreshTokenPayload, {
      expiresIn: process.env.REFRESH_TOKEN_VALIDITY, //7 Days
    });

    const refreshTokenHash = await argon2.hash(refreshToken);

    const updatedUser = await this.usersService.UpdateUserRefreshToken(
      refreshTokenHash,
      userUid,
    );
    if (E.isLeft(updatedUser))
      return E.left(<AuthError>{
        message: updatedUser.left,
        statusCode: HttpStatus.NOT_FOUND,
      });

    return E.right(refreshToken);
  }

  /**
   * Generate access and refresh token pair
   *
   * @param userUid User ID
   * @returns Either of generated AuthTokens
   */
  async generateAuthTokens(userUid: string) {
    const accessTokenPayload: AccessTokenPayload = {
      iss: process.env.VITE_BASE_URL,
      sub: userUid,
      aud: [process.env.VITE_BASE_URL],
    };

    const refreshToken = await this.generateRefreshToken(userUid);
    if (E.isLeft(refreshToken)) return E.left(refreshToken.left);

    return E.right(<AuthTokens>{
      access_token: await this.jwtService.sign(accessTokenPayload, {
        expiresIn: process.env.ACCESS_TOKEN_VALIDITY, //1 Day
      }),
      refresh_token: refreshToken.right,
    });
  }

  /**
   * Deleted used VerificationToken tokens
   *
   * @param passwordlessTokens VerificationToken entry to delete from DB
   * @returns Either of deleted VerificationToken token
   */
  private async deleteMagicLinkVerificationTokens(
    passwordlessTokens: VerificationToken,
  ) {
    try {
      const deletedPasswordlessToken =
        await this.prismaService.verificationToken.delete({
          where: {
            passwordless_deviceIdentifier_tokens: {
              deviceIdentifier: passwordlessTokens.deviceIdentifier,
              token: passwordlessTokens.token,
            },
          },
        });
      return E.right(deletedPasswordlessToken);
    } catch (error) {
      return E.left(VERIFICATION_TOKEN_DATA_NOT_FOUND);
    }
  }

  /**
   * Verify if Provider account exists for User
   *
   * @param user User Object
   * @param SSOUserData User data from SSO providers (Magic,Google,Github,Microsoft)
   * @returns Either of existing user provider Account
   */
  async checkIfProviderAccountExists(user: AuthUser, SSOUserData) {
    const provider = await this.prismaService.account.findUnique({
      where: {
        verifyProviderAccount: {
          provider: SSOUserData.provider,
          providerAccountId: SSOUserData.id,
        },
      },
    });

    if (!provider) return O.none;

    return O.some(provider);
  }

  /**
   * Create User (if not already present) and send email to initiate Magic-Link auth
   *
   * @param email User's email
   * @returns Either containing DeviceIdentifierToken
   */
  async signInMagicLink(email: string, origin: string) {
    if (!validateEmail(email))
      return E.left({
        message: INVALID_EMAIL,
        statusCode: HttpStatus.BAD_REQUEST,
      });

    let user: AuthUser;
    const queriedUser = await this.usersService.findUserByEmail(email);

    if (O.isNone(queriedUser)) {
      user = await this.usersService.createUserViaMagicLink(email);
    } else {
      user = queriedUser.value;
    }

    const generatedTokens = await this.generateMagicLinkTokens(user);

    // check to see if origin is valid
    let url: string;
    switch (origin) {
      case Origin.ADMIN:
        url = process.env.VITE_ADMIN_URL;
        break;
      case Origin.APP:
        url = process.env.VITE_BASE_URL;
        break;
      default:
        // if origin is invalid by default set URL to Hoppscotch-App
        url = process.env.VITE_BASE_URL;
    }

    await this.mailerService.sendEmail(email, {
      template: 'user-invitation',
      variables: {
        inviteeEmail: email,
        magicLink: `${url}/enter?token=${generatedTokens.token}`,
      },
    });

    return E.right(<DeviceIdentifierToken>{
      deviceIdentifier: generatedTokens.deviceIdentifier,
    });
  }

  /**
   * Verify and authenticate user from received data for Magic-Link
   *
   * @param magicLinkIDTokens magic-link verification tokens from client
   * @returns Either of generated AuthTokens
   */
  async verifyMagicLinkTokens(
    magicLinkIDTokens: VerifyMagicDto,
  ): Promise<E.Right<AuthTokens> | E.Left<AuthError>> {
    const passwordlessTokens = await this.validatePasswordlessTokens(
      magicLinkIDTokens,
    );
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
      await this.deleteMagicLinkVerificationTokens(passwordlessTokens.value);
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
   * @param hashedRefreshToken Hashed refresh token received from client
   * @param user User Object
   * @returns Either of generated AuthTokens
   */
  async refreshAuthTokens(hashedRefreshToken: string, user: AuthUser) {
    // Check to see user is valid
    if (!user)
      return E.left({
        message: USER_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });

    // Check to see if the hashed refresh_token received from the client is the same as the refresh_token saved in the DB
    const isTokenMatched = await argon2.verify(
      user.refreshToken,
      hashedRefreshToken,
    );
    if (!isTokenMatched)
      return E.left({
        message: INVALID_REFRESH_TOKEN,
        statusCode: HttpStatus.NOT_FOUND,
      });

    // if tokens match, generate new pair of auth tokens
    const generatedAuthTokens = await this.generateAuthTokens(user.uid);
    if (E.isLeft(generatedAuthTokens))
      return E.left({
        message: generatedAuthTokens.left.message,
        statusCode: generatedAuthTokens.left.statusCode,
      });

    return E.right(generatedAuthTokens.right);
  }

  /**
   * Verify is signed in User is an admin or not
   *
   * @param user User Object
   * @returns Either of boolean if user is admin or not
   */
  async verifyAdmin(user: AuthUser) {
    if (user.isAdmin) return E.right(<IsAdmin>{ isAdmin: true });

    const usersCount = await this.usersService.getUsersCount();
    if (usersCount === 1) {
      const elevatedUser = await this.usersService.makeAdmin(user.uid);
      if (E.isLeft(elevatedUser))
        return E.left(<AuthError>{
          message: elevatedUser.left,
          statusCode: HttpStatus.NOT_FOUND,
        });

      return E.right(<IsAdmin>{ isAdmin: true });
    }

    return E.right(<IsAdmin>{ isAdmin: false });
  }
}

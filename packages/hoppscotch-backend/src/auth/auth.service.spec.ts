import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Account, VerificationToken } from '@prisma/client';
import { mockDeep, mockFn } from 'jest-mock-extended';
import {
  INVALID_EMAIL,
  INVALID_MAGIC_LINK_DATA,
  INVALID_REFRESH_TOKEN,
  MAGIC_LINK_EXPIRED,
  VERIFICATION_TOKEN_DATA_NOT_FOUND,
  USER_NOT_FOUND,
} from 'src/errors';
import { MailerService } from 'src/mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/types/AuthUser';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import * as O from 'fp-ts/Option';
import { verifyMagicDto } from './dto/verify-magic.dto';
import { DateTime } from 'luxon';
import * as argon2 from 'argon2';

const mockPrisma = mockDeep<PrismaService>();
const mockUser = mockDeep<UserService>();
const mockJWT = mockDeep<JwtService>();
const mockMailer = mockDeep<MailerService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const authService = new AuthService(mockUser, mockPrisma, mockJWT, mockMailer);

const currentTime = new Date();

const user: AuthUser = {
  uid: '123344',
  email: 'dwight@dundermifflin.com',
  displayName: 'Dwight Schrute',
  photoURL: 'https://en.wikipedia.org/wiki/Dwight_Schrute',
  isAdmin: false,
  refreshToken: 'hbfvdkhjbvkdvdfjvbnkhjb',
  createdOn: currentTime,
  currentGQLSession: {},
  currentRESTSession: {},
};

const passwordlessData: VerificationToken = {
  deviceIdentifier: 'k23hb7u7gdcujhb',
  token: 'jhhj24sdjvl',
  userUid: user.uid,
  expiresOn: new Date(),
};

const magicLinkVerify: verifyMagicDto = {
  deviceIdentifier: 'Dscdc',
  token: 'SDcsdc',
};

const accountDetails: Account = {
  id: '123dcdc',
  userId: user.uid,
  provider: 'email',
  providerAccountId: user.uid,
  providerRefreshToken: 'dscsdc',
  providerAccessToken: 'sdcsdcsdc',
  providerScope: 'user.email',
  loggedIn: currentTime,
};

let nowPlus30 = new Date();
nowPlus30.setMinutes(nowPlus30.getMinutes() + 30);
nowPlus30 = new Date(nowPlus30);

const encodedRefreshToken =
  '$argon2id$v=19$m=65536,t=3,p=4$JTP8yZ8YXMHdafb5pB9Rfg$tdZrILUxMb9dQbu0uuyeReLgKxsgYnyUNbc5ZxQmy5I';

describe('signInMagicLink', () => {
  test('should throw error if email is not in valid format', async () => {
    const result = await authService.signInMagicLink('bbbgmail.com');
    expect(result).toEqualLeft({
      message: INVALID_EMAIL,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  });

  test('should successfully create a new user account and return the passwordless details', async () => {
    // check to see if user exists, return none
    mockUser.findUserByEmail.mockResolvedValue(O.none);
    // create new user
    mockUser.createUserViaMagicLink.mockResolvedValue(user);
    // create new entry in VerificationToken table
    mockPrisma.verificationToken.create.mockResolvedValueOnce(passwordlessData);

    const result = await authService.signInMagicLink(
      'dwight@dundermifflin.com',
    );
    expect(result).toEqualRight({
      deviceIdentifier: passwordlessData.deviceIdentifier,
    });
  });

  test('should successfully return the passwordless details for a pre-existing user account', async () => {
    // check to see if user exists, return error
    mockUser.findUserByEmail.mockResolvedValueOnce(O.some(user));
    // create new entry in VerificationToken table
    mockPrisma.verificationToken.create.mockResolvedValueOnce(passwordlessData);

    const result = await authService.signInMagicLink(
      'dwight@dundermifflin.com',
    );
    expect(result).toEqualRight({
      deviceIdentifier: passwordlessData.deviceIdentifier,
    });
  });
});

describe('verifyMagicLinkTokens', () => {
  test('should throw INVALID_MAGIC_LINK_DATA if data is invalid', async () => {
    mockPrisma.verificationToken.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await authService.verifyMagicLinkTokens(magicLinkVerify);
    expect(result).toEqualLeft({
      message: INVALID_MAGIC_LINK_DATA,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });

  test('should throw USER_NOT_FOUND if user is invalid', async () => {
    // validatePasswordlessTokens
    mockPrisma.verificationToken.findUniqueOrThrow.mockResolvedValueOnce(
      passwordlessData,
    );
    // findUserById
    mockUser.findUserById.mockResolvedValue(O.none);

    const result = await authService.verifyMagicLinkTokens(magicLinkVerify);
    expect(result).toEqualLeft({
      message: USER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });

  test('should successfully return auth token pair with provider account existing', async () => {
    // validatePasswordlessTokens
    mockPrisma.verificationToken.findUniqueOrThrow.mockResolvedValueOnce({
      ...passwordlessData,
      expiresOn: nowPlus30,
    });
    // findUserById
    mockUser.findUserById.mockResolvedValue(O.some(user));
    // checkIfProviderAccountExists
    mockPrisma.account.findUnique.mockResolvedValueOnce(accountDetails);
    // mockPrisma.account.findUnique.mockResolvedValueOnce(null);
    // generateAuthTokens
    mockJWT.sign.mockReturnValue(user.refreshToken);
    mockPrisma.user.update.mockResolvedValueOnce(user);
    // deletePasswordlessVerificationToken
    mockPrisma.verificationToken.delete.mockResolvedValueOnce(passwordlessData);

    const result = await authService.verifyMagicLinkTokens(magicLinkVerify);
    expect(result).toEqualRight({
      access_token: user.refreshToken,
      refresh_token: user.refreshToken,
    });
  });

  test('should successfully return auth token pair with provider account not existing', async () => {
    // validatePasswordlessTokens
    mockPrisma.verificationToken.findUniqueOrThrow.mockResolvedValueOnce({
      ...passwordlessData,
      expiresOn: nowPlus30,
    });
    // findUserById
    mockUser.findUserById.mockResolvedValue(O.some(user));
    // checkIfProviderAccountExists
    mockPrisma.account.findUnique.mockResolvedValueOnce(null);
    mockUser.createUserSSO.mockResolvedValueOnce(user);
    // generateAuthTokens
    mockJWT.sign.mockReturnValue(user.refreshToken);
    mockPrisma.user.update.mockResolvedValueOnce(user);
    // deletePasswordlessVerificationToken
    mockPrisma.verificationToken.delete.mockResolvedValueOnce(passwordlessData);

    const result = await authService.verifyMagicLinkTokens(magicLinkVerify);
    expect(result).toEqualRight({
      access_token: user.refreshToken,
      refresh_token: user.refreshToken,
    });
  });

  test('should throw MAGIC_LINK_EXPIRED if passwordless token is expired', async () => {
    // validatePasswordlessTokens
    mockPrisma.verificationToken.findUniqueOrThrow.mockResolvedValueOnce(
      passwordlessData,
    );
    // findUserById
    mockUser.findUserById.mockResolvedValue(O.some(user));
    // checkIfProviderAccountExists
    mockPrisma.account.findUnique.mockResolvedValueOnce(accountDetails);

    const result = await authService.verifyMagicLinkTokens(magicLinkVerify);
    expect(result).toEqualLeft({
      message: MAGIC_LINK_EXPIRED,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  });

  test('should throw USER_NOT_FOUND when updating refresh tokens fails', async () => {
    // validatePasswordlessTokens
    mockPrisma.verificationToken.findUniqueOrThrow.mockResolvedValueOnce({
      ...passwordlessData,
      expiresOn: nowPlus30,
    });
    // findUserById
    mockUser.findUserById.mockResolvedValue(O.some(user));
    // checkIfProviderAccountExists
    mockPrisma.account.findUnique.mockResolvedValueOnce(accountDetails);
    // mockPrisma.account.findUnique.mockResolvedValueOnce(null);
    // generateAuthTokens
    mockJWT.sign.mockReturnValue(user.refreshToken);
    mockPrisma.user.update.mockRejectedValueOnce('RecordNotFound');

    const result = await authService.verifyMagicLinkTokens(magicLinkVerify);
    expect(result).toEqualLeft({
      message: USER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });

  test('should throw PASSWORDLESS_DATA_NOT_FOUND when deleting passwordlessVerification entry from DB', async () => {
    // validatePasswordlessTokens
    mockPrisma.verificationToken.findUniqueOrThrow.mockResolvedValueOnce({
      ...passwordlessData,
      expiresOn: nowPlus30,
    });
    // findUserById
    mockUser.findUserById.mockResolvedValue(O.some(user));
    // checkIfProviderAccountExists
    mockPrisma.account.findUnique.mockResolvedValueOnce(accountDetails);
    // mockPrisma.account.findUnique.mockResolvedValueOnce(null);
    // generateAuthTokens
    mockJWT.sign.mockReturnValue(user.refreshToken);
    mockPrisma.user.update.mockResolvedValueOnce(user);
    // deletePasswordlessVerificationToken
    mockPrisma.verificationToken.delete.mockRejectedValueOnce('RecordNotFound');

    const result = await authService.verifyMagicLinkTokens(magicLinkVerify);
    expect(result).toEqualLeft({
      message: VERIFICATION_TOKEN_DATA_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });
});

describe('generateAuthTokens', () => {
  test('should successfully generate tokens with valid inputs', async () => {
    mockJWT.sign.mockReturnValue(user.refreshToken);
    mockPrisma.user.update.mockResolvedValueOnce(user);

    const result = await authService.generateAuthTokens(user.uid);
    expect(result).toEqualRight({
      access_token: 'hbfvdkhjbvkdvdfjvbnkhjb',
      refresh_token: 'hbfvdkhjbvkdvdfjvbnkhjb',
    });
  });

  test('should throw USER_NOT_FOUND when updating refresh tokens fails', async () => {
    mockJWT.sign.mockReturnValue(user.refreshToken);
    mockPrisma.user.update.mockRejectedValueOnce('RecordNotFound');

    const result = await authService.generateAuthTokens(user.uid);
    expect(result).toEqualLeft({
      message: USER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });
});

jest.mock('argon2', () => {
  return {
    verify: jest.fn((x, y) => {
      if (y === null) return false;
      return true;
    }),
    hash: jest.fn(),
  };
});

describe('refreshAuthTokens', () => {
  test('should throw USER_NOT_FOUND when updating refresh tokens fails', async () => {
    // generateAuthTokens
    mockJWT.sign.mockReturnValue(user.refreshToken);
    mockPrisma.user.update.mockRejectedValueOnce('RecordNotFound');

    const result = await authService.refreshAuthTokens(
      '$argon2id$v=19$m=65536,t=3,p=4$MvVOam2clCOLtJFGEE26ZA$czvA5ez9hz+A/LML8QRgqgaFuWa5JcbwkH6r+imTQbs',
      user,
    );
    expect(result).toEqualLeft({
      message: USER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });

  test('should throw USER_NOT_FOUND when user is invalid', async () => {
    const result = await authService.refreshAuthTokens(
      'jshdcbjsdhcbshdbc',
      null,
    );
    expect(result).toEqualLeft({
      message: USER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });

  test('should successfully refresh the tokens and generate a new auth token pair', async () => {
    // generateAuthTokens
    mockJWT.sign.mockReturnValue('sdhjcbjsdhcbshjdcb');
    mockPrisma.user.update.mockResolvedValueOnce({
      ...user,
      refreshToken: 'sdhjcbjsdhcbshjdcb',
    });

    const result = await authService.refreshAuthTokens(
      '$argon2id$v=19$m=65536,t=3,p=4$MvVOam2clCOLtJFGEE26ZA$czvA5ez9hz+A/LML8QRgqgaFuWa5JcbwkH6r+imTQbs',
      user,
    );
    expect(result).toEqualRight({
      access_token: 'sdhjcbjsdhcbshjdcb',
      refresh_token: 'sdhjcbjsdhcbshjdcb',
    });
  });

  test('should throw INVALID_REFRESH_TOKEN when the refresh token is invalid', async () => {
    // generateAuthTokens
    mockJWT.sign.mockReturnValue('sdhjcbjsdhcbshjdcb');
    mockPrisma.user.update.mockResolvedValueOnce({
      ...user,
      refreshToken: 'sdhjcbjsdhcbshjdcb',
    });

    const result = await authService.refreshAuthTokens(null, user);
    expect(result).toEqualLeft({
      message: INVALID_REFRESH_TOKEN,
      statusCode: HttpStatus.NOT_FOUND,
    });
  });
});

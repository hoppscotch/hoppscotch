import { AccessTokenService } from './access-token.service';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ACCESS_TOKEN_EXPIRY_INVALID,
  ACCESS_TOKEN_LABEL_SHORT,
  ACCESS_TOKEN_NOT_FOUND,
} from 'src/errors';
import { AuthUser } from 'src/types/AuthUser';
import { PersonalAccessToken } from '@prisma/client';
import { AccessToken } from 'src/types/AccessToken';
import { HttpStatus } from '@nestjs/common';

const mockPrisma = mockDeep<PrismaService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const accessTokenService = new AccessTokenService(mockPrisma);

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
  lastLoggedOn: currentTime,
  lastActiveOn: currentTime,
};

const PATCreatedOn = new Date();
const expiryInDays = 7;
const PATExpiresOn = new Date(
  PATCreatedOn.getTime() + expiryInDays * 24 * 60 * 60 * 1000,
);

const userAccessToken: PersonalAccessToken = {
  id: 'skfvhj8uvdfivb',
  userUid: user.uid,
  label: 'test',
  token: '0140e328-b187-4823-ae4b-ed4bec832ac2',
  expiresOn: PATExpiresOn,
  createdOn: PATCreatedOn,
  updatedOn: new Date(),
};

const userAccessTokenCasted: AccessToken = {
  id: userAccessToken.id,
  label: userAccessToken.label,
  createdOn: userAccessToken.createdOn,
  lastUsedOn: userAccessToken.updatedOn,
  expiresOn: userAccessToken.expiresOn,
};

beforeEach(() => {
  mockReset(mockPrisma);
});

describe('AccessTokenService', () => {
  describe('createPAT', () => {
    test('should throw ACCESS_TOKEN_LABEL_SHORT if label is too short', async () => {
      const result = await accessTokenService.createPAT(
        {
          label: 'a',
          expiryInDays: 7,
        },
        user,
      );
      expect(result).toEqualLeft({
        message: ACCESS_TOKEN_LABEL_SHORT,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    });

    test('should throw ACCESS_TOKEN_EXPIRY_INVALID if expiry date is invalid', async () => {
      const result = await accessTokenService.createPAT(
        {
          label: 'test',
          expiryInDays: 9,
        },
        user,
      );
      expect(result).toEqualLeft({
        message: ACCESS_TOKEN_EXPIRY_INVALID,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    });

    test('should successfully create a new Access Token', async () => {
      mockPrisma.personalAccessToken.create.mockResolvedValueOnce(
        userAccessToken,
      );

      const result = await accessTokenService.createPAT(
        {
          label: userAccessToken.label,
          expiryInDays,
        },
        user,
      );
      expect(result).toEqualRight({
        token: `pat-${userAccessToken.token}`,
        info: userAccessTokenCasted,
      });
    });
  });

  describe('deletePAT', () => {
    test('should throw ACCESS_TOKEN_NOT_FOUND if Access Token is not found', async () => {
      mockPrisma.personalAccessToken.delete.mockRejectedValueOnce(
        'RecordNotFound',
      );

      const result = await accessTokenService.deletePAT(userAccessToken.id);
      expect(result).toEqualLeft({
        message: ACCESS_TOKEN_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });
    });

    test('should successfully delete a new Access Token', async () => {
      mockPrisma.personalAccessToken.delete.mockResolvedValueOnce(
        userAccessToken,
      );

      const result = await accessTokenService.deletePAT(userAccessToken.id);
      expect(result).toEqualRight(true);
    });
  });

  describe('listAllUserPAT', () => {
    test('should successfully return a list of user Access Tokens', async () => {
      mockPrisma.personalAccessToken.findMany.mockResolvedValueOnce([
        userAccessToken,
      ]);

      const result = await accessTokenService.listAllUserPAT(user.uid, 0, 10);
      expect(result).toEqual([userAccessTokenCasted]);
    });
  });

  describe('getUserPAT', () => {
    test('should throw ACCESS_TOKEN_NOT_FOUND if Access Token is not found', async () => {
      mockPrisma.personalAccessToken.findUniqueOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );

      const result = await accessTokenService.getUserPAT(userAccessToken.token);
      expect(result).toEqualLeft(ACCESS_TOKEN_NOT_FOUND);
    });

    test('should successfully return a user Access Tokens', async () => {
      mockPrisma.personalAccessToken.findUniqueOrThrow.mockResolvedValueOnce({
        ...userAccessToken,
        user,
      } as any);

      const result = await accessTokenService.getUserPAT(
        `pat-${userAccessToken.token}`,
      );
      expect(result).toEqualRight({
        user,
        ...userAccessToken,
      } as any);
    });
  });

  describe('updateLastUsedforPAT', () => {
    test('should throw ACCESS_TOKEN_NOT_FOUND if Access Token is not found', async () => {
      mockPrisma.personalAccessToken.update.mockRejectedValueOnce(
        'RecordNotFound',
      );

      const result = await accessTokenService.updateLastUsedForPAT(
        userAccessToken.token,
      );
      expect(result).toEqualLeft(ACCESS_TOKEN_NOT_FOUND);
    });

    test('should successfully update lastUsedOn for a user Access Tokens', async () => {
      mockPrisma.personalAccessToken.update.mockResolvedValueOnce(
        userAccessToken,
      );

      const result = await accessTokenService.updateLastUsedForPAT(
        `pat-${userAccessToken.token}`,
      );
      expect(result).toEqualRight(userAccessTokenCasted);
    });
  });
});

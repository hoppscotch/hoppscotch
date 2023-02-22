import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import {
  SHORTCODE_ALREADY_EXISTS,
  SHORTCODE_INVALID_JSON,
  SHORTCODE_NOT_FOUND,
} from 'src/errors';
import { Shortcode } from './shortcode.model';
import { ShortcodeService } from './shortcode.service';
import { UserService } from 'src/user/user.service';

const mockPrisma = mockDeep<PrismaService>();

const mockPubSub = {
  publish: jest.fn().mockResolvedValue(null),
};

const mockDocFunc = jest.fn();

const mockFB = {
  firestore: {
    doc: mockDocFunc,
  },
};
const mockUserService = new UserService(mockFB as any, mockPubSub as any);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const shortcodeService = new ShortcodeService(
  mockPrisma,
  mockPubSub as any,
  mockUserService,
);

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});
const createdOn = new Date();

const shortCodeWithOutUser = {
  id: '123',
  request: '{}',
  createdOn: createdOn,
  creatorUid: null,
};

const shortCodeWithUser = {
  id: '123',
  request: '{}',
  createdOn: createdOn,
  creatorUid: 'user_uid_1',
};

const shortcodes = [
  {
    id: 'blablabla',
    request: {
      hello: 'there',
    },
    creatorUid: 'testuser',
    createdOn: new Date(),
  },
  {
    id: 'blablabla1',
    request: {
      hello: 'there',
    },
    creatorUid: 'testuser',
    createdOn: new Date(),
  },
];

describe('ShortcodeService', () => {
  describe('getShortCode', () => {
    test('should return a valid shortcode with valid shortcode ID', async () => {
      mockPrisma.shortcode.findFirstOrThrow.mockResolvedValueOnce(
        shortCodeWithOutUser,
      );

      const result = await shortcodeService.getShortCode(
        shortCodeWithOutUser.id,
      );
      expect(result).toEqualRight(<Shortcode>{
        id: shortCodeWithOutUser.id,
        createdOn: shortCodeWithOutUser.createdOn,
        request: JSON.stringify(shortCodeWithOutUser.request),
      });
    });

    test('should throw SHORTCODE_NOT_FOUND error when shortcode ID is invalid', async () => {
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );

      const result = await shortcodeService.getShortCode('invalidID');
      expect(result).toEqualLeft(SHORTCODE_NOT_FOUND);
    });
  });

  describe('fetchUserShortCodes', () => {
    test('should return list of shortcodes with valid inputs and no cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValueOnce(shortcodes);

      const result = await shortcodeService.fetchUserShortCodes('testuser', {
        cursor: null,
        take: 10,
      });
      expect(result).toEqual(<Shortcode[]>[
        {
          id: shortcodes[0].id,
          request: JSON.stringify(shortcodes[0].request),
          createdOn: shortcodes[0].createdOn,
        },
        {
          id: shortcodes[1].id,
          request: JSON.stringify(shortcodes[1].request),
          createdOn: shortcodes[1].createdOn,
        },
      ]);
    });

    test('should return list of shortcodes with valid inputs and cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([shortcodes[1]]);

      const result = await shortcodeService.fetchUserShortCodes('testuser', {
        cursor: 'blablabla',
        take: 10,
      });
      expect(result).toEqual(<Shortcode[]>[
        {
          id: shortcodes[1].id,
          request: JSON.stringify(shortcodes[1].request),
          createdOn: shortcodes[1].createdOn,
        },
      ]);
    });

    test('should return an empty array for an invalid cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await shortcodeService.fetchUserShortCodes('testuser', {
        cursor: 'invalidcursor',
        take: 10,
      });

      expect(result).toHaveLength(0);
    });

    test('should return an empty array for an invalid user id and null cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await shortcodeService.fetchUserShortCodes('invalidid', {
        cursor: null,
        take: 10,
      });

      expect(result).toHaveLength(0);
    });

    test('should return an empty array for an invalid user id and an invalid cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await shortcodeService.fetchUserShortCodes('invalidid', {
        cursor: 'invalidcursor',
        take: 10,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('createShortcode', () => {
    test('should throw SHORTCODE_INVALID_JSON error if incoming request data is invalid', async () => {
      const result = await shortcodeService.createShortcode(
        'invalidRequest',
        'user_uid_1',
      );
      expect(result).toEqualLeft(SHORTCODE_INVALID_JSON);
    });

    test('should successfully create a new shortcode with valid user uid', async () => {
      // generateUniqueShortCodeID --> getShortCode
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );
      mockPrisma.shortcode.create.mockResolvedValueOnce(shortCodeWithUser);

      const result = await shortcodeService.createShortcode('{}', 'user_uid_1');
      expect(result).toEqualRight({
        id: shortCodeWithUser.id,
        createdOn: shortCodeWithUser.createdOn,
        request: JSON.stringify(shortCodeWithUser.request),
      });
    });

    test('should successfully create a new shortcode with null user uid', async () => {
      // generateUniqueShortCodeID --> getShortCode
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );
      mockPrisma.shortcode.create.mockResolvedValueOnce(shortCodeWithUser);

      const result = await shortcodeService.createShortcode('{}', null);
      expect(result).toEqualRight({
        id: shortCodeWithUser.id,
        createdOn: shortCodeWithUser.createdOn,
        request: JSON.stringify(shortCodeWithOutUser.request),
      });
    });

    test('should send pubsub message to `shortcode/{uid}/created` on successful creation of shortcode', async () => {
      // generateUniqueShortCodeID --> getShortCode
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );
      mockPrisma.shortcode.create.mockResolvedValueOnce(shortCodeWithUser);

      const result = await shortcodeService.createShortcode('{}', 'user_uid_1');
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `shortcode/${shortCodeWithUser.creatorUid}/created`,
        {
          id: shortCodeWithUser.id,
          createdOn: shortCodeWithUser.createdOn,
          request: JSON.stringify(shortCodeWithUser.request),
        },
      );
    });
  });

  describe('revokeShortCode', () => {
    test('should return true on successful deletion of shortcode with valid inputs', async () => {
      mockPrisma.shortcode.delete.mockResolvedValueOnce(shortCodeWithUser);

      const result = await shortcodeService.revokeShortCode(
        shortCodeWithUser.id,
        shortCodeWithUser.creatorUid,
      );

      expect(mockPrisma.shortcode.delete).toHaveBeenCalledWith({
        where: {
          creator_uid_shortcode_unique: {
            creatorUid: shortCodeWithUser.creatorUid,
            id: shortCodeWithUser.id,
          },
        },
      });

      expect(result).toEqualRight(true);
    });

    test('should return SHORTCODE_NOT_FOUND error when shortcode is invalid and user uid is valid', async () => {
      mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
      expect(
        shortcodeService.revokeShortCode('invalid', 'testuser'),
      ).resolves.toEqualLeft(SHORTCODE_NOT_FOUND);
    });

    test('should return SHORTCODE_NOT_FOUND error when shortcode is valid and user uid is invalid', async () => {
      mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
      expect(
        shortcodeService.revokeShortCode('blablablabla', 'invalidUser'),
      ).resolves.toEqualLeft(SHORTCODE_NOT_FOUND);
    });

    test('should return SHORTCODE_NOT_FOUND error when both shortcode and user uid are invalid', async () => {
      mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
      expect(
        shortcodeService.revokeShortCode('invalid', 'invalid'),
      ).resolves.toEqualLeft(SHORTCODE_NOT_FOUND);
    });

    test('should send pubsub message to `shortcode/{uid}/revoked` on successful deletion of shortcode', async () => {
      mockPrisma.shortcode.delete.mockResolvedValueOnce(shortCodeWithUser);

      const result = await shortcodeService.revokeShortCode(
        shortCodeWithUser.id,
        shortCodeWithUser.creatorUid,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `shortcode/${shortCodeWithUser.creatorUid}/revoked`,
        {
          id: shortCodeWithUser.id,
          createdOn: shortCodeWithUser.createdOn,
          request: JSON.stringify(shortCodeWithUser.request),
        },
      );
    });
  });

  describe('deleteUserShortCodes', () => {
    test('should successfully delete all users shortcodes with valid user uid', async () => {
      mockPrisma.shortcode.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await shortcodeService.deleteUserShortCodes(
        shortCodeWithUser.creatorUid,
      );
      expect(result).toEqual(1);
    });

    test('should return 0 when user uid is invalid', async () => {
      mockPrisma.shortcode.deleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await shortcodeService.deleteUserShortCodes(
        shortCodeWithUser.creatorUid,
      );
      expect(result).toEqual(0);
    });
  });
});

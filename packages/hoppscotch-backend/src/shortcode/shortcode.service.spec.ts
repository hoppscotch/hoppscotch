import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';

import { SHORTCODE_NOT_FOUND } from 'src/errors';
import { User } from 'src/user/user.model';
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

describe('ShortcodeService', () => {
  describe('resolveShortcode', () => {
    test('returns Some for a valid existent shortcode', () => {
      mockPrisma.shortcode.findFirst.mockResolvedValueOnce({
        id: 'blablablabla',
        createdOn: new Date(),
        request: {
          hello: 'there',
        },
        creatorUid: 'testuser',
      });

      return expect(
        shortcodeService.resolveShortcode('blablablabla')(),
      ).resolves.toBeSome();
    });

    test('returns the correct info for a valid shortcode', () => {
      const shortcode = {
        id: 'blablablabla',
        createdOn: new Date(),
        request: {
          hello: 'there',
        },
        creatorUid: 'testuser',
      };

      mockPrisma.shortcode.findFirst.mockResolvedValueOnce(shortcode);

      return expect(
        shortcodeService.resolveShortcode('blablablabla')(),
      ).resolves.toEqualSome(<Shortcode>{
        id: shortcode.id,
        request: JSON.stringify(shortcode.request),
        createdOn: shortcode.createdOn,
      });
    });

    test('returns None for non-existent shortcode', () => {
      mockPrisma.shortcode.findFirst.mockResolvedValueOnce(null);

      return expect(
        shortcodeService.resolveShortcode('blablablabla')(),
      ).resolves.toBeNone();
    });
  });

  // TODO: Implement create shortcode
  // describe('createShortcode', () => {
  //   test('creates the shortcode entry in the db', async () => {
  //     mockPrisma.shortcode.create.mockResolvedValueOnce({
  //       id: 'itvalidreqid',
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: null,
  //       createdOn: new Date(),
  //     });
  //
  //     await shortcodeService.createShortcode({ hello: 'there' })();
  //   });
  //
  //   test('returns a valid Shortcode Model object', () => {
  //     const shortcode = {
  //       id: 'blablablabla',
  //       createdOn: new Date(),
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: 'testuser',
  //     };
  //     mockPrisma.shortcode.create.mockResolvedValueOnce(shortcode);
  //
  //     expect(
  //       shortcodeService.createShortcode({ hello: 'there' })(),
  //     ).resolves.toEqual(<Shortcode>{
  //       id: shortcode.id,
  //       request: JSON.stringify(shortcode.request),
  //       createdOn: shortcode.createdOn,
  //     });
  //   });
  //
  //   test('if a creator is specified, their UID is stored in the DB', async () => {
  //     const testUser: User = {
  //       uid: 'testuid',
  //       displayName: 'Test User',
  //       email: 'test@hoppscotch.io',
  //     };
  //
  //     const shortcode = {
  //       id: 'blablablabla',
  //       createdOn: new Date(),
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: testUser.uid,
  //     };
  //
  //     mockPrisma.shortcode.create.mockResolvedValueOnce(shortcode);
  //
  //     const result = await shortcodeService.createShortcode(
  //       { hello: 'there' },
  //       testUser,
  //     )();
  //
  //     expect(mockPrisma.shortcode.create).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         data: {
  //           id: expect.any(String),
  //           request: {
  //             hello: 'there',
  //           },
  //           creatorUid: testUser.uid,
  //         },
  //       }),
  //     );
  //   });
  //
  //   test('if a creator is not specified the creator uid is stored as null', async () => {
  //     mockPrisma.shortcode.create.mockResolvedValueOnce({
  //       id: 'itvalidreqid',
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: null,
  //       createdOn: new Date(),
  //     });
  //
  //     await shortcodeService.createShortcode({ hello: 'there' })();
  //
  //     expect(mockPrisma.shortcode.create).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         data: {
  //           id: expect.any(String),
  //           request: {
  //             hello: 'there',
  //           },
  //           creatorUid: undefined,
  //         },
  //       }),
  //     );
  //   });
  //
  //   test('generates shortcodes which are 12 character alphanumerics', async () => {
  //     mockPrisma.shortcode.create.mockImplementation((args) => {
  //       return Promise.resolve({
  //         id: args.data.id,
  //         request: args.data.request,
  //         creatorUid: args.data.creatorUid,
  //         createdOn: args.data.createdOn,
  //       }) as any;
  //     });
  //
  //     // Generate 100 shortcodes
  //     const shortcodeEntries: Shortcode[] = [];
  //     for (let i = 0; i < 100; i++) {
  //       shortcodeEntries.push(
  //         await shortcodeService.createShortcode({ hello: 'there' })(),
  //       );
  //     }
  //
  //     expect(shortcodeEntries.every((entry) => entry.id.length === 12)).toBe(
  //       true,
  //     );
  //     expect(
  //       shortcodeEntries.every((entry) => /^[a-zA-Z0-9]*$/.test(entry.id)),
  //     ).toBe(true);
  //   });
  //
  //   test('if creator is not specified, doesnt publish to pubsub anything', async () => {
  //     mockPrisma.shortcode.create.mockResolvedValueOnce({
  //       id: 'itvalidreqid',
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: null,
  //       createdOn: new Date(),
  //     });
  //
  //     await shortcodeService.createShortcode({ hello: 'there' })();
  //
  //     expect(mockPubSub.publish).not.toHaveBeenCalled();
  //   });
  //
  //   test('if creator is specified, publishes to the proper pubsub topic `shortcode.{uid}.created`', async () => {
  //     const testUser: User = {
  //       uid: 'testuid',
  //       displayName: 'Test User',
  //       email: 'test@hoppscotch.io',
  //     };
  //
  //     const shortcode = {
  //       id: 'blablablabla',
  //       createdOn: new Date(),
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: testUser.uid,
  //     };
  //
  //     mockPrisma.shortcode.create.mockResolvedValueOnce(shortcode);
  //
  //     const result = await shortcodeService.createShortcode(
  //       { hello: 'there' },
  //       testUser,
  //     )();
  //
  //     expect(mockPubSub.publish).toHaveBeenCalledWith(
  //       `shortcode/testuid/created`,
  //       { ...result },
  //     );
  //   });
  // });

  describe('fetchUserShortCodes', () => {
    test('returns all shortcodes for a user with no provided cursor', async () => {
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
      mockPrisma.shortcode.findMany.mockResolvedValue(shortcodes);

      const result = await shortcodeService.fetchUserShortCodes(
        'testuser',
        null,
      )();

      expect(mockPrisma.shortcode.findMany).toHaveBeenCalledWith({
        take: 10,
        where: {
          creatorUid: 'testuser',
        },
        orderBy: {
          createdOn: 'desc',
        },
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

    test('return shortcodes for a user with a provided cursor', async () => {
      const shortcodes = [
        {
          id: 'blablabla1',
          request: {
            hello: 'there',
          },
          creatorUid: 'testuser',
          createdOn: new Date(),
        },
      ];
      mockPrisma.shortcode.findMany.mockResolvedValue(shortcodes);

      const result = await shortcodeService.fetchUserShortCodes(
        'testuser',
        'blablabla',
      )();

      expect(mockPrisma.shortcode.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 1,
        cursor: {
          id: 'blablabla',
        },
        where: {
          creatorUid: 'testuser',
        },
        orderBy: {
          createdOn: 'desc',
        },
      });

      expect(result).toEqual(<Shortcode[]>[
        {
          id: shortcodes[0].id,
          request: JSON.stringify(shortcodes[0].request),
          createdOn: shortcodes[0].createdOn,
        },
      ]);
    });

    test('returns an empty array for an invalid cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await shortcodeService.fetchUserShortCodes(
        'testuser',
        'invalidcursor',
      )();

      expect(result).toHaveLength(0);
    });

    test('returns an empty array for an invalid user id and null cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await shortcodeService.fetchUserShortCodes(
        'invalidid',
        null,
      )();

      expect(result).toHaveLength(0);
    });

    test('returns an empty array for an invalid user id and an invalid cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await shortcodeService.fetchUserShortCodes(
        'invalidid',
        'invalidcursor',
      )();

      expect(result).toHaveLength(0);
    });
  });

  // TODO: Implement revoke shortcode and user shortcode deletion
  // describe('revokeShortCode', () => {
  //   test('returns details of deleted shortcode, when user uid and shortcode is valid', async () => {
  //     const shortcode = {
  //       id: 'blablablabla',
  //       createdOn: new Date(),
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: 'testuser',
  //     };
  //
  //     mockPrisma.shortcode.delete.mockResolvedValueOnce(shortcode);
  //
  //     const result = await shortcodeService.revokeShortCode(
  //       shortcode.id,
  //       shortcode.creatorUid,
  //     )();
  //
  //     expect(mockPrisma.shortcode.delete).toHaveBeenCalledWith({
  //       where: {
  //         creator_uid_shortcode_unique: {
  //           creatorUid: shortcode.creatorUid,
  //           id: shortcode.id,
  //         },
  //       },
  //     });
  //
  //     expect(result).toEqualRight(<Shortcode>{
  //       id: shortcode.id,
  //       request: JSON.stringify(shortcode.request),
  //       createdOn: shortcode.createdOn,
  //     });
  //   });
  //
  //   test('returns SHORTCODE_NOT_FOUND error when shortcode is invalid and user uid is valid', async () => {
  //     mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
  //     expect(
  //       shortcodeService.revokeShortCode('invalid', 'testuser')(),
  //     ).resolves.toEqualLeft(SHORTCODE_NOT_FOUND);
  //   });
  //
  //   test('returns SHORTCODE_NOT_FOUND error when shortcode is valid and user uid is invalid', async () => {
  //     mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
  //     expect(
  //       shortcodeService.revokeShortCode('blablablabla', 'invalidUser')(),
  //     ).resolves.toEqualLeft(SHORTCODE_NOT_FOUND);
  //   });
  //
  //   test('returns SHORTCODE_NOT_FOUND error when both shortcode and user uid are invalid', async () => {
  //     mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
  //     expect(
  //       shortcodeService.revokeShortCode('invalid', 'invalid')(),
  //     ).resolves.toEqualLeft(SHORTCODE_NOT_FOUND);
  //   });
  //
  //   test('if creator is specified in the deleted shortcode, pubsub message is sent to `shortcode/{uid}/revoked`', async () => {
  //     const shortcode = {
  //       id: 'blablablabla',
  //       createdOn: new Date(),
  //       request: {
  //         hello: 'there',
  //       },
  //       creatorUid: 'testuser',
  //     };
  //
  //     mockPrisma.shortcode.delete.mockResolvedValueOnce(shortcode);
  //
  //     const result = await shortcodeService.revokeShortCode(
  //       shortcode.id,
  //       shortcode.creatorUid,
  //     )();
  //
  //     expect(result).toBeRight();
  //     expect(mockPubSub.publish).toHaveBeenCalledWith(
  //       `shortcode/testuser/revoked`,
  //       { ...(result as any).right },
  //     );
  //   });
  // });
  //
  // describe('deleteUserShortcodes', () => {
  //   test('should return undefined when the user uid is valid and contains shortcodes data', async () => {
  //     const testUserUID = 'testuser1';
  //     const shortcodesList = [
  //       {
  //         id: 'blablablabla',
  //         createdOn: new Date(),
  //         request: {
  //           hello: 'there',
  //         },
  //         creatorUid: testUserUID,
  //       },
  //     ];
  //
  //     mockPrisma.shortcode.findMany.mockResolvedValueOnce(shortcodesList);
  //     mockPrisma.shortcode.delete.mockResolvedValueOnce(shortcodesList[0]);
  //
  //     const result = await shortcodeService.deleteUserShortcodes(testUserUID)();
  //
  //     expect(mockPrisma.shortcode.findMany).toHaveBeenCalledWith({
  //       where: {
  //         creatorUid: testUserUID,
  //       },
  //     });
  //
  //     expect(result).toBeUndefined();
  //   });
  //
  //   test('should return undefined when user uid is valid but user has no shortcode data', async () => {
  //     const testUserUID = 'testuser1';
  //     const shortcodesList = [];
  //
  //     mockPrisma.shortcode.findMany.mockResolvedValueOnce(shortcodesList);
  //
  //     const result = await shortcodeService.deleteUserShortcodes(testUserUID)();
  //
  //     expect(mockPrisma.shortcode.findMany).toHaveBeenCalledWith({
  //       where: {
  //         creatorUid: testUserUID,
  //       },
  //     });
  //
  //     expect(result).toBeUndefined();
  //   });
  //
  //   test('should return undefined when the user uid is invalid', async () => {
  //     const testUserUID = 'invalidtestuser';
  //     const shortcodesList = [];
  //
  //     mockPrisma.shortcode.findMany.mockResolvedValueOnce(shortcodesList);
  //     const result = await shortcodeService.deleteUserShortcodes(testUserUID)();
  //
  //     expect(mockPrisma.shortcode.findMany).toHaveBeenCalledWith({
  //       where: {
  //         creatorUid: testUserUID,
  //       },
  //     });
  //
  //     expect(result).toBeUndefined();
  //   });
  // });
});

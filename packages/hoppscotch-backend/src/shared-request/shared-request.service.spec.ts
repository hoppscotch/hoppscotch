import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import {
  SHARED_REQUEST_INVALID_PROPERTIES_JSON,
  SHARED_REQUEST_INVALID_REQUEST_JSON,
  SHARED_REQUEST_NOT_FOUND,
} from 'src/errors';
import { UserService } from 'src/user/user.service';
import { SharedRequestService } from './shared-request.service';
import { SharedRequest } from './shared-requests.model';
import { AuthUser } from 'src/types/AuthUser';

const mockPrisma = mockDeep<PrismaService>();

const mockPubSub = {
  publish: jest.fn().mockResolvedValue(null),
};

const mockDocFunc = jest.fn();

const mockUserService = new UserService(mockPrisma as any, mockPubSub as any);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const sharedRequestsService = new SharedRequestService(
  mockPrisma,
  mockPubSub as any,
  mockUserService,
);

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});
const createdOn = new Date();

const user: AuthUser = {
  uid: '123344',
  email: 'dwight@dundermifflin.com',
  displayName: 'Dwight Schrute',
  photoURL: 'https://en.wikipedia.org/wiki/Dwight_Schrute',
  isAdmin: false,
  refreshToken: 'hbfvdkhjbvkdvdfjvbnkhjb',
  createdOn: createdOn,
  currentGQLSession: {},
  currentRESTSession: {},
};

const mockEmbed = {
  id: '123',
  request: '{}',
  properties: '{}',
  createdOn: createdOn,
  creatorUid: user.uid,
};

const mockShortcode = {
  id: '123',
  request: '{}',
  properties: null,
  createdOn: createdOn,
  creatorUid: user.uid,
};

const sharedRequests = [
  {
    id: 'blablabla',
    request: {
      hello: 'there',
    },
    properties: {
      foo: 'bar',
    },
    creatorUid: user.uid,
    createdOn: new Date(),
  },
  {
    id: 'blablabla1',
    request: {
      hello: 'there',
    },
    properties: {
      foo: 'bar',
    },
    creatorUid: user.uid,
    createdOn: new Date(),
  },
];

describe('SharedRequestService', () => {
  describe('getSharedRequest', () => {
    test('should return a valid SharedRequest with valid SharedRequest ID', async () => {
      mockPrisma.shortcode.findFirstOrThrow.mockResolvedValueOnce(mockEmbed);

      const result = await sharedRequestsService.getSharedRequest(mockEmbed.id);
      expect(result).toEqualRight(<SharedRequest>{
        id: mockEmbed.id,
        createdOn: mockEmbed.createdOn,
        request: JSON.stringify(mockEmbed.request),
        properties: JSON.stringify(mockEmbed.properties),
      });
    });

    test('should throw SHARED_REQUEST_NOT_FOUND error when SharedRequest ID is invalid', async () => {
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );

      const result = await sharedRequestsService.getSharedRequest('invalidID');
      expect(result).toEqualLeft(SHARED_REQUEST_NOT_FOUND);
    });
  });

  describe('createSharedRequest', () => {
    test('should throw SHARED_REQUEST_INVALID_REQUEST_JSON error if incoming request data is invalid', async () => {
      const result = await sharedRequestsService.createSharedRequest(
        'invalidRequest',
        null,
        user,
      );
      expect(result).toEqualLeft(SHARED_REQUEST_INVALID_REQUEST_JSON);
    });

    test('should throw SHARED_REQUEST_INVALID_PROPERTIES_JSON error if incoming properties data is invalid', async () => {
      const result = await sharedRequestsService.createSharedRequest(
        '{}',
        'invalid_data',
        user,
      );
      expect(result).toEqualLeft(SHARED_REQUEST_INVALID_PROPERTIES_JSON);
    });

    test('should successfully create a new Embed with valid user uid', async () => {
      // generateUniqueShortCodeID --> getSharedRequest
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );
      mockPrisma.shortcode.create.mockResolvedValueOnce(mockEmbed);

      const result = await sharedRequestsService.createSharedRequest(
        '{}',
        '{}',
        user,
      );
      expect(result).toEqualRight(<SharedRequest>{
        id: mockEmbed.id,
        createdOn: mockEmbed.createdOn,
        request: JSON.stringify(mockEmbed.request),
        properties: JSON.stringify(mockEmbed.properties),
      });
    });

    test('should successfully create a new ShortCode with valid user uid', async () => {
      // generateUniqueShortCodeID --> getSharedRequest
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );
      mockPrisma.shortcode.create.mockResolvedValueOnce(mockShortcode);

      const result = await sharedRequestsService.createSharedRequest(
        '{}',
        null,
        user,
      );
      expect(result).toEqualRight(<SharedRequest>{
        id: mockShortcode.id,
        createdOn: mockShortcode.createdOn,
        request: JSON.stringify(mockShortcode.request),
        properties: mockShortcode.properties,
      });
    });

    test('should send pubsub message to `shared_request/{uid}/created` on successful creation of a Shortcode', async () => {
      // generateUniqueShortCodeID --> getSharedRequest
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );
      mockPrisma.shortcode.create.mockResolvedValueOnce(mockShortcode);

      const result = await sharedRequestsService.createSharedRequest(
        '{}',
        null,
        user,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `shared_request/${mockShortcode.creatorUid}/created`,
        <SharedRequest>{
          id: mockShortcode.id,
          createdOn: mockShortcode.createdOn,
          request: JSON.stringify(mockShortcode.request),
          properties: mockShortcode.properties,
        },
      );
    });

    test('should send pubsub message to `shared_request/{uid}/created` on successful creation of an Embed', async () => {
      // generateUniqueShortCodeID --> getSharedRequest
      mockPrisma.shortcode.findFirstOrThrow.mockRejectedValueOnce(
        'NotFoundError',
      );
      mockPrisma.shortcode.create.mockResolvedValueOnce(mockEmbed);

      const result = await sharedRequestsService.createSharedRequest(
        '{}',
        '{}',
        user,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `shared_request/${mockEmbed.creatorUid}/created`,
        <SharedRequest>{
          id: mockEmbed.id,
          createdOn: mockEmbed.createdOn,
          request: JSON.stringify(mockEmbed.request),
          properties: JSON.stringify(mockEmbed.properties),
        },
      );
    });
  });

  describe('fetchUserSharedRequests', () => {
    test('should return list of SharedRequests with valid inputs and no cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValueOnce(sharedRequests);

      const result = await sharedRequestsService.fetchUserSharedRequests(
        user.uid,
        {
          cursor: null,
          take: 10,
        },
      );
      expect(result).toEqual(<SharedRequest[]>[
        {
          id: sharedRequests[0].id,
          request: JSON.stringify(sharedRequests[0].request),
          properties: JSON.stringify(sharedRequests[0].properties),
          createdOn: sharedRequests[0].createdOn,
        },
        {
          id: sharedRequests[1].id,
          request: JSON.stringify(sharedRequests[1].request),
          properties: JSON.stringify(sharedRequests[1].properties),
          createdOn: sharedRequests[1].createdOn,
        },
      ]);
    });

    test('should return list of SharedRequests with valid inputs and cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([sharedRequests[1]]);

      const result = await sharedRequestsService.fetchUserSharedRequests(
        user.uid,
        {
          cursor: 'blablabla',
          take: 10,
        },
      );
      expect(result).toEqual(<SharedRequest[]>[
        {
          id: sharedRequests[1].id,
          request: JSON.stringify(sharedRequests[1].request),
          properties: JSON.stringify(sharedRequests[1].properties),
          createdOn: sharedRequests[1].createdOn,
        },
      ]);
    });

    test('should return an empty array for an invalid cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await sharedRequestsService.fetchUserSharedRequests(
        user.uid,
        {
          cursor: 'invalidcursor',
          take: 10,
        },
      );

      expect(result).toHaveLength(0);
    });

    test('should return an empty array for an invalid user id and null cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await sharedRequestsService.fetchUserSharedRequests(
        'invalidid',
        {
          cursor: null,
          take: 10,
        },
      );

      expect(result).toHaveLength(0);
    });

    test('should return an empty array for an invalid user id and an invalid cursor', async () => {
      mockPrisma.shortcode.findMany.mockResolvedValue([]);

      const result = await sharedRequestsService.fetchUserSharedRequests(
        'invalidid',
        {
          cursor: 'invalidcursor',
          take: 10,
        },
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('revokeSharedRequest', () => {
    test('should return true on successful deletion of SharedRequest with valid inputs', async () => {
      mockPrisma.shortcode.delete.mockResolvedValueOnce(mockEmbed);

      const result = await sharedRequestsService.revokeSharedRequest(
        mockEmbed.id,
        mockEmbed.creatorUid,
      );

      expect(mockPrisma.shortcode.delete).toHaveBeenCalledWith({
        where: {
          creator_uid_shortcode_unique: {
            creatorUid: mockEmbed.creatorUid,
            id: mockEmbed.id,
          },
        },
      });

      expect(result).toEqualRight(true);
    });

    test('should return SHARED_REQUEST_NOT_FOUND error when SharedRequest is invalid and user uid is valid', async () => {
      mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
      expect(
        sharedRequestsService.revokeSharedRequest('invalid', 'testuser'),
      ).resolves.toEqualLeft(SHARED_REQUEST_NOT_FOUND);
    });

    test('should return SHARED_REQUEST_NOT_FOUND error when SharedRequest is valid and user uid is invalid', async () => {
      mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
      expect(
        sharedRequestsService.revokeSharedRequest(
          'blablablabla',
          'invalidUser',
        ),
      ).resolves.toEqualLeft(SHARED_REQUEST_NOT_FOUND);
    });

    test('should return SHARED_REQUEST_NOT_FOUND error when both SharedRequest and user uid are invalid', async () => {
      mockPrisma.shortcode.delete.mockRejectedValue('RecordNotFound');
      expect(
        sharedRequestsService.revokeSharedRequest('invalid', 'invalid'),
      ).resolves.toEqualLeft(SHARED_REQUEST_NOT_FOUND);
    });

    test('should send pubsub message to `shared_request/{uid}/revoked` on successful deletion of SharedRequest', async () => {
      mockPrisma.shortcode.delete.mockResolvedValueOnce(mockEmbed);

      const result = await sharedRequestsService.revokeSharedRequest(
        mockEmbed.id,
        mockEmbed.creatorUid,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `shared_request/${mockEmbed.creatorUid}/revoked`,
        {
          id: mockEmbed.id,
          createdOn: mockEmbed.createdOn,
          request: JSON.stringify(mockEmbed.request),
          properties: JSON.stringify(mockEmbed.properties),
        },
      );
    });
  });

  describe('deleteUserSharedRequests', () => {
    test('should successfully delete all users SharedRequests with valid user uid', async () => {
      mockPrisma.shortcode.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await sharedRequestsService.deleteUserSharedRequests(
        mockEmbed.creatorUid,
      );
      expect(result).toEqual(1);
    });

    test('should return 0 when user uid is invalid', async () => {
      mockPrisma.shortcode.deleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await sharedRequestsService.deleteUserSharedRequests(
        mockEmbed.creatorUid,
      );
      expect(result).toEqual(0);
    });
  });
});

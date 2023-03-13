import {
  ReqType as DbRequestType,
  UserRequest as DbUserRequest,
} from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';
import {
  JSON_INVALID,
  USER_REQUEST_NOT_FOUND,
  USER_REQUEST_REORDERING_FAILED,
} from 'src/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import * as E from 'fp-ts/Either';
import { GetUserRequestArgs } from './input-type.args';
import { MoveUserRequestArgs } from './input-type.args';
import {
  CreateUserRequestArgs,
  UpdateUserRequestArgs,
} from './input-type.args';
import { UserRequest } from './user-request.model';
import { UserRequestService } from './user-request.service';
import { AuthUser } from 'src/types/AuthUser';
import { ReqType } from 'src/user-history/user-history.model';
import { UserCollectionService } from 'src/user-collection/user-collection.service';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();
const mockUserCollectionService = mockDeep<UserCollectionService>();

// @ts-ignore
const userRequestService = new UserRequestService(
  mockPrisma,
  mockPubSub as any,
  mockUserCollectionService,
);

const user: AuthUser = {
  uid: 'user-uid',
  email: 'test@gmail.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.png',
  isAdmin: false,
  refreshToken: null,
  createdOn: new Date(),
  currentGQLSession: null,
  currentRESTSession: null,
};
const dbUserRequests: DbUserRequest[] = [
  {
    id: 'user-request-id-11',
    collectionID: 'collection-id-1',
    orderIndex: 1,
    userUid: user.uid,
    title: 'Request 1',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
  {
    id: 'user-request-id-12',
    collectionID: 'collection-id-1',
    orderIndex: 2,
    userUid: user.uid,
    title: 'Request 2',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
  {
    id: 'user-request-id-13',
    collectionID: 'collection-id-1',
    orderIndex: 3,
    userUid: user.uid,
    title: 'Request 3',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
  {
    id: 'user-request-id-14',
    collectionID: 'collection-id-1',
    orderIndex: 4,
    userUid: user.uid,
    title: 'Request 4',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
  {
    id: 'user-request-id-21',
    collectionID: 'collection-id-2',
    orderIndex: 1,
    userUid: user.uid,
    title: 'Request 1',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
  {
    id: 'user-request-id-22',
    collectionID: 'collection-id-2',
    orderIndex: 2,
    userUid: user.uid,
    title: 'Request 2',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
  {
    id: 'user-request-id-23',
    collectionID: 'collection-id-2',
    orderIndex: 3,
    userUid: user.uid,
    title: 'Request 3',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
  {
    id: 'user-request-id-24',
    collectionID: 'collection-id-2',
    orderIndex: 4,
    userUid: user.uid,
    title: 'Request 4',
    request: {},
    type: DbRequestType.REST,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
];
const userRequests: UserRequest[] = dbUserRequests.map((r) => {
  return {
    ...r,
    request: JSON.stringify(r.request),
    type: ReqType[r.type],
  };
});

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
  mockUserCollectionService.getUserCollection.mockClear();
});

describe('UserRequestService', () => {
  describe('fetchUserRequests', () => {
    test('Should resolve right and fetch user requests (with collection ID)', () => {
      const args: GetUserRequestArgs = {
        collectionID: 'collection-id-1',
        cursor: undefined,
        take: undefined,
      };
      const expectedDbUserRequests = dbUserRequests.filter(
        (r) => r.collectionID === args.collectionID,
      );
      const expectedUserRequests = userRequests.filter(
        (r) => r.collectionID === args.collectionID,
      );

      mockPrisma.userRequest.findMany.mockResolvedValue(expectedDbUserRequests);
      const result = userRequestService.fetchUserRequests(
        args.collectionID,
        ReqType.REST,
        args.cursor,
        args.take,
        user,
      );

      expect(result).resolves.toEqualRight(expectedUserRequests);
    });

    test('Should resolve right and fetch user requests (with collection ID and take)', () => {
      const args: GetUserRequestArgs = {
        collectionID: 'collection-id-1',
        cursor: undefined,
        take: 2,
      };
      const expectedDbUserRequests = dbUserRequests.filter(
        (r) => r.collectionID === args.collectionID,
      );
      const expectedUserRequests = userRequests.filter(
        (r) => r.collectionID === args.collectionID,
      );

      mockPrisma.userRequest.findMany.mockResolvedValue(expectedDbUserRequests);
      const result = userRequestService.fetchUserRequests(
        args.collectionID,
        ReqType.REST,
        args.cursor,
        args.take,
        user,
      );

      expect(result).resolves.toEqualRight(expectedUserRequests);
    });
    test('Should resolve right and fetch user requests (with all params)', () => {
      const args: GetUserRequestArgs = {
        collectionID: 'collection-id-1',
        cursor: 'user-request-id-12',
        take: 2,
      };
      const expectedDbUserRequests = dbUserRequests.filter(
        (r) => r.collectionID === args.collectionID,
      );
      const expectedUserRequests = userRequests.filter(
        (r) => r.collectionID === args.collectionID,
      );

      mockPrisma.userRequest.findMany.mockResolvedValue(expectedDbUserRequests);
      const result = userRequestService.fetchUserRequests(
        args.collectionID,
        ReqType.REST,
        args.cursor,
        args.take,
        user,
      );

      expect(result).resolves.toEqualRight(expectedUserRequests);
    });
  });

  describe('fetchUserRequest', () => {
    test('Should resolve right and fetch user request', () => {
      const expectedDbUserRequest = dbUserRequests[0];
      const expectedUserRequest = userRequests[0];

      mockPrisma.userRequest.findUnique.mockResolvedValue(
        expectedDbUserRequest,
      );
      const result = userRequestService.fetchUserRequest(
        expectedUserRequest.id,
        user,
      );

      expect(result).resolves.toEqualRight(expectedUserRequest);
    });

    test('Should resolve left if user request not exist', () => {
      mockPrisma.userRequest.findUnique.mockResolvedValue(null);
      const result = userRequestService.fetchUserRequest(
        userRequests[0].id,
        user,
      );

      expect(result).resolves.toEqualLeft(USER_REQUEST_NOT_FOUND);
    });

    test('Should resolve left if another users user-request asked', () => {
      mockPrisma.userRequest.findUnique.mockResolvedValue({
        ...dbUserRequests[0],
        userUid: 'another-user',
      });
      const result = userRequestService.fetchUserRequest(
        userRequests[0].id,
        user,
      );

      expect(result).resolves.toEqualLeft(USER_REQUEST_NOT_FOUND);
    });
  });

  describe('createRequest', () => {
    test('Should resolve right and create user request', () => {
      const args: CreateUserRequestArgs = {
        collectionID: userRequests[0].collectionID,
        title: userRequests[0].title,
        request: userRequests[0].request,
        type: userRequests[0].type,
      };

      mockPrisma.userRequest.count.mockResolvedValue(
        dbUserRequests[0].orderIndex - 1,
      );
      mockUserCollectionService.getUserCollection.mockResolvedValue(
        E.right({ type: userRequests[0].type, userUid: user.uid } as any),
      );
      mockPrisma.userRequest.create.mockResolvedValue(dbUserRequests[0]);

      const result = userRequestService.createRequest(
        args.collectionID,
        args.title,
        args.request,
        args.type,
        user,
      );

      expect(result).resolves.toEqualRight(userRequests[0]);
    });
    test('Should execute prisma.create() with correct params', async () => {
      const args: CreateUserRequestArgs = {
        collectionID: userRequests[0].collectionID,
        title: userRequests[0].title,
        request: userRequests[0].request,
        type: userRequests[0].type,
      };

      mockPrisma.userRequest.count.mockResolvedValue(
        dbUserRequests[0].orderIndex - 1,
      );
      mockPrisma.userRequest.create.mockResolvedValue(dbUserRequests[0]);

      await userRequestService.createRequest(
        args.collectionID,
        args.title,
        args.request,
        args.type,
        user,
      );

      expect(mockPrisma.userRequest.create).toHaveBeenCalledWith({
        data: {
          ...args,
          request: JSON.parse(args.request),
          type: DbRequestType[args.type],
          orderIndex: dbUserRequests[0].orderIndex,
          userUid: user.uid,
        },
      });
    });
    test('Should publish user request created message in pubnub', async () => {
      const args: CreateUserRequestArgs = {
        collectionID: userRequests[0].collectionID,
        title: userRequests[0].title,
        request: userRequests[0].request,
        type: userRequests[0].type,
      };

      mockPrisma.userRequest.count.mockResolvedValue(
        dbUserRequests[0].orderIndex - 1,
      );
      mockPrisma.userRequest.create.mockResolvedValue(dbUserRequests[0]);

      await userRequestService.createRequest(
        args.collectionID,
        args.title,
        args.request,
        args.type,
        user,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_request/${dbUserRequests[0].userUid}/created`,
        userRequests[0],
      );
    });
    test('Should resolve left for json-invalid request', () => {
      const args: CreateUserRequestArgs = {
        collectionID: userRequests[0].collectionID,
        title: userRequests[0].title,
        request: 'invalid json',
        type: userRequests[0].type,
      };

      mockPrisma.userRequest.count.mockResolvedValue(
        dbUserRequests[0].orderIndex - 1,
      );
      mockPrisma.userRequest.create.mockResolvedValue(dbUserRequests[0]);

      const result = userRequestService.createRequest(
        args.collectionID,
        args.title,
        args.request,
        args.type,
        user,
      );

      expect(result).resolves.toEqualLeft(JSON_INVALID);
    });
  });

  describe('updateRequest', () => {
    test('Should resolve right and update user request', () => {
      const id = userRequests[0].id;
      const type = userRequests[0].type;
      const args: UpdateUserRequestArgs = {
        title: userRequests[0].title,
        request: userRequests[0].request,
      };

      mockPrisma.userRequest.findFirst.mockResolvedValueOnce(dbUserRequests[0]);
      mockPrisma.userCollection.findFirst.mockResolvedValueOnce({} as any);
      mockPrisma.userRequest.update.mockResolvedValue(dbUserRequests[0]);

      const result = userRequestService.updateRequest(
        id,
        args.title,
        type,
        args.request,
        user,
      );

      expect(result).resolves.toEqualRight(userRequests[0]);
    });
    test('Should resolve right and perform prisma.update with correct param', async () => {
      const id = userRequests[0].id;
      const type = userRequests[0].type;
      const args: UpdateUserRequestArgs = {
        title: userRequests[0].title,
        request: userRequests[0].request,
      };

      mockPrisma.userRequest.findFirst.mockResolvedValueOnce(dbUserRequests[0]);
      mockPrisma.userCollection.findFirst.mockResolvedValueOnce({} as any);
      mockPrisma.userRequest.update.mockResolvedValue(dbUserRequests[0]);

      await userRequestService.updateRequest(
        id,
        args.title,
        type,
        args.request,
        user,
      );

      expect(mockPrisma.userRequest.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          ...args,
          request: JSON.parse(args.request),
        },
      });
    });
    test('Should resolve right and publish to pubnub with correct param', async () => {
      const id = userRequests[0].id;
      const type = userRequests[0].type;
      const args: UpdateUserRequestArgs = {
        title: userRequests[0].title,
        request: userRequests[0].request,
      };

      mockPrisma.userRequest.findFirst.mockResolvedValueOnce(dbUserRequests[0]);
      mockPrisma.userCollection.findFirst.mockResolvedValueOnce({} as any);
      mockPrisma.userRequest.update.mockResolvedValue(dbUserRequests[0]);

      await userRequestService.updateRequest(
        id,
        args.title,
        type,
        args.request,
        user,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_request/${dbUserRequests[0].userUid}/updated`,
        userRequests[0],
      );
    });
    test('Should resolve left if user request not found', () => {
      const id = userRequests[0].id;
      const type = userRequests[0].type;
      const args: UpdateUserRequestArgs = {
        title: userRequests[0].title,
        request: userRequests[0].request,
      };

      mockPrisma.userRequest.findFirst.mockResolvedValue(null);

      const result = userRequestService.updateRequest(
        id,
        args.title,
        type,
        args.request,
        user,
      );

      expect(result).resolves.toEqualLeft(USER_REQUEST_NOT_FOUND);
    });
    test('Should resolve left if stringToJson returns error', () => {
      const id = userRequests[0].id;
      const type = userRequests[0].type;
      const args: UpdateUserRequestArgs = {
        title: userRequests[0].title,
        request: 'invalid json',
      };

      mockPrisma.userRequest.findFirst.mockResolvedValueOnce(dbUserRequests[0]);
      mockPrisma.userCollection.findFirst.mockResolvedValueOnce({} as any);

      const result = userRequestService.updateRequest(
        id,
        args.title,
        type,
        args.request,
        user,
      );

      expect(result).resolves.toEqualLeft(JSON_INVALID);
    });
  });

  describe('deleteRequest', () => {
    test('Should resolve right and delete user request', () => {
      const id = userRequests[0].id;

      mockPrisma.userRequest.findFirst.mockResolvedValue(dbUserRequests[0]);
      mockPrisma.userRequest.delete.mockResolvedValue(dbUserRequests[0]);

      const result = userRequestService.deleteRequest(id, user);

      expect(result).resolves.toEqualRight(true);
    });
    test('Should resolve right and perform prisma.delete with correct param', async () => {
      const id = userRequests[0].id;

      mockPrisma.userRequest.findFirst.mockResolvedValue(dbUserRequests[0]);
      mockPrisma.userRequest.delete.mockResolvedValue(null);

      await userRequestService.deleteRequest(id, user);

      expect(mockPrisma.userRequest.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
    test('Should resolve right and perform prisma.updateMany with correct param', async () => {
      const id = userRequests[0].id;

      mockPrisma.userRequest.findFirst.mockResolvedValue(dbUserRequests[0]);
      mockPrisma.userRequest.delete.mockResolvedValue(null);

      await userRequestService.deleteRequest(id, user);

      expect(mockPrisma.userRequest.updateMany).toHaveBeenCalledWith({
        where: {
          collectionID: dbUserRequests[0].collectionID,
          orderIndex: { gt: dbUserRequests[0].orderIndex },
        },
        data: { orderIndex: { decrement: 1 } },
      });
    });
    test('Should resolve and publish message to pubnub', async () => {
      const id = userRequests[0].id;

      mockPrisma.userRequest.findFirst.mockResolvedValue(dbUserRequests[0]);
      mockPrisma.userRequest.delete.mockResolvedValue(null);

      const result = await userRequestService.deleteRequest(id, user);

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_request/${dbUserRequests[0].userUid}/deleted`,
        userRequests[0],
      );
    });
    test('Should resolve error if the user request is not found', () => {
      const id = userRequests[0].id;
      mockPrisma.userRequest.findFirst.mockResolvedValue(null);

      const result = userRequestService.deleteRequest(id, user);

      expect(result).resolves.toEqualLeft(USER_REQUEST_NOT_FOUND);
      expect(mockPrisma.userRequest.findFirst).toHaveBeenCalledWith({
        where: { id, userUid: dbUserRequests[0].userUid },
      });
      expect(mockPrisma.userRequest.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.userRequest.delete).not.toHaveBeenCalled();
      expect(mockPubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('reorderRequests', () => {
    test('Should resolve left if transaction throws an error', async () => {
      const srcCollID = dbUserRequests[0].collectionID;
      const request = dbUserRequests[0];
      const destCollID = dbUserRequests[4].collectionID;
      const nextRequest = dbUserRequests[4];

      mockPrisma.$transaction.mockRejectedValueOnce(new Error());
      const result = await userRequestService.reorderRequests(
        srcCollID,
        request,
        destCollID,
        nextRequest,
      );
      expect(result).toEqual(E.left(USER_REQUEST_REORDERING_FAILED));
    });
    test('Should resolve right and call transaction with the correct data', async () => {
      const srcCollID = dbUserRequests[0].collectionID;
      const request = dbUserRequests[0];
      const destCollID = dbUserRequests[4].collectionID;
      const nextRequest = dbUserRequests[4];

      const updatedReq: DbUserRequest = {
        ...request,
        collectionID: destCollID,
        orderIndex: nextRequest.orderIndex,
      };

      mockPrisma.$transaction.mockResolvedValueOnce(E.right(updatedReq));
      const result = await userRequestService.reorderRequests(
        srcCollID,
        request,
        destCollID,
        nextRequest,
      );
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(result).toEqual(E.right(updatedReq));
    });
  });

  describe('findRequestAndNextRequest', () => {
    test('Should resolve right if the request and the next request are found', async () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[4].collectionID,
        requestID: userRequests[0].id,
        nextRequestID: userRequests[4].id,
      };

      mockPrisma.userRequest.findFirst
        .mockResolvedValueOnce(dbUserRequests[0])
        .mockResolvedValueOnce(dbUserRequests[4]);

      const result = await userRequestService.findRequestAndNextRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(result).toEqualRight({
        request: dbUserRequests[0],
        nextRequest: dbUserRequests[4],
      });
    });
    test('Should resolve right if the request and next request null', () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[1].collectionID,
        requestID: userRequests[0].id,
        nextRequestID: null,
      };

      mockPrisma.userRequest.findFirst
        .mockResolvedValueOnce(dbUserRequests[0])
        .mockResolvedValueOnce(null);

      const result = userRequestService.findRequestAndNextRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(result).resolves.toEqualRight({
        request: dbUserRequests[0],
        nextRequest: null,
      });
    });
    test('Should resolve left if the request is not found', () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[1].collectionID,
        requestID: 'invalid',
        nextRequestID: null,
      };

      mockPrisma.userRequest.findFirst.mockResolvedValueOnce(null);

      const result = userRequestService.findRequestAndNextRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(result).resolves.toEqualLeft(USER_REQUEST_NOT_FOUND);
    });
    test('Should resolve left if the nextRequest is not found', () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[1].collectionID,
        requestID: userRequests[0].id,
        nextRequestID: 'invalid',
      };

      mockPrisma.userRequest.findFirst
        .mockResolvedValueOnce(dbUserRequests[0])
        .mockResolvedValueOnce(null);

      const result = userRequestService.findRequestAndNextRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(result).resolves.toEqualLeft(USER_REQUEST_NOT_FOUND);
    });
  });

  describe('moveRequest', () => {
    test('Should resolve right and the request', () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[0].collectionID,
        requestID: userRequests[0].id,
        nextRequestID: null,
      };

      jest
        .spyOn(userRequestService, 'findRequestAndNextRequest')
        .mockResolvedValue(
          E.right({ request: dbUserRequests[0], nextRequest: null }),
        );
      jest
        .spyOn(userRequestService, 'reorderRequests')
        .mockResolvedValue(E.right(dbUserRequests[0]));
      jest
        .spyOn(userRequestService, 'validateTypeEqualityForMoveRequest')
        .mockResolvedValue(E.right(true));

      const result = userRequestService.moveRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(result).resolves.toEqualRight(userRequests[0]);
    });
    test('Should resolve right and publish message to pubnub', async () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[0].collectionID,
        requestID: userRequests[0].id,
        nextRequestID: null,
      };

      jest
        .spyOn(userRequestService, 'findRequestAndNextRequest')
        .mockResolvedValue(
          E.right({ request: dbUserRequests[0], nextRequest: null }),
        );
      jest
        .spyOn(userRequestService, 'reorderRequests')
        .mockResolvedValue(E.right(dbUserRequests[0]));
      jest
        .spyOn(userRequestService, 'validateTypeEqualityForMoveRequest')
        .mockResolvedValue(E.right(true));

      await userRequestService.moveRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_request/${dbUserRequests[0].userUid}/moved`,
        { request: userRequests[0], nextRequest: null },
      );
    });
    test('Should resolve left if finding the requests fails', () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[0].collectionID,
        requestID: userRequests[0].id,
        nextRequestID: null,
      };

      jest
        .spyOn(userRequestService, 'findRequestAndNextRequest')
        .mockResolvedValue(E.left(USER_REQUEST_NOT_FOUND));
      jest
        .spyOn(userRequestService, 'validateTypeEqualityForMoveRequest')
        .mockResolvedValue(E.right(true));

      const result = userRequestService.moveRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(result).resolves.toEqualLeft(USER_REQUEST_NOT_FOUND);
    });
    test('Should resolve left if reordering the request fails', async () => {
      const args: MoveUserRequestArgs = {
        sourceCollectionID: userRequests[0].collectionID,
        destinationCollectionID: userRequests[0].collectionID,
        requestID: userRequests[0].id,
        nextRequestID: null,
      };

      jest
        .spyOn(userRequestService, 'findRequestAndNextRequest')
        .mockResolvedValue(
          E.right({
            request: dbUserRequests[0],
            nextRequest: null,
          }),
        );
      jest
        .spyOn(userRequestService, 'reorderRequests')
        .mockResolvedValue(E.left(USER_REQUEST_REORDERING_FAILED));
      jest
        .spyOn(userRequestService, 'validateTypeEqualityForMoveRequest')
        .mockResolvedValue(E.right(true));

      const result = await userRequestService.moveRequest(
        args.sourceCollectionID,
        args.destinationCollectionID,
        args.requestID,
        args.nextRequestID,
        user,
      );

      expect(result).toEqualLeft(USER_REQUEST_REORDERING_FAILED);
    });
  });

  describe('validateTypeEqualityForMoveRequest', () => {
    test('Should resolve right if the types are equal', () => {
      const srcCollID = 'srcCollID';
      const destCollID = 'destCollID';

      mockUserCollectionService.getUserCollection.mockResolvedValueOnce(
        E.right({ type: userRequests[0].type, userUid: user.uid } as any),
      );
      mockUserCollectionService.getUserCollection.mockResolvedValueOnce(
        E.right({ type: userRequests[1].type, userUid: user.uid } as any),
      );

      const result = userRequestService.validateTypeEqualityForMoveRequest(
        srcCollID,
        destCollID,
        userRequests[0],
        userRequests[1],
      );

      expect(result).resolves.toEqualRight(true);
    });
  });
});

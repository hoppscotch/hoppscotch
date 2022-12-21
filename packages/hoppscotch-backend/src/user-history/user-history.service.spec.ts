import { UserHistoryService } from './user-history.service';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { ReqType, UserHistory } from './user-history.model';
import {
  USER_HISTORY_INVALID_REQ_TYPE,
  USER_HISTORY_NOT_FOUND,
} from '../errors';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const userHistoryService = new UserHistoryService(
  mockPrisma,
  mockPubSub as any,
);

enum SubscriptionType {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
}

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('UserHistoryService', () => {
  describe('fetchUserHistory', () => {
    test('Should return a list of users REST history if exists', async () => {
      const executedOn = new Date();
      mockPrisma.userHistory.findMany.mockResolvedValueOnce([
        {
          userUid: 'abc',
          id: '1',
          request: [{}],
          responseMetadata: [{}],
          type: ReqType.REST,
          executedOn: executedOn,
          isStarred: false,
        },
        {
          userUid: 'abc',
          id: '2',
          request: [{}],
          responseMetadata: [{}],
          type: ReqType.REST,
          executedOn: executedOn,
          isStarred: true,
        },
      ]);

      const userHistory: UserHistory[] = [
        {
          userUid: 'abc',
          id: '1',
          request: JSON.stringify([{}]),
          responseMetadata: JSON.stringify([{}]),
          reqType: ReqType.REST,
          executedOn: executedOn,
          isStarred: false,
        },
        {
          userUid: 'abc',
          id: '2',
          request: JSON.stringify([{}]),
          responseMetadata: JSON.stringify([{}]),
          reqType: ReqType.REST,
          executedOn: executedOn,
          isStarred: true,
        },
      ];
      return expect(
        await userHistoryService.fetchUserHistory('abc', ReqType.REST),
      ).toEqual(userHistory);
    });
    test('Should return a list of users GQL history if exists', async () => {
      const executedOn = new Date();
      mockPrisma.userHistory.findMany.mockResolvedValueOnce([
        {
          userUid: 'abc',
          id: '1',
          request: [{}],
          responseMetadata: [{}],
          type: ReqType.GQL,
          executedOn: executedOn,
          isStarred: false,
        },
        {
          userUid: 'abc',
          id: '2',
          request: [{}],
          responseMetadata: [{}],
          type: ReqType.GQL,
          executedOn: executedOn,
          isStarred: true,
        },
      ]);

      const userHistory: UserHistory[] = [
        {
          userUid: 'abc',
          id: '1',
          request: JSON.stringify([{}]),
          responseMetadata: JSON.stringify([{}]),
          reqType: ReqType.GQL,
          executedOn: executedOn,
          isStarred: false,
        },
        {
          userUid: 'abc',
          id: '2',
          request: JSON.stringify([{}]),
          responseMetadata: JSON.stringify([{}]),
          reqType: ReqType.GQL,
          executedOn: executedOn,
          isStarred: true,
        },
      ];
      return expect(
        await userHistoryService.fetchUserHistory('abc', ReqType.GQL),
      ).toEqual(userHistory);
    });
    test('Should return an empty list of users REST history if doesnt exists', async () => {
      mockPrisma.userHistory.findMany.mockResolvedValueOnce([]);

      const userHistory: UserHistory[] = [];
      return expect(
        await userHistoryService.fetchUserHistory('abc', ReqType.REST),
      ).toEqual(userHistory);
    });
    test('Should return an empty list of users GQL history if doesnt exists', async () => {
      mockPrisma.userHistory.findMany.mockResolvedValueOnce([]);

      const userHistory: UserHistory[] = [];
      return expect(
        await userHistoryService.fetchUserHistory('abc', ReqType.GQL),
      ).toEqual(userHistory);
    });
  });
  describe('addRequestToHistory', () => {
    test('Should resolve right and add a REST request to users history, publish a subscription and return a `UserHistory` object', async () => {
      userHistoryService.validateReqType('REST');
      mockPrisma.userHistory.create.mockResolvedValueOnce({
        userUid: 'abc',
        id: '1',
        request: [{}],
        responseMetadata: [{}],
        type: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      });

      const userHistory: UserHistory = <UserHistory>{
        userUid: 'abc',
        id: '1',
        request: JSON.stringify([{}]),
        responseMetadata: JSON.stringify([{}]),
        reqType: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      };

      await userHistoryService.publishUserHistorySubscription(
        userHistory,
        SubscriptionType.Created,
      );

      return expect(
        await userHistoryService.addRequestToHistory(
          'abc',
          JSON.stringify([{}]),
          JSON.stringify([{}]),
          'REST',
        ),
      ).toEqualRight(userHistory);
    });
    test('Should resolve right and add a GQL request to users history, publish a subscription and return a `UserHistory` object', async () => {
      userHistoryService.validateReqType('GQL');
      mockPrisma.userHistory.create.mockResolvedValueOnce({
        userUid: 'abc',
        id: '1',
        request: [{}],
        responseMetadata: [{}],
        type: ReqType.GQL,
        executedOn: new Date(),
        isStarred: false,
      });

      const userHistory: UserHistory = <UserHistory>{
        userUid: 'abc',
        id: '1',
        request: JSON.stringify([{}]),
        responseMetadata: JSON.stringify([{}]),
        reqType: ReqType.GQL,
        executedOn: new Date(),
        isStarred: false,
      };

      await userHistoryService.publishUserHistorySubscription(
        userHistory,
        SubscriptionType.Created,
      );

      return expect(
        await userHistoryService.addRequestToHistory(
          'abc',
          JSON.stringify([{}]),
          JSON.stringify([{}]),
          'GQL',
        ),
      ).toEqualRight(userHistory);
    });
    test('Should resolve left when invalid ReqType is passed', async () => {
      userHistoryService.validateReqType('INVALID');
      return expect(
        await userHistoryService.addRequestToHistory(
          'abc',
          JSON.stringify([{}]),
          JSON.stringify([{}]),
          'INVALID',
        ),
      ).toEqualLeft(USER_HISTORY_INVALID_REQ_TYPE);
    });
  });
  describe('starUnstarRequestInHistory', () => {
    test('Should resolve right and star/unstar a request in the history', async () => {
      mockPrisma.userHistory.findFirst.mockResolvedValueOnce({
        userUid: 'abc',
        id: '1',
        request: [{}],
        responseMetadata: [{}],
        type: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      });

      mockPrisma.userHistory.update.mockResolvedValueOnce({
        userUid: 'abc',
        id: '1',
        request: [{}],
        responseMetadata: [{}],
        type: ReqType.REST,
        executedOn: new Date(),
        isStarred: true,
      });

      const userHistory: UserHistory = <UserHistory>{
        userUid: 'abc',
        id: '1',
        request: JSON.stringify([{}]),
        responseMetadata: JSON.stringify([{}]),
        reqType: ReqType.REST,
        executedOn: new Date(),
        isStarred: true,
      };

      await userHistoryService.publishUserHistorySubscription(
        userHistory,
        SubscriptionType.Updated,
      );

      return expect(
        await userHistoryService.starUnstarRequestInHistory('abc', '1'),
      ).toEqualRight(userHistory);
    });
    test('Should resolve left and error out due to invalid request ID', async () => {
      mockPrisma.userHistory.findFirst.mockResolvedValueOnce(null);

      return expect(
        await userHistoryService.starUnstarRequestInHistory('abc', '1'),
      ).toEqualLeft(USER_HISTORY_NOT_FOUND);
    });
  });
  describe('removeRequestFromHistory', () => {
    test('Should resolve right and delete request from users history, publish a subscription', async () => {
      mockPrisma.userHistory.delete.mockResolvedValueOnce({
        userUid: 'abc',
        id: '1',
        request: [{}],
        responseMetadata: [{}],
        type: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      });

      const userHistory: UserHistory = <UserHistory>{
        userUid: 'abc',
        id: '1',
        request: JSON.stringify([{}]),
        responseMetadata: JSON.stringify([{}]),
        reqType: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      };

      await userHistoryService.publishUserHistorySubscription(
        userHistory,
        SubscriptionType.Deleted,
      );

      return expect(
        await userHistoryService.removeRequestFromHistory('abc', '1'),
      ).toEqualRight(userHistory);
    });
    test('Should resolve left and error out when req id is invalid ', async () => {
      mockPrisma.userHistory.delete.mockResolvedValueOnce(null);

      return expect(
        await userHistoryService.removeRequestFromHistory('abc', '1'),
      ).toEqualLeft(USER_HISTORY_NOT_FOUND);
    });
  });
  describe('deleteAllUserHistory', () => {
    test('Should resolve right and delete all user REST history for a request type', async () => {
      userHistoryService.validateReqType('REST');
      mockPrisma.userHistory.deleteMany.mockResolvedValueOnce({
        count: 2,
      });

      return expect(
        await userHistoryService.deleteAllUserHistory('abc', 'REST'),
      ).toEqualRight(2);
    });
    test('Should resolve right and delete all user GQL history for a request type', async () => {
      userHistoryService.validateReqType('GQL');
      mockPrisma.userHistory.deleteMany.mockResolvedValueOnce({
        count: 2,
      });

      return expect(
        await userHistoryService.deleteAllUserHistory('abc', 'GQL'),
      ).toEqualRight(2);
    });
    test('Should resolve left and error when ReqType is invalid', async () => {
      userHistoryService.validateReqType('INVALID');

      return expect(
        await userHistoryService.deleteAllUserHistory('abc', 'INVALID'),
      ).toEqualLeft(USER_HISTORY_INVALID_REQ_TYPE);
    });
  });
  describe('validateReqType', () => {
    test('Should resolve right when a valid REST ReqType is provided', async () => {
      return expect(userHistoryService.validateReqType('REST')).toEqualRight(
        ReqType.REST,
      );
    });
    test('Should resolve right when a valid GQL ReqType is provided', async () => {
      return expect(userHistoryService.validateReqType('GQL')).toEqualRight(
        ReqType.GQL,
      );
    });
    test('Should resolve left and error out when a invalid ReqType is provided', async () => {
      return expect(userHistoryService.validateReqType('INVALID')).toEqualLeft(
        USER_HISTORY_INVALID_REQ_TYPE,
      );
    });
  });
  describe('publishUserHistorySubscription', () => {
    test('Should publish a created subscription', async () => {
      const result: UserHistory = {
        userUid: 'abc',
        id: '1',
        request: JSON.stringify([{}]),
        responseMetadata: JSON.stringify([{}]),
        reqType: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      };

      await mockPubSub.publish(
        `user_history/${result.userUid}/created`,
        result,
      );

      return expect(
        await userHistoryService.publishUserHistorySubscription(
          result,
          SubscriptionType.Created,
        ),
      ).toBeUndefined();
    });
    test('Should publish a updated subscription', async () => {
      const result: UserHistory = {
        userUid: 'abc',
        id: '1',
        request: JSON.stringify([{}]),
        responseMetadata: JSON.stringify([{}]),
        reqType: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      };

      await mockPubSub.publish(
        `user_history/${result.userUid}/updated`,
        result,
      );

      return expect(
        await userHistoryService.publishUserHistorySubscription(
          result,
          SubscriptionType.Updated,
        ),
      ).toBeUndefined();
    });
    test('Should publish a deleted subscription', async () => {
      const result: UserHistory = {
        userUid: 'abc',
        id: '1',
        request: JSON.stringify([{}]),
        responseMetadata: JSON.stringify([{}]),
        reqType: ReqType.REST,
        executedOn: new Date(),
        isStarred: false,
      };

      await mockPubSub.publish(
        `user_history/${result.userUid}/deleted`,
        result,
      );

      return expect(
        await userHistoryService.publishUserHistorySubscription(
          result,
          SubscriptionType.Deleted,
        ),
      ).toBeUndefined();
    });
  });
});

import { UserEnvironment } from './user-environments.model';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { UserEnvironmentsService } from './user-environments.service';
import {
  USER_ENVIRONMENT_ENV_DOESNT_EXISTS,
  USER_ENVIRONMENT_GLOBAL_ENV_DELETION_FAILED,
  USER_ENVIRONMENT_GLOBAL_ENV_EXISTS,
} from '../errors';
import { PubSubService } from '../pubsub/pubsub.service';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const userEnvironmentsService = new UserEnvironmentsService(
  mockPrisma,
  mockPubSub as any,
);

enum SubscriptionType {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
}

const userPersonalEnvironments = [
  {
    userUiD: 'abc123',
    id: '123',
    name: 'test',
    variables: [{}],
    isGlobal: false,
  },
  {
    userUiD: 'abc123',
    id: '1234',
    name: 'test2',
    variables: [{}],
    isGlobal: false,
  },
];

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('UserEnvironmentsService', () => {
  describe('fetchUserEnvironments', () => {
    test('Should return a list of users personal environments', async () => {
      mockPrisma.userEnvironment.findMany.mockResolvedValueOnce([
        {
          userUid: 'abc123',
          id: '123',
          name: 'test',
          variables: [{}],
          isGlobal: false,
        },
        {
          userUid: 'abc123',
          id: '1234',
          name: 'test2',
          variables: [{}],
          isGlobal: false,
        },
      ]);

      const userEnvironments: UserEnvironment[] = [
        {
          userUid: userPersonalEnvironments[0].userUiD,
          id: userPersonalEnvironments[0].id,
          name: userPersonalEnvironments[0].name,
          variables: JSON.stringify(userPersonalEnvironments[0].variables),
          isGlobal: userPersonalEnvironments[0].isGlobal,
        },
        {
          userUid: userPersonalEnvironments[1].userUiD,
          id: userPersonalEnvironments[1].id,
          name: userPersonalEnvironments[1].name,
          variables: JSON.stringify(userPersonalEnvironments[1].variables),
          isGlobal: userPersonalEnvironments[1].isGlobal,
        },
      ];
      return expect(
        await userEnvironmentsService.fetchUserEnvironments('abc123'),
      ).toEqual(userEnvironments);
    });

    test('Should return an empty list of users personal environments', async () => {
      mockPrisma.userEnvironment.findMany.mockResolvedValueOnce([]);

      return expect(
        await userEnvironmentsService.fetchUserEnvironments('testuser'),
      ).toEqual([]);
    });

    test('Should return an empty list of users personal environments if user uid is invalid', async () => {
      mockPrisma.userEnvironment.findMany.mockResolvedValueOnce([]);

      return expect(
        await userEnvironmentsService.fetchUserEnvironments('invaliduid'),
      ).toEqual([]);
    });
  });

  describe('fetchUserGlobalEnvironment', () => {
    test('Should resolve right and return a Global Environment for the uid', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce({
        id: 'genv1',
        userUid: 'abc',
        name: '',
        variables: [{}],
        isGlobal: true,
      });

      expect(
        await userEnvironmentsService.fetchUserGlobalEnvironment('abc'),
      ).toEqualRight(<UserEnvironment>{
        id: 'genv1',
        userUid: 'abc',
        name: '',
        variables: JSON.stringify([{}]),
        isGlobal: true,
      });
    });

    test('Should resolve left and return an error if global env it doesnt exists', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);

      expect(
        await userEnvironmentsService.fetchUserGlobalEnvironment('abc'),
      ).toEqualLeft(USER_ENVIRONMENT_ENV_DOESNT_EXISTS);
    });
  });

  describe('createUserEnvironment', () => {
    test(
      'Should resolve right and create a users personal environment and return a `UserEnvironment` object ' +
        'and publish a subscription',
      async () => {
        mockPrisma.userEnvironment.create.mockResolvedValueOnce({
          userUid: 'abc123',
          id: '123',
          name: 'test',
          variables: [{}],
          isGlobal: false,
        });

        const result: UserEnvironment = {
          userUid: 'abc123',
          id: '123',
          name: 'test',
          variables: JSON.stringify([{}]),
          isGlobal: false,
        };

        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Created,
        );

        return expect(
          await userEnvironmentsService.createUserEnvironment(
            'abc123',
            'test',
            '[{}]',
            false,
          ),
        ).toEqualRight(result);
      },
    );

    test(
      'Should resolve right and create a new users global environment and return a `UserEnvironment` object ' +
        'and publish a subscription',
      async () => {
        mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);

        mockPrisma.userEnvironment.create.mockResolvedValueOnce({
          userUid: 'abc123',
          id: '123',
          name: 'testgenv',
          variables: [{}],
          isGlobal: true,
        });

        const result: UserEnvironment = {
          userUid: 'abc123',
          id: '123',
          name: 'testgenv',
          variables: JSON.stringify([{}]),
          isGlobal: true,
        };

        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Created,
        );
        return expect(
          await userEnvironmentsService.createUserEnvironment(
            'abc123',
            'test',
            '[{}]',
            true,
          ),
        ).toEqualRight(result);
      },
    );

    test(
      'Should resolve left and not create a new users global environment if existing global env exists ' +
        'and not publish a subscription',
      async () => {
        mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce({
          userUid: 'abc123',
          id: '123',
          name: 'testgenv',
          variables: [{}],
          isGlobal: true,
        });

        return expect(
          await userEnvironmentsService.createUserEnvironment(
            'abc123',
            'test',
            '[{}]',
            true,
          ),
        ).toEqualLeft(USER_ENVIRONMENT_GLOBAL_ENV_EXISTS);
      },
    );
  });

  describe('UpdateUserEnvironment', () => {
    test(
      'should resolve right and update a users personal or environment and return a `UserEnvironment` object ' +
        'and publish a subscription',
      async () => {
        mockPrisma.userEnvironment.update.mockResolvedValueOnce({
          userUid: 'abc123',
          id: '123',
          name: 'test',
          variables: [{}],
          isGlobal: false,
        });

        const result: UserEnvironment = {
          userUid: 'abc123',
          id: '123',
          name: 'test',
          variables: JSON.stringify([{}]),
          isGlobal: false,
        };

        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Updated,
        );
        return expect(
          await userEnvironmentsService.updateUserEnvironment(
            'abc123',
            'test',
            '[{}]',
          ),
        ).toEqualRight(result);
      },
    );

    test(
      'should resolve right and update a users global environment and return a `UserEnvironment` object ' +
        'and publish a subscription',
      async () => {
        mockPrisma.userEnvironment.update.mockResolvedValueOnce({
          userUid: 'abc123',
          id: '123',
          name: '',
          variables: [{}],
          isGlobal: true,
        });

        const result: UserEnvironment = {
          userUid: 'abc123',
          id: '123',
          name: '',
          variables: JSON.stringify([{}]),
          isGlobal: true,
        };

        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Updated,
        );
        return expect(
          await userEnvironmentsService.updateUserEnvironment(
            'abc123',
            '',
            '[{}]',
          ),
        ).toEqualRight(result);
      },
    );

    test(
      'should resolve left and not update a users environment if env doesnt exist ' +
        'and publish a subscription',
      async () => {
        mockPrisma.userEnvironment.update.mockRejectedValueOnce({});

        return expect(
          await userEnvironmentsService.updateUserEnvironment(
            'abc123',
            'test',
            '[{}]',
          ),
        ).toEqualLeft(USER_ENVIRONMENT_ENV_DOESNT_EXISTS);
      },
    );
  });

  describe('deleteUserEnvironment', () => {
    test(
      'Should resolve right and delete a users personal environment and return a `UserEnvironment` object ' +
        'and publish a subscription',
      async () => {
        mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);
        mockPrisma.userEnvironment.delete.mockResolvedValueOnce({
          userUid: 'abc123',
          id: 'env1',
          name: 'en1',
          variables: [{}],
          isGlobal: false,
        });

        const result: UserEnvironment = {
          userUid: 'abc123',
          id: 'env1',
          name: 'en1',
          variables: JSON.stringify([{}]),
          isGlobal: false,
        };

        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Deleted,
        );

        return expect(
          await userEnvironmentsService.deleteUserEnvironment('abc123', 'env1'),
        ).toEqualRight(result);
      },
    );

    test('Should resolve left and return an error when deleting a global user environment ', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce({
        userUid: 'abc123',
        id: 'genv1',
        name: 'en1',
        variables: [{}],
        isGlobal: true,
      });

      return expect(
        await userEnvironmentsService.deleteUserEnvironment('abc123', 'genv1'),
      ).toEqualLeft(USER_ENVIRONMENT_GLOBAL_ENV_DELETION_FAILED);
    });

    test('Should resolve left and return an error when deleting an invalid user environment  ', async () => {
      mockPrisma.userEnvironment.delete.mockResolvedValueOnce(null);

      return expect(
        await userEnvironmentsService.deleteUserEnvironment('abc123', 'env1'),
      ).toEqualLeft(USER_ENVIRONMENT_ENV_DOESNT_EXISTS);
    });
  });

  describe('deleteUserEnvironments', () => {
    test('Should return a count of users personal environment deleted', async () => {
      mockPrisma.userEnvironment.deleteMany.mockResolvedValueOnce({
        count: 1,
      });

      return expect(
        await userEnvironmentsService.deleteUserEnvironments('abc123'),
      ).toEqual(1);
    });
  });

  describe('deleteAllVariablesFromUsersGlobalEnvironment', () => {
    test(
      'Should resolve right and delete all variables inside users global environment and return a `UserEnvironment` object ' +
        'and publish a subscription',
      async () => {
        mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce({
          userUid: 'abc123',
          id: 'env1',
          name: 'en1',
          variables: [{}],
          isGlobal: true,
        });

        mockPrisma.userEnvironment.update.mockResolvedValueOnce({
          userUid: 'abc123',
          id: 'env1',
          name: 'en1',
          variables: [],
          isGlobal: true,
        });

        const result: UserEnvironment = {
          userUid: 'abc123',
          id: 'env1',
          name: 'en1',
          variables: JSON.stringify([]),
          isGlobal: true,
        };

        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Updated,
        );

        return expect(
          await userEnvironmentsService.deleteAllVariablesFromUsersGlobalEnvironment(
            'abc123',
            'env1',
          ),
        ).toEqualRight(result);
      },
    );

    test('Should resolve left and return an error if global environment id and passed id dont match ', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce({
        userUid: 'abc123',
        id: 'genv2',
        name: 'en1',
        variables: [{}],
        isGlobal: true,
      });

      return expect(
        await userEnvironmentsService.deleteUserEnvironment('abc123', 'genv1'),
      ).toEqualLeft(USER_ENVIRONMENT_ENV_DOESNT_EXISTS);
    });
  });

  describe('publishUserEnvironmentSubscription', () => {
    test('Should publish a created subscription', async () => {
      const result: UserEnvironment = {
        userUid: 'abc123',
        id: '123',
        name: '',
        variables: JSON.stringify([{}]),
        isGlobal: true,
      };

      await mockPubSub.publish(
        `user_environment/${result.userUid}/created`,
        result,
      );

      return expect(
        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Created,
        ),
      ).toBeUndefined();
    });

    test('Should publish a updated subscription', async () => {
      const result: UserEnvironment = {
        userUid: 'abc123',
        id: '123',
        name: '',
        variables: JSON.stringify([{}]),
        isGlobal: true,
      };

      await mockPubSub.publish(
        `user_environment/${result.userUid}/updated`,
        result,
      );

      return expect(
        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Updated,
        ),
      ).toBeUndefined();
    });

    test('Should publish a deleted subscription', async () => {
      const result: UserEnvironment = {
        userUid: 'abc123',
        id: '123',
        name: '',
        variables: JSON.stringify([{}]),
        isGlobal: true,
      };

      await mockPubSub.publish(
        `user_environment/${result.userUid}/deleted`,
        result,
      );

      return expect(
        await userEnvironmentsService.publishUserEnvironmentSubscription(
          result,
          SubscriptionType.Deleted,
        ),
      ).toBeUndefined();
    });
  });
});

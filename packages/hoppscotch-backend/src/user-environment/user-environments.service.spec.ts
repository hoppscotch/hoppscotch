import { UserEnvironment } from './user-environments.model';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { UserEnvironmentsService } from './user-environments.service';
import {
  USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS,
  USER_ENVIRONMENT_GLOBAL_ENV_DELETION_FAILED,
  USER_ENVIRONMENT_GLOBAL_ENV_EXISTS,
  USER_ENVIRONMENT_INVALID_ENVIRONMENT_NAME,
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
      ).toEqualLeft(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
    });
  });

  describe('createUserEnvironment', () => {
    test('Should resolve right and create a users personal environment and return a `UserEnvironment` object ', async () => {
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

      return expect(
        await userEnvironmentsService.createUserEnvironment(
          'abc123',
          'test',
          '[{}]',
          false,
        ),
      ).toEqualRight(result);
    });

    test('Should resolve right and create a new users global environment and return a `UserEnvironment` object ', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);

      mockPrisma.userEnvironment.create.mockResolvedValueOnce({
        userUid: 'abc123',
        id: '123',
        name: null,
        variables: [{}],
        isGlobal: true,
      });

      const result: UserEnvironment = {
        userUid: 'abc123',
        id: '123',
        name: null,
        variables: JSON.stringify([{}]),
        isGlobal: true,
      };

      return expect(
        await userEnvironmentsService.createUserEnvironment(
          'abc123',
          null,
          '[{}]',
          true,
        ),
      ).toEqualRight(result);
    });

    test('Should resolve left and not create a new users global environment if existing global env exists ', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce({
        userUid: 'abc123',
        id: '123',
        name: null,
        variables: [{}],
        isGlobal: true,
      });

      return expect(
        await userEnvironmentsService.createUserEnvironment(
          'abc123',
          null,
          '[{}]',
          true,
        ),
      ).toEqualLeft(USER_ENVIRONMENT_GLOBAL_ENV_EXISTS);
    });

    test('Should resolve left when an invalid personal environment name has been passed', async () => {
      return expect(
        await userEnvironmentsService.createUserEnvironment(
          'abc123',
          null,
          '[{}]',
          false,
        ),
      ).toEqualLeft(USER_ENVIRONMENT_INVALID_ENVIRONMENT_NAME);
    });

    test('Should create a users personal environment and publish a created subscription', async () => {
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

      await userEnvironmentsService.createUserEnvironment(
        'abc123',
        'test',
        '[{}]',
        false,
      );

      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_environment/${result.userUid}/created`,
        result,
      );
    });

    test('Should create a users global environment and publish a created subscription', async () => {
      mockPrisma.userEnvironment.create.mockResolvedValueOnce({
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

      await userEnvironmentsService.createUserEnvironment(
        'abc123',
        '',
        '[{}]',
        true,
      );

      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_environment/${result.userUid}/created`,
        result,
      );
    });
  });

  describe('UpdateUserEnvironment', () => {
    test('Should resolve right and update a users personal or environment and return a `UserEnvironment` object ', async () => {
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

      return expect(
        await userEnvironmentsService.updateUserEnvironment(
          'abc123',
          'test',
          '[{}]',
        ),
      ).toEqualRight(result);
    });

    test('Should resolve right and update a users global environment and return a `UserEnvironment` object ', async () => {
      mockPrisma.userEnvironment.update.mockResolvedValueOnce({
        userUid: 'abc123',
        id: '123',
        name: null,
        variables: [{}],
        isGlobal: true,
      });

      const result: UserEnvironment = {
        userUid: 'abc123',
        id: '123',
        name: null,
        variables: JSON.stringify([{}]),
        isGlobal: true,
      };

      return expect(
        await userEnvironmentsService.updateUserEnvironment(
          'abc123',
          null,
          '[{}]',
        ),
      ).toEqualRight(result);
    });

    test('Should resolve left and not update a users environment if env doesnt exist ', async () => {
      mockPrisma.userEnvironment.update.mockRejectedValueOnce(
        'RejectOnNotFound',
      );

      return expect(
        await userEnvironmentsService.updateUserEnvironment(
          'abc123',
          'test',
          '[{}]',
        ),
      ).toEqualLeft(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
    });

    test('Should update a users personal environment and publish an updated subscription ', async () => {
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

      await userEnvironmentsService.updateUserEnvironment(
        'abc123',
        'test',
        '[{}]',
      );

      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_environment/${result.userUid}/updated`,
        result,
      );
    });

    test('Should update a users global environment and publish an updated subscription ', async () => {
      mockPrisma.userEnvironment.update.mockResolvedValueOnce({
        userUid: 'abc123',
        id: '123',
        name: null,
        variables: [{}],
        isGlobal: true,
      });

      const result: UserEnvironment = {
        userUid: 'abc123',
        id: '123',
        name: null,
        variables: JSON.stringify([{}]),
        isGlobal: true,
      };

      await userEnvironmentsService.updateUserEnvironment(
        'abc123',
        null,
        '[{}]',
      );

      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_environment/${result.userUid}/updated`,
        result,
      );
    });
  });

  describe('deleteUserEnvironment', () => {
    test('Should resolve right and delete a users personal environment and return a `UserEnvironment` object ', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);
      mockPrisma.userEnvironment.delete.mockResolvedValueOnce({
        userUid: 'abc123',
        id: 'env1',
        name: 'en1',
        variables: [{}],
        isGlobal: false,
      });

      return expect(
        await userEnvironmentsService.deleteUserEnvironment('abc123', 'env1'),
      ).toEqualRight(true);
    });

    test('Should resolve left and return an error when deleting a global user environment', async () => {
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

    test('Should resolve left and return an error when deleting an invalid user environment', async () => {
      mockPrisma.userEnvironment.delete.mockResolvedValueOnce(null);

      return expect(
        await userEnvironmentsService.deleteUserEnvironment('abc123', 'env1'),
      ).toEqualLeft(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
    });

    test('Should resolve right, delete a users personal environment and publish a deleted subscription', async () => {
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

      await userEnvironmentsService.deleteUserEnvironment('abc123', 'env1');

      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_environment/${result.userUid}/deleted`,
        result,
      );
    });
  });

  describe('deleteUserEnvironments', () => {
    test('Should publish a subscription with a count of deleted environments', async () => {
      mockPrisma.userEnvironment.deleteMany.mockResolvedValueOnce({
        count: 1,
      });

      await userEnvironmentsService.deleteUserEnvironments('abc123');

      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_environment/${'abc123'}/deleted_many`,
        1,
      );
    });
  });

  describe('clearGlobalEnvironments', () => {
    test('Should resolve right and delete all variables inside users global environment and return a `UserEnvironment` object', async () => {
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

      return expect(
        await userEnvironmentsService.clearGlobalEnvironments('abc123', 'env1'),
      ).toEqualRight(result);
    });

    test('Should resolve left and return an error if global environment id and passed id dont match', async () => {
      mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce({
        userUid: 'abc123',
        id: 'genv2',
        name: 'en1',
        variables: [{}],
        isGlobal: true,
      });

      return expect(
        await userEnvironmentsService.deleteUserEnvironment('abc123', 'genv1'),
      ).toEqualLeft(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
    });

    test('Should resolve right,delete all variables inside users global environment and publish an updated subscription', async () => {
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

      await userEnvironmentsService.clearGlobalEnvironments('abc123', 'env1');

      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user_environment/${result.userUid}/updated`,
        result,
      );
    });
  });
});

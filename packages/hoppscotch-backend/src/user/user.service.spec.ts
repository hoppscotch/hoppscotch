import { mockDeep, mockReset } from 'jest-mock-extended';
import { JSON_INVALID } from 'src/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserService } from './user.service';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();

// @ts-ignore
const userService = new UserService(mockPrisma, mockPubSub as any);

const user = {
  uid: '123',
  displayName: 'John Doe',
  email: 'test@hoppscotch.io',
  photoURL: 'https://example.com/avatar.png',
  currentRESTSession: JSON.stringify({}),
  currentGQLSession: JSON.stringify({}),
};

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('UserService', () => {
  describe('updateUserSessions', () => {
    test('Should resolve right and update users GQL session', async () => {
      const sessionData = user.currentGQLSession;
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: JSON.parse(sessionData),
        currentRESTSession: null,
      });

      const result = await userService.updateUserSessions(
        user,
        sessionData,
        'GQL',
      );

      expect(result).toEqualRight({
        ...user,
        currentGQLSession: sessionData,
        currentRESTSession: null,
      });
    });
    test('Should resolve right and update users REST session', async () => {
      const sessionData = user.currentGQLSession;
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: null,
        currentRESTSession: JSON.parse(sessionData),
      });

      const result = await userService.updateUserSessions(
        user,
        sessionData,
        'REST',
      );

      expect(result).toEqualRight({
        ...user,
        currentGQLSession: null,
        currentRESTSession: sessionData,
      });
    });
    test('Should reject left and update user for invalid GQL session', async () => {
      const sessionData = 'invalid json';

      const result = await userService.updateUserSessions(
        user,
        sessionData,
        'GQL',
      );

      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('Should reject left and update user for invalid REST session', async () => {
      const sessionData = 'invalid json';

      const result = await userService.updateUserSessions(
        user,
        sessionData,
        'REST',
      );

      expect(result).toEqualLeft(JSON_INVALID);
    });

    test('Should publish pubsub message on user update sessions', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: JSON.parse(user.currentGQLSession),
        currentRESTSession: JSON.parse(user.currentRESTSession),
      });

      await userService.updateUserSessions(user, user.currentGQLSession, 'GQL');

      expect(mockPubSub.publish).toHaveBeenCalledTimes(1);
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user/${user.uid}/updated`,
        user,
      );
    });
  });
});

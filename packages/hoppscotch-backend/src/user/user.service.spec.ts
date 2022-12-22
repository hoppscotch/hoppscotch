import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
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
  describe('updateUser', () => {
    test('should update user', async () => {
      mockPrisma.user.update.mockResolvedValue(user);

      const result = await userService.updateUser(user, {
        currentGQLSession: user.currentGQLSession,
        currentRESTSession: user.currentRESTSession,
      });

      expect(result).toEqualRight(user);
    });
    test('should publish user update subscription', async () => {
      mockPrisma.user.update.mockResolvedValue(user);

      await userService.updateUser(user, {
        currentGQLSession: user.currentGQLSession,
        currentRESTSession: user.currentRESTSession,
      });

      expect(mockPubSub.publish).toHaveBeenCalledTimes(1);
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `user/${user.uid}/updated`,
        user,
      );
    });
  });
});

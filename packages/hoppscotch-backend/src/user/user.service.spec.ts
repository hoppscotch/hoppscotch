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
  describe('updateUser', () => {
    test('Should resolve and update user both GQL and REST session', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: JSON.parse(user.currentGQLSession),
        currentRESTSession: JSON.parse(user.currentRESTSession),
      });

      const result = await userService.updateUser(user, {
        currentGQLSession: user.currentGQLSession,
        currentRESTSession: user.currentRESTSession,
      });

      expect(result).toEqualRight(user);
    });
    test('Should resolve and update user only with GQL session', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: JSON.parse(user.currentGQLSession),
        currentRESTSession: undefined,
      });

      const result = await userService.updateUser(user, {
        currentGQLSession: user.currentGQLSession,
      });

      expect(result).toEqualRight({ ...user, currentRESTSession: null });
    });
    test('Should reject update user for invalid GQL session', async () => {
      const newGqlSession = null;
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: newGqlSession,
        currentRESTSession: undefined,
      });

      const result = await userService.updateUser(user, {
        currentGQLSession: newGqlSession,
      });

      expect(result).toEqualRight({
        ...user,
        currentGQLSession: newGqlSession,
        currentRESTSession: null,
      });
    });
    test('Should reject update user for invalid GQL session', async () => {
      const newGqlSession = 'invalid json';
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: newGqlSession,
        currentRESTSession: undefined,
      });

      const result = await userService.updateUser(user, {
        currentGQLSession: newGqlSession,
      });

      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('Should publish pubsub message on user update', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        currentGQLSession: JSON.parse(user.currentGQLSession),
        currentRESTSession: JSON.parse(user.currentRESTSession),
      });

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

import { mockDeep, mockReset } from 'jest-mock-extended';
import { MockServerResolver } from './mock-server.resolver';
import { MockServerService } from './mock-server.service';
import { AuthUser } from 'src/types/AuthUser';
import * as E from 'fp-ts/Either';
import { MockServer, UpdateMockServerInput } from './mock-server.model';

const mockMockServerService = mockDeep<MockServerService>();
const resolver = new MockServerResolver(mockMockServerService);

const user: AuthUser = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: '',
  isAdmin: false,
  refreshToken: '',
  lastLoggedOn: new Date(),
  lastActiveOn: new Date(),
  createdOn: new Date(),
  currentGQLSession: {},
  currentRESTSession: {},
};

const mockServer: MockServer = {
  id: 'ms-1',
  name: 'Test Mock Server',
  subreddit: null,
  collectionID: 'coll-1',
  userUid: user.uid,
  teamID: null,
  isActive: true,
  delayInMs: 0,
  createdOn: new Date(),
  updatedOn: new Date(),
  authType: 'INHERIT',
  authConfig: null,
  headers: [],
};

beforeEach(() => {
  mockReset(mockMockServerService);
});

describe('MockServerResolver', () => {
  describe('updateMockServer', () => {
    const input: UpdateMockServerInput = {
      name: 'Updated Name',
      isActive: false,
      delayInMs: 200,
    };

    test('should successfully update mock server and return result', async () => {
      mockMockServerService.updateMockServer.mockResolvedValueOnce(
        E.right(mockServer),
      );

      const result = await resolver.updateMockServer(user, 'ms-1', input);

      expect(mockMockServerService.updateMockServer).toHaveBeenCalledWith(
        'ms-1',
        user.uid,
        input,
      );
      expect(result).toEqual(mockServer);
    });

    test('should throw error when mockServerService returns left', async () => {
      mockMockServerService.updateMockServer.mockResolvedValueOnce(
        E.left('MOCK_SERVER_NOT_FOUND' as any),
      );

      await expect(
        resolver.updateMockServer(user, 'invalid-id', input),
      ).rejects.toThrow('MOCK_SERVER_NOT_FOUND');
    });
  });

  describe('deleteMockServer', () => {
    test('should successfully delete mock server and return true', async () => {
      mockMockServerService.deleteMockServer.mockResolvedValueOnce(
        E.right(true),
      );

      const result = await resolver.deleteMockServer(user, { id: 'ms-1' });

      expect(mockMockServerService.deleteMockServer).toHaveBeenCalledWith(
        'ms-1',
        user.uid,
      );
      expect(result).toBe(true);
    });

    test('should throw error when deleteMockServer returns left', async () => {
      mockMockServerService.deleteMockServer.mockResolvedValueOnce(
        E.left('MOCK_SERVER_NOT_FOUND' as any),
      );

      await expect(
        resolver.deleteMockServer(user, { id: 'invalid-id' }),
      ).rejects.toThrow('MOCK_SERVER_NOT_FOUND');
    });
  });
});

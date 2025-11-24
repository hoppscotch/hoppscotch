import { MockServerService } from './mock-server.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MockServerAnalyticsService } from './mock-server-analytics.service';
import { mockDeep, mockReset } from 'jest-mock-extended';
import * as E from 'fp-ts/Either';
import {
  MOCK_SERVER_NOT_FOUND,
  MOCK_SERVER_INVALID_COLLECTION,
  TEAM_INVALID_ID,
  MOCK_SERVER_LOG_NOT_FOUND,
} from '../errors';
import {
  MockServer as dbMockServer,
  TeamAccessRole,
  MockServerAction,
  UserCollection,
  TeamCollection,
  UserRequest,
} from 'src/generated/prisma/client';
import { WorkspaceType } from '../types/WorkspaceTypes';
import { User } from '../user/user.model';
import {
  CreateMockServerInput,
  UpdateMockServerInput,
} from './mock-server.model';

const mockPrisma = mockDeep<PrismaService>();
const mockAnalyticsService = mockDeep<MockServerAnalyticsService>();
const mockConfigService = mockDeep<ConfigService>();

const mockServerService = new MockServerService(
  mockAnalyticsService,
  mockPrisma,
  mockConfigService,
);

beforeEach(() => {
  mockReset(mockPrisma);
  mockReset(mockAnalyticsService);
  mockReset(mockConfigService);

  // Default config values
  mockConfigService.get.mockImplementation((key: string) => {
    if (key === 'VITE_BACKEND_API_URL') return 'http://localhost:3170/v1';
    if (key === 'INFRA.MOCK_SERVER_WILDCARD_DOMAIN') return '*.mock.hopp.io';
    if (key === 'INFRA.ALLOW_SECURE_COOKIES') return 'false';
    return undefined;
  });
});

const currentTime = new Date();

const user: User = {
  uid: 'user123',
  displayName: 'Test User',
  email: 'test@example.com',
  photoURL: null,
  isAdmin: false,
  currentGQLSession: '{}',
  currentRESTSession: '{}',
  createdOn: currentTime,
  lastLoggedOn: currentTime,
  lastActiveOn: currentTime,
};

const dbMockServer: dbMockServer = {
  id: 'mock123',
  name: 'Test Mock Server',
  subdomain: 'test-subdomain',
  creatorUid: user.uid,
  collectionID: 'coll123',
  workspaceType: WorkspaceType.USER,
  workspaceID: user.uid,
  delayInMs: 0,
  isPublic: true,
  isActive: true,
  hitCount: 0,
  lastHitAt: null,
  createdOn: currentTime,
  updatedOn: currentTime,
  deletedAt: null,
};

const userCollection: UserCollection = {
  id: 'coll123',
  title: 'Test Collection',
  userUid: user.uid,
  parentID: null,
  orderIndex: 1,
  type: 'REST',
  data: {},
  createdOn: currentTime,
  updatedOn: currentTime,
};

const teamCollection: TeamCollection = {
  id: 'team-coll123',
  title: 'Team Collection',
  teamID: 'team123',
  parentID: null,
  orderIndex: 1,
  data: {},
  createdOn: currentTime,
  updatedOn: currentTime,
};

describe('MockServerService', () => {
  describe('getUserMockServers', () => {
    test('should return user mock servers with pagination', async () => {
      mockPrisma.mockServer.findMany.mockResolvedValue([dbMockServer]);

      const result = await mockServerService.getUserMockServers(user.uid, {
        take: 10,
        skip: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(dbMockServer.id);
      expect(result[0].name).toBe(dbMockServer.name);
      expect(mockPrisma.mockServer.findMany).toHaveBeenCalledWith({
        where: {
          workspaceType: WorkspaceType.USER,
          creatorUid: user.uid,
          deletedAt: null,
        },
        orderBy: { createdOn: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    test('should return empty array when no mock servers exist', async () => {
      mockPrisma.mockServer.findMany.mockResolvedValue([]);

      const result = await mockServerService.getUserMockServers(user.uid, {
        take: 10,
        skip: 0,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('getTeamMockServers', () => {
    test('should return team mock servers with pagination', async () => {
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team123',
      };
      mockPrisma.mockServer.findMany.mockResolvedValue([teamMockServer]);

      const result = await mockServerService.getTeamMockServers('team123', {
        take: 10,
        skip: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].workspaceType).toBe(WorkspaceType.TEAM);
      expect(mockPrisma.mockServer.findMany).toHaveBeenCalledWith({
        where: {
          workspaceType: WorkspaceType.TEAM,
          workspaceID: 'team123',
          deletedAt: null,
        },
        orderBy: { createdOn: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('getMockServer', () => {
    test('should return mock server when user has access', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);

      const result = await mockServerService.getMockServer(
        dbMockServer.id,
        user.uid,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).id).toBe(dbMockServer.id);
        expect((result.right as any).name).toBe(dbMockServer.name);
      }
    });

    test('should return error when mock server not found', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(null);

      const result = await mockServerService.getMockServer(
        'invalid-id',
        user.uid,
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });

    test('should return error when user does not have access', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);

      const result = await mockServerService.getMockServer(
        dbMockServer.id,
        'different-user',
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });

    test('should allow team member access to team mock server', async () => {
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team123',
      };
      mockPrisma.mockServer.findFirst.mockResolvedValue(teamMockServer);
      mockPrisma.team.findFirst.mockResolvedValue({
        id: 'team123',
        name: 'Test Team',
      } as any);

      const result = await mockServerService.getMockServer(
        teamMockServer.id,
        user.uid,
      );

      expect(E.isRight(result)).toBe(true);
    });
  });

  describe('getMockServerBySubdomain', () => {
    test('should return active mock server by subdomain', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);

      const result = await mockServerService.getMockServerBySubdomain(
        dbMockServer.subdomain,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).id).toBe(dbMockServer.id);
      }
      expect(mockPrisma.mockServer.findFirst).toHaveBeenCalledWith({
        where: {
          subdomain: { equals: dbMockServer.subdomain, mode: 'insensitive' },
          isActive: true,
          deletedAt: null,
        },
      });
    });

    test('should return error when mock server not found', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(null);

      const result =
        await mockServerService.getMockServerBySubdomain('non-existent');

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });
  });

  describe('getMockServerCreator', () => {
    test('should return mock server creator', async () => {
      mockPrisma.mockServer.findUnique.mockResolvedValue({
        ...dbMockServer,
        user: user as any,
      } as any);

      const result = await mockServerService.getMockServerCreator(
        dbMockServer.id,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).uid).toBe(user.uid);
      }
    });

    test('should return error when mock server not found', async () => {
      mockPrisma.mockServer.findUnique.mockResolvedValue(null);

      const result = await mockServerService.getMockServerCreator('invalid-id');

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });
  });

  describe('getMockServerCollection', () => {
    test('should return user collection for user workspace', async () => {
      mockPrisma.mockServer.findUnique.mockResolvedValue(dbMockServer);
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);

      const result = await mockServerService.getMockServerCollection(
        dbMockServer.id,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).id).toBe(userCollection.id);
        expect((result.right as any).title).toBe(userCollection.title);
      }
    });

    test('should return team collection for team workspace', async () => {
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        collectionID: teamCollection.id,
      };
      mockPrisma.mockServer.findUnique.mockResolvedValue(teamMockServer);
      mockPrisma.teamCollection.findUnique.mockResolvedValue(teamCollection);

      const result = await mockServerService.getMockServerCollection(
        teamMockServer.id,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).id).toBe(teamCollection.id);
        expect((result.right as any).title).toBe(teamCollection.title);
      }
    });

    test('should return null when collection not found', async () => {
      mockPrisma.mockServer.findUnique.mockResolvedValue(dbMockServer);
      mockPrisma.userCollection.findUnique.mockResolvedValue(null);

      const result = await mockServerService.getMockServerCollection(
        dbMockServer.id,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(null);
      }
    });
  });

  describe('createMockServer', () => {
    const createInput: CreateMockServerInput = {
      name: 'New Mock Server',
      collectionID: userCollection.id,
      workspaceType: WorkspaceType.USER,
      workspaceID: undefined,
      delayInMs: 0,
    };

    test('should create user mock server successfully', async () => {
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.mockServer.findUnique.mockResolvedValue(null);
      mockPrisma.mockServer.create.mockResolvedValue(dbMockServer);

      const result = await mockServerService.createMockServer(
        user,
        createInput,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).name).toBe(dbMockServer.name);
      }
      expect(mockAnalyticsService.recordActivity).toHaveBeenCalledWith(
        dbMockServer,
        MockServerAction.CREATED,
        user.uid,
      );
    });

    test('should create team mock server successfully', async () => {
      const teamInput: CreateMockServerInput = {
        name: 'Team Mock Server',
        collectionID: teamCollection.id,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team123',
        delayInMs: 0,
      };
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team123',
      };

      mockPrisma.team.findFirst.mockResolvedValue({ id: 'team123' } as any);
      mockPrisma.teamCollection.findUnique.mockResolvedValue(teamCollection);
      mockPrisma.mockServer.findUnique.mockResolvedValue(null);
      mockPrisma.mockServer.create.mockResolvedValue(teamMockServer);

      const result = await mockServerService.createMockServer(user, teamInput);

      expect(E.isRight(result)).toBe(true);
    });

    test('should return error when collection not found', async () => {
      mockPrisma.userCollection.findUnique.mockResolvedValue(null);

      const result = await mockServerService.createMockServer(
        user,
        createInput,
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_INVALID_COLLECTION);
      }
    });

    test('should return error when team is invalid', async () => {
      const teamInput: CreateMockServerInput = {
        name: 'Team Mock Server',
        collectionID: teamCollection.id,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'invalid-team',
        delayInMs: 0,
      };

      mockPrisma.team.findFirst.mockResolvedValue(null);

      const result = await mockServerService.createMockServer(user, teamInput);

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(TEAM_INVALID_ID);
      }
    });

    test('should retry subdomain generation on conflict', async () => {
      const PrismaError = { UNIQUE_CONSTRAINT_VIOLATION: 'P2002' };
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.mockServer.create
        .mockRejectedValueOnce({
          code: PrismaError.UNIQUE_CONSTRAINT_VIOLATION,
        }) // First attempt conflicts
        .mockResolvedValueOnce(dbMockServer); // Second attempt succeeds

      const result = await mockServerService.createMockServer(
        user,
        createInput,
      );

      expect(E.isRight(result)).toBe(true);
      expect(mockPrisma.mockServer.create).toHaveBeenCalledTimes(2);
    });

    test('should return creation failed error on non-constraint errors', async () => {
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.mockServer.create.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await mockServerService.createMockServer(
        user,
        createInput,
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe('mock_server/creation_failed');
      }
    });
  });

  describe('updateMockServer', () => {
    const updateInput: UpdateMockServerInput = {
      name: 'Updated Name',
      isActive: false,
      delayInMs: 100,
    };

    test('should update mock server successfully', async () => {
      const updatedMockServer = { ...dbMockServer, ...updateInput };
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);
      mockPrisma.mockServer.update.mockResolvedValue(updatedMockServer);

      const result = await mockServerService.updateMockServer(
        dbMockServer.id,
        user.uid,
        updateInput,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).name).toBe(updateInput.name);
      }
      expect(mockPrisma.mockServer.update).toHaveBeenCalledWith({
        where: { id: dbMockServer.id },
        data: updateInput,
      });
    });

    test('should record deactivation analytics', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);
      mockPrisma.mockServer.update.mockResolvedValue({
        ...dbMockServer,
        isActive: false,
      });

      await mockServerService.updateMockServer(dbMockServer.id, user.uid, {
        isActive: false,
      });

      expect(mockAnalyticsService.recordActivity).toHaveBeenCalledWith(
        dbMockServer,
        MockServerAction.DEACTIVATED,
        user.uid,
      );
    });

    test('should record activation analytics', async () => {
      const inactiveMockServer = { ...dbMockServer, isActive: false };
      mockPrisma.mockServer.findFirst.mockResolvedValue(inactiveMockServer);
      mockPrisma.mockServer.update.mockResolvedValue({
        ...inactiveMockServer,
        isActive: true,
      });

      await mockServerService.updateMockServer(dbMockServer.id, user.uid, {
        isActive: true,
      });

      expect(mockAnalyticsService.recordActivity).toHaveBeenCalledWith(
        inactiveMockServer,
        MockServerAction.ACTIVATED,
        user.uid,
      );
    });

    test('should return error when mock server not found', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(null);

      const result = await mockServerService.updateMockServer(
        'invalid-id',
        user.uid,
        updateInput,
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });

    test('should return error when user lacks permission', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);

      const result = await mockServerService.updateMockServer(
        dbMockServer.id,
        'different-user',
        updateInput,
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });
  });

  describe('deleteMockServer', () => {
    test('should soft delete mock server successfully', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);
      mockPrisma.mockServer.update.mockResolvedValue({
        ...dbMockServer,
        isActive: false,
        deletedAt: currentTime,
      });

      const result = await mockServerService.deleteMockServer(
        dbMockServer.id,
        user.uid,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(true);
      }
      expect(mockPrisma.mockServer.update).toHaveBeenCalledWith({
        where: { id: dbMockServer.id },
        data: { isActive: false, deletedAt: expect.any(Date) },
      });
      expect(mockAnalyticsService.recordActivity).toHaveBeenCalledWith(
        dbMockServer,
        MockServerAction.DELETED,
        user.uid,
      );
    });

    test('should return error when mock server not found', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(null);

      const result = await mockServerService.deleteMockServer(
        'invalid-id',
        user.uid,
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });

    test('should return error when user lacks permission', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);

      const result = await mockServerService.deleteMockServer(
        dbMockServer.id,
        'different-user',
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });
  });

  describe('logRequest', () => {
    const logParams = {
      mockServerID: dbMockServer.id,
      requestMethod: 'GET',
      requestPath: '/api/users',
      requestHeaders: { 'content-type': 'application/json' },
      requestBody: { test: 'data' },
      requestQuery: { page: '1' },
      responseStatus: 200,
      responseHeaders: { 'content-type': 'application/json' },
      responseTime: 150,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    };

    test('should log request successfully', async () => {
      mockPrisma.mockServerLog.create.mockResolvedValue({
        id: 'log123',
        ...logParams,
        responseBody: null,
        executedAt: currentTime,
      } as any);

      await mockServerService.logRequest(logParams);

      expect(mockPrisma.mockServerLog.create).toHaveBeenCalledWith({
        data: {
          mockServerID: logParams.mockServerID,
          requestMethod: logParams.requestMethod,
          requestPath: logParams.requestPath,
          requestHeaders: logParams.requestHeaders,
          requestBody: logParams.requestBody,
          requestQuery: logParams.requestQuery,
          responseStatus: logParams.responseStatus,
          responseHeaders: logParams.responseHeaders,
          responseBody: null,
          responseTime: logParams.responseTime,
          ipAddress: logParams.ipAddress,
          userAgent: logParams.userAgent,
        },
      });
    });

    test('should handle logging errors gracefully', async () => {
      mockPrisma.mockServerLog.create.mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(
        mockServerService.logRequest(logParams),
      ).resolves.not.toThrow();
    });
  });

  describe('getMockServerLogs', () => {
    const mockLog = {
      id: 'log123',
      mockServerID: dbMockServer.id,
      requestMethod: 'GET',
      requestPath: '/api/users',
      requestHeaders: { 'content-type': 'application/json' },
      requestBody: null,
      requestQuery: { page: '1' },
      responseStatus: 200,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: null,
      responseTime: 150,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      executedAt: currentTime,
    };

    test('should return logs with pagination', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);
      mockPrisma.mockServerLog.findMany.mockResolvedValue([mockLog] as any);

      const result = await mockServerService.getMockServerLogs(
        dbMockServer.id,
        user.uid,
        { take: 10, skip: 0 },
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right as any).toHaveLength(1);
        expect((result.right as any)[0].requestMethod).toBe('GET');
        expect((result.right as any)[0].requestHeaders).toBe(
          JSON.stringify(mockLog.requestHeaders),
        );
      }
      expect(mockPrisma.mockServerLog.findMany).toHaveBeenCalledWith({
        where: { mockServerID: dbMockServer.id },
        orderBy: { executedAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    test('should return error when mock server not found', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(null);

      const result = await mockServerService.getMockServerLogs(
        'invalid-id',
        user.uid,
        { take: 10, skip: 0 },
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_NOT_FOUND);
      }
    });

    test('should return error when user lacks access', async () => {
      mockPrisma.mockServer.findFirst.mockResolvedValue(dbMockServer);

      const result = await mockServerService.getMockServerLogs(
        dbMockServer.id,
        'different-user',
        { take: 10, skip: 0 },
      );

      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('deleteMockServerLog', () => {
    const mockLog = {
      id: 'log123',
      mockServerID: dbMockServer.id,
      mockServer: dbMockServer,
    };

    test('should delete log successfully', async () => {
      mockPrisma.mockServerLog.findUnique.mockResolvedValue(mockLog as any);
      mockPrisma.mockServerLog.delete.mockResolvedValue(mockLog as any);

      const result = await mockServerService.deleteMockServerLog(
        'log123',
        user.uid,
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(true);
      }
      expect(mockPrisma.mockServerLog.delete).toHaveBeenCalledWith({
        where: { id: 'log123' },
      });
    });

    test('should return error when log not found', async () => {
      mockPrisma.mockServerLog.findUnique.mockResolvedValue(null);

      const result = await mockServerService.deleteMockServerLog(
        'invalid-id',
        user.uid,
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_LOG_NOT_FOUND);
      }
    });

    test('should return error when user lacks permission', async () => {
      mockPrisma.mockServerLog.findUnique.mockResolvedValue(mockLog as any);

      const result = await mockServerService.deleteMockServerLog(
        'log123',
        'different-user',
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe(MOCK_SERVER_LOG_NOT_FOUND);
      }
    });
  });

  describe('incrementHitCount', () => {
    test('should increment hit count and update last hit timestamp', async () => {
      mockPrisma.mockServer.update.mockResolvedValue({
        ...dbMockServer,
        hitCount: 1,
        lastHitAt: currentTime,
      });

      await mockServerService.incrementHitCount(dbMockServer.id);

      expect(mockPrisma.mockServer.update).toHaveBeenCalledWith({
        where: { id: dbMockServer.id },
        data: {
          hitCount: { increment: 1 },
          lastHitAt: expect.any(Date),
        },
      });
    });

    test('should handle errors gracefully', async () => {
      mockPrisma.mockServer.update.mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(
        mockServerService.incrementHitCount(dbMockServer.id),
      ).resolves.not.toThrow();
    });
  });

  describe('handleMockRequest', () => {
    const mockExample = {
      key: 'example1',
      name: 'Success Response',
      method: 'GET',
      endpoint: 'http://api.example.com/users?page=1',
      statusCode: 200,
      statusText: 'OK',
      responseBody: '{"success": true}',
      responseHeaders: [{ key: 'content-type', value: 'application/json' }],
      headers: [],
    };

    const userRequest: UserRequest = {
      id: 'req123',
      collectionID: userCollection.id,
      teamID: null,
      title: 'Get Users',
      request: {},
      mockExamples: {
        examples: [mockExample],
      },
      orderIndex: 1,
      createdOn: currentTime,
      updatedOn: currentTime,
    } as any;

    test('should return example by ID header', async () => {
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userCollection.findMany.mockResolvedValue([]); // No child collections
      mockPrisma.userRequest.findMany.mockResolvedValue([userRequest] as any);

      const result = await mockServerService.handleMockRequest(
        dbMockServer,
        '/users',
        'GET',
        {},
        { 'x-mock-response-id': 'example1' },
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).statusCode).toBe(200);
        expect((result.right as any).body).toBe('{"success": true}');
      }
    });

    test('should return example by name header', async () => {
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userCollection.findMany.mockResolvedValue([]); // No child collections
      mockPrisma.userRequest.findMany.mockResolvedValue([userRequest] as any);

      const result = await mockServerService.handleMockRequest(
        dbMockServer,
        '/users',
        'GET',
        {},
        { 'x-mock-response-name': 'Success Response' },
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).statusCode).toBe(200);
      }
    });

    test('should filter by status code header', async () => {
      const example404 = {
        ...mockExample,
        key: 'example2',
        endpoint: 'http://api.example.com/users', // Same endpoint
        statusCode: 404,
        statusText: 'Not Found',
        responseBody: '{"error": "not found"}',
      };
      const requestWith404 = {
        ...userRequest,
        mockExamples: {
          examples: [mockExample, example404],
        },
      };

      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userCollection.findMany.mockResolvedValue([]); // No child collections
      mockPrisma.userRequest.findMany.mockResolvedValue([
        requestWith404,
      ] as any);

      const result = await mockServerService.handleMockRequest(
        dbMockServer,
        '/users',
        'GET',
        {},
        { 'x-mock-response-code': '404' },
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).statusCode).toBe(404);
        expect((result.right as any).body).toBe('{"error": "not found"}');
      }
    });

    test('should match exact path', async () => {
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userRequest.findMany.mockResolvedValue([userRequest] as any);
      mockPrisma.userCollection.findMany.mockResolvedValue([]);

      const result = await mockServerService.handleMockRequest(
        dbMockServer,
        '/users',
        'GET',
        { page: '1' },
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).statusCode).toBe(200);
      }
    });

    test('should match path with variables', async () => {
      const variableExample = {
        ...mockExample,
        endpoint: 'http://api.example.com/users/<<id>>',
      };
      const variableRequest = {
        ...userRequest,
        mockExamples: {
          examples: [variableExample],
        },
      };

      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userRequest.findMany.mockResolvedValue([
        variableRequest,
      ] as any);
      mockPrisma.userCollection.findMany.mockResolvedValue([]);

      const result = await mockServerService.handleMockRequest(
        dbMockServer,
        '/users/123',
        'GET',
      );

      expect(E.isRight(result)).toBe(true);
    });

    test('should return error when no examples found', async () => {
      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userRequest.findMany.mockResolvedValue([]);
      mockPrisma.userCollection.findMany.mockResolvedValue([]);

      const result = await mockServerService.handleMockRequest(
        dbMockServer,
        '/users',
        'GET',
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toContain('No examples found');
      }
    });

    test('should prefer 200 status when scores are equal', async () => {
      const example200 = { ...mockExample, statusCode: 200 };
      const example404 = { ...mockExample, key: 'example2', statusCode: 404 };
      const multipleExamples = {
        ...userRequest,
        mockExamples: {
          examples: [example404, example200], // 404 first, but 200 should be preferred
        },
      };

      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userRequest.findMany.mockResolvedValue([
        multipleExamples,
      ] as any);
      mockPrisma.userCollection.findMany.mockResolvedValue([]);

      const result = await mockServerService.handleMockRequest(
        dbMockServer,
        '/users',
        'GET',
        { page: '1' },
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).statusCode).toBe(200);
      }
    });

    test('should include delay in response', async () => {
      const delayedMockServer = { ...dbMockServer, delayInMs: 500 };
      const simpleRequest = {
        ...userRequest,
        mockExamples: {
          examples: [
            {
              ...mockExample,
              endpoint: 'http://api.example.com/users', // Remove query params
            },
          ],
        },
      };

      mockPrisma.userCollection.findUnique.mockResolvedValue(userCollection);
      mockPrisma.userCollection.findMany.mockResolvedValue([]); // No child collections
      mockPrisma.userRequest.findMany.mockResolvedValue([simpleRequest] as any);

      const result = await mockServerService.handleMockRequest(
        delayedMockServer,
        '/users',
        'GET',
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect((result.right as any).delay).toBe(500);
      }
    });

    test('should work with team collections', async () => {
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        collectionID: teamCollection.id,
      };
      const teamRequest = {
        ...userRequest,
        collectionID: teamCollection.id,
        mockExamples: {
          examples: [
            {
              ...mockExample,
              endpoint: 'http://api.example.com/users', // Remove query params
            },
          ],
        },
      };

      mockPrisma.teamCollection.findUnique.mockResolvedValue(teamCollection);
      mockPrisma.teamCollection.findMany.mockResolvedValue([]); // No child collections
      mockPrisma.teamRequest.findMany.mockResolvedValue([teamRequest] as any);

      const result = await mockServerService.handleMockRequest(
        teamMockServer,
        '/users',
        'GET',
      );

      expect(E.isRight(result)).toBe(true);
    });
  });

  describe('checkMockServerAccess', () => {
    test('should allow user access to their own mock server', async () => {
      const hasAccess = await mockServerService.checkMockServerAccess(
        dbMockServer,
        user.uid,
      );

      expect(hasAccess).toBe(true);
    });

    test('should deny user access to other users mock server', async () => {
      const hasAccess = await mockServerService.checkMockServerAccess(
        dbMockServer,
        'different-user',
      );

      expect(hasAccess).toBe(false);
    });

    test('should allow team member access to team mock server', async () => {
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team123',
      };

      mockPrisma.team.findFirst.mockResolvedValue({ id: 'team123' } as any);

      const hasAccess = await mockServerService.checkMockServerAccess(
        teamMockServer,
        user.uid,
      );

      expect(hasAccess).toBe(true);
    });

    test('should deny non-member access to team mock server', async () => {
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team123',
      };

      mockPrisma.team.findFirst.mockResolvedValue(null);

      const hasAccess = await mockServerService.checkMockServerAccess(
        teamMockServer,
        user.uid,
      );

      expect(hasAccess).toBe(false);
    });

    test('should respect role restrictions', async () => {
      const teamMockServer = {
        ...dbMockServer,
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team123',
      };

      mockPrisma.team.findFirst.mockResolvedValue(null);

      const hasAccess = await mockServerService.checkMockServerAccess(
        teamMockServer,
        user.uid,
        [TeamAccessRole.OWNER], // Only owners
      );

      expect(hasAccess).toBe(false);
    });
  });
});

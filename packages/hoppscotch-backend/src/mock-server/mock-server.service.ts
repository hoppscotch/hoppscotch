import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateMockServerInput,
  UpdateMockServerInput,
  MockServerResponse,
  MockServer,
  MockServerCollection,
  MockServerLog,
} from './mock-server.model';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import {
  MOCK_SERVER_NOT_FOUND,
  MOCK_SERVER_INVALID_COLLECTION,
  TEAM_INVALID_ID,
  MOCK_SERVER_CREATION_FAILED,
  MOCK_SERVER_UPDATE_FAILED,
  MOCK_SERVER_DELETION_FAILED,
  MOCK_SERVER_LOG_NOT_FOUND,
  MOCK_SERVER_LOG_DELETION_FAILED,
} from 'src/errors';
import { randomBytes } from 'crypto';
import { WorkspaceType } from 'src/types/WorkspaceTypes';
import {
  MockServerAction,
  TeamAccessRole,
  MockServer as dbMockServer,
} from 'src/generated/prisma/client';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import { ConfigService } from '@nestjs/config';
import { MockServerAnalyticsService } from './mock-server-analytics.service';
import { PrismaError } from 'src/prisma/prisma-error-codes';

@Injectable()
export class MockServerService {
  constructor(
    private readonly mockServerAnalyticsService: MockServerAnalyticsService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cast database model to GraphQL model
   */
  private cast(dbMockServer: dbMockServer): MockServer {
    // Generate path based mock server URL
    const backendUrl = this.configService.get<string>('VITE_BACKEND_API_URL');
    const base = backendUrl.substring(0, backendUrl.lastIndexOf('/')); // "http(s)://localhost:3170"
    const serverUrlPathBased = base + '/mock/' + dbMockServer.subdomain;

    // Generate domain based mock server URL
    // MOCK_SERVER_WILDCARD_DOMAIN = '*.mock.hopp.io'
    const wildcardDomain = this.configService.get<string>(
      'INFRA.MOCK_SERVER_WILDCARD_DOMAIN',
    );
    const isSecure =
      this.configService.get<string>('INFRA.ALLOW_SECURE_COOKIES') === 'true';
    const protocol = isSecure ? 'https://' : 'http://';
    const serverUrlDomainBased = wildcardDomain
      ? protocol + dbMockServer.subdomain + wildcardDomain.substring(1)
      : null;

    return {
      id: dbMockServer.id,
      name: dbMockServer.name,
      subdomain: dbMockServer.subdomain,
      serverUrlPathBased,
      serverUrlDomainBased,
      workspaceType: dbMockServer.workspaceType,
      workspaceID: dbMockServer.workspaceID,
      delayInMs: dbMockServer.delayInMs,
      isActive: dbMockServer.isActive,
      isPublic: dbMockServer.isPublic,
      createdOn: dbMockServer.createdOn,
      updatedOn: dbMockServer.updatedOn,
    } as MockServer;
  }

  /**
   * Get mock servers for a user
   */
  async getUserMockServers(userUid: string, args: OffsetPaginationArgs) {
    const mockServers = await this.prisma.mockServer.findMany({
      where: {
        workspaceType: WorkspaceType.USER,
        creatorUid: userUid,
        deletedAt: null,
      },
      orderBy: { createdOn: 'desc' },
      take: args?.take,
      skip: args?.skip,
    });

    return mockServers.map((ms) => this.cast(ms));
  }

  /**
   * Get mock servers for a team
   */
  async getTeamMockServers(teamID: string, args: OffsetPaginationArgs) {
    const mockServers = await this.prisma.mockServer.findMany({
      where: {
        workspaceType: WorkspaceType.TEAM,
        workspaceID: teamID,
        deletedAt: null,
      },
      orderBy: { createdOn: 'desc' },
      take: args?.take,
      skip: args?.skip,
    });

    return mockServers.map((ms) => this.cast(ms));
  }

  /**
   * Check if user has access to a team with specific roles
   */
  private async checkTeamAccess(
    teamId: string,
    userUid: string,
    requiredRoles: TeamAccessRole[],
  ): Promise<boolean> {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        members: {
          some: {
            userUid,
            role: { in: requiredRoles },
          },
        },
      },
    });
    return !!team;
  }

  /**
   * Check if user has access to a mock server with specific roles
   */
  async checkMockServerAccess(
    mockServer: dbMockServer,
    userUid: string,
    requiredRoles: TeamAccessRole[] = [
      TeamAccessRole.OWNER,
      TeamAccessRole.EDITOR,
      TeamAccessRole.VIEWER,
    ],
  ): Promise<boolean> {
    if (mockServer.workspaceType === WorkspaceType.USER) {
      return mockServer.creatorUid === userUid;
    } else if (mockServer.workspaceType === WorkspaceType.TEAM) {
      return this.checkTeamAccess(
        mockServer.workspaceID,
        userUid,
        requiredRoles,
      );
    }
    return false;
  }

  /**
   * Get a specific mock server by ID
   */
  async getMockServer(id: string, userUid: string) {
    const mockServer = await this.prisma.mockServer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

    // Check access permissions
    const hasAccess = await this.checkMockServerAccess(mockServer, userUid);
    if (!hasAccess) return E.left(MOCK_SERVER_NOT_FOUND);

    return E.right(this.cast(mockServer));
  }

  /**
   * Get a mock server by subdomain (for incoming mock requests)
   * Returns database model with collectionID for internal use
   * @param subdomain - The subdomain of the mock server
   * @param includeInactive - If true, returns mock server regardless of active status (default: false)
   */
  async getMockServerBySubdomain(subdomain: string, includeInactive = false) {
    const mockServer = await this.prisma.mockServer.findFirst({
      where: {
        subdomain: { equals: subdomain, mode: 'insensitive' },
        ...(includeInactive ? {} : { isActive: true }),
        deletedAt: null,
      },
    });
    if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

    // Return database model directly (includes collectionID)
    return E.right(mockServer);
  }

  /**
   * (Field resolver)
   * Get the creator of a mock server
   */
  async getMockServerCreator(mockServerId: string) {
    const mockServer = await this.prisma.mockServer.findUnique({
      where: { id: mockServerId, deletedAt: null },
      include: { user: true },
    });
    if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);
    return E.right(mockServer.user);
  }

  /**
   * (Field resolver)
   * Get the collection of a mock server
   */
  async getMockServerCollection(mockServerId: string) {
    const mockServer = await this.prisma.mockServer.findUnique({
      where: { id: mockServerId, deletedAt: null },
    });
    if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

    if (mockServer.workspaceType === WorkspaceType.USER) {
      const collection = await this.prisma.userCollection.findUnique({
        where: { id: mockServer.collectionID },
      });
      if (!collection) return E.right(null);
      return E.right({
        id: collection.id,
        title: collection.title,
      } as MockServerCollection);
    } else if (mockServer.workspaceType === WorkspaceType.TEAM) {
      const collection = await this.prisma.teamCollection.findUnique({
        where: { id: mockServer.collectionID },
      });
      if (!collection) return E.right(null);
      return E.right({
        id: collection.id,
        title: collection.title,
      } as MockServerCollection);
    }

    return E.left(MOCK_SERVER_INVALID_COLLECTION);
  }

  /**
   * Generate a unique subdomain for the mock server
   */
  private generateMockServerSubdomain(): string {
    const id = randomBytes(10).toString('base64url').substring(0, 13);
    return `${id}`;
  }

  /**
   * Validate workspace access permission and existence
   */
  private async validateWorkspace(user: User, input: CreateMockServerInput) {
    if (input.workspaceType === WorkspaceType.TEAM) {
      if (!input.workspaceID) return E.left(TEAM_INVALID_ID);

      const hasAccess = await this.checkTeamAccess(
        input.workspaceID,
        user.uid,
        [TeamAccessRole.OWNER, TeamAccessRole.EDITOR],
      );

      if (!hasAccess) return E.left(TEAM_INVALID_ID);
    }

    return E.right(true);
  }

  /**
   * Validate collection exists and user has access
   */
  private async validateCollection(user: User, input: CreateMockServerInput) {
    if (input.workspaceType === WorkspaceType.TEAM) {
      const collection = await this.prisma.teamCollection.findUnique({
        where: { id: input.collectionID, teamID: input.workspaceID },
      });
      return collection
        ? E.right(collection)
        : E.left(MOCK_SERVER_INVALID_COLLECTION);
    } else if (input.workspaceType === WorkspaceType.USER) {
      const collection = await this.prisma.userCollection.findUnique({
        where: { id: input.collectionID, userUid: user.uid },
      });
      return collection
        ? E.right(collection)
        : E.left(MOCK_SERVER_INVALID_COLLECTION);
    }

    return E.left(MOCK_SERVER_INVALID_COLLECTION);
  }

  /**
   * Create a new mock server
   */
  async createMockServer(
    user: User,
    input: CreateMockServerInput,
  ): Promise<E.Either<string, MockServer>> {
    try {
      // Validate workspace type and ID
      const workspaceValidation = await this.validateWorkspace(user, input);
      if (E.isLeft(workspaceValidation)) {
        return E.left(workspaceValidation.left);
      }

      // Validate collection exists and user has access
      const collectionValidation = await this.validateCollection(user, input);
      if (E.isLeft(collectionValidation)) {
        return E.left(collectionValidation.left);
      }

      // Create mock server
      const subdomain: string = this.generateMockServerSubdomain();
      const mockServer = await this.prisma.mockServer.create({
        data: {
          name: input.name,
          subdomain,
          creatorUid: user.uid,
          collectionID: input.collectionID,
          workspaceType: input.workspaceType,
          workspaceID:
            input.workspaceType === WorkspaceType.TEAM
              ? input.workspaceID
              : user.uid,
          delayInMs: input.delayInMs,
        },
      });
      this.mockServerAnalyticsService.recordActivity(
        mockServer,
        MockServerAction.CREATED,
        user.uid,
      );

      return E.right(this.cast(mockServer));
    } catch (error) {
      if (error.code === PrismaError.UNIQUE_CONSTRAINT_VIOLATION) {
        return this.createMockServer(user, input); // Retry on subdomain conflict
      }
      console.error('Error creating mock server:', error);
      return E.left(MOCK_SERVER_CREATION_FAILED);
    }
  }

  /**
   * Update a mock server
   */
  async updateMockServer(
    id: string,
    userUid: string,
    input: UpdateMockServerInput,
  ) {
    try {
      const mockServer = await this.prisma.mockServer.findFirst({
        where: { id, deletedAt: null },
      });
      if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

      // Check access permissions (only OWNER and EDITOR can update)
      const hasAccess = await this.checkMockServerAccess(mockServer, userUid, [
        TeamAccessRole.OWNER,
        TeamAccessRole.EDITOR,
      ]);
      if (!hasAccess) return E.left(MOCK_SERVER_NOT_FOUND);

      // Update the mock server
      const updated = await this.prisma.mockServer.update({
        where: { id },
        data: input,
      });
      if (input.isActive !== undefined) {
        this.mockServerAnalyticsService.recordActivity(
          mockServer, // use pre-update state to determine action
          input.isActive
            ? MockServerAction.ACTIVATED
            : MockServerAction.DEACTIVATED,
          userUid,
        );
      }

      return E.right(this.cast(updated));
    } catch (error) {
      console.error('Error updating mock server:', error);
      return E.left(MOCK_SERVER_UPDATE_FAILED);
    }
  }

  /**
   * Delete a mock server
   */
  async deleteMockServer(id: string, userUid: string) {
    try {
      const mockServer = await this.prisma.mockServer.findFirst({
        where: { id, deletedAt: null },
      });
      if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

      // Check access permissions (only OWNER and EDITOR can delete)
      const hasAccess = await this.checkMockServerAccess(mockServer, userUid, [
        TeamAccessRole.OWNER,
        TeamAccessRole.EDITOR,
      ]);
      if (!hasAccess) return E.left(MOCK_SERVER_NOT_FOUND);

      // Soft delete the mock server
      await this.prisma.mockServer.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
      this.mockServerAnalyticsService.recordActivity(
        mockServer, // use pre-update state to determine action
        MockServerAction.DELETED,
        userUid,
      );

      return E.right(true);
    } catch (error) {
      console.error('Error deleting mock server:', error);
      return E.left(MOCK_SERVER_DELETION_FAILED);
    }
  }

  /**
   * Log a mock server request and response
   */
  async logRequest(params: {
    mockServerID: string;
    requestMethod: string;
    requestPath: string;
    requestHeaders: Record<string, string>;
    requestBody?: any;
    requestQuery?: Record<string, string>;
    responseStatus: number;
    responseHeaders: Record<string, string>;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.prisma.mockServerLog.create({
        data: {
          mockServerID: params.mockServerID,
          requestMethod: params.requestMethod,
          requestPath: params.requestPath,
          requestHeaders: params.requestHeaders,
          requestBody: params.requestBody || null,
          requestQuery: params.requestQuery || null,
          responseStatus: params.responseStatus,
          responseHeaders: params.responseHeaders,
          responseBody: null, // We'll capture response body separately if needed
          responseTime: params.responseTime,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error('Error logging request:', error);
      // Don't throw error - analytics shouldn't break the main flow
    }
  }

  /**
   * Get logs for a mock server with pagination
   * Logs are sorted by execution time in descending order (most recent first)
   */
  async getMockServerLogs(
    mockServerId: string,
    userUid: string,
    args: OffsetPaginationArgs,
  ) {
    try {
      // First, get the mock server and verify it exists
      const mockServer = await this.prisma.mockServer.findFirst({
        where: { id: mockServerId, deletedAt: null },
      });

      if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

      // Check access permissions - user must have access to the mock server
      const hasAccess = await this.checkMockServerAccess(mockServer, userUid, [
        TeamAccessRole.OWNER,
        TeamAccessRole.EDITOR,
        TeamAccessRole.VIEWER,
      ]);
      if (!hasAccess) return E.left(MOCK_SERVER_NOT_FOUND);

      // Fetch logs with pagination, sorted by executedAt descending
      const logs = await this.prisma.mockServerLog.findMany({
        where: { mockServerID: mockServerId },
        orderBy: { executedAt: 'desc' },
        take: args?.take,
        skip: args?.skip,
      });

      // Convert JSON fields to strings for GraphQL
      const formattedLogs = logs.map(
        (log) =>
          ({
            id: log.id,
            mockServerID: log.mockServerID,
            requestMethod: log.requestMethod,
            requestPath: log.requestPath,
            requestHeaders: JSON.stringify(log.requestHeaders),
            requestBody: log.requestBody
              ? JSON.stringify(log.requestBody)
              : null,
            requestQuery: log.requestQuery
              ? JSON.stringify(log.requestQuery)
              : null,
            responseStatus: log.responseStatus,
            responseHeaders: JSON.stringify(log.responseHeaders),
            responseBody: log.responseBody
              ? JSON.stringify(log.responseBody)
              : null,
            responseTime: log.responseTime,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            executedAt: log.executedAt,
          }) as MockServerLog,
      );

      return E.right(formattedLogs);
    } catch (error) {
      console.error('Error fetching mock server logs:', error);
      return E.left(MOCK_SERVER_NOT_FOUND);
    }
  }

  /**
   * Delete a mock server log by logId
   */
  async deleteMockServerLog(logId: string, userUid: string) {
    try {
      // First, find the log and verify it exists
      const log = await this.prisma.mockServerLog.findUnique({
        where: { id: logId },
        include: { mockServer: true },
      });

      if (!log) return E.left(MOCK_SERVER_LOG_NOT_FOUND);

      // Check access permissions - user must have access to the mock server
      const hasAccess = await this.checkMockServerAccess(
        log.mockServer,
        userUid,
        [TeamAccessRole.OWNER, TeamAccessRole.EDITOR],
      );
      if (!hasAccess) return E.left(MOCK_SERVER_LOG_NOT_FOUND);

      // Delete the log
      await this.prisma.mockServerLog.delete({
        where: { id: logId },
      });

      return E.right(true);
    } catch (error) {
      console.error('Error deleting mock server log:', error);
      return E.left(MOCK_SERVER_LOG_DELETION_FAILED);
    }
  }

  /**
   * Increment hit count and update last hit timestamp for a mock server
   */
  async incrementHitCount(mockServerID: string): Promise<void> {
    try {
      await this.prisma.mockServer.update({
        where: { id: mockServerID },
        data: {
          hitCount: { increment: 1 },
          lastHitAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error incrementing hit count:', error);
      // Don't throw error - analytics shouldn't break the main flow
    }
  }

  /**
   * Handle mock request - find matching request in collection and return response
   * Optimized implementation with database-level filtering:
   * 1. Fetch collection IDs once (used for all subsequent queries)
   * 2. Check custom headers first (fastest path)
   * 3. Fetch only relevant requests from DB (filtered by collection)
   * 4. Filter and score examples in-memory
   * 5. Return highest scoring example
   */
  async handleMockRequest(
    mockServer: dbMockServer,
    path: string,
    method: string,
    queryParams?: Record<string, string>,
    requestHeaders?: Record<string, string>,
  ): Promise<E.Either<string, MockServerResponse>> {
    try {
      // OPTIMIZATION: Fetch collection IDs once (recursive DB query)
      // This is used by both custom header lookup and candidate fetching
      const collectionIds = await this.getCollectionIds(mockServer);

      if (collectionIds.length === 0) {
        return E.left(
          `The collection associated with this mock has been deleted.`,
        );
      }

      // OPTIMIZATION: Fetch all requests with examples once (single DB query)
      // This is shared between custom header lookup and candidate matching
      const requests = await this.fetchRequestsWithExamples(
        mockServer,
        collectionIds,
      );

      // OPTIMIZATION: Check for custom headers first (fastest path)
      // If user specified exact example, return it immediately without scoring
      if (requestHeaders) {
        const mockResponseId = requestHeaders['x-mock-response-id'];
        const mockResponseName = requestHeaders['x-mock-response-name'];

        if (mockResponseId || mockResponseName) {
          const exactMatch = this.findExampleByIdOrName(
            requests,
            mockResponseId,
            mockResponseName,
            method,
          );
          if (exactMatch) {
            return this.formatExampleResponse(exactMatch, mockServer.delayInMs);
          }
        }
      }

      // OPTIMIZATION: Fetch only requests with mockExamples (database-level filter)
      // This is much faster than loading all requests and filtering in memory
      const candidateExamples = this.fetchCandidateExamples(
        requests,
        method,
        path,
      );

      if (candidateExamples.length === 0) {
        return E.left(`No examples found for ${method.toUpperCase()} ${path}`);
      }

      // OPTIMIZATION: Filter by status code if header provided
      let filteredExamples = candidateExamples;
      if (requestHeaders?.['x-mock-response-code']) {
        const statusCode = parseInt(requestHeaders['x-mock-response-code'], 10);
        const codeFiltered = candidateExamples.filter(
          (ex) => ex.statusCode === statusCode,
        );
        if (codeFiltered.length > 0) {
          filteredExamples = codeFiltered;
        }
      }

      // OPTIMIZATION: Score examples based on URL and query parameter matching
      const scoredExamples = filteredExamples
        .map((example) => ({
          example,
          score: this.calculateMatchScore(example, path, queryParams || {}),
        }))
        .filter((scored) => scored.score > 0) // Remove non-matching examples
        .sort((a, b) => b.score - a.score); // Sort by score descending

      if (scoredExamples.length === 0) {
        return E.left(
          `No matching examples found for ${method.toUpperCase()} ${path}`,
        );
      }

      // Step 6: Return highest scoring example
      // If multiple examples have same high score, prefer 200 status code
      const highestScore = scoredExamples[0].score;
      const topExamples = scoredExamples.filter(
        (scored) => scored.score === highestScore,
      );

      const selectedExample =
        topExamples.find((scored) => scored.example.statusCode === 200) ||
        topExamples[0];

      return this.formatExampleResponse(
        selectedExample.example,
        mockServer.delayInMs,
      );
    } catch (error) {
      console.error('Error handling mock request:', error);
      return E.left('Failed to handle mock request');
    }
  }

  /**
   * Fetch all requests with mock examples from the database
   * Shared helper to avoid code duplication
   */
  private async fetchRequestsWithExamples(
    mockServer: dbMockServer,
    collectionIds: string[],
  ) {
    return mockServer.workspaceType === WorkspaceType.USER
      ? await this.prisma.userRequest.findMany({
          where: {
            collectionID: { in: collectionIds },
            mockExamples: { not: null },
          },
          select: {
            id: true,
            mockExamples: true,
          },
        })
      : await this.prisma.teamRequest.findMany({
          where: {
            collectionID: { in: collectionIds },
            mockExamples: { not: null },
          },
          select: {
            id: true,
            mockExamples: true,
          },
        });
  }

  /**
   * OPTIMIZED: Find example by ID or name from already-fetched requests
   * This avoids loading all examples when user specifies exact match
   */
  private findExampleByIdOrName(
    requests: Array<{ id: string; mockExamples: any }>,
    exampleId?: string,
    exampleName?: string,
    method?: string,
  ) {
    // Search through examples
    for (const request of requests) {
      const mockExamples = request.mockExamples as any;
      if (mockExamples?.examples && Array.isArray(mockExamples.examples)) {
        for (const exampleData of mockExamples.examples) {
          // Check if method matches (if specified)
          if (
            method &&
            exampleData.method?.toUpperCase() !== method.toUpperCase()
          ) {
            continue;
          }

          const parsedExample = this.parseExample(exampleData, request.id);
          if (!parsedExample) continue;

          // Check for ID match
          if (exampleId && parsedExample.id === exampleId) {
            return parsedExample;
          }

          // Check for name match
          if (exampleName && parsedExample.name === exampleName) {
            return parsedExample;
          }
        }
      }
    }

    return null;
  }

  /**
   * OPTIMIZED: Fetch only candidate examples that could match the request
   * Uses in-memory filtering from already-fetched requests
   */
  private fetchCandidateExamples(
    requests: Array<{ id: string; mockExamples: any }>,
    method: string,
    path: string,
  ) {
    interface Example {
      id: string;
      name: string;
      method: string;
      endpoint: string;
      path: string;
      queryParams: Record<string, string>;
      statusCode: number;
      statusText: string;
      responseBody: string;
      responseHeaders: Array<{ key: string; value: string }>;
      requestHeaders?: Array<{ key: string; value: string }>;
    }

    const examples: Example[] = [];

    // Parse and filter examples
    for (const request of requests) {
      const mockExamples = request.mockExamples as any;
      if (mockExamples?.examples && Array.isArray(mockExamples.examples)) {
        for (const exampleData of mockExamples.examples) {
          // OPTIMIZATION: Filter by method immediately
          if (exampleData.method?.toUpperCase() !== method.toUpperCase()) {
            continue;
          }

          const parsedExample = this.parseExample(exampleData, request.id);
          if (!parsedExample) continue;

          // OPTIMIZATION: Quick path match check before adding to candidates
          // This reduces the number of examples we need to score
          if (this.couldPathMatch(parsedExample.path, path)) {
            examples.push(parsedExample);
          }
        }
      }
    }

    return examples;
  }

  /**
   * OPTIMIZED: Quick check if paths could potentially match
   * Returns true if we should include this example for scoring
   */
  private couldPathMatch(examplePath: string, requestPath: string): boolean {
    // Exact match
    if (examplePath === requestPath) return true;

    // Check if path structure could match (same number of segments)
    const exampleParts = examplePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);

    if (exampleParts.length !== requestParts.length) {
      return false; // Different structure, can't match
    }

    // Quick check: if example has variables (Hoppscotch uses <<variable>> syntax), it could match
    if (examplePath.includes('<<')) {
      return true; // Has variables, needs full scoring
    }

    // No variables and not exact match = no match
    return false;
  }

  /**
   * Get collection IDs for the mock server (no caching)
   */
  private async getCollectionIds(mockServer: dbMockServer): Promise<string[]> {
    return mockServer.workspaceType === WorkspaceType.USER
      ? await this.getAllUserCollectionIds(mockServer.collectionID)
      : await this.getAllTeamCollectionIds(mockServer.collectionID);
  }

  /**
   * Get all collection IDs including children (recursive)
   */
  private async getAllUserCollectionIds(
    rootCollectionId: string,
  ): Promise<string[]> {
    // First verify the root collection exists
    const rootCollection = await this.prisma.userCollection.findUnique({
      where: { id: rootCollectionId },
    });

    if (!rootCollection) return []; // Collection doesn't exist

    const ids = [rootCollectionId];
    const children = await this.prisma.userCollection.findMany({
      where: { parentID: rootCollectionId },
      select: { id: true },
    });

    for (const child of children) {
      const childIds = await this.getAllUserCollectionIds(child.id);
      ids.push(...childIds);
    }

    return ids;
  }

  /**
   * Get all team collection IDs including children (recursive)
   */
  private async getAllTeamCollectionIds(
    rootCollectionId: string,
  ): Promise<string[]> {
    // First verify the root collection exists
    const rootCollection = await this.prisma.teamCollection.findUnique({
      where: { id: rootCollectionId },
    });

    if (!rootCollection) return []; // Collection doesn't exist

    const ids = [rootCollectionId];
    const children = await this.prisma.teamCollection.findMany({
      where: { parentID: rootCollectionId },
      select: { id: true },
    });

    for (const child of children) {
      const childIds = await this.getAllTeamCollectionIds(child.id);
      ids.push(...childIds);
    }

    return ids;
  }

  /**
   * Parse example from database format to internal format
   */
  private parseExample(exampleData: any, requestId: string) {
    try {
      // Parse endpoint to extract path and query parameters
      let path = '/';
      const queryParams: Record<string, string> = {};

      if (exampleData.endpoint) {
        const url = new URL(
          exampleData.endpoint,
          'http://dummy.com', // Base URL for parsing
        );
        // Decode the pathname to preserve Hoppscotch variable syntax (<<variable>>)
        path = decodeURIComponent(url.pathname);

        // Extract query parameters
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
      }

      return {
        id: exampleData.key || `${requestId}-${exampleData.name}`,
        name: exampleData.name,
        method: exampleData.method || 'GET',
        endpoint: exampleData.endpoint,
        path,
        queryParams,
        statusCode: exampleData.statusCode || 200,
        statusText: exampleData.statusText || 'OK',
        responseBody: exampleData.responseBody || '',
        responseHeaders: exampleData.responseHeaders || [],
        requestHeaders: exampleData.headers || [],
      };
    } catch (error) {
      console.error('Error parsing example:', error);
      return null;
    }
  }

  /**
   * Calculate match score for an example based on Postman's algorithm
   * Starting score: 100
   * URL path match: exact match keeps 100, no match = 0
   * Query parameters: percentage based on matches
   */
  private calculateMatchScore(
    example: any,
    requestPath: string,
    requestQueryParams: Record<string, string>,
  ): number {
    let score = 100;

    // URL Path matching
    if (example.path !== requestPath) {
      // Try wildcard matching (basic implementation)
      const examplePathParts = example.path.split('/').filter(Boolean);
      const requestPathParts = requestPath.split('/').filter(Boolean);

      if (examplePathParts.length !== requestPathParts.length) {
        return 0; // Path structure doesn't match
      }

      // Check each segment
      let pathMatches = true;
      for (let i = 0; i < examplePathParts.length; i++) {
        const examplePart = examplePathParts[i];
        const requestPart = requestPathParts[i];

        // Check if it's a variable (Hoppscotch uses <<variable>> syntax)
        if (
          examplePart === requestPart ||
          examplePart.startsWith('<<') ||
          examplePart.includes('<<')
        ) {
          continue; // Match
        } else {
          pathMatches = false;
          break;
        }
      }

      if (!pathMatches) {
        return 0; // No path match
      }

      // Path has variables, reduce score slightly
      score -= 5;
    }

    // Query parameter matching
    const exampleParams = example.queryParams || {};
    const exampleParamKeys = Object.keys(exampleParams);
    const requestParamKeys = Object.keys(requestQueryParams);

    if (exampleParamKeys.length > 0 || requestParamKeys.length > 0) {
      let paramMatches = 0;
      let partialMatches = 0;
      let missingParams = 0;

      // Check for matches
      exampleParamKeys.forEach((key) => {
        if (requestQueryParams[key] !== undefined) {
          if (requestQueryParams[key] === exampleParams[key]) {
            paramMatches++;
          } else {
            partialMatches++;
          }
        } else {
          missingParams++;
        }
      });

      // Check for extra params in request
      requestParamKeys.forEach((key) => {
        if (exampleParams[key] === undefined) {
          missingParams++;
        }
      });

      // Calculate parameter matching percentage
      const totalParams = paramMatches + partialMatches + missingParams;
      if (totalParams > 0) {
        const matchPercentage = (paramMatches / totalParams) * 100;
        // Adjust score based on parameter matching
        score = score * (matchPercentage / 100);
      }
    }

    return score;
  }

  /**
   * Format example response for return
   */
  private formatExampleResponse(
    example: any,
    delayInMs: number,
  ): E.Either<string, MockServerResponse> {
    // Convert response headers array to object
    const headersObj: Record<string, string> = {};
    if (example.responseHeaders && Array.isArray(example.responseHeaders)) {
      example.responseHeaders.forEach((header: any) => {
        if (header.key && header.value) {
          headersObj[header.key] = header.value;
        }
      });
    }

    return E.right({
      statusCode: example.statusCode || 200,
      body: example.responseBody || '',
      headers: JSON.stringify(headersObj),
      delay: delayInMs || 0,
    });
  }
}

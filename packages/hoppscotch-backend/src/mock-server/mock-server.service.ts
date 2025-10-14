import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import {
  CreateMockServerInput,
  UpdateMockServerInput,
  MockServerResponse,
  MockServer,
  MockServerCollection,
} from './mock-server.model';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import {
  MOCK_SERVER_NOT_FOUND,
  MOCK_SERVER_SUBDOMAIN_CONFLICT,
  MOCK_SERVER_INVALID_COLLECTION,
  TEAM_INVALID_ID,
  MOCK_SERVER_CREATION_FAILED,
  MOCK_SERVER_UPDATE_FAILED,
  MOCK_SERVER_DELETION_FAILED,
} from 'src/errors';
import { randomBytes } from 'crypto';
import { WorkspaceType } from 'src/types/WorkspaceTypes';
import { TeamAccessRole, MockServer as dbMockServer } from '@prisma/client';
import { OffsetPaginationArgs } from 'src/types/input-types.args';

@Injectable()
export class MockServerService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Cast database model to GraphQL model
   */
  private cast(dbMockServer: dbMockServer): MockServer {
    return {
      id: dbMockServer.id,
      name: dbMockServer.name,
      subdomain: dbMockServer.subdomain,
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
   * Get a specific mock server by ID
   */
  async getMockServer(id: string, userUid: string) {
    const mockServer = await this.prisma.mockServer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

    // Check access permissions
    if (mockServer.workspaceType === WorkspaceType.USER) {
      if (mockServer.creatorUid !== userUid) {
        return E.left(MOCK_SERVER_NOT_FOUND);
      }
    } else if (mockServer.workspaceType === WorkspaceType.TEAM) {
      const isMember = await this.prisma.team.findFirst({
        where: {
          id: mockServer.workspaceID,
          members: {
            some: {
              userUid,
              role: {
                in: [
                  TeamAccessRole.OWNER,
                  TeamAccessRole.EDITOR,
                  TeamAccessRole.VIEWER,
                ],
              },
            },
          },
        },
      });
      if (!isMember) return E.left(MOCK_SERVER_NOT_FOUND);
    }

    return E.right(this.cast(mockServer));
  }

  /**
   * Get a mock server by subdomain (for incoming mock requests)
   */
  async getMockServerBySubdomain(subdomain: string) {
    const mockServer = await this.prisma.mockServer.findUnique({
      where: { subdomain, deletedAt: null, isActive: true },
    });
    if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

    return E.right(this.cast(mockServer));
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

  async getMockServerCollection(mockServerId: string) {
    const mockServer = await this.prisma.mockServer.findUnique({
      where: { id: mockServerId, deletedAt: null },
    });
    if (!mockServer) return E.left(MOCK_SERVER_NOT_FOUND);

    if (mockServer.workspaceType === WorkspaceType.USER) {
      const collection = await this.prisma.userCollection.findUnique({
        where: { id: mockServer.collectionID },
      });
      if (!collection) return E.left(MOCK_SERVER_INVALID_COLLECTION);
      return E.right({
        id: collection.id,
        title: collection.title,
      } as MockServerCollection);
    } else if (mockServer.workspaceType === WorkspaceType.TEAM) {
      const collection = await this.prisma.teamCollection.findUnique({
        where: { id: mockServer.collectionID },
      });
      if (!collection) return E.left(MOCK_SERVER_INVALID_COLLECTION);
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
    return `mock-${id}`;
  }

  /**
   * Validate workspace access permission and existence
   */
  private async validateWorkspace(user: User, input: CreateMockServerInput) {
    if (input.workspaceType === WorkspaceType.TEAM) {
      if (!input.workspaceID) return E.left(TEAM_INVALID_ID);

      const team = await this.prisma.team.findUnique({
        where: {
          id: input.workspaceID,
          members: {
            some: {
              userUid: user.uid,
              role: { in: [TeamAccessRole.OWNER, TeamAccessRole.EDITOR] },
            },
          },
        },
      });

      if (!team) return E.left(TEAM_INVALID_ID);
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
  async createMockServer(user: User, input: CreateMockServerInput) {
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

      // Generate unique subdomain
      let subdomain: string;
      let attempts = 0;
      while (attempts < 10) {
        subdomain = this.generateMockServerSubdomain();

        const existing = await this.prisma.mockServer.findUnique({
          where: { subdomain },
        });

        if (!existing) break;
        attempts++;
      }
      if (attempts >= 10) return E.left(MOCK_SERVER_SUBDOMAIN_CONFLICT);

      // Create mock server
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

      return E.right(this.cast(mockServer));
    } catch (error) {
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

      // Check access permissions
      if (mockServer.workspaceType === WorkspaceType.USER) {
        if (mockServer.creatorUid !== userUid) {
          return E.left(MOCK_SERVER_NOT_FOUND);
        }
      } else if (mockServer.workspaceType === WorkspaceType.TEAM) {
        const isMember = await this.prisma.team.findFirst({
          where: {
            id: mockServer.workspaceID,
            members: {
              some: {
                userUid,
                role: { in: [TeamAccessRole.OWNER, TeamAccessRole.EDITOR] },
              },
            },
          },
        });
        if (!isMember) return E.left(MOCK_SERVER_NOT_FOUND);
      }

      // Update the mock server
      const updated = await this.prisma.mockServer.update({
        where: { id },
        data: input,
      });

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

      // Check access permissions
      if (mockServer.workspaceType === WorkspaceType.USER) {
        if (mockServer.creatorUid !== userUid) {
          return E.left(MOCK_SERVER_NOT_FOUND);
        }
      } else if (mockServer.workspaceType === WorkspaceType.TEAM) {
        const isMember = await this.prisma.team.findFirst({
          where: {
            id: mockServer.workspaceID,
            members: {
              some: {
                userUid,
                role: { in: [TeamAccessRole.OWNER, TeamAccessRole.EDITOR] },
              },
            },
          },
        });
        if (!isMember) return E.left(MOCK_SERVER_NOT_FOUND);
      }

      // Soft delete the mock server
      await this.prisma.mockServer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return E.right(true);
    } catch (error) {
      console.error('Error deleting mock server:', error);
      return E.left(MOCK_SERVER_DELETION_FAILED);
    }
  }

  /**
   * Handle mock request - find matching request in collection and return response
   */
  async handleMockRequest(
    subdomain: string,
    path: string,
    method: string,
  ): Promise<E.Either<string, MockServerResponse>> {
    try {
      const mockServerResult = await this.getMockServerBySubdomain(subdomain);

      if (E.isLeft(mockServerResult)) {
        return mockServerResult;
      }

      const mockServer = mockServerResult.right;

      const matchingRequest = null;
      // const matchingRequest = mockServer.collection.requests.find(
      //   (request: any) => {
      //     const requestData = request.request;

      //     // Extract path from endpoint, handling placeholders like <<url>>
      //     let requestPath = '/';
      //     try {
      //       if (requestData.endpoint) {
      //         // Handle placeholder URLs like "<<url>>/ping"
      //         if (requestData.endpoint.includes('<<url>>')) {
      //           // Extract the path after the placeholder
      //           const pathPart =
      //             requestData.endpoint.split('<<url>>')[1] || '/';
      //           requestPath = pathPart.startsWith('/')
      //             ? pathPart
      //             : '/' + pathPart;
      //         } else {
      //           // Try to parse as a regular URL
      //           const requestUrl = new URL(requestData.endpoint);
      //           requestPath = requestUrl.pathname;
      //         }
      //       }
      //     } catch (error) {
      //       // If URL parsing fails, try to extract path manually
      //       if (requestData.endpoint) {
      //         const lastSlashIndex = requestData.endpoint.lastIndexOf('/');
      //         if (lastSlashIndex !== -1) {
      //           requestPath = requestData.endpoint.substring(lastSlashIndex);
      //         }
      //       }
      //     }

      //     const requestMethod = requestData.method || 'GET';

      //     return (
      //       requestPath === path &&
      //       requestMethod.toUpperCase() === method.toUpperCase()
      //     );
      //   },
      // );

      if (!matchingRequest) {
        return E.left('Endpoint not found');
      }

      const requestData = matchingRequest.request;

      // Extract response from the request's response examples or default response
      let statusCode = 200;
      let body = '';
      let headers = '{}';

      // Try to get response from examples or default mock response
      if (requestData.responses) {
        // Handle responses as an object (like {"default-200": {...}})
        const responseKeys = Object.keys(requestData.responses);
        if (responseKeys.length > 0) {
          const firstResponseKey = responseKeys[0];
          const firstResponse = requestData.responses[firstResponseKey];
          statusCode = firstResponse.code || firstResponse.statusCode || 200;
          body = firstResponse.body || '';

          // Handle headers
          if (firstResponse.headers) {
            if (Array.isArray(firstResponse.headers)) {
              // Convert array of {key, value} to object
              const headersObj = {};
              firstResponse.headers.forEach((header: any) => {
                if (header.key && header.value) {
                  headersObj[header.key] = header.value;
                }
              });
              headers = JSON.stringify(headersObj);
            } else {
              headers = JSON.stringify(firstResponse.headers);
            }
          } else {
            headers = '{}';
          }
        }
      }

      // If no response found, create a default one
      if (!body) {
        body = JSON.stringify({
          message: `Mock response for ${method.toUpperCase()} ${path}`,
          timestamp: new Date().toISOString(),
        });
      }

      return E.right({
        statusCode,
        body,
        headers,
        delay: 0, // Can be configured later if needed
      });
    } catch (error) {
      console.error('Error handling mock request:', error);
      return E.left('Failed to handle mock request');
    }
  }
}

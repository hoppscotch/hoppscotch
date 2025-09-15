import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import {
  CreateMockServerInput,
  UpdateMockServerInput,
  MockServerResponse,
  MockServer,
} from './mock-server.model';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import {
  MOCK_SERVER_NOT_FOUND,
  MOCK_SERVER_SUBDOMAIN_CONFLICT,
  MOCK_SERVER_INVALID_COLLECTION,
  MOCK_SERVER_ALREADY_EXISTS,
} from 'src/errors';
import { UserCollectionService } from 'src/user-collection/user-collection.service';

@Injectable()
export class MockServerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
    private readonly userCollectionService: UserCollectionService,
  ) {}

  /**
   * Generate a unique subdomain for the mock server
   */
  private generateMockServerSubdomain(): string {
    const id = Math.random().toString(36).substring(2, 15);
    return `mock-${id}`;
  }

  /**
   * Create a new mock server
   */
  async createMockServer(
    user: User,
    input: CreateMockServerInput,
  ): Promise<E.Either<string, any>> {
    try {
      // Validate collection exists and belongs to user
      const collection = await this.userCollectionService.getUserCollection(
        input.collectionID,
      );

      if (E.isLeft(collection)) {
        return E.left(MOCK_SERVER_INVALID_COLLECTION);
      }

      // Check if the collection belongs to the user
      if (collection.right.userUid !== user.uid) {
        return E.left(MOCK_SERVER_INVALID_COLLECTION);
      }

      // Check if mock server already exists for this collection
      const existingMockServer = await this.prisma.mockServer.findUnique({
        where: {
          userUid_collectionID: {
            userUid: user.uid,
            collectionID: input.collectionID,
          },
        },
      });

      if (existingMockServer) {
        return E.left(MOCK_SERVER_ALREADY_EXISTS);
      }

      // Generate unique subdomain
      let subdomain = this.generateMockServerSubdomain();
      let attempts = 0;

      while (attempts < 10) {
        const existing = await this.prisma.mockServer.findUnique({
          where: { subdomain },
        });

        if (!existing) break;

        subdomain = this.generateMockServerSubdomain();
        attempts++;
      }

      if (attempts >= 10) {
        return E.left(MOCK_SERVER_SUBDOMAIN_CONFLICT);
      }

      const mockServer = await this.prisma.mockServer.create({
        data: {
          name: input.name,
          subdomain,
          userUid: user.uid,
          collectionID: input.collectionID,
        },
        include: {
          user: true,
          collection: {
            include: {
              requests: true,
            },
          },
        },
      });

      // Publish creation event
      // this.pubsub.publish(`mock_server/${user.uid}/created`, mockServer);

      return E.right(mockServer);
    } catch (error) {
      console.error('Error creating mock server:', error);
      return E.left('Failed to create mock server');
    }
  }

  /**
   * Get all mock servers for a user
   */
  async getUserMockServers(userUid: string): Promise<any[]> {
    return this.prisma.mockServer.findMany({
      where: { userUid },
      include: {
        user: true,
        collection: {
          include: {
            requests: true,
          },
        },
      },
      orderBy: { createdOn: 'desc' },
    });
  }

  /**
   * Get a specific mock server by ID
   */
  async getMockServer(
    id: string,
    userUid: string,
  ): Promise<E.Either<string, any>> {
    try {
      const mockServer = await this.prisma.mockServer.findFirst({
        where: { id, userUid },
        include: {
          user: true,
          collection: {
            include: {
              requests: true,
            },
          },
        },
      });

      if (!mockServer) {
        return E.left(MOCK_SERVER_NOT_FOUND);
      }

      return E.right(mockServer);
    } catch (error) {
      console.error('Error fetching mock server:', error);
      return E.left('Failed to fetch mock server');
    }
  }

  /**
   * Get a mock server by subdomain (for public access)
   */
  async getMockServerBySubdomain(
    subdomain: string,
  ): Promise<E.Either<string, any>> {
    try {
      const mockServer = await this.prisma.mockServer.findUnique({
        where: { subdomain },
        include: {
          collection: {
            include: {
              requests: true,
            },
          },
        },
      });

      if (!mockServer || !mockServer.isActive) {
        return E.left(MOCK_SERVER_NOT_FOUND);
      }

      return E.right(mockServer);
    } catch (error) {
      console.error('Error fetching mock server by subdomain:', error);
      return E.left('Failed to fetch mock server');
    }
  }

  /**
   * Update a mock server
   */
  async updateMockServer(
    id: string,
    userUid: string,
    input: UpdateMockServerInput,
  ): Promise<E.Either<string, any>> {
    try {
      const mockServer = await this.prisma.mockServer.findFirst({
        where: { id, userUid },
      });

      if (!mockServer) {
        return E.left(MOCK_SERVER_NOT_FOUND);
      }

      const updated = await this.prisma.mockServer.update({
        where: { id },
        data: input,
        include: {
          user: true,
          collection: {
            include: {
              requests: true,
            },
          },
        },
      });

      // Publish update event
      // this.pubsub.publish(`mock_server/${userUid}/updated`, updated);

      return E.right(updated);
    } catch (error) {
      console.error('Error updating mock server:', error);
      return E.left('Failed to update mock server');
    }
  }

  /**
   * Delete a mock server
   */
  async deleteMockServer(
    id: string,
    userUid: string,
  ): Promise<E.Either<string, boolean>> {
    try {
      const mockServer = await this.prisma.mockServer.findFirst({
        where: { id, userUid },
      });

      if (!mockServer) {
        return E.left(MOCK_SERVER_NOT_FOUND);
      }

      await this.prisma.mockServer.delete({
        where: { id },
      });

      // Publish deletion event
      this.pubsub.publish(`mock_server/${userUid}/deleted`, { id });

      return E.right(true);
    } catch (error) {
      console.error('Error deleting mock server:', error);
      return E.left('Failed to delete mock server');
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

      // Find matching request in the collection
      const matchingRequest = mockServer.collection.requests.find(
        (request: any) => {
          const requestData = request.request;
          // Parse the endpoint from the request URL
          const requestUrl = new URL(requestData.endpoint || '');
          const requestPath = requestUrl.pathname;
          const requestMethod = requestData.method || 'GET';

          return (
            requestPath === path &&
            requestMethod.toUpperCase() === method.toUpperCase()
          );
        },
      );

      if (!matchingRequest) {
        return E.left('Endpoint not found');
      }

      const requestData = matchingRequest.request;

      // Extract response from the request's response examples or default response
      let statusCode = 200;
      let body = '';
      let headers = '{}';

      // Try to get response from examples or default mock response
      if (requestData.responses && requestData.responses.length > 0) {
        const firstResponse = requestData.responses[0];
        statusCode = firstResponse.statusCode || 200;
        body = firstResponse.body || '';
        headers = JSON.stringify(firstResponse.headers || {});
      } else {
        // Default mock response
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

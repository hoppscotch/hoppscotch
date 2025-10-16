import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MockServer as dbMockServer, MockServerAction } from '@prisma/client';

@Injectable()
export class MockServerAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record mock server activity
   * @param mockServer The mock server database object
   * @param action The action being performed (CREATED, ACTIVATED, DEACTIVATED, DELETED, UPDATED)
   * @param performedBy Optional userUid who performed the action
   */
  async recordActivity(
    mockServer: dbMockServer,
    action: MockServerAction,
    performedBy?: string,
  ): Promise<void> {
    try {
      // Skip if trying to activate an already active server
      if (action === MockServerAction.ACTIVATED && mockServer.isActive) {
        return;
      }

      // Skip if trying to deactivate an already inactive server
      if (action === MockServerAction.DEACTIVATED && !mockServer.isActive) {
        return;
      }

      await this.prisma.mockServerActivity.create({
        data: {
          mockServerID: mockServer.id,
          action: action,
          performedBy: performedBy || null,
        },
      });
    } catch (error) {
      // Log error but don't throw - analytics shouldn't break main flow
      console.error('Failed to record mock server activity:', error);
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
}

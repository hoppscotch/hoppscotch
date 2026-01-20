import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  MockServer as dbMockServer,
  MockServerAction,
} from 'src/generated/prisma/client';

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
}

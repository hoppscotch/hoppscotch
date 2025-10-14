import {
  Controller,
  All,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MockServerService } from './mock-server.service';
import * as E from 'fp-ts/Either';
import { MockRequestGuard } from './mock-request.guard';
import { MockServer } from '@prisma/client';

/**
 * Mock server controller with dual routing support:
 * 1. Subdomain pattern: mock-server-id.mock.hopp.io/product
 * 2. Route pattern: backend.hopp.io/mock/mock-server-id/product
 *
 * The MockRequestGuard handles extraction of mock server ID from both patterns
 */
@Controller({ path: 'mock' })
export class MockServerController {
  constructor(private readonly mockServerService: MockServerService) {}

  @All('*path')
  @UseGuards(MockRequestGuard)
  async handleMockRequest(@Req() req: Request, @Res() res: Response) {
    // Mock server ID and info are attached by the guard
    const mockServerId = (req as any).mockServerId as string;
    const mockServer = (req as any).mockServer as MockServer;

    if (!mockServerId) {
      return res.status(HttpStatus.NOT_FOUND).json({
        error: 'Not found',
        message: 'Mock server ID not found',
      });
    }

    const method = req.method;
    // Get clean path (removes /mock/mock-server-id prefix for route-based pattern)
    const path = MockRequestGuard.getCleanPath(req.path || '/', mockServerId);
    
    // Extract query parameters
    const queryParams = req.query as Record<string, string>;
    
    // Extract request headers (convert to lowercase for case-insensitive matching)
    const requestHeaders: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      const value = req.headers[key];
      if (typeof value === 'string') {
        requestHeaders[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        requestHeaders[key.toLowerCase()] = value[0];
      }
    });

    try {
      const result = await this.mockServerService.handleMockRequest(
        mockServerId,
        path,
        method,
        queryParams,
        requestHeaders,
      );

      if (E.isLeft(result)) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: 'Endpoint not found',
          message: result.left,
        });
      }

      const mockResponse = result.right;

      // Set response headers if any
      if (mockResponse.headers) {
        try {
          const headers = JSON.parse(mockResponse.headers);
          Object.keys(headers).forEach((key) => {
            res.setHeader(key, headers[key]);
          });
        } catch (error) {
          console.error('Error parsing response headers:', error);
        }
      }

      // Add delay if specified
      if (mockServer.delayInMs && mockServer.delayInMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, mockServer.delayInMs));
      }

      // Send response
      return res.status(mockResponse.statusCode).send(mockResponse.body);
    } catch (error) {
      console.error('Error handling mock request:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Failed to process mock request',
      });
    }
  }
}

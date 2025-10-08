import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  All,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MockServerService } from './mock-server.service';
import * as E from 'fp-ts/Either';

// Mock server controller for subdomain-based routing
// This controller handles requests to mock-*.localhost:3170 or mock-*.domain.com
@Controller()
export class MockServerController {
  constructor(private readonly mockServerService: MockServerService) {}

  @All('*')
  async handleAllRequests(@Req() req: Request, @Res() res: Response) {
    // Extract subdomain from host header
    const host = req.get('host') || '';
    const subdomain = this.extractSubdomain(host);

    // If this is not a mock subdomain request, let other controllers handle it
    if (!subdomain) {
      return res.status(HttpStatus.NOT_FOUND).json({
        error: 'Not found',
        message: 'This endpoint handles mock server requests only',
      });
    }

    const method = req.method;
    const path = req.path || '/';

    try {
      const result = await this.mockServerService.handleMockRequest(
        subdomain,
        path,
        method,
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
      if (mockResponse.delay && mockResponse.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, mockResponse.delay));
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

  private extractSubdomain(host: string): string | null {
    // Remove port if present
    const hostname = host.split(':')[0];

    // Split by dots and check if we have a subdomain
    const parts = hostname.split('.');

    // For localhost development: mock-1234.localhost
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      const subdomain = parts[0];
      // Check if it's a mock subdomain
      if (subdomain.startsWith('mock-')) {
        return subdomain;
      }
    }

    // For production domains: mock-1234.example.com
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain.startsWith('mock-')) {
        return subdomain;
      }
    }

    return null;
  }
}

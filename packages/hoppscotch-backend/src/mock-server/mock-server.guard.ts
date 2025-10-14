import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MockServerService } from './mock-server.service';
import * as E from 'fp-ts/Either';

@Injectable()
export class MockServerMiddleware implements NestMiddleware {
  constructor(private readonly mockServerService: MockServerService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract subdomain from host header
    const host = req.get('host') || '';
    const subdomain = this.extractSubdomain(host);

    // If this is not a mock subdomain request, pass to next middleware
    if (!subdomain) {
      return next();
    }

    const method = req.method;
    const fullPath = req.originalUrl.split('?')[0]; // Remove query parameters and use original URL
    const path = fullPath || '/';

    try {
      const result = await this.mockServerService.handleMockRequest(
        subdomain,
        path,
        method,
      );

      if (E.isLeft(result)) {
        return res.status(404).json({
          error: 'Endpoint not found',
          message: result.left,
          debug: {
            subdomain,
            path,
            method,
            timestamp: new Date().toISOString(),
          },
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
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process mock request',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

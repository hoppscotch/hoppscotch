import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MockServer } from '@prisma/client';
import { MockServerService } from './mock-server.service';

@Injectable()
export class MockServerLoggingInterceptor implements NestInterceptor {
  constructor(private readonly mockServerService: MockServerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    // Capture request start time
    const startTime = Date.now();

    // Extract mock server info (attached by MockRequestGuard)
    const mockServer = (request as any).mockServer as MockServer;
    const mockServerId = (request as any).mockServerId as string;

    // If no mock server info, skip logging
    if (!mockServer || !mockServerId) {
      return next.handle();
    }

    // Capture request details
    const requestMethod = request.method;
    const requestPath = request.path;
    const requestHeaders = this.extractHeaders(request);
    const requestBody = request.body || {};
    const requestQuery = this.extractQueryParams(request);

    if (!requestBody || typeof requestBody !== 'object') {
      console.warn('Request body is not properly parsed');
    }

    // Extract client info
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      undefined;
    const userAgent = request.headers['user-agent'] as string | undefined;

    // Capture response - use finalize to ensure logging happens regardless of success/error
    return next.handle().pipe(
      tap({
        next: () => {
          // Success case - log after response is sent
          const responseTime = Date.now() - startTime;
          const responseStatus = response.statusCode || 200;
          const responseHeaders = this.extractResponseHeaders(response);

          // Log the request asynchronously (fire and forget)
          this.mockServerService
            .logRequest({
              mockServerID: mockServerId,
              requestMethod,
              requestPath,
              requestHeaders,
              requestBody,
              requestQuery,
              responseStatus,
              responseHeaders,
              responseTime,
              ipAddress,
              userAgent,
            })
            .catch((err) => console.error('Failed to log mock request:', err));

          // Increment hit count asynchronously (fire and forget)
          this.mockServerService
            .incrementHitCount(mockServerId)
            .catch((err) =>
              console.error('Failed to increment hit count:', err),
            );
        },
        error: (error) => {
          // Error case - log the error but let it propagate to user
          const responseTime = Date.now() - startTime;
          const responseStatus = error.status || 500;

          // Log error response asynchronously
          this.mockServerService
            .logRequest({
              mockServerID: mockServerId,
              requestMethod,
              requestPath,
              requestHeaders,
              requestBody,
              requestQuery,
              responseStatus,
              responseHeaders: {},
              responseTime,
              ipAddress,
              userAgent,
            })
            .catch((err) =>
              console.error('Failed to log mock request error:', err),
            );

          // Still increment hit count even for errors
          this.mockServerService
            .incrementHitCount(mockServerId)
            .catch((err) =>
              console.error('Failed to increment hit count:', err),
            );

          // Error will automatically propagate to user
          // No need to re-throw, tap operator handles this
        },
      }),
    );
  }

  /**
   * Extract request headers as a plain object
   */
  private extractHeaders(request: Request): Record<string, string> {
    const headers: Record<string, string> = {};
    Object.keys(request.headers).forEach((key) => {
      const value = request.headers[key];
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value[0];
      }
    });
    return headers;
  }

  /**
   * Extract query parameters as a plain object
   */
  private extractQueryParams(
    request: Request,
  ): Record<string, string> | undefined {
    const queryParams = request.query as Record<string, string>;
    return Object.keys(queryParams).length > 0 ? queryParams : undefined;
  }

  /**
   * Extract response headers as a plain object
   */
  private extractResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    const headerNames = response.getHeaderNames();

    headerNames.forEach((name) => {
      const value = response.getHeader(name);
      if (typeof value === 'string') {
        headers[name.toLowerCase()] = value;
      } else if (typeof value === 'number') {
        headers[name.toLowerCase()] = value.toString();
      } else if (Array.isArray(value)) {
        headers[name.toLowerCase()] = value.join(', ');
      }
    });

    return headers;
  }
}

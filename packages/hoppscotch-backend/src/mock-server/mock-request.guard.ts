import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { MockServerService } from './mock-server.service';
import * as E from 'fp-ts/Either';
import { AccessTokenService } from 'src/access-token/access-token.service';
import { TeamService } from 'src/team/team.service';
import { WorkspaceType } from 'src/generated/prisma/client';

/**
 * Guard to extract and validate mock server ID from either:
 * 1. Subdomain pattern: mock-server-id.mock.hopp.io/product
 * 2. Route pattern: backend.hopp.io/mock/mock-server-id/product
 */
@Injectable()
export class MockRequestGuard implements CanActivate {
  constructor(
    private readonly mockServerService: MockServerService,
    private readonly accessTokenService: AccessTokenService,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract mock server ID from either subdomain or route
    const mockServerSubdomain = this.extractMockServerSubdomain(request);

    if (!mockServerSubdomain) {
      throw new BadRequestException(
        'Invalid mock server request. Mock server ID not found in subdomain or path.',
      );
    }

    // Validate mock server exists (including inactive ones)
    const mockServerResult =
      await this.mockServerService.getMockServerBySubdomain(
        mockServerSubdomain,
        true, // includeInactive = true
      );

    if (E.isLeft(mockServerResult)) {
      console.warn(
        `Mock server lookup failed for subdomain: ${String(mockServerSubdomain).replace(/\r|\n/g, '')}, error: ${mockServerResult.left}`,
      );
      throw new NotFoundException(
        `Mock server '${mockServerSubdomain}' not found`,
      );
    }

    const mockServer = mockServerResult.right;

    // Check if mock server is active and throw proper error if not
    if (!mockServer.isActive) {
      throw new BadRequestException(
        `Mock server '${mockServerSubdomain}' is currently inactive`,
      );
    }

    if (!mockServer.isPublic) {
      const apiKey = request.get('x-api-key');

      if (!apiKey) {
        throw new BadRequestException(
          'API key is required. Please provide x-api-key header.',
        );
      }

      // Validate the Personal Access Token (PAT)
      await this.validatePAT(apiKey, mockServer);
    }

    // Attach mock server info to request for downstream use
    (request as any).mockServer = mockServer;
    (request as any).mockServerId = mockServer.id;

    return true;
  }

  /**
   * Extract mock server ID from request using either subdomain or route-based pattern
   *
   * Supports two patterns:
   * 1. Subdomain: mock-server-id.mock.hopp.io/product → mock-server-id (from host)
   *    After Caddy rewrite: path becomes /mock/product
   * 2. Route: backend.hopp.io/mock/mock-server-id/product → mock-server-id (from path)
   *
   * @param request Express request object
   * @returns Mock server ID or null if not found
   */
  private extractMockServerSubdomain(request: Request): string | null {
    const host = request.get('host') || '';
    const path = request.path || '/';

    // Try subdomain pattern first (Option 1)
    // For subdomain-based requests, Caddy rewrites path to /mock/...
    // but the mock server ID comes from the subdomain, not the path
    const subdomainId = this.extractFromSubdomain(host);
    if (subdomainId) {
      return subdomainId;
    }

    // Try route-based pattern (Option 2)
    // Only use route extraction if there's no subdomain match
    // Route pattern: /mock/mock-server-id/...
    const routeId = this.extractFromRoute(path);
    if (routeId) {
      return routeId;
    }

    return null;
  }

  /**
   * Extract mock server ID from subdomain pattern
   * Supports: mock-server-id.mock.hopp.io or mock-server-id.mock.localhost
   *
   * @param host Host header value
   * @returns Mock server ID or null
   */
  private extractFromSubdomain(host: string): string | null {
    // Remove port if present
    const hostname = host.split(':')[0];

    // Split by dots
    const parts = hostname.split('.');

    // Check if this is a mock subdomain pattern
    // For: mock-server-id.mock.hopp.io → ['mock-server-id', 'mock', 'hopp', 'io']
    // For: mock-server-id.mock.localhost → ['mock-server-id', 'mock', 'localhost']

    if (parts.length >= 3) {
      // Check if second part is 'mock'
      if (parts[1] === 'mock') {
        const mockServerId = parts[0];

        // Validate it's not empty and follows a reasonable pattern
        if (mockServerId && mockServerId.length > 0) {
          return mockServerId;
        }
      }
    }

    // Also support: mock-server-id.localhost (for simpler local dev)
    if (parts.length === 2 && parts[1] === 'localhost') {
      const mockServerId = parts[0];
      if (mockServerId && mockServerId.length > 0) {
        return mockServerId;
      }
    }

    return null;
  }

  /**
   * Extract mock server ID from route pattern
   * Supports: /mock/mock-server-id/product → mock-server-id
   * Note: Caddy prepends /mock to subdomain requests, so subdomain pattern
   * mock-server-id.mock.hopp.io/product becomes /mock/product
   *
   * @param path Request path
   * @returns Mock server ID or null
   */
  private extractFromRoute(path: string): string | null {
    // Pattern: /mock/mock-server-id/...
    // We need to match: /mock/{id} or /mock/{id}/...

    const mockPathRegex = /^\/mock\/([^\/]+)/;
    const match = path.match(mockPathRegex);

    if (match && match[1]) {
      const mockServerId = match[1];

      // Validate it's not empty and not the word 'mock' itself
      if (mockServerId && mockServerId !== 'mock' && mockServerId.length > 0) {
        return mockServerId;
      }
    }

    return null;
  }

  /**
   * Validate Personal Access Token (PAT) for private mock server access
   *
   * Rules:
   * - If mock server is in USER workspace: PAT must belong to that user
   * - If mock server is in TEAM workspace: PAT creator must be a member of that team
   *
   * @param apiKey The x-api-key header value (PAT)
   * @param mockServer The mock server being accessed
   * @throws UnauthorizedException if PAT is invalid or user lacks access
   */
  private async validatePAT(apiKey: string, mockServer: any): Promise<void> {
    // Get the PAT and associated user
    const patResult = await this.accessTokenService.getUserPAT(apiKey);

    if (E.isLeft(patResult)) {
      throw new UnauthorizedException(
        'Invalid or expired API key. Please provide a valid Personal Access Token.',
      );
    }

    const pat = patResult.right;
    const userUid = pat.user.uid;

    // Check if PAT has expired
    if (pat.expiresOn !== null && new Date() > pat.expiresOn) {
      throw new UnauthorizedException(
        'API key has expired. Please generate a new Personal Access Token.',
      );
    }

    // Validate based on workspace type
    if (mockServer.workspaceType === WorkspaceType.USER) {
      // For USER workspace: PAT must belong to the workspace owner
      if (userUid !== mockServer.workspaceID) {
        throw new UnauthorizedException(
          'Access denied. This Personal Access Token does not have permission to access this mock server.',
        );
      }
    } else if (mockServer.workspaceType === WorkspaceType.TEAM) {
      // For TEAM workspace: PAT creator must be a member of the team
      const teamMember = await this.teamService.getTeamMember(
        mockServer.workspaceID,
        userUid,
      );

      if (!teamMember) {
        throw new UnauthorizedException(
          'Access denied. You must be a member of the team to access this mock server.',
        );
      }
    } else {
      throw new BadRequestException('Invalid workspace type for mock server.');
    }

    // Update last used timestamp for the PAT
    await this.accessTokenService.updateLastUsedForPAT(apiKey);
  }

  /**
   * Get the actual path without the /mock/mock-server-id prefix
   * This is useful for route-based pattern to get the actual endpoint path
   *
   * @param fullPath Full request path
   * @param mockServerId Mock server ID
   * @returns Clean path for the mock endpoint
   */
  static getCleanPath(fullPath: string, mockServerId: string): string {
    // If route-based: /mock/mock-server-id/product → /product
    const routePrefix = `/mock/${mockServerId}`;
    if (fullPath.startsWith(routePrefix)) {
      const cleanPath = fullPath.substring(routePrefix.length);
      return cleanPath || '/';
    }

    // If subdomain-based: Caddy rewrites to /mock/product → /product
    // Strip the /mock prefix added by Caddy
    if (fullPath.startsWith('/mock/')) {
      const cleanPath = fullPath.substring(5); // Remove '/mock'
      return cleanPath || '/';
    }

    // Fallback: return as-is
    return fullPath;
  }
}

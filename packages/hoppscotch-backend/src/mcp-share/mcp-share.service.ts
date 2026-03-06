import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as E from 'fp-ts/Either';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import { UserCollectionService } from 'src/user-collection/user-collection.service';
import { AuthUser } from 'src/types/AuthUser';
import { WorkspaceType } from 'src/types/WorkspaceTypes';
import { TeamAccessRole } from 'src/generated/prisma/client';
import {
  MCP_SHARE_NOT_FOUND,
  MCP_SHARE_EXPIRED,
  MCP_SHARE_CREATION_FAILED,
  MCP_SHARE_DELETION_FAILED,
  MCP_SHARE_UNAUTHORIZED,
} from 'src/errors';
import { McpShare as GqlMcpShare } from './mcp-share.model';
import { McpShare as DbMcpShare } from 'src/generated/prisma/client';

@Injectable()
export class McpShareService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly teamCollectionService: TeamCollectionService,
    private readonly userCollectionService: UserCollectionService,
  ) {}

  /**
   * Cast DB row to GQL model, deriving URL fields.
   */
  private cast(share: DbMcpShare): GqlMcpShare {
    const backendUrl = this.configService.get<string>('VITE_BACKEND_API_URL');
    const base = backendUrl.substring(0, backendUrl.lastIndexOf('/'));
    const shareUrlPathBased = `${base}/v1/mcp/${share.shareToken}`;

    const wildcardDomain = this.configService.get<string>(
      'INFRA.MCP_SHARE_WILDCARD_DOMAIN',
    );
    const isSecure =
      this.configService.get<string>('INFRA.ALLOW_SECURE_COOKIES') === 'true';
    const protocol = isSecure ? 'https://' : 'http://';
    const shareUrlDomainBased = wildcardDomain
      ? protocol + share.shareToken + wildcardDomain.substring(1)
      : undefined;

    return {
      id: share.id,
      shareToken: share.shareToken,
      collectionID: share.collectionID,
      workspaceType: share.workspaceType,
      createdOn: share.createdOn,
      expiresAt: share.expiresAt ?? undefined,
      isActive: share.isActive,
      shareUrlPathBased,
      shareUrlDomainBased,
    } as GqlMcpShare;
  }

  private generateShareToken(): string {
    return randomBytes(16).toString('base64url').substring(0, 20);
  }

  /**
   * Verify the user has access to the collection.
   */
  private async validateCollectionAccess(
    user: AuthUser,
    collectionID: string,
    workspaceType: WorkspaceType,
  ): Promise<E.Either<string, boolean>> {
    if (workspaceType === WorkspaceType.TEAM) {
      const collection = await this.prisma.teamCollection.findUnique({
        where: { id: collectionID },
      });
      if (!collection) return E.left(MCP_SHARE_NOT_FOUND);

      const member = await this.prisma.teamMember.findFirst({
        where: {
          teamID: collection.teamID,
          userUid: user.uid,
          role: {
            in: [TeamAccessRole.OWNER, TeamAccessRole.EDITOR, TeamAccessRole.VIEWER],
          },
        },
      });
      if (!member) return E.left(MCP_SHARE_UNAUTHORIZED);
    } else {
      const collection = await this.prisma.userCollection.findUnique({
        where: { id: collectionID, userUid: user.uid },
      });
      if (!collection) return E.left(MCP_SHARE_NOT_FOUND);
    }
    return E.right(true);
  }

  async createShare(
    user: AuthUser,
    collectionID: string,
    workspaceType: WorkspaceType,
  ): Promise<E.Either<string, GqlMcpShare>> {
    const accessCheck = await this.validateCollectionAccess(
      user,
      collectionID,
      workspaceType,
    );
    if (E.isLeft(accessCheck)) return E.left(accessCheck.left);

    // Determine workspaceID
    const workspaceID =
      workspaceType === WorkspaceType.TEAM
        ? (
            await this.prisma.teamCollection.findUnique({
              where: { id: collectionID },
            })
          )?.teamID ?? user.uid
        : user.uid;

    try {
      const shareToken = this.generateShareToken();
      const share = await this.prisma.mcpShare.create({
        data: {
          shareToken,
          workspaceType,
          workspaceID,
          collectionID,
          createdBy: user.uid,
        },
      });
      return E.right(this.cast(share));
    } catch {
      return E.left(MCP_SHARE_CREATION_FAILED);
    }
  }

  async getShare(
    shareToken: string,
  ): Promise<E.Either<string, DbMcpShare>> {
    const share = await this.prisma.mcpShare.findFirst({
      where: { shareToken, isActive: true, deletedAt: null },
    });
    if (!share) return E.left(MCP_SHARE_NOT_FOUND);

    if (share.expiresAt && share.expiresAt < new Date()) {
      return E.left(MCP_SHARE_EXPIRED);
    }

    return E.right(share);
  }

  async deleteShare(
    user: AuthUser,
    shareToken: string,
  ): Promise<E.Either<string, boolean>> {
    const share = await this.prisma.mcpShare.findFirst({
      where: { shareToken, deletedAt: null },
    });
    if (!share) return E.left(MCP_SHARE_NOT_FOUND);
    if (share.createdBy !== user.uid) return E.left(MCP_SHARE_UNAUTHORIZED);

    try {
      await this.prisma.mcpShare.update({
        where: { id: share.id },
        data: { isActive: false, deletedAt: new Date() },
      });
      return E.right(true);
    } catch {
      return E.left(MCP_SHARE_DELETION_FAILED);
    }
  }

  async listSharesForUser(uid: string): Promise<GqlMcpShare[]> {
    const shares = await this.prisma.mcpShare.findMany({
      where: { createdBy: uid, isActive: true, deletedAt: null },
      orderBy: { createdOn: 'desc' },
    });
    return shares.map((s) => this.cast(s));
  }

  async getCollectionTree(share: DbMcpShare) {
    if (share.workspaceType === WorkspaceType.TEAM) {
      return this.teamCollectionService.exportCollectionToJSONObject(
        share.workspaceID,
        share.collectionID,
      );
    } else {
      return this.userCollectionService.exportUserCollectionToJSONObject(
        share.workspaceID,
        share.collectionID,
      );
    }
  }
}

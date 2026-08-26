import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { WorkspaceType } from 'src/types/WorkspaceTypes';
import { throwErr } from 'src/utils';
import * as E from 'fp-ts/Either';
import { McpShareService } from './mcp-share.service';
import { McpShare } from './mcp-share.model';

@Resolver(() => McpShare)
export class McpShareResolver {
  constructor(private readonly mcpShareService: McpShareService) {}

  @Query(() => [McpShare], {
    description: 'Get all active MCP shares created by the authenticated user',
  })
  @UseGuards(GqlAuthGuard)
  async myMcpShares(@GqlUser() user: AuthUser): Promise<McpShare[]> {
    return this.mcpShareService.listSharesForUser(user.uid);
  }

  @Mutation(() => McpShare, {
    description: 'Create an MCP share for a collection',
  })
  @UseGuards(GqlAuthGuard)
  async createMcpShare(
    @GqlUser() user: AuthUser,
    @Args({ name: 'collectionID', type: () => ID }) collectionID: string,
    @Args({ name: 'workspaceType', type: () => WorkspaceType })
    workspaceType: WorkspaceType,
  ): Promise<McpShare> {
    const result = await this.mcpShareService.createShare(
      user,
      collectionID,
      workspaceType,
    );
    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Revoke an MCP share by its share token',
  })
  @UseGuards(GqlAuthGuard)
  async deleteMcpShare(
    @GqlUser() user: AuthUser,
    @Args({ name: 'shareToken', type: () => String }) shareToken: string,
  ): Promise<boolean> {
    const result = await this.mcpShareService.deleteShare(user, shareToken);
    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }
}

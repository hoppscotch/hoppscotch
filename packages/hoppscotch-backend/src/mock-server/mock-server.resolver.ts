import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { User } from 'src/user/user.model';
import { MockServerService } from './mock-server.service';
import {
  MockServer,
  CreateMockServerInput,
  UpdateMockServerInput,
  MockServerMutationArgs,
  MockServerCollection,
  MockServerLog,
} from './mock-server.model';
import * as E from 'fp-ts/Either';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import { GqlTeamMemberGuard } from 'src/team/guards/gql-team-member.guard';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { TeamAccessRole } from 'src/team/team.model';
import { throwErr } from 'src/utils';

@Resolver(() => MockServer)
export class MockServerResolver {
  constructor(private readonly mockServerService: MockServerService) {}

  // Resolve Fields

  @ResolveField(() => User, {
    nullable: true,
    description: 'Returns the creator of the mock server',
  })
  async creator(@Parent() mockServer: MockServer): Promise<User> {
    const creator = await this.mockServerService.getMockServerCreator(
      mockServer.id,
    );

    if (E.isLeft(creator)) throwErr(creator.left);
    return {
      ...creator.right,
      currentGQLSession: JSON.stringify(creator.right.currentGQLSession),
      currentRESTSession: JSON.stringify(creator.right.currentRESTSession),
    };
  }

  @ResolveField(() => MockServerCollection, {
    nullable: true,
    description: 'Returns the collection of the mock server',
  })
  async collection(
    @Parent() mockServer: MockServer,
  ): Promise<MockServerCollection | null> {
    const collection = await this.mockServerService.getMockServerCollection(
      mockServer.id,
    );

    if (E.isLeft(collection)) throwErr(collection.left);
    return collection.right;
  }

  // Queries

  @Query(() => [MockServer], {
    description: 'Get all mock servers for the authenticated user',
  })
  @UseGuards(GqlAuthGuard)
  async myMockServers(
    @GqlUser() user: User,
    @Args() args: OffsetPaginationArgs,
  ): Promise<MockServer[]> {
    return this.mockServerService.getUserMockServers(user.uid, args);
  }

  @Query(() => [MockServer], {
    description: 'Get all mock servers for a specific team',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamAccessRole.VIEWER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.OWNER,
  )
  async teamMockServers(
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Id of the team to add to',
    })
    teamID: string,
    @Args() args: OffsetPaginationArgs,
  ): Promise<MockServer[]> {
    return this.mockServerService.getTeamMockServers(teamID, args);
  }

  @Query(() => MockServer, {
    description: 'Get a specific mock server by ID',
  })
  @UseGuards(GqlAuthGuard)
  async mockServer(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      type: () => ID,
      description: 'Id of the mock server to retrieve',
    })
    id: string,
  ): Promise<MockServer> {
    const result = await this.mockServerService.getMockServer(id, user.uid);

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Query(() => [MockServerLog], {
    description:
      'Get logs for a specific mock server with pagination, sorted by execution time (most recent first)',
  })
  @UseGuards(GqlAuthGuard)
  async mockServerLogs(
    @GqlUser() user: User,
    @Args({
      name: 'mockServerID',
      type: () => ID,
      description: 'ID of the mock server',
    })
    mockServerID: string,
    @Args() args: OffsetPaginationArgs,
  ): Promise<MockServerLog[]> {
    const result = await this.mockServerService.getMockServerLogs(
      mockServerID,
      user.uid,
      args,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  // Mutations

  @Mutation(() => MockServer, {
    description: 'Create a new mock server',
  })
  @UseGuards(GqlAuthGuard)
  async createMockServer(
    @Args('input') input: CreateMockServerInput,
    @GqlUser() user: User,
  ): Promise<MockServer> {
    const result = await this.mockServerService.createMockServer(user, input);

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => MockServer, {
    description: 'Update a mock server',
  })
  @UseGuards(GqlAuthGuard)
  async updateMockServer(
    @GqlUser() user: User,
    @Args() args: MockServerMutationArgs,
    @Args('input') input: UpdateMockServerInput,
  ): Promise<MockServer> {
    const result = await this.mockServerService.updateMockServer(
      args.id,
      user.uid,
      input,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a mock server',
  })
  @UseGuards(GqlAuthGuard)
  async deleteMockServer(
    @GqlUser() user: User,
    @Args() args: MockServerMutationArgs,
  ): Promise<boolean> {
    const result = await this.mockServerService.deleteMockServer(
      args.id,
      user.uid,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a mock server log by log ID',
  })
  @UseGuards(GqlAuthGuard)
  async deleteMockServerLog(
    @GqlUser() user: User,
    @Args({
      name: 'logID',
      type: () => ID,
      description: 'Id of the log to delete',
    })
    logID: string,
  ): Promise<boolean> {
    const result = await this.mockServerService.deleteMockServerLog(
      logID,
      user.uid,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }
}

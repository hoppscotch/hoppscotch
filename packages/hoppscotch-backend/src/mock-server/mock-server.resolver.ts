import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
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
} from './mock-server.model';
import * as E from 'fp-ts/Either';

@Resolver(() => MockServer)
export class MockServerResolver {
  constructor(private readonly mockServerService: MockServerService) {}

  @Query(() => [MockServer], {
    description: 'Get all mock servers for the authenticated user',
  })
  @UseGuards(GqlAuthGuard)
  async myMockServers(@GqlUser() user: User): Promise<MockServer[]> {
    return this.mockServerService.getUserMockServers(user.uid);
  }

  @Query(() => MockServer, {
    description: 'Get a specific mock server by ID',
  })
  @UseGuards(GqlAuthGuard)
  async mockServer(
    @Args('id') id: string,
    @GqlUser() user: User,
  ): Promise<MockServer> {
    const result = await this.mockServerService.getMockServer(id, user.uid);

    if (E.isLeft(result)) {
      throw new Error(result.left);
    }

    return result.right;
  }

  @Mutation(() => MockServer, {
    description: 'Create a new mock server',
  })
  @UseGuards(GqlAuthGuard)
  async createMockServer(
    @Args('input') input: CreateMockServerInput,
    @GqlUser() user: User,
  ): Promise<MockServer> {
    const result = await this.mockServerService.createMockServer(user, input);

    if (E.isLeft(result)) {
      throw new Error(result.left);
    }

    return result.right;
  }

  @Mutation(() => MockServer, {
    description: 'Update a mock server',
  })
  @UseGuards(GqlAuthGuard)
  async updateMockServer(
    @Args() args: MockServerMutationArgs,
    @Args('input') input: UpdateMockServerInput,
    @GqlUser() user: User,
  ): Promise<MockServer> {
    const result = await this.mockServerService.updateMockServer(
      args.id,
      user.uid,
      input,
    );

    if (E.isLeft(result)) {
      throw new Error(result.left);
    }

    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a mock server',
  })
  @UseGuards(GqlAuthGuard)
  async deleteMockServer(
    @Args() args: MockServerMutationArgs,
    @GqlUser() user: User,
  ): Promise<boolean> {
    const result = await this.mockServerService.deleteMockServer(
      args.id,
      user.uid,
    );

    if (E.isLeft(result)) {
      throw new Error(result.left);
    }

    return result.right;
  }
}

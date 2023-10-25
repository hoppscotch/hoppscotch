import {
  Args,
  ID,
  Resolver,
  Query,
  Mutation,
  Subscription,
} from '@nestjs/graphql';
import { SharedRequest } from './shared-requests.model';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { UseGuards } from '@nestjs/common';
import { SharedRequestService } from './shared-request.service';
import { UserService } from 'src/user/user.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import * as E from 'fp-ts/Either';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { throwErr } from 'src/utils';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { SkipThrottle } from '@nestjs/throttler';
import { PaginationArgs } from 'src/types/input-types.args';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => SharedRequest)
export class SharedRequestResolver {
  constructor(
    private readonly sharedRequestService: SharedRequestService,
    private readonly userService: UserService,
    private readonly pubsub: PubSubService,
  ) {}

  /* Queries */
  @Query(() => SharedRequest, {
    description: 'Resolves and returns a shared-request data',
  })
  @UseGuards(GqlAuthGuard)
  async sharedRequest(
    @Args({
      name: 'code',
      type: () => ID,
      description: 'The shared-request to fetch',
    })
    code: string,
  ) {
    const result = await this.sharedRequestService.getSharedRequest(code);

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Query(() => [SharedRequest], {
    description: 'List all shared-request the current user has generated',
  })
  @UseGuards(GqlAuthGuard)
  async mySharedRequest(
    @GqlUser() user: AuthUser,
    @Args() args: PaginationArgs,
  ) {
    return this.sharedRequestService.fetchUserSharedRequests(user.uid, args);
  }

  /* Mutations */
  @Mutation(() => SharedRequest, {
    description: 'Create a shared-request for the given request.',
  })
  @UseGuards(GqlAuthGuard)
  async createSharedRequest(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'request',
      description: 'JSON string of the request object',
    })
    request: string,
    @Args({
      name: 'properties',
      description: 'JSON string of the properties of the embed',
      nullable: true,
    })
    properties: string,
  ) {
    const result = await this.sharedRequestService.createSharedRequest(
      request,
      properties,
      user,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Revoke a user generated shared-request',
  })
  @UseGuards(GqlAuthGuard)
  async revokeSharedRequest(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'code',
      type: () => ID,
      description: 'The shared-request to resolve',
    })
    code: string,
  ) {
    const result = await this.sharedRequestService.revokeSharedRequest(
      code,
      user.uid,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  /* Subscriptions */
  @Subscription(() => SharedRequest, {
    description: 'Listen for shortcode creation',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  mySharedRequestCreated(@GqlUser() user: AuthUser) {
    return this.pubsub.asyncIterator(`shared_request/${user.uid}/created`);
  }
}

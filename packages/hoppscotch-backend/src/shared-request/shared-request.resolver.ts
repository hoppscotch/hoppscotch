import { Args, ID, Resolver, Query } from '@nestjs/graphql';
import { SharedRequest } from './shared-requests.model';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { UseGuards } from '@nestjs/common';
import { SharedRequestService } from './shared-request.service';
import { UserService } from 'src/user/user.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import * as E from 'fp-ts/Either';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { throwErr } from 'src/utils';

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
}

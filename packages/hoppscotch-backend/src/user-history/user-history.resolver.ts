import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserHistoryService } from './user-history.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { UserHistory } from './user-history.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';
import { User } from '../user/user.model';

@Resolver()
export class UserHistoryResolver {
  constructor(
    private readonly userHistoryService: UserHistoryService,
    private readonly pubsub: PubSubService,
  ) {}

  /* Mutations */

  @Mutation(() => UserHistory, {
    description: 'Adds a new REST/GQL request to user history',
  })
  @UseGuards(GqlAuthGuard)
  async addRequestToHistory(
    @GqlUser() user: User,
    @Args({
      name: 'reqData',
      description: 'JSON string of the request data',
    })
    reqData: string,
    @Args({
      name: 'resMetadata',
      description: 'JSON string of the response metadata',
    })
    resMetadata: string,
    @Args({
      name: 'reqType',
      description: 'string that denotes type of request REST or GQL',
    })
    reqType: string,
  ): Promise<UserHistory> {
    return await this.userHistoryService.addRequestToHistory(
      user.uid,
      reqData,
      resMetadata,
      reqType,
    );
  }
}

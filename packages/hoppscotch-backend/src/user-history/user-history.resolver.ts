import { Args, ID, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { UserHistoryService } from './user-history.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { UserHistory } from './user-history.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';
import { User } from '../user/user.model';
import { throwErr } from '../utils';
import * as E from 'fp-ts/Either';

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
    const createdHistory = await this.userHistoryService.addRequestToHistory(
      user.uid,
      reqData,
      resMetadata,
      reqType,
    );
    if (E.isLeft(createdHistory)) throwErr(createdHistory.left);
    return createdHistory.right;
  }

  @Mutation(() => UserHistory, {
    description: 'Stars/Unstars a REST/GQL request in user history',
  })
  @UseGuards(GqlAuthGuard)
  async starUnstarRequestInHistory(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      description: 'request id in history',
    })
    id: string,
  ): Promise<UserHistory> {
    const updatedHistory =
      await this.userHistoryService.starUnstarRequestInHistory(user.uid, id);
    if (E.isLeft(updatedHistory)) throwErr(updatedHistory.left);
    return updatedHistory.right;
  }

  @Mutation(() => UserHistory, {
    description: 'Removes a REST/GQL request from user history',
  })
  @UseGuards(GqlAuthGuard)
  async removeRequestFromHistory(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      description: 'request id in history',
    })
    id: string,
  ): Promise<UserHistory> {
    const deletedHistory =
      await this.userHistoryService.removeRequestFromHistory(user.uid, id);
    if (E.isLeft(deletedHistory)) throwErr(deletedHistory.left);
    return deletedHistory.right;
  }

  @Mutation(() => Number, {
    description:
      'Deletes all REST/GQL history for a user based on Request type',
  })
  @UseGuards(GqlAuthGuard)
  async deleteAllUserHistory(
    @GqlUser() user: User,
    @Args({
      name: 'reqType',
      description: 'string that denotes type of request REST or GQL',
    })
    reqType: string,
  ): Promise<number> {
    const deletedHistory = await this.userHistoryService.deleteAllUserHistory(
      user.uid,
      reqType,
    );
    if (E.isLeft(deletedHistory)) throwErr(deletedHistory.left);
    return deletedHistory.right;
  }

  /* Subscriptions */

  @Subscription(() => UserHistory, {
    description: 'Listen for User History Creation',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userHistoryCreated(
    @Args({
      name: 'userUid',
      description: 'user uid',
      type: () => ID,
    })
    userUid: string,
  ) {
    return this.pubsub.asyncIterator(`user_history/${userUid}/created`);
  }

  @Subscription(() => UserHistory, {
    description: 'Listen for User History update',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userHistoryUpdated(
    @Args({
      name: 'userUid',
      description: 'user uid',
      type: () => ID,
    })
    userUid: string,
  ) {
    return this.pubsub.asyncIterator(`user_history/${userUid}/updated`);
  }

  @Subscription(() => UserHistory, {
    description: 'Listen for User History deletion',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userHistoryDeleted(
    @Args({
      name: 'userUid',
      description: 'user uid',
      type: () => ID,
    })
    userUid: string,
  ) {
    return this.pubsub.asyncIterator(`user_history/${userUid}/deleted`);
  }
}

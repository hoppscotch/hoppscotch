import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SortService } from './sort.service';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { SortOptions } from 'src/types/SortOptions';
import * as E from 'fp-ts/Either';
import { UserCollection } from 'src/user-collection/user-collections.model';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserCollectionSortData } from './sort.model';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => UserCollection)
export class SortUserCollectionResolver {
  constructor(
    private readonly sortService: SortService,
    private readonly pubSub: PubSubService,
  ) {}

  // Mutations
  @Mutation(() => Boolean, {
    description: 'Sort user collections',
  })
  @UseGuards(GqlAuthGuard)
  async sortUserCollections(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'parentCollectionID',
      description: 'ID of the parent collection',
      type: () => ID,
      nullable: true,
    })
    parentCollectionID: string | null,
    @Args({
      name: 'sortOption',
      description: 'Sorting option',
      type: () => SortOptions,
    })
    sortOption: SortOptions,
  ): Promise<boolean> {
    const result = await this.sortService.sortUserCollections(
      user.uid,
      parentCollectionID,
      sortOption,
    );

    if (E.isLeft(result)) return false;
    return true;
  }

  // Subscriptions
  @Subscription(() => UserCollectionSortData, {
    description: 'Listen for User Root Collection Sort Events',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  userRootCollectionsSorted(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_coll_root/${user.uid}/sorted`);
  }

  @Subscription(() => UserCollectionSortData, {
    description: 'Listen for User Child Collection Sort Events',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  userChildCollectionsSorted(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_coll_child/${user.uid}/sorted`);
  }
}

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { TeamCollection } from 'src/team-collection/team-collection.model';
import { SortService } from './sort.service';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { TeamAccessRole } from 'src/team/team.model';
import { SortOptions } from 'src/types/SortOptions';
import * as E from 'fp-ts/Either';
import { SkipThrottle } from '@nestjs/throttler';
import { GqlTeamMemberGuard } from 'src/team/guards/gql-team-member.guard';
import { PubSubService } from 'src/pubsub/pubsub.service';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => TeamCollection)
export class SortTeamCollectionResolver {
  constructor(
    private readonly sortService: SortService,
    private readonly pubSub: PubSubService,
  ) {}

  // Mutations
  @Mutation(() => Boolean, {
    description: 'Sort team collections',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER, TeamAccessRole.EDITOR)
  async sortTeamCollections(
    @Args({
      name: 'teamID',
      description: 'ID of the team',
      type: () => ID,
    })
    teamID: string,
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
    const result = await this.sortService.sortTeamCollections(
      teamID,
      parentCollectionID,
      sortOption,
    );

    if (E.isLeft(result)) return false;
    return true;
  }

  // Subscriptions
  @Subscription(() => Boolean, {
    description: 'Listen for Team Root Collection Sort Events',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamRootCollectionsSorted(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ) {
    return this.pubSub.asyncIterator(`team_coll_root/${teamID}/sorted`);
  }

  @Subscription(() => ID, {
    description: 'Listen for Team Child Collection Sort Events',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamChildCollectionsSorted(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ) {
    return this.pubSub.asyncIterator(`team_coll_child/${teamID}/sorted`);
  }
}

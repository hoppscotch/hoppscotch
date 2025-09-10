import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { TeamCollection } from 'src/team-collection/team-collection.model';
import { SortService } from './sort.service';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlCollectionTeamMemberGuard } from 'src/team-collection/guards/gql-collection-team-member.guard';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { TeamAccessRole } from 'src/team/team.model';
import { SortOptions } from 'src/types/SortOptions';
import * as E from 'fp-ts/Either';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => TeamCollection)
export class SortTeamCollectionResolver {
  constructor(private readonly sortService: SortService) {}

  @Mutation(() => Boolean, {
    description: 'Sort team collections',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
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
}

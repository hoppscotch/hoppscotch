import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Subscription, ID } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { GqlTeamMemberGuard } from 'src/team/guards/gql-team-member.guard';
import { TeamAccessRole } from 'src/team/team.model';
import { throwErr } from 'src/utils';
import { GqlTeamEnvTeamGuard } from './gql-team-env-team.guard';
import { TeamEnvironment } from './team-environments.model';
import { TeamEnvironmentsService } from './team-environments.service';
import * as E from 'fp-ts/Either';
import {
  CreateTeamEnvironmentArgs,
  UpdateTeamEnvironmentArgs,
} from './input-type.args';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => 'TeamEnvironment')
export class TeamEnvironmentsResolver {
  constructor(
    private readonly teamEnvironmentsService: TeamEnvironmentsService,
    private readonly pubsub: PubSubService,
  ) {}

  /* Mutations */

  @Mutation(() => TeamEnvironment, {
    description: 'Create a new Team Environment for given Team ID',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER, TeamAccessRole.EDITOR)
  async createTeamEnvironment(
    @Args() args: CreateTeamEnvironmentArgs,
  ): Promise<TeamEnvironment> {
    const teamEnvironment =
      await this.teamEnvironmentsService.createTeamEnvironment(
        args.name,
        args.teamID,
        args.variables,
      );

    if (E.isLeft(teamEnvironment)) throwErr(teamEnvironment.left);
    return teamEnvironment.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a Team Environment for given Team ID',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER, TeamAccessRole.EDITOR)
  async deleteTeamEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the Team Environment',
      type: () => ID,
    })
    id: string,
  ): Promise<boolean> {
    const isDeleted =
      await this.teamEnvironmentsService.deleteTeamEnvironment(id);

    if (E.isLeft(isDeleted)) throwErr(isDeleted.left);
    return isDeleted.right;
  }

  @Mutation(() => TeamEnvironment, {
    description:
      'Add/Edit a single environment variable or variables to a Team Environment',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER, TeamAccessRole.EDITOR)
  async updateTeamEnvironment(
    @Args()
    args: UpdateTeamEnvironmentArgs,
  ): Promise<TeamEnvironment> {
    const updatedTeamEnvironment =
      await this.teamEnvironmentsService.updateTeamEnvironment(
        args.id,
        args.name,
        args.variables,
      );

    if (E.isLeft(updatedTeamEnvironment)) throwErr(updatedTeamEnvironment.left);
    return updatedTeamEnvironment.right;
  }

  @Mutation(() => TeamEnvironment, {
    description: 'Delete all variables from a Team Environment',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER, TeamAccessRole.EDITOR)
  async deleteAllVariablesFromTeamEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the Team Environment',
      type: () => ID,
    })
    id: string,
  ): Promise<TeamEnvironment> {
    const teamEnvironment =
      await this.teamEnvironmentsService.deleteAllVariablesFromTeamEnvironment(
        id,
      );

    if (E.isLeft(teamEnvironment)) throwErr(teamEnvironment.left);
    return teamEnvironment.right;
  }

  @Mutation(() => TeamEnvironment, {
    description: 'Create a duplicate of an existing environment',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER, TeamAccessRole.EDITOR)
  async createDuplicateEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the Team Environment',
      type: () => ID,
    })
    id: string,
  ): Promise<TeamEnvironment> {
    const res =
      await this.teamEnvironmentsService.createDuplicateEnvironment(id);

    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  /* Subscriptions */

  @Subscription(() => TeamEnvironment, {
    description: 'Listen for Team Environment Updates',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  teamEnvironmentUpdated(
    @Args({
      name: 'teamID',
      description: 'ID of the Team',
      type: () => ID,
    })
    teamID: string,
  ) {
    return this.pubsub.asyncIterator(`team_environment/${teamID}/updated`);
  }

  @Subscription(() => TeamEnvironment, {
    description: 'Listen for Team Environment Creation Messages',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  teamEnvironmentCreated(
    @Args({
      name: 'teamID',
      description: 'ID of the Team',
      type: () => ID,
    })
    teamID: string,
  ) {
    return this.pubsub.asyncIterator(`team_environment/${teamID}/created`);
  }

  @Subscription(() => TeamEnvironment, {
    description: 'Listen for Team Environment Deletion Messages',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  teamEnvironmentDeleted(
    @Args({
      name: 'teamID',
      description: 'ID of the Team',
      type: () => ID,
    })
    teamID: string,
  ) {
    return this.pubsub.asyncIterator(`team_environment/${teamID}/deleted`);
  }
}

import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Subscription, ID } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { GqlTeamMemberGuard } from 'src/team/guards/gql-team-member.guard';
import { TeamMemberRole } from 'src/team/team.model';
import { throwErr } from 'src/utils';
import { GqlTeamEnvTeamGuard } from './gql-team-env-team.guard';
import { TeamEnvironment } from './team-environments.model';
import { TeamEnvironmentsService } from './team-environments.service';
import * as E from 'fp-ts/Either';

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
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  createTeamEnvironment(
    @Args({
      name: 'name',
      description: 'Name of the Team Environment',
    })
    name: string,
    @Args({
      name: 'teamID',
      description: 'ID of the Team',
      type: () => ID,
    })
    teamID: string,
    @Args({
      name: 'variables',
      description: 'JSON string of the variables object',
    })
    variables: string,
  ): Promise<TeamEnvironment> {
    return this.teamEnvironmentsService.createTeamEnvironment(
      name,
      teamID,
      variables,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Delete a Team Environment for given Team ID',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  async deleteTeamEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the Team Environment',
      type: () => ID,
    })
    id: string,
  ): Promise<boolean> {
    const res = await this.teamEnvironmentsService.deleteTeamEnvironment(id);

    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => TeamEnvironment, {
    description:
      'Add/Edit a single environment variable or variables to a Team Environment',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  async updateTeamEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the Team Environment',
      type: () => ID,
    })
    id: string,
    @Args({
      name: 'name',
      description: 'Name of the Team Environment',
    })
    name: string,
    @Args({
      name: 'variables',
      description: 'JSON string of the variables object',
    })
    variables: string,
  ): Promise<TeamEnvironment> {
    const res = await this.teamEnvironmentsService.updateTeamEnvironment(
      id,
      name,
      variables,
    );

    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => TeamEnvironment, {
    description: 'Delete all variables from a Team Environment',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  async deleteAllVariablesFromTeamEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the Team Environment',
      type: () => ID,
    })
    id: string,
  ): Promise<TeamEnvironment> {
    const res =
      await this.teamEnvironmentsService.deleteAllVariablesFromTeamEnvironment(
        id,
      );

    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => TeamEnvironment, {
    description: 'Create a duplicate of an existing environment',
  })
  @UseGuards(GqlAuthGuard, GqlTeamEnvTeamGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  async createDuplicateEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the Team Environment',
      type: () => ID,
    })
    id: string,
  ): Promise<TeamEnvironment> {
    const res = await this.teamEnvironmentsService.createDuplicateEnvironment(
      id,
    );

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
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
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
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
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
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
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

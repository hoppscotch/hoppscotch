import { Team, TeamMember, TeamAccessRole } from './team.model';
import {
  Resolver,
  ResolveField,
  Args,
  Parent,
  Query,
  Mutation,
  Int,
  Subscription,
  ID,
} from '@nestjs/graphql';
import { TeamService } from './team.service';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';
import { UseGuards } from '@nestjs/common';
import { RequiresTeamRole } from './decorators/requires-team-role.decorator';
import { GqlTeamMemberGuard } from './guards/gql-team-member.guard';
import { PubSubService } from '../pubsub/pubsub.service';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { AuthUser } from 'src/types/AuthUser';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => Team)
export class TeamResolver {
  constructor(
    private readonly teamService: TeamService,
    private readonly pubsub: PubSubService,
  ) {}

  // Field Resolvers
  // TODO: Deprecate this
  @ResolveField(() => [TeamMember], {
    description: 'Returns the list of members of a team',
    complexity: 10,
  })
  members(
    @Parent() team: Team,
    @Args({
      name: 'cursor',
      type: () => ID,
      description:
        'The ID of the last returned team member entry (used for pagination)',
      nullable: true,
    })
    cursor?: string,
  ): Promise<TeamMember[]> {
    return this.teamService.getMembersOfTeam(team.id, cursor ?? null);
  }

  @ResolveField(() => [TeamMember], {
    description: 'Returns the list of members of a team',
    complexity: 10,
  })
  teamMembers(@Parent() team: Team): Promise<TeamMember[]> {
    return this.teamService.getTeamMembers(team.id);
  }

  @ResolveField(() => TeamAccessRole, {
    description: 'The role of the current user in the team',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  myRole(
    @Parent() team: Team,
    @GqlUser() user: AuthUser,
  ): Promise<TeamAccessRole | null> {
    return this.teamService.getRoleOfUserInTeam(team.id, user.uid);
  }

  @ResolveField(() => Int, {
    description: 'The number of users with the OWNER role in the team',
  })
  ownersCount(@Parent() team: Team): Promise<number> {
    return this.teamService.getCountOfUsersWithRoleInTeam(
      team.id,
      TeamAccessRole.OWNER,
    );
  }

  @ResolveField(() => Int, {
    description: 'The number of users with the EDITOR role in the team',
  })
  editorsCount(@Parent() team: Team): Promise<number> {
    return this.teamService.getCountOfUsersWithRoleInTeam(
      team.id,
      TeamAccessRole.EDITOR,
    );
  }

  @ResolveField(() => Int, {
    description: 'The number of users with the VIEWER role in the team',
  })
  viewersCount(@Parent() team: Team): Promise<number> {
    return this.teamService.getCountOfUsersWithRoleInTeam(
      team.id,
      TeamAccessRole.VIEWER,
    );
  }

  // Query
  @Query(() => [Team], {
    description: 'List of teams that the executing user belongs to.',
  })
  @UseGuards(GqlAuthGuard)
  myTeams(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'cursor',
      type: () => ID,
      description:
        'The ID of the last returned team entry (used for pagination)',
      nullable: true,
    })
    cursor?: string,
  ): Promise<Team[]> {
    return this.teamService.getTeamsOfUser(user.uid, cursor ?? null);
  }

  @Query(() => Team, {
    description: 'Returns the detail of the team with the given ID',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamAccessRole.VIEWER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.OWNER,
  )
  team(
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'ID of the team to check',
    })
    teamID: string,
  ): Promise<Team | null> {
    return this.teamService.getTeamWithID(teamID);
  }

  // Mutation
  @Mutation(() => Team, {
    description: 'Creates a team owned by the executing user',
  })
  @UseGuards(GqlAuthGuard)
  async createTeam(
    @GqlUser() user: AuthUser,
    @Args({ name: 'name', description: 'Displayed name of the team' })
    name: string,
  ): Promise<Team> {
    const team = await this.teamService.createTeam(name, user.uid);
    if (E.isLeft(team)) throwErr(team.left);
    return team.right;
  }

  @Mutation(() => Boolean, {
    description: 'Leaves a team the executing user is a part of',
  })
  @UseGuards(GqlAuthGuard)
  async leaveTeam(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'teamID',
      description: 'ID of the Team to leave',
      type: () => ID,
    })
    teamID: string,
  ): Promise<boolean> {
    const isUserLeft = await this.teamService.leaveTeam(teamID, user.uid);
    if (E.isLeft(isUserLeft)) throwErr(isUserLeft.left);
    return isUserLeft.right;
  }

  @Mutation(() => Boolean, {
    description: 'Removes the team member from the team',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER)
  async removeTeamMember(
    @GqlUser() _user: AuthUser,
    @Args({
      name: 'teamID',
      description: 'ID of the Team to remove user from',
      type: () => ID,
    })
    teamID: string,
    @Args({
      name: 'userUid',
      description: 'ID of the user to remove from the given team',
      type: () => ID,
    })
    userUid: string,
  ): Promise<boolean> {
    const isRemoved = await this.teamService.leaveTeam(teamID, userUid);
    if (E.isLeft(isRemoved)) throwErr(isRemoved.left);
    return isRemoved.right;
  }

  @Mutation(() => Team, {
    description: 'Renames a team',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER)
  async renameTeam(
    @Args({ name: 'teamID', description: 'ID of the team', type: () => ID })
    teamID: string,
    @Args({ name: 'newName', description: 'The updated name of the team' })
    newName: string,
  ): Promise<Team> {
    const team = await this.teamService.renameTeam(teamID, newName);
    if (E.isLeft(team)) throwErr(team.left);
    return team.right;
  }

  @Mutation(() => Boolean, {
    description: 'Deletes the team',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(TeamAccessRole.OWNER)
  async deleteTeam(
    @Args({ name: 'teamID', description: 'ID of the team', type: () => ID })
    teamID: string,
  ): Promise<boolean> {
    const isDeleted = await this.teamService.deleteTeam(teamID);
    if (E.isLeft(isDeleted)) throwErr(isDeleted.left);
    return isDeleted.right;
  }

  @Mutation(() => TeamMember, {
    description: 'Update role of a team member the executing user owns',
  })
  @RequiresTeamRole(TeamAccessRole.OWNER)
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  async updateTeamAccessRole(
    @Args({
      name: 'teamID',
      description: 'ID of the affected team',
      type: () => ID,
    })
    teamID: string,
    @Args({
      name: 'userUid',
      description: 'UID of the affected user',
      type: () => ID,
    })
    userUid: string,
    @Args({
      name: 'newRole',
      description: 'Updated role value',
      type: () => TeamAccessRole,
    })
    newRole: TeamAccessRole,
  ): Promise<TeamMember> {
    const teamMember = await this.teamService.updateTeamAccessRole(
      teamID,
      userUid,
      newRole,
    );
    if (E.isLeft(teamMember)) throwErr(teamMember.left);
    return teamMember.right;
  }

  // Subscriptions
  @Subscription(() => TeamMember, {
    description:
      'Listen to when a new team member being added to the team. The emitted value is the new team member added.',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamMemberAdded(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<TeamMember> {
    return this.pubsub.asyncIterator(`team/${teamID}/member_added`);
  }

  @Subscription(() => TeamMember, {
    description:
      'Listen to when a team member status has been updated. The emitted value is the new team member status',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamMemberUpdated(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<TeamMember> {
    return this.pubsub.asyncIterator(`team/${teamID}/member_updated`);
  }

  @Subscription(() => ID, {
    description:
      'Listen to when a team member has been removed. The emitted value is the uid of the user removed',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamAccessRole.OWNER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.VIEWER,
  )
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamMemberRemoved(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<string> {
    return this.pubsub.asyncIterator(`team/${teamID}/member_removed`);
  }
}

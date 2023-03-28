import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Admin } from './admin.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlAdminGuard } from './guards/gql-admin.guard';
import { GqlAdmin } from './decorators/gql-admin.decorator';
import { AdminService } from './admin.service';
import * as E from 'fp-ts/Either';
import { throwErr } from '../utils';
import { AuthUser } from '../types/AuthUser';
import { InvitedUser } from './invited-user.model';
import { GqlUser } from '../decorators/gql-user.decorator';
import { PubSubService } from '../pubsub/pubsub.service';
import { Team, TeamMember } from '../team/team.model';
import { User } from '../user/user.model';
import { TeamInvitation } from '../team-invitation/team-invitation.model';
import { PaginationArgs } from '../types/input-types.args';
import {
  AddUserToTeamArgs,
  ChangeUserRoleInTeamArgs,
} from './input-types.args';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => Admin)
export class AdminResolver {
  constructor(
    private adminService: AdminService,
    private readonly pubsub: PubSubService,
  ) {}
  // Query
  @Query(() => Admin, {
    description: 'Gives details of the admin executing this query',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  admin(@GqlAdmin() admin: Admin) {
    return admin;
  }

  @ResolveField(() => [User], {
    description: 'Returns a list of all admin users in infra',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async admins() {
    const admins = await this.adminService.fetchAdmins();
    return admins;
  }
  @ResolveField(() => User, {
    description: 'Returns a user info by UID',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async userInfo(
    @Args({
      name: 'userUid',
      type: () => ID,
      description: 'The user UID',
    })
    userUid: string,
  ): Promise<AuthUser> {
    const user = await this.adminService.fetchUserInfo(userUid);
    if (E.isLeft(user)) throwErr(user.left);
    return user.right;
  }

  @ResolveField(() => [User], {
    description: 'Returns a list of all the users in infra',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async allUsers(
    @Parent() admin: Admin,
    @Args() args: PaginationArgs,
  ): Promise<AuthUser[]> {
    const users = await this.adminService.fetchUsers(args.cursor, args.take);
    return users;
  }

  @ResolveField(() => [InvitedUser], {
    description: 'Returns a list of all the invited users',
  })
  async invitedUsers(@Parent() admin: Admin): Promise<InvitedUser[]> {
    const users = await this.adminService.fetchInvitedUsers();
    return users;
  }

  @ResolveField(() => [Team], {
    description: 'Returns a list of all the teams in the infra',
  })
  async allTeams(
    @Parent() admin: Admin,
    @Args() args: PaginationArgs,
  ): Promise<Team[]> {
    const teams = await this.adminService.fetchAllTeams(args.cursor, args.take);
    return teams;
  }
  @ResolveField(() => Team, {
    description: 'Returns a team info by ID when requested by Admin',
  })
  async teamInfo(
    @Parent() admin: Admin,
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Team ID for which info to fetch',
    })
    teamID: string,
  ): Promise<Team> {
    const team = await this.adminService.getTeamInfo(teamID);
    if (E.isLeft(team)) throwErr(team.left);
    return team.right;
  }

  @ResolveField(() => Number, {
    description: 'Return count of all the members in a team',
  })
  async membersCountInTeam(
    @Parent() admin: Admin,
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Team ID for which team members to fetch',
      nullable: false,
    })
    teamID: string,
  ): Promise<number> {
    const teamMembersCount = await this.adminService.membersCountInTeam(teamID);
    return teamMembersCount;
  }

  @ResolveField(() => Number, {
    description: 'Return count of all the stored collections in a team',
  })
  async collectionCountInTeam(
    @Parent() admin: Admin,
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Team ID for which team members to fetch',
    })
    teamID: string,
  ): Promise<number> {
    const teamCollCount = await this.adminService.collectionCountInTeam(teamID);
    return teamCollCount;
  }
  @ResolveField(() => Number, {
    description: 'Return count of all the stored requests in a team',
  })
  async requestCountInTeam(
    @Parent() admin: Admin,
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Team ID for which team members to fetch',
    })
    teamID: string,
  ): Promise<number> {
    const teamReqCount = await this.adminService.requestCountInTeam(teamID);
    return teamReqCount;
  }

  @ResolveField(() => Number, {
    description: 'Return count of all the stored environments in a team',
  })
  async environmentCountInTeam(
    @Parent() admin: Admin,
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Team ID for which team members to fetch',
    })
    teamID: string,
  ): Promise<number> {
    const envsCount = await this.adminService.environmentCountInTeam(teamID);
    return envsCount;
  }

  @ResolveField(() => [TeamInvitation], {
    description: 'Return all the pending invitations in a team',
  })
  async pendingInvitationCountInTeam(
    @Parent() admin: Admin,
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Team ID for which team members to fetch',
    })
    teamID: string,
  ) {
    const invitations = await this.adminService.pendingInvitationCountInTeam(
      teamID,
    );
    return invitations;
  }

  @ResolveField(() => Number, {
    description: 'Return total number of Users in organization',
  })
  async usersCount() {
    return this.adminService.getUsersCount();
  }

  @ResolveField(() => Number, {
    description: 'Return total number of Teams in organization',
  })
  async teamsCount() {
    return this.adminService.getTeamsCount();
  }

  @ResolveField(() => Number, {
    description: 'Return total number of Team Collections in organization',
  })
  async teamCollectionsCount() {
    return this.adminService.getTeamCollectionsCount();
  }

  @ResolveField(() => Number, {
    description: 'Return total number of Team Requests in organization',
  })
  async teamRequestsCount() {
    return this.adminService.getTeamRequestsCount();
  }

  // Mutations
  @Mutation(() => InvitedUser, {
    description: 'Invite a user to the infra using email',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async inviteNewUser(
    @GqlUser() adminUser: AuthUser,
    @Args({
      name: 'inviteeEmail',
      description: 'invitee email',
    })
    inviteeEmail: string,
  ): Promise<InvitedUser> {
    const invitedUser = await this.adminService.inviteUserToSignInViaEmail(
      adminUser.uid,
      adminUser.email,
      inviteeEmail,
    );
    if (E.isLeft(invitedUser)) throwErr(invitedUser.left);
    return invitedUser.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete an user account from infra',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async removeUserByAdmin(
    @Args({
      name: 'userUID',
      description: 'users UID',
      type: () => ID,
    })
    userUID: string,
  ): Promise<boolean> {
    const invitedUser = await this.adminService.removeUserAccount(userUID);
    if (E.isLeft(invitedUser)) throwErr(invitedUser.left);
    return invitedUser.right;
  }
  @Mutation(() => Boolean, {
    description: 'Make user an admin',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async makeUserAdmin(
    @Args({
      name: 'userUID',
      description: 'users UID',
      type: () => ID,
    })
    userUID: string,
  ): Promise<boolean> {
    const admin = await this.adminService.makeUserAdmin(userUID);
    if (E.isLeft(admin)) throwErr(admin.left);
    return admin.right;
  }

  @Mutation(() => Boolean, {
    description: 'Remove user as admin',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async removeUserAsAdmin(
    @Args({
      name: 'userUID',
      description: 'users UID',
      type: () => ID,
    })
    userUID: string,
  ): Promise<boolean> {
    const admin = await this.adminService.removeUserAsAdmin(userUID);
    if (E.isLeft(admin)) throwErr(admin.left);
    return admin.right;
  }

  @Mutation(() => Team, {
    description:
      'Create a new team by providing the user uid to nominate as Team owner',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async createTeamByAdmin(
    @GqlAdmin() adminUser: Admin,
    @Args({
      name: 'userUid',
      description: 'users uid to make team owner',
      type: () => ID,
    })
    userUid: string,
    @Args({ name: 'name', description: 'Displayed name of the team' })
    name: string,
  ): Promise<Team> {
    const createdTeam = await this.adminService.createATeam(userUid, name);
    if (E.isLeft(createdTeam)) throwErr(createdTeam.left);
    return createdTeam.right;
  }
  @Mutation(() => TeamMember, {
    description: 'Change the role of a user in a team',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async changeUserRoleInTeamByAdmin(
    @GqlAdmin() adminUser: Admin,
    @Args() args: ChangeUserRoleInTeamArgs,
  ): Promise<TeamMember> {
    const updatedRole = await this.adminService.changeRoleOfUserTeam(
      args.userUID,
      args.teamID,
      args.newRole,
    );
    if (E.isLeft(updatedRole)) throwErr(updatedRole.left);
    return updatedRole.right;
  }
  @Mutation(() => Boolean, {
    description: 'Remove the user from a team',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async removeUserFromTeamByAdmin(
    @GqlAdmin() adminUser: Admin,
    @Args({
      name: 'userUid',
      description: 'users UID',
      type: () => ID,
    })
    userUid: string,
    @Args({
      name: 'teamID',
      description: 'team ID',
      type: () => ID,
    })
    teamID: string,
  ): Promise<boolean> {
    const removedUser = await this.adminService.removeUserFromTeam(
      userUid,
      teamID,
    );
    if (E.isLeft(removedUser)) throwErr(removedUser.left);
    return removedUser.right;
  }
  @Mutation(() => TeamMember, {
    description: 'Add a user to a team with email and team member role',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async addUserToTeamByAdmin(
    @GqlAdmin() adminUser: Admin,
    @Args() args: AddUserToTeamArgs,
  ): Promise<TeamMember> {
    const addedUser = await this.adminService.addUserToTeam(
      args.teamID,
      args.userEmail,
      args.role,
    );
    if (E.isLeft(addedUser)) throwErr(addedUser.left);
    return addedUser.right;
  }

  @Mutation(() => Team, {
    description: 'Change a team name',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async renameTeamByAdmin(
    @GqlAdmin() adminUser: Admin,
    @Args({ name: 'teamID', description: 'ID of the team', type: () => ID })
    teamID: string,
    @Args({ name: 'newName', description: 'The updated name of the team' })
    newName: string,
  ): Promise<Team> {
    const renamedTeam = await this.adminService.renameATeam(teamID, newName);
    if (E.isLeft(renamedTeam)) throwErr(renamedTeam.left);
    return renamedTeam.right;
  }
  @Mutation(() => Boolean, {
    description: 'Delete a team',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async deleteTeamByAdmin(
    @Args({ name: 'teamID', description: 'ID of the team', type: () => ID })
    teamID: string,
  ): Promise<boolean> {
    const deletedTeam = await this.adminService.deleteATeam(teamID);
    if (E.isLeft(deletedTeam)) throwErr(deletedTeam.left);
    return deletedTeam.right;
  }

  /* Subscriptions */

  @Subscription(() => InvitedUser, {
    description: 'Listen for User Invitation',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  userInvited(@GqlUser() admin: AuthUser) {
    return this.pubsub.asyncIterator(`admin/${admin.uid}/invited`);
  }
}

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
import { TeamInvitation } from './team-invitation.model';
import { TeamInvitationService } from './team-invitation.service';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { Team, TeamMember, TeamMemberRole } from 'src/team/team.model';
import { EmailCodec } from 'src/types/Email';
import {
  INVALID_EMAIL,
  TEAM_INVITE_EMAIL_DO_NOT_MATCH,
  TEAM_INVITE_NO_INVITE_FOUND,
  USER_NOT_FOUND,
} from 'src/errors';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { User } from 'src/user/user.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { TeamService } from 'src/team/team.service';
import { throwErr } from 'src/utils';
import { TeamInviteeGuard } from './team-invitee.guard';
import { GqlTeamMemberGuard } from 'src/team/guards/gql-team-member.guard';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { TeamInviteViewerGuard } from './team-invite-viewer.guard';
import { TeamInviteTeamOwnerGuard } from './team-invite-team-owner.guard';
import { UserService } from 'src/user/user.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => TeamInvitation)
export class TeamInvitationResolver {
  constructor(
    private readonly userService: UserService,
    private readonly teamService: TeamService,
    private readonly teamInvitationService: TeamInvitationService,

    private readonly pubsub: PubSubService,
  ) {}

  @ResolveField(() => Team, {
    complexity: 5,
    description: 'Get the team associated to the invite',
  })
  async team(@Parent() teamInvitation: TeamInvitation): Promise<Team> {
    return pipe(
      this.teamService.getTeamWithIDTE(teamInvitation.teamID),
      TE.getOrElse(throwErr),
    )();
  }

  @ResolveField(() => User, {
    complexity: 5,
    description: 'Get the creator of the invite',
  })
  async creator(@Parent() teamInvitation: TeamInvitation): Promise<User> {
    const user = await this.userService.findUserById(teamInvitation.creatorUid);
    if (O.isNone(user)) throwErr(USER_NOT_FOUND);

    return {
      ...user.value,
      currentGQLSession: JSON.stringify(user.value.currentGQLSession),
      currentRESTSession: JSON.stringify(user.value.currentRESTSession),
    };
  }

  @Query(() => TeamInvitation, {
    description:
      'Gets the Team Invitation with the given ID, or null if not exists',
  })
  @UseGuards(GqlAuthGuard, TeamInviteViewerGuard)
  teamInvitation(
    @GqlUser() user: User,
    @Args({
      name: 'inviteID',
      description: 'ID of the Team Invitation to lookup',
      type: () => ID,
    })
    inviteID: string,
  ): Promise<TeamInvitation> {
    return pipe(
      this.teamInvitationService.getInvitation(inviteID),
      TE.fromTaskOption(() => TEAM_INVITE_NO_INVITE_FOUND),
      TE.chainW(
        TE.fromPredicate(
          (a) => a.inviteeEmail.toLowerCase() === user.email?.toLowerCase(),
          () => TEAM_INVITE_EMAIL_DO_NOT_MATCH,
        ),
      ),
      TE.getOrElse(throwErr),
    )();
  }

  @Mutation(() => TeamInvitation, {
    description: 'Creates a Team Invitation',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER)
  createTeamInvitation(
    @GqlUser()
    user: User,

    @Args({
      name: 'teamID',
      description: 'ID of the Team ID to invite from',
      type: () => ID,
    })
    teamID: string,
    @Args({
      name: 'inviteeEmail',
      description: 'Email of the user to invite',
    })
    inviteeEmail: string,
    @Args({
      name: 'inviteeRole',
      type: () => TeamMemberRole,
      description: 'Role to be given to the user',
    })
    inviteeRole: TeamMemberRole,
  ): Promise<TeamInvitation> {
    return pipe(
      TE.Do,

      // Validate email
      TE.bindW('email', () =>
        pipe(
          EmailCodec.decode(inviteeEmail),
          TE.fromEither,
          TE.mapLeft(() => INVALID_EMAIL),
        ),
      ),

      // Validate and get Team
      TE.bindW('team', () => this.teamService.getTeamWithIDTE(teamID)),

      // Create team
      TE.chainW(({ email, team }) =>
        this.teamInvitationService.createInvitation(
          user,
          team,
          email,
          inviteeRole,
        ),
      ),

      // If failed, throw err (so the message is passed) else return value
      TE.getOrElse(throwErr),
    )();
  }

  @Mutation(() => Boolean, {
    description: 'Revokes an invitation and deletes it',
  })
  @UseGuards(GqlAuthGuard, TeamInviteTeamOwnerGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER)
  revokeTeamInvitation(
    @Args({
      name: 'inviteID',
      type: () => ID,
      description: 'ID of the invite to revoke',
    })
    inviteID: string,
  ): Promise<true> {
    return pipe(
      this.teamInvitationService.revokeInvitation(inviteID),
      TE.map(() => true as const),
      TE.getOrElse(throwErr),
    )();
  }

  @Mutation(() => TeamMember, {
    description: 'Accept an Invitation',
  })
  @UseGuards(GqlAuthGuard, TeamInviteeGuard)
  acceptTeamInvitation(
    @GqlUser() user: User,
    @Args({
      name: 'inviteID',
      type: () => ID,
      description: 'ID of the Invite to accept',
    })
    inviteID: string,
  ): Promise<TeamMember> {
    return pipe(
      this.teamInvitationService.acceptInvitation(inviteID, user),
      TE.getOrElse(throwErr),
    )();
  }

  // Subscriptions
  @Subscription(() => TeamInvitation, {
    description: 'Listens to when a Team Invitation is added',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
  )
  teamInvitationAdded(
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'ID of the Team to listen to',
    })
    teamID: string,
  ): AsyncIterator<TeamInvitation> {
    return this.pubsub.asyncIterator(`team/${teamID}/invite_added`);
  }

  @Subscription(() => ID, {
    description: 'Listens to when a Team Invitation is removed',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
  )
  teamInvitationRemoved(
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'ID of the Team to listen to',
    })
    teamID: string,
  ): AsyncIterator<string> {
    return this.pubsub.asyncIterator(`team/${teamID}/invite_removed`);
  }
}

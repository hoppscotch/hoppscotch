import { Injectable } from '@nestjs/common';
import * as T from 'fp-ts/Task';
import * as O from 'fp-ts/Option';
import * as TO from 'fp-ts/TaskOption';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe, flow, constVoid } from 'fp-ts/function';
import { PrismaService } from 'src/prisma/prisma.service';
import { Team, TeamMemberRole } from 'src/team/team.model';
import { Email } from 'src/types/Email';
import { User } from 'src/user/user.model';
import { TeamService } from 'src/team/team.service';
import {
  INVALID_EMAIL,
  TEAM_INVITE_ALREADY_MEMBER,
  TEAM_INVITE_EMAIL_DO_NOT_MATCH,
  TEAM_INVITE_MEMBER_HAS_INVITE,
  TEAM_INVITE_NO_INVITE_FOUND,
} from 'src/errors';
import { TeamInvitation } from './team-invitation.model';
import { MailerService } from 'src/mailer/mailer.service';
import { UserService } from 'src/user/user.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { validateEmail } from '../utils';

@Injectable()
export class TeamInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly teamService: TeamService,
    private readonly mailerService: MailerService,

    private readonly pubsub: PubSubService,
  ) {
    this.getInvitation = this.getInvitation.bind(this);
  }

  getInvitation(inviteID: string): TO.TaskOption<TeamInvitation> {
    return pipe(
      () =>
        this.prisma.teamInvitation.findUnique({
          where: {
            id: inviteID,
          },
        }),
      TO.fromTask,
      TO.chain(flow(O.fromNullable, TO.fromOption)),
      TO.map((x) => x as TeamInvitation),
    );
  }

  getInvitationWithEmail(email: Email, team: Team) {
    return pipe(
      () =>
        this.prisma.teamInvitation.findUnique({
          where: {
            teamID_inviteeEmail: {
              inviteeEmail: email,
              teamID: team.id,
            },
          },
        }),
      TO.fromTask,
      TO.chain(flow(O.fromNullable, TO.fromOption)),
    );
  }

  /**
   * Get the team invite for an invitee with email and teamID.
   * @param inviteeEmail invitee email
   * @param teamID team id
   * @returns an Either of team invitation for the invitee or error
   */
  async getTeamInviteByEmailAndTeamID(inviteeEmail: string, teamID: string) {
    const isEmailValid = validateEmail(inviteeEmail);
    if (!isEmailValid) return E.left(INVALID_EMAIL);

    try {
      const teamInvite = await this.prisma.teamInvitation.findUniqueOrThrow({
        where: {
          teamID_inviteeEmail: {
            inviteeEmail: inviteeEmail,
            teamID: teamID,
          },
        },
      });

      return E.right(teamInvite);
    } catch (e) {
      return E.left(TEAM_INVITE_NO_INVITE_FOUND);
    }
  }

  createInvitation(
    creator: User,
    team: Team,
    inviteeEmail: Email,
    inviteeRole: TeamMemberRole,
  ) {
    return pipe(
      // Perform all validation checks
      TE.sequenceArray([
        // creator should be a TeamMember
        pipe(
          this.teamService.getTeamMemberTE(team.id, creator.uid),
          TE.map(constVoid),
        ),

        // Invitee should not be a team member
        pipe(
          async () => await this.userService.findUserByEmail(inviteeEmail),
          TO.foldW(
            () => TE.right(undefined), // If no user, short circuit to completion
            (user) =>
              pipe(
                // If user is found, check if team member
                this.teamService.getTeamMemberTE(team.id, user.uid),
                TE.foldW(
                  () => TE.right(undefined), // Not team-member, this is good
                  () => TE.left(TEAM_INVITE_ALREADY_MEMBER), // Is team member, not good
                ),
              ),
          ),
          TE.map(constVoid),
        ),

        // Should not have an existing invite
        pipe(
          this.getInvitationWithEmail(inviteeEmail, team),
          TE.fromTaskOption(() => null),
          TE.swap,
          TE.map(constVoid),
          TE.mapLeft(() => TEAM_INVITE_MEMBER_HAS_INVITE),
        ),
      ]),

      // Create the invitation
      TE.chainTaskK(
        () => () =>
          this.prisma.teamInvitation.create({
            data: {
              teamID: team.id,
              inviteeEmail,
              inviteeRole,
              creatorUid: creator.uid,
            },
          }),
      ),

      // Send email, this is a side effect
      TE.chainFirstTaskK((invitation) =>
        pipe(
          this.mailerService.sendMail(inviteeEmail, {
            template: 'team-invitation',
            variables: {
              invitee: creator.displayName ?? 'A Hoppscotch User',
              action_url: `${process.env.VITE_BASE_URL}/join-team?id=${invitation.id}`,
              invite_team_name: team.name,
            },
          }),

          TE.getOrElseW(() => T.of(undefined)), // This value doesn't matter as we don't mind the return value (chainFirst) as long as the task completes
        ),
      ),

      // Send PubSub topic
      TE.chainFirstTaskK((invitation) =>
        TE.fromTask(async () => {
          const inv: TeamInvitation = {
            id: invitation.id,
            teamID: invitation.teamID,
            creatorUid: invitation.creatorUid,
            inviteeEmail: invitation.inviteeEmail,
            inviteeRole: TeamMemberRole[invitation.inviteeRole],
          };

          this.pubsub.publish(`team/${inv.teamID}/invite_added`, inv);
        }),
      ),

      // Map to model type
      TE.map((x) => x as TeamInvitation),
    );
  }

  revokeInvitation(inviteID: string) {
    return pipe(
      // Make sure invite exists
      this.getInvitation(inviteID),
      TE.fromTaskOption(() => TEAM_INVITE_NO_INVITE_FOUND),

      // Delete team invitation
      TE.chainTaskK(
        () => () =>
          this.prisma.teamInvitation.delete({
            where: {
              id: inviteID,
            },
          }),
      ),

      // Emit Pubsub Event
      TE.chainFirst((invitation) =>
        TE.fromTask(() =>
          this.pubsub.publish(
            `team/${invitation.teamID}/invite_removed`,
            invitation.id,
          ),
        ),
      ),

      // We are not returning anything
      TE.map(constVoid),
    );
  }

  getAllInvitationsInTeam(team: Team) {
    return pipe(
      () =>
        this.prisma.teamInvitation.findMany({
          where: {
            teamID: team.id,
          },
        }),
      T.map((x) => x as TeamInvitation[]),
    );
  }

  acceptInvitation(inviteID: string, acceptedBy: User) {
    return pipe(
      TE.Do,

      // First get the invitation
      TE.bindW('invitation', () =>
        pipe(
          this.getInvitation(inviteID),
          TE.fromTaskOption(() => TEAM_INVITE_NO_INVITE_FOUND),
        ),
      ),

      // Validation checks
      TE.chainFirstW(({ invitation }) =>
        TE.sequenceArray([
          // Make sure the invited user is not part of the team
          pipe(
            this.teamService.getTeamMemberTE(invitation.teamID, acceptedBy.uid),
            TE.swap,
            TE.bimap(
              () => TEAM_INVITE_ALREADY_MEMBER,
              constVoid, // The return type is ignored
            ),
          ),

          // Make sure the invited user and accepting user has the same email
          pipe(
            undefined,
            TE.fromPredicate(
              () =>
                acceptedBy.email.toLowerCase() ===
                invitation.inviteeEmail.toLowerCase(),
              () => TEAM_INVITE_EMAIL_DO_NOT_MATCH,
            ),
          ),
        ]),
      ),

      // Add the team member
      // TODO: Somehow bring subscriptions to this ?
      TE.bindW('teamMember', ({ invitation }) =>
        pipe(
          TE.tryCatch(
            () =>
              this.teamService.addMemberToTeam(
                invitation.teamID,
                acceptedBy.uid,
                invitation.inviteeRole,
              ),
            () => TEAM_INVITE_ALREADY_MEMBER, // Can only fail if Team Member already exists, which we checked, but due to async lets assert that here too
          ),
        ),
      ),

      TE.chainFirstW(({ invitation }) => this.revokeInvitation(invitation.id)),

      TE.map(({ teamMember }) => teamMember),
    );
  }

  /**
   * Fetch the count invitations for a given team.
   * @param teamID team id
   * @returns a count team invitations for a team
   */
  async getAllTeamInvitations(teamID: string) {
    const invitations = await this.prisma.teamInvitation.findMany({
      where: {
        teamID: teamID,
      },
    });

    return invitations;
  }
}

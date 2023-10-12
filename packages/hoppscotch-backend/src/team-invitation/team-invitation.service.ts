import { Injectable } from '@nestjs/common';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamInvitation as DBTeamInvitation } from '@prisma/client';
import { TeamMember, TeamMemberRole } from 'src/team/team.model';
import { TeamService } from 'src/team/team.service';
import {
  INVALID_EMAIL,
  TEAM_INVALID_ID,
  TEAM_INVITE_ALREADY_MEMBER,
  TEAM_INVITE_EMAIL_DO_NOT_MATCH,
  TEAM_INVITE_MEMBER_HAS_INVITE,
  TEAM_INVITE_NO_INVITE_FOUND,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';
import { TeamInvitation } from './team-invitation.model';
import { MailerService } from 'src/mailer/mailer.service';
import { UserService } from 'src/user/user.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { validateEmail } from '../utils';
import { AuthUser } from 'src/types/AuthUser';

@Injectable()
export class TeamInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly teamService: TeamService,
    private readonly mailerService: MailerService,

    private readonly pubsub: PubSubService,
  ) {}

  /**
   * Cast a DBTeamInvitation to a TeamInvitation
   * @param dbTeamInvitation database TeamInvitation
   * @returns TeamInvitation model
   */
  cast(dbTeamInvitation: DBTeamInvitation): TeamInvitation {
    return {
      ...dbTeamInvitation,
      inviteeRole: TeamMemberRole[dbTeamInvitation.inviteeRole],
    };
  }

  /**
   * Get the team invite
   * @param inviteID invite id
   * @returns an Option of team invitation or none
   */
  async getInvitation(inviteID: string) {
    try {
      const dbInvitation = await this.prisma.teamInvitation.findUniqueOrThrow({
        where: {
          id: inviteID,
        },
      });

      return O.some(this.cast(dbInvitation));
    } catch (e) {
      return O.none;
    }
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

  /**
   * Create a team invitation
   * @param creator creator of the invitation
   * @param teamID team id
   * @param inviteeEmail invitee email
   * @param inviteeRole invitee role
   * @returns an Either of team invitation or error message
   */
  async createInvitation(
    creator: AuthUser,
    teamID: string,
    inviteeEmail: string,
    inviteeRole: TeamMemberRole,
  ) {
    // validate email
    const isEmailValid = validateEmail(inviteeEmail);
    if (!isEmailValid) return E.left(INVALID_EMAIL);

    // team ID should valid
    const team = await this.teamService.getTeamWithID(teamID);
    if (!team) return E.left(TEAM_INVALID_ID);

    // invitation creator should be a TeamMember
    const isTeamMember = await this.teamService.getTeamMember(
      team.id,
      creator.uid,
    );
    if (!isTeamMember) return E.left(TEAM_MEMBER_NOT_FOUND);

    // Checking to see if the invitee is already part of the team or not
    const inviteeUser = await this.userService.findUserByEmail(inviteeEmail);
    if (O.isSome(inviteeUser)) {
      // invitee should not already a member
      const isTeamMember = await this.teamService.getTeamMember(
        team.id,
        inviteeUser.value.uid,
      );
      if (isTeamMember) return E.left(TEAM_INVITE_ALREADY_MEMBER);
    }

    // check invitee already invited earlier or not
    const teamInvitation = await this.getTeamInviteByEmailAndTeamID(
      inviteeEmail,
      team.id,
    );
    if (E.isRight(teamInvitation)) return E.left(TEAM_INVITE_MEMBER_HAS_INVITE);

    // create the invitation
    const dbInvitation = await this.prisma.teamInvitation.create({
      data: {
        teamID: team.id,
        inviteeEmail,
        inviteeRole,
        creatorUid: creator.uid,
      },
    });

    await this.mailerService.sendEmail(inviteeEmail, {
      template: 'team-invitation',
      variables: {
        invitee: creator.displayName ?? 'A Hoppscotch User',
        action_url: `${process.env.VITE_BASE_URL}/join-team?id=${dbInvitation.id}`,
        invite_team_name: team.name,
      },
    });

    const invitation = this.cast(dbInvitation);
    this.pubsub.publish(`team/${invitation.teamID}/invite_added`, invitation);

    return E.right(invitation);
  }

  /**
   * Revoke a team invitation
   * @param inviteID invite id
   * @returns an Either of true or error message
   */
  async revokeInvitation(inviteID: string) {
    // check if the invite exists
    const invitation = await this.getInvitation(inviteID);
    if (O.isNone(invitation)) return E.left(TEAM_INVITE_NO_INVITE_FOUND);

    // delete the invite
    await this.prisma.teamInvitation.delete({
      where: {
        id: inviteID,
      },
    });

    this.pubsub.publish(
      `team/${invitation.value.teamID}/invite_removed`,
      invitation.value.id,
    );

    return E.right(true);
  }

  /**
   * Accept a team invitation
   * @param inviteID invite id
   * @param acceptedBy user who accepted the invitation
   * @returns an Either of team member or error message
   */
  async acceptInvitation(inviteID: string, acceptedBy: AuthUser) {
    // check if the invite exists
    const invitation = await this.getInvitation(inviteID);
    if (O.isNone(invitation)) return E.left(TEAM_INVITE_NO_INVITE_FOUND);

    // make sure the user is not already a member of the team
    const teamMemberInvitee = await this.teamService.getTeamMember(
      invitation.value.teamID,
      acceptedBy.uid,
    );
    if (teamMemberInvitee) return E.left(TEAM_INVITE_ALREADY_MEMBER);

    // make sure the user is the same as the invitee
    if (
      acceptedBy.email.toLowerCase() !==
      invitation.value.inviteeEmail.toLowerCase()
    )
      return E.left(TEAM_INVITE_EMAIL_DO_NOT_MATCH);

    // add the user to the team
    let teamMember: TeamMember;
    try {
      teamMember = await this.teamService.addMemberToTeam(
        invitation.value.teamID,
        acceptedBy.uid,
        invitation.value.inviteeRole,
      );
    } catch (e) {
      return E.left(TEAM_INVITE_ALREADY_MEMBER);
    }

    // delete the invite
    await this.revokeInvitation(inviteID);

    return E.right(teamMember);
  }

  /**
   * Fetch all team invitations for a given team.
   * @param teamID team id
   * @returns array of team invitations for a team
   */
  async getTeamInvitations(teamID: string) {
    const dbInvitations = await this.prisma.teamInvitation.findMany({
      where: {
        teamID: teamID,
      },
    });

    const invitations: TeamInvitation[] = dbInvitations.map((dbInvitation) =>
      this.cast(dbInvitation),
    );

    return invitations;
  }
}

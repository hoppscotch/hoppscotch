import { Injectable, OnModuleInit } from '@nestjs/common';
import { TeamMember, TeamAccessRole, Team } from './team.model';
import { PrismaService } from '../prisma/prisma.service';
import { TeamMember as DbTeamMember } from 'src/generated/prisma/client';
import { UserService } from '../user/user.service';
import { UserDataHandler } from 'src/user/user.data.handler';
import {
  TEAM_NAME_INVALID,
  TEAM_ONLY_ONE_OWNER,
  USER_NOT_FOUND,
  TEAM_INVALID_ID,
  TEAM_INVALID_ID_OR_USER,
  TEAM_MEMBER_NOT_FOUND,
  USER_IS_OWNER,
} from '../errors';
import { PubSubService } from '../pubsub/pubsub.service';
import { flow, pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as TO from 'fp-ts/TaskOption';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';
import * as A from 'fp-ts/Array';
import { isValidLength, throwErr } from 'src/utils';
import { AuthUser } from '../types/AuthUser';
import { OffsetPaginationArgs } from 'src/types/input-types.args';

@Injectable()
export class TeamService implements UserDataHandler, OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly pubsub: PubSubService,
  ) {}

  TITLE_LENGTH = 1;

  onModuleInit() {
    this.userService.registerUserDataHandler(this);
  }

  canAllowUserDeletion(user: AuthUser): TO.TaskOption<string> {
    return pipe(
      this.isUserSoleOwnerInAnyTeam(user.uid),
      TO.fromTask,
      TO.chain((isOwner) => (isOwner ? TO.some(USER_IS_OWNER) : TO.none)),
    );
  }

  onUserDelete(user: AuthUser): T.Task<void> {
    return this.deleteUserFromAllTeams(user.uid);
  }

  async getCountOfUsersWithRoleInTeam(
    teamID: string,
    role: TeamAccessRole,
  ): Promise<number> {
    return await this.prisma.teamMember.count({
      where: {
        teamID,
        role,
      },
    });
  }

  async addMemberToTeamWithEmail(
    teamID: string,
    email: string,
    role: TeamAccessRole,
  ): Promise<E.Left<string> | E.Right<TeamMember>> {
    const user = await this.userService.findUserByEmail(email);
    if (O.isNone(user)) return E.left(USER_NOT_FOUND);

    const teamMember = await this.addMemberToTeam(teamID, user.value.uid, role);
    return E.right(teamMember);
  }

  async addMemberToTeam(
    teamID: string,
    uid: string,
    role: TeamAccessRole,
  ): Promise<TeamMember> {
    const teamMember = await this.prisma.teamMember.create({
      data: {
        userUid: uid,
        team: {
          connect: {
            id: teamID,
          },
        },
        role: role,
      },
    });

    const member: TeamMember = {
      membershipID: teamMember.id,
      userUid: teamMember.userUid,
      role: TeamAccessRole[teamMember.role],
    };

    this.pubsub.publish(`team/${teamID}/member_added`, member);

    return member;
  }

  async deleteTeam(teamID: string): Promise<E.Left<string> | E.Right<boolean>> {
    try {
      // TeamMember has onDelete: Cascade on team relation,
      // so deleting the team automatically cascades to members
      await this.prisma.team.delete({
        where: {
          id: teamID,
        },
      });

      return E.right(true);
    } catch (e) {
      return E.left(TEAM_INVALID_ID);
    }
  }

  async renameTeam(
    teamID: string,
    newName: string,
  ): Promise<E.Left<string> | E.Right<Team>> {
    const isValidTitle = isValidLength(newName, this.TITLE_LENGTH);
    if (!isValidTitle) return E.left(TEAM_NAME_INVALID);

    try {
      const updatedTeam = await this.prisma.team.update({
        where: {
          id: teamID,
        },
        data: {
          name: newName,
        },
      });
      return E.right(updatedTeam);
    } catch (e) {
      // Prisma update errors out if it can't find the record
      return E.left(TEAM_INVALID_ID);
    }
  }

  async updateTeamAccessRole(
    teamID: string,
    userUid: string,
    newRole: TeamAccessRole,
  ): Promise<E.Left<string> | E.Right<TeamMember>> {
    const ownerCount = await this.prisma.teamMember.count({
      where: {
        teamID,
        role: TeamAccessRole.OWNER,
      },
    });

    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamID_userUid: {
          teamID,
          userUid,
        },
      },
    });

    if (!member) return E.left(TEAM_MEMBER_NOT_FOUND);
    if (
      member.role === TeamAccessRole.OWNER &&
      newRole != TeamAccessRole.OWNER &&
      ownerCount === 1
    ) {
      return E.left(TEAM_ONLY_ONE_OWNER);
    }

    const result = await this.prisma.teamMember.update({
      where: {
        teamID_userUid: {
          teamID,
          userUid,
        },
      },
      data: {
        role: newRole,
      },
    });

    const updatedMember: TeamMember = {
      membershipID: result.id,
      userUid: result.userUid,
      role: TeamAccessRole[result.role],
    };

    this.pubsub.publish(`team/${teamID}/member_updated`, updatedMember);

    return E.right(updatedMember);
  }

  async leaveTeam(
    teamID: string,
    userUid: string,
  ): Promise<E.Left<string> | E.Right<boolean>> {
    const ownerCount = await this.prisma.teamMember.count({
      where: {
        teamID,
        role: TeamAccessRole.OWNER,
      },
    });

    const member = await this.getTeamMember(teamID, userUid);
    if (!member) return E.left(TEAM_INVALID_ID_OR_USER);

    if (ownerCount === 1 && member.role === TeamAccessRole.OWNER) {
      return E.left(TEAM_ONLY_ONE_OWNER);
    }

    try {
      await this.prisma.teamMember.delete({
        where: {
          teamID_userUid: {
            userUid,
            teamID,
          },
        },
      });
    } catch (e) {
      // Record not found
      return E.left(TEAM_INVALID_ID_OR_USER);
    }

    this.pubsub.publish(`team/${teamID}/member_removed`, userUid);

    return E.right(true);
  }

  async createTeam(
    name: string,
    creatorUid: string,
  ): Promise<E.Left<string> | E.Right<Team>> {
    const isValidName = isValidLength(name, this.TITLE_LENGTH);
    if (!isValidName) return E.left(TEAM_NAME_INVALID);

    const team = await this.prisma.team.create({
      data: {
        name: name,
        members: {
          create: {
            userUid: creatorUid,
            role: TeamAccessRole.OWNER,
          },
        },
      },
    });

    return E.right(team);
  }

  async getTeamsOfUser(uid: string, cursor: string | null): Promise<Team[]> {
    const entries = await this.prisma.teamMember.findMany({
      take: 10,
      skip: cursor ? 1 : 0,
      cursor: cursor
        ? { teamID_userUid: { teamID: cursor, userUid: uid } }
        : undefined,
      where: { userUid: uid },
      include: { team: true },
    });

    return entries.map((entry) => entry.team);
  }

  async getTeamWithID(teamID: string): Promise<Team | null> {
    try {
      const team = await this.prisma.team.findUnique({
        where: {
          id: teamID,
        },
      });

      return team;
    } catch (_e) {
      return null;
    }
  }

  getTeamWithIDTE(teamID: string): TE.TaskEither<'team/invalid_id', Team> {
    return pipe(
      () => this.getTeamWithID(teamID),
      TE.fromTask,
      TE.chain(
        TE.fromPredicate(
          (x): x is Team => !!x,
          () => TEAM_INVALID_ID,
        ),
      ),
    );
  }

  /**
   * Filters out team members that we weren't able to match
   * (also deletes the membership)
   * @param members Members to filter against
   */
  async filterMismatchedUsers(
    teamID: string,
    members: TeamMember[],
  ): Promise<TeamMember[]> {
    if (members.length === 0) return [];

    // Batch lookup: fetch all users in a single query instead of N individual queries
    const userUids = members.map((m) => m.userUid);
    const existingUsers = await this.userService.findUsersByIds(userUids);
    const existingUids = new Set(existingUsers.map((u) => u.uid));

    return members.filter((member) => existingUids.has(member.userUid));
  }

  async getTeamMember(
    teamID: string,
    userUid: string,
  ): Promise<TeamMember | null> {
    try {
      const teamMember = await this.prisma.teamMember.findUnique({
        where: {
          teamID_userUid: {
            teamID,
            userUid,
          },
        },
      });

      if (!teamMember) return null;

      return <TeamMember>{
        membershipID: teamMember.id,
        userUid: userUid,
        role: TeamAccessRole[teamMember.role],
      };
    } catch (e) {
      return null;
    }
  }

  getTeamMemberTE(teamID: string, userUid: string) {
    return pipe(
      () => this.getTeamMember(teamID, userUid),
      TE.fromTask,
      TE.chain(
        TE.fromPredicate(
          (x): x is TeamMember => !!x,
          () => TEAM_MEMBER_NOT_FOUND,
        ),
      ),
    );
  }

  async getRoleOfUserInTeam(
    teamID: string,
    userUid: string,
  ): Promise<TeamAccessRole | null> {
    const teamMember = await this.getTeamMember(teamID, userUid);
    return teamMember ? teamMember.role : null;
  }

  isUserSoleOwnerInAnyTeam(uid: string): T.Task<boolean> {
    return async () => {
      // Find all teams where the user is an OWNER
      const userOwnedTeams = await this.prisma.teamMember.findMany({
        where: {
          userUid: uid,
          role: TeamAccessRole.OWNER,
        },
        select: {
          teamID: true,
        },
      });

      if (userOwnedTeams.length === 0) return false;

      const teamIDs = userOwnedTeams.map((t) => t.teamID);

      // Batch query: count owners per team in a single groupBy query instead of N individual counts
      const ownerCounts = await this.prisma.teamMember.groupBy({
        by: ['teamID'],
        where: {
          teamID: { in: teamIDs },
          role: TeamAccessRole.OWNER,
        },
        _count: { teamID: true },
      });

      // Check if any team has exactly 1 owner (the user themselves)
      return ownerCounts.some((group) => group._count.teamID === 1);
    };
  }

  deleteUserFromAllTeams(uid: string) {
    return pipe(
      () =>
        this.prisma.teamMember.findMany({
          where: {
            userUid: uid,
          },
        }),
      T.chainFirst(
        flow(
          A.map((member) => async () => {
            const res = await this.leaveTeam(member.teamID, uid);
            if (E.isLeft(res)) throwErr(res.left);
            return E.right(res);
          }),
          T.sequenceArray,
        ),
      ),
      T.map(() => undefined),
    );
  }

  async getTeamMembers(teamID: string): Promise<TeamMember[]> {
    const dbTeamMembers = await this.prisma.teamMember.findMany({
      where: {
        teamID,
      },
    });

    const members = dbTeamMembers.map(
      (entry) =>
        <TeamMember>{
          membershipID: entry.id,
          userUid: entry.userUid,
          role: TeamAccessRole[entry.role],
        },
    );

    return this.filterMismatchedUsers(teamID, members);
  }

  /**
   * Get a count of members in a team
   * @param teamID Team ID
   * @returns a count of members in a team
   */
  async getCountOfMembersInTeam(teamID: string) {
    const memberCount = await this.prisma.teamMember.count({
      where: {
        teamID: teamID,
      },
    });

    return memberCount;
  }

  async getMembersOfTeam(
    teamID: string,
    cursor: string | null,
  ): Promise<TeamMember[]> {
    const teamMembers = await this.prisma.teamMember.findMany({
      take: 10,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: { teamID },
    });

    const members = teamMembers.map(
      (entry) =>
        <TeamMember>{
          membershipID: entry.id,
          userUid: entry.userUid,
          role: TeamAccessRole[entry.role],
        },
    );

    return this.filterMismatchedUsers(teamID, members);
  }

  /**
   * Fetch all the teams in the `Team` table based on cursor
   * @param cursorID string of teamID or undefined
   * @param take number of items to query
   * @returns an array of `Team` object
   * @deprecated use fetchAllTeamsV2 instead
   */
  async fetchAllTeams(cursorID: string, take: number) {
    const options = {
      skip: cursorID ? 1 : 0,
      take: take,
      cursor: cursorID ? { id: cursorID } : undefined,
    };

    const fetchedTeams = await this.prisma.team.findMany(options);
    return fetchedTeams;
  }

  /**
   * Fetch all the teams in the `Team` table with offset pagination and search
   * @param searchString search on team name or ID
   * @param paginationOption pagination options
   * @returns an array of `Team` object
   */
  async fetchAllTeamsV2(
    searchString: string,
    paginationOption: OffsetPaginationArgs,
  ) {
    const fetchedTeams = await this.prisma.team.findMany({
      skip: paginationOption.skip,
      take: paginationOption.take,
      where: searchString
        ? {
            OR: [
              { name: { contains: searchString, mode: 'insensitive' } },
              { id: { contains: searchString, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return fetchedTeams;
  }

  /**
   * Fetch list of all the Teams in the DB
   *
   * @returns number of teams in the org
   */
  async getTeamsCount() {
    const teamsCount = await this.prisma.team.count();
    return teamsCount;
  }
}

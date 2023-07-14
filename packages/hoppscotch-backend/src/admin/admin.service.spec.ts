import { AdminService } from './admin.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { mockDeep } from 'jest-mock-extended';
import { InvitedUsers } from '@prisma/client';
import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';
import { TeamEnvironmentsService } from '../team-environments/team-environments.service';
import { TeamRequestService } from '../team-request/team-request.service';
import { TeamInvitationService } from '../team-invitation/team-invitation.service';
import { TeamCollectionService } from '../team-collection/team-collection.service';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { User as DbUser } from '@prisma/client';
import {
  DUPLICATE_EMAIL,
  INVALID_EMAIL,
  ONLY_ONE_ADMIN_ACCOUNT,
  TEAM_INVITE_ALREADY_MEMBER,
  TEAM_MEMBER_NOT_FOUND,
  USER_ALREADY_INVITED,
  USER_IS_ADMIN,
  USER_NOT_FOUND,
} from '../errors';
import { Team, TeamMember, TeamMemberRole } from 'src/team/team.model';
import { TeamInvitation } from 'src/team-invitation/team-invitation.model';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as utils from 'src/utils';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();
const mockUserService = mockDeep<UserService>();
const mockTeamService = mockDeep<TeamService>();
const mockTeamEnvironmentsService = mockDeep<TeamEnvironmentsService>();
const mockTeamRequestService = mockDeep<TeamRequestService>();
const mockTeamInvitationService = mockDeep<TeamInvitationService>();
const mockTeamCollectionService = mockDeep<TeamCollectionService>();
const mockMailerService = mockDeep<MailerService>();

const adminService = new AdminService(
  mockUserService,
  mockTeamService,
  mockTeamCollectionService,
  mockTeamRequestService,
  mockTeamEnvironmentsService,
  mockTeamInvitationService,
  mockPubSub as any,
  mockPrisma as any,
  mockMailerService,
);

const invitedUsers: InvitedUsers[] = [
  {
    adminUid: 'uid1',
    adminEmail: 'admin1@example.com',
    inviteeEmail: 'i@example.com',
    invitedOn: new Date(),
  },
  {
    adminUid: 'uid2',
    adminEmail: 'admin2@example.com',
    inviteeEmail: 'u@example.com',
    invitedOn: new Date(),
  },
];

const allUsers: DbUser[] = [
  {
    uid: 'uid1',
    displayName: 'user1',
    email: 'user1@hoppscotch.io',
    photoURL: 'https://hoppscotch.io',
    isAdmin: true,
    refreshToken: 'refreshToken',
    currentRESTSession: null,
    currentGQLSession: null,
    createdOn: new Date(),
  },
  {
    uid: 'uid2',
    displayName: 'user2',
    email: 'user2@hoppscotch.io',
    photoURL: 'https://hoppscotch.io',
    isAdmin: false,
    refreshToken: 'refreshToken',
    currentRESTSession: null,
    currentGQLSession: null,
    createdOn: new Date(),
  },
];

const teamMembers: TeamMember[] = [
  {
    membershipID: 'teamMember1',
    userUid: allUsers[0].uid,
    role: TeamMemberRole.OWNER,
  },
];

const teams: Team[] = [
  {
    id: 'team1',
    name: 'team1',
  },
  {
    id: 'team2',
    name: 'team2',
  },
];

const teamInvitations: TeamInvitation[] = [
  {
    id: 'teamInvitation1',
    teamID: 'team1',
    creatorUid: 'uid1',
    inviteeEmail: '',
    inviteeRole: TeamMemberRole.OWNER,
  },
];

describe('AdminService', () => {
  describe('fetchUsers', () => {
    test('should resolve right and return an array of users if cursorID is null', async () => {
      mockUserService.fetchAllUsers.mockResolvedValueOnce(allUsers);

      const result = await adminService.fetchUsers(null, 10);

      expect(result).toEqual(allUsers);
      expect(mockUserService.fetchAllUsers).toHaveBeenCalledWith(null, 10);
    });
    test('should resolve right and return an array of users if cursorID is not null', async () => {
      mockUserService.fetchAllUsers.mockResolvedValueOnce([allUsers[1]]);

      const cursorID = allUsers[0].uid;
      const result = await adminService.fetchUsers(cursorID, 10);

      expect(result).toEqual([allUsers[1]]);
      expect(mockUserService.fetchAllUsers).toHaveBeenCalledWith(cursorID, 10);
    });
  });

  describe('fetchAllTeams', () => {
    test('should resolve right and return an array of teams if cursorID is null', async () => {
      mockTeamService.fetchAllTeams.mockResolvedValueOnce(teams);

      const result = await adminService.fetchAllTeams(null, 10);

      expect(result).toEqual(teams);
      expect(mockTeamService.fetchAllTeams).toHaveBeenCalledWith(null, 10);
    });
    test('should resolve right and return an array of teams if cursorID is not null', async () => {
      mockTeamService.fetchAllTeams.mockResolvedValueOnce([teams[1]]);

      const cursorID = teams[0].id;
      const result = await adminService.fetchAllTeams(cursorID, 10);

      expect(result).toEqual([teams[1]]);
      expect(mockTeamService.fetchAllTeams).toHaveBeenCalledWith(cursorID, 10);
    });
  });

  describe('membersCountInTeam', () => {
    test('should resolve right and return the count of members in a team', async () => {
      mockTeamService.getCountOfMembersInTeam.mockResolvedValueOnce(10);

      const result = await adminService.membersCountInTeam('team1');

      expect(result).toEqual(10);
      expect(mockTeamService.getCountOfMembersInTeam).toHaveBeenCalledWith(
        'team1',
      );
    });
  });

  describe('collectionCountInTeam', () => {
    test('should resolve right and return the count of collections in a team', async () => {
      mockTeamCollectionService.totalCollectionsInTeam.mockResolvedValueOnce(
        10,
      );

      const result = await adminService.collectionCountInTeam('team1');

      expect(result).toEqual(10);
      expect(
        mockTeamCollectionService.totalCollectionsInTeam,
      ).toHaveBeenCalledWith('team1');
    });
  });

  describe('requestCountInTeam', () => {
    test('should resolve right and return the count of requests in a team', async () => {
      mockTeamRequestService.totalRequestsInATeam.mockResolvedValueOnce(10);

      const result = await adminService.requestCountInTeam('team1');

      expect(result).toEqual(10);
      expect(mockTeamRequestService.totalRequestsInATeam).toHaveBeenCalledWith(
        'team1',
      );
    });
  });

  describe('environmentCountInTeam', () => {
    test('should resolve right and return the count of environments in a team', async () => {
      mockTeamEnvironmentsService.totalEnvsInTeam.mockResolvedValueOnce(10);

      const result = await adminService.environmentCountInTeam('team1');

      expect(result).toEqual(10);
      expect(mockTeamEnvironmentsService.totalEnvsInTeam).toHaveBeenCalledWith(
        'team1',
      );
    });
  });

  describe('pendingInvitationCountInTeam', () => {
    test('should resolve right and return the count of pending invitations in a team', async () => {
      mockTeamInvitationService.getTeamInvitations.mockResolvedValueOnce(
        teamInvitations,
      );

      const result = await adminService.pendingInvitationCountInTeam('team1');

      expect(result).toEqual(teamInvitations);
      expect(
        mockTeamInvitationService.getTeamInvitations,
      ).toHaveBeenCalledWith('team1');
    });
  });

  describe('changeRoleOfUserTeam', () => {
    test('should resolve right and return the count of pending invitations in a team', async () => {
      const teamMember = teamMembers[0];

      mockTeamService.updateTeamMemberRole.mockResolvedValueOnce(
        E.right(teamMember),
      );

      const result = await adminService.changeRoleOfUserTeam(
        teamMember.userUid,
        'team1',
        teamMember.role,
      );

      expect(result).toEqualRight(teamMember);
      expect(mockTeamService.updateTeamMemberRole).toHaveBeenCalledWith(
        'team1',
        teamMember.userUid,
        teamMember.role,
      );
    });

    test('should resolve left and return the error if any error occurred', async () => {
      const teamMember = teamMembers[0];
      const errorMessage = 'Team member not found';

      mockTeamService.updateTeamMemberRole.mockResolvedValueOnce(
        E.left(errorMessage),
      );

      const result = await adminService.changeRoleOfUserTeam(
        teamMember.userUid,
        'team1',
        teamMember.role,
      );

      expect(result).toEqualLeft(errorMessage);
      expect(mockTeamService.updateTeamMemberRole).toHaveBeenCalledWith(
        'team1',
        teamMember.userUid,
        teamMember.role,
      );
    });
  });

  describe('removeUserFromTeam', () => {
    test('should resolve right and remove user from a team', async () => {
      const teamMember = teamMembers[0];

      mockTeamService.leaveTeam.mockResolvedValueOnce(E.right(true));

      const result = await adminService.removeUserFromTeam(
        teamMember.userUid,
        'team1',
      );

      expect(result).toEqualRight(true);
      expect(mockTeamService.leaveTeam).toHaveBeenCalledWith(
        'team1',
        teamMember.userUid,
      );
    });

    test('should resolve left and return the error if any error occurred', async () => {
      const teamMember = teamMembers[0];
      const errorMessage = 'Team member not found';

      mockTeamService.leaveTeam.mockResolvedValueOnce(E.left(errorMessage));

      const result = await adminService.removeUserFromTeam(
        teamMember.userUid,
        'team1',
      );

      expect(result).toEqualLeft(errorMessage);
      expect(mockTeamService.leaveTeam).toHaveBeenCalledWith(
        'team1',
        teamMember.userUid,
      );
    });
  });

  describe('addUserToTeam', () => {
    test('should return INVALID_EMAIL when email is invalid', async () => {
      const teamID = 'team1';
      const userEmail = 'invalidEmail';
      const role = TeamMemberRole.EDITOR;

      const mockValidateEmail = jest.spyOn(utils, 'validateEmail');
      mockValidateEmail.mockReturnValueOnce(false);

      const result = await adminService.addUserToTeam(teamID, userEmail, role);

      expect(result).toEqual(E.left(INVALID_EMAIL));
      expect(mockValidateEmail).toHaveBeenCalledWith(userEmail);
      expect(mockUserService.findUserByEmail).not.toHaveBeenCalled();
      expect(mockTeamService.getTeamMemberTE).not.toHaveBeenCalled();
    });

    test('should return USER_NOT_FOUND when user is not found', async () => {
      const teamID = 'team1';
      const userEmail = 'u@example.com';
      const role = TeamMemberRole.EDITOR;

      const mockValidateEmail = jest.spyOn(utils, 'validateEmail');
      mockValidateEmail.mockReturnValueOnce(true);
      mockUserService.findUserByEmail.mockResolvedValue(O.none);

      const result = await adminService.addUserToTeam(teamID, userEmail, role);

      expect(result).toEqual(E.left(USER_NOT_FOUND));
      expect(mockValidateEmail).toHaveBeenCalledWith(userEmail);
    });

    test('should return TEAM_INVITE_ALREADY_MEMBER when user is already a member of the team', async () => {
      const teamID = 'team1';
      const userEmail = allUsers[0].email;
      const role = TeamMemberRole.EDITOR;

      const mockValidateEmail = jest.spyOn(utils, 'validateEmail');
      mockValidateEmail.mockReturnValueOnce(true);
      mockUserService.findUserByEmail.mockResolvedValueOnce(
        O.some(allUsers[0]),
      );
      mockTeamService.getTeamMemberTE.mockReturnValueOnce(
        TE.right(teamMembers[0]),
      );

      const result = await adminService.addUserToTeam(teamID, userEmail, role);

      expect(result).toEqual(E.left(TEAM_INVITE_ALREADY_MEMBER));
      expect(mockValidateEmail).toHaveBeenCalledWith(userEmail);
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith(userEmail);
      expect(mockTeamService.getTeamMemberTE).toHaveBeenCalledWith(
        teamID,
        allUsers[0].uid,
      );
    });

    test('should add user to the team and return the result when user is not a member of the team', async () => {
      const teamID = 'team1';
      const userEmail = allUsers[0].email;
      const role = TeamMemberRole.EDITOR;

      const mockValidateEmail = jest.spyOn(utils, 'validateEmail');
      mockValidateEmail.mockReturnValueOnce(true);
      mockUserService.findUserByEmail.mockResolvedValueOnce(
        O.some(allUsers[0]),
      );
      mockTeamService.getTeamMemberTE.mockReturnValueOnce(
        TE.left(TEAM_MEMBER_NOT_FOUND),
      );
      mockTeamService.addMemberToTeamWithEmail.mockResolvedValueOnce(
        E.right(teamMembers[0]),
      );
      mockTeamInvitationService.getTeamInviteByEmailAndTeamID.mockResolvedValueOnce(
        E.right(teamInvitations[0])
      );

      const result = await adminService.addUserToTeam(teamID, userEmail, role);

      expect(result).toEqual(E.right(teamMembers[0]));
      expect(mockValidateEmail).toHaveBeenCalledWith(userEmail);
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith(userEmail);
      expect(mockTeamService.getTeamMemberTE).toHaveBeenCalledWith(
        teamID,
        allUsers[0].uid,
      );
      expect(mockTeamService.addMemberToTeamWithEmail).toHaveBeenCalledWith(
        teamID,
        allUsers[0].email,
        role,
      );
    });
  });

  describe('createATeam', () => {
    test('should return USER_NOT_FOUND when user is not found', async () => {
      const userUid = allUsers[0].uid;
      const teamName = 'team1';

      mockUserService.findUserById.mockResolvedValue(O.none);

      const result = await adminService.createATeam(userUid, teamName);

      expect(result).toEqual(E.left(USER_NOT_FOUND));
      expect(mockUserService.findUserById).toHaveBeenCalledWith(userUid);
      expect(mockTeamService.createTeam).not.toHaveBeenCalled();
    });

    test('should create a team and return the result when the team is created successfully', async () => {
      const user = allUsers[0];
      const team = teams[0];

      mockUserService.findUserById.mockResolvedValueOnce(O.some(user));
      mockTeamService.createTeam.mockResolvedValueOnce(E.right(team));

      const result = await adminService.createATeam(user.uid, team.name);

      expect(result).toEqual(E.right(team));
      expect(mockUserService.findUserById).toHaveBeenCalledWith(user.uid);
      expect(mockTeamService.createTeam).toHaveBeenCalledWith(
        team.name,
        user.uid,
      );
    });

    test('should return the error when the team creation fails', async () => {
      const user = allUsers[0];
      const team = teams[0];
      const errorMessage = 'error';

      mockUserService.findUserById.mockResolvedValueOnce(O.some(user));
      mockTeamService.createTeam.mockResolvedValueOnce(E.left(errorMessage));

      const result = await adminService.createATeam(user.uid, team.name);

      expect(result).toEqual(E.left(errorMessage));
      expect(mockUserService.findUserById).toHaveBeenCalledWith(user.uid);
      expect(mockTeamService.createTeam).toHaveBeenCalledWith(
        team.name,
        user.uid,
      );
    });
  });

  describe('renameATeam', () => {
    test('should rename a team and return the result when the team is renamed successfully', async () => {
      const team = teams[0];
      const newName = 'new name';

      mockTeamService.renameTeam.mockResolvedValueOnce(E.right(team));

      const result = await adminService.renameATeam(team.id, newName);

      expect(result).toEqual(E.right(team));
      expect(mockTeamService.renameTeam).toHaveBeenCalledWith(team.id, newName);
    });

    test('should return the error when the team renaming fails', async () => {
      const team = teams[0];
      const newName = 'new name';
      const errorMessage = 'error';

      mockTeamService.renameTeam.mockResolvedValueOnce(E.left(errorMessage));

      const result = await adminService.renameATeam(team.id, newName);

      expect(result).toEqual(E.left(errorMessage));
      expect(mockTeamService.renameTeam).toHaveBeenCalledWith(team.id, newName);
    });
  });

  describe('deleteATeam', () => {
    test('should delete a team and return the result when the team is deleted successfully', async () => {
      const team = teams[0];

      mockTeamService.deleteTeam.mockResolvedValueOnce(E.right(true));

      const result = await adminService.deleteATeam(team.id);

      expect(result).toEqual(E.right(true));
      expect(mockTeamService.deleteTeam).toHaveBeenCalledWith(team.id);
    });

    test('should return the error when the team deletion fails', async () => {
      const team = teams[0];
      const errorMessage = 'error';

      mockTeamService.deleteTeam.mockResolvedValueOnce(E.left(errorMessage));

      const result = await adminService.deleteATeam(team.id);

      expect(result).toEqual(E.left(errorMessage));
      expect(mockTeamService.deleteTeam).toHaveBeenCalledWith(team.id);
    });
  });

  describe('fetchAdmins', () => {
    test('should return the list of admin users', async () => {
      const adminUsers = [];
      mockUserService.fetchAdminUsers.mockResolvedValueOnce(adminUsers);
      const result = await adminService.fetchAdmins();

      expect(result).toEqual(adminUsers);
    });
  });

  describe('fetchUserInfo', () => {
    test('should return the user info when the user is found', async () => {
      const user = allUsers[0];
      mockUserService.findUserById.mockResolvedValueOnce(O.some(user));
      const result = await adminService.fetchUserInfo(user.uid);

      expect(result).toEqual(E.right(user));
    });

    test('should return USER_NOT_FOUND when the user is not found', async () => {
      const user = allUsers[0];
      mockUserService.findUserById.mockResolvedValueOnce(O.none);
      const result = await adminService.fetchUserInfo(user.uid);

      expect(result).toEqual(E.left(USER_NOT_FOUND));
    });
  });

  describe('removeUserAccount', () => {
    test('should return USER_NOT_FOUND when the user is not found', async () => {
      const user = allUsers[0];
      mockUserService.findUserById.mockResolvedValueOnce(O.none);
      const result = await adminService.removeUserAccount(user.uid);

      expect(result).toEqual(E.left(USER_NOT_FOUND));
    });

    test('should return USER_IS_ADMIN when the user is an admin', async () => {
      const user = allUsers[0];

      mockUserService.findUserById.mockResolvedValueOnce(O.some(user));
      const result = await adminService.removeUserAccount(user.uid);

      expect(result).toEqual(E.left(USER_IS_ADMIN));
    });

    test('should remove the user account and return the result when the user is not an admin', async () => {
      const user = allUsers[1];

      mockUserService.findUserById.mockResolvedValueOnce(O.some(user));
      mockUserService.deleteUserByUID.mockReturnValueOnce(TE.right(true));
      const result = await adminService.removeUserAccount(user.uid);

      expect(result).toEqual(E.right(true));
    });

    test('should return the error when the user account deletion fails', async () => {
      const user = allUsers[1];
      const errorMessage = 'error';

      mockUserService.findUserById.mockResolvedValueOnce(O.some(user));
      mockUserService.deleteUserByUID.mockReturnValueOnce(
        TE.left(errorMessage),
      );
      const result = await adminService.removeUserAccount(user.uid);

      expect(result).toEqual(E.left(errorMessage));
    });
  });

  describe('makeUserAdmin', () => {
    test('should make the user an admin and return true when the operation is successful', async () => {
      const user = allUsers[0];

      mockUserService.makeAdmin.mockResolvedValueOnce(E.right(user));
      const result = await adminService.makeUserAdmin(user.uid);

      expect(result).toEqual(E.right(true));
    });

    test('should return the error when making the user an admin fails', async () => {
      const user = allUsers[0];

      mockUserService.makeAdmin.mockResolvedValueOnce(E.left(USER_NOT_FOUND));
      const result = await adminService.makeUserAdmin(user.uid);

      expect(result).toEqual(E.left(USER_NOT_FOUND));
    });
  });

  describe('removeUserAsAdmin', () => {
    test('should return ONLY_ONE_ADMIN_ACCOUNT when there is only one admin account', async () => {
      const user = allUsers[0];

      mockUserService.fetchAdminUsers.mockResolvedValueOnce([user]);
      const result = await adminService.removeUserAsAdmin(user.uid);

      expect(result).toEqual(E.left(ONLY_ONE_ADMIN_ACCOUNT));
    });

    test('should remove the user as an admin and return true when the operation is successful', async () => {
      const user = allUsers[0];

      mockUserService.fetchAdminUsers.mockResolvedValueOnce(allUsers);
      mockUserService.removeUserAsAdmin.mockResolvedValueOnce(E.right(user));
      const result = await adminService.removeUserAsAdmin(user.uid);

      expect(result).toEqual(E.right(true));
    });

    test('should return the error when removing the user as an admin fails', async () => {
      const user = allUsers[0];

      mockUserService.fetchAdminUsers.mockResolvedValueOnce(allUsers);
      mockUserService.removeUserAsAdmin.mockResolvedValueOnce(
        E.left(USER_NOT_FOUND),
      );
      const result = await adminService.removeUserAsAdmin(user.uid);

      expect(result).toEqual(E.left(USER_NOT_FOUND));
    });
  });

  describe('getTeamInfo', () => {
    test('should return the team info when the team is found', async () => {
      const team = teams[0];
      mockTeamService.getTeamWithIDTE.mockReturnValue(TE.right(team));
      const result = await adminService.getTeamInfo(team.id);

      expect(result).toEqual(E.right(team));
    });
  });

  describe('fetchInvitedUsers', () => {
    test('should resolve right and return an array of invited users', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockPrisma.invitedUsers.findMany.mockResolvedValue(invitedUsers);

      const results = await adminService.fetchInvitedUsers();
      expect(results).toEqual(invitedUsers);
    });
    test('should resolve left and return an empty array if invited users not found', async () => {
      mockPrisma.invitedUsers.findMany.mockResolvedValue([]);

      const results = await adminService.fetchInvitedUsers();
      expect(results).toEqual([]);
    });
  });

  describe('inviteUserToSignInViaEmail', () => {
    test('should resolve right and create a invited user', async () => {
      mockPrisma.invitedUsers.findFirst.mockResolvedValueOnce(null);
      mockPrisma.invitedUsers.create.mockResolvedValueOnce(invitedUsers[0]);
      const result = await adminService.inviteUserToSignInViaEmail(
        invitedUsers[0].adminUid,
        invitedUsers[0].adminEmail,
        invitedUsers[0].inviteeEmail,
      );
      expect(mockPrisma.invitedUsers.create).toHaveBeenCalledWith({
        data: {
          adminUid: invitedUsers[0].adminUid,
          adminEmail: invitedUsers[0].adminEmail,
          inviteeEmail: invitedUsers[0].inviteeEmail,
        },
      });
      return expect(result).toEqualRight(invitedUsers[0]);
    });
    test('should resolve right, create a invited user and publish a subscription', async () => {
      mockPrisma.invitedUsers.findFirst.mockResolvedValueOnce(null);
      mockPrisma.invitedUsers.create.mockResolvedValueOnce(invitedUsers[0]);
      await adminService.inviteUserToSignInViaEmail(
        invitedUsers[0].adminUid,
        invitedUsers[0].adminEmail,
        invitedUsers[0].inviteeEmail,
      );
      return expect(mockPubSub.publish).toHaveBeenCalledWith(
        `admin/${invitedUsers[0].adminUid}/invited`,
        invitedUsers[0],
      );
    });
    test('should resolve left and return an error when invalid invitee email is passed', async () => {
      const result = await adminService.inviteUserToSignInViaEmail(
        invitedUsers[0].adminUid,
        invitedUsers[0].adminEmail,
        'invalidemail',
      );
      return expect(result).toEqualLeft(INVALID_EMAIL);
    });
    test('should resolve left and return an error when user already invited', async () => {
      mockPrisma.invitedUsers.findFirst.mockResolvedValueOnce(invitedUsers[0]);
      const result = await adminService.inviteUserToSignInViaEmail(
        invitedUsers[0].adminUid,
        invitedUsers[0].adminEmail,
        invitedUsers[0].inviteeEmail,
      );
      return expect(result).toEqualLeft(USER_ALREADY_INVITED);
    });
    test('should resolve left and return an error when invitee and admin email is same', async () => {
      const result = await adminService.inviteUserToSignInViaEmail(
        invitedUsers[0].adminUid,
        invitedUsers[0].inviteeEmail,
        invitedUsers[0].inviteeEmail,
      );
      return expect(result).toEqualLeft(DUPLICATE_EMAIL);
    });
  });

  describe('getUsersCount', () => {
    test('should return count of all users in the organization', async () => {
      mockUserService.getUsersCount.mockResolvedValueOnce(10);

      const result = await adminService.getUsersCount();
      expect(result).toEqual(10);
    });
  });

  describe('getTeamsCount', () => {
    test('should return count of all teams in the organization', async () => {
      mockTeamService.getTeamsCount.mockResolvedValueOnce(10);

      const result = await adminService.getTeamsCount();
      expect(result).toEqual(10);
    });
  });

  describe('getTeamCollectionsCount', () => {
    test('should return count of all Team Collections in the organization', async () => {
      mockTeamCollectionService.getTeamCollectionsCount.mockResolvedValueOnce(
        10,
      );

      const result = await adminService.getTeamCollectionsCount();
      expect(result).toEqual(10);
    });
  });

  describe('getTeamRequestsCount', () => {
    test('should return count of all Team Collections in the organization', async () => {
      mockTeamRequestService.getTeamRequestsCount.mockResolvedValueOnce(10);

      const result = await adminService.getTeamRequestsCount();
      expect(result).toEqual(10);
    });
  });
});

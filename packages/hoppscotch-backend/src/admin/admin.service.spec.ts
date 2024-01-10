import { AdminService } from './admin.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { mockDeep } from 'jest-mock-extended';
import { InvitedUsers as DbInvitedUser } from '@prisma/client';
import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';
import { TeamEnvironmentsService } from '../team-environments/team-environments.service';
import { TeamRequestService } from '../team-request/team-request.service';
import { TeamInvitationService } from '../team-invitation/team-invitation.service';
import { TeamCollectionService } from '../team-collection/team-collection.service';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DUPLICATE_EMAIL,
  INVALID_EMAIL,
  USER_ALREADY_INVITED,
  USER_NOT_INVITED,
} from '../errors';
import { ShortcodeService } from 'src/shortcode/shortcode.service';
import { ConfigService } from '@nestjs/config';
import { InvitedUser } from './invited-user.model';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();
const mockUserService = mockDeep<UserService>();
const mockTeamService = mockDeep<TeamService>();
const mockTeamEnvironmentsService = mockDeep<TeamEnvironmentsService>();
const mockTeamRequestService = mockDeep<TeamRequestService>();
const mockTeamInvitationService = mockDeep<TeamInvitationService>();
const mockTeamCollectionService = mockDeep<TeamCollectionService>();
const mockMailerService = mockDeep<MailerService>();
const mockShortcodeService = mockDeep<ShortcodeService>();
const mockConfigService = mockDeep<ConfigService>();

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
  mockShortcodeService,
  mockConfigService,
);

const invitedUsers: DbInvitedUser[] = [
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
describe('AdminService', () => {
  describe('fetchInvitedUsers', () => {
    test('should resolve right and return an array of invited users', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockPrisma.invitedUsers.findMany.mockResolvedValue(invitedUsers);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockPrisma.user.findMany.mockResolvedValue([]);

      const expectedResults: InvitedUser[] = invitedUsers.map(
        (invitedUser) => ({
          ...invitedUser,
          isInvitationAccepted: false,
        }),
      );

      const results = await adminService.fetchInvitedUsers();
      expect(results).toEqual(expectedResults);
    });
    test('should resolve left and return an empty array if invited users not found', async () => {
      mockPrisma.invitedUsers.findMany.mockResolvedValue([]);

      const results = await adminService.fetchInvitedUsers();
      expect(results).toEqual([]);
    });
  });

  describe('revokeUserInvite', () => {
    test('should resolve left and return error if email not invited', async () => {
      mockPrisma.invitedUsers.delete.mockRejectedValueOnce(new Error());

      const result = await adminService.revokeUserInvite(
        'test@gmail.com',
        'adminUid',
      );

      expect(result).toEqualLeft(USER_NOT_INVITED);
    });

    test('should resolve right and return deleted invitee email', async () => {
      const adminUid = 'adminUid';
      mockPrisma.invitedUsers.delete.mockResolvedValueOnce(invitedUsers[0]);

      const result = await adminService.revokeUserInvite(
        invitedUsers[0].inviteeEmail,
        adminUid,
      );

      expect(mockPrisma.invitedUsers.delete).toHaveBeenCalledWith({
        where: {
          inviteeEmail: invitedUsers[0].inviteeEmail,
        },
      });
      expect(result).toEqualRight(true);
    });

    test('should resolve right, delete invitee email and publish a subscription', async () => {
      const adminUid = 'adminUid';
      mockPrisma.invitedUsers.delete.mockResolvedValueOnce(invitedUsers[0]);

      await adminService.revokeUserInvite(
        invitedUsers[0].inviteeEmail,
        adminUid,
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `admin/${adminUid}/revoked`,
        invitedUsers[0],
      );
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

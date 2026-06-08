import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import * as O from 'fp-ts/Option';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_NO_INVITE_FOUND,
  TEAM_MEMBER_NOT_FOUND,
  TEAM_NOT_REQUIRED_ROLE,
} from 'src/errors';
import { TeamAccessRole } from 'src/team/team.model';
import { TeamService } from 'src/team/team.service';
import { TeamInvitationService } from './team-invitation.service';
import { TeamInviteTeamOwnerGuard } from './team-invite-team-owner.guard';

// Mock of TeamInvitationService
const mockTeamInvitationService = {
  getInvitation: jest.fn(),
};

// Mock of TeamService
const mockTeamService = {
  getTeamMember: jest.fn(),
};

// Helper to build a mock ExecutionContext
const buildMockContext = (user: any, inviteID: any): ExecutionContext => {
  const mockGqlCtx = {
    getContext: () => ({ req: { user } }),
    getArgs: () => ({ inviteID }),
  };

  jest
    .spyOn(GqlExecutionContext, 'create')
    .mockReturnValue(mockGqlCtx as unknown as GqlExecutionContext);

  return {} as ExecutionContext;
};

describe('TeamInviteTeamOwnerGuard', () => {
  let guard: TeamInviteTeamOwnerGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamInviteTeamOwnerGuard,
        {
          provide: TeamInvitationService,
          useValue: mockTeamInvitationService,
        },
        {
          provide: TeamService,
          useValue: mockTeamService,
        },
      ],
    }).compile();

    guard = module.get<TeamInviteTeamOwnerGuard>(TeamInviteTeamOwnerGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // Decision line 32 – ID 01
  // Test: UserDontExist
  // Condition: V (true) — !user
  // Input: user is falsy
  // Expected output: Exception BUG_AUTH_NO_USER_CTX
  // ──────────────────────────────────────────────
  describe('Decision line 32 - ID 01: UserDontExist', () => {
    it('should throw BUG_AUTH_NO_USER_CTX when user does not exist in context', async () => {
      const context = buildMockContext(null, 'some-invite-id');

      await expect(guard.canActivate(context)).rejects.toThrow(
        BUG_AUTH_NO_USER_CTX,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 32 – ID 02
  // Test: UserExists
  // Condition: F (false) — user is present
  // Input: valid user object
  // Expected output: Execution continues
  // ──────────────────────────────────────────────
  describe('Decision line 32 - ID 02: UserExists', () => {
    it('should continue execution when user exists in context', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        BUG_TEAM_INVITE_NO_INVITE_ID,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 35 – ID 03
  // Test: InviteIDDontExist
  // Condition: V (true) — !inviteID
  // Input: inviteID is falsy
  // Expected output: Exception BUG_TEAM_INVITE_NO_INVITE_ID
  // ──────────────────────────────────────────────
  describe('Decision line 35 - ID 03: InviteIDDontExist', () => {
    it('should throw BUG_TEAM_INVITE_NO_INVITE_ID when inviteID is not provided', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        BUG_TEAM_INVITE_NO_INVITE_ID,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 35 – ID 04
  // Test: inviteIDExist
  // Condition: F (false) — inviteID is present
  // Input: valid inviteID string
  // Expected output: Execution continues
  // ──────────────────────────────────────────────
  describe('Decision line 35 - ID 04: inviteIDExist', () => {
    it('should continue execution when inviteID is provided', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(O.none);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_INVITE_NO_INVITE_FOUND,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 39 – ID 05
  // Test: InvantioNotFound
  // Condition: V (true) — O.isNone(invitation)
  // Input: getInvitation returns O.none
  // Expected output: Expectation TEAM_INVITE_NO_INVITE_FOUND
  // ──────────────────────────────────────────────
  describe('Decision line 39 - ID 05: InvantioNotFound', () => {
    it('should throw TEAM_INVITE_NO_INVITE_FOUND when invitation does not exist', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(O.none);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_INVITE_NO_INVITE_FOUND,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 39 – ID 06
  // Test: InvantionFound
  // Condition: F (false) — !O.isNone(invitation)
  // Input: getInvitation returns a valid O.some(invitation)
  // Expected output: Execution continues
  // ──────────────────────────────────────────────
  describe('Decision line 39 - ID 06: InvantionFound', () => {
    it('should continue execution when invitation is found', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-id', inviteeEmail: 'user@example.com' }),
      );

      mockTeamService.getTeamMember.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_MEMBER_NOT_FOUND,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 47 – ID 07
  // Test: UserIsNotMember
  // Condition: V (true) — getTeamMember returns null
  // Input: getTeamMember(null)
  // Expected output: Expectation TEAM_MEMBER_NOT_FOUND
  // ──────────────────────────────────────────────
  describe('Decision line 47 - ID 07: UserIsNotMember', () => {
    it('should throw TEAM_MEMBER_NOT_FOUND when user is not a team member', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-id', inviteeEmail: 'user@example.com' }),
      );

      mockTeamService.getTeamMember.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_MEMBER_NOT_FOUND,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 47 – ID 08
  // Test: UserISMember
  // Condition: F (false) — getTeamMember returns valid member
  // Input: getTeamMember() returns valid member
  // Expected output: Execution continues
  // ──────────────────────────────────────────────
  describe('Decision line 47 - ID 08: UserISMember', () => {
    it('should continue execution when user is a valid team member', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-id', inviteeEmail: 'user@example.com' }),
      );

      mockTeamService.getTeamMember.mockResolvedValue({
        role: TeamAccessRole.VIEWER,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_NOT_REQUIRED_ROLE,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 48 – ID 09
  // Test: MemberIsNotOwner
  // Condition: V (true) — teamMember.role !== TeamAccessRole.OWNER
  // Input: teamMember.role is not OWNER
  // Expected output: Expectation TEAM_NOT_REQUIRED_ROLE
  // ──────────────────────────────────────────────
  describe('Decision line 48 - ID 09: MemberIsNotOwner', () => {
    it('should throw TEAM_NOT_REQUIRED_ROLE when team member is not an owner', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-id', inviteeEmail: 'user@example.com' }),
      );

      mockTeamService.getTeamMember.mockResolvedValue({
        role: TeamAccessRole.VIEWER,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_NOT_REQUIRED_ROLE,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 48 – ID 10
  // Test: MemberIsOwner
  // Condition: F (false) — teamMember.role === TeamAccessRole.OWNER
  // Input: teamMember.role equals OWNER
  // Expected output: Execution continues — returns true
  // ──────────────────────────────────────────────
  describe('Decision line 48 - ID 10: MemberIsOwner', () => {
    it('should return true when team member role is OWNER', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-id', inviteeEmail: 'user@example.com' }),
      );

      mockTeamService.getTeamMember.mockResolvedValue({
        role: TeamAccessRole.OWNER,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
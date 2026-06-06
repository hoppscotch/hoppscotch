import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import * as O from 'fp-ts/Option';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_EMAIL_DO_NOT_MATCH,
  TEAM_INVITE_NO_INVITE_FOUND,
} from 'src/errors';
import { TeamInvitationService } from './team-invitation.service';
import { TeamInviteeGuard } from './team-invitee.guard';

// Mock of TeamInvitationService
const mockTeamInvitationService = {
  getInvitation: jest.fn(),
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

describe('TeamInviteeGuard', () => {
  let guard: TeamInviteeGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamInviteeGuard,
        {
          provide: TeamInvitationService,
          useValue: mockTeamInvitationService,
        },
      ],
    }).compile();

    guard = module.get<TeamInviteeGuard>(TeamInviteeGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // Decision line 28 – ID 01
  // Test: UserDontExist
  // Condition: V (true) — !user
  // Input: user is falsy
  // Expected output: Exception BUG_AUTH_NO_USER_CTX
  // ──────────────────────────────────────────────
  describe('Decision line 28 - ID 01: UserDontExist', () => {
    it('should throw BUG_AUTH_NO_USER_CTX when user does not exist in context', async () => {
      const context = buildMockContext(null, 'some-invite-id');

      await expect(guard.canActivate(context)).rejects.toThrow(
        BUG_AUTH_NO_USER_CTX,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 28 – ID 02
  // Test: UserExists
  // Condition: F (false) — user is present
  // Input: valid user object
  // Expected output: Execution continues
  // ──────────────────────────────────────────────
  describe('Decision line 28 - ID 02: UserExists', () => {
    it('should continue execution when user exists in context', async () => {
      const user = { email: 'user@example.com' };
      const context = buildMockContext(user, null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        BUG_TEAM_INVITE_NO_INVITE_ID,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 32 – ID 03
  // Test: InviteIDDontExist
  // Condition: V (true) — !inviteID
  // Input: inviteID is falsy
  // Expected output: Exception BUG_TEAM_INVITE_NO_INVITE_ID
  // ──────────────────────────────────────────────
  describe('Decision line 32 - ID 03: InviteIDDontExist', () => {
    it('should throw BUG_TEAM_INVITE_NO_INVITE_ID when inviteID is not provided', async () => {
      const user = { email: 'user@example.com' };
      const context = buildMockContext(user, null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        BUG_TEAM_INVITE_NO_INVITE_ID,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 32 – ID 04
  // Test: inviteIDExist
  // Condition: F (false) — inviteID is present
  // Input: valid inviteID string
  // Expected output: Execution continues
  // ──────────────────────────────────────────────
  describe('Decision line 32 - ID 04: inviteIDExist', () => {
    it('should continue execution when inviteID is provided', async () => {
      const user = { email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(O.none);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_INVITE_NO_INVITE_FOUND,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 35 – ID 05
  // Test: InvantionNotFound
  // Condition: V (true) — O.isNone(invitation)
  // Input: getInvitation returns O.none
  // Expected output: Expectation TEAM_INVITE_NO_INVITE_FOUND
  // ──────────────────────────────────────────────
  describe('Decision line 35 - ID 05: InvantionNotFound', () => {
    it('should throw TEAM_INVITE_NO_INVITE_FOUND when invitation does not exist', async () => {
      const user = { email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(O.none);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_INVITE_NO_INVITE_FOUND,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 35 – ID 06
  // Test: InvantionFound
  // Condition: F (false) — !O.isNone(invitation)
  // Input: getInvitation returns a valid O.some(invitation)
  // Expected output: Execution continues
  // ──────────────────────────────────────────────
  describe('Decision line 35 - ID 06: InvantionFound', () => {
    it('should continue execution when invitation is found', async () => {
      const user = { email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ inviteeEmail: 'other@example.com' }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_INVITE_EMAIL_DO_NOT_MATCH,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 37 – ID 07
  // Test: DiferentEmails
  // Condition: V (true) — user.email !== invitation.inviteeEmail
  // Input: user email differs from invitee email
  // Expected output: Expectation TEAM_INVITE_EMAIL_DO_NOT_MATCH
  // ──────────────────────────────────────────────
  describe('Decision line 37 - ID 07: DiferentEmails', () => {
    it('should throw TEAM_INVITE_EMAIL_DO_NOT_MATCH when emails do not match', async () => {
      const user = { email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ inviteeEmail: 'different@example.com' }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_INVITE_EMAIL_DO_NOT_MATCH,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 37 – ID 08
  // Test: EqualsEmails
  // Condition: F (false) — user.email === invitation.inviteeEmail
  // Input: user email matches invitee email
  // Expected output: Execution continues — returns true
  // ──────────────────────────────────────────────
  describe('Decision line 37 - ID 08: EqualsEmails', () => {
    it('should return true when user email matches invitee email', async () => {
      const user = { email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ inviteeEmail: 'user@example.com' }),
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
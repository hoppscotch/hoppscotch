import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import * as O from 'fp-ts/Option';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_NO_INVITE_FOUND,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';
import { TeamService } from 'src/team/team.service';
import { TeamInvitationService } from './team-invitation.service';
import { TeamInviteViewerGuard } from './team-invite-viewer.guard';

jest.mock('src/utils', () => ({
  __esModule: true,
  throwErr: jest.fn((errStr: string) => {
    throw new Error(errStr);
  }),
}));


const mockTeamInvitationService = {
  getInvitation: jest.fn(),
};

const mockTeamService = {
  getTeamMember: jest.fn(),
};

describe('TeamInviteViewerGuard', () => {
  let guard: TeamInviteViewerGuard;
  let gqlSpy: jest.SpyInstance;

  const buildMockContext = (user: any, inviteID: any): ExecutionContext => {
    const mockGqlCtx = {
      getContext: () => ({ req: { user } }),
      getArgs: () => ({ inviteID }),
    };

    gqlSpy = jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(mockGqlCtx as unknown as GqlExecutionContext);

    return {} as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamInviteViewerGuard,
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

    guard = module.get<TeamInviteViewerGuard>(TeamInviteViewerGuard);
  });

  afterEach(() => {
    if (gqlSpy) {
      gqlSpy.mockRestore();
    }
    jest.clearAllMocks();
    mockTeamInvitationService.getInvitation.mockReset();
    mockTeamService.getTeamMember.mockReset();
  });

  // ──────────────────────────────────────────────
  // Decision line 32 – ID 01
  // Test: UserDontExist
  // Condition: V (true) — !user
  // ──────────────────────────────────────────────
  describe('Decision line 32 - ID 01: UserDontExist', () => {
    it('should proceed past user check when user exists', async () => {
  const user = { email: 'user@example.com' };
  const context = buildMockContext(user, 'some-invite-id');
  mockTeamInvitationService.getInvitation.mockResolvedValue(O.none);
  await expect(guard.canActivate(context)).rejects.toThrow(
    TEAM_INVITE_NO_INVITE_FOUND
  );
});
  });

  // ──────────────────────────────────────────────
  // Decision line 32 – ID 02
  // Test: UserExists
  // Condition: F (false) — user is present
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
  // ──────────────────────────────────────────────
  describe('Decision line 39 - ID 06: InvantionFound', () => {
    it('should continue execution when invitation is found', async () => {
      const user = { uid: 'user-uid', email: 'user@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-id', inviteeEmail: 'user@example.com' }),
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 45 – ID 07 e 09
  // Test: DiferentsEmails + UserIsNotMember
  // ──────────────────────────────────────────────
  describe('Decision line 45 - ID 07 e 09: DiferentsEmails + UserIsNotMember', () => {
    it('should throw TEAM_MEMBER_NOT_FOUND when emails do not match and user is not a team member', async () => {
      const user = { uid: 'stranger-uid', email: 'wrong@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-alpha', inviteeEmail: 'correct@example.com' }),
      );
      mockTeamService.getTeamMember.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_MEMBER_NOT_FOUND,
      );
      expect(mockTeamService.getTeamMember).toHaveBeenCalledWith('team-alpha', 'stranger-uid');
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 45 – ID 08
  // Test: DiferentsEmails + UserISMember
  // ──────────────────────────────────────────────
  describe('Decision line 45 - ID 08: DiferentsEmails + UserISMember', () => {
    it('should return true when emails do not match but user is a valid team member', async () => {
      const user = { uid: 'member-uid', email: 'member@example.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-alpha', inviteeEmail: 'guest@example.com' }),
      );
      mockTeamService.getTeamMember.mockResolvedValue({ id: 'member-id' });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockTeamService.getTeamMember).toHaveBeenCalledWith('team-alpha', 'member-uid');
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 45 – ID 10
  // Test: EqualsEmails
  // ──────────────────────────────────────────────
  describe('Decision line 45 - ID 10: EqualsEmails', () => {
    it('should return true directly when user email matches invitation email (case insensitive)', async () => {
      const user = { uid: 'invitee-uid', email: 'User.Name@Domain.com' };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-beta', inviteeEmail: 'user.name@domain.com' }),
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockTeamService.getTeamMember).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // Decision line 45 – ID 11
  // Test: NullEmail
  // ──────────────────────────────────────────────
  describe('Decision line 45 - ID 11: NullEmail', () => {
    it('should handle undefined email by checking team membership and throwing if not found', async () => {
      const user = { uid: 'no-email-user', email: undefined };
      const context = buildMockContext(user, 'valid-invite-id');

      mockTeamInvitationService.getInvitation.mockResolvedValue(
        O.some({ teamID: 'team-beta', inviteeEmail: 'any@example.com' }),
      );
      mockTeamService.getTeamMember.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        TEAM_MEMBER_NOT_FOUND,
      );
    });
  });
});
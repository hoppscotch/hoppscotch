import { TeamInvitationService } from './team-invitation.service';
import { TeamAccessRole } from 'src/team/team.model';
import {
  INVALID_EMAIL,
  TEAM_INVALID_ID,
  TEAM_INVITE_ALREADY_MEMBER,
  TEAM_INVITE_EMAIL_DO_NOT_MATCH,
  TEAM_INVITE_MEMBER_HAS_INVITE,
  TEAM_INVITE_NO_INVITE_FOUND,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { AuthUser } from 'src/types/AuthUser';

// Mocks 
const mockPrisma = {
  teamInvitation: {
    findFirstOrThrow: jest.fn() as any,
    create: jest.fn() as any,
    findUniqueOrThrow: jest.fn() as any,
    delete: jest.fn() as any,
    findMany: jest.fn() as any,
  },
} as any;

const mockUserService = {
  findUserByEmail: jest.fn() as any,
  findUserById: jest.fn() as any,
} as any;

const mockTeamService = {
  getTeamWithID: jest.fn() as any,
  getTeamMember: jest.fn() as any,
  addMemberToTeam: jest.fn() as any,
  getTeamWithIDTE: jest.fn() as any,
} as any;

const mockMailerService = {
  sendEmail: jest.fn() as any,
} as any;

const mockPubSub = {
  publish: jest.fn() as any,
  asyncIterator: jest.fn() as any,
} as any;

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:3000') as any,
} as any;

// Fixtures 

const mockCreator: AuthUser = {
  uid: 'creator-uid',
  email: 'creator@example.com',
  displayName: 'Creator User',
  photoURL: null,
  isAdmin: false,
  refreshToken: 'token',
  currentGQLSession: {},
  currentRESTSession: {},
  createdOn: new Date(),
  lastLoggedOn: new Date(),
  lastActiveOn: new Date(),
};

const mockInvitee: AuthUser = {
  uid: 'invitee-uid',
  email: 'invitee@example.com',
  displayName: 'Invitee User',
  photoURL: null,
  isAdmin: false,
  refreshToken: 'token',
  currentGQLSession: {},
  currentRESTSession: {},
  createdOn: new Date(),
  lastLoggedOn: new Date(),
  lastActiveOn: new Date(),
};

const mockTeam = {
  id: 'team-id-123',
  name: 'Test Team',
};

const mockTeamMember = {
  membershipID: 'membership-id',
  role: TeamAccessRole.OWNER,
  userUid: mockCreator.uid,
};

const mockDbInvitation = {
  id: 'invite-id-123',
  teamID: mockTeam.id,
  creatorUid: mockCreator.uid,
  inviteeEmail: mockInvitee.email,
  inviteeRole: TeamAccessRole.VIEWER,
};

//Service Instance 
let service: TeamInvitationService;

beforeEach(() => {
  jest.clearAllMocks();

  service = new TeamInvitationService(
    mockPrisma,
    mockUserService,
    mockTeamService,
    mockMailerService,
    mockPubSub,
    mockConfigService,
  );
});


// createInvitation
describe('createInvitation — Black-Box', () => {
  test('TC-01: should reject email with invalid format', async () => {
    const result = await service.createInvitation(mockCreator, mockTeam.id, 'invalid-email', TeamAccessRole.VIEWER);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(INVALID_EMAIL);
  });

  test('TC-02: should reject empty email', async () => {
    const result = await service.createInvitation(mockCreator, mockTeam.id, '', TeamAccessRole.VIEWER);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(INVALID_EMAIL);
  });

  test('TC-03: should reject when teamID does not exist', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(null);
    const result = await service.createInvitation(mockCreator, 'invalid-id', mockInvitee.email, TeamAccessRole.VIEWER);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVALID_ID);
  });

  test('TC-04: should reject when the creator is not a team member', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(mockTeam);
    mockTeamService.getTeamMember.mockResolvedValue(null);
    const result = await service.createInvitation(mockCreator, mockTeam.id, mockInvitee.email, TeamAccessRole.VIEWER);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_MEMBER_NOT_FOUND);
  });

  test('TC-05: should reject when the invitee is already a team member', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(mockTeam);
    mockTeamService.getTeamMember
      .mockResolvedValueOnce(mockTeamMember)
      .mockResolvedValueOnce(mockTeamMember);
    mockUserService.findUserByEmail.mockResolvedValue(O.some({ uid: mockInvitee.uid }));
    const result = await service.createInvitation(mockCreator, mockTeam.id, mockInvitee.email, TeamAccessRole.VIEWER);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVITE_ALREADY_MEMBER);
  });

  test('TC-06: should reject when there is already a pending invite', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(mockTeam);
    mockTeamService.getTeamMember.mockResolvedValue(mockTeamMember);
    mockUserService.findUserByEmail.mockResolvedValue(O.none);
    mockPrisma.teamInvitation.findFirstOrThrow.mockResolvedValue(mockDbInvitation);
    const result = await service.createInvitation(mockCreator, mockTeam.id, mockInvitee.email, TeamAccessRole.VIEWER);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVITE_MEMBER_HAS_INVITE);
  });

  test('TC-07: should create invitation successfully', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(mockTeam);
    mockTeamService.getTeamMember.mockResolvedValue(mockTeamMember);
    mockUserService.findUserByEmail.mockResolvedValue(O.none);
    mockPrisma.teamInvitation.findFirstOrThrow.mockRejectedValue(new Error('Not Found'));
    mockPrisma.teamInvitation.create.mockResolvedValue(mockDbInvitation);
    mockMailerService.sendEmail.mockResolvedValue(undefined);
    mockPubSub.publish.mockResolvedValue(undefined);

    const result = await service.createInvitation(mockCreator, mockTeam.id, mockInvitee.email, TeamAccessRole.VIEWER);
    expect(E.isRight(result)).toBe(true);
  });
});

describe('createInvitation — White-Box', () => {
  test('TC-B01: should skip membership verification when invitee has no account', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(mockTeam);
    mockTeamService.getTeamMember.mockResolvedValue(mockTeamMember);
    mockUserService.findUserByEmail.mockResolvedValue(O.none);
    mockPrisma.teamInvitation.findFirstOrThrow.mockRejectedValue(new Error('Not Found'));
    mockPrisma.teamInvitation.create.mockResolvedValue(mockDbInvitation);
    mockMailerService.sendEmail.mockResolvedValue(undefined);
    mockPubSub.publish.mockResolvedValue(undefined);

    await service.createInvitation(mockCreator, mockTeam.id, mockInvitee.email, TeamAccessRole.VIEWER);
    expect(mockTeamService.getTeamMember).toHaveBeenCalledTimes(1);
  });

  test('TC-B02: should proceed when invitee has an account but is not a member', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(mockTeam);
    mockTeamService.getTeamMember
      .mockResolvedValueOnce(mockTeamMember)
      .mockResolvedValueOnce(null);
    mockUserService.findUserByEmail.mockResolvedValue(O.some({ uid: 'other-uid' }));
    mockPrisma.teamInvitation.findFirstOrThrow.mockRejectedValue(new Error('Not Found'));
    mockPrisma.teamInvitation.create.mockResolvedValue(mockDbInvitation);
    mockMailerService.sendEmail.mockResolvedValue(undefined);
    mockPubSub.publish.mockResolvedValue(undefined);

    await service.createInvitation(mockCreator, mockTeam.id, mockInvitee.email, TeamAccessRole.VIEWER);
    expect(mockTeamService.getTeamMember).toHaveBeenCalledTimes(2);
  });

  test('TC-B03: should publish pubsub event after creation', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(mockTeam);
    mockTeamService.getTeamMember.mockResolvedValue(mockTeamMember);
    mockUserService.findUserByEmail.mockResolvedValue(O.none);
    mockPrisma.teamInvitation.findFirstOrThrow.mockRejectedValue(new Error('Not Found'));
    mockPrisma.teamInvitation.create.mockResolvedValue(mockDbInvitation);
    mockMailerService.sendEmail.mockResolvedValue(undefined);

    await service.createInvitation(mockCreator, mockTeam.id, mockInvitee.email, TeamAccessRole.VIEWER);
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team/${mockTeam.id}/invite_added`,
      expect.anything()
    );
  });
});

// acceptInvitation
describe('acceptInvitation — Black-Box', () => {
  test('TC-08: should reject when the invitation does not exist', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockRejectedValue(new Error('Not Found'));
    const result = await service.acceptInvitation('invalid-id', mockInvitee);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVITE_NO_INVITE_FOUND);
  });

  test('TC-09: should reject when the acceptor is already a team member', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockTeamService.getTeamMember.mockResolvedValue(mockTeamMember);
    const result = await service.acceptInvitation(mockDbInvitation.id, mockInvitee);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVITE_ALREADY_MEMBER);
  });

  test('TC-10: should reject when acceptor email does not match', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockTeamService.getTeamMember.mockResolvedValue(null);
    const wrongUser = { ...mockInvitee, email: 'wrong@example.com' };
    const result = await service.acceptInvitation(mockDbInvitation.id, wrongUser);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVITE_EMAIL_DO_NOT_MATCH);
  });

  test('TC-11: should accept invitation successfully', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockTeamService.getTeamMember.mockResolvedValue(null);
    mockTeamService.addMemberToTeam.mockResolvedValue({
      membershipID: 'new-membership',
      role: TeamAccessRole.VIEWER,
      userUid: mockInvitee.uid,
    });
    mockPrisma.teamInvitation.delete.mockResolvedValue(mockDbInvitation);
    mockPubSub.publish.mockResolvedValue(undefined);

    const result = await service.acceptInvitation(mockDbInvitation.id, mockInvitee);
    expect(E.isRight(result)).toBe(true);
  });
});

describe('acceptInvitation — White-Box', () => {
  test('TC-B04: should accept invitation when email differs only in casing', async () => {
    const inviteUpper = { ...mockDbInvitation, inviteeEmail: 'INVITEE@EXAMPLE.COM' };
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(inviteUpper);
    mockTeamService.getTeamMember.mockResolvedValue(null);
    mockTeamService.addMemberToTeam.mockResolvedValue({ membershipID: 'new-membership', role: TeamAccessRole.VIEWER, userUid: mockInvitee.uid });
    mockPrisma.teamInvitation.delete.mockResolvedValue(inviteUpper);
    mockPubSub.publish.mockResolvedValue(undefined);

    const result = await service.acceptInvitation(inviteUpper.id, mockInvitee);
    expect(E.isRight(result)).toBe(true);
  });

  test('TC-B05: should return TEAM_INVITE_ALREADY_MEMBER when addMemberToTeam fails', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockTeamService.getTeamMember.mockResolvedValue(null);
    mockTeamService.addMemberToTeam.mockRejectedValue(new Error('Unique constraint'));
    
    const result = await service.acceptInvitation(mockDbInvitation.id, mockInvitee);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVITE_ALREADY_MEMBER);
  });

  test('TC-B06: should revoke the invitation after successful acceptance', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockTeamService.getTeamMember.mockResolvedValue(null);
    mockTeamService.addMemberToTeam.mockResolvedValue({ membershipID: 'new-membership', role: TeamAccessRole.VIEWER, userUid: mockInvitee.uid });
    mockPrisma.teamInvitation.delete.mockResolvedValue(mockDbInvitation);
    mockPubSub.publish.mockResolvedValue(undefined);

    await service.acceptInvitation(mockDbInvitation.id, mockInvitee);
    expect(mockPrisma.teamInvitation.delete).toHaveBeenCalledWith({ where: { id: mockDbInvitation.id } });
  });
});


// revokeInvitation
describe('revokeInvitation — Black-Box', () => {
  test('TC-12: should return error when invitation does not exist', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockRejectedValue(new Error('Not Found'));
    const result = await service.revokeInvitation('invalid-id');
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left).toBe(TEAM_INVITE_NO_INVITE_FOUND);
  });

  test('TC-13: should revoke invitation successfully and return true', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockPrisma.teamInvitation.delete.mockResolvedValue(mockDbInvitation);
    mockPubSub.publish.mockResolvedValue(undefined);

    const result = await service.revokeInvitation(mockDbInvitation.id);
    expect(E.isRight(result)).toBe(true);
  });
});

describe('revokeInvitation — White-Box', () => {
  test('TC-B07: should publish invite_removed event after revoking', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockPrisma.teamInvitation.delete.mockResolvedValue(mockDbInvitation);
    
    await service.revokeInvitation(mockDbInvitation.id);
    expect(mockPubSub.publish).toHaveBeenCalledWith(`team/${mockDbInvitation.teamID}/invite_removed`, mockDbInvitation.id);
  });

  test('TC-B08: should call prisma.delete with the correct ID', async () => {
    mockPrisma.teamInvitation.findUniqueOrThrow.mockResolvedValue(mockDbInvitation);
    mockPrisma.teamInvitation.delete.mockResolvedValue(mockDbInvitation);
    
    await service.revokeInvitation(mockDbInvitation.id);
    expect(mockPrisma.teamInvitation.delete).toHaveBeenCalledWith({ where: { id: mockDbInvitation.id } });
  });
});


// getTeamInvitations
describe('getTeamInvitations', () => {
  test('TC-14: should return an empty array when no invitations are found', async () => {
    mockPrisma.teamInvitation.findMany.mockResolvedValue([]);
    const result = await service.getTeamInvitations(mockTeam.id);
    expect(result).toEqual([]);
  });

  test('TC-15: should return an array of mapped TeamInvitation objects', async () => {
    mockPrisma.teamInvitation.findMany.mockResolvedValue([mockDbInvitation]);
    const result = await service.getTeamInvitations(mockTeam.id);
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(mockDbInvitation.id);
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { TeamTeamInviteExtResolver } from './team-teaminvite-ext.resolver';
import { TeamInvitationService } from './team-invitation.service';
import { Team } from 'src/team/team.model';
import { TeamInvitation } from './team-invitation.model';
 
// Mock of TeamInvitationService
const mockTeamInvitationService = {
  getTeamInvitations: jest.fn(),
};
 
describe('TeamTeamInviteExtResolver', () => {
  let resolver: TeamTeamInviteExtResolver;
  let teamInvitationService: TeamInvitationService;
 
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamTeamInviteExtResolver,
        {
          provide: TeamInvitationService,
          useValue: mockTeamInvitationService,
        },
      ],
    }).compile();
 
    resolver = module.get<TeamTeamInviteExtResolver>(TeamTeamInviteExtResolver);
    teamInvitationService = module.get<TeamInvitationService>(TeamInvitationService);
  });
 
  afterEach(() => {
    jest.clearAllMocks();
  });
 
  // ──────────────────────────────────────────────
  // Class 1 – ValidString
  // Input: Team.id with a valid string
  // Expected output: returns the array of invitations
  // ──────────────────────────────────────────────
  describe('Class 1 - ValidString', () => {
    it('should return the TeamInvitations array when Team.id is a valid string', async () => {
      const mockInvitations: TeamInvitation[] = [
        { id: 'inv-1' } as TeamInvitation,
        { id: 'inv-2' } as TeamInvitation,
      ];
 
      mockTeamInvitationService.getTeamInvitations.mockResolvedValue(mockInvitations);
 
      const team = { id: 'valid-team-id-123' } as Team;
 
      const result = await resolver.teamInvitations(team);
 
      expect(teamInvitationService.getTeamInvitations).toHaveBeenCalledWith('valid-team-id-123');
      expect(result).toEqual(mockInvitations);
      expect(result).toHaveLength(2);
    });
  });
 
  // ──────────────────────────────────────────────
  // Class 2 – NullString
  // Input: Team.id = null
  // Expected output: Error/exception "Team id NULL"
  // ──────────────────────────────────────────────
  describe('Class 2 - NullString', () => {
    it('should throw exception "Team id NULL" when Team.id is null', async () => {
      mockTeamInvitationService.getTeamInvitations.mockRejectedValue(
        new Error('Team id NULL'),
      );
 
      const team = { id: null } as unknown as Team;
 
      await expect(resolver.teamInvitations(team)).rejects.toThrow('Team id NULL');
      expect(teamInvitationService.getTeamInvitations).toHaveBeenCalledWith(null);
    });
  });
 
  // ──────────────────────────────────────────────
  // Class 3 – StringEmpty
  // Input: Team.id = ""
  // Expected output: Error/exception "Team id is Empty"
  // ──────────────────────────────────────────────
  describe('Class 3 - StringEmpty', () => {
    it('should throw exception "Team id is Empty" when Team.id is an empty string', async () => {
      mockTeamInvitationService.getTeamInvitations.mockRejectedValue(
        new Error('Team id is Empty'),
      );
 
      const team = { id: '' } as Team;
 
      await expect(resolver.teamInvitations(team)).rejects.toThrow('Team id is Empty');
      expect(teamInvitationService.getTeamInvitations).toHaveBeenCalledWith('');
    });
  });
 
  // ──────────────────────────────────────────────
  // Class 4 – StringUndefined
  // Input: Team.id = undefined
  // Expected output: Error/exception "Team id is Underfined"
  // ──────────────────────────────────────────────
  describe('Class 4 - StringUndefined', () => {
    it('should throw exception "Team id is Underfined" when Team.id is undefined', async () => {
      mockTeamInvitationService.getTeamInvitations.mockRejectedValue(
        new Error('Team id is Underfined'),
      );
 
      const team = { id: undefined } as unknown as Team;
 
      await expect(resolver.teamInvitations(team)).rejects.toThrow('Team id is Underfined');
      expect(teamInvitationService.getTeamInvitations).toHaveBeenCalledWith(undefined);
    });
  });
});
 
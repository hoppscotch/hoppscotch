import { TEAM_MEMBER_NOT_FOUND } from 'src/errors';
import { TeamEnvsTeamResolver } from 'src/team-environments/team.resolver';
import { TeamTeamInviteExtResolver } from 'src/team-invitation/team-teaminvite-ext.resolver';
import { AuthUser } from 'src/types/AuthUser';
import { TeamResolver } from './team.resolver';

const invitee = { uid: 'invitee', isAdmin: false } as AuthUser;
const team = { id: 'team-1', name: 'Acme' };

function deniedGuard() {
  return {
    assertCanRead: jest.fn().mockRejectedValue(new Error(TEAM_MEMBER_NOT_FOUND)),
  };
}

describe('team field resolvers', () => {
  test('does not load environments for a non-member', async () => {
    const guard = deniedGuard();
    const environments = { fetchAllTeamEnvironments: jest.fn() };
    const resolver = new TeamEnvsTeamResolver(
      environments as never,
      guard as never,
    );

    await expect(resolver.teamEnvironments(team, invitee)).rejects.toThrow(
      TEAM_MEMBER_NOT_FOUND,
    );
    expect(guard.assertCanRead).toHaveBeenCalledWith(invitee, team.id);
    expect(environments.fetchAllTeamEnvironments).not.toHaveBeenCalled();
  });

  test('does not load invitations for a non-member', async () => {
    const guard = deniedGuard();
    const invitations = { getTeamInvitations: jest.fn() };
    const resolver = new TeamTeamInviteExtResolver(
      invitations as never,
      guard as never,
    );

    await expect(resolver.teamInvitations(team, invitee)).rejects.toThrow(
      TEAM_MEMBER_NOT_FOUND,
    );
    expect(invitations.getTeamInvitations).not.toHaveBeenCalled();
  });

  test('does not load members for a non-member', async () => {
    const guard = deniedGuard();
    const teamService = {
      getMembersOfTeam: jest.fn(),
      getTeamMembers: jest.fn(),
    };
    const resolver = new TeamResolver(
      teamService as never,
      {} as never,
      {} as never,
      guard as never,
    );

    await expect(resolver.teamMembers(team, invitee)).rejects.toThrow(
      TEAM_MEMBER_NOT_FOUND,
    );
    expect(teamService.getTeamMembers).not.toHaveBeenCalled();
    expect(teamService.getMembersOfTeam).not.toHaveBeenCalled();
  });
});

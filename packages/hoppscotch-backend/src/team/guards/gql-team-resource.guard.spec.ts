import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_NO_TEAM_ID,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';
import { TeamAccessRole } from '../team.model';
import { GqlTeamResourceGuard } from './gql-team-resource.guard';

describe('GqlTeamResourceGuard', () => {
  const getTeamMember = jest.fn();
  const guard = new GqlTeamResourceGuard({ getTeamMember } as never);

  beforeEach(() => {
    getTeamMember.mockReset();
  });

  test('rejects a request with no authenticated user', async () => {
    await expect(guard.assertCanRead(undefined, 'team-1')).rejects.toThrow(
      BUG_AUTH_NO_USER_CTX,
    );
    expect(getTeamMember).not.toHaveBeenCalled();
  });

  test('allows an instance admin who is not a team member', async () => {
    await expect(
      guard.assertCanRead({ uid: 'admin', isAdmin: true }, 'team-1'),
    ).resolves.toBeUndefined();
    expect(getTeamMember).not.toHaveBeenCalled();
  });

  test('allows a team member only after the membership lookup', async () => {
    getTeamMember.mockResolvedValue({
      membershipID: 'membership-1',
      userUid: 'member',
      role: TeamAccessRole.VIEWER,
    });

    await expect(
      guard.assertCanRead({ uid: 'member', isAdmin: false }, 'team-1'),
    ).resolves.toBeUndefined();
    expect(getTeamMember).toHaveBeenCalledWith('team-1', 'member');
  });

  test('rejects a pending invitee who is not a member', async () => {
    getTeamMember.mockResolvedValue(null);

    await expect(
      guard.assertCanRead({ uid: 'invitee', isAdmin: false }, 'team-1'),
    ).rejects.toThrow(TEAM_MEMBER_NOT_FOUND);
    expect(getTeamMember).toHaveBeenCalledWith('team-1', 'invitee');
  });

  test('rejects a non-member when the parent team has no id', async () => {
    await expect(
      guard.assertCanRead({ uid: 'invitee', isAdmin: false }, undefined),
    ).rejects.toThrow(BUG_TEAM_NO_TEAM_ID);
    expect(getTeamMember).not.toHaveBeenCalled();
  });
});

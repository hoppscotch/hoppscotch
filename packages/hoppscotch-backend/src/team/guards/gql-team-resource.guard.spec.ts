import { ExecutionContext } from '@nestjs/common';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_NO_TEAM_ID,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';
import { TeamAccessRole } from '../team.model';
import { GqlTeamResourceGuard } from './gql-team-resource.guard';

function graphqlContext(
  parent: { id?: string } | null,
  user: { uid?: string; isAdmin?: boolean } | undefined,
  viaHeaders = false,
): ExecutionContext {
  const gqlCtx = viaHeaders ? { headers: { user } } : { req: { user } };
  const args = [parent, {}, gqlCtx, {}];

  return {
    getType: () => 'graphql',
    getClass: () => class TestClass {},
    getHandler: () => function testHandler() {},
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
    switchToHttp: () => ({
      getRequest: () => (viaHeaders ? undefined : gqlCtx),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    switchToRpc: () => ({
      getData: () => undefined,
      getContext: () => undefined,
    }),
    switchToWs: () => ({
      getData: () => undefined,
      getClient: () => undefined,
      getPattern: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('GqlTeamResourceGuard', () => {
  const getTeamMember = jest.fn();
  const guard = new GqlTeamResourceGuard({ getTeamMember } as never);

  beforeEach(() => {
    getTeamMember.mockReset();
  });

  test('rejects a request with no authenticated user', async () => {
    await expect(
      guard.canActivate(graphqlContext({ id: 'team-1' }, undefined)),
    ).rejects.toThrow(BUG_AUTH_NO_USER_CTX);
    expect(getTeamMember).not.toHaveBeenCalled();
  });

  test('allows an instance admin who is not a team member', async () => {
    await expect(
      guard.canActivate(
        graphqlContext({ id: 'team-1' }, { uid: 'admin', isAdmin: true }),
      ),
    ).resolves.toBe(true);
    expect(getTeamMember).not.toHaveBeenCalled();
  });

  test('allows a team member', async () => {
    getTeamMember.mockResolvedValue({
      membershipID: 'membership-1',
      userUid: 'member',
      role: TeamAccessRole.VIEWER,
    });

    await expect(
      guard.canActivate(
        graphqlContext({ id: 'team-1' }, { uid: 'member', isAdmin: false }),
      ),
    ).resolves.toBe(true);
    expect(getTeamMember).toHaveBeenCalledWith('team-1', 'member');
  });

  test('allows a team member when the user is carried on subscription headers', async () => {
    getTeamMember.mockResolvedValue({
      membershipID: 'membership-1',
      userUid: 'member',
      role: TeamAccessRole.OWNER,
    });

    await expect(
      guard.canActivate(
        graphqlContext(
          { id: 'team-1' },
          { uid: 'member', isAdmin: false },
          true,
        ),
      ),
    ).resolves.toBe(true);
  });

  test('rejects a pending invitee who is not a member', async () => {
    getTeamMember.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        graphqlContext({ id: 'team-1' }, { uid: 'invitee', isAdmin: false }),
      ),
    ).rejects.toThrow(TEAM_MEMBER_NOT_FOUND);
  });

  test('rejects a non-member when the parent team has no id', async () => {
    await expect(
      guard.canActivate(
        graphqlContext({}, { uid: 'invitee', isAdmin: false }),
      ),
    ).rejects.toThrow(BUG_TEAM_NO_TEAM_ID);
    expect(getTeamMember).not.toHaveBeenCalled();
  });
});

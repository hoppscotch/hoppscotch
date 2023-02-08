import { PrismaService } from '../prisma/prisma.service';
import { TeamCollectionService } from '../team-collection/team-collection.service';
import { TeamService } from '../team/team.service';
import { TeamRequestService } from './team-request.service';
import {
  TEAM_REQ_INVALID_TARGET_COLL_ID,
  TEAM_INVALID_COLL_ID,
  TEAM_INVALID_ID,
  TEAM_REQ_NOT_FOUND,
} from 'src/errors';
import { mockDeep, mockReset } from 'jest-mock-extended';
import * as TO from 'fp-ts/TaskOption';
import { TeamCollection } from 'src/team-collection/team-collection.model';
import { TeamRequest } from './team-request.model';

const mockPrisma = mockDeep<PrismaService>();

const mockTeamService = mockDeep<TeamService>();

const mockTeamCollectionService = mockDeep<TeamCollectionService>();

const mockPubSub = {
  publish: jest.fn().mockResolvedValue(null),
};

const teamRequestService = new TeamRequestService(
  mockPrisma as any,
  mockTeamService as any,
  mockTeamCollectionService as any,
  mockPubSub as any,
);

beforeEach(async () => {
  mockReset(mockPrisma);
});

describe('updateTeamRequest', () => {
  test('resolves correctly if title is null', async () => {
    mockPrisma.teamRequest.update.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    await expect(
      teamRequestService.updateTeamRequest('testrequest', {
        request: '{}',
        title: undefined,
      }),
    ).resolves.toBeDefined();
  });

  test('resolves correctly if request is null', async () => {
    mockPrisma.teamRequest.update.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    await expect(
      teamRequestService.updateTeamRequest('testrequest', {
        request: undefined,
        title: 'Test Request',
      }),
    ).resolves.toBeDefined();
  });

  test('resolves correctly if both request and title are null', async () => {
    mockPrisma.teamRequest.update.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    await expect(
      teamRequestService.updateTeamRequest('testrequest', {
        request: undefined,
        title: undefined,
      }),
    ).resolves.toBeDefined();
  });

  test('resolves correctly for non-null request and title', async () => {
    mockPrisma.teamRequest.update.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    await expect(
      teamRequestService.updateTeamRequest('testrequest', {
        request: '{}',
        title: 'Test Request',
      }),
    ).resolves.toBeDefined();
  });

  test('rejects for invalid request id', async () => {
    mockPrisma.teamRequest.update.mockRejectedValue('RecordNotFound');

    await expect(
      teamRequestService.updateTeamRequest('invalidtestreq', {
        request: undefined,
        title: undefined,
      }),
    ).rejects.toBeDefined();
  });

  test('resolves for valid request id', async () => {
    mockPrisma.teamRequest.update.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    await expect(
      teamRequestService.updateTeamRequest('testrequest', {
        request: undefined,
        title: undefined,
      }),
    ).resolves.toBeDefined();
  });

  test('publishes update to pubsub topic "team_req/<team_id>/req_updated"', async () => {
    mockPrisma.teamRequest.update.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    const result = await teamRequestService.updateTeamRequest('testrequest', {
      request: undefined,
      title: undefined,
    });

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      'team_req/3170/req_updated',
      result,
    );
  });
});

describe('searchRequest', () => {
  test('resolves with the correct info with a null cursor', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
      },
    ]);

    await expect(
      teamRequestService.searchRequest('3170', 'Test', null),
    ).resolves.toBeDefined();
  });

  test('resolves with an empty array when a match with the search term is not found', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([]);

    await expect(
      teamRequestService.searchRequest('3170', 'Test', null),
    ).resolves.toBeDefined();
  });

  test('resolves with the correct info with a set cursor', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest1',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 1',
      },
      {
        id: 'testrequest2',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 2',
      },
      {
        id: 'testrequest3',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 3',
      },
      {
        id: 'testrequest4',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 4',
      },
      {
        id: 'testrequest5',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 5',
      },
      {
        id: 'testrequest6',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 6',
      },
      {
        id: 'testrequest7',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 7',
      },
      {
        id: 'testrequest8',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 8',
      },
      {
        id: 'testrequest9',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 9',
      },
      {
        id: 'testrequest10',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 10',
      },
    ]);

    const secondColl = (
      await teamRequestService.searchRequest('3170', 'Test', null)
    )[1];

    mockReset(mockPrisma);
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest11',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 11',
      },
    ]);

    await expect(
      teamRequestService.searchRequest('3170', 'Test', secondColl.id),
    ).resolves.toBeDefined();
  });

  test('resolves with the first ten elements when a null cursor is entered', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest1',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 1',
      },
      {
        id: 'testrequest2',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 2',
      },
      {
        id: 'testrequest3',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 3',
      },
      {
        id: 'testrequest4',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 4',
      },
      {
        id: 'testrequest5',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 5',
      },
      {
        id: 'testrequest6',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 6',
      },
      {
        id: 'testrequest7',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 7',
      },
      {
        id: 'testrequest8',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 8',
      },
      {
        id: 'testrequest9',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 9',
      },
      {
        id: 'testrequest10',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 10',
      },
    ]);

    await expect(
      teamRequestService.searchRequest('3170', 'Test', null),
    ).resolves.toHaveLength(10);
  });
});

describe('deleteTeamRequest', () => {
  test('rejects if the request id is not found', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null as any);

    mockPrisma.teamRequest.delete.mockRejectedValue('RecordNotFound');

    await expect(
      teamRequestService.deleteTeamRequest('invalidrequest'),
    ).rejects.toThrow(TEAM_REQ_NOT_FOUND);
    expect(mockPrisma.teamRequest.delete).not.toHaveBeenCalled();
  });

  test('resolves for a valid request id', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    mockPrisma.teamRequest.delete.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    await expect(
      teamRequestService.deleteTeamRequest('testrequest'),
    ).resolves.toBeUndefined();
  });

  test('publishes deletion to pubsub topic "team_req/<team_id>/req_deleted"', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    mockPrisma.teamRequest.delete.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      'team_req/3170/req_deleted',
      'testrequest',
    );
  });
});

describe('createTeamRequest', () => {
  test('rejects for invalid collection id', async () => {
    mockPrisma.teamCollection.findUnique.mockRejectedValue(
      TEAM_INVALID_COLL_ID,
    );

    mockPrisma.teamRequest.create.mockRejectedValue(null as any);

    await expect(
      teamRequestService.createTeamRequest('invalidcollid', {
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
      }),
    ).rejects.toBeDefined();

    expect(mockPrisma.teamRequest.create).not.toHaveBeenCalled();
  });

  test('resolves for valid collection id', async () => {
    mockTeamCollectionService.getTeamOfCollection.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection',
      parentID: null,
      teamID: '3170',
      team: {
        id: '3170',
        name: 'Test Team',
      },
    } as any);

    mockPrisma.teamRequest.create.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
      team: {
        id: '3170',
        name: 'Test Team',
      },
      collection: {
        id: 'testcoll',
        title: 'Test Collection',
        parentID: null,
        teamID: '3170',
      },
    } as any);

    await expect(
      teamRequestService.createTeamRequest('testcoll', {
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
      }),
    ).resolves.toBeDefined();
  });

  test('publishes creation to pubsub topic "team_req/<team_id>/req_created"', async () => {
    mockTeamCollectionService.getTeamOfCollection.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection',
      parentID: null,
      teamID: '3170',
      team: {
        id: '3170',
        name: 'Test Team',
      },
    } as any);

    mockPrisma.teamRequest.create.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
      team: {
        id: '3170',
        name: 'Test Team',
      },
      collection: {
        id: 'testcoll',
        title: 'Test Collection',
        parentID: null,
        teamID: '3170',
      },
    } as any);

    const result = await teamRequestService.createTeamRequest('testcoll', {
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
    });

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      'team_req/3170/req_created',
      result,
    );
  });
});

describe('getRequestsInCollection', () => {
  test('resolves with an empty array if the collection id does not exist', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([]);

    await expect(
      teamRequestService.getRequestsInCollection('invalidcoll', null),
    ).resolves.toEqual([]);
  });

  test('resolves with the correct info for the collection id and null cursor', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
      },
    ]);

    await expect(
      teamRequestService.getRequestsInCollection('testcoll', null),
    ).resolves.toBeDefined();
  });

  test('resolves with the correct info for the collection id and a valid cursor', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest1',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 1',
      },
      {
        id: 'testrequest2',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 2',
      },
      {
        id: 'testrequest3',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 3',
      },
      {
        id: 'testrequest4',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 4',
      },
      {
        id: 'testrequest5',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 5',
      },
      {
        id: 'testrequest6',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 6',
      },
      {
        id: 'testrequest7',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 7',
      },
      {
        id: 'testrequest8',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 8',
      },
      {
        id: 'testrequest9',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 9',
      },
      {
        id: 'testrequest10',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 10',
      },
    ]);

    const secondColl = (
      await teamRequestService.getRequestsInCollection('testcoll', null)
    )[1];

    mockReset(mockPrisma);
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest11',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 11',
      },
    ]);

    await expect(
      teamRequestService.getRequestsInCollection('testcoll', secondColl.id),
    ).resolves.toBeDefined();
  });

  test('resolves with the correct info for the collection id and a valid cursor', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: 'testrequest1',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 1',
      },
      {
        id: 'testrequest2',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 2',
      },
      {
        id: 'testrequest3',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 3',
      },
      {
        id: 'testrequest4',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 4',
      },
      {
        id: 'testrequest5',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 5',
      },
      {
        id: 'testrequest6',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 6',
      },
      {
        id: 'testrequest7',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 7',
      },
      {
        id: 'testrequest8',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 8',
      },
      {
        id: 'testrequest9',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 9',
      },
      {
        id: 'testrequest10',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request 10',
      },
    ]);

    await expect(
      teamRequestService.getRequestsInCollection('testcoll', null),
    ).resolves.toHaveLength(10);
  });
});

describe('getRequest', () => {
  test('resolves with the correct request info for valid request id', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
      team: {
        id: '3170',
        name: 'Test Team',
      },
      collection: {
        id: 'testcoll',
        title: 'Test Collection',
        parentID: null,
        teamID: '3170',
      },
    } as any);

    await expect(teamRequestService.getRequest('testrequest')).resolves.toEqual(
      expect.objectContaining({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '"{}"',
        title: 'Test Request',
      }),
    );
  });

  test('resolves with null if the request id does not exist', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null as any);

    await expect(
      teamRequestService.getRequest('testrequest'),
    ).resolves.toBeNull();
  });
});

describe('getTeamOfRequest', () => {
  test('rejects for invalid team id', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(null as any);

    await expect(
      teamRequestService.getTeamOfRequest({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: 'invalidteamid',
        request: '{}',
        title: 'Test Request',
      }),
    ).rejects.toThrow(TEAM_INVALID_ID);
  });

  test('resolves for valid team id', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue({
      id: '3170',
      name: 'Test Team',
    });

    await expect(
      teamRequestService.getTeamOfRequest({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: '3170',
        name: 'Test Team',
      }),
    );
  });
});

describe('getCollectionOfRequest', () => {
  test('rejects for invalid collection id', async () => {
    mockTeamCollectionService.getCollection.mockResolvedValue(null as any);

    await expect(
      teamRequestService.getCollectionOfRequest({
        id: 'testrequest',
        collectionID: 'invalidcollid',
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
      }),
    ).rejects.toThrow(TEAM_INVALID_COLL_ID);
  });

  test('resolves for valid collection id', async () => {
    mockTeamCollectionService.getCollection.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection',
      parentID: null,
      teamID: '3170',
    });

    await expect(
      teamRequestService.getCollectionOfRequest({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'testcoll',
        title: 'Test Collection',
        parentID: null,
        teamID: '3170',
      }),
    );
  });
});

describe('getTeamOfRequestFromID', () => {
  test('rejects for invalid request id', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null as any);

    await expect(
      teamRequestService.getTeamOfRequestFromID('invalidrequest'),
    ).rejects.toThrow(TEAM_REQ_NOT_FOUND);
  });

  test('resolves for valid request id', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: 'testrequest',
      collectionID: 'testcoll',
      teamID: '3170',
      request: '{}',
      title: 'Test Request',
      team: {
        id: '3170',
        name: 'Test team',
      },
    } as any);

    await expect(
      teamRequestService.getTeamOfRequestFromID('testrequest'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: '3170',
        name: 'Test team',
      }),
    );
  });

  describe('getRequestTO', () => {
    test('should resolve to Some for valid collection ID', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: '{}',
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      expect(await teamRequestService.getRequestTO('testrequest')()).toBeSome();
    });

    test('should resolve to the correct Some value for a valid collection ID', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      expect(
        await teamRequestService.getRequestTO('testrequest')(),
      ).toEqualSome({
        id: 'testrequest',
        teamID: '3170',
        collectionID: 'testcoll',
        request: '{}',
        title: 'Test Request',
      });
    });

    test('should resolve a None value if the the request ID does not exist', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce(null);

      expect(await teamRequestService.getRequestTO('testrequest')()).toBeNone();
    });
  });

  describe('moveRequest', () => {
    test('resolves to right when the move was valid', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      mockTeamCollectionService.getCollectionTO.mockImplementationOnce(() =>
        TO.some(<TeamCollection>{
          id: 'testcoll2',
          parentID: 'testcoll',
          teamID: '3170',
          title: 'Test Team',
        }),
      );

      mockPrisma.teamRequest.update.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll2',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      expect(
        await teamRequestService.moveRequest('testrequest', 'testcoll2')(),
      ).toBeRight();
    });

    test('resolves to a left with TEAM_REQ_NOT_FOUND if the reqID is invalid', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

      expect(
        await teamRequestService.moveRequest(
          'invalidtestrequest',
          'testcoll2',
        )(),
      ).toEqualLeft(TEAM_REQ_NOT_FOUND);
    });

    test('resolves to the left with TEAM_REQ_INVALID_TARGET_COLL_ID if the collection is invalid', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      mockTeamCollectionService.getCollectionTO.mockImplementationOnce(
        () => TO.none,
      );

      expect(
        await teamRequestService.moveRequest(
          'testrequest',
          'invalidcollection',
        )(),
      ).toEqualLeft(TEAM_REQ_INVALID_TARGET_COLL_ID);
    });

    test('resolves to a left with TEAM_REQ_INVALID_TARGET_ID if the request and destination collection are not in the same team', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      mockTeamCollectionService.getCollectionTO.mockImplementationOnce(() =>
        TO.some(<TeamCollection>{
          id: 'testcoll2',
          parentID: 'testcoll',
          teamID: 'differentteamID',
          title: 'Test Team',
        }),
      );

      expect(
        await teamRequestService.moveRequest('testrequest', 'testcoll2')(),
      ).toEqualLeft(TEAM_REQ_INVALID_TARGET_COLL_ID);
    });

    test('resolves to the right with the correct output model object for a valid query', async () => {
      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      mockTeamCollectionService.getCollectionTO.mockImplementationOnce(() =>
        TO.some(<TeamCollection>{
          id: 'testcoll2',
          parentID: 'testcoll',
          teamID: '3170',
          title: 'Test Team',
        }),
      );

      mockPrisma.teamRequest.update.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll2',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      expect(
        await teamRequestService.moveRequest('testrequest', 'testcoll2')(),
      ).toEqualRight(<TeamRequest>{
        id: 'testrequest',
        collectionID: 'testcoll2',
        request: '{}',
        teamID: '3170',
        title: 'Test Request',
      });
    });

    test('publishes to the pubsub on a valid move', async () => {
      mockPubSub.publish.mockReset();

      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      mockTeamCollectionService.getCollectionTO.mockImplementationOnce(() =>
        TO.some(<TeamCollection>{
          id: 'testcoll2',
          parentID: 'testcoll',
          teamID: '3170',
          title: 'Test Team',
        }),
      );

      mockPrisma.teamRequest.update.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll2',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      await teamRequestService.moveRequest('testrequest', 'testcoll2')();

      expect(mockPubSub.publish).toHaveBeenCalledTimes(2);
      expect(mockPubSub.publish).toHaveBeenNthCalledWith(
        1,
        `team_req/3170/req_deleted`,
        'testrequest',
      );
      expect(mockPubSub.publish).toHaveBeenNthCalledWith(
        2,
        `team_req/3170/req_created`,
        <TeamRequest>{
          id: 'testrequest',
          collectionID: 'testcoll2',
          teamID: '3170',
          request: '{}',
          title: 'Test Request',
        },
      );
    });

    test('does not publish to the pubsub on an invalid move', async () => {
      mockPubSub.publish.mockReset();

      mockPrisma.teamRequest.findUnique.mockResolvedValueOnce({
        id: 'testrequest',
        collectionID: 'testcoll',
        teamID: '3170',
        request: {},
        title: 'Test Request',
        team: {
          id: '3170',
          name: 'Test team',
        },
      } as any);

      mockTeamCollectionService.getCollectionTO.mockImplementationOnce(
        () => TO.none,
      );

      await teamRequestService.moveRequest('testrequest', 'testcoll')();

      expect(mockPubSub.publish).not.toHaveBeenCalled();
    });
  });
});

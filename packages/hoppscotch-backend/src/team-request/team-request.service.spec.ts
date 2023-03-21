import { PrismaService } from '../prisma/prisma.service';
import { TeamCollectionService } from '../team-collection/team-collection.service';
import { TeamService } from '../team/team.service';
import { TeamRequestService } from './team-request.service';
import {
  TEAM_REQ_INVALID_TARGET_COLL_ID,
  TEAM_INVALID_COLL_ID,
  TEAM_INVALID_ID,
  TEAM_REQ_NOT_FOUND,
  TEAM_REQ_REORDERING_FAILED,
} from 'src/errors';
import * as E from 'fp-ts/Either';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { TeamRequest } from './team-request.model';
import { MoveTeamRequestArgs } from './input-type.args';
import {
  TeamRequest as DbTeamRequest,
  Team as DbTeam,
  TeamCollection as DbTeamCollection,
} from '@prisma/client';

const mockPrisma = mockDeep<PrismaService>();
const mockTeamService = mockDeep<TeamService>();
const mockTeamCollectionService = mockDeep<TeamCollectionService>();
const mockPubSub = { publish: jest.fn().mockResolvedValue(null) };

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const teamRequestService = new TeamRequestService(
  mockPrisma,
  mockTeamService as any,
  mockTeamCollectionService as any,
  mockPubSub as any,
);

const team: DbTeam = {
  id: 'team-a',
  name: 'Team A',
};
const teamCollection: DbTeamCollection = {
  id: 'team-coll-1',
  parentID: null,
  teamID: team.id,
  title: 'Team Collection 1',
};
const dbTeamRequests: DbTeamRequest[] = [];
for (let i = 1; i <= 10; i++) {
  dbTeamRequests.push({
    id: `test-request-${i}`,
    collectionID: teamCollection.id,
    teamID: team.id,
    request: {},
    title: `Test Request ${i}`,
    orderIndex: i,
    createdOn: new Date(),
    updatedOn: new Date(),
  });
}
const teamRequests: TeamRequest[] = dbTeamRequests.map((tr) => ({
  id: tr.id,
  collectionID: tr.collectionID,
  teamID: tr.teamID,
  title: tr.title,
  request: JSON.stringify(tr.request),
}));

beforeEach(async () => {
  mockReset(mockPrisma);
});

describe('updateTeamRequest', () => {
  test('resolves correctly if title not given in parameter', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.update.mockResolvedValue(dbRequest);

    await expect(
      teamRequestService.updateTeamRequest(
        dbRequest.id,
        undefined, // title
        JSON.stringify(dbRequest.request), // request
      ),
    ).resolves.toBeDefined();
  });

  test('resolves correctly if request not given in parameter', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.update.mockResolvedValue(dbRequest);

    await expect(
      teamRequestService.updateTeamRequest(
        dbRequest.id,
        dbRequest.title,
        undefined,
      ),
    ).resolves.toBeDefined();
  });

  test('resolves correctly if both request and title are null', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.update.mockResolvedValue(dbRequest);

    await expect(
      teamRequestService.updateTeamRequest(dbRequest.id, undefined, undefined),
    ).resolves.toBeDefined();
  });

  test('resolves correctly for non-null request and title', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.update.mockResolvedValue(dbRequest);

    await expect(
      teamRequestService.updateTeamRequest(
        dbRequest.id,
        dbRequest.title,
        JSON.stringify(dbRequest.request),
      ),
    ).resolves.toBeDefined();
  });

  test('rejects for invalid request id', async () => {
    mockPrisma.teamRequest.update.mockRejectedValue('RecordNotFound');

    await expect(
      teamRequestService.updateTeamRequest(
        'invalidtestreq',
        undefined,
        undefined,
      ),
    ).resolves.toEqualLeft(TEAM_REQ_NOT_FOUND);
  });

  test('resolves for valid request id', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.update.mockResolvedValue(dbRequest);

    await expect(
      teamRequestService.updateTeamRequest(dbRequest.id, undefined, undefined),
    ).resolves.toBeDefined();
  });

  test('publishes update to pubsub topic "team_req/<team_id>/req_updated"', async () => {
    const dbRequest = dbTeamRequests[0];
    const request = teamRequests[0];
    mockPrisma.teamRequest.update.mockResolvedValue(dbRequest);

    await teamRequestService.updateTeamRequest(
      dbRequest.id,
      undefined,
      undefined,
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_req/${dbRequest.teamID}/req_updated`,
      request,
    );
  });
});

describe('searchRequest', () => {
  test('resolves with the correct info with a null cursor', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.findMany.mockResolvedValue(dbTeamRequests);

    await expect(
      teamRequestService.searchRequest(
        dbRequest.teamID,
        dbRequest.title,
        null,
        10,
      ),
    ).resolves.toBeDefined();
  });

  test('resolves with an empty array when a match with the search term is not found', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.findMany.mockResolvedValue([]);

    await expect(
      teamRequestService.searchRequest(
        dbRequest.teamID,
        'unknown_title',
        null,
        10,
      ),
    ).resolves.toBeDefined();
  });

  test('resolves with the correct info with a set cursor', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.findMany.mockResolvedValue(dbTeamRequests);

    await expect(
      teamRequestService.searchRequest(
        dbRequest.teamID,
        dbRequest.title,
        dbRequest.id,
        10,
      ),
    ).resolves.toBeDefined();
  });
});

describe('deleteTeamRequest', () => {
  test('rejects if the request id is not found', async () => {
    mockPrisma.teamRequest.findFirst.mockResolvedValue(null as any);

    const response = teamRequestService.deleteTeamRequest('invalidrequest');

    expect(response).resolves.toEqualLeft(TEAM_REQ_NOT_FOUND);
    expect(mockPrisma.teamRequest.delete).not.toHaveBeenCalled();
  });

  test('resolves for a valid request id', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.findFirst.mockResolvedValue(dbRequest);
    mockPrisma.teamRequest.delete.mockResolvedValue(dbRequest);

    await expect(
      teamRequestService.deleteTeamRequest(dbRequest.id),
    ).resolves.toEqualRight(true);
  });

  test('publishes deletion to pubsub topic "team_req/<team_id>/req_deleted"', async () => {
    const dbRequest = dbTeamRequests[0];
    mockPrisma.teamRequest.findFirst.mockResolvedValue(dbRequest);
    mockPrisma.teamRequest.delete.mockResolvedValue(dbRequest);

    await teamRequestService.deleteTeamRequest(dbRequest.id);

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_req/${dbRequest.teamID}/req_deleted`,
      dbRequest.id,
    );
  });
});

describe('createTeamRequest', () => {
  test('rejects for invalid collection id', async () => {
    mockTeamCollectionService.getTeamOfCollection.mockResolvedValue(null);

    const response = await teamRequestService.createTeamRequest(
      'invalidcollid',
      team.id,
      'Test Request',
      '{}',
    );

    expect(response).toEqualLeft(TEAM_INVALID_COLL_ID);
    expect(mockPrisma.teamRequest.create).not.toHaveBeenCalled();
  });

  test('resolves for valid collection id', async () => {
    const dbRequest = dbTeamRequests[0];
    const teamRequest = teamRequests[0];

    mockTeamCollectionService.getTeamOfCollection.mockResolvedValue(team);
    mockPrisma.teamRequest.create.mockResolvedValue(dbRequest);

    const response = teamRequestService.createTeamRequest(
      'testcoll',
      team.id,
      teamRequest.title,
      teamRequest.request,
    );

    expect(response).resolves.toEqualRight(teamRequest);
  });

  test('publishes creation to pubsub topic "team_req/<team_id>/req_created"', async () => {
    const dbRequest = dbTeamRequests[0];
    const teamRequest = teamRequests[0];

    mockTeamCollectionService.getTeamOfCollection.mockResolvedValue(team);
    mockPrisma.teamRequest.create.mockResolvedValue(dbRequest);

    await teamRequestService.createTeamRequest(
      'testcoll',
      team.id,
      'Test Request',
      '{}',
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_req/${dbRequest.teamID}/req_created`,
      teamRequest,
    );
  });
});

describe('getRequestsInCollection', () => {
  test('resolves with an empty array if the collection id does not exist', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([]);

    await expect(
      teamRequestService.getRequestsInCollection('invalidCollID', null, 10),
    ).resolves.toEqual([]);
  });

  test('resolves with the correct info for the collection id and null cursor', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue(dbTeamRequests);

    const response = await teamRequestService.getRequestsInCollection(
      'testcoll',
      null,
      10,
    );

    expect(response).toEqual(teamRequests);
  });

  test('resolves with the correct info for the collection id and a valid cursor', async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([dbTeamRequests[1]]);

    const response = teamRequestService.getRequestsInCollection(
      dbTeamRequests[1].collectionID,
      dbTeamRequests[0].id,
      1,
    );

    expect(response).resolves.toEqual([teamRequests[1]]);
  });
});

describe('getRequest', () => {
  test('resolves with the correct request info for valid request id', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(dbTeamRequests[0]);

    expect(teamRequestService.getRequest('testrequest')).resolves.toEqualSome(
      expect.objectContaining(teamRequests[0]),
    );
  });

  test('resolves with null if the request id does not exist', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null as any);

    await expect(
      teamRequestService.getRequest('testrequest'),
    ).resolves.toBeNone();
  });
});

describe('getTeamOfRequest', () => {
  test('rejects for invalid team id', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(null as any);

    expect(
      teamRequestService.getTeamOfRequest(teamRequests[0]),
    ).resolves.toEqualLeft(TEAM_INVALID_ID);
  });

  test('resolves for valid team id', async () => {
    mockTeamService.getTeamWithID.mockResolvedValue(team);

    expect(
      teamRequestService.getTeamOfRequest(teamRequests[0]),
    ).resolves.toEqualRight(expect.objectContaining(team));
  });
});

describe('getCollectionOfRequest', () => {
  test('rejects for invalid collection id', async () => {
    mockTeamCollectionService.getCollection.mockResolvedValue(null as any);

    expect(
      teamRequestService.getCollectionOfRequest(teamRequests[0]),
    ).resolves.toEqualLeft(TEAM_INVALID_COLL_ID);
  });

  test('resolves for valid collection id', async () => {
    mockTeamCollectionService.getCollection.mockResolvedValue(teamCollection);

    expect(
      teamRequestService.getCollectionOfRequest(teamRequests[0]),
    ).resolves.toEqualRight(expect.objectContaining(teamCollection));
  });
});

describe('getTeamOfRequestFromID', () => {
  test('rejects for invalid request id', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null as any);

    expect(
      teamRequestService.getTeamOfRequestFromID('invalidrequest'),
    ).resolves.toBeNone();
  });

  test('resolves for valid request id', async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(dbTeamRequests[0]);

    expect(
      teamRequestService.getTeamOfRequestFromID('testrequest'),
    ).resolves.toBeDefined();
  });
});

describe('reorderRequests', () => {
  test('Should resolve left if transaction throws an error', async () => {
    const srcCollID = dbTeamRequests[0].collectionID;
    const request = dbTeamRequests[0];
    const destCollID = dbTeamRequests[4].collectionID;
    const nextRequest = dbTeamRequests[4];

    mockPrisma.$transaction.mockRejectedValueOnce(new Error());
    const result = await teamRequestService.reorderRequests(
      request,
      srcCollID,
      nextRequest,
      destCollID,
    );
    expect(result).toEqual(E.left(TEAM_REQ_REORDERING_FAILED));
  });
  test('Should resolve right and call transaction with the correct data', async () => {
    const srcCollID = dbTeamRequests[0].collectionID;
    const request = dbTeamRequests[0];
    const destCollID = dbTeamRequests[4].collectionID;
    const nextRequest = dbTeamRequests[4];

    const updatedReq: DbTeamRequest = {
      ...request,
      collectionID: destCollID,
      orderIndex: nextRequest.orderIndex,
    };

    mockPrisma.$transaction.mockResolvedValueOnce(E.right(updatedReq));
    const result = await teamRequestService.reorderRequests(
      request,
      srcCollID,
      nextRequest,
      destCollID,
    );
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(result).toEqual(E.right(updatedReq));
  });
});

describe('findRequestAndNextRequest', () => {
  test('Should resolve right if the request and the next request are found', async () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[4].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: teamRequests[4].id,
    };

    mockPrisma.teamRequest.findFirst
      .mockResolvedValueOnce(dbTeamRequests[0])
      .mockResolvedValueOnce(dbTeamRequests[4]);

    const result = await teamRequestService.findRequestAndNextRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
    );

    expect(result).toEqualRight({
      request: dbTeamRequests[0],
      nextRequest: dbTeamRequests[4],
    });
  });
  test('Should resolve right if the request and next request null', () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[4].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: null,
    };

    mockPrisma.teamRequest.findFirst
      .mockResolvedValueOnce(dbTeamRequests[0])
      .mockResolvedValueOnce(null);

    const result = teamRequestService.findRequestAndNextRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
    );

    expect(result).resolves.toEqualRight({
      request: dbTeamRequests[0],
      nextRequest: null,
    });
  });
  test('Should resolve left if the request is not found', () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[4].collectionID,
      requestID: 'invalid',
      nextRequestID: null,
    };

    mockPrisma.teamRequest.findFirst.mockResolvedValueOnce(null);

    const result = teamRequestService.findRequestAndNextRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
    );

    expect(result).resolves.toEqualLeft(TEAM_REQ_NOT_FOUND);
  });
  test('Should resolve left if the nextRequest is not found', () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[1].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: 'invalid',
    };

    mockPrisma.teamRequest.findFirst
      .mockResolvedValueOnce(dbTeamRequests[0])
      .mockResolvedValueOnce(null);

    const result = teamRequestService.findRequestAndNextRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
    );

    expect(result).resolves.toEqualLeft(TEAM_REQ_NOT_FOUND);
  });
});

describe('moveRequest', () => {
  test('Should resolve right and the request', () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[0].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: null,
    };

    jest
      .spyOn(teamRequestService, 'findRequestAndNextRequest')
      .mockResolvedValue(
        E.right({ request: dbTeamRequests[0], nextRequest: null }),
      );
    jest
      .spyOn(teamRequestService, 'reorderRequests')
      .mockResolvedValue(E.right(dbTeamRequests[0]));

    const result = teamRequestService.moveRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
      'moveRequest',
    );

    expect(result).resolves.toEqualRight(teamRequests[0]);
  });

  test('Should resolve right and publish message to pubnub if callerFunction is moveRequest', async () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[0].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: null,
    };

    jest
      .spyOn(teamRequestService, 'findRequestAndNextRequest')
      .mockResolvedValue(
        E.right({ request: dbTeamRequests[0], nextRequest: null }),
      );
    jest
      .spyOn(teamRequestService, 'reorderRequests')
      .mockResolvedValue(E.right(dbTeamRequests[0]));

    await teamRequestService.moveRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
      'moveRequest',
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_req/${teamRequests[0].teamID}/req_moved`,
      teamRequests[0],
    );
  });

  test('Should resolve right and publish message to pubnub if callerFunction is updateLookUpRequestOrder', async () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[0].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: null,
    };

    jest
      .spyOn(teamRequestService, 'findRequestAndNextRequest')
      .mockResolvedValue(
        E.right({ request: dbTeamRequests[0], nextRequest: null }),
      );
    jest
      .spyOn(teamRequestService, 'reorderRequests')
      .mockResolvedValue(E.right(dbTeamRequests[0]));

    await teamRequestService.moveRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
      'updateLookUpRequestOrder',
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_req/${teamRequests[0].teamID}/req_order_updated`,
      { request: teamRequests[0], nextRequest: null },
    );
  });

  test('Should resolve left if finding the requests fails', () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[0].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: null,
    };

    jest
      .spyOn(teamRequestService, 'findRequestAndNextRequest')
      .mockResolvedValue(E.left(TEAM_REQ_NOT_FOUND));

    expect(
      teamRequestService.moveRequest(
        args.srcCollID,
        args.requestID,
        args.destCollID,
        args.nextRequestID,
        'moveRequest',
      ),
    ).resolves.toEqualLeft(TEAM_REQ_NOT_FOUND);
  });

  test('Should resolve left if mismatch team/collection of requests fails', () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[0].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: null,
    };

    jest
      .spyOn(teamRequestService, 'findRequestAndNextRequest')
      .mockResolvedValue(E.left(TEAM_REQ_INVALID_TARGET_COLL_ID));

    expect(
      teamRequestService.moveRequest(
        args.srcCollID,
        args.requestID,
        args.destCollID,
        args.nextRequestID,
        'moveRequest',
      ),
    ).resolves.toEqualLeft(TEAM_REQ_INVALID_TARGET_COLL_ID);
  });

  test('Should resolve left if reorder fails', () => {
    const args: MoveTeamRequestArgs = {
      srcCollID: teamRequests[0].collectionID,
      destCollID: teamRequests[0].collectionID,
      requestID: teamRequests[0].id,
      nextRequestID: null,
    };

    jest
      .spyOn(teamRequestService, 'findRequestAndNextRequest')
      .mockResolvedValue(
        E.right({ request: dbTeamRequests[0], nextRequest: null }),
      );

    jest
      .spyOn(teamRequestService, 'reorderRequests')
      .mockResolvedValue(E.left(TEAM_REQ_REORDERING_FAILED));

    expect(
      teamRequestService.moveRequest(
        args.srcCollID,
        args.requestID,
        args.destCollID,
        args.nextRequestID,
        'moveRequest',
      ),
    ).resolves.toEqualLeft(TEAM_REQ_REORDERING_FAILED);
  });
});
describe('totalRequestsInATeam', () => {
  test('should resolve right and return a total team reqs count ', async () => {
    mockPrisma.teamRequest.count.mockResolvedValueOnce(2);
    const result = await teamRequestService.totalRequestsInATeam('id1');
    expect(mockPrisma.teamRequest.count).toHaveBeenCalledWith({
      where: {
        teamID: 'id1',
      },
    });
    expect(result).toEqual(2);
  });
  test('should resolve left and return an error when no team reqs found', async () => {
    mockPrisma.teamRequest.count.mockResolvedValueOnce(0);
    const result = await teamRequestService.totalRequestsInATeam('id1');
    expect(mockPrisma.teamRequest.count).toHaveBeenCalledWith({
      where: {
        teamID: 'id1',
      },
    });
    expect(result).toEqual(0);
  });

  describe('getTeamRequestsCount', () => {
    test('should return count of all Team Collections in the organization', async () => {
      mockPrisma.teamRequest.count.mockResolvedValueOnce(10);

      const result = await teamRequestService.getTeamRequestsCount();
      expect(result).toEqual(10);
    });
  });
});

import { Team, TeamCollection as DBTeamCollection } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';
import {
  TEAM_COLL_DATA_INVALID,
  TEAM_COLL_DEST_SAME,
  TEAM_COLL_INVALID_JSON,
  TEAM_COLL_IS_PARENT_COLL,
  TEAM_COLL_NOT_FOUND,
  TEAM_COLL_NOT_SAME_TEAM,
  TEAM_COLL_SHORT_TITLE,
  TEAM_COL_ALREADY_ROOT,
  TEAM_COL_REORDERING_FAILED,
  TEAM_COL_SAME_NEXT_COLL,
  TEAM_INVALID_COLL_ID,
  TEAM_MEMBER_NOT_FOUND,
  TEAM_NOT_OWNER,
} from 'src/errors';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { AuthUser } from 'src/types/AuthUser';
import { TeamCollectionService } from './team-collection.service';
import { TeamCollection } from './team-collection.model';
import { TeamService } from 'src/team/team.service';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();
const mockTeamService = mockDeep<TeamService>();

const teamCollectionService = new TeamCollectionService(
  mockPrisma,
  mockPubSub as any,
  mockTeamService,
);

const currentTime = new Date();

const user: AuthUser = {
  uid: '123344',
  email: 'dwight@dundermifflin.com',
  displayName: 'Dwight Schrute',
  photoURL: 'https://en.wikipedia.org/wiki/Dwight_Schrute',
  isAdmin: false,
  refreshToken: 'hbfvdkhjbvkdvdfjvbnkhjb',
  lastLoggedOn: currentTime,
  lastActiveOn: currentTime,
  createdOn: currentTime,
  currentGQLSession: {},
  currentRESTSession: {},
};

const team: Team = {
  id: 'team_1',
  name: 'Team 1',
};

const rootTeamCollection: DBTeamCollection = {
  id: '123',
  orderIndex: 1,
  parentID: null,
  data: {},
  title: 'Root Collection 1',
  teamID: team.id,
  createdOn: currentTime,
  updatedOn: currentTime,
};

const rootTeamCollectionsCasted: TeamCollection = {
  id: rootTeamCollection.id,
  title: rootTeamCollection.title,
  parentID: rootTeamCollection.parentID,
  data: JSON.stringify(rootTeamCollection.data),
};

const rootTeamCollection_2: DBTeamCollection = {
  id: 'erv',
  orderIndex: 2,
  parentID: null,
  data: {},
  title: 'Root Collection 1',
  teamID: team.id,
  createdOn: currentTime,
  updatedOn: currentTime,
};

const childTeamCollection: DBTeamCollection = {
  id: 'rfe',
  orderIndex: 1,
  parentID: rootTeamCollection.id,
  data: {},
  title: 'Child Collection 1',
  teamID: team.id,
  createdOn: currentTime,
  updatedOn: currentTime,
};

const childTeamCollectionCasted: TeamCollection = {
  id: 'rfe',
  parentID: rootTeamCollection.id,
  data: JSON.stringify(childTeamCollection.data),
  title: 'Child Collection 1',
};

const childTeamCollection_2: DBTeamCollection = {
  id: 'bgdz',
  orderIndex: 1,
  data: {},
  parentID: rootTeamCollection_2.id,
  title: 'Child Collection 1',
  teamID: team.id,
  createdOn: currentTime,
  updatedOn: currentTime,
};

const childTeamCollection_2Casted: TeamCollection = {
  id: 'bgdz',
  data: JSON.stringify(childTeamCollection_2.data),
  parentID: rootTeamCollection_2.id,
  title: 'Child Collection 1',
};

const rootTeamCollectionList: DBTeamCollection[] = [
  {
    id: 'fdv',
    orderIndex: 1,
    parentID: null,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: 'fbbg',
    orderIndex: 2,
    parentID: null,
    title: 'Root Collection 1',
    data: {},

    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: 'fgbfg',
    orderIndex: 3,
    parentID: null,
    title: 'Root Collection 1',
    data: {},

    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: 'bre3',
    orderIndex: 4,
    parentID: null,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: 'hghgf',
    orderIndex: 5,
    parentID: null,
    title: 'Root Collection 1',
    data: {},

    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '123',
    orderIndex: 6,
    parentID: null,
    title: 'Root Collection 1',
    teamID: team.id,
    data: {},

    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '54tyh',
    orderIndex: 7,
    parentID: null,
    title: 'Root Collection 1',
    teamID: team.id,
    data: {},

    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '234re',
    orderIndex: 8,
    parentID: null,
    title: 'Root Collection 1',
    data: {},
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '34rtg',
    orderIndex: 9,
    parentID: null,
    title: 'Root Collection 1',
    data: {},
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '45tgh',
    orderIndex: 10,
    parentID: null,
    title: 'Root Collection 1',
    teamID: team.id,
    data: {},
    createdOn: currentTime,
    updatedOn: currentTime,
  },
];

const rootTeamCollectionListCasted: TeamCollection[] = [
  {
    id: 'fdv',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: 'fbbg',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: 'fgbfg',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: 'bre3',
    parentID: null,
    data: JSON.stringify(rootTeamCollection.data),
    title: 'Root Collection 1',
  },
  {
    id: 'hghgf',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: '123',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: '54tyh',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: '234re',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: '34rtg',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
  {
    id: '45tgh',
    parentID: null,
    title: 'Root Collection 1',
    data: JSON.stringify(rootTeamCollection.data),
  },
];

const childTeamCollectionList: DBTeamCollection[] = [
  {
    id: '123',
    orderIndex: 1,
    parentID: rootTeamCollection.id,
    title: 'Root Collection 1',
    data: {},

    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '345',
    orderIndex: 2,
    parentID: rootTeamCollection.id,
    title: 'Root Collection 1',
    data: {},

    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '456',
    orderIndex: 3,
    parentID: rootTeamCollection.id,
    title: 'Root Collection 1',
    data: {},

    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '567',
    orderIndex: 4,
    parentID: rootTeamCollection.id,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '123',
    orderIndex: 5,
    parentID: rootTeamCollection.id,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '678',
    orderIndex: 6,
    parentID: rootTeamCollection.id,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '789',
    orderIndex: 7,
    parentID: rootTeamCollection.id,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '890',
    orderIndex: 8,
    parentID: rootTeamCollection.id,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '012',
    orderIndex: 9,
    parentID: rootTeamCollection.id,
    data: {},
    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
  {
    id: '0bhu',
    orderIndex: 10,
    parentID: rootTeamCollection.id,
    data: {},

    title: 'Root Collection 1',
    teamID: team.id,
    createdOn: currentTime,
    updatedOn: currentTime,
  },
];

const childTeamCollectionListCasted: TeamCollection[] = [
  {
    id: '123',
    parentID: rootTeamCollection.id,
    title: 'Root Collection 1',
    data: JSON.stringify({}),
  },
  {
    id: '345',
    parentID: rootTeamCollection.id,
    title: 'Root Collection 1',
    data: JSON.stringify({}),
  },
  {
    id: '456',
    parentID: rootTeamCollection.id,
    title: 'Root Collection 1',
    data: JSON.stringify({}),
  },
  {
    id: '567',
    parentID: rootTeamCollection.id,
    data: JSON.stringify({}),

    title: 'Root Collection 1',
  },
  {
    id: '123',
    parentID: rootTeamCollection.id,
    data: JSON.stringify({}),

    title: 'Root Collection 1',
  },
  {
    id: '678',
    parentID: rootTeamCollection.id,
    data: JSON.stringify({}),

    title: 'Root Collection 1',
  },
  {
    id: '789',
    parentID: rootTeamCollection.id,
    data: JSON.stringify({}),

    title: 'Root Collection 1',
  },
  {
    id: '890',
    parentID: rootTeamCollection.id,
    data: JSON.stringify({}),

    title: 'Root Collection 1',
  },
  {
    id: '012',
    parentID: rootTeamCollection.id,
    data: JSON.stringify({}),
    title: 'Root Collection 1',
  },
  {
    id: '0bhu',
    parentID: rootTeamCollection.id,
    data: JSON.stringify({}),

    title: 'Root Collection 1',
  },
];

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('getTeamOfCollection', () => {
  test('should return the team of a collection successfully with valid collectionID', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
      ...rootTeamCollection,
      team: team,
    } as any);

    const result = await teamCollectionService.getTeamOfCollection(
      rootTeamCollection.id,
    );
    expect(result).toEqualRight(team);
  });

  test('should throw TEAM_INVALID_COLL_ID when collectionID is invalid', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce(null);

    const result = await teamCollectionService.getTeamOfCollection(
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_INVALID_COLL_ID);
  });
});

describe('getParentOfCollection', () => {
  test('should return the parent collection successfully for a child collection with valid collectionID', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
      ...childTeamCollection,
      parent: rootTeamCollection,
    } as any);

    const result = await teamCollectionService.getParentOfCollection(
      childTeamCollection.id,
    );
    expect(result).toEqual(rootTeamCollectionsCasted);
  });

  test('should return null successfully for a root collection with valid collectionID', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
      ...rootTeamCollection,
      parent: null,
    } as any);

    const result = await teamCollectionService.getParentOfCollection(
      rootTeamCollection.id,
    );
    expect(result).toEqual(null);
  });

  test('should return null with invalid collectionID', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce(null);

    const result =
      await teamCollectionService.getParentOfCollection('invalidID');
    expect(result).toEqual(null);
  });
});

describe('getChildrenOfCollection', () => {
  test('should return a list of child collections successfully with valid inputs', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce(
      childTeamCollectionList,
    );

    const result = await teamCollectionService.getChildrenOfCollection(
      rootTeamCollection.id,
      null,
      10,
    );
    expect(result).toEqual(childTeamCollectionListCasted);
  });

  test('should return a list of 3 child collections successfully with cursor being equal to the 7th item in the list', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([
      { ...childTeamCollectionList[7] },
      { ...childTeamCollectionList[8] },
      { ...childTeamCollectionList[9] },
    ]);

    const result = await teamCollectionService.getChildrenOfCollection(
      rootTeamCollection.id,
      childTeamCollectionList[6].id,
      10,
    );
    expect(result).toEqual([
      { ...childTeamCollectionListCasted[7] },
      { ...childTeamCollectionListCasted[8] },
      { ...childTeamCollectionListCasted[9] },
    ]);
  });

  test('should return a empty array with invalid inputs', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([]);

    const result = await teamCollectionService.getChildrenOfCollection(
      'invalidID',
      null,
      10,
    );
    expect(result).toEqual([]);
  });
});

describe('getTeamRootCollections', () => {
  test('should return a list of root collections successfully with valid inputs', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce(
      rootTeamCollectionList,
    );

    const result = await teamCollectionService.getTeamRootCollections(
      rootTeamCollection.teamID,
      null,
      10,
    );
    expect(result).toEqual(rootTeamCollectionListCasted);
  });

  test('should return a list of 3 root collections successfully with cursor being equal to the 7th item in the list', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([
      { ...rootTeamCollectionList[7] },
      { ...rootTeamCollectionList[8] },
      { ...rootTeamCollectionList[9] },
    ]);

    const result = await teamCollectionService.getTeamRootCollections(
      rootTeamCollection.teamID,
      rootTeamCollectionList[6].id,
      10,
    );
    expect(result).toEqual([
      { ...rootTeamCollectionListCasted[7] },
      { ...rootTeamCollectionListCasted[8] },
      { ...rootTeamCollectionListCasted[9] },
    ]);
  });

  test('should return a empty array with invalid inputs', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([]);

    const result = await teamCollectionService.getTeamRootCollections(
      'invalidTeamID',
      null,
      10,
    );
    expect(result).toEqual([]);
  });
});

describe('getCollection', () => {
  test('should return a root TeamCollection with valid collectionID', async () => {
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootTeamCollection,
    );

    const result = await teamCollectionService.getCollection(
      rootTeamCollection.id,
    );
    expect(result).toEqualRight(rootTeamCollection);
  });

  test('should return a child TeamCollection with valid collectionID', async () => {
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childTeamCollection,
    );

    const result = await teamCollectionService.getCollection(
      childTeamCollection.id,
    );
    expect(result).toEqualRight(childTeamCollection);
  });

  test('should throw TEAM_COLL_NOT_FOUND when collectionID is invalid', async () => {
    mockPrisma.teamCollection.findUniqueOrThrow.mockRejectedValue(
      'NotFoundError',
    );

    const result = await teamCollectionService.getCollection('123');
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });
});

describe('createCollection', () => {
  test('should throw TEAM_COLL_SHORT_TITLE when title is less than 3 characters', async () => {
    const result = await teamCollectionService.createCollection(
      rootTeamCollection.teamID,
      'ab',
      JSON.stringify(rootTeamCollection.data),
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_SHORT_TITLE);
  });

  test('should throw TEAM_NOT_OWNER when parent TeamCollection does not belong to the team', async () => {
    jest
      .spyOn(teamCollectionService as any, 'isOwnerCheck')
      .mockResolvedValueOnce(O.none);

    const result = await teamCollectionService.createCollection(
      rootTeamCollection.teamID,
      'abcd',
      JSON.stringify(rootTeamCollection.data),
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_NOT_OWNER);
  });

  test('should throw TEAM_COLL_DATA_INVALID when parent TeamCollection does not belong to the team', async () => {
    jest
      .spyOn(teamCollectionService as any, 'isOwnerCheck')
      .mockResolvedValueOnce(O.some(true));

    const result = await teamCollectionService.createCollection(
      rootTeamCollection.teamID,
      'abcd',
      '{',
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_DATA_INVALID);
  });

  test('should successfully create a new root TeamCollection with valid inputs', async () => {
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn(mockPrisma),
    );
    mockPrisma.$executeRaw.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.create.mockResolvedValueOnce(rootTeamCollection);

    const result = await teamCollectionService.createCollection(
      rootTeamCollection.teamID,
      rootTeamCollection.title,
      JSON.stringify(rootTeamCollection.data),
      null,
    );
    expect(result).toEqualRight(rootTeamCollectionsCasted);
  });

  test('should successfully create a new child TeamCollection with valid inputs', async () => {
    jest
      .spyOn(teamCollectionService as any, 'isOwnerCheck')
      .mockResolvedValueOnce(O.some(true));
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn(mockPrisma),
    );
    mockPrisma.$executeRaw.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.create.mockResolvedValueOnce(childTeamCollection);

    const result = await teamCollectionService.createCollection(
      childTeamCollection.teamID,
      childTeamCollection.title,
      JSON.stringify(childTeamCollection.data),
      childTeamCollection.parentID,
    );
    expect(result).toEqualRight(childTeamCollectionCasted);
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_added" if child TeamCollection is created successfully', async () => {
    jest
      .spyOn(teamCollectionService as any, 'isOwnerCheck')
      .mockResolvedValueOnce(O.some(true));
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn(mockPrisma),
    );
    mockPrisma.$executeRaw.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.create.mockResolvedValueOnce(childTeamCollection);

    await teamCollectionService.createCollection(
      childTeamCollection.teamID,
      childTeamCollection.title,
      JSON.stringify(childTeamCollection.data),
      childTeamCollection.parentID,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${childTeamCollection.teamID}/coll_added`,
      childTeamCollectionCasted,
    );
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_added" if root TeamCollection is created successfully', async () => {
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn(mockPrisma),
    );
    mockPrisma.$executeRaw.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.create.mockResolvedValueOnce(rootTeamCollection);

    await teamCollectionService.createCollection(
      rootTeamCollection.teamID,
      rootTeamCollection.title,
      JSON.stringify(rootTeamCollection.data),
      null,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${rootTeamCollection.teamID}/coll_added`,
      rootTeamCollectionsCasted,
    );
  });
});

describe('renameCollection', () => {
  test('should throw TEAM_COLL_SHORT_TITLE when title is less than 3 characters', async () => {
    const result = await teamCollectionService.renameCollection(
      rootTeamCollection.id,
      'ab',
    );
    expect(result).toEqualLeft(TEAM_COLL_SHORT_TITLE);
  });

  test('should successfully update a TeamCollection with valid inputs', async () => {
    // isOwnerCheck
    mockPrisma.teamCollection.findFirstOrThrow.mockResolvedValueOnce(
      rootTeamCollection,
    );

    mockPrisma.teamCollection.update.mockResolvedValueOnce({
      ...rootTeamCollection,
      title: 'NewTitle',
    });

    const result = await teamCollectionService.renameCollection(
      rootTeamCollection.id,
      'NewTitle',
    );
    expect(result).toEqualRight({
      ...rootTeamCollectionsCasted,
      title: 'NewTitle',
    });
  });

  test('should throw TEAM_COLL_NOT_FOUND when collectionID is invalid', async () => {
    // isOwnerCheck
    mockPrisma.teamCollection.findFirstOrThrow.mockResolvedValueOnce(
      rootTeamCollection,
    );

    mockPrisma.teamCollection.update.mockRejectedValueOnce('RecordNotFound');

    const result = await teamCollectionService.renameCollection(
      'invalidID',
      'NewTitle',
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should send pubsub message to "team_coll/<teamId>/coll_updated" if TeamCollection title is updated successfully', async () => {
    // isOwnerCheck
    mockPrisma.teamCollection.findFirstOrThrow.mockResolvedValueOnce(
      rootTeamCollection,
    );

    mockPrisma.teamCollection.update.mockResolvedValueOnce({
      ...rootTeamCollection,
      title: 'NewTitle',
    });

    await teamCollectionService.renameCollection(
      rootTeamCollection.id,
      'NewTitle',
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${rootTeamCollection.teamID}/coll_updated`,
      {
        ...rootTeamCollectionsCasted,
        title: 'NewTitle',
      },
    );
  });
});

describe('deleteCollection', () => {
  test('should successfully delete a TeamCollection with valid inputs', async () => {
    // getCollection
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootTeamCollection,
    );
    // deleteCollectionData
    // deleteCollectionData --> FindMany query 1st time
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> FindMany query 2nd time
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> DeleteMany query
    mockPrisma.teamRequest.deleteMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> updateOrderIndex
    mockPrisma.teamCollection.updateMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> removeUserCollection
    mockPrisma.teamCollection.delete.mockResolvedValueOnce(rootTeamCollection);

    const result = await teamCollectionService.deleteCollection(
      rootTeamCollection.id,
    );
    expect(result).toEqualRight(true);
  });

  test('should throw TEAM_COLL_NOT_FOUND when collectionID is invalid ', async () => {
    // getCollection
    mockPrisma.teamCollection.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );
    const result = await teamCollectionService.deleteCollection(
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should throw TEAM_COLL_NOT_FOUND when collectionID is invalid when deleting TeamCollection from UserCollectionTable ', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));
    jest
      .spyOn(teamCollectionService as any, 'deleteCollectionData')
      .mockResolvedValueOnce(E.left(TEAM_COL_REORDERING_FAILED));

    const result = await teamCollectionService.deleteCollection(
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COL_REORDERING_FAILED);
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_removed" if TeamCollection is deleted successfully', async () => {
    // getCollection
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootTeamCollection,
    );
    // deleteCollectionData
    // deleteCollectionData --> FindMany query 1st time
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> FindMany query 2nd time
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> DeleteMany query
    mockPrisma.userRequest.deleteMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> updateOrderIndex
    mockPrisma.teamCollection.updateMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> removeUserCollection
    mockPrisma.teamCollection.delete.mockResolvedValueOnce(rootTeamCollection);

    await teamCollectionService.deleteCollection(rootTeamCollection.id);
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${rootTeamCollection.teamID}/coll_removed`,
      rootTeamCollection.id,
    );
  });
});

describe('moveCollection', () => {
  test('should throw TEAM_COLL_NOT_FOUND if collectionID is invalid', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.left(TEAM_COLL_NOT_FOUND));

    const result = await teamCollectionService.moveCollection('234', '009');
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should throw TEAM_COLL_DEST_SAME if collectionID and destCollectionID is the same', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));

    const result = await teamCollectionService.moveCollection(
      rootTeamCollection.id,
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_DEST_SAME);
  });

  test('should throw TEAM_COLL_NOT_FOUND if destCollectionID is invalid', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.left(TEAM_COLL_NOT_FOUND));

    const result = await teamCollectionService.moveCollection(
      'invalidID',
      rootTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should throw TEAM_COLL_NOT_SAME_TEAM if collectionID and destCollectionID are not from the same team', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(
        E.right({ ...childTeamCollection_2, teamID: 'anotherTeamID' }),
      );

    const result = await teamCollectionService.moveCollection(
      rootTeamCollection.id,
      childTeamCollection_2.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_SAME_TEAM);
  });

  test('should throw TEAM_COLL_IS_PARENT_COLL if collectionID is parent of destCollectionID ', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));

    const result = await teamCollectionService.moveCollection(
      rootTeamCollection.id,
      childTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_IS_PARENT_COLL);
  });

  test('should throw TEAM_COL_ALREADY_ROOT when moving root TeamCollection to root', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));

    const result = await teamCollectionService.moveCollection(
      rootTeamCollection.id,
      null,
    );
    expect(result).toEqualLeft(TEAM_COL_ALREADY_ROOT);
  });

  test('should successfully move a child TeamCollection into root', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));
    jest
      .spyOn(teamCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({ ...childTeamCollectionCasted, parentID: null }),
      );

    const result = await teamCollectionService.moveCollection(
      childTeamCollection.id,
      null,
    );
    expect(result).toEqualRight({
      ...childTeamCollectionCasted,
      parentID: null,
    });
  });

  test('should throw TEAM_COLL_NOT_FOUND when trying to change parent of collection with invalid collectionID', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));
    jest
      .spyOn(teamCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(E.left(TEAM_COLL_NOT_FOUND));

    const result = await teamCollectionService.moveCollection(
      childTeamCollection.id,
      null,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_moved" when a child TeamCollection is moved to root successfully', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));
    jest
      .spyOn(teamCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({ ...childTeamCollectionCasted, parentID: null }),
      );

    await teamCollectionService.moveCollection(childTeamCollection.id, null);
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${childTeamCollection.teamID}/coll_moved`,
      {
        ...childTeamCollectionCasted,
        parentID: null,
      },
    );
  });

  test('should successfully move a root TeamCollection into a child TeamCollection', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));
    jest
      .spyOn(teamCollectionService as any, 'isParent')
      .mockResolvedValueOnce(O.some(true));
    jest
      .spyOn(teamCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({
          ...rootTeamCollectionsCasted,
          parentID: childTeamCollection.id,
        }),
      );

    const result = await teamCollectionService.moveCollection(
      rootTeamCollection.id,
      childTeamCollection.id,
    );
    expect(result).toEqualRight({
      ...rootTeamCollectionsCasted,
      parentID: childTeamCollection.id,
    });
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_moved" when root TeamCollection is moved into another child TeamCollection successfully', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(rootTeamCollection));
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));
    jest
      .spyOn(teamCollectionService as any, 'isParent')
      .mockResolvedValueOnce(O.some(true));
    jest
      .spyOn(teamCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({
          ...rootTeamCollectionsCasted,
          parentID: childTeamCollection.id,
        }),
      );

    await teamCollectionService.moveCollection(
      rootTeamCollection.id,
      childTeamCollection.id,
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${childTeamCollection.teamID}/coll_moved`,
      {
        ...rootTeamCollectionsCasted,
        parentID: childTeamCollectionCasted.id,
      },
    );
  });

  test('should successfully move a child TeamCollection into another child TeamCollection', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection_2));
    jest
      .spyOn(teamCollectionService as any, 'isParent')
      .mockResolvedValueOnce(O.some(true));
    jest
      .spyOn(teamCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({
          ...childTeamCollectionCasted,
          parentID: childTeamCollection_2.id,
        }),
      );

    const result = await teamCollectionService.moveCollection(
      childTeamCollection.id,
      childTeamCollection_2.id,
    );
    expect(result).toEqualRight({
      ...childTeamCollectionCasted,
      parentID: childTeamCollection_2Casted.id,
    });
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_moved" when child TeamCollection is moved into another child TeamCollection successfully', async () => {
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection));
    jest
      .spyOn(teamCollectionService, 'getCollection')
      .mockResolvedValueOnce(E.right(childTeamCollection_2));
    jest
      .spyOn(teamCollectionService as any, 'isParent')
      .mockResolvedValueOnce(O.some(true));
    jest
      .spyOn(teamCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({
          ...childTeamCollectionCasted,
          parentID: childTeamCollection_2.id,
        }),
      );

    await teamCollectionService.moveCollection(
      childTeamCollection.id,
      childTeamCollection_2.id,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${childTeamCollection.teamID}/coll_moved`,
      {
        ...childTeamCollectionCasted,
        parentID: childTeamCollection_2Casted.id,
      },
    );
  });
});

describe('updateCollectionOrder', () => {
  test('should throw TEAM_COL_SAME_NEXT_COLL if collectionID and nextCollectionID are the same', async () => {
    const result = await teamCollectionService.updateCollectionOrder(
      childTeamCollection.id,
      childTeamCollection.id,
    );
    expect(result).toEqualLeft(TEAM_COL_SAME_NEXT_COLL);
  });

  test('should throw TEAM_COLL_NOT_FOUND if collectionID is invalid', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await teamCollectionService.updateCollectionOrder(
      childTeamCollectionList[4].id,
      null,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should successfully move the child TeamCollection to the end of the list', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childTeamCollectionList[4],
    );
    mockPrisma.teamCollection.updateMany.mockResolvedValueOnce({ count: 10 });
    mockPrisma.teamCollection.update.mockResolvedValueOnce({
      ...childTeamCollectionList[4],
      orderIndex: childTeamCollectionList.length,
    });

    const result = await teamCollectionService.updateCollectionOrder(
      childTeamCollectionList[4].id,
      null,
    );
    expect(result).toEqualRight(true);
  });

  test('should successfully move the root TeamCollection to the end of the list', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootTeamCollectionList[4],
    );
    mockPrisma.teamCollection.updateMany.mockResolvedValueOnce({ count: 10 });
    mockPrisma.teamCollection.update.mockResolvedValueOnce({
      ...rootTeamCollectionList[4],
      orderIndex: rootTeamCollectionList.length,
    });

    const result = await teamCollectionService.updateCollectionOrder(
      rootTeamCollectionList[4].id,
      null,
    );
    expect(result).toEqualRight(true);
  });

  test('should throw TEAM_COL_REORDERING_FAILED when re-ordering operation failed for child TeamCollection list', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childTeamCollectionList[4],
    );
    mockPrisma.$transaction.mockRejectedValueOnce('RecordNotFound');

    const result = await teamCollectionService.updateCollectionOrder(
      childTeamCollectionList[4].id,
      null,
    );
    expect(result).toEqualLeft(TEAM_COL_REORDERING_FAILED);
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_order_updated" when TeamCollection order is updated successfully for a root TeamCollection', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootTeamCollectionList[4],
    );
    mockPrisma.teamCollection.updateMany.mockResolvedValueOnce({ count: 10 });
    mockPrisma.teamCollection.update.mockResolvedValueOnce({
      ...rootTeamCollectionList[4],
      orderIndex: rootTeamCollectionList.length,
    });

    await teamCollectionService.updateCollectionOrder(
      rootTeamCollectionList[4].id,
      null,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${childTeamCollectionList[4].teamID}/coll_order_updated`,
      {
        collection: rootTeamCollectionListCasted[4],
        nextCollection: null,
      },
    );
  });

  test('should throw TEAM_COLL_NOT_SAME_TEAM when collectionID and nextCollectionID do not belong to the same team', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childTeamCollectionList[4])
      .mockResolvedValueOnce({
        ...childTeamCollection_2,
        teamID: 'differendTeamID',
      });

    const result = await teamCollectionService.updateCollectionOrder(
      childTeamCollectionList[4].id,
      childTeamCollection_2.id,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_SAME_TEAM);
  });

  test('should successfully update the order of the child TeamCollection list', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childTeamCollectionList[4])
      .mockResolvedValueOnce(childTeamCollectionList[2]);
    mockPrisma.teamCollection.updateMany.mockResolvedValueOnce({ count: 3 });
    mockPrisma.teamCollection.update.mockResolvedValueOnce({
      ...childTeamCollectionList[4],
      orderIndex: 2,
    });

    const result = await teamCollectionService.updateCollectionOrder(
      childTeamCollectionList[4].id,
      childTeamCollectionList[2].id,
    );
    expect(result).toEqualRight(true);
  });

  test('should successfully update the order of the root TeamCollection list', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow
      .mockResolvedValueOnce(rootTeamCollectionList[4])
      .mockResolvedValueOnce(rootTeamCollectionList[2]);

    const result = await teamCollectionService.updateCollectionOrder(
      rootTeamCollectionList[4].id,
      rootTeamCollectionList[2].id,
    );
    expect(result).toEqualRight(true);
  });

  test('should throw TEAM_COL_REORDERING_FAILED when re-ordering operation failed for child TeamCollection list', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childTeamCollectionList[4])
      .mockResolvedValueOnce(childTeamCollectionList[2]);

    mockPrisma.$transaction.mockRejectedValueOnce('RecordNotFound');

    const result = await teamCollectionService.updateCollectionOrder(
      childTeamCollectionList[4].id,
      childTeamCollectionList[2].id,
    );
    expect(result).toEqualLeft(TEAM_COL_REORDERING_FAILED);
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_order_updated" when TeamCollection order is updated successfully', async () => {
    // getCollection;
    mockPrisma.teamCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childTeamCollectionList[4])
      .mockResolvedValueOnce(childTeamCollectionList[2]);

    await teamCollectionService.updateCollectionOrder(
      childTeamCollectionList[4].id,
      childTeamCollectionList[2].id,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${childTeamCollectionList[2].teamID}/coll_order_updated`,
      {
        collection: childTeamCollectionListCasted[4],
        nextCollection: childTeamCollectionListCasted[2],
      },
    );
  });
});

const jsonString =
  '[{"requests":[],"name":"Root Collection 1","folders":[],"v":1}]';

describe('importCollectionsFromJSON', () => {
  test('should throw TEAM_COLL_INVALID_JSON when the jsonString is invalid', async () => {
    const result = await teamCollectionService.importCollectionsFromJSON(
      'invalidString',
      rootTeamCollection.teamID,
      null,
    );
    expect(result).toEqualLeft(TEAM_COLL_INVALID_JSON);
  });

  test('should throw TEAM_COLL_INVALID_JSON when the parsed jsonString is not an array', async () => {
    const result = await teamCollectionService.importCollectionsFromJSON(
      '{}',
      rootTeamCollection.teamID,
      null,
    );
    expect(result).toEqualLeft(TEAM_COLL_INVALID_JSON);
  });

  test('should successfully create new TeamCollections in root and TeamRequests with valid inputs', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.teamCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.create.mockResolvedValueOnce(rootTeamCollection);

    const result = await teamCollectionService.importCollectionsFromJSON(
      jsonString,
      rootTeamCollection.teamID,
      null,
    );
    expect(result).toEqualRight(true);
  });

  test('should successfully create new TeamCollections in a child collection and TeamRequests with valid inputs', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.teamCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.create.mockResolvedValueOnce(rootTeamCollection);

    const result = await teamCollectionService.importCollectionsFromJSON(
      jsonString,
      rootTeamCollection.teamID,
      rootTeamCollection.id,
    );
    expect(result).toEqualRight(true);
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_added" on successful creation from jsonString', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.teamCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamCollection.create.mockResolvedValueOnce(rootTeamCollection);

    await teamCollectionService.importCollectionsFromJSON(
      jsonString,
      rootTeamCollection.teamID,
      null,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${rootTeamCollection.teamID}/coll_added`,
      rootTeamCollectionsCasted,
    );
  });
});

describe('totalCollectionsInTeam', () => {
  test('should resolve right and return a total team colls count ', async () => {
    mockPrisma.teamCollection.count.mockResolvedValueOnce(2);
    const result = await teamCollectionService.totalCollectionsInTeam('id1');
    expect(mockPrisma.teamCollection.count).toHaveBeenCalledWith({
      where: {
        teamID: 'id1',
      },
    });
    expect(result).toEqual(2);
  });
  test('should resolve left and return an error when no team colls found', async () => {
    mockPrisma.teamCollection.count.mockResolvedValueOnce(0);
    const result = await teamCollectionService.totalCollectionsInTeam('id1');
    expect(mockPrisma.teamCollection.count).toHaveBeenCalledWith({
      where: {
        teamID: 'id1',
      },
    });
    expect(result).toEqual(0);
  });

  describe('getTeamCollectionsCount', () => {
    test('should return count of all Team Collections in the organization', async () => {
      mockPrisma.teamCollection.count.mockResolvedValueOnce(10);

      const result = await teamCollectionService.getTeamCollectionsCount();
      expect(result).toEqual(10);
    });
  });
});

describe('updateTeamCollection', () => {
  test('should throw TEAM_COLL_SHORT_TITLE if title is invalid', async () => {
    const result = await teamCollectionService.updateTeamCollection(
      rootTeamCollection.id,
      JSON.stringify(rootTeamCollection.data),
      'de',
    );
    expect(result).toEqualLeft(TEAM_COLL_SHORT_TITLE);
  });

  test('should throw TEAM_COLL_DATA_INVALID is collection data is invalid', async () => {
    const result = await teamCollectionService.updateTeamCollection(
      rootTeamCollection.id,
      '{',
      rootTeamCollection.title,
    );
    expect(result).toEqualLeft(TEAM_COLL_DATA_INVALID);
  });

  test('should throw TEAM_COLL_NOT_FOUND is collectionID is invalid', async () => {
    mockPrisma.teamCollection.update.mockRejectedValueOnce('RecordNotFound');

    const result = await teamCollectionService.updateTeamCollection(
      'invalid_id',
      JSON.stringify(rootTeamCollection.data),
      rootTeamCollection.title,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should successfully update a collection', async () => {
    mockPrisma.teamCollection.update.mockResolvedValueOnce(rootTeamCollection);

    const result = await teamCollectionService.updateTeamCollection(
      rootTeamCollection.id,
      JSON.stringify({ foo: 'bar' }),
      'new_title',
    );
    expect(result).toEqualRight({
      data: JSON.stringify({ foo: 'bar' }),
      title: 'new_title',
      ...rootTeamCollectionsCasted,
    });
  });

  test('should send pubsub message to "team_coll/<teamID>/coll_updated" if TeamCollection is updated successfully', async () => {
    mockPrisma.teamCollection.update.mockResolvedValueOnce(rootTeamCollection);

    await teamCollectionService.updateTeamCollection(
      rootTeamCollection.id,
      JSON.stringify(rootTeamCollection.data),
      rootTeamCollection.title,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll/${rootTeamCollection.teamID}/coll_updated`,
      rootTeamCollectionsCasted,
    );
  });
});

//ToDo: write test cases for exportCollectionsToJSON

describe('getCollectionForCLI', () => {
  test('should throw TEAM_COLL_NOT_FOUND if collectionID is invalid', async () => {
    mockPrisma.teamCollection.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await teamCollectionService.getCollectionForCLI(
      'invalidID',
      user.uid,
    );
    expect(result).toEqualLeft(TEAM_COLL_NOT_FOUND);
  });

  test('should throw TEAM_MEMBER_NOT_FOUND if user not in same team', async () => {
    mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootTeamCollection,
    );
    mockTeamService.getTeamMember.mockResolvedValue(null);

    const result = await teamCollectionService.getCollectionForCLI(
      rootTeamCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(TEAM_MEMBER_NOT_FOUND);
  });

  // test('should return the TeamCollection data for CLI', async () => {
  //   mockPrisma.teamCollection.findUniqueOrThrow.mockResolvedValueOnce(
  //     rootTeamCollection,
  //   );
  //   mockTeamService.getTeamMember.mockResolvedValue({
  //     membershipID: 'sdc3sfdv',
  //     userUid: user.uid,
  //     role: TeamAccessRole.OWNER,
  //   });

  //   const result = await teamCollectionService.getCollectionForCLI(
  //     rootTeamCollection.id,
  //     user.uid,
  //   );
  //   expect(result).toEqualRight({
  //     id: rootTeamCollection.id,
  //     data: JSON.stringify(rootTeamCollection.data),
  //     title: rootTeamCollection.title,
  //     parentID: rootTeamCollection.parentID,
  //     folders: [
  //       {
  //         id: childTeamCollection.id,
  //         data: JSON.stringify(childTeamCollection.data),
  //         title: childTeamCollection.title,
  //         parentID: childTeamCollection.parentID,
  //         folders: [],
  //         requests: [],
  //       },
  //     ],
  //     requests: [],
  //   });
  // });
});

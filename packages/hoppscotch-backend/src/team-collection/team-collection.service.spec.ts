import { TeamCollectionService } from './team-collection.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCollection } from './team-collection.model';
import {
  TEAM_USER_NO_FB_SYNCDATA,
  TEAM_FB_COLL_PATH_RESOLVE_FAIL,
  TEAM_COLL_INVALID_JSON,
  TEAM_INVALID_COLL_ID,
} from '../errors';
import { mockDeep, mockReset } from 'jest-mock-extended';

const mockPrisma = mockDeep<PrismaService>();

const mockDocFunc = jest.fn();

const mockFB = {
  firestore: {
    doc: mockDocFunc,
  },
};

const mockPubSub = {
  publish: jest.fn().mockResolvedValue(null),
};

const teamCollectionService = new TeamCollectionService(
  mockPrisma,
  mockFB as any,
  mockPubSub as any,
);

beforeEach(() => {
  mockPubSub.publish.mockClear();
  mockReset(mockPrisma);
});

// TODO: rewrite tests for importCollectionsFromJSON and replaceCollectionsWithJSON
describe('exportCollectionsToJSON', () => {
  test('resolves with the correct collection info', async () => {
    /**
     * Imagine a team with collections of this format
     *
     * (id)
     * Collection1 {
     *  Request1 { "name": "dev.to homepage", "url": "https://dev.to"}
     *  Collection2 {
     *    Request2 { "name": "dev.to homepage", "url": "https://dev.to"}
     *  }
     * }
     */
    const testCollectionsJSON = `
      [{
        "folders": [{
          "folders": [],
          "name": "Collection2",
          "requests": [{
            "name": "dev.to homepage",
            "url": "https://dev.to"
          }]
        }],
          "name": "Collection1",
          "requests": [{
          "name": "dev.to homepage",
          "url": "https://dev.to"
        }]
      }]
    `;
    mockPrisma.teamCollection.findMany.mockImplementation((query) => {
      if (query?.where?.parentID === null) {
        return Promise.resolve([
          {
            prisma: true,
            id: 'Collection1',
            title: 'Collection1',
            parentID: null,
            teamID: '3170',
          },
        ]) as any;
      } else if (query?.where?.parentID === 'Collection1') {
        return Promise.resolve([
          {
            prisma: true,
            id: 'Collection2',
            title: 'Collection2',
            parentID: 'Collection1',
            teamID: '3170',
          },
        ]);
      } else {
        return Promise.resolve([]);
      }
    });

    mockPrisma.teamCollection.findUnique.mockImplementation((query) => {
      if (query?.where?.id === 'Collection1') {
        return Promise.resolve({
          prisma: true,
          id: 'Collection1',
          title: 'Collection1',
          parentID: null,
          teamID: '3170',
        });
      } else if (query?.where?.id === 'Collection2') {
        return Promise.resolve({
          prisma: true,
          id: 'Collection2',
          title: 'Collection2',
          parentID: 'Collection1',
          teamID: '3170',
        });
      } else {
        return Promise.reject('RecordNotFound') as any;
      }
    });

    mockPrisma.teamRequest.findMany.mockImplementation((query) => {
      if (query?.where?.collectionID === 'Collection1') {
        return Promise.resolve([
          {
            prisma: true,
            id: 'Request1',
            collectionID: 'Collection1',
            title: 'Request1',
            request: {
              url: 'https://dev.to',
              name: 'dev.to homepage',
            },
            teamID: '3170',
          },
        ]) as any;
      } else if (query?.where?.collectionID === 'Collection2') {
        return Promise.resolve([
          {
            prisma: true,
            id: 'Request2',
            collectionID: 'Collection2',
            title: 'Request2',
            request: {
              url: 'https://dev.to',
              name: 'dev.to homepage',
            },
            teamID: '3170',
          },
        ]);
      } else {
        return Promise.resolve([]);
      }
    });

    expect(
      JSON.parse(await teamCollectionService.exportCollectionsToJSON('3170')),
    ).toEqual(JSON.parse(testCollectionsJSON));
  });
});

describe('importCollectionFromFirestore', () => {
  test('rejects if called when the user has no synced collection data with TEAM_USER_NO_FB_SYNCDATA', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: false,
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue(null as any);

    await expect(
      teamCollectionService.importCollectionFromFirestore(
        'testuid1',
        '0/0/0',
        '3170',
      ),
    ).rejects.toThrowError(TEAM_USER_NO_FB_SYNCDATA);
    expect(mockPrisma.teamCollection.create).not.toHaveBeenCalled();
  });

  test('rejects if called with the collection path is invalid with TEAM_FB_COLL_PATH_RESOLVE_FAIL', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => {
          return {
            collection: [],
          };
        },
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue(null as any);

    await expect(
      teamCollectionService.importCollectionFromFirestore(
        'testuid1',
        '0/0/0',
        '3170',
      ),
    ).rejects.toThrowError(TEAM_FB_COLL_PATH_RESOLVE_FAIL);
    expect(mockPrisma.teamCollection.create).not.toHaveBeenCalled();
  });

  test('resolves with proper collection path for single level nesting and updates the database', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => {
          return {
            collection: [
              {
                folders: [],
                name: 'Test',
                requests: [{ name: 'Test 1' }, { name: 'Test 2' }],
              },
            ],
          };
        },
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testuid1',
      title: 'Test',
      parentID: null,
      teamID: '3170',
      requests: [
        {
          title: 'Test 1',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 1"}',
        },
        {
          title: 'Test 2',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 2"}',
        },
      ],
    } as any);

    await expect(
      teamCollectionService.importCollectionFromFirestore(
        'testuid1',
        '0',
        '3170',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Test',
        parentID: null,
        teamID: '3170',
      }),
    );
  });

  test('resolves with proper collection path for single level nesting and fires the pubsub "team_coll/<team_id>/coll_added" subject', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => {
          return {
            collection: [
              {
                folders: [],
                name: 'Test',
                requests: [{ name: 'Test 1' }, { name: 'Test 2' }],
              },
            ],
          };
        },
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testuid1',
      title: 'Test',
      parentID: null,
      teamID: '3170',
      requests: [
        {
          title: 'Test 1',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 1"}',
        },
        {
          title: 'Test 2',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 2"}',
        },
      ],
    } as any);

    const result = await teamCollectionService.importCollectionFromFirestore(
      'testuid1',
      '0',
      '3170',
    );

    expect(mockPubSub.publish).toBeCalledWith(
      'team_coll/3170/coll_added',
      result,
    );
  });

  test('resolves with proper collection path for multi level nesting and updates the database with hierarachy', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => {
          return {
            collection: [
              {
                folders: [
                  {
                    folders: [],
                    name: 'Test Subfolder',
                    requests: [
                      { name: 'Test Sub 1 1' },
                      { name: 'Test Sub 2 2' },
                    ],
                  },
                ],
                name: 'Test',
                requests: [{ name: 'Test 1' }, { name: 'Test 2' }],
              },
            ],
          };
        },
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testuid1',
      title: 'Test',
      parentID: null,
      teamID: '3170',
      requests: [
        {
          title: 'Test 1',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 1"}',
        },
        {
          title: 'Test 2',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 2"}',
        },
      ],
      children: [
        {
          id: 'testchilduid1',
          title: 'Test Subfolder',
          parentID: 'testuid1',
          teamID: '3170',
          requests: [
            {
              title: 'Test Sub 1 1',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 1 1"}',
            },
            {
              title: 'Test Sub 2 2',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 2 2"}',
            },
          ],
        },
      ],
    } as any);

    await expect(
      teamCollectionService.importCollectionFromFirestore(
        'testuid1',
        '0/0',
        '3170',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Test',
        parentID: null,
        teamID: '3170',
      }),
    );
  });

  test('resolves with proper collection path for multi level nesting and fires the pubsub "team_coll/3170/coll_added" topic', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => {
          return {
            collection: [
              {
                folders: [
                  {
                    folders: [],
                    name: 'Test Subfolder',
                    requests: [
                      { name: 'Test Sub 1 1' },
                      { name: 'Test Sub 2 2' },
                    ],
                  },
                ],
                name: 'Test',
                requests: [{ name: 'Test 1' }, { name: 'Test 2' }],
              },
            ],
          };
        },
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testuid1',
      title: 'Test',
      parentID: null,
      teamID: '3170',
      requests: [
        {
          title: 'Test 1',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 1"}',
        },
        {
          title: 'Test 2',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 2"}',
        },
      ],
      children: [
        {
          id: 'testchilduid1',
          title: 'Test Subfolder',
          parentID: 'testuid1',
          teamID: '3170',
          requests: [
            {
              title: 'Test Sub 1 1',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 1 1"}',
            },
            {
              title: 'Test Sub 2 2',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 2 2"}',
            },
          ],
        },
      ],
    } as any);

    const result = await teamCollectionService.importCollectionFromFirestore(
      'testuid1',
      '0/0',
      '3170',
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      'team_coll/3170/coll_added',
      result,
    );
  });

  test('when no parentCollectionID is specified (or null) the collection is created at root of team collection hierarachy', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => {
          return {
            collection: [
              {
                folders: [
                  {
                    folders: [],
                    name: 'Test Subfolder',
                    requests: [
                      { name: 'Test Sub 1 1' },
                      { name: 'Test Sub 2 2' },
                    ],
                  },
                ],
                name: 'Test',
                requests: [{ name: 'Test 1' }, { name: 'Test 2' }],
              },
            ],
          };
        },
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testuid1',
      title: 'Test',
      parentID: null,
      teamID: '3170',
      requests: [
        {
          title: 'Test 1',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 1"}',
        },
        {
          title: 'Test 2',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 2"}',
        },
      ],
      children: [
        {
          id: 'testchilduid1',
          title: 'Test Subfolder',
          parentID: 'testuid1',
          teamID: '3170',
          requests: [
            {
              title: 'Test Sub 1 1',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 1 1"}',
            },
            {
              title: 'Test Sub 2 2',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 2 2"}',
            },
          ],
        },
      ],
    } as any);

    const result = await teamCollectionService.importCollectionFromFirestore(
      'testuid1',
      '0/0',
      '3170',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Test',
        parentID: null,
        teamID: '3170',
      }),
    );
  });

  test('when parentCollectionID is specified the collection is created at the corresponding location', async () => {
    mockDocFunc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => {
          return {
            collection: [
              {
                folders: [
                  {
                    folders: [],
                    name: 'Test Subfolder',
                    requests: [
                      { name: 'Test Sub 1 1' },
                      { name: 'Test Sub 2 2' },
                    ],
                  },
                ],
                name: 'Test',
                requests: [{ name: 'Test 1' }, { name: 'Test 2' }],
              },
            ],
          };
        },
      }),
    });

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testcoll1',
      title: 'Test Coll 1',
      parentID: null,
      teamID: '3170',
      team: {
        id: '3170',
        name: 'Team 1',
      },
    } as any);

    const parentCollection = await teamCollectionService.createCollection(
      '3170',
      'Test Coll 1',
      null,
    );

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testuid1',
      title: 'Test',
      parentID: 'testcoll1',
      teamID: '3170',
      requests: [
        {
          title: 'Test 1',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 1"}',
        },
        {
          title: 'Test 2',
          team: {
            id: '3170',
            name: 'Team 1',
          },
          request: '{ name: "Test 2"}',
        },
      ],
      children: [
        {
          id: 'testchilduid1',
          title: 'Test Subfolder',
          parentID: 'testuid1',
          teamID: '3170',
          requests: [
            {
              title: 'Test Sub 1 1',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 1 1"}',
            },
            {
              title: 'Test Sub 2 2',
              team: {
                id: '3170',
                name: 'Team 1',
              },
              request: '{ name: "Test Sub 2 2"}',
            },
          ],
        },
      ],
      parent: {
        prisma: true,
        id: 'testcoll1',
        title: 'Test Coll 1',
        parentID: null,
        teamID: '3170',
        team: {
          id: '3170',
          name: 'Team 1',
        },
      },
    } as any);

    await expect(
      teamCollectionService.importCollectionFromFirestore(
        'testuid1',
        '0/0',
        '3170',
        parentCollection.id,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Test',
        parentID: parentCollection.id,
        teamID: '3170',
      }),
    );
  });
});

describe('createCollection', () => {
  test('rejects if null team id', async () => {
    mockPrisma.teamCollection.create.mockRejectedValue(null as any);

    await expect(
      teamCollectionService.createCollection(null as any, 'Test Coll 2', null),
    ).rejects.toBeDefined();
  });

  test('rejects if invalid teamID', async () => {
    mockPrisma.teamCollection.create.mockRejectedValue(null as any);

    await expect(
      teamCollectionService.createCollection(
        'invalidteamid',
        'Test Coll 2',
        null,
      ),
    ).rejects.toBeDefined();
  });

  test('rejects if short title', async () => {
    mockPrisma.teamCollection.create.mockRejectedValue(null as any);

    await expect(
      teamCollectionService.createCollection('3170', 'Te', null),
    ).rejects.toBeDefined();
    expect(mockPrisma.teamCollection.create).not.toHaveBeenCalled();
  });

  test('resolves if valid team id and title with null parentID', async () => {
    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 2',
      parentID: null,
      teamID: '3170',
      team: {
        id: '3170',
        name: 'Test Team 1',
      },
    } as any);

    await expect(
      teamCollectionService.createCollection('3170', 'Test Collection 2', null),
    ).resolves.toBeDefined();
  });

  test('rejects if valid team id and title with invalid parentID', async () => {
    mockPrisma.teamCollection.create.mockRejectedValue(null as any);

    await expect(
      teamCollectionService.createCollection(
        '3170',
        'Test Child Collection 1',
        'invalidtestcoll',
      ),
    ).rejects.toBeDefined();
  });

  test('resolves if valid team id and title with valid parentID', async () => {
    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testchildcoll',
      title: 'Test Collection 2',
      parentID: 'testcoll',
      teamID: '3170',
      team: {
        id: '3170',
        name: 'Test Team 1',
      },
      parent: {
        id: 'testcoll',
        title: 'Test Collection 3',
        parentID: null,
        teamID: '3170',
      },
    } as any);

    await expect(
      teamCollectionService.createCollection(
        '3170',
        'Test Child Collection 1',
        'testcoll',
      ),
    ).resolves.toBeDefined();
  });

  test('publishes creation to pubsub topic "team_coll/<team_id>/coll_added"', async () => {
    const result = await teamCollectionService.createCollection(
      '3170',
      'Test Child Collection 1',
      'testcoll',
    );

    mockPrisma.teamCollection.create.mockResolvedValue({
      id: 'testchildcoll',
      title: 'Test Collection 1',
      parentID: 'testcoll',
      teamID: '3170',
      team: {
        id: '3170',
        name: 'Test Team 1',
      },
      parent: {
        id: 'testcoll',
        title: 'Test Collection 1',
        parentID: null,
        teamID: '3170',
      },
    } as any);

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      'team_coll/3170/coll_added',
      result,
    );
  });
});

describe('deleteCollection', () => {
  test('resolves if the collection id is valid', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
    });

    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    mockPrisma.teamRequest.deleteMany.mockResolvedValue({
      count: 0,
    });

    mockPrisma.teamCollection.delete.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
    });

    await expect(
      teamCollectionService.deleteCollection('testcoll'),
    ).resolves.toBeUndefined();
  });

  test('rejects if the collection id is not valid', async () => {
    mockPrisma.teamCollection.findUnique.mockRejectedValue(
      TEAM_INVALID_COLL_ID,
    );

    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    mockPrisma.teamRequest.deleteMany.mockResolvedValue({
      count: 0,
    });

    mockPrisma.teamCollection.delete.mockResolvedValue(null as any);

    await expect(
      teamCollectionService.deleteCollection('invalidtestcoll'),
    ).rejects.toBeDefined();

    expect(mockPrisma.teamCollection.findMany).not.toHaveBeenCalled();

    expect(mockPrisma.teamCollection.deleteMany).not.toHaveBeenCalled();

    expect(mockPrisma.teamCollection.delete).not.toHaveBeenCalled();
  });

  test('performs the deletion on the database', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
    });

    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    mockPrisma.teamRequest.deleteMany.mockResolvedValue({
      count: 0,
    });

    mockPrisma.teamCollection.delete.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
    });

    await teamCollectionService.deleteCollection('testcoll');

    expect(mockPrisma.teamCollection.delete).toHaveBeenCalledWith({
      where: {
        id: 'testcoll',
      },
    });
  });

  test('publishes to pubsub topic "team_coll/<team_id>/coll_removed"', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
    });

    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    mockPrisma.teamRequest.deleteMany.mockResolvedValue({
      count: 0,
    });

    mockPrisma.teamCollection.delete.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
    });

    await teamCollectionService.deleteCollection('testcoll');

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      'team_coll/3170/coll_removed',
      'testcoll',
    );
  });
});

describe('getCollection', () => {
  test('resolves with the valid collection info for valid collection id', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
    });

    await expect(
      teamCollectionService.getCollection('testcoll'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'testcoll',
        title: 'Test Collection 1',
        parentID: null,
        teamID: '3170',
      }),
    );
  });

  test("resolves with null if the collection id doesn't exist", async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue(null as any);

    await expect(
      teamCollectionService.getCollection('invalidtestcoll'),
    ).resolves.toBeNull();
  });
});

describe('renameCollection', () => {
  test('rejects if the new title has length less than 3', async () => {
    mockPrisma.teamCollection.update.mockRejectedValue(null as any);

    await expect(
      teamCollectionService.renameCollection('testcoll', 'Te'),
    ).rejects.toBeDefined();
    expect(mockPrisma.teamCollection.update).not.toHaveBeenCalled();
  });

  test("rejects if the collection id doesn't exist", async () => {
    mockPrisma.teamCollection.update.mockRejectedValue('RecordNotFound');

    await expect(
      teamCollectionService.renameCollection(
        'invalidtestcoll',
        'Test Coll rename',
      ),
    ).rejects.toBeDefined();
  });

  test('valid queries resolves with the updated team collection', async () => {
    mockPrisma.teamCollection.update.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Rename 1',
      parentID: null,
      teamID: '3170',
    });

    await expect(
      teamCollectionService.renameCollection('testcoll', 'Test Rename 1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'testcoll',
        title: 'Test Rename 1',
        parentID: null,
        teamID: '3170',
      }),
    );
  });

  test('publish pubsub topic "team_coll/<team_id>/coll_updated"', async () => {
    mockPrisma.teamCollection.update.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Rename 1',
      parentID: null,
      teamID: '3170',
    });

    const member = await teamCollectionService.renameCollection(
      'testcoll',
      'Test Rename 1',
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      'team_coll/3170/coll_updated',
      member,
    );
  });
});

describe('getTeamOfCollection', () => {
  test('resolves with the correct team info if valid info is given', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue({
      id: '3170',
      title: 'Test Collection',
      parentID: null,
      teamID: '3170',
      team: {
        id: '3170',
        name: 'Test Team',
      },
    } as any);

    await expect(
      teamCollectionService.getTeamOfCollection('testcoll'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: '3170',
        name: 'Test Team',
      }),
    );
  });

  test("rejects if the collection id doesn't exist", async () => {
    mockPrisma.teamCollection.findUnique.mockRejectedValue('RecordNotFound');

    await expect(
      teamCollectionService.getTeamOfCollection('invalidtestcoll'),
    ).rejects.toBeDefined();
  });
});

describe('getParentOfCollection', () => {
  test('resolves to null if the collection exists but no parent', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue({
      id: 'testcoll',
      title: 'Test Collection 1',
      parentID: null,
      teamID: '3170',
      parent: null,
    } as any);

    await expect(
      teamCollectionService.getParentOfCollection('testcoll'),
    ).resolves.toBeNull();
  });

  test('resolves with the parent info if the collection exists and has parent', async () => {
    mockPrisma.teamCollection.findUnique.mockResolvedValue({
      id: 'testcoll1',
      title: 'Test Collection 1',
      parentID: 'testparent',
      teamID: '3170',
      parent: {
        id: 'testcoll2',
        title: 'Test Collection 2',
        parentID: null,
        teamID: '3170',
      },
    } as any);

    await expect(
      teamCollectionService.getParentOfCollection('testcoll2'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'testcoll2',
        title: 'Test Collection 2',
        parentID: null,
        teamID: '3170',
      }),
    );
  });

  test("rejects if the collection id doesn't exist", async () => {
    mockPrisma.teamCollection.findUnique.mockRejectedValue('RecordNotFound');

    await expect(
      teamCollectionService.getParentOfCollection('invalidtestcoll'),
    ).rejects.toBeDefined();
  });
});

describe('getChildrenOfCollection', () => {
  test('resolves for valid collection id and null cursor', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: 'testcoll',
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getChildrenOfCollection('testcoll', null),
    ).resolves.toBeDefined();
  });

  test('resolves for invalid collection id and null cursor with an empty array', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    await expect(
      teamCollectionService.getChildrenOfCollection('invalidcollid', null),
    ).resolves.toHaveLength(0);
  });

  test('resolves for valid collection id and non-null invalid cursor', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    await expect(
      teamCollectionService.getChildrenOfCollection(
        'testcoll',
        'invalidcursor',
      ),
    ).resolves.toBeDefined();
  });

  test('returns the first 10 elements only for valid collection id and null cursor', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: 'testcoll',
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: 'testcoll',
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getChildrenOfCollection('testcoll', null),
    ).resolves.toHaveLength(10);
  });

  test('returns the 10 elements only for valid collection id and valid cursor', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: 'someid',
        teamID: '3170',
      },
    ]);

    const secondChildColl = (
      await teamCollectionService.getChildrenOfCollection('someid', null)
    )[1];

    mockReset(mockPrisma);
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid11',
        title: 'testcoll11',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid12',
        title: 'testcoll12',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid13',
        title: 'testcoll13',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid14',
        title: 'testcoll14',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid15',
        title: 'testcoll15',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid16',
        title: 'testcoll16',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid17',
        title: 'testcoll17',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid18',
        title: 'testcoll18',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid19',
        title: 'testcoll19',
        parentID: 'someid',
        teamID: '3170',
      },
      {
        id: 'someid20',
        title: 'testcoll20',
        parentID: 'someid',
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getChildrenOfCollection(
        'someid',
        secondChildColl.id,
      ),
    ).resolves.toHaveLength(10);
  });
});

describe('getTeamRootCollections', () => {
  test('resolves for valid team id and null cursor', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: null,
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getTeamRootCollections('3170', null),
    ).resolves.toBeDefined();
  });

  test('resolves for invalid team id and null cursor with an empty array', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    await expect(
      teamCollectionService.getTeamRootCollections('invalidteamid', null),
    ).resolves.toHaveLength(0);
  });

  test('resolves for valid team id and null cursor with the first 10 elements', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: null,
        teamID: '3170',
      },
    ]);

    return expect(
      teamCollectionService.getTeamRootCollections('3170', null),
    ).resolves.toHaveLength(10);
  });

  test('resolves for valid team id and invalid cursor with empty array', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    await expect(
      teamCollectionService.getTeamRootCollections('3170', 'invalidcursor'),
    ).resolves.toHaveLength(0);
  });

  test('resolves for valid team id and valid cursor with the next 10 elements', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: null,
        teamID: '3170',
      },
    ]);

    const secondColl = (
      await teamCollectionService.getTeamRootCollections('3170', null)
    )[1];

    mockReset(mockPrisma);
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid11',
        title: 'testcoll11',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid12',
        title: 'testcoll12',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid13',
        title: 'testcoll13',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid14',
        title: 'testcoll14',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid15',
        title: 'testcoll15',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid17',
        title: 'testcoll17',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid18',
        title: 'testcoll18',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid19',
        title: 'testcoll19',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid20',
        title: 'testcoll20',
        parentID: null,
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getTeamRootCollections('3170', secondColl.id),
    ).resolves.toHaveLength(10);
  });
});

describe('getTeamCollections', () => {
  test('resolves for valid team id and null cursor', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: null,
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getTeamCollections('3170', null),
    ).resolves.toBeDefined();
  });

  test('resolves for invalid team id and null cursor with an empty array', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    await expect(
      teamCollectionService.getTeamCollections('invalidteamid', null),
    ).resolves.toHaveLength(0);
  });

  test('resolves for valid team id and null cursor with the first 10 elements', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: 'someid1',
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: 'someid3',
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: 'someid5',
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: 'someid7',
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: 'someid9',
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getTeamCollections('3170', null),
    ).resolves.toHaveLength(10);
  });

  test('resolves for valid team id and invalid cursor with empty array', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([]);

    await expect(
      teamCollectionService.getTeamCollections('3170', 'invalidcursor'),
    ).resolves.toHaveLength(0);
  });

  test('resolves for valid team id and valid cursor with the next 10 elements', async () => {
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: 'someid1',
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: 'someid3',
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: 'someid5',
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: 'someid7',
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: 'someid9',
        teamID: '3170',
      },
    ]);

    const secondColl = (
      await teamCollectionService.getTeamCollections('3170', null)
    )[1];

    mockReset(mockPrisma);
    mockPrisma.teamCollection.findMany.mockResolvedValue([
      {
        id: 'someid1',
        title: 'testcoll1',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid2',
        title: 'testcoll2',
        parentID: 'someid1',
        teamID: '3170',
      },
      {
        id: 'someid3',
        title: 'testcoll3',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid4',
        title: 'testcoll4',
        parentID: 'someid3',
        teamID: '3170',
      },
      {
        id: 'someid5',
        title: 'testcoll5',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid6',
        title: 'testcoll6',
        parentID: 'someid5',
        teamID: '3170',
      },
      {
        id: 'someid7',
        title: 'testcoll7',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid8',
        title: 'testcoll8',
        parentID: 'someid7',
        teamID: '3170',
      },
      {
        id: 'someid9',
        title: 'testcoll9',
        parentID: null,
        teamID: '3170',
      },
      {
        id: 'someid10',
        title: 'testcoll10',
        parentID: 'someid9',
        teamID: '3170',
      },
    ]);

    await expect(
      teamCollectionService.getTeamCollections('3170', secondColl.id),
    ).resolves.toHaveLength(10);
  });

  describe('getCollectionTO', () => {
    test('should resolve to Some for valid collection ID', async () => {
      mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
        id: 'testcoll',
        parentID: 'testparentcoll',
        teamID: '3170',
        title: 'Test Collection',
      });

      expect(
        await teamCollectionService.getCollectionTO('testcoll')(),
      ).toBeSome();
    });

    test('should resolve to the correct Some value for a valid collection ID', async () => {
      mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
        id: 'testcoll',
        parentID: 'testparentcoll',
        teamID: '3170',
        title: 'Test Collection',
      });

      expect(
        await teamCollectionService.getCollectionTO('testcoll')(),
      ).toEqualSome(<TeamCollection>{
        id: 'testcoll',
        parentID: 'testparentcoll',
        teamID: '3170',
        title: 'Test Collection',
      });
    });

    test('should resolve a None value if the the collection ID does not exist', async () => {
      mockPrisma.teamCollection.findUnique.mockResolvedValueOnce(null);

      expect(
        await teamCollectionService.getCollectionTO('testcoll')(),
      ).toBeNone();
    });
  });
});

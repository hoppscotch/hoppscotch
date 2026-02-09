import { PublishedDocs as DBPublishedDocs } from 'src/generated/prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';
import {
  PUBLISHED_DOCS_CREATION_FAILED,
  PUBLISHED_DOCS_DELETION_FAILED,
  PUBLISHED_DOCS_INVALID_COLLECTION,
  PUBLISHED_DOCS_INVALID_ENVIRONMENT,
  PUBLISHED_DOCS_NOT_FOUND,
  PUBLISHED_DOCS_UPDATE_FAILED,
  TEAM_INVALID_ID,
} from 'src/errors';
import * as E from 'fp-ts/Either';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from 'src/user/user.model';
import { WorkspaceType } from 'src/types/WorkspaceTypes';
import { PublishedDocsService } from './published-docs.service';
import { PublishedDocs } from './published-docs.model';
import { UserCollectionService } from 'src/user-collection/user-collection.service';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import {
  CreatePublishedDocsArgs,
  UpdatePublishedDocsArgs,
} from './input-type.args';
import { TeamAccessRole } from 'src/team/team.model';
import { ConfigService } from '@nestjs/config';

const mockPrisma = mockDeep<PrismaService>();
const mockUserCollectionService = mockDeep<UserCollectionService>();
const mockTeamCollectionService = mockDeep<TeamCollectionService>();
const mockConfigService = mockDeep<ConfigService>();

const publishedDocsService = new PublishedDocsService(
  mockPrisma,
  mockUserCollectionService,
  mockTeamCollectionService,
  mockConfigService,
);

const currentTime = new Date();

const user: User = {
  uid: '123344',
  email: 'dwight@dundermifflin.com',
  displayName: 'Dwight Schrute',
  photoURL: 'https://en.wikipedia.org/wiki/Dwight_Schrute',
  isAdmin: false,
  lastLoggedOn: currentTime,
  lastActiveOn: currentTime,
  createdOn: currentTime,
  currentGQLSession: {} as any,
  currentRESTSession: {} as any,
};

const userPublishedDoc: DBPublishedDocs = {
  id: 'pub_doc_1',
  slug: 'slug-collection-1',
  title: 'User API Documentation',
  version: '1.0.0',
  autoSync: true,
  documentTree: {},
  workspaceType: WorkspaceType.USER,
  workspaceID: user.uid,
  collectionID: 'collection_1',
  creatorUid: user.uid,
  metadata: {},
  environmentID: null,
  environmentName: null,
  environmentVariables: null,
  createdOn: currentTime,
  updatedOn: currentTime,
};

const userPublishedDocCasted: PublishedDocs = {
  id: userPublishedDoc.id,
  slug: userPublishedDoc.slug,
  title: userPublishedDoc.title,
  version: userPublishedDoc.version,
  autoSync: userPublishedDoc.autoSync,
  documentTree: JSON.stringify(userPublishedDoc.documentTree),
  workspaceType: userPublishedDoc.workspaceType,
  workspaceID: userPublishedDoc.workspaceID,
  metadata: JSON.stringify(userPublishedDoc.metadata),
  environmentName: null,
  environmentVariables: null,
  createdOn: userPublishedDoc.createdOn,
  updatedOn: userPublishedDoc.updatedOn,
  url: `${mockConfigService.get('VITE_BASE_URL')}/view/${userPublishedDoc.slug}/${userPublishedDoc.version}`,
};

const teamPublishedDoc: DBPublishedDocs = {
  id: 'pub_doc_2',
  slug: 'slug-team-collection-1',
  title: 'Team API Documentation',
  version: '1.0.0',
  autoSync: true,
  documentTree: {},
  workspaceType: WorkspaceType.TEAM,
  workspaceID: 'team_1',
  collectionID: 'team_collection_1',
  creatorUid: user.uid,
  metadata: {},
  environmentID: null,
  environmentName: null,
  environmentVariables: null,
  createdOn: currentTime,
  updatedOn: currentTime,
};

const teamPublishedDocCasted: PublishedDocs = {
  id: teamPublishedDoc.id,
  slug: teamPublishedDoc.slug,
  title: teamPublishedDoc.title,
  version: teamPublishedDoc.version,
  autoSync: teamPublishedDoc.autoSync,
  documentTree: JSON.stringify(teamPublishedDoc.documentTree),
  workspaceType: teamPublishedDoc.workspaceType,
  workspaceID: teamPublishedDoc.workspaceID,
  metadata: JSON.stringify(teamPublishedDoc.metadata),
  environmentName: null,
  environmentVariables: null,
  createdOn: teamPublishedDoc.createdOn,
  updatedOn: teamPublishedDoc.updatedOn,
  url: `${mockConfigService.get('VITE_BASE_URL')}/view/${teamPublishedDoc.slug}/${teamPublishedDoc.version}`,
};

beforeEach(() => {
  mockReset(mockPrisma);
});

describe('getPublishedDocByID', () => {
  test('should return a published document with valid ID and user access', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);

    const result = await publishedDocsService.getPublishedDocByID(
      userPublishedDoc.id,
      user,
    );
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toMatchObject(userPublishedDocCasted);
    }
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when ID is invalid', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.getPublishedDocByID(
      'invalid_id',
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when user does not have access', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      creatorUid: 'different_user',
    });

    const result = await publishedDocsService.getPublishedDocByID(
      userPublishedDoc.id,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });

  test('should return team published document when user has team access', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);

    const result = await publishedDocsService.getPublishedDocByID(
      teamPublishedDoc.id,
      user,
    );
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toMatchObject(teamPublishedDocCasted);
    }
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when user does not have team access', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.getPublishedDocByID(
      teamPublishedDoc.id,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });
});

describe('getAllUserPublishedDocs', () => {
  test('should return a list of user published documents with pagination', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([userPublishedDoc]);
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([
      { id: 'collection_1' },
    ] as any);

    const result = await publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      { skip: 0, take: 10 },
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(userPublishedDocCasted);
  });

  test('should return an empty array when no documents found', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([]);
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);

    const result = await publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      { skip: 0, take: 10 },
    );
    expect(result).toEqual([]);
  });

  test('should return paginated results correctly', async () => {
    const docs = [userPublishedDoc, { ...userPublishedDoc, id: 'pub_doc_3' }];
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([docs[0]]);
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([
      { id: 'collection_1' },
    ] as any);

    const result = await publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      { skip: 0, take: 1 },
    );
    expect(result).toHaveLength(1);
  });

  test('should filter out published docs with non-existent collections', async () => {
    const doc1 = {
      ...userPublishedDoc,
      id: 'pub_doc_1',
      collectionID: 'collection_1',
    };
    const doc2 = {
      ...userPublishedDoc,
      id: 'pub_doc_2',
      collectionID: 'collection_2',
    };
    const doc3 = {
      ...userPublishedDoc,
      id: 'pub_doc_3',
      collectionID: 'collection_3',
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([doc1, doc2, doc3]);
    // Only collection_1 and collection_3 exist
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([
      { id: 'collection_1' },
      { id: 'collection_3' },
    ] as any);

    const result = await publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      { skip: 0, take: 10 },
    );

    // Should only return docs with existing collections
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toEqual(['pub_doc_1', 'pub_doc_3']);
  });

  test('should delete published docs with non-existent collections', async () => {
    const doc1 = {
      ...userPublishedDoc,
      id: 'pub_doc_1',
      collectionID: 'collection_1',
    };
    const doc2 = {
      ...userPublishedDoc,
      id: 'pub_doc_2',
      collectionID: 'collection_deleted',
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([doc1, doc2]);
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([
      { id: 'collection_1' },
    ] as any);
    mockPrisma.publishedDocs.deleteMany.mockResolvedValueOnce({
      count: 1,
    } as any);

    await publishedDocsService.getAllUserPublishedDocs(user.uid, {
      skip: 0,
      take: 10,
    });

    expect(mockPrisma.publishedDocs.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['pub_doc_2'] },
      },
    });
  });

  test('should not call deleteMany when all collections exist', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([userPublishedDoc]);
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([
      { id: 'collection_1' },
    ] as any);

    await publishedDocsService.getAllUserPublishedDocs(user.uid, {
      skip: 0,
      take: 10,
    });

    expect(mockPrisma.publishedDocs.deleteMany).not.toHaveBeenCalled();
  });
});

describe('getAllTeamPublishedDocs', () => {
  test('should return a list of team published documents with pagination', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([teamPublishedDoc]);
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([
      { id: 'team_collection_1' },
    ] as any);

    const result = await publishedDocsService.getAllTeamPublishedDocs(
      'team_1',
      'team_collection_1',
      { skip: 0, take: 10 },
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(teamPublishedDocCasted);
  });

  test('should return an empty array when no team documents found', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([]);
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([]);

    const result = await publishedDocsService.getAllTeamPublishedDocs(
      'team_1',
      'team_collection_1',
      { skip: 0, take: 10 },
    );
    expect(result).toEqual([]);
  });

  test('should filter by teamID and collectionID correctly', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([teamPublishedDoc]);
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([
      { id: 'team_collection_1' },
    ] as any);

    await publishedDocsService.getAllTeamPublishedDocs(
      'team_1',
      'team_collection_1',
      { skip: 0, take: 10 },
    );

    expect(mockPrisma.publishedDocs.findMany).toHaveBeenCalledWith({
      where: {
        workspaceType: WorkspaceType.TEAM,
        workspaceID: 'team_1',
        collectionID: 'team_collection_1',
      },
      skip: 0,
      take: 10,
      orderBy: {
        createdOn: 'desc',
      },
    });
  });

  test('should filter out published docs with non-existent team collections', async () => {
    const doc1 = {
      ...teamPublishedDoc,
      id: 'pub_doc_1',
      collectionID: 'team_collection_1',
    };
    const doc2 = {
      ...teamPublishedDoc,
      id: 'pub_doc_2',
      collectionID: 'team_collection_2',
    };
    const doc3 = {
      ...teamPublishedDoc,
      id: 'pub_doc_3',
      collectionID: 'team_collection_3',
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([doc1, doc2, doc3]);
    // Only team_collection_1 and team_collection_3 exist
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([
      { id: 'team_collection_1' },
      { id: 'team_collection_3' },
    ] as any);

    const result = await publishedDocsService.getAllTeamPublishedDocs(
      'team_1',
      undefined,
      { skip: 0, take: 10 },
    );

    // Should only return docs with existing collections
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toEqual(['pub_doc_1', 'pub_doc_3']);
  });

  test('should delete published docs with non-existent team collections', async () => {
    const doc1 = {
      ...teamPublishedDoc,
      id: 'pub_doc_1',
      collectionID: 'team_collection_1',
    };
    const doc2 = {
      ...teamPublishedDoc,
      id: 'pub_doc_2',
      collectionID: 'team_collection_deleted',
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([doc1, doc2]);
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([
      { id: 'team_collection_1' },
    ] as any);
    mockPrisma.publishedDocs.deleteMany.mockResolvedValueOnce({
      count: 1,
    } as any);

    await publishedDocsService.getAllTeamPublishedDocs('team_1', undefined, {
      skip: 0,
      take: 10,
    });

    expect(mockPrisma.publishedDocs.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['pub_doc_2'] },
      },
    });
  });

  test('should not call deleteMany when all team collections exist', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([teamPublishedDoc]);
    mockPrisma.teamCollection.findMany.mockResolvedValueOnce([
      { id: 'team_collection_1' },
    ] as any);

    await publishedDocsService.getAllTeamPublishedDocs(
      'team_1',
      'team_collection_1',
      { skip: 0, take: 10 },
    );

    expect(mockPrisma.publishedDocs.deleteMany).not.toHaveBeenCalled();
  });
});

describe('createPublishedDoc', () => {
  const createArgs: CreatePublishedDocsArgs = {
    title: 'New API Documentation',
    version: '1.0.0',
    autoSync: true,
    workspaceType: WorkspaceType.USER,
    workspaceID: user.uid,
    collectionID: 'collection_1',
    metadata: '{}',
  };

  test('should successfully create a user published document with valid inputs', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce(userPublishedDoc);

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toMatchObject(userPublishedDocCasted);
    }
  });

  test('should successfully create a team published document with valid inputs', async () => {
    const teamArgs: CreatePublishedDocsArgs = {
      ...createArgs,
      workspaceType: WorkspaceType.TEAM,
      workspaceID: 'team_1',
      collectionID: 'team_collection_1',
    };

    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
      id: 'team_collection_1',
      teamID: 'team_1',
    } as any);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce(teamPublishedDoc);

    const result = await publishedDocsService.createPublishedDoc(
      teamArgs,
      user,
    );
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toMatchObject(teamPublishedDocCasted);
    }
  });

  test('should throw TEAM_INVALID_ID when team ID is invalid', async () => {
    const teamArgs: CreatePublishedDocsArgs = {
      ...createArgs,
      workspaceType: WorkspaceType.TEAM,
      workspaceID: '',
    };

    const result = await publishedDocsService.createPublishedDoc(
      teamArgs,
      user,
    );
    expect(result).toEqualLeft(TEAM_INVALID_ID);
  });

  test('should throw TEAM_INVALID_ID when user does not have team access', async () => {
    const teamArgs: CreatePublishedDocsArgs = {
      ...createArgs,
      workspaceType: WorkspaceType.TEAM,
      workspaceID: 'team_1',
    };

    mockPrisma.team.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.createPublishedDoc(
      teamArgs,
      user,
    );
    expect(result).toEqualLeft(TEAM_INVALID_ID);
  });

  test('should throw PUBLISHED_DOCS_INVALID_COLLECTION when user collection is invalid', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_COLLECTION);
  });

  test('should throw PUBLISHED_DOCS_INVALID_COLLECTION when team collection is invalid', async () => {
    const teamArgs: CreatePublishedDocsArgs = {
      ...createArgs,
      workspaceType: WorkspaceType.TEAM,
      workspaceID: 'team_1',
      collectionID: 'invalid_collection',
    };

    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.createPublishedDoc(
      teamArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_COLLECTION);
  });

  test('should throw PUBLISHED_DOCS_INVALID_COLLECTION when collection does not belong to user', async () => {
    // When Prisma queries with where: { id: 'collection_1', userUid: user.uid }
    // and the collection doesn't belong to the user, it returns null
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_COLLECTION);
  });

  test('should throw error when metadata is invalid JSON', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);

    const result = await publishedDocsService.createPublishedDoc(
      { ...createArgs, metadata: '{invalid' },
      user,
    );
    expect(E.isLeft(result)).toBe(true);
  });

  test('should throw PUBLISHED_DOCS_CREATION_FAILED on database error', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.create.mockRejectedValueOnce(
      new Error('Database error'),
    );

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_CREATION_FAILED);
  });
});

describe('updatePublishedDoc', () => {
  const updateArgs: UpdatePublishedDocsArgs = {
    title: 'Updated API Documentation',
    version: '2.0.0',
    autoSync: false,
    metadata: '{"key": "value"}',
  };

  test('should successfully update a published document with valid inputs', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    // autoSync switching from true → false requires exporting collection snapshot
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right({} as any),
    );
    mockPrisma.publishedDocs.update.mockResolvedValueOnce({
      ...userPublishedDoc,
      title: updateArgs.title,
      version: updateArgs.version,
      autoSync: updateArgs.autoSync,
    });

    const result = await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      updateArgs,
      user,
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.title).toBe(updateArgs.title);
      expect(result.right.version).toBe(updateArgs.version);
      expect(result.right.autoSync).toBe(updateArgs.autoSync);
    }
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when document ID is invalid', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.updatePublishedDoc(
      'invalid_id',
      updateArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });

  test('should throw PUBLISHED_DOCS_UPDATE_FAILED when user does not have access', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      creatorUid: 'different_user',
    });

    const result = await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      updateArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_UPDATE_FAILED);
  });

  test('should throw PUBLISHED_DOCS_UPDATE_FAILED when user is not OWNER or EDITOR of team', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.updatePublishedDoc(
      teamPublishedDoc.id,
      updateArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_UPDATE_FAILED);
  });

  test('should successfully update team published document when user has OWNER role', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    // autoSync switching from true → false requires exporting collection snapshot
    mockTeamCollectionService.exportCollectionToJSONObject.mockResolvedValueOnce(
      E.right({} as any),
    );
    mockPrisma.publishedDocs.update.mockResolvedValueOnce({
      ...teamPublishedDoc,
      title: updateArgs.title,
    });

    const result = await publishedDocsService.updatePublishedDoc(
      teamPublishedDoc.id,
      updateArgs,
      user,
    );

    expect(E.isRight(result)).toBe(true);
  });

  test('should successfully update team published document when user has EDITOR role', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    // autoSync switching from true → false requires exporting collection snapshot
    mockTeamCollectionService.exportCollectionToJSONObject.mockResolvedValueOnce(
      E.right({} as any),
    );
    mockPrisma.publishedDocs.update.mockResolvedValueOnce({
      ...teamPublishedDoc,
      title: updateArgs.title,
    });

    const result = await publishedDocsService.updatePublishedDoc(
      teamPublishedDoc.id,
      updateArgs,
      user,
    );

    expect(E.isRight(result)).toBe(true);
  });

  test('should throw error when metadata is invalid JSON', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);

    const result = await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      { ...updateArgs, metadata: '{invalid' },
      user,
    );
    expect(E.isLeft(result)).toBe(true);
  });

  test('should update only provided fields', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.publishedDocs.update.mockResolvedValueOnce({
      ...userPublishedDoc,
      title: 'Only Title Updated',
    });

    const result = await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      { title: 'Only Title Updated' },
      user,
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.title).toBe('Only Title Updated');
    }
  });

  test('should throw PUBLISHED_DOCS_UPDATE_FAILED on database error', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.publishedDocs.update.mockRejectedValueOnce(
      new Error('Database error'),
    );

    const result = await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      updateArgs,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_UPDATE_FAILED);
  });
});

describe('deletePublishedDoc', () => {
  test('should successfully delete a user published document', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.publishedDocs.delete.mockResolvedValueOnce(userPublishedDoc);

    const result = await publishedDocsService.deletePublishedDoc(
      userPublishedDoc.id,
      user,
    );
    expect(result).toEqualRight(true);
  });

  test('should successfully delete a team published document when user has OWNER role', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    mockPrisma.publishedDocs.delete.mockResolvedValueOnce(teamPublishedDoc);

    const result = await publishedDocsService.deletePublishedDoc(
      teamPublishedDoc.id,
      user,
    );
    expect(result).toEqualRight(true);
  });

  test('should successfully delete a team published document when user has EDITOR role', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    mockPrisma.publishedDocs.delete.mockResolvedValueOnce(teamPublishedDoc);

    const result = await publishedDocsService.deletePublishedDoc(
      teamPublishedDoc.id,
      user,
    );
    expect(result).toEqualRight(true);
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when document ID is invalid', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.deletePublishedDoc(
      'invalid_id',
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });

  test('should throw PUBLISHED_DOCS_DELETION_FAILED when user does not have access', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      creatorUid: 'different_user',
    });

    const result = await publishedDocsService.deletePublishedDoc(
      userPublishedDoc.id,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_DELETION_FAILED);
  });

  test('should throw PUBLISHED_DOCS_DELETION_FAILED when user is not OWNER or EDITOR of team', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.deletePublishedDoc(
      teamPublishedDoc.id,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_DELETION_FAILED);
  });

  test('should throw PUBLISHED_DOCS_DELETION_FAILED on database error', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.publishedDocs.delete.mockRejectedValueOnce(
      new Error('Database error'),
    );

    const result = await publishedDocsService.deletePublishedDoc(
      userPublishedDoc.id,
      user,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_DELETION_FAILED);
  });
});

describe('getPublishedDocsCreator', () => {
  test('should return the creator of a published document', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.user.findUnique.mockResolvedValueOnce(user as any);

    const result = await publishedDocsService.getPublishedDocsCreator(
      userPublishedDoc.id,
    );

    const expectedUser = {
      ...user,
      currentGQLSession: JSON.stringify(user.currentGQLSession),
      currentRESTSession: JSON.stringify(user.currentRESTSession),
    };

    expect(result).toEqualRight(expectedUser);
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when document ID is invalid', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    const result =
      await publishedDocsService.getPublishedDocsCreator('invalid_id');
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });
});

describe('getPublishedDocsCollection', () => {
  test('should return user collection for user workspace published document', async () => {
    const userCollection = {
      id: 'collection_1',
      userUid: user.uid,
      title: 'My Collection',
    };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce(
      userCollection as any,
    );

    const result = await publishedDocsService.getPublishedDocsCollection(
      userPublishedDoc.id,
    );
    expect(result).toEqualRight(userCollection);
  });

  test('should return team collection for team workspace published document', async () => {
    const teamCollection = {
      id: 'team_collection_1',
      teamID: 'team_1',
      title: 'Team Collection',
    };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce(
      teamCollection as any,
    );

    const result = await publishedDocsService.getPublishedDocsCollection(
      teamPublishedDoc.id,
    );
    expect(result).toEqualRight(teamCollection);
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when document ID is invalid', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    const result =
      await publishedDocsService.getPublishedDocsCollection('invalid_id');
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });

  test('should throw PUBLISHED_DOCS_INVALID_COLLECTION when user collection is not found', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.getPublishedDocsCollection(
      userPublishedDoc.id,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_COLLECTION);
  });

  test('should throw PUBLISHED_DOCS_INVALID_COLLECTION when team collection is not found', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.getPublishedDocsCollection(
      teamPublishedDoc.id,
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_COLLECTION);
  });
});

describe('checkPublishedDocsAccess', () => {
  test('should return true for user workspace when user is the creator', async () => {
    const result = await publishedDocsService.checkPublishedDocsAccess(
      userPublishedDoc,
      user.uid,
    );
    expect(result).toBe(true);
  });

  test('should return false for user workspace when user is not the creator', async () => {
    const result = await publishedDocsService.checkPublishedDocsAccess(
      userPublishedDoc,
      'different_user',
    );
    expect(result).toBe(false);
  });

  test('should return true for team workspace when user has required role', async () => {
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);

    const result = await publishedDocsService.checkPublishedDocsAccess(
      teamPublishedDoc,
      user.uid,
      [TeamAccessRole.OWNER],
    );
    expect(result).toBe(true);
  });

  test('should return false for team workspace when user does not have required role', async () => {
    mockPrisma.team.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.checkPublishedDocsAccess(
      teamPublishedDoc,
      user.uid,
      [TeamAccessRole.OWNER],
    );
    expect(result).toBe(false);
  });

  test('should check for VIEWER role by default', async () => {
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);

    const result = await publishedDocsService.checkPublishedDocsAccess(
      teamPublishedDoc,
      user.uid,
    );
    expect(result).toBe(true);

    expect(mockPrisma.team.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'team_1',
        members: {
          some: {
            userUid: user.uid,
            role: {
              in: [
                TeamAccessRole.OWNER,
                TeamAccessRole.EDITOR,
                TeamAccessRole.VIEWER,
              ],
            },
          },
        },
      },
    });
  });
});

describe('getPublishedDocsVersions', () => {
  test('should return all versions for a given slug ordered by autoSync and createdOn', async () => {
    const mockDbRecords = [
      {
        id: 'pub_doc_1',
        slug: 'slug-collection-1',
        version: '1.0.0',
        title: 'API Docs v1',
        autoSync: true,
        collectionID: 'coll_1',
        creatorUid: 'user_1',
        workspaceType: 'USER' as any,
        workspaceID: 'workspace_1',
        documentTree: { folders: [] },
        metadata: { description: 'v1' },
        environmentID: null,
        environmentName: null,
        environmentVariables: null,
        createdOn: new Date(),
        updatedOn: new Date(),
      },
      {
        id: 'pub_doc_2',
        slug: 'slug-collection-1',
        version: '2.0.0',
        title: 'API Docs v2',
        autoSync: true,
        collectionID: 'coll_1',
        creatorUid: 'user_1',
        workspaceType: 'USER' as any,
        workspaceID: 'workspace_1',
        documentTree: { folders: [] },
        metadata: { description: 'v2' },
        environmentID: null,
        environmentName: null,
        environmentVariables: null,
        createdOn: new Date(),
        updatedOn: new Date(),
      },
      {
        id: 'pub_doc_3',
        slug: 'slug-collection-1',
        version: '3.0.0',
        title: 'API Docs v3',
        autoSync: false,
        collectionID: 'coll_1',
        creatorUid: 'user_1',
        workspaceType: 'USER' as any,
        workspaceID: 'workspace_1',
        documentTree: { folders: [] },
        metadata: { description: 'v3' },
        environmentID: null,
        environmentName: null,
        environmentVariables: null,
        createdOn: new Date(),
        updatedOn: new Date(),
      },
    ];

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce(
      mockDbRecords as any,
    );

    const result =
      await publishedDocsService.getPublishedDocsVersions('slug-collection-1');

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      // cast() adds versions array, stringifies documentTree/metadata, and adds url
      expect(result.right).toHaveLength(3);
      expect(result.right[0]).toMatchObject({
        id: 'pub_doc_1',
        slug: 'slug-collection-1',
        version: '1.0.0',
        title: 'API Docs v1',
        autoSync: true,
      });
      expect(result.right[0].url).toContain('/view/slug-collection-1/1.0.0');
      expect(result.right[0].versions).toEqual([]);
    }
  });

  test('should return empty array when no versions found', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([]);

    const result =
      await publishedDocsService.getPublishedDocsVersions('non-existent-slug');

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toEqual([]);
    }
  });

  test('should query with correct orderBy clause for autoSync priority', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([]);

    await publishedDocsService.getPublishedDocsVersions('test-slug');

    expect(mockPrisma.publishedDocs.findMany).toHaveBeenCalledWith({
      where: { slug: 'test-slug' },
      orderBy: [{ autoSync: 'desc' }, { createdOn: 'desc' }],
    });
  });
});

describe('getPublishedDocBySlugPublic', () => {
  test('should return published document by slug and version with autoSync enabled', async () => {
    const collectionData = {
      id: 'collection_1',
      name: 'Test Collection',
      folders: [],
      requests: [],
    };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      autoSync: true,
    });
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      {
        id: userPublishedDoc.id,
        slug: userPublishedDoc.slug,
        version: userPublishedDoc.version,
        title: userPublishedDoc.title,
        autoSync: userPublishedDoc.autoSync,
      },
    ] as any);
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right(collectionData as any),
    );

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'slug-collection-1',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.slug).toBe('slug-collection-1');
      expect(result.right.version).toBe('1.0.0');
      expect(result.right.documentTree).toBe(JSON.stringify(collectionData));
    }
  });

  test('should return published document with stored documentTree when autoSync is false', async () => {
    const storedDocTree = { folders: [], requests: [] };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      autoSync: false,
      documentTree: storedDocTree,
    });
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      {
        id: userPublishedDoc.id,
        slug: userPublishedDoc.slug,
        version: userPublishedDoc.version,
        title: userPublishedDoc.title,
        autoSync: false,
      },
    ] as any);

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'slug-collection-1',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.documentTree).toBe(JSON.stringify(storedDocTree));
    }
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when slug and version combination not found', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([]);
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'non-existent-slug',
      '1.0.0',
    );

    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });

  test('should use unique constraint slug_version for lookup', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      {
        id: 'v1',
        slug: 'test-slug',
        version: '2.0.0',
        title: 'V1',
        autoSync: true,
      },
    ] as any);
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    await publishedDocsService.getPublishedDocBySlugPublic(
      'test-slug',
      '2.0.0',
    );

    expect(mockPrisma.publishedDocs.findUnique).toHaveBeenCalledWith({
      where: {
        slug_version: {
          slug: 'test-slug',
          version: '2.0.0',
        },
      },
    });
  });

  test('should fetch all versions for the slug', async () => {
    const allVersions = [
      {
        id: 'v1',
        slug: 'test-slug',
        version: '1.0.0',
        title: 'V1',
        autoSync: true,
      },
      {
        id: 'v2',
        slug: 'test-slug',
        version: '2.0.0',
        title: 'V2',
        autoSync: true,
      },
    ];

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      autoSync: false,
    });
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce(allVersions as any);

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'test-slug',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
  });
});

describe('createPublishedDoc - slug generation and race conditions', () => {
  const createArgs: CreatePublishedDocsArgs = {
    title: 'New API Documentation',
    version: '1.0.0',
    autoSync: true,
    workspaceType: WorkspaceType.USER,
    workspaceID: user.uid,
    collectionID: 'collection_1',
    metadata: '{}',
  };

  test('should generate new slug for first version of a collection', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    // No existing docs for this collection
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce({
      ...userPublishedDoc,
      slug: expect.any(String),
    });

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );

    expect(E.isRight(result)).toBe(true);
    expect(mockPrisma.publishedDocs.findFirst).toHaveBeenCalledWith({
      where: {
        collectionID: 'collection_1',
        workspaceType: WorkspaceType.USER,
        workspaceID: user.uid,
      },
      orderBy: {
        createdOn: 'asc',
      },
    });
  });

  test('should reuse existing slug for subsequent versions of same collection', async () => {
    const existingSlug = 'existing-slug-abc';
    const existingDoc = {
      ...userPublishedDoc,
      slug: existingSlug,
      version: '1.0.0',
    };

    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(existingDoc);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce({
      ...userPublishedDoc,
      slug: existingSlug,
      version: '2.0.0',
    });

    const result = await publishedDocsService.createPublishedDoc(
      { ...createArgs, version: '2.0.0' },
      user,
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.slug).toBe(existingSlug);
    }
  });

  test('should retry on race condition (P2002 error) up to 3 times', async () => {
    const uniqueConstraintError = {
      code: 'P2002',
      meta: { target: ['slug', 'version'] },
    };

    mockPrisma.userCollection.findUnique.mockResolvedValue({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValue(null);

    // First two attempts fail with P2002, third succeeds
    mockPrisma.publishedDocs.create
      .mockRejectedValueOnce(uniqueConstraintError)
      .mockRejectedValueOnce(uniqueConstraintError)
      .mockResolvedValueOnce(userPublishedDoc);

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );

    expect(E.isRight(result)).toBe(true);
    expect(mockPrisma.publishedDocs.create).toHaveBeenCalledTimes(3);
  });

  test('should fail after max retries (3 attempts)', async () => {
    const uniqueConstraintError = {
      code: 'P2002',
      meta: { target: ['slug', 'version'] },
    };

    mockPrisma.userCollection.findUnique.mockResolvedValue({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValue(null);

    // All attempts fail with P2002
    mockPrisma.publishedDocs.create.mockRejectedValue(uniqueConstraintError);

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );

    expect(result).toEqualLeft(PUBLISHED_DOCS_CREATION_FAILED);
    expect(mockPrisma.publishedDocs.create).toHaveBeenCalledTimes(3);
  });

  test('should not retry on non-P2002 errors', async () => {
    const otherError = new Error('Database connection failed');

    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.publishedDocs.create.mockRejectedValueOnce(otherError);

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );

    expect(result).toEqualLeft(PUBLISHED_DOCS_CREATION_FAILED);
    expect(mockPrisma.publishedDocs.create).toHaveBeenCalledTimes(1);
  });

  test('should store null documentTree when autoSync is true', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce(userPublishedDoc);

    await publishedDocsService.createPublishedDoc(
      { ...createArgs, autoSync: true },
      user,
    );

    expect(mockPrisma.publishedDocs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentTree: null,
        }),
      }),
    );
  });

  test('should fetch and store documentTree when autoSync is false', async () => {
    const collectionData = { folders: [], requests: [] };

    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right(collectionData as any),
    );
    mockPrisma.publishedDocs.create.mockResolvedValueOnce({
      ...userPublishedDoc,
      documentTree: collectionData,
    });

    await publishedDocsService.createPublishedDoc(
      { ...createArgs, autoSync: false },
      user,
    );

    expect(
      mockUserCollectionService.exportUserCollectionToJSONObject,
    ).toHaveBeenCalledWith(user.uid, 'collection_1');
  });
});

describe('createPublishedDoc - environment support', () => {
  const createArgs: CreatePublishedDocsArgs = {
    title: 'New API Documentation',
    version: '1.0.0',
    autoSync: true,
    workspaceType: WorkspaceType.USER,
    workspaceID: user.uid,
    collectionID: 'collection_1',
    metadata: '{}',
  };

  test('should create published doc with environment for user workspace', async () => {
    const envData = {
      id: 'env_1',
      userUid: user.uid,
      name: 'Production',
      variables: [{ key: 'BASE_URL', value: 'https://api.example.com' }],
      isGlobal: false,
    };

    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(envData as any);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce({
      ...userPublishedDoc,
      environmentID: 'env_1',
      environmentName: 'Production',
      environmentVariables: envData.variables,
    });

    const result = await publishedDocsService.createPublishedDoc(
      { ...createArgs, environmentID: 'env_1' },
      user,
    );

    expect(E.isRight(result)).toBe(true);
    expect(mockPrisma.publishedDocs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          environmentID: 'env_1',
          environmentName: 'Production',
          environmentVariables: envData.variables,
        }),
      }),
    );
  });

  test('should create published doc with environment for team workspace', async () => {
    const teamArgs: CreatePublishedDocsArgs = {
      ...createArgs,
      workspaceType: WorkspaceType.TEAM,
      workspaceID: 'team_1',
      collectionID: 'team_collection_1',
      environmentID: 'team_env_1',
    };
    const envData = {
      id: 'team_env_1',
      teamID: 'team_1',
      name: 'Staging',
      variables: [{ key: 'API_KEY', value: 'abc123' }],
    };

    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
      id: 'team_collection_1',
      teamID: 'team_1',
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamEnvironment.findFirst.mockResolvedValueOnce(envData as any);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce({
      ...teamPublishedDoc,
      environmentID: 'team_env_1',
      environmentName: 'Staging',
      environmentVariables: envData.variables,
    });

    const result = await publishedDocsService.createPublishedDoc(
      teamArgs,
      user,
    );

    expect(E.isRight(result)).toBe(true);
    expect(mockPrisma.publishedDocs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          environmentID: 'team_env_1',
          environmentName: 'Staging',
          environmentVariables: envData.variables,
        }),
      }),
    );
  });

  test('should return error when user environment ID is invalid', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.createPublishedDoc(
      { ...createArgs, environmentID: 'invalid_env' },
      user,
    );

    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_ENVIRONMENT);
  });

  test('should return error when team environment ID is invalid', async () => {
    const teamArgs: CreatePublishedDocsArgs = {
      ...createArgs,
      workspaceType: WorkspaceType.TEAM,
      workspaceID: 'team_1',
      collectionID: 'team_collection_1',
      environmentID: 'invalid_env',
    };

    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    mockPrisma.teamCollection.findUnique.mockResolvedValueOnce({
      id: 'team_collection_1',
      teamID: 'team_1',
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teamEnvironment.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.createPublishedDoc(
      teamArgs,
      user,
    );

    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_ENVIRONMENT);
  });

  test('should create published doc without environment when environmentID is not provided', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      id: 'collection_1',
      userUid: user.uid,
    } as any);
    mockPrisma.publishedDocs.findFirst.mockResolvedValueOnce(null);
    mockPrisma.publishedDocs.create.mockResolvedValueOnce(userPublishedDoc);

    const result = await publishedDocsService.createPublishedDoc(
      createArgs,
      user,
    );

    expect(E.isRight(result)).toBe(true);
    expect(mockPrisma.publishedDocs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          environmentID: null,
          environmentName: null,
          environmentVariables: null,
        }),
      }),
    );
  });
});

describe('updatePublishedDoc - environment support', () => {
  test('should update published doc with new environment', async () => {
    const envData = {
      id: 'env_2',
      userUid: user.uid,
      name: 'Staging',
      variables: [{ key: 'API_URL', value: 'https://staging.example.com' }],
      isGlobal: false,
    };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(envData as any);
    mockPrisma.publishedDocs.update.mockResolvedValueOnce({
      ...userPublishedDoc,
      environmentID: 'env_2',
      environmentName: 'Staging',
      environmentVariables: envData.variables,
    });

    const result = await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      { environmentID: 'env_2' },
      user,
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.environmentName).toBe('Staging');
      expect(result.right.environmentVariables).toBe(
        JSON.stringify(envData.variables),
      );
    }
  });

  test('should remove environment when environmentID is set to null', async () => {
    const docWithEnv = {
      ...userPublishedDoc,
      environmentID: 'env_1',
      environmentName: 'Production',
      environmentVariables: [
        { key: 'BASE_URL', value: 'https://api.example.com' },
      ],
    };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(docWithEnv);
    mockPrisma.publishedDocs.update.mockResolvedValueOnce({
      ...docWithEnv,
      environmentID: null,
      environmentName: null,
      environmentVariables: null,
    });

    const result = await publishedDocsService.updatePublishedDoc(
      docWithEnv.id,
      { environmentID: null },
      user,
    );

    expect(E.isRight(result)).toBe(true);
    expect(mockPrisma.publishedDocs.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          environmentID: null,
          environmentName: null,
          environmentVariables: null,
        }),
      }),
    );
  });

  test('should return error when updating with invalid environment ID', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      { environmentID: 'invalid_env' },
      user,
    );

    expect(result).toEqualLeft(PUBLISHED_DOCS_INVALID_ENVIRONMENT);
  });

  test('should not change environment when environmentID is not provided in update args', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockPrisma.publishedDocs.update.mockResolvedValueOnce(userPublishedDoc);

    await publishedDocsService.updatePublishedDoc(
      userPublishedDoc.id,
      { title: 'Updated Title' },
      user,
    );

    expect(mockPrisma.publishedDocs.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          environmentID: undefined,
          environmentName: undefined,
          environmentVariables: undefined,
        }),
      }),
    );
  });

  test('should update environment for team published doc', async () => {
    const envData = {
      id: 'team_env_1',
      teamID: 'team_1',
      name: 'Team Staging',
      variables: [{ key: 'TOKEN', value: 'xyz789' }],
    };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(teamPublishedDoc);
    mockPrisma.team.findFirst.mockResolvedValueOnce({ id: 'team_1' } as any);
    mockPrisma.teamEnvironment.findFirst.mockResolvedValueOnce(envData as any);
    mockPrisma.publishedDocs.update.mockResolvedValueOnce({
      ...teamPublishedDoc,
      environmentID: 'team_env_1',
      environmentName: 'Team Staging',
      environmentVariables: envData.variables,
    });

    const result = await publishedDocsService.updatePublishedDoc(
      teamPublishedDoc.id,
      { environmentID: 'team_env_1' },
      user,
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.environmentName).toBe('Team Staging');
    }
  });
});

describe('getPublishedDocBySlugPublic - environment support', () => {
  test('should re-fetch environment when autoSync is true and environmentID is set', async () => {
    const collectionData = {
      id: 'collection_1',
      name: 'Test Collection',
      folders: [],
      requests: [],
    };
    const envData = {
      id: 'env_1',
      userUid: user.uid,
      name: 'Updated Env Name',
      variables: [{ key: 'BASE_URL', value: 'https://updated.example.com' }],
      isGlobal: false,
    };
    const docWithEnv = {
      ...userPublishedDoc,
      autoSync: true,
      environmentID: 'env_1',
      environmentName: 'Old Env Name',
      environmentVariables: [
        { key: 'BASE_URL', value: 'https://old.example.com' },
      ],
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      docWithEnv,
    ] as any);
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(docWithEnv);
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right(collectionData as any),
    );
    mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(envData as any);

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'slug-collection-1',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.environmentName).toBe('Updated Env Name');
      expect(result.right.environmentVariables).toBe(
        JSON.stringify(envData.variables),
      );
    }
  });

  test('should not re-fetch environment when autoSync is false', async () => {
    const docWithEnv = {
      ...userPublishedDoc,
      autoSync: false,
      environmentID: 'env_1',
      environmentName: 'Production',
      environmentVariables: [
        { key: 'BASE_URL', value: 'https://api.example.com' },
      ],
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      docWithEnv,
    ] as any);
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(docWithEnv);

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'slug-collection-1',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.environmentName).toBe('Production');
      expect(result.right.environmentVariables).toBe(
        JSON.stringify(docWithEnv.environmentVariables),
      );
    }
    // Should not attempt to fetch environment
    expect(mockPrisma.userEnvironment.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.teamEnvironment.findFirst).not.toHaveBeenCalled();
  });

  test('should not re-fetch environment when autoSync is true but no environmentID', async () => {
    const collectionData = {
      id: 'collection_1',
      name: 'Test Collection',
      folders: [],
      requests: [],
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      userPublishedDoc,
    ] as any);
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right(collectionData as any),
    );

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'slug-collection-1',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
    expect(mockPrisma.userEnvironment.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.teamEnvironment.findFirst).not.toHaveBeenCalled();
  });

  test('should fall back to stored environment when re-fetch fails', async () => {
    const collectionData = {
      id: 'collection_1',
      name: 'Test Collection',
      folders: [],
      requests: [],
    };
    const docWithEnv = {
      ...userPublishedDoc,
      autoSync: true,
      environmentID: 'env_deleted',
      environmentName: 'Deleted Env',
      environmentVariables: [{ key: 'OLD', value: 'data' }],
    };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      docWithEnv,
    ] as any);
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(docWithEnv);
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right(collectionData as any),
    );
    // Environment not found — fetchEnvironment returns Left
    mockPrisma.userEnvironment.findFirst.mockResolvedValueOnce(null);

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'slug-collection-1',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      // Falls back to stored values
      expect(result.right.environmentName).toBe('Deleted Env');
      expect(result.right.environmentVariables).toBe(
        JSON.stringify(docWithEnv.environmentVariables),
      );
    }
  });

  test('should return null environment fields when no environment is associated', async () => {
    const storedDocTree = { folders: [], requests: [] };

    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([
      userPublishedDoc,
    ] as any);
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      autoSync: false,
      documentTree: storedDocTree,
    });

    const result = await publishedDocsService.getPublishedDocBySlugPublic(
      'slug-collection-1',
      '1.0.0',
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.environmentName).toBeNull();
      expect(result.right.environmentVariables).toBeNull();
    }
  });
});

describe('cast - environment stringification', () => {
  test('should stringify environmentVariables in cast output', () => {
    const docWithEnv: DBPublishedDocs = {
      ...userPublishedDoc,
      environmentID: 'env_1',
      environmentName: 'Production',
      environmentVariables: [
        { key: 'BASE_URL', value: 'https://api.example.com' },
      ],
    };

    // Access private cast via getPublishedDocByID which calls cast internally
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(docWithEnv);

    return publishedDocsService
      .getPublishedDocByID(docWithEnv.id, user)
      .then((result) => {
        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.environmentName).toBe('Production');
          expect(typeof result.right.environmentVariables).toBe('string');
          expect(result.right.environmentVariables).toBe(
            JSON.stringify([
              { key: 'BASE_URL', value: 'https://api.example.com' },
            ]),
          );
        }
      });
  });

  test('should return null environmentVariables when not set', () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(userPublishedDoc);

    return publishedDocsService
      .getPublishedDocByID(userPublishedDoc.id, user)
      .then((result) => {
        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.environmentName).toBeNull();
          expect(result.right.environmentVariables).toBeNull();
        }
      });
  });
});

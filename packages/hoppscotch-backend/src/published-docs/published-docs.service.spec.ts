import { PublishedDocs as DBPublishedDocs } from 'src/generated/prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';
import {
  PUBLISHED_DOCS_CREATION_FAILED,
  PUBLISHED_DOCS_DELETION_FAILED,
  PUBLISHED_DOCS_INVALID_COLLECTION,
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
import { TreeLevel } from './published-docs.dto';
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
  currentGQLSession: JSON.stringify({}),
  currentRESTSession: JSON.stringify({}),
};

const userPublishedDoc: DBPublishedDocs = {
  id: 'pub_doc_1',
  title: 'User API Documentation',
  version: '1.0.0',
  autoSync: true,
  documentTree: {},
  workspaceType: WorkspaceType.USER,
  workspaceID: user.uid,
  collectionID: 'collection_1',
  creatorUid: user.uid,
  metadata: {},
  createdOn: currentTime,
  updatedOn: currentTime,
};

const userPublishedDocCasted: PublishedDocs = {
  id: userPublishedDoc.id,
  title: userPublishedDoc.title,
  version: userPublishedDoc.version,
  autoSync: userPublishedDoc.autoSync,
  documentTree: JSON.stringify(userPublishedDoc.documentTree),
  workspaceType: userPublishedDoc.workspaceType,
  workspaceID: userPublishedDoc.workspaceID,
  metadata: JSON.stringify(userPublishedDoc.metadata),
  createdOn: userPublishedDoc.createdOn,
  updatedOn: userPublishedDoc.updatedOn,
  url: `${mockConfigService.get('VITE_BASE_URL')}/view/${userPublishedDoc.id}/${userPublishedDoc.version}`,
};

const teamPublishedDoc: DBPublishedDocs = {
  id: 'pub_doc_2',
  title: 'Team API Documentation',
  version: '1.0.0',
  autoSync: true,
  documentTree: {},
  workspaceType: WorkspaceType.TEAM,
  workspaceID: 'team_1',
  collectionID: 'team_collection_1',
  creatorUid: user.uid,
  metadata: {},
  createdOn: currentTime,
  updatedOn: currentTime,
};

const teamPublishedDocCasted: PublishedDocs = {
  id: teamPublishedDoc.id,
  title: teamPublishedDoc.title,
  version: teamPublishedDoc.version,
  autoSync: teamPublishedDoc.autoSync,
  documentTree: JSON.stringify(teamPublishedDoc.documentTree),
  workspaceType: teamPublishedDoc.workspaceType,
  workspaceID: teamPublishedDoc.workspaceID,
  metadata: JSON.stringify(teamPublishedDoc.metadata),
  createdOn: teamPublishedDoc.createdOn,
  updatedOn: teamPublishedDoc.updatedOn,
  url: `${mockConfigService.get('VITE_BASE_URL')}/view/${teamPublishedDoc.id}/${teamPublishedDoc.version}`,
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

    const result = await publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      { skip: 0, take: 10 },
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(userPublishedDocCasted);
  });

  test('should return an empty array when no documents found', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([]);

    const result = await publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      { skip: 0, take: 10 },
    );
    expect(result).toEqual([]);
  });

  test('should return paginated results correctly', async () => {
    const docs = [userPublishedDoc, { ...userPublishedDoc, id: 'pub_doc_3' }];
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([docs[0]]);

    const result = await publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      { skip: 0, take: 1 },
    );
    expect(result).toHaveLength(1);
  });
});

describe('getAllTeamPublishedDocs', () => {
  test('should return a list of team published documents with pagination', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([teamPublishedDoc]);

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

    const result = await publishedDocsService.getAllTeamPublishedDocs(
      'team_1',
      'team_collection_1',
      { skip: 0, take: 10 },
    );
    expect(result).toEqual([]);
  });

  test('should filter by teamID and collectionID correctly', async () => {
    mockPrisma.publishedDocs.findMany.mockResolvedValueOnce([teamPublishedDoc]);

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
    expect(result).toEqualRight(user);
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

describe('getPublishedDocByIDPublic', () => {
  test('should return collection data when autoSync is enabled for user workspace', async () => {
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
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right(collectionData as any),
    );

    const result = await publishedDocsService.getPublishedDocByIDPublic(
      userPublishedDoc.id,
      { tree: TreeLevel.FULL },
    );

    expect(result).toMatchObject(
      E.right({
        ...userPublishedDocCasted,
        documentTree: JSON.stringify(collectionData),
      }),
    );
  });

  test('should return collection data when autoSync is enabled for team workspace', async () => {
    const collectionData = {
      id: 'team_collection_1',
      name: 'Team Test Collection',
      folders: [],
      requests: [],
    };

    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...teamPublishedDoc,
      autoSync: true,
    });
    mockTeamCollectionService.exportCollectionToJSONObject.mockResolvedValueOnce(
      E.right(collectionData as any),
    );

    const result = await publishedDocsService.getPublishedDocByIDPublic(
      teamPublishedDoc.id,
      { tree: TreeLevel.FULL },
    );

    expect(result).toMatchObject(
      E.right({
        ...teamPublishedDocCasted,
        documentTree: JSON.stringify(collectionData),
      }),
    );
  });

  test('should throw PUBLISHED_DOCS_NOT_FOUND when document ID is invalid', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce(null);

    const result = await publishedDocsService.getPublishedDocByIDPublic(
      'invalid_id',
      { tree: TreeLevel.FULL },
    );
    expect(result).toEqualLeft(PUBLISHED_DOCS_NOT_FOUND);
  });

  test('should call exportUserCollectionToJSONObject with correct parameters', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...userPublishedDoc,
      autoSync: true,
    });
    mockUserCollectionService.exportUserCollectionToJSONObject.mockResolvedValueOnce(
      E.right({} as any),
    );

    await publishedDocsService.getPublishedDocByIDPublic(userPublishedDoc.id, {
      tree: TreeLevel.FULL,
    } as any);

    expect(
      mockUserCollectionService.exportUserCollectionToJSONObject,
    ).toHaveBeenCalledWith(user.uid, 'collection_1', true);
  });

  test('should call exportCollectionToJSONObject with correct parameters', async () => {
    mockPrisma.publishedDocs.findUnique.mockResolvedValueOnce({
      ...teamPublishedDoc,
      autoSync: true,
    });
    mockTeamCollectionService.exportCollectionToJSONObject.mockResolvedValueOnce(
      E.right({} as any),
    );

    await publishedDocsService.getPublishedDocByIDPublic(teamPublishedDoc.id, {
      tree: TreeLevel.FULL,
    });

    expect(
      mockTeamCollectionService.exportCollectionToJSONObject,
    ).toHaveBeenCalledWith('team_1', 'team_collection_1', true);
  });
});

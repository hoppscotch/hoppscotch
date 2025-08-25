import { UserCollection as DBUserCollection } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';
import {
  USER_COLL_DEST_SAME,
  USER_COLL_IS_PARENT_COLL,
  USER_COLL_NOT_FOUND,
  USER_COLL_NOT_SAME_TYPE,
  USER_COLL_NOT_SAME_USER,
  USER_COLL_REORDERING_FAILED,
  USER_COLL_SAME_NEXT_COLL,
  USER_COLL_SHORT_TITLE,
  USER_COLL_ALREADY_ROOT,
  USER_NOT_OWNER,
  USER_COLL_DATA_INVALID,
} from 'src/errors';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { AuthUser } from 'src/types/AuthUser';
import { ReqType } from 'src/types/RequestTypes';
import { UserCollectionService } from './user-collection.service';
import { UserCollection } from './user-collections.model';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();

const userCollectionService = new UserCollectionService(mockPrisma, mockPubSub);

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

const rootRESTUserCollection: DBUserCollection = {
  id: '123',
  orderIndex: 1,
  parentID: null,
  title: 'Root Collection 1',
  userUid: user.uid,
  type: ReqType.REST,
  createdOn: currentTime,
  updatedOn: currentTime,
  data: {},
};

const rootRESTUserCollectionCasted: UserCollection = {
  id: '123',
  parentID: null,
  userID: user.uid,
  title: 'Root Collection 1',
  type: ReqType.REST,
  data: JSON.stringify(rootRESTUserCollection.data),
};

const rootGQLUserCollection: DBUserCollection = {
  id: '123',
  orderIndex: 1,
  parentID: null,
  title: 'Root Collection 1',
  userUid: user.uid,
  type: ReqType.GQL,
  createdOn: currentTime,
  updatedOn: currentTime,
  data: {},
};

const rootGQLUserCollectionCasted: UserCollection = {
  id: '123',
  parentID: null,
  title: 'Root Collection 1',
  userID: user.uid,
  type: ReqType.GQL,
  data: JSON.stringify(rootGQLUserCollection.data),
};

const rootRESTUserCollection_2: DBUserCollection = {
  id: '4gf',
  orderIndex: 2,
  parentID: null,
  title: 'Root Collection 2',
  userUid: user.uid,
  type: ReqType.REST,
  createdOn: currentTime,
  updatedOn: currentTime,
  data: {},
};

const childRESTUserCollection: DBUserCollection = {
  id: '234',
  orderIndex: 1,
  parentID: rootRESTUserCollection.id,
  title: 'Child Collection 1',
  userUid: user.uid,
  type: ReqType.REST,
  createdOn: currentTime,
  updatedOn: currentTime,
  data: {},
};

const childRESTUserCollectionCasted: UserCollection = {
  id: '234',
  parentID: rootRESTUserCollection.id,
  title: 'Child Collection 1',
  userID: user.uid,
  type: ReqType.REST,
  data: JSON.stringify({}),
};

const childGQLUserCollection: DBUserCollection = {
  id: '234',
  orderIndex: 1,
  parentID: rootGQLUserCollection.id,
  title: 'Child Collection 1',
  userUid: user.uid,
  type: ReqType.GQL,
  createdOn: currentTime,
  updatedOn: currentTime,
  data: {},
};

const childGQLUserCollectionCasted: UserCollection = {
  id: '234',
  parentID: rootRESTUserCollection.id,
  title: 'Child Collection 1',
  userID: user.uid,
  type: ReqType.GQL,
  data: JSON.stringify({}),
};

const childRESTUserCollection_2: DBUserCollection = {
  id: '0kn',
  orderIndex: 2,
  parentID: rootRESTUserCollection_2.id,
  title: 'Child Collection 2',
  userUid: user.uid,
  type: ReqType.REST,
  createdOn: currentTime,
  updatedOn: currentTime,
  data: {},
};

const childRESTUserCollection_2Casted: UserCollection = {
  id: '0kn',
  parentID: rootRESTUserCollection_2.id,
  title: 'Child Collection 2',
  userID: user.uid,
  type: ReqType.REST,
  data: JSON.stringify({}),
};

const childRESTUserCollectionList: DBUserCollection[] = [
  {
    id: '234',
    orderIndex: 1,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 1',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '345',
    orderIndex: 2,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 2',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '456',
    orderIndex: 3,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 3',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '567',
    orderIndex: 4,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 4',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '678',
    orderIndex: 5,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 5',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
];

const childRESTUserCollectionListCasted: UserCollection[] = [
  {
    id: '234',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 1',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '345',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 2',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '456',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 3',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '567',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 4',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '678',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 5',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
];

const childGQLUserCollectionList: DBUserCollection[] = [
  {
    id: '234',
    orderIndex: 1,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 1',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '345',
    orderIndex: 2,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 2',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '456',
    orderIndex: 3,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 3',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '567',
    orderIndex: 4,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 4',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '678',
    orderIndex: 5,
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 5',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
];

const childGQLUserCollectionListCasted: UserCollection[] = [
  {
    id: '234',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 1',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '345',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 2',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '456',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 3',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '567',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 4',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '678',
    parentID: rootRESTUserCollection.id,
    title: 'Child Collection 5',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
];

const rootRESTUserCollectionList: DBUserCollection[] = [
  {
    id: '123',
    orderIndex: 1,
    parentID: null,
    title: 'Root Collection 1',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '234',
    orderIndex: 2,
    parentID: null,
    title: 'Root Collection 2',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '345',
    orderIndex: 3,
    parentID: null,
    title: 'Root Collection 3',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '456',
    orderIndex: 4,
    parentID: null,
    title: 'Root Collection 4',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '567',
    orderIndex: 5,
    parentID: null,
    title: 'Root Collection 5',
    userUid: user.uid,
    type: ReqType.REST,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
];

const rootRESTUserCollectionListCasted: UserCollection[] = [
  {
    id: '123',
    parentID: null,
    title: 'Root Collection 1',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '234',
    parentID: null,
    title: 'Root Collection 2',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '345',
    parentID: null,
    title: 'Root Collection 3',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '456',
    parentID: null,
    title: 'Root Collection 4',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
  {
    id: '567',
    parentID: null,
    title: 'Root Collection 5',
    userID: user.uid,
    type: ReqType.REST,
    data: JSON.stringify({}),
  },
];

const rootGQLUserCollectionList: DBUserCollection[] = [
  {
    id: '123',
    orderIndex: 1,
    parentID: null,
    title: 'Root Collection 1',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '234',
    orderIndex: 2,
    parentID: null,
    title: 'Root Collection 2',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '345',
    orderIndex: 3,
    parentID: null,
    title: 'Root Collection 3',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '456',
    orderIndex: 4,
    parentID: null,
    title: 'Root Collection 4',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
  {
    id: '567',
    orderIndex: 5,
    parentID: null,
    title: 'Root Collection 5',
    userUid: user.uid,
    type: ReqType.GQL,
    createdOn: currentTime,
    updatedOn: currentTime,
    data: {},
  },
];

const rootGQLUserCollectionListCasted: UserCollection[] = [
  {
    id: '123',
    parentID: null,
    title: 'Root Collection 1',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '234',
    parentID: null,
    title: 'Root Collection 2',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '345',
    parentID: null,
    title: 'Root Collection 3',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '456',
    parentID: null,
    title: 'Root Collection 4',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
  {
    id: '567',
    parentID: null,
    title: 'Root Collection 5',
    userID: user.uid,
    type: ReqType.GQL,
    data: JSON.stringify({}),
  },
];

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('getParentOfUserCollection', () => {
  test('should return a user-collection successfully with valid collectionID', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce({
      ...childRESTUserCollection,
      parent: rootRESTUserCollection,
    } as any);

    const result = await userCollectionService.getParentOfUserCollection(
      childRESTUserCollection.id,
    );
    expect(result).toEqual(rootRESTUserCollectionCasted);
  });
  test('should return null with invalid collectionID', async () => {
    mockPrisma.userCollection.findUnique.mockResolvedValueOnce(
      childRESTUserCollection,
    );

    const result =
      await userCollectionService.getParentOfUserCollection('invalidId');
    //TODO: check it not null
    expect(result).toEqual(null);
  });
});

describe('getChildrenOfUserCollection', () => {
  test('should return a list of paginated child REST user-collections with valid collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce(
      childRESTUserCollectionList,
    );

    const result = await userCollectionService.getChildrenOfUserCollection(
      rootRESTUserCollection.id,
      null,
      10,
      ReqType.REST,
    );
    expect(result).toEqual(childRESTUserCollectionListCasted);
  });
  test('should return a list of paginated child GQL user-collections with valid collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce(
      childGQLUserCollectionList,
    );

    const result = await userCollectionService.getChildrenOfUserCollection(
      rootGQLUserCollection.id,
      null,
      10,
      ReqType.REST,
    );
    expect(result).toEqual(childGQLUserCollectionListCasted);
  });
  test('should return a empty array with a invalid REST collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);

    const result = await userCollectionService.getChildrenOfUserCollection(
      'invalidID',
      null,
      10,
      ReqType.REST,
    );
    expect(result).toEqual([]);
  });
  test('should return a empty array with a invalid GQL collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);

    const result = await userCollectionService.getChildrenOfUserCollection(
      'invalidID',
      null,
      10,
      ReqType.GQL,
    );
    expect(result).toEqual([]);
  });
});

describe('getUserCollection', () => {
  test('should return a user-collection with valid collectionID', async () => {
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    const result = await userCollectionService.getUserCollection(
      rootRESTUserCollection.id,
    );
    expect(result).toEqualRight(rootRESTUserCollection);
  });
  test('should throw USER_COLL_NOT_FOUND when collectionID is invalid', async () => {
    mockPrisma.userCollection.findUniqueOrThrow.mockRejectedValue(
      'NotFoundError',
    );

    const result = await userCollectionService.getUserCollection('123');
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });
});

describe('getUserRootCollections', () => {
  test('should return a list of paginated root REST user-collections with valid collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce(
      rootRESTUserCollectionList,
    );

    const result = await userCollectionService.getUserRootCollections(
      user,
      null,
      10,
      ReqType.REST,
    );
    expect(result).toEqual(rootRESTUserCollectionListCasted);
  });
  test('should return a list of paginated root GQL user-collections with valid collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce(
      rootGQLUserCollectionList,
    );

    const result = await userCollectionService.getUserRootCollections(
      user,
      null,
      10,
      ReqType.GQL,
    );
    expect(result).toEqual(rootGQLUserCollectionListCasted);
  });
  test('should return a empty array with a invalid REST collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);

    const result = await userCollectionService.getUserRootCollections(
      { ...user, uid: 'invalidID' },
      null,
      10,
      ReqType.REST,
    );
    expect(result).toEqual([]);
  });
  test('should return a empty array with a invalid GQL collectionID', async () => {
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);

    const result = await userCollectionService.getUserRootCollections(
      { ...user, uid: 'invalidID' },
      null,
      10,
      ReqType.GQL,
    );
    expect(result).toEqual([]);
  });
});

describe('createUserCollection', () => {
  test('should throw USER_COLL_SHORT_TITLE when title is an empty string', async () => {
    const result = await userCollectionService.createUserCollection(
      user,
      '',
      JSON.stringify(rootRESTUserCollection.data),
      rootRESTUserCollection.id,
      ReqType.REST,
    );
    expect(result).toEqualLeft(USER_COLL_SHORT_TITLE);
  });

  test('should throw USER_NOT_OWNER when user is not the owner of the collection', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(
        E.right({
          ...rootRESTUserCollection,
          userUid: 'other-user-uid',
        }),
      );

    const result = await userCollectionService.createUserCollection(
      user,
      rootRESTUserCollection.title,
      JSON.stringify(rootRESTUserCollection.data),
      rootRESTUserCollection.id,
      ReqType.REST,
    );
    expect(result).toEqualLeft(USER_NOT_OWNER);
  });

  test('should successfully create a new root REST user-collection with valid inputs', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    const result = await userCollectionService.createUserCollection(
      user,
      rootRESTUserCollection.title,
      JSON.stringify(rootRESTUserCollection.data),
      null,
      ReqType.REST,
    );
    expect(result).toEqualRight(rootRESTUserCollectionCasted);
  });

  test('should successfully create a new root GQL user-collection with valid inputs', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      rootGQLUserCollection,
    );

    const result = await userCollectionService.createUserCollection(
      user,
      rootGQLUserCollection.title,
      JSON.stringify(rootGQLUserCollection.data),
      null,
      ReqType.GQL,
    );
    expect(result).toEqualRight(rootGQLUserCollectionCasted);
  });

  test('should successfully create a new child REST user-collection with valid inputs', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootRESTUserCollection));
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      childRESTUserCollection,
    );

    const result = await userCollectionService.createUserCollection(
      user,
      childRESTUserCollection.title,
      JSON.stringify(childRESTUserCollection.data),
      childRESTUserCollection.parentID,
      ReqType.REST,
    );
    expect(result).toEqualRight(childRESTUserCollectionCasted);
  });

  test('should successfully create a new child GQL user-collection with valid inputs', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootGQLUserCollection));
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      childGQLUserCollection,
    );

    const result = await userCollectionService.createUserCollection(
      user,
      childGQLUserCollection.title,
      JSON.stringify(childGQLUserCollection.data),
      childGQLUserCollection.parentID,
      ReqType.GQL,
    );
    expect(result).toEqualRight(childGQLUserCollectionCasted);
  });

  test('should send pubsub message to "user_coll/<userID>/created" if child REST user-collection is created successfully', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootRESTUserCollection));
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      childRESTUserCollection,
    );

    await userCollectionService.createUserCollection(
      user,
      childRESTUserCollection.title,
      JSON.stringify(childRESTUserCollection.data),
      childRESTUserCollection.parentID,
      ReqType.REST,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/created`,
      childRESTUserCollectionCasted,
    );
  });

  test('should send pubsub message to "user_coll/<userID>/created" if child GQL user-collection is created successfully', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootGQLUserCollection));
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      childGQLUserCollection,
    );

    await userCollectionService.createUserCollection(
      user,
      childGQLUserCollection.title,
      JSON.stringify(childGQLUserCollection.data),
      childGQLUserCollection.parentID,
      ReqType.GQL,
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/created`,
      childGQLUserCollectionCasted,
    );
  });

  test('should send pubsub message to "user_coll/<userID>/created" if REST root user-collection is created successfully', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    await userCollectionService.createUserCollection(
      user,
      rootRESTUserCollection.title,
      JSON.stringify(rootRESTUserCollection.data),
      null,
      ReqType.REST,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/created`,
      rootRESTUserCollectionCasted,
    );
  });

  test('should send pubsub message to "user_coll/<userID>/created" if GQL root user-collection is created successfully', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.userCollection.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userCollection.create.mockResolvedValueOnce(
      rootGQLUserCollection,
    );

    await userCollectionService.createUserCollection(
      user,
      rootGQLUserCollection.title,
      JSON.stringify(rootGQLUserCollection.data),
      null,
      ReqType.GQL,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/created`,
      rootGQLUserCollectionCasted,
    );
  });
});

describe('renameUserCollection', () => {
  test('should throw USER_COLL_SHORT_TITLE when title is empty', async () => {
    const result = await userCollectionService.renameUserCollection(
      '',
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_SHORT_TITLE);
  });
  test('should throw USER_NOT_OWNER when user is not the owner of the collection', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findFirstOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await userCollectionService.renameUserCollection(
      'validTitle',
      rootRESTUserCollection.id,
      'op09',
    );
    expect(result).toEqualLeft(USER_NOT_OWNER);
  });
  test('should successfully update a user-collection with valid inputs', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findFirstOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    mockPrisma.userCollection.update.mockResolvedValueOnce({
      ...rootRESTUserCollection,
      title: 'NewTitle',
    });

    const result = await userCollectionService.renameUserCollection(
      'NewTitle',
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualRight({
      ...rootRESTUserCollectionCasted,
      title: 'NewTitle',
    });
  });
  test('should throw USER_COLL_NOT_FOUND when userCollectionID is invalid', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findFirstOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    mockPrisma.userCollection.update.mockRejectedValueOnce('RecordNotFound');

    const result = await userCollectionService.renameUserCollection(
      'NewTitle',
      'invalidID',
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });
  test('should send pubsub message to "user_coll/<userID>/updated" if user-collection title is updated successfully', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findFirstOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    mockPrisma.userCollection.update.mockResolvedValueOnce({
      ...rootRESTUserCollection,
      title: 'NewTitle',
    });

    await userCollectionService.renameUserCollection(
      'NewTitle',
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/updated`,
      {
        ...rootRESTUserCollectionCasted,
        title: 'NewTitle',
      },
    );
  });
});

describe('deleteUserCollection', () => {
  test('should successfully delete a user-collection with valid inputs', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );
    // deleteCollectionData
    // deleteCollectionData --> FindMany query 1st time
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> FindMany query 2nd time
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> DeleteMany query
    mockPrisma.userRequest.deleteMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> updateOrderIndex
    mockPrisma.userCollection.updateMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> removeUserCollection
    mockPrisma.userCollection.delete.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    const result = await userCollectionService.deleteUserCollection(
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualRight(true);
  });
  test('should throw USER_COLL_NOT_FOUND when collectionID is invalid ', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );
    const result = await userCollectionService.deleteUserCollection(
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });
  test('should throw USER_NOT_OWNER when collectionID is invalid ', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );
    const result = await userCollectionService.deleteUserCollection(
      rootRESTUserCollection.id,
      'op09',
    );
    expect(result).toEqualLeft(USER_NOT_OWNER);
  });
  test('should throw USER_COLL_NOT_FOUND when collectionID is invalid when deleting user-collection from UserCollectionTable ', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootRESTUserCollection));
    jest
      .spyOn(userCollectionService as any, 'deleteCollectionData')
      .mockResolvedValueOnce(E.left(USER_COLL_REORDERING_FAILED));

    const result = await userCollectionService.deleteUserCollection(
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_REORDERING_FAILED);
  });
  test('should send pubsub message to "user_coll/<userID>/deleted" if user-collection is deleted successfully', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );
    // deleteCollectionData
    // deleteCollectionData --> FindMany query 1st time
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> FindMany query 2nd time
    mockPrisma.userCollection.findMany.mockResolvedValueOnce([]);
    // deleteCollectionData --> DeleteMany query
    mockPrisma.userRequest.deleteMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> updateOrderIndex
    mockPrisma.userCollection.updateMany.mockResolvedValueOnce({ count: 0 });
    // deleteCollectionData --> removeUserCollection
    mockPrisma.userCollection.delete.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    await userCollectionService.deleteUserCollection(
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/deleted`,
      {
        id: rootRESTUserCollection.id,
        type: rootRESTUserCollection.type,
      },
    );
  });
});

describe('moveUserCollection', () => {
  test('should throw USER_COLL_NOT_FOUND if userCollectionID is invalid', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await userCollectionService.moveUserCollection(
      '234',
      '009',
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });

  test('should throw USER_NOT_OWNER if user is not owner of collection', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    const result = await userCollectionService.moveUserCollection(
      '234',
      '009',
      'op09',
    );
    expect(result).toEqualLeft(USER_NOT_OWNER);
  });

  test('should throw USER_COLL_DEST_SAME if userCollectionID and destCollectionID is the same', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    const result = await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_DEST_SAME);
  });

  test('should throw USER_COLL_NOT_FOUND if destCollectionID is invalid', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );
    // getUserCollection for destCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await userCollectionService.moveUserCollection(
      'invalidID',
      rootRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });

  test('should throw USER_COLL_NOT_SAME_TYPE if userCollectionID and destCollectionID are not the same collection type', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );
    // getUserCollection for destCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childGQLUserCollection,
    );

    const result = await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      childGQLUserCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_SAME_TYPE);
  });

  test('should throw USER_COLL_NOT_SAME_USER if userCollectionID and destCollectionID are not from the same user', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );
    // getUserCollection for destCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce({
      ...childRESTUserCollection_2,
      userUid: 'differentUserUid',
    });

    const result = await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      childRESTUserCollection_2.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_SAME_USER);
  });

  test('should throw USER_COLL_IS_PARENT_COLL if userCollectionID is parent of destCollectionID ', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );
    // getUserCollection for destCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childRESTUserCollection,
    );

    const result = await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      childRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_IS_PARENT_COLL);
  });

  test('should throw USER_COL_ALREADY_ROOT when moving root user-collection to root', async () => {
    // getUserCollection
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    const result = await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      null,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_ALREADY_ROOT);
  });

  test('should successfully move a child user-collection into root', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(childRESTUserCollection));
    jest
      .spyOn(userCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({ ...childRESTUserCollection, parentID: null }),
      );

    const result = await userCollectionService.moveUserCollection(
      childRESTUserCollection.id,
      null,
      user.uid,
    );
    expect(result).toEqualRight({
      ...childRESTUserCollectionCasted,
      parentID: null,
    });
  });

  test('should throw USER_COLL_NOT_FOUND when trying to change parent of collection with invalid collectionID', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(childRESTUserCollection));
    jest
      .spyOn(userCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(E.left(USER_COLL_NOT_FOUND));

    const result = await userCollectionService.moveUserCollection(
      childRESTUserCollection.id,
      null,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });

  test('should send pubsub message to "user_coll/<userID>/moved" when user-collection is moved to root successfully', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(childRESTUserCollection));
    jest
      .spyOn(userCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({ ...childRESTUserCollection, parentID: null }),
      );

    await userCollectionService.moveUserCollection(
      childRESTUserCollection.id,
      null,
      user.uid,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/moved`,
      {
        ...childRESTUserCollectionCasted,
        parentID: null,
      },
    );
  });

  test('should successfully move a root user-collection into a child user-collection', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootRESTUserCollection));
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(childRESTUserCollection_2));
    jest
      .spyOn(userCollectionService as any, 'isParent')
      .mockResolvedValueOnce(O.some(true));
    jest
      .spyOn(userCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({
          ...rootRESTUserCollection,
          parentID: childRESTUserCollection_2.id,
        }),
      );

    const result = await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      childRESTUserCollection_2.id,
      user.uid,
    );
    expect(result).toEqualRight({
      ...rootRESTUserCollectionCasted,
      parentID: childRESTUserCollection_2Casted.id,
    });
  });

  test('should successfully move a child user-collection into another child user-collection', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootRESTUserCollection));
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(childRESTUserCollection_2));
    jest
      .spyOn(userCollectionService as any, 'isParent')
      .mockResolvedValueOnce(O.some(true));
    jest
      .spyOn(userCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({
          ...rootRESTUserCollection,
          parentID: childRESTUserCollection.id,
        }),
      );

    const result = await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      childRESTUserCollection.id,
      user.uid,
    );
    expect(result).toEqualRight({
      ...rootRESTUserCollectionCasted,
      parentID: childRESTUserCollectionCasted.id,
    });
  });

  test('should send pubsub message to "user_coll/<userID>/moved" when user-collection is moved into another child user-collection successfully', async () => {
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(rootRESTUserCollection));
    jest
      .spyOn(userCollectionService, 'getUserCollection')
      .mockResolvedValueOnce(E.right(childRESTUserCollection_2));
    jest
      .spyOn(userCollectionService as any, 'isParent')
      .mockResolvedValueOnce(O.some(true));
    jest
      .spyOn(userCollectionService as any, 'changeParentAndUpdateOrderIndex')
      .mockResolvedValueOnce(
        E.right({
          ...rootRESTUserCollection,
          parentID: childRESTUserCollection.id,
        }),
      );

    await userCollectionService.moveUserCollection(
      rootRESTUserCollection.id,
      childRESTUserCollection.id,
      user.uid,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/moved`,
      {
        ...rootRESTUserCollectionCasted,
        parentID: childRESTUserCollectionCasted.id,
      },
    );
  });
});

describe('updateUserCollectionOrder', () => {
  test('should throw USER_COLL_SAME_NEXT_COLL if collectionID and nextCollectionID are the same', async () => {
    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[0].id,
      childRESTUserCollectionList[0].id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_SAME_NEXT_COLL);
  });

  test('should throw USER_COLL_NOT_FOUND if collectionID is invalid', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      null,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });

  test('should throw USER_NOT_OWNER if userUID is of a different user', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childRESTUserCollectionList[4],
    );

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      null,
      'op09',
    );
    expect(result).toEqualLeft(USER_NOT_OWNER);
  });

  test('should successfully move the child user-collection to the end of the list', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childRESTUserCollectionList[4],
    );
    mockPrisma.userCollection.updateMany.mockResolvedValueOnce({ count: 4 });
    mockPrisma.userCollection.update.mockResolvedValueOnce({
      ...childRESTUserCollectionList[4],
      orderIndex: childRESTUserCollectionList.length,
    });

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      null,
      user.uid,
    );
    expect(result).toEqualRight(true);
  });

  test('should successfully move the root user-collection to the end of the list', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      rootRESTUserCollectionList[4],
    );
    mockPrisma.userCollection.updateMany.mockResolvedValueOnce({ count: 4 });
    mockPrisma.userCollection.update.mockResolvedValueOnce({
      ...rootRESTUserCollectionList[4],
      orderIndex: rootRESTUserCollectionList.length,
    });

    const result = await userCollectionService.updateUserCollectionOrder(
      rootRESTUserCollectionList[4].id,
      null,
      user.uid,
    );
    expect(result).toEqualRight(true);
  });

  test('should throw USER_COLL_REORDERING_FAILED when re-ordering operation failed for child user-collection list', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childRESTUserCollectionList[4],
    );
    mockPrisma.$transaction.mockRejectedValueOnce('RecordNotFound');

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      null,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_REORDERING_FAILED);
  });

  test('should send pubsub message to "user_coll/<userID>/order_updated" when user-collection order is updated successfully', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce(
      childRESTUserCollectionList[4],
    );
    mockPrisma.userCollection.updateMany.mockResolvedValueOnce({ count: 4 });
    mockPrisma.userCollection.update.mockResolvedValueOnce({
      ...childRESTUserCollectionList[4],
      orderIndex: childRESTUserCollectionList.length,
    });

    await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      null,
      user.uid,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/order_updated`,
      {
        userCollection: {
          ...childRESTUserCollectionListCasted[4],
          userID: childRESTUserCollectionListCasted[4].userID,
        },
        nextUserCollection: null,
      },
    );
  });

  test('should throw USER_COLL_NOT_SAME_USER when collectionID and nextCollectionID do not belong to the same user account', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childRESTUserCollectionList[4])
      .mockResolvedValueOnce({
        ...childRESTUserCollection_2,
        userUid: 'differendUID',
      });

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      childRESTUserCollection_2.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_SAME_USER);
  });

  test('should throw USER_COLL_NOT_SAME_TYPE when collectionID and nextCollectionID do not belong to the same collection type', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childRESTUserCollectionList[4])
      .mockResolvedValueOnce({
        ...childRESTUserCollection_2,
        type: ReqType.GQL,
      });

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      childRESTUserCollection_2.id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_SAME_TYPE);
  });

  test('should successfully update the order of the child user-collection list', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childRESTUserCollectionList[4])
      .mockResolvedValueOnce(childRESTUserCollectionList[2]);

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      childRESTUserCollectionList[2].id,
      user.uid,
    );
    expect(result).toEqualRight(true);
  });

  test('should throw USER_COLL_REORDERING_FAILED when re-ordering operation failed for child user-collection list', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childRESTUserCollectionList[4])
      .mockResolvedValueOnce(childRESTUserCollectionList[2]);

    mockPrisma.$transaction.mockRejectedValueOnce('RecordNotFound');

    const result = await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      childRESTUserCollectionList[2].id,
      user.uid,
    );
    expect(result).toEqualLeft(USER_COLL_REORDERING_FAILED);
  });

  test('should send pubsub message to "user_coll/<userID>/order_updated" when user-collection order is updated successfully', async () => {
    // getUserCollection;
    mockPrisma.userCollection.findUniqueOrThrow
      .mockResolvedValueOnce(childRESTUserCollectionList[4])
      .mockResolvedValueOnce(childRESTUserCollectionList[2]);

    await userCollectionService.updateUserCollectionOrder(
      childRESTUserCollectionList[4].id,
      childRESTUserCollectionList[2].id,
      user.uid,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${user.uid}/order_updated`,
      {
        userCollection: {
          ...childRESTUserCollectionListCasted[4],
          userID: childRESTUserCollectionListCasted[4].userID,
        },
        nextUserCollection: {
          ...childRESTUserCollectionListCasted[2],
          userID: childRESTUserCollectionListCasted[2].userID,
        },
      },
    );
  });
});

describe('updateUserCollection', () => {
  test('should throw USER_COLL_DATA_INVALID is collection data is invalid', async () => {
    const result = await userCollectionService.updateUserCollection(
      rootRESTUserCollection.title,
      '{',
      rootRESTUserCollection.id,
      rootRESTUserCollection.userUid,
    );
    expect(result).toEqualLeft(USER_COLL_DATA_INVALID);
  });

  test('should throw USER_COLL_SHORT_TITLE if title is invalid', async () => {
    const result = await userCollectionService.updateUserCollection(
      '',
      JSON.stringify(rootRESTUserCollection.data),
      rootRESTUserCollection.id,
      rootRESTUserCollection.userUid,
    );

    expect(result).toEqualLeft(USER_COLL_SHORT_TITLE);
  });

  test('should throw USER_NOT_OWNER is user is not owner of collection', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findFirstOrThrow.mockRejectedValueOnce(
      'NotFoundError',
    );

    const result = await userCollectionService.updateUserCollection(
      rootRESTUserCollection.title,
      JSON.stringify(rootRESTUserCollection.data),
      rootRESTUserCollection.id,
      rootRESTUserCollection.userUid,
    );

    expect(result).toEqualLeft(USER_NOT_OWNER);
  });

  test('should throw USER_COLL_NOT_FOUND is collectionID is invalid', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce({
      ...rootRESTUserCollection,
    });
    mockPrisma.userCollection.update.mockRejectedValueOnce('RecordNotFound');

    const result = await userCollectionService.updateUserCollection(
      rootRESTUserCollection.title,
      JSON.stringify(rootRESTUserCollection.data),
      'invalid_id',
      rootRESTUserCollection.userUid,
    );
    expect(result).toEqualLeft(USER_COLL_NOT_FOUND);
  });

  test('should successfully update a collection', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce({
      ...rootRESTUserCollection,
    });
    mockPrisma.userCollection.update.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    const result = await userCollectionService.updateUserCollection(
      'new_title',
      JSON.stringify({ foo: 'bar' }),
      rootRESTUserCollection.id,
      rootRESTUserCollection.userUid,
    );

    expect(result).toEqualRight({
      data: JSON.stringify({ foo: 'bar' }),
      title: 'new_title',
      ...rootRESTUserCollectionCasted,
    });
  });

  test('should send pubsub message to "user_coll/<userID>/updated" when UserCollection is updated successfully', async () => {
    // isOwnerCheck
    mockPrisma.userCollection.findUniqueOrThrow.mockResolvedValueOnce({
      ...rootRESTUserCollection,
    });
    mockPrisma.userCollection.update.mockResolvedValueOnce(
      rootRESTUserCollection,
    );

    await userCollectionService.updateUserCollection(
      'new_title',
      JSON.stringify({ foo: 'bar' }),
      rootRESTUserCollection.id,
      rootRESTUserCollection.userUid,
    );

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll/${rootRESTUserCollectionCasted.userID}/updated`,
      {
        data: JSON.stringify({ foo: 'bar' }),
        title: 'new_title',
        ...rootRESTUserCollectionCasted,
      },
    );
  });
});

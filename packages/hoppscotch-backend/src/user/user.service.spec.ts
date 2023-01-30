import { JSON_INVALID } from 'src/errors';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/types/AuthUser';
import { User } from './user.model';
import { UserService } from './user.service';
import { PubSubService } from 'src/pubsub/pubsub.service';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const userService = new UserService(mockPrisma, mockPubSub as any);

const currentTime = new Date();

const user: AuthUser = {
  uid: '123344',
  email: 'dwight@dundermifflin.com',
  displayName: 'Dwight Schrute',
  photoURL: 'https://en.wikipedia.org/wiki/Dwight_Schrute',
  isAdmin: false,
  currentRESTSession: JSON.stringify({}),
  currentGQLSession: JSON.stringify({}),
  refreshToken: 'hbfvdkhjbvkdvdfjvbnkhjb',
  createdOn: currentTime,
};

const exampleSSOProfileData = {
  id: '123rfedvd',
  emails: [{ value: 'dwight@dundermifflin.com' }],
  displayName: 'Dwight Schrute',
  provider: 'google',
  photos: 'https://en.wikipedia.org/wiki/Dwight_Schrute',
};

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('findUserByEmail', () => {
  test('should successfully return a valid user given a valid email', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(user);

    const result = await userService.findUserByEmail(
      'dwight@dundermifflin.com',
    );
    expect(result).toEqualSome(user);
  });

  test('should return a null user given a invalid email', async () => {
    mockPrisma.user.findUniqueOrThrow.mockRejectedValueOnce('NotFoundError');

    const result = await userService.findUserByEmail('jim@dundermifflin.com');
    expect(result).resolves.toBeNone;
  });
});

describe('findUserById', () => {
  test('should successfully return a valid user given a valid user uid', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(user);

    const result = await userService.findUserById('123344');
    expect(result).toEqualSome(user);
  });

  test('should return a null user given a invalid user uid', async () => {
    mockPrisma.user.findUniqueOrThrow.mockRejectedValueOnce('NotFoundError');

    const result = await userService.findUserById('sdcvbdbr');
    expect(result).resolves.toBeNone;
  });
});

describe('createUserViaMagicLink', () => {
  test('should successfully create user and account for magic-link given valid inputs', async () => {
    mockPrisma.user.create.mockResolvedValueOnce(user);

    const result = await userService.createUserViaMagicLink(
      'dwight@dundermifflin.com',
    );
    expect(result).toEqual(user);
  });
});

describe('createUserSSO', () => {
  test('should successfully create user and account for SSO provider given valid inputs  ', async () => {
    mockPrisma.user.create.mockResolvedValueOnce(user);

    const result = await userService.createUserSSO(
      'sdcsdcsdc',
      'dscsdc',
      exampleSSOProfileData,
    );
    expect(result).toEqual(user);
  });

  test('should successfully create user and account for SSO provider given no displayName  ', async () => {
    mockPrisma.user.create.mockResolvedValueOnce({
      ...user,
      displayName: null,
    });

    const result = await userService.createUserSSO('sdcsdcsdc', 'dscsdc', {
      ...exampleSSOProfileData,
      displayName: null,
    });

    expect(result).toEqual({
      ...user,
      displayName: null,
    });
  });

  test('should successfully create user and account for SSO provider given no photoURL  ', async () => {
    mockPrisma.user.create.mockResolvedValueOnce({
      ...user,
      photoURL: null,
    });

    const result = await userService.createUserSSO('sdcsdcsdc', 'dscsdc', {
      ...exampleSSOProfileData,
      photoURL: null,
    });

    expect(result).toEqual({
      ...user,
      photoURL: null,
    });
  });
});

describe('createProviderAccount', () => {
  test('should successfully create ProviderAccount for user given valid inputs ', async () => {
    mockPrisma.account.create.mockResolvedValueOnce({
      id: '123dcdc',
      userId: user.uid,
      provider: exampleSSOProfileData.provider,
      providerAccountId: exampleSSOProfileData.id,
      providerRefreshToken: 'dscsdc',
      providerAccessToken: 'sdcsdcsdc',
      providerScope: 'user.email',
      loggedIn: currentTime,
    });

    const result = await userService.createProviderAccount(
      user,
      'sdcsdcsdc',
      'dscsdc',
      exampleSSOProfileData,
    );
    expect(result).toEqual({
      id: '123dcdc',
      userId: user.uid,
      provider: exampleSSOProfileData.provider,
      providerAccountId: exampleSSOProfileData.id,
      providerRefreshToken: 'dscsdc',
      providerAccessToken: 'sdcsdcsdc',
      providerScope: 'user.email',
      loggedIn: currentTime,
    });
  });

  test('should successfully create ProviderAccount for user given no accessToken ', async () => {
    mockPrisma.account.create.mockResolvedValueOnce({
      id: '123dcdc',
      userId: user.uid,
      provider: exampleSSOProfileData.provider,
      providerAccountId: exampleSSOProfileData.id,
      providerRefreshToken: 'dscsdc',
      providerAccessToken: null,
      providerScope: 'user.email',
      loggedIn: currentTime,
    });

    const result = await userService.createProviderAccount(
      user,
      'sdcsdcsdc',
      'dscsdc',
      exampleSSOProfileData,
    );
    expect(result).toEqual({
      id: '123dcdc',
      userId: user.uid,
      provider: exampleSSOProfileData.provider,
      providerAccountId: exampleSSOProfileData.id,
      providerRefreshToken: 'dscsdc',
      providerAccessToken: null,
      providerScope: 'user.email',
      loggedIn: currentTime,
    });
  });

  test('should successfully create ProviderAccount for user given no refreshToken', async () => {
    mockPrisma.account.create.mockResolvedValueOnce({
      id: '123dcdc',
      userId: user.uid,
      provider: exampleSSOProfileData.provider,
      providerAccountId: exampleSSOProfileData.id,
      providerRefreshToken: null,
      providerAccessToken: 'sdcsdcsdc',
      providerScope: 'user.email',
      loggedIn: currentTime,
    });

    const result = await userService.createProviderAccount(
      user,
      'sdcsdcsdc',
      'dscsdc',
      exampleSSOProfileData,
    );
    expect(result).toEqual({
      id: '123dcdc',
      userId: user.uid,
      provider: exampleSSOProfileData.provider,
      providerAccountId: exampleSSOProfileData.id,
      providerRefreshToken: null,
      providerAccessToken: 'sdcsdcsdc',
      providerScope: 'user.email',
      loggedIn: currentTime,
    });
  });
});

describe('updateUserSessions', () => {
  test('Should resolve right and update users GQL session', async () => {
    const sessionData = user.currentGQLSession;
    mockPrisma.user.update.mockResolvedValue({
      ...user,
      currentGQLSession: JSON.parse(sessionData),
      currentRESTSession: null,
    });

    const result = await userService.updateUserSessions(
      user,
      sessionData,
      'GQL',
    );

    expect(result).toEqualRight({
      ...user,
      currentGQLSession: sessionData,
      currentRESTSession: null,
    });
  });
  test('Should resolve right and update users REST session', async () => {
    const sessionData = user.currentGQLSession;
    mockPrisma.user.update.mockResolvedValue({
      ...user,
      currentGQLSession: null,
      currentRESTSession: JSON.parse(sessionData),
    });

    const result = await userService.updateUserSessions(
      user,
      sessionData,
      'REST',
    );

    expect(result).toEqualRight({
      ...user,
      currentGQLSession: null,
      currentRESTSession: sessionData,
    });
  });
  test('Should reject left and update user for invalid GQL session', async () => {
    const sessionData = 'invalid json';

    const result = await userService.updateUserSessions(
      user,
      sessionData,
      'GQL',
    );

    expect(result).toEqualLeft(JSON_INVALID);
  });
  test('Should reject left and update user for invalid REST session', async () => {
    const sessionData = 'invalid json';

    const result = await userService.updateUserSessions(
      user,
      sessionData,
      'REST',
    );

    expect(result).toEqualLeft(JSON_INVALID);
  });

  test('Should publish pubsub message on user update sessions', async () => {
    mockPrisma.user.update.mockResolvedValue({
      ...user,
      currentGQLSession: JSON.parse(user.currentGQLSession),
      currentRESTSession: JSON.parse(user.currentRESTSession),
    });

    await userService.updateUserSessions(user, user.currentGQLSession, 'GQL');

    expect(mockPubSub.publish).toHaveBeenCalledTimes(1);
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user/${user.uid}/updated`,
      user,
    );
  });
});

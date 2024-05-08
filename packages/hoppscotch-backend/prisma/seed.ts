import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const createUsersAndAccounts = async (
  entries = 10,
  withDedicateUsers: { email: string; isAdmin: boolean }[] = [],
) => {
  const createAUser = async (email?, isAdmin?) => {
    try {
      const newUser = await prisma.user.create({
        data: {
          displayName: faker.person.fullName(),
          email: email ?? faker.internet.email().toLowerCase(),
          photoURL: faker.image.avatar(),
          isAdmin: isAdmin ?? false,
        },
      });

      await prisma.account.create({
        data: {
          userId: newUser.uid,
          provider: 'magic',
          providerAccountId: newUser.email,
        },
      });
    } catch (e) {
      console.log('Error creating user/account:', e.message);
    }
  };

  for (let i = 0; i < withDedicateUsers.length; i++) {
    const user = withDedicateUsers[i];
    await createAUser(user.email.toLowerCase(), user.isAdmin);
  }
  for (let i = 0; i < entries - withDedicateUsers.length; i++) {
    await createAUser();
  }

  console.log('Users created');
};

const createInvitedUsers = async (entries = 10) => {
  try {
    const admin = await prisma.user.findFirst({ where: { isAdmin: true } });

    for (let i = 0; i < entries; i++) {
      await prisma.invitedUsers.create({
        data: {
          adminUid: admin.uid,
          adminEmail: admin.email,
          inviteeEmail: faker.internet.email().toLowerCase(),
        },
      });
    }

    console.log('Invited users created');
  } catch (e) {
    console.log('Error creating invited users:', e.message);
  }
};

const createUserCollections = async (
  parentCollEntries = 10,
  childCollEntriesOnEachParent = 10,
) => {
  const createACollection = async (userUid, parentID, orderIndex) => {
    return prisma.userCollection.create({
      data: {
        parentID,
        title: faker.vehicle.vehicle(),
        orderIndex,
        type: 'REST',
        userUid,
      },
    });
  };

  try {
    const users = await prisma.user.findMany();

    for (let u = 0; u < users.length; u++) {
      const user = users[u];

      for (let i = 0; i < parentCollEntries; i++) {
        const parentCollection = await createACollection(user.uid, null, i + 1);

        for (let j = 0; j < childCollEntriesOnEachParent; j++) {
          await createACollection(user.uid, parentCollection.id, j + 1);
        }
      }
    }

    console.log('User collections created');
  } catch (e) {
    console.log('Error creating user collections:', e.message);
  }
};

const createUserRequests = async (entriesPerCollection = 10) => {
  try {
    const collections = await prisma.userCollection.findMany();

    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];

      for (let j = 0; j < entriesPerCollection; j++) {
        const requestTitle = faker.git.branch();

        await prisma.userRequest.create({
          data: {
            collectionID: collection.id,
            userUid: collection.userUid,
            title: requestTitle,
            request: {
              v: '4',
              auth: { authType: 'inherit', authActive: true },
              body: { body: null, contentType: null },
              name: requestTitle,
              method: 'GET',
              params: [],
              headers: [],
              endpoint: 'https://echo.hoppscotch.io',
              testScript: '',
              preRequestScript: '',
              requestVariables: [],
            },
            type: collection.type,
            orderIndex: j + 1,
          },
        });
      }
    }

    console.log('User requests created');
  } catch (e) {
    console.log('Error creating user requests:', e.message);
  }
};

const createUserEnvironments = async () => {
  try {
    const users = await prisma.user.findMany();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      const environments = await prisma.userEnvironment.findMany({
        where: { userUid: user.uid },
      });
      if (environments.length > 1) continue; // skip if already created. (assuming default GLOBAL environments are created by APP itself)

      await prisma.userEnvironment.createMany({
        data: [
          {
            userUid: user.uid,
            name: 'production',
            variables: [
              {
                key: 'product_id',
                value: faker.number.int({ max: 1000 }),
                secret: false,
              },
            ],
            isGlobal: false,
          },
          {
            userUid: user.uid,
            name: 'development',
            variables: [
              {
                key: 'product_id',
                value: faker.number.int({ max: 1000 }),
                secret: false,
              },
            ],
            isGlobal: false,
          },
        ],
      });
    }

    console.log('User environments created');
  } catch (e) {
    console.log('Error creating user environment:', e.message);
  }
};

const createTeamsAndTeamMembers = async (
  entries = 10,
  memberCountInATeam = 4,
) => {
  const createATeam = async (ownerUid) => {
    return prisma.team.create({
      data: {
        name: faker.airline.airplane().name,
        members: { create: { userUid: ownerUid, role: 'OWNER' } },
      },
    });
  };
  const createATeamMember = async (teamID, userUid) => {
    try {
      return prisma.teamMember.create({
        data: {
          teamID,
          userUid,
          role: +faker.number.binary() === 1 ? 'EDITOR' : 'VIEWER',
        },
      });
    } catch (e) {
      console.log(e.message);
    }
  };

  try {
    const users = await prisma.user.findMany();

    for (let i = 0; i < entries; i++) {
      const ownerIndex = faker.number.int({ min: 0, max: users.length - 1 });
      const team = await createATeam(users[ownerIndex].uid); // create a team with owner

      for (let j = 0; j < Math.min(memberCountInATeam, users.length) - 1; ) {
        const memberIndex = faker.number.int({ min: 0, max: users.length - 1 });

        // check if user already added
        const existingTeamMember = await prisma.teamMember.findFirst({
          where: {
            teamID: team.id,
            userUid: users[memberIndex].uid,
          },
        });
        if (existingTeamMember) continue;

        await createATeamMember(team.id, users[memberIndex].uid);

        j++;
      }
    }

    console.log('Teams and TeamMembers created');
  } catch (e) {
    console.log('Error creating teams and team members:', e.message);
  }
};

const createTeamEnvironments = async () => {
  try {
    const teams = await prisma.team.findMany();

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];

      const environments = await prisma.teamEnvironment.findMany({
        where: { teamID: team.id },
      });
      if (environments.length > 1) continue; // skip if already created. (assuming default GLOBAL environments are created by APP itself)

      await prisma.teamEnvironment.createMany({
        data: [
          {
            teamID: team.id,
            name: 'team_env_production',
            variables: [
              {
                key: 'category_id',
                value: faker.number.int({ max: 1000 }).toString(),
                secret: false,
              },
            ],
          },
          {
            teamID: team.id,
            name: 'team_env_development',
            variables: [
              {
                key: 'category_id',
                value: faker.number.int({ max: 1000 }).toString(),
                secret: false,
              },
            ],
          },
        ],
      });
    }

    console.log('Team environments created');
  } catch (e) {
    console.log('Error creating team environments: ', e.message);
  }
};

const createTeamCollections = async (
  parentCollEntries = 10,
  childCollEntriesOnEachParent = 10,
) => {
  const createACollection = async (teamID, parentID, orderIndex) => {
    return prisma.teamCollection.create({
      data: { parentID, title: faker.vehicle.vehicle(), orderIndex, teamID },
    });
  };

  try {
    const teams = await prisma.team.findMany();

    for (let t = 0; t < teams.length; t++) {
      const team = teams[t];

      for (let i = 0; i < parentCollEntries; i++) {
        const parentCollection = await createACollection(team.id, null, i + 1);

        for (let j = 0; j < childCollEntriesOnEachParent; j++) {
          await createACollection(team.id, parentCollection.id, j + 1);
        }
      }
    }

    console.log('Team collections created');
  } catch (e) {
    console.log('Error creating team collection:', e.message);
  }
};

const createTeamRequests = async (entriesPerCollection = 10) => {
  try {
    const collections = await prisma.teamCollection.findMany();

    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];

      for (let j = 0; j < entriesPerCollection; j++) {
        const requestTitle = faker.git.branch();
        await prisma.teamRequest.create({
          data: {
            collectionID: collection.id,
            teamID: collection.teamID,
            title: requestTitle,
            request: {
              v: '4',
              auth: { authType: 'inherit', authActive: true },
              body: { body: null, contentType: null },
              name: requestTitle,
              method: 'GET',
              params: [],
              headers: [],
              endpoint: 'https://echo.hoppscotch.io',
              testScript: '',
              preRequestScript: '',
              requestVariables: [],
            },
            orderIndex: j + 1,
          },
        });
      }
    }

    console.log('Team requests created');
  } catch (e) {
    console.log('Error creating team requests:', e.message);
  }
};

async function createShortcodes(entriesPerUser = 2) {
  try {
    const users = await prisma.user.findMany();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      for (let j = 0; j < entriesPerUser; j++) {
        const userRequests = await prisma.userRequest.findMany({
          where: { userUid: user.uid },
          take: entriesPerUser,
        });

        let shortCodeRequestObj = {
          v: '4',
          id: userRequests[j].id,
          auth: { authType: 'inherit', authActive: true },
          body: { body: null, contentType: null },
          name: 'driver-hack',
          method: 'GET',
          params: [],
          headers: [],
          endpoint: 'https://echo.hoppscotch.io',
          testScript: '',
          preRequestScript: '',
          requestVariables: [],
        };

        await prisma.shortcode.create({
          data: {
            id: faker.string.alphanumeric(12),
            creatorUid: user.uid,
            request: shortCodeRequestObj,
            embedProperties: null,
          },
        });
      }
    }

    console.log('Shortcodes created');
  } catch (e) {
    console.log('Error creating shortcodes:', e.message);
  }
}

async function clearAllData() {
  try {
    // Get all model names
    const modelNames = Object.keys(prisma).filter(
      (str) => !str.startsWith('_') && !str.startsWith('$'),
    );

    // Iterate through each model and delete all data
    for (let i = 0; i < modelNames.length; i++) {
      await prisma[modelNames[i]].deleteMany({});
    }

    console.log('All data cleared');
  } catch (e) {
    console.log('Error in clearing data:', e.message);
  }
}

(async () => {
  await clearAllData();

  await createUsersAndAccounts(2, [
    { email: 'admin@gmail.com', isAdmin: true },
    { email: 'user@gmail.com', isAdmin: false },
  ]);
  await createInvitedUsers(10);
  // `userSettings` can be created by APP itself
  await createUserCollections(10, 10);
  await createUserRequests(10);
  // `userHistory` can be created by APP itself
  await createUserEnvironments();
  await createShortcodes(3);
  await createTeamsAndTeamMembers(10, 4);
  // `teamInvitation` can be created by APP itself
  await createTeamEnvironments();
  await createTeamCollections(5, 5);
  await createTeamRequests(3);
})();

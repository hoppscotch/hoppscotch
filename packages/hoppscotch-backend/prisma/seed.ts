import { PrismaClient, User, UserSettings } from '@prisma/client';
const prisma = new PrismaClient();

const createUsers = async () => {
  console.log(`Creating new users`);
  const users: User[] = [
    {
      uid: 'aabb22ccdd',
      displayName: 'exampleUser',
      photoURL: 'http://example.com/avatar',
      email: 'me@example.com',
    },
  ];
  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });
  console.log(`users created`);
};

const createUserSettings = async () => {
  console.log(`Creating user settings property`);
  const userSettings: any[] = [
    {
      userUid: 'aabb22ccdd',
      settings: { key: 'background', value: 'system' },
    },
  ];
  await prisma.userSettings.createMany({
    data: userSettings,
    skipDuplicates: true,
  });
  console.log(`user setting created`);
};

async function main() {
  console.log(`Start seeding ...`);

  await createUsers();
  await createUserSettings();

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

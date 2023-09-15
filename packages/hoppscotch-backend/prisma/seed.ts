import { PrismaClient, TeamMemberRole } from '@prisma/client';
const prisma = new PrismaClient();

const noOfUsers = 600000;

const getAllUser = async () => {
  const users = await prisma.user.findMany();
  return users;
};

const createUsers = async () => {
  for (let i = 1; i <= noOfUsers; i++) {
    try {
      await prisma.user.create({
        data: {
          email: `${i}@gmail.com`,
        },
      });
    } catch (_) {}
  }
};

const createTeams = async () => {
  const users = await getAllUser();

  for (let i = 0; i < users.length; i++) {
    try {
      await prisma.team.create({
        data: {
          name: `Team ${i + 1}`,
          members: {
            create: {
              userUid: users[i].uid,
              role: TeamMemberRole.OWNER,
            },
          },
        },
      });
    } catch (_) {}
  }
};

async function main() {
  console.log('Seeding...');

  await createUsers();
  await createTeams();
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

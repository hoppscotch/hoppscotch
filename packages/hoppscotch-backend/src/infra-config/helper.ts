import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Load environment variables from the database and set them in the process
 *
 * @Description Fetch the 'infra_config' table from the database and return it as an object
 * (ConfigModule will set the environment variables in the process)
 */
export async function loadInfraConfiguration() {
  const prisma = new PrismaService();

  const infraConfigs = await prisma.infraConfig.findMany();

  let environmentObject: Record<string, any> = {};
  infraConfigs.forEach((infraConfig) => {
    environmentObject[infraConfig.name] = infraConfig.value;
  });

  return environmentObject;
}

/**
 * Stop the app after 5 seconds
 * (Docker will re-start the app)
 */
export function stopApp() {
  setTimeout(() => {
    process.exit();
  }, 5000);
}

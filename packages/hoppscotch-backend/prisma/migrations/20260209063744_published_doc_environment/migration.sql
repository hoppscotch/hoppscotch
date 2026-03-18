-- AlterTable
ALTER TABLE "PublishedDocs" ADD COLUMN     "environmentID" TEXT,
ADD COLUMN     "environmentName" TEXT,
ADD COLUMN     "environmentVariables" JSONB;

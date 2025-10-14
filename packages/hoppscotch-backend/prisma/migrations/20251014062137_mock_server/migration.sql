-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('USER', 'TEAM');

-- AlterTable
ALTER TABLE "TeamRequest" ADD COLUMN     "mockExample" JSONB;

-- AlterTable
ALTER TABLE "UserRequest" ADD COLUMN     "mockExample" JSONB;

-- CreateTable
CREATE TABLE "MockServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "creatorUid" TEXT NOT NULL,
    "collectionID" TEXT NOT NULL,
    "workspaceType" "WorkspaceType" NOT NULL,
    "workspaceID" TEXT NOT NULL,
    "delayInMs" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MockServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockServer_subdomain_key" ON "MockServer"("subdomain");

-- AddForeignKey
ALTER TABLE "MockServer" ADD CONSTRAINT "MockServer_creatorUid_fkey" FOREIGN KEY ("creatorUid") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

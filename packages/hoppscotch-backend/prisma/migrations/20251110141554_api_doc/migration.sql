-- CreateTable
CREATE TABLE "PublishedDocs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "collectionID" TEXT NOT NULL,
    "creatorUid" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "autoSync" BOOLEAN NOT NULL,
    "documentTree" JSONB,
    "workspaceType" "WorkspaceType" NOT NULL,
    "workspaceID" TEXT NOT NULL,
    "metadata" JSONB,
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PublishedDocs_pkey" PRIMARY KEY ("id")
);

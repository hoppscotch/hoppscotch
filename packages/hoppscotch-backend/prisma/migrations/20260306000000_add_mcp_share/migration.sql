-- CreateTable
CREATE TABLE "McpShare" (
    "id" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "workspaceType" "WorkspaceType" NOT NULL,
    "workspaceID" TEXT NOT NULL,
    "collectionID" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "McpShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpShare_shareToken_key" ON "McpShare"("shareToken");

-- CreateIndex
CREATE INDEX "McpShare_collectionID_idx" ON "McpShare"("collectionID");

-- CreateIndex
CREATE INDEX "McpShare_createdBy_idx" ON "McpShare"("createdBy");

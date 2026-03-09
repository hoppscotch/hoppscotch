-- CreateTable
CREATE TABLE "InfraToken" (
    "id" TEXT NOT NULL,
    "creatorUid" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresOn" TIMESTAMP(3),
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfraToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfraToken_token_key" ON "InfraToken"("token");

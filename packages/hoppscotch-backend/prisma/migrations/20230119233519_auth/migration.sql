-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('OWNER', 'VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL,
    "userUid" TEXT NOT NULL,
    "teamID" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamID" TEXT NOT NULL,
    "creatorUid" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeRole" "TeamMemberRole" NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCollection" (
    "id" TEXT NOT NULL,
    "parentID" TEXT,
    "teamID" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "TeamCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRequest" (
    "id" TEXT NOT NULL,
    "collectionID" TEXT NOT NULL,
    "teamID" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "request" JSONB NOT NULL,

    CONSTRAINT "TeamRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shortcode" (
    "id" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "creatorUid" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shortcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamEnvironment" (
    "id" TEXT NOT NULL,
    "teamID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variables" JSONB NOT NULL,

    CONSTRAINT "TeamEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "uid" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "photoURL" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerRefreshToken" TEXT,
    "providerAccessToken" TEXT,
    "providerScope" TEXT,
    "loggedIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordlessVerification" (
    "deviceIdentifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userUid" TEXT NOT NULL,
    "expiresOn" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamID_userUid_key" ON "TeamMember"("teamID", "userUid");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamID_idx" ON "TeamInvitation"("teamID");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_teamID_inviteeEmail_key" ON "TeamInvitation"("teamID", "inviteeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Shortcode_id_creatorUid_key" ON "Shortcode"("id", "creatorUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordlessVerification_token_key" ON "PasswordlessVerification"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordlessVerification_deviceIdentifier_token_key" ON "PasswordlessVerification"("deviceIdentifier", "token");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCollection" ADD CONSTRAINT "TeamCollection_parentID_fkey" FOREIGN KEY ("parentID") REFERENCES "TeamCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCollection" ADD CONSTRAINT "TeamCollection_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRequest" ADD CONSTRAINT "TeamRequest_collectionID_fkey" FOREIGN KEY ("collectionID") REFERENCES "TeamCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRequest" ADD CONSTRAINT "TeamRequest_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEnvironment" ADD CONSTRAINT "TeamEnvironment_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordlessVerification" ADD CONSTRAINT "PasswordlessVerification_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

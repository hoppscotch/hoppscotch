-- CreateEnum
CREATE TYPE "ReqType" AS ENUM ('REST', 'GQL');

-- CreateTable
CREATE TABLE "UserHistory" (
    "id" TEXT NOT NULL,
    "userUid" TEXT NOT NULL,
    "type" "ReqType" NOT NULL,
    "request" JSONB NOT NULL,
    "responseMetadata" JSONB NOT NULL,
    "isStarred" BOOLEAN NOT NULL,
    "executedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "public"."TeamCollection_title_trgm_idx";

-- DropIndex
DROP INDEX "public"."TeamRequest_title_trgm_idx";

-- CreateTable
CREATE TABLE "public"."MockServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "userUid" TEXT NOT NULL,
    "collectionID" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MockServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockServer_subdomain_key" ON "public"."MockServer"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "MockServer_userUid_collectionID_key" ON "public"."MockServer"("userUid", "collectionID");

-- AddForeignKey
ALTER TABLE "public"."MockServer" ADD CONSTRAINT "MockServer_collectionID_fkey" FOREIGN KEY ("collectionID") REFERENCES "public"."UserCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MockServer" ADD CONSTRAINT "MockServer_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

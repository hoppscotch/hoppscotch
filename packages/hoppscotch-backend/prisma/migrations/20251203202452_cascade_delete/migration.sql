-- DropForeignKey
ALTER TABLE "TeamCollection" DROP CONSTRAINT "TeamCollection_parentID_fkey";

-- DropForeignKey
ALTER TABLE "UserRequest" DROP CONSTRAINT "UserRequest_collectionID_fkey";

-- AddForeignKey
ALTER TABLE "TeamCollection" ADD CONSTRAINT "TeamCollection_parentID_fkey" FOREIGN KEY ("parentID") REFERENCES "TeamCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_collectionID_fkey" FOREIGN KEY ("collectionID") REFERENCES "UserCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

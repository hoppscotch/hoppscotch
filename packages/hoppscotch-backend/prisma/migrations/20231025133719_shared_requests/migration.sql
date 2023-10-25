-- AlterTable
ALTER TABLE "Shortcode" ADD COLUMN     "properties" JSONB;

-- AddForeignKey
ALTER TABLE "Shortcode" ADD CONSTRAINT "Shortcode_creatorUid_fkey" FOREIGN KEY ("creatorUid") REFERENCES "User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Shortcode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedOn` to the `Shortcode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shortcode" ADD COLUMN     "embedProperties" JSONB,
ADD COLUMN     "updatedOn" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Shortcode_id_key" ON "Shortcode"("id");

-- AddForeignKey
ALTER TABLE "Shortcode" ADD CONSTRAINT "Shortcode_creatorUid_fkey" FOREIGN KEY ("creatorUid") REFERENCES "User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

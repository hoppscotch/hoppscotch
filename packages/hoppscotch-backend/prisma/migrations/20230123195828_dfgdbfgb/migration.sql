/*
  Warnings:

  - You are about to drop the column `type` on the `UserHistory` table. All the data in the column will be lost.
  - Added the required column `reqType` to the `UserHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserHistory" DROP COLUMN "type",
ADD COLUMN     "reqType" "ReqType" NOT NULL;

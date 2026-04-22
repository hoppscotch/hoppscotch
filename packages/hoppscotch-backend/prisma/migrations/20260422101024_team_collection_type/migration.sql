-- AlterTable
ALTER TABLE "TeamCollection" ADD COLUMN     "type" "ReqType" NOT NULL DEFAULT 'REST';

-- AlterTable
ALTER TABLE "TeamRequest" ADD COLUMN     "type" "ReqType" NOT NULL DEFAULT 'REST';

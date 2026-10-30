-- private unless someone actually turns it on
-- don't touch rows that are already there
ALTER TABLE "MockServer" ALTER COLUMN "isPublic" SET DEFAULT false;

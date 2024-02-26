-- AlterTable
ALTER TABLE
  "TeamCollection"
ADD
  titleSearch tsvector GENERATED ALWAYS AS (to_tsvector('english', title)) STORED;

-- AlterTable
ALTER TABLE
  "TeamRequest"
ADD
  titleSearch tsvector GENERATED ALWAYS AS (to_tsvector('english', title)) STORED;

-- CreateIndex
CREATE INDEX "TeamCollection_textSearch_idx" ON "TeamCollection" USING GIN (titleSearch);

-- CreateIndex
CREATE INDEX "TeamRequest_textSearch_idx" ON "TeamRequest" USING GIN (titleSearch);

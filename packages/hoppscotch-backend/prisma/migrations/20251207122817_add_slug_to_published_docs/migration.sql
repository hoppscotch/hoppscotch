-- Step 1: Add slug column as nullable first
ALTER TABLE "PublishedDocs" ADD COLUMN "slug" TEXT;

-- Step 2: For backward compatibility, set slug = id for existing records
UPDATE "PublishedDocs" SET "slug" = "id" WHERE "slug" IS NULL;

-- Step 3: Handle duplicates - for multiple published docs with same collection and version
-- Keep the latest one (most recent), delete all older ones
-- delete old duplicates are safe, as multiple published docs with same collection and version is not expected behavior till v2025.11.x
WITH ranked_docs AS (
  SELECT 
    id,
    "collectionID",
    version,
    "createdOn",
    ROW_NUMBER() OVER (PARTITION BY "collectionID", version ORDER BY "createdOn" DESC) as rn
  FROM "PublishedDocs"
)
DELETE FROM "PublishedDocs"
WHERE id IN (
  SELECT id FROM ranked_docs WHERE rn > 1
);

-- Step 4: Now make slug NOT NULL
ALTER TABLE "PublishedDocs" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE INDEX "PublishedDocs_collectionID_idx" ON "PublishedDocs"("collectionID");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedDocs_slug_version_key" ON "PublishedDocs"("slug", "version");

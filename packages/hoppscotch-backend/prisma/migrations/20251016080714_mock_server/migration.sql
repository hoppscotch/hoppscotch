-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('USER', 'TEAM');

-- CreateEnum
CREATE TYPE "MockServerAction" AS ENUM ('CREATED', 'DELETED', 'ACTIVATED', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "MockServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "creatorUid" TEXT,
    "collectionID" TEXT NOT NULL,
    "workspaceType" "WorkspaceType" NOT NULL,
    "workspaceID" TEXT NOT NULL,
    "delayInMs" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMPTZ(3),
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MockServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockServerLog" (
    "id" TEXT NOT NULL,
    "mockServerID" TEXT NOT NULL,
    "requestMethod" TEXT NOT NULL,
    "requestPath" TEXT NOT NULL,
    "requestHeaders" JSONB NOT NULL,
    "requestBody" JSONB,
    "requestQuery" JSONB,
    "responseStatus" INTEGER NOT NULL,
    "responseHeaders" JSONB NOT NULL,
    "responseBody" JSONB,
    "responseTime" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "executedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockServerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockServerActivity" (
    "id" TEXT NOT NULL,
    "mockServerID" TEXT NOT NULL,
    "action" "MockServerAction" NOT NULL,
    "performedBy" TEXT,
    "performedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockServerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockServer_subdomain_key" ON "MockServer"("subdomain");

-- CreateIndex
CREATE INDEX "MockServerLog_mockServerID_idx" ON "MockServerLog"("mockServerID");

-- CreateIndex
CREATE INDEX "MockServerLog_mockServerID_executedAt_idx" ON "MockServerLog"("mockServerID", "executedAt");

-- CreateIndex
CREATE INDEX "MockServerActivity_mockServerID_idx" ON "MockServerActivity"("mockServerID");

-- AddForeignKey
ALTER TABLE "MockServer" ADD CONSTRAINT "MockServer_creatorUid_fkey" FOREIGN KEY ("creatorUid") REFERENCES "User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockServerLog" ADD CONSTRAINT "MockServerLog_mockServerID_fkey" FOREIGN KEY ("mockServerID") REFERENCES "MockServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockServerActivity" ADD CONSTRAINT "MockServerActivity_mockServerID_fkey" FOREIGN KEY ("mockServerID") REFERENCES "MockServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Add mockExamples column to UserRequest
ALTER TABLE "UserRequest" 
ADD COLUMN "mockExamples" JSONB;

-- Add mockExamples column to TeamRequest
ALTER TABLE "TeamRequest" 
ADD COLUMN "mockExamples" JSONB;

-- Create function to sync mock examples
CREATE OR REPLACE FUNCTION sync_mock_examples()
RETURNS TRIGGER AS $$
BEGIN
  NEW."mockExamples" := jsonb_build_object(
    'examples',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'key', key,
            'name', value->>'name',
            'endpoint', value->'originalRequest'->>'endpoint',
            'method', value->'originalRequest'->>'method',
            'headers', COALESCE(value->'originalRequest'->'headers', '[]'::jsonb),
            'statusCode', (value->>'code')::int,
            'statusText', value->>'status',
            'responseBody', value->>'body',
            'responseHeaders', COALESCE(value->'headers', '[]'::jsonb)
          )
        )
        FROM jsonb_each(NEW.request->'responses') AS responses(key, value)
        WHERE jsonb_typeof(NEW.request->'responses') = 'object'
      ),
      '[]'::jsonb
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for UserRequest
CREATE TRIGGER trigger_sync_mock_examples_user_request
BEFORE INSERT OR UPDATE OF request ON "UserRequest"
FOR EACH ROW
EXECUTE FUNCTION sync_mock_examples();

-- Create trigger for TeamRequest
CREATE TRIGGER trigger_sync_mock_examples_team_request
BEFORE INSERT OR UPDATE OF request ON "TeamRequest"
FOR EACH ROW
EXECUTE FUNCTION sync_mock_examples();

-- Backfill existing data for UserRequest
UPDATE "UserRequest" SET request = request WHERE request IS NOT NULL;

-- Backfill existing data for TeamRequest
UPDATE "TeamRequest" SET request = request WHERE request IS NOT NULL;

-- Add GIN indexes
CREATE INDEX "idx_mock_examples_user_requests_gin" ON "UserRequest" USING GIN ("mockExamples");
CREATE INDEX "idx_mock_examples_team_requests_gin" ON "TeamRequest" USING GIN ("mockExamples");
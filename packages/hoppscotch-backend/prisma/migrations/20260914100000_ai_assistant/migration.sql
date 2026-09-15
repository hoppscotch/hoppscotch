-- Tables behind the in-app AI assistant: the providers an admin registers, the
-- instance-wide settings, and the named prompts offered under "/" in the chat.
--
-- Kept out of InfraConfig deliberately. Every InfraConfig read decrypts, so the
-- provider key could never be write-only there, and saving infra config SIGTERMs
-- the backend for every user — these are read on each chat turn and changed
-- without downtime.

-- CreateTable
-- "apiKey" is encrypted with DATA_ENCRYPTION_KEY and is never returned to any
-- client; the GraphQL type exposes only whether one is stored. At most one row
-- has "isDefault" true, which is the connection used when a request names none.
CREATE TABLE "AiProviderConnection" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "preset" TEXT NOT NULL,
    "baseURL" TEXT,
    "apiKey" TEXT NOT NULL,
    "models" TEXT[],
    "defaultModel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AiProviderConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- One row, id 'singleton'. A missing row means the defaults, so there is no
-- seeding step. The nullable override columns are three-state: NULL means
-- "follow the provider preset", which is not the same as false.
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timeoutMs" INTEGER,
    "maxRetries" INTEGER,
    "toolSearch" BOOLEAN,
    "promptCaching" BOOLEAN,
    "reasoningEffort" TEXT,
    "updatedOn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- "slug" is what the user types after "/", so it is unique and URL-safe. A slug
-- matching one of the built-in skills replaces it rather than sitting beside it.
CREATE TABLE "AiSkill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AiSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiProviderConnection_enabled_idx" ON "AiProviderConnection"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AiSkill_slug_key" ON "AiSkill"("slug");

-- CreateIndex
CREATE INDEX "AiSkill_enabled_idx" ON "AiSkill"("enabled");

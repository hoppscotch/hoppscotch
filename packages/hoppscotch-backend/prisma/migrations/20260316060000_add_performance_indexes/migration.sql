-- Add indexes on frequently-queried foreign key columns to avoid full table scans.
-- These indexes cover the most common WHERE, JOIN, and ORDER BY patterns in the codebase.
--
-- WARNING: These CREATE INDEX statements acquire ACCESS EXCLUSIVE locks on their
-- target tables, blocking reads and writes for the duration of index creation.
-- For large tables this can cause noticeable downtime. Consider running this
-- migration during a low-traffic maintenance window, or applying the indexes
-- outside of Prisma's transaction wrapper using CREATE INDEX CONCURRENTLY.

-- TeamMember: queried by userUid when listing teams for a user
CREATE INDEX "TeamMember_userUid_idx" ON "TeamMember"("userUid");

-- TeamRequest: queried by collectionID for listing requests in a collection
CREATE INDEX "TeamRequest_collectionID_idx" ON "TeamRequest"("collectionID");

-- TeamEnvironment: queried by teamID for listing environments in a team
CREATE INDEX "TeamEnvironment_teamID_idx" ON "TeamEnvironment"("teamID");

-- UserHistory: queried by (userUid, reqType) with executedOn ordering
CREATE INDEX "UserHistory_userUid_reqType_executedOn_idx" ON "UserHistory"("userUid", "reqType", "executedOn" DESC);

-- UserEnvironment: queried by userUid for listing user environments
CREATE INDEX "UserEnvironment_userUid_idx" ON "UserEnvironment"("userUid");

-- UserRequest: queried by collectionID for listing requests in a collection
CREATE INDEX "UserRequest_collectionID_idx" ON "UserRequest"("collectionID");

-- PersonalAccessToken: queried by userUid for listing tokens
CREATE INDEX "PersonalAccessToken_userUid_idx" ON "PersonalAccessToken"("userUid");

-- Shortcode: queried by creatorUid for listing user's shortcodes
CREATE INDEX "Shortcode_creatorUid_idx" ON "Shortcode"("creatorUid");

-- MockServer: queried by (workspaceType, workspaceID, deletedAt) for listing mock servers
CREATE INDEX "MockServer_workspaceType_workspaceID_deletedAt_idx" ON "MockServer"("workspaceType", "workspaceID", "deletedAt");

-- MockServer: queried by (creatorUid, deletedAt) for user's mock servers
CREATE INDEX "MockServer_creatorUid_deletedAt_idx" ON "MockServer"("creatorUid", "deletedAt");

-- Account: queried by userId for user's provider accounts
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- VerificationToken: queried by userUid for user's verification tokens
CREATE INDEX "VerificationToken_userUid_idx" ON "VerificationToken"("userUid");

-- User: functional index on LOWER(email) to support case-insensitive email
-- matching in the fetchInvitedUsers NOT EXISTS subquery without full table scans
CREATE INDEX "User_email_lower_idx" ON "User" (LOWER("email"));

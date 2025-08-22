-- Recreate as DEFERRABLE UNIQUE CONSTRAINTS

ALTER TABLE "TeamCollection"
ADD CONSTRAINT "TeamCollection_teamID_parentID_orderIndex_key"
  UNIQUE ("teamID", "parentID", "orderIndex")
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "TeamRequest"
ADD CONSTRAINT "TeamRequest_teamID_collectionID_orderIndex_key"
  UNIQUE ("teamID", "collectionID", "orderIndex")
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "UserCollection"
ADD CONSTRAINT "UserCollection_userUid_parentID_orderIndex_key"
  UNIQUE ("userUid", "parentID", "orderIndex")
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "UserRequest"
ADD CONSTRAINT "UserRequest_userUid_collectionID_orderIndex_key"
  UNIQUE ("userUid", "collectionID", "orderIndex")
  DEFERRABLE INITIALLY DEFERRED;

-- Recalculate orderIndex for UserCollection per (parentID)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "parentID"
      ORDER BY "orderIndex" ASC, "createdOn" ASC, id ASC
    ) AS new_index
  FROM "UserCollection"
)
UPDATE "UserCollection" uc
SET "orderIndex" = o.new_index
FROM ordered o
WHERE uc.id = o.id;

-- Recalculate orderIndex for UserRequest per (collectionID)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "collectionID"
      ORDER BY "orderIndex" ASC, "createdOn" ASC, id ASC
    ) AS new_index
  FROM "UserRequest"
)
UPDATE "UserRequest" ur
SET "orderIndex" = o.new_index
FROM ordered o
WHERE ur.id = o.id;

-- Recalculate orderIndex for TeamCollection per (teamID, parentID)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "teamID", "parentID"
      ORDER BY "orderIndex" ASC, "createdOn" ASC, id ASC
    ) AS new_index
  FROM "TeamCollection"
)
UPDATE "TeamCollection" tc
SET "orderIndex" = o.new_index
FROM ordered o
WHERE tc.id = o.id;

-- Recalculate orderIndex for TeamRequest per (teamID, collectionID)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "teamID", "collectionID"
      ORDER BY "orderIndex" ASC, "createdOn" ASC, id ASC
    ) AS new_index
  FROM "TeamRequest"
)
UPDATE "TeamRequest" tr
SET "orderIndex" = o.new_index
FROM ordered o
WHERE tr.id = o.id;

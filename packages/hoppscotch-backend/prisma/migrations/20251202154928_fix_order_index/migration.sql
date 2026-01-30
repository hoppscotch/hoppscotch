-- Recalculate orderIndex for UserCollection per (parentID)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userUid", "parentID"
      ORDER BY "orderIndex" ASC, "createdOn" ASC, id ASC
    ) AS new_index
  FROM "UserCollection"
)
UPDATE "UserCollection" uc
SET "orderIndex" = o.new_index
FROM ordered o
WHERE uc.id = o.id;

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


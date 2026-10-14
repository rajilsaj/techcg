-- AlterTable
ALTER TABLE "Item" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Item_viewCount_idx" ON "Item"("viewCount");
CREATE INDEX "Item_commentCount_idx" ON "Item"("commentCount");

-- Backfill: distinct visitors (not bots) who already viewed each publication page.
UPDATE "Item" i SET "viewCount" = v.n
FROM (
  SELECT CAST(substring(path FROM 14) AS INTEGER) AS id, count(DISTINCT "visitorId") AS n
  FROM "PageView"
  WHERE path ~ '^/publication/[0-9]{1,9}$' AND "isBot" = false
  GROUP BY 1
) v
WHERE i.id = v.id;

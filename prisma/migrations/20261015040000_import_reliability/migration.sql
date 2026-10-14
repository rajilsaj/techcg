-- Importer reliability: conditional requests, browser rendering, failure tracking.
ALTER TABLE "ImportSource" ADD COLUMN "render" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ImportSource" ADD COLUMN "etag" TEXT;
ALTER TABLE "ImportSource" ADD COLUMN "lastModified" TEXT;
ALTER TABLE "ImportSource" ADD COLUMN "failCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ImportSource" ADD COLUMN "failingSince" TIMESTAMP(3);

-- One import of a source at a time (claimed while it runs).
ALTER TABLE "ImportSource" ADD COLUMN "importingSince" TIMESTAMP(3);

-- Duplicates: one key per article address (filled by the app, backfilled by a script).
ALTER TABLE "Item" ADD COLUMN "urlKey" TEXT;
CREATE INDEX "Item_urlKey_idx" ON "Item"("urlKey");

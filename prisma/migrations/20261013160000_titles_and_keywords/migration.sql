-- French titles (original kept for search) and article keywords for topic tags.
ALTER TABLE "Item" ADD COLUMN "titleLang" TEXT;
ALTER TABLE "Item" ADD COLUMN "originalTitle" TEXT;
ALTER TABLE "Item" ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

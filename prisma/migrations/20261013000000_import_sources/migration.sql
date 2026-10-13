-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "importSourceId" INTEGER;

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxItems" INTEGER NOT NULL DEFAULT 20,
    "categoryId" INTEGER,
    "lastRunAt" TIMESTAMP(3),
    "lastResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_importSourceId_idx" ON "Item"("importSourceId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- First source, as requested.
INSERT INTO "ImportSource" ("name", "url") VALUES ('Developpez.com', 'https://www.developpez.com/');

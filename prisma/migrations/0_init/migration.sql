-- CreateTable User
CREATE TABLE "User" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "about" TEXT,
    "karma" INTEGER NOT NULL DEFAULT 0,
    "shadowBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable Item
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "text" TEXT,
    "authorId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "path" TEXT NOT NULL DEFAULT '',
    "depth" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,
    "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rankedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Item_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "Item_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Item" ("id") ON DELETE CASCADE
);

-- CreateTable Vote
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "Vote_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE
);

-- CreateIndex on User
CREATE INDEX "User_karma_idx" ON "User"("karma");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex on Item
CREATE INDEX "Item_type_createdAt_idx" ON "Item"("type", "createdAt");
CREATE INDEX "Item_parentId_idx" ON "Item"("parentId");
CREATE INDEX "Item_rankScore_idx" ON "Item"("rankScore");
CREATE INDEX "Item_authorId_idx" ON "Item"("authorId");
CREATE INDEX "Item_deleted_idx" ON "Item"("deleted");

-- CreateIndex on Vote (unique constraint)
CREATE UNIQUE INDEX "Vote_userId_itemId_key" ON "Vote"("userId", "itemId");
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");
CREATE INDEX "Vote_itemId_idx" ON "Vote"("itemId");

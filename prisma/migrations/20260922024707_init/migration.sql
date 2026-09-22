-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "about" TEXT,
    "karma" INTEGER NOT NULL DEFAULT 0,
    "shadowBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
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

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_karma_idx" ON "User"("karma");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Item_type_createdAt_idx" ON "Item"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Item_parentId_idx" ON "Item"("parentId");

-- CreateIndex
CREATE INDEX "Item_rankScore_idx" ON "Item"("rankScore");

-- CreateIndex
CREATE INDEX "Item_authorId_idx" ON "Item"("authorId");

-- CreateIndex
CREATE INDEX "Item_deleted_idx" ON "Item"("deleted");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE INDEX "Vote_itemId_idx" ON "Vote"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_itemId_key" ON "Vote"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "excerptLang" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "previewAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HiddenItem" (
    "userId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenItem_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateIndex
CREATE INDEX "HiddenItem_itemId_idx" ON "HiddenItem"("itemId");

-- AddForeignKey
ALTER TABLE "HiddenItem" ADD CONSTRAINT "HiddenItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenItem" ADD CONSTRAINT "HiddenItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "PageView" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "userAgent" TEXT NOT NULL,
    "browser" TEXT,
    "browserVer" TEXT,
    "os" TEXT,
    "osVer" TEXT,
    "device" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "screen" TEXT,
    "language" TEXT,
    "clientTz" TEXT,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" INTEGER,
    "durationMs" INTEGER,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_ip_createdAt_idx" ON "PageView"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_visitorId_idx" ON "PageView"("visitorId");

-- CreateIndex
CREATE INDEX "PageView_sessionId_idx" ON "PageView"("sessionId");


-- Keep it away from Supabase's public REST API, like every other table.
ALTER TABLE "PageView" ENABLE ROW LEVEL SECURITY;

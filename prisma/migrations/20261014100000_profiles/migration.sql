-- Profiles.CG: directory of Congolese tech profiles, curated in the admin.
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "organization" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CG',
    "photoUrl" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profile_slug_key" ON "Profile"("slug");
CREATE INDEX "Profile_published_name_idx" ON "Profile"("published", "name");

-- Same lock-down as every other table: no access through Supabase's public API.
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

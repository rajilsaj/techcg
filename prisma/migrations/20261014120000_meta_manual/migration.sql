-- Meta tags (Startups, Entrepreneurs, Tech, Événements) and region chosen by an admin:
-- automatic detection leaves them alone.
ALTER TABLE "Item" ADD COLUMN "metaManual" BOOLEAN NOT NULL DEFAULT false;

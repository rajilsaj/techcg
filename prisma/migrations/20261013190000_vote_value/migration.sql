-- Up/down votes: +1 or -1. Existing votes are upvotes.
ALTER TABLE "Vote" ADD COLUMN "value" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sets" ADD COLUMN "isOngoing" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "sets_userId_isOngoing_idx" ON "sets"("userId", "isOngoing");


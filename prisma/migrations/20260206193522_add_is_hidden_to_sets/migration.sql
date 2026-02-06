-- AlterTable
ALTER TABLE "sets" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cached_sets" (
    "setNum" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cached_sets_pkey" PRIMARY KEY ("setNum")
);

-- CreateTable
CREATE TABLE "cached_inventories" (
    "setNum" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "minifigs" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cached_inventories_pkey" PRIMARY KEY ("setNum")
);

-- CreateIndex
CREATE INDEX "cached_sets_fetchedAt_idx" ON "cached_sets"("fetchedAt");

-- CreateIndex
CREATE INDEX "cached_inventories_fetchedAt_idx" ON "cached_inventories"("fetchedAt");

-- CreateIndex
CREATE INDEX "sets_userId_isHidden_idx" ON "sets"("userId", "isHidden");

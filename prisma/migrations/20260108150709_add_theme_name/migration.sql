-- AlterTable
ALTER TABLE "sets" ADD COLUMN     "themeName" TEXT;

-- CreateIndex
CREATE INDEX "sets_userId_themeId_idx" ON "sets"("userId", "themeId");

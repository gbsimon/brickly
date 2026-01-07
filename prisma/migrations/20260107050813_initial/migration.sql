-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets" (
    "userId" TEXT NOT NULL,
    "setNum" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "numParts" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "themeId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("userId","setNum")
);

-- CreateTable
CREATE TABLE "inventories" (
    "userId" TEXT NOT NULL,
    "setNum" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("userId","setNum")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setNum" TEXT NOT NULL,
    "partNum" TEXT NOT NULL,
    "colorId" INTEGER NOT NULL,
    "isSpare" BOOLEAN NOT NULL DEFAULT false,
    "neededQty" INTEGER NOT NULL,
    "foundQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sets_userId_idx" ON "sets"("userId");

-- CreateIndex
CREATE INDEX "sets_userId_lastOpenedAt_idx" ON "sets"("userId", "lastOpenedAt");

-- CreateIndex
CREATE INDEX "progress_userId_setNum_idx" ON "progress"("userId", "setNum");

-- CreateIndex
CREATE UNIQUE INDEX "progress_userId_setNum_partNum_colorId_isSpare_key" ON "progress"("userId", "setNum", "partNum", "colorId", "isSpare");

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_userId_setNum_fkey" FOREIGN KEY ("userId", "setNum") REFERENCES "sets"("userId", "setNum") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_userId_setNum_fkey" FOREIGN KEY ("userId", "setNum") REFERENCES "sets"("userId", "setNum") ON DELETE CASCADE ON UPDATE CASCADE;

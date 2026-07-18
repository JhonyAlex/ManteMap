-- CreateTable: Inspections
CREATE TABLE "inspections" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "statusId" TEXT,
  "notes" TEXT,
  "photoPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: itemId lookup
CREATE INDEX "inspections_itemId_idx"
  ON "inspections"("itemId");

-- CreateIndex: userId lookup
CREATE INDEX "inspections_userId_idx"
  ON "inspections"("userId");

-- AddForeignKey: itemId → items
ALTER TABLE "inspections"
  ADD CONSTRAINT "inspections_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: userId → users
ALTER TABLE "inspections"
  ADD CONSTRAINT "inspections_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

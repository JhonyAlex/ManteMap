-- CreateTable: Item QR codes
CREATE TABLE "item_qr_codes" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "storagePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "item_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique per item
CREATE UNIQUE INDEX "item_qr_codes_itemId_key"
  ON "item_qr_codes"("itemId");

-- AddForeignKey
ALTER TABLE "item_qr_codes"
  ADD CONSTRAINT "item_qr_codes_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add layer column to location_markers
ALTER TABLE "location_markers"
  ADD COLUMN "layer" TEXT;

-- AlterTable: Add polygon fields to LocationMarker
ALTER TABLE "location_markers"
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'POINT',
  ADD COLUMN "points" JSONB,
  ADD COLUMN "fillColor" TEXT,
  ADD COLUMN "strokeColor" TEXT,
  ADD COLUMN "strokeWidth" DOUBLE PRECISION NOT NULL DEFAULT 2;

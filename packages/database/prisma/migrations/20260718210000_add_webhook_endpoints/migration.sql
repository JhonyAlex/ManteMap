-- CreateTable: Webhook endpoints
CREATE TABLE "webhook_endpoints" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT,
  "eventTypes" TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "retryCount" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: projectId lookup
CREATE INDEX "webhook_endpoints_projectId_idx"
  ON "webhook_endpoints"("projectId");

-- AddForeignKey
ALTER TABLE "webhook_endpoints"
  ADD CONSTRAINT "webhook_endpoints_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

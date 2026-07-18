-- AlterTable: Add channel boolean columns to notification_preferences
ALTER TABLE "notification_preferences"
  ADD COLUMN "email" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "slack" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "teams" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "telegram" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: User channel configurations (Slack, Teams, Telegram)
CREATE TABLE "user_channel_configs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelType" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique per user per channel type
CREATE UNIQUE INDEX "user_channel_configs_userId_channelType_key"
  ON "user_channel_configs"("userId", "channelType");

-- AddForeignKey
ALTER TABLE "user_channel_configs"
  ADD CONSTRAINT "user_channel_configs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Notification delivery audit log
CREATE TABLE "notification_deliveries" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_deliveries_alertId_idx" ON "notification_deliveries"("alertId");
CREATE INDEX "notification_deliveries_userId_idx" ON "notification_deliveries"("userId");
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

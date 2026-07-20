-- Project scheduling defaults keep the migration additive for existing projects.
ALTER TABLE "projects"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
  ADD COLUMN "maintenanceGenerationHorizonDays" INTEGER NOT NULL DEFAULT 90,
  ADD CONSTRAINT "projects_maintenanceGenerationHorizonDays_check"
    CHECK ("maintenanceGenerationHorizonDays" BETWEEN 30 AND 365);

-- The IANA registry is external to PostgreSQL; application validation owns its validity.
CREATE TYPE "MaintenanceScheduleKind" AS ENUM ('FIXED', 'RRULE');
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenanceGenerationTrigger" AS ENUM ('HOURLY', 'BACKFILL', 'DISCARD', 'REGENERATION');
CREATE TYPE "MaintenanceGenerationStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');
CREATE TYPE "WorkOrderActivityAction" AS ENUM ('CREATED', 'STARTED', 'COMPLETED', 'CANCELLED', 'REPROGRAMMED', 'BACKFILLED', 'DISCARDED');

CREATE TABLE "maintenance_plans" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "generationCursor" TIMESTAMPTZ,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenance_plans_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "maintenance_plan_revisions" (
  "id" TEXT NOT NULL,
  "maintenancePlanId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMPTZ NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "scheduleKind" "MaintenanceScheduleKind" NOT NULL,
  "scheduledAt" TIMESTAMPTZ,
  "startsAt" TIMESTAMPTZ,
  "rrule" TEXT,
  "dueOffsetMinutes" INTEGER,
  "assigneeId" TEXT,
  "definition" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_plan_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_plan_revisions_schedule_kind_check" CHECK (
    ("scheduleKind" = 'FIXED' AND "scheduledAt" IS NOT NULL AND "startsAt" IS NULL AND "rrule" IS NULL)
    OR ("scheduleKind" = 'RRULE' AND "scheduledAt" IS NULL AND "startsAt" IS NOT NULL AND "rrule" IS NOT NULL)
  ),
  CONSTRAINT "maintenance_plan_revisions_due_offset_check" CHECK ("dueOffsetMinutes" IS NULL OR "dueOffsetMinutes" >= 0),
  CONSTRAINT "maintenance_plan_revisions_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "maintenance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenance_plan_revisions_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "maintenance_plan_checklist_items" (
  "id" TEXT NOT NULL,
  "maintenancePlanRevisionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_plan_checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_plan_checklist_items_revisionId_fkey" FOREIGN KEY ("maintenancePlanRevisionId") REFERENCES "maintenance_plan_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "work_orders" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "maintenancePlanId" TEXT NOT NULL,
  "maintenancePlanRevisionId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "occurrenceKey" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "definitionSnapshot" JSONB,
  "scheduledAt" TIMESTAMPTZ NOT NULL,
  "dueAt" TIMESTAMPTZ,
  "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_orders_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "maintenance_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_orders_maintenancePlanRevisionId_fkey" FOREIGN KEY ("maintenancePlanRevisionId") REFERENCES "maintenance_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_orders_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_orders_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "work_order_checklist_items" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "sourceChecklistItemId" TEXT,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMPTZ,
  "completedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_order_checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_checklist_items_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_order_checklist_items_sourceChecklistItemId_fkey" FOREIGN KEY ("sourceChecklistItemId") REFERENCES "maintenance_plan_checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "work_order_checklist_items_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "maintenance_generation_runs" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "maintenancePlanId" TEXT,
  "trigger" "MaintenanceGenerationTrigger" NOT NULL,
  "actorId" TEXT,
  "windowStart" TIMESTAMPTZ NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  "status" "MaintenanceGenerationStatus" NOT NULL DEFAULT 'STARTED',
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "cancelledCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "details" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ,
  CONSTRAINT "maintenance_generation_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_generation_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenance_generation_runs_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "maintenance_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "maintenance_generation_runs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "work_order_activities" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" "WorkOrderActivityAction" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_activities_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_order_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "maintenance_plan_revisions_maintenancePlanId_effectiveFrom_key" ON "maintenance_plan_revisions"("maintenancePlanId", "effectiveFrom");
CREATE INDEX "maintenance_plan_revisions_assigneeId_idx" ON "maintenance_plan_revisions"("assigneeId");
CREATE INDEX "maintenance_plans_projectId_active_idx" ON "maintenance_plans"("projectId", "active");
CREATE INDEX "maintenance_plans_itemId_idx" ON "maintenance_plans"("itemId");
CREATE UNIQUE INDEX "maintenance_plan_checklist_items_revisionId_position_key" ON "maintenance_plan_checklist_items"("maintenancePlanRevisionId", "position");
CREATE UNIQUE INDEX "work_orders_maintenancePlanId_occurrenceKey_key" ON "work_orders"("maintenancePlanId", "occurrenceKey");
CREATE INDEX "work_orders_projectId_status_scheduledAt_idx" ON "work_orders"("projectId", "status", "scheduledAt");
CREATE INDEX "work_orders_projectId_dueAt_idx" ON "work_orders"("projectId", "dueAt");
CREATE INDEX "work_orders_itemId_idx" ON "work_orders"("itemId");
CREATE INDEX "work_orders_assigneeId_idx" ON "work_orders"("assigneeId");
CREATE UNIQUE INDEX "work_order_checklist_items_workOrderId_position_key" ON "work_order_checklist_items"("workOrderId", "position");
CREATE INDEX "maintenance_generation_runs_projectId_startedAt_idx" ON "maintenance_generation_runs"("projectId", "startedAt");
CREATE INDEX "maintenance_generation_runs_maintenancePlanId_startedAt_idx" ON "maintenance_generation_runs"("maintenancePlanId", "startedAt");
CREATE INDEX "work_order_activities_workOrderId_createdAt_idx" ON "work_order_activities"("workOrderId", "createdAt");

-- Enforce the final data-integrity boundary after the service-level transaction guard.
CREATE UNIQUE INDEX "location_markers_floor_plan_id_item_id_not_null_key"
  ON "location_markers"("floorPlanId", "itemId")
  WHERE "itemId" IS NOT NULL;

CREATE FUNCTION "validate_maintenance_plan_item_scope"() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "items" item
    JOIN "item_types" item_type ON item_type."id" = item."itemTypeId"
    WHERE item."id" = NEW."itemId" AND item_type."projectId" = NEW."projectId"
  ) THEN
    RAISE EXCEPTION 'Maintenance plan item must belong to its project';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "maintenance_plans_item_project_scope"
  BEFORE INSERT OR UPDATE OF "projectId", "itemId" ON "maintenance_plans"
  FOR EACH ROW EXECUTE FUNCTION "validate_maintenance_plan_item_scope"();

CREATE FUNCTION "validate_work_order_scope"() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "maintenance_plans" plan
    JOIN "maintenance_plan_revisions" revision ON revision."id" = NEW."maintenancePlanRevisionId" AND revision."maintenancePlanId" = plan."id"
    WHERE plan."id" = NEW."maintenancePlanId"
      AND plan."projectId" = NEW."projectId"
      AND plan."itemId" = NEW."itemId"
  ) THEN
    RAISE EXCEPTION 'Work order must use the project, item, and revision of its maintenance plan';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "work_orders_plan_scope"
  BEFORE INSERT OR UPDATE OF "projectId", "maintenancePlanId", "maintenancePlanRevisionId", "itemId" ON "work_orders"
  FOR EACH ROW EXECUTE FUNCTION "validate_work_order_scope"();

CREATE FUNCTION "reject_maintenance_plan_revision_mutation"() RETURNS TRIGGER AS $$
BEGIN
  -- ON DELETE SET NULL is an explicit lifecycle policy for an optional assignee.
  -- Permit only that referential action after its user row has been deleted.
  IF OLD."assigneeId" IS NOT NULL
    AND NEW."assigneeId" IS NULL
    AND NEW."maintenancePlanId" IS NOT DISTINCT FROM OLD."maintenancePlanId"
    AND NEW."effectiveFrom" IS NOT DISTINCT FROM OLD."effectiveFrom"
    AND NEW."title" IS NOT DISTINCT FROM OLD."title"
    AND NEW."description" IS NOT DISTINCT FROM OLD."description"
    AND NEW."scheduleKind" IS NOT DISTINCT FROM OLD."scheduleKind"
    AND NEW."scheduledAt" IS NOT DISTINCT FROM OLD."scheduledAt"
    AND NEW."startsAt" IS NOT DISTINCT FROM OLD."startsAt"
    AND NEW."rrule" IS NOT DISTINCT FROM OLD."rrule"
    AND NEW."dueOffsetMinutes" IS NOT DISTINCT FROM OLD."dueOffsetMinutes"
    AND NEW."definition" IS NOT DISTINCT FROM OLD."definition"
    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
    AND NOT EXISTS (SELECT 1 FROM "users" WHERE "id" = OLD."assigneeId")
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Maintenance plan revisions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "maintenance_plan_revisions_immutable"
  BEFORE UPDATE ON "maintenance_plan_revisions"
  FOR EACH ROW EXECUTE FUNCTION "reject_maintenance_plan_revision_mutation"();

CREATE FUNCTION "reject_maintenance_plan_checklist_mutation"() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Maintenance plan revision checklist items are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "maintenance_plan_checklist_items_immutable"
  BEFORE UPDATE ON "maintenance_plan_checklist_items"
  FOR EACH ROW EXECUTE FUNCTION "reject_maintenance_plan_checklist_mutation"();

CREATE FUNCTION "reject_completed_work_order_mutation"() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'COMPLETED' THEN
    RAISE EXCEPTION 'Completed work orders are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "work_orders_completed_immutable"
  BEFORE UPDATE OR DELETE ON "work_orders"
  FOR EACH ROW EXECUTE FUNCTION "reject_completed_work_order_mutation"();

CREATE FUNCTION "reject_completed_work_order_checklist_mutation"() RETURNS TRIGGER AS $$
DECLARE
  target_work_order_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_work_order_id := OLD."workOrderId";
  ELSE
    target_work_order_id := NEW."workOrderId";
  END IF;

  IF EXISTS (SELECT 1 FROM "work_orders" WHERE "id" = target_work_order_id AND "status" = 'COMPLETED') THEN
    RAISE EXCEPTION 'Completed work order checklist items are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "work_order_checklist_items_completed_immutable"
  BEFORE INSERT OR UPDATE OR DELETE ON "work_order_checklist_items"
  FOR EACH ROW EXECUTE FUNCTION "reject_completed_work_order_checklist_mutation"();

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;

describeDatabase('maintenance model migration (PostgreSQL)', () => {
  beforeAll(async () => {
    await prisma!.$connect();
  });

  afterAll(async () => {
    await prisma!.$disconnect();
  });

  it('enforces occurrence uniqueness and completed work-order immutability', async () => {
    const suffix = crypto.randomUUID().replaceAll('-', '');
    const user = await prisma!.user.create({ data: { email: `${suffix}@example.test` } });
    const project = await prisma!.project.create({
      data: { code: `M${suffix.slice(0, 12)}`, name: 'Migration test', ownerId: user.id },
    });
    expect(project.timezone).toBe('Europe/Madrid');
    expect(project.maintenanceGenerationHorizonDays).toBe(90);
    await expect(prisma!.$executeRaw`
      UPDATE "projects" SET "maintenanceGenerationHorizonDays" = 29 WHERE "id" = ${project.id}
    `).rejects.toThrow();
    const itemType = await prisma!.itemType.create({
      data: { projectId: project.id, name: 'Type', slug: `type-${suffix}` },
    });
    const item = await prisma!.item.create({
      data: { itemTypeId: itemType.id, name: 'Pump', slug: `pump-${suffix}` },
    });
    const revisionAssignee = await prisma!.user.create({
      data: { email: `${suffix}-revision-assignee@example.test` },
    });
    const foreignProject = await prisma!.project.create({
      data: { code: `F${suffix.slice(0, 12)}`, name: 'Foreign', ownerId: user.id },
    });
    const foreignType = await prisma!.itemType.create({
      data: { projectId: foreignProject.id, name: 'Foreign type', slug: `foreign-${suffix}` },
    });
    const foreignItem = await prisma!.item.create({
      data: { itemTypeId: foreignType.id, name: 'Foreign pump', slug: `foreign-pump-${suffix}` },
    });
    await expect(
      prisma!.maintenancePlan.create({ data: { projectId: project.id, itemId: foreignItem.id } })
    ).rejects.toThrow(/must belong to its project/);
    const location = await prisma!.location.create({
      data: { projectId: project.id, name: 'Plant', level: 0 },
    });
    const floorPlan = await prisma!.floorPlan.create({
      data: {
        locationId: location.id,
        name: 'Plan',
        imageUrl: `/tests/${suffix}.png`,
        width: 1,
        height: 1,
      },
    });
    const plan = await prisma!.maintenancePlan.create({
      data: { projectId: project.id, itemId: item.id },
    });
    const revision = await prisma!.maintenancePlanRevision.create({
      data: {
        maintenancePlanId: plan.id,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        scheduleKind: 'FIXED',
        scheduledAt: new Date('2026-01-02T09:00:00.000Z'),
        assigneeId: revisionAssignee.id,
      },
    });
    expect(
      (await prisma!.maintenancePlanRevision.findUniqueOrThrow({
        where: { id: revision.id },
        include: { assignee: true },
      })).assignee?.id
    ).toBe(revisionAssignee.id);
    const checklistTemplate = await prisma!.maintenancePlanChecklistItem.create({
      data: {
        maintenancePlanRevisionId: revision.id,
        title: 'Inspect pressure',
        position: 1,
        required: true,
      },
    });
    const data = {
      projectId: project.id,
      maintenancePlanId: plan.id,
      maintenancePlanRevisionId: revision.id,
      itemId: item.id,
      occurrenceKey: '2026-01-02T09:00:00+01:00',
      scheduledAt: new Date('2026-01-02T08:00:00.000Z'),
    };
    const results = await Promise.allSettled([
      prisma!.workOrder.create({ data }),
      prisma!.workOrder.create({ data }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma!.workOrder.count({
        where: { maintenancePlanId: plan.id, occurrenceKey: data.occurrenceKey },
      })
    ).toBe(1);
    await expect(
      prisma!.maintenancePlanRevision.update({
        where: { id: revision.id },
        data: { title: 'mutated' },
      })
    ).rejects.toThrow(/immutable/);
    const workOrder = await prisma!.workOrder.findUniqueOrThrow({
      where: {
        maintenancePlanId_occurrenceKey: {
          maintenancePlanId: plan.id,
          occurrenceKey: data.occurrenceKey,
        },
      },
    });
    const checklistSnapshot = await prisma!.workOrderChecklistItem.create({
      data: {
        workOrderId: workOrder.id,
        sourceChecklistItemId: checklistTemplate.id,
        title: checklistTemplate.title,
        position: checklistTemplate.position,
        required: checklistTemplate.required,
      },
    });
    expect(checklistSnapshot.title).toBe('Inspect pressure');
    await prisma!.workOrder.update({ where: { id: workOrder.id }, data: { status: 'COMPLETED' } });
    await expect(
      prisma!.workOrder.update({ where: { id: workOrder.id }, data: { title: 'mutated' } })
    ).rejects.toThrow(/immutable/);
    await expect(prisma!.workOrder.delete({ where: { id: workOrder.id } })).rejects.toThrow(
      /immutable/
    );
    await expect(
      prisma!.workOrderChecklistItem.delete({ where: { id: checklistSnapshot.id } })
    ).rejects.toThrow(/immutable/);

    await prisma!.user.delete({ where: { id: revisionAssignee.id } });
    const revisionAfterAssigneeDeletion = await prisma!.maintenancePlanRevision.findUniqueOrThrow({
      where: { id: revision.id },
      include: { assignee: true },
    });
    expect(revisionAfterAssigneeDeletion.assigneeId).toBeNull();
    expect(revisionAfterAssigneeDeletion.assignee).toBeNull();

    await prisma!.locationMarker.createMany({
      data: [
        { floorPlanId: floorPlan.id, x: 0.1, y: 0.1 },
        { floorPlanId: floorPlan.id, x: 0.2, y: 0.2 },
      ],
    });
    expect(
      await prisma!.locationMarker.count({ where: { floorPlanId: floorPlan.id, itemId: null } })
    ).toBe(2);
    await prisma!.locationMarker.create({
      data: { floorPlanId: floorPlan.id, itemId: item.id, x: 0.3, y: 0.3 },
    });
    await expect(
      prisma!.locationMarker.create({
        data: { floorPlanId: floorPlan.id, itemId: item.id, x: 0.4, y: 0.4 },
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('keeps revisions immutable and permits multiple unassociated markers', async () => {
    const constraints = await prisma!.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'location_markers_floor_plan_id_item_id_not_null_key'
    `;
    expect(constraints[0]?.indexdef).toContain('WHERE ("itemId" IS NOT NULL)');
  });

  it('preserves Europe/Madrid DST instant conversion in PostgreSQL', async () => {
    const rows = await prisma!.$queryRaw<Array<{ spring: Date; autumn: Date }>>`
      SELECT
        ('2026-03-29 02:30:00'::timestamp AT TIME ZONE 'Europe/Madrid') AS spring,
        ('2026-10-25 02:30:00'::timestamp AT TIME ZONE 'Europe/Madrid') AS autumn
    `;

    expect(rows[0]?.spring.toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(rows[0]?.autumn.toISOString()).toBe('2026-10-25T01:30:00.000Z');
  });
});

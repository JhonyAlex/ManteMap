import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/repositories/item-repository', () => ({
  createItem: vi.fn(),
  findItemById: vi.fn(),
  findItemByProjectAndId: vi.fn(),
  findItemsByProject: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  createItemFieldValues: vi.fn(),
  deleteItemFieldValues: vi.fn(),
  findFieldValuesByItemId: vi.fn(),
}));
vi.mock('@/lib/repositories/dynamic-field-repository', () => ({
  listFieldsByItemType: vi.fn(),
}));
vi.mock('@/lib/repositories/status-repository', () => ({
  getDefaultStatus: vi.fn(),
  getStatusById: vi.fn(),
}));
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));
vi.mock('@/lib/services/alert-service', () => ({
  generateAlert: vi.fn(),
}));

import {
  createItem,
  getItem,
  listItems,
  updateItem,
  deleteItem,
  transitionStatus,
} from './item-service';
import * as repository from '@/lib/repositories/item-repository';
import * as dynamicFieldRepository from '@/lib/repositories/dynamic-field-repository';
import * as statusRepository from '@/lib/repositories/status-repository';
import * as access from '@/lib/services/project-access-service';
import * as alertService from '@/lib/services/alert-service';

// ---------------------------------------------------------------------------
// Fixtures — valid CUIDs for Zod validation
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const TYPE_ID = 'cltype1xxxxxxxxxxxxxxxxx';
const ITEM_ID = 'clitem1xxxxxxxxxxxxxxxxx';
const STATUS_ID = 'clstat1xxxxxxxxxxxxxxxxx';
const STATUS_ID_2 = 'clstat2xxxxxxxxxxxxxxxxx';
const STATUS_FINAL_ID = 'clstatfxxxxxxxxxxxxxxxxx';
const OWNER_ID = 'clownerxxxxxxxxxxxxxxxxx';
const MEMBER_ID = 'clmembxxxxxxxxxxxxxxxxx';

const item = {
  id: ITEM_ID,
  name: 'Industrial Pump A',
  slug: 'industrial-pump-a',
  itemTypeId: TYPE_ID,
  statusId: STATUS_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultStatus = {
  id: STATUS_ID,
  itemTypeId: TYPE_ID,
  name: 'Active',
  key: 'active',
  color: '#00FF00',
  isDefault: true,
  active: true,
  isFinal: false,
  isBlocking: false,
  isIncident: false,
};

const finalStatus = {
  ...defaultStatus,
  id: STATUS_FINAL_ID,
  name: 'Completed',
  key: 'completed',
  isDefault: false,
  isFinal: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(access.requireProjectOwner).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createItem
// ---------------------------------------------------------------------------
describe('item service createItem', () => {
  it('requires owner access for creation', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());
    await expect(
      createItem(PROJECT_ID, { name: 'Pump', itemTypeId: TYPE_ID }, MEMBER_ID)
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.createItem).not.toHaveBeenCalled();
  });

  it('auto-generates slug from name when slug is omitted', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue(item as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 0 });

    await createItem(PROJECT_ID, { name: 'Industrial Pump A', itemTypeId: TYPE_ID }, OWNER_ID);

    expect(repository.createItem).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ slug: 'industrial-pump-a' })
    );
  });

  it('uses explicit slug when provided', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue(item as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 0 });

    await createItem(
      PROJECT_ID,
      { name: 'Pump', slug: 'custom-slug', itemTypeId: TYPE_ID },
      OWNER_ID
    );

    expect(repository.createItem).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ slug: 'custom-slug' })
    );
  });

  it('resolves slug conflict by appending numeric suffix', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([
      { ...item, slug: 'widget' },
    ] as never);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue({ ...item, slug: 'widget-2' } as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 0 });

    await createItem(
      PROJECT_ID,
      { name: 'Widget', itemTypeId: TYPE_ID },
      OWNER_ID
    );

    expect(repository.createItem).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ slug: 'widget-2' })
    );
  });

  it('auto-assigns default status when statusId is omitted', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue(item as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 0 });

    await createItem(PROJECT_ID, { name: 'Pump', itemTypeId: TYPE_ID }, OWNER_ID);

    expect(repository.createItem).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ statusId: STATUS_ID })
    );
  });

  it('leaves statusId null when no default status exists', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(null);
    vi.mocked(repository.createItem).mockResolvedValue({ ...item, statusId: null } as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 0 });

    await createItem(PROJECT_ID, { name: 'Pump', itemTypeId: TYPE_ID }, OWNER_ID);

    expect(repository.createItem).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ statusId: null })
    );
  });

  it('uses explicit statusId when provided', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(repository.createItem).mockResolvedValue({ ...item, statusId: STATUS_ID_2 } as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 0 });

    await createItem(
      PROJECT_ID,
      { name: 'Pump', itemTypeId: TYPE_ID, statusId: STATUS_ID_2 },
      OWNER_ID
    );

    expect(repository.createItem).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ statusId: STATUS_ID_2 })
    );
    // Should NOT call getDefaultStatus when explicit statusId is provided
    expect(statusRepository.getDefaultStatus).not.toHaveBeenCalled();
  });

  it('creates field values when provided', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue(item as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 2 });
    vi.mocked(dynamicFieldRepository.listFieldsByItemType).mockResolvedValue([
      { id: 'clfieldxxxxxxxxxxxxxxxxx', name: 'Name', type: 'SHORT_TEXT', itemTypeId: TYPE_ID } as never,
      { id: 'clfieldyyyyyyyyyyyyyyyyy', name: 'Count', type: 'NUMBER', itemTypeId: TYPE_ID } as never,
    ]);

    await createItem(
      PROJECT_ID,
      {
        name: 'Pump',
        itemTypeId: TYPE_ID,
        fieldValues: [
          { dynamicFieldId: 'clfieldxxxxxxxxxxxxxxxxx', value: 'Widget' },
          { dynamicFieldId: 'clfieldyyyyyyyyyyyyyyyyy', value: 42 },
        ],
      },
      OWNER_ID
    );

    expect(repository.createItemFieldValues).toHaveBeenCalledWith(
      ITEM_ID,
      [
        { dynamicFieldId: 'clfieldxxxxxxxxxxxxxxxxx', value: 'Widget' },
        { dynamicFieldId: 'clfieldyyyyyyyyyyyyyyyyy', value: 42 },
      ]
    );
  });

  it('skips field value creation when fieldValues is empty', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue(item as never);

    await createItem(
      PROJECT_ID,
      { name: 'Pump', itemTypeId: TYPE_ID, fieldValues: [] },
      OWNER_ID
    );

    expect(repository.createItemFieldValues).not.toHaveBeenCalled();
  });

  it('rejects fabricated field IDs that do not belong to the ItemType', async () => {
    const REAL_FIELD_ID = 'clfieldxxxxxxxxxxxxxxxxx';
    const FABRICATED_FIELD_ID = 'clfieldFAKEyyyyyyyyyyyyy';

    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue(item as never);
    // Only the real field belongs to the ItemType
    vi.mocked(dynamicFieldRepository.listFieldsByItemType).mockResolvedValue([
      { id: REAL_FIELD_ID, name: 'Name', type: 'SHORT_TEXT', itemTypeId: TYPE_ID } as never,
    ]);

    await expect(
      createItem(
        PROJECT_ID,
        {
          name: 'Pump',
          itemTypeId: TYPE_ID,
          fieldValues: [
            { dynamicFieldId: REAL_FIELD_ID, value: 'Valid' },
            { dynamicFieldId: FABRICATED_FIELD_ID, value: 'Invalid' },
          ],
        },
        OWNER_ID
      )
    ).rejects.toBeInstanceOf(ValidationError);

    // Should NOT create item or field values
    expect(repository.createItem).not.toHaveBeenCalled();
    expect(repository.createItemFieldValues).not.toHaveBeenCalled();
  });

  it('allows field values when all field IDs belong to the ItemType', async () => {
    const FIELD_1 = 'clfieldxxxxxxxxxxxxxxxxx';
    const FIELD_2 = 'clfieldyyyyyyyyyyyyyyyyy';

    vi.mocked(repository.findItemsByProject).mockResolvedValue([]);
    vi.mocked(statusRepository.getDefaultStatus).mockResolvedValue(defaultStatus as never);
    vi.mocked(repository.createItem).mockResolvedValue(item as never);
    vi.mocked(repository.createItemFieldValues).mockResolvedValue({ count: 2 });
    vi.mocked(dynamicFieldRepository.listFieldsByItemType).mockResolvedValue([
      { id: FIELD_1, name: 'Name', type: 'SHORT_TEXT', itemTypeId: TYPE_ID } as never,
      { id: FIELD_2, name: 'Count', type: 'NUMBER', itemTypeId: TYPE_ID } as never,
    ]);

    await createItem(
      PROJECT_ID,
      {
        name: 'Pump',
        itemTypeId: TYPE_ID,
        fieldValues: [
          { dynamicFieldId: FIELD_1, value: 'Widget' },
          { dynamicFieldId: FIELD_2, value: 42 },
        ],
      },
      OWNER_ID
    );

    expect(repository.createItemFieldValues).toHaveBeenCalledWith(
      ITEM_ID,
      [
        { dynamicFieldId: FIELD_1, value: 'Widget' },
        { dynamicFieldId: FIELD_2, value: 42 },
      ]
    );
  });
});

// ---------------------------------------------------------------------------
// getItem
// ---------------------------------------------------------------------------
describe('item service getItem', () => {
  it('requires membership for reads', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({
      ...item,
      fieldValues: [],
      status: defaultStatus,
    } as never);

    await getItem(PROJECT_ID, ITEM_ID, MEMBER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, MEMBER_ID);
  });

  it('returns item with hydrated field values', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({
      ...item,
      fieldValues: [{ id: 'clfvxxxxxxxxxxxxxxxxxxx', value: 'Widget' }],
      status: defaultStatus,
    } as never);

    const result = await getItem(PROJECT_ID, ITEM_ID, MEMBER_ID);

    expect(repository.findItemByProjectAndId).toHaveBeenCalledWith(
      PROJECT_ID,
      ITEM_ID,
      expect.objectContaining({
        fieldValues: expect.any(Object),
        status: true,
        itemType: true,
      })
    );
    expect(result.item.fieldValues).toHaveLength(1);
  });

  it('throws NotFoundError when item does not exist', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue(null);

    await expect(
      getItem(PROJECT_ID, 'clitem999xxxxxxxxxxxxxxxx', MEMBER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// listItems
// ---------------------------------------------------------------------------
describe('item service listItems', () => {
  it('requires membership for listing', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([item] as never);

    await listItems(PROJECT_ID, { itemTypeId: TYPE_ID }, MEMBER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, MEMBER_ID);
  });

  it('returns items from repository', async () => {
    vi.mocked(repository.findItemsByProject).mockResolvedValue([item, item] as never);

    const result = await listItems(PROJECT_ID, { itemTypeId: TYPE_ID }, MEMBER_ID);

    expect(repository.findItemsByProject).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ itemTypeId: TYPE_ID })
    );
    expect(result.items).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------
describe('item service updateItem', () => {
  it('requires owner access for updates', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      updateItem(PROJECT_ID, ITEM_ID, { name: 'Updated' }, MEMBER_ID)
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it('updates item name', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue(item as never);
    vi.mocked(repository.updateItem).mockResolvedValue({ ...item, name: 'Updated' } as never);

    const result = await updateItem(
      PROJECT_ID,
      ITEM_ID,
      { name: 'Updated' },
      OWNER_ID
    );

    expect(repository.updateItem).toHaveBeenCalledWith(
      PROJECT_ID,
      ITEM_ID,
      TYPE_ID,
      { name: 'Updated' }
    );
    expect(result.item.name).toBe('Updated');
  });

  it('throws NotFoundError when item does not exist', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue(null);

    await expect(
      updateItem(PROJECT_ID, 'clitem999xxxxxxxxxxxxxxxx', { name: 'Updated' }, OWNER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------
describe('item service deleteItem', () => {
  it('requires owner access for deletion', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      deleteItem(PROJECT_ID, ITEM_ID, MEMBER_ID)
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.deleteItem).not.toHaveBeenCalled();
  });

  it('deletes item and its field values', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue(item as never);
    vi.mocked(repository.deleteItemFieldValues).mockResolvedValue({ count: 3 });
    vi.mocked(repository.deleteItem).mockResolvedValue(undefined);

    await deleteItem(PROJECT_ID, ITEM_ID, OWNER_ID);

    expect(repository.deleteItemFieldValues).toHaveBeenCalledWith(ITEM_ID);
    expect(repository.deleteItem).toHaveBeenCalledWith(PROJECT_ID, ITEM_ID, TYPE_ID);
  });

  it('throws NotFoundError when item does not exist', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue(null);

    await expect(
      deleteItem(PROJECT_ID, 'clitem999xxxxxxxxxxxxxxxx', OWNER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// transitionStatus
// ---------------------------------------------------------------------------
describe('item service transitionStatus', () => {
  it('requires owner access for status transitions', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      transitionStatus(PROJECT_ID, ITEM_ID, STATUS_ID_2, MEMBER_ID)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('transitions to a valid non-final status', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({ ...item, statusId: STATUS_ID } as never);
    vi.mocked(statusRepository.getStatusById).mockResolvedValue({
      ...defaultStatus,
      id: STATUS_ID_2,
      isFinal: false,
    } as never);
    vi.mocked(repository.updateItem).mockResolvedValue({ ...item, statusId: STATUS_ID_2 } as never);

    const result = await transitionStatus(
      PROJECT_ID,
      ITEM_ID,
      STATUS_ID_2,
      OWNER_ID
    );

    expect(result.item.statusId).toBe(STATUS_ID_2);
  });

  it('blocks transition when current status isFinal', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({
      ...item,
      statusId: STATUS_FINAL_ID,
    } as never);
    // First call: look up target status; second call: look up current status
    vi.mocked(statusRepository.getStatusById)
      .mockResolvedValueOnce({ ...defaultStatus, id: STATUS_ID } as never) // target
      .mockResolvedValueOnce(finalStatus as never); // current (final)

    await expect(
      transitionStatus(PROJECT_ID, ITEM_ID, STATUS_ID, OWNER_ID)
    ).rejects.toThrow(/final/i);
  });

  it('rejects transition to a non-existent or deactivated status', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({ ...item, statusId: STATUS_ID } as never);
    vi.mocked(statusRepository.getStatusById).mockResolvedValue(null);

    await expect(
      transitionStatus(PROJECT_ID, ITEM_ID, 'clstat999xxxxxxxxxxxxxxxx', OWNER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when item does not exist', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue(null);

    await expect(
      transitionStatus(PROJECT_ID, 'clitem999xxxxxxxxxxxxxxxx', STATUS_ID_2, OWNER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('generates a critical alert when transitioning to an incident status', async () => {
    const incidentStatus = {
      ...defaultStatus,
      id: 'clstatINCxxxxxxxxxxxxxxxx',
      name: 'Incident',
      isIncident: true,
      isBlocking: false,
      isFinal: false,
    };
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({ ...item, statusId: STATUS_ID } as never);
    vi.mocked(statusRepository.getStatusById).mockResolvedValue(incidentStatus as never);
    vi.mocked(repository.updateItem).mockResolvedValue({ ...item, statusId: incidentStatus.id } as never);
    vi.mocked(alertService.generateAlert).mockResolvedValue({} as never);

    await transitionStatus(PROJECT_ID, ITEM_ID, incidentStatus.id, OWNER_ID);

    expect(alertService.generateAlert).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({
        alertType: 'STATUS_INCIDENT',
        severity: 'CRITICAL',
        sourceType: 'item',
        sourceId: ITEM_ID,
      })
    );
  });

  it('generates a warning alert when transitioning to a blocking status', async () => {
    const blockingStatus = {
      ...defaultStatus,
      id: 'clstatBLKxxxxxxxxxxxxxxxx',
      name: 'Blocked',
      isIncident: false,
      isBlocking: true,
      isFinal: false,
    };
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({ ...item, statusId: STATUS_ID } as never);
    vi.mocked(statusRepository.getStatusById).mockResolvedValue(blockingStatus as never);
    vi.mocked(repository.updateItem).mockResolvedValue({ ...item, statusId: blockingStatus.id } as never);
    vi.mocked(alertService.generateAlert).mockResolvedValue({} as never);

    await transitionStatus(PROJECT_ID, ITEM_ID, blockingStatus.id, OWNER_ID);

    expect(alertService.generateAlert).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({
        alertType: 'STATUS_BLOCKING',
        severity: 'WARNING',
        sourceType: 'item',
        sourceId: ITEM_ID,
      })
    );
  });

  it('generates an info alert when transitioning to a final status', async () => {
    const finalStatusTarget = {
      ...defaultStatus,
      id: 'clstatFINxxxxxxxxxxxxxxxx',
      name: 'Completed',
      isIncident: false,
      isBlocking: false,
      isFinal: true,
    };
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({ ...item, statusId: STATUS_ID } as never);
    // First call: target status (final); second call: current status (not final)
    vi.mocked(statusRepository.getStatusById)
      .mockResolvedValueOnce(finalStatusTarget as never)
      .mockResolvedValueOnce({ ...defaultStatus, isFinal: false } as never);
    vi.mocked(repository.updateItem).mockResolvedValue({ ...item, statusId: finalStatusTarget.id } as never);
    vi.mocked(alertService.generateAlert).mockResolvedValue({} as never);

    await transitionStatus(PROJECT_ID, ITEM_ID, finalStatusTarget.id, OWNER_ID);

    expect(alertService.generateAlert).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({
        alertType: 'STATUS_FINAL',
        severity: 'INFO',
        sourceType: 'item',
        sourceId: ITEM_ID,
      })
    );
  });

  it('does not generate alert for a normal status transition', async () => {
    vi.mocked(repository.findItemByProjectAndId).mockResolvedValue({ ...item, statusId: STATUS_ID } as never);
    vi.mocked(statusRepository.getStatusById).mockResolvedValue({
      ...defaultStatus,
      id: STATUS_ID_2,
      isIncident: false,
      isBlocking: false,
      isFinal: false,
    } as never);
    vi.mocked(repository.updateItem).mockResolvedValue({ ...item, statusId: STATUS_ID_2 } as never);

    await transitionStatus(PROJECT_ID, ITEM_ID, STATUS_ID_2, OWNER_ID);

    expect(alertService.generateAlert).not.toHaveBeenCalled();
  });
});

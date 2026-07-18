import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock repository
// ---------------------------------------------------------------------------
vi.mock('@/lib/repositories/dynamic-field-repository', () => ({
  createField: vi.fn(),
  deactivateField: vi.fn(),
  getFieldById: vi.fn(),
  listFieldsByItemType: vi.fn(),
  reorderFields: vi.fn(),
  updateField: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock access guards
// ---------------------------------------------------------------------------
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));

import {
  createField,
  deactivateField,
  getField,
  listFields,
  reorderFields,
  updateField,
} from './dynamic-field-service';
import * as repository from '@/lib/repositories/dynamic-field-repository';
import * as access from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const activeField = {
  id: 'field-1',
  itemTypeId: 'type-1',
  name: 'Serial Number',
  key: 'serial-number',
  type: 'SHORT_TEXT' as const,
  description: null,
  required: false,
  defaultValue: null,
  order: 0,
  visible: true,
  active: true,
  options: null,
  unit: null,
  validation: null,
  showInList: false,
  showInSearch: false,
  helpText: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activeField2 = {
  ...activeField,
  id: 'field-2',
  name: 'Manufacturer',
  key: 'manufacturer',
  order: 1,
};

// Minimal valid input — TypeScript strictness requires full types; cast for test brevity
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fieldInput: any = {
  name: 'Serial Number',
  key: 'serial-number',
  type: 'SHORT_TEXT' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(access.requireProjectOwner).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// listFields
// ---------------------------------------------------------------------------
describe('listFields', () => {
  it('requires project membership and returns ordered fields', async () => {
    vi.mocked(repository.listFieldsByItemType).mockResolvedValue([
      activeField as never,
      activeField2 as never,
    ]);

    const result = await listFields('project-1', 'type-1', 'member-1');

    expect(access.requireProjectMember).toHaveBeenCalledWith('project-1', 'member-1');
    expect(repository.listFieldsByItemType).toHaveBeenCalledWith(
      'project-1',
      'type-1'
    );
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('field-1');
    expect(result[1].id).toBe('field-2');
  });

  it('throws AuthorizationError when requireProjectMember rejects', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new AuthorizationError());

    await expect(
      listFields('project-1', 'type-1', 'non-member')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.listFieldsByItemType).not.toHaveBeenCalled();
  });

  it('returns empty array when ItemType has no fields', async () => {
    vi.mocked(repository.listFieldsByItemType).mockResolvedValue([]);

    const result = await listFields('project-1', 'type-1', 'member-1');

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getField
// ---------------------------------------------------------------------------
describe('getField', () => {
  it('requires membership and returns a single field', async () => {
    vi.mocked(repository.getFieldById).mockResolvedValue(activeField as never);

    const result = await getField('project-1', 'field-1', 'type-1', 'member-1');

    expect(access.requireProjectMember).toHaveBeenCalledWith('project-1', 'member-1');
    expect(repository.getFieldById).toHaveBeenCalledWith(
      'project-1',
      'field-1',
      'type-1'
    );
    expect(result.id).toBe('field-1');
  });

  it('throws NotFoundError when field does not exist', async () => {
    vi.mocked(repository.getFieldById).mockResolvedValue(null);

    await expect(
      getField('project-1', 'field-999', 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when field is deactivated', async () => {
    vi.mocked(repository.getFieldById).mockResolvedValue(null); // deactivated fields return null from repo

    await expect(
      getField('project-1', 'field-3', 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws AuthorizationError when requireProjectMember rejects', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new AuthorizationError());

    await expect(
      getField('project-1', 'field-1', 'type-1', 'non-member')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.getFieldById).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createField
// ---------------------------------------------------------------------------
describe('createField', () => {
  it('requires project ownership, validates input, and creates a field', async () => {
    vi.mocked(repository.createField).mockResolvedValue(activeField as never);

    const result = await createField('project-1', fieldInput, 'type-1', 'owner-1');

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.createField).toHaveBeenCalledWith(
      'project-1',
      'type-1',
      expect.objectContaining({
        name: 'Serial Number',
        key: 'serial-number',
        type: 'SHORT_TEXT',
      })
    );
    expect(result.id).toBe('field-1');
  });

  it('throws ValidationError when input fails Zod validation', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidInput: any = { name: '', key: 'Invalid Key!', type: 'SHORT_TEXT' };

    await expect(
      createField('project-1', invalidInput, 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.createField).not.toHaveBeenCalled();
  });

  it('rejects unknown field type with ValidationError', async () => {
    const invalidInput = { name: 'Test', key: 'test', type: 'UNKNOWN_TYPE' };

    await expect(
      createField('project-1', invalidInput as never, 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.createField).not.toHaveBeenCalled();
  });

  it('rejects SELECT type without options with ValidationError', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidInput: any = {
      name: 'Category',
      key: 'category',
      type: 'SELECT',
    };

    await expect(
      createField('project-1', invalidInput, 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.createField).not.toHaveBeenCalled();
  });

  it('throws ConflictError on duplicate key', async () => {
    const p2002Error = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    vi.mocked(repository.createField).mockRejectedValue(p2002Error);

    // Verify the mock is callable and the error has code P2002
    expect(p2002Error.code).toBe('P2002');

    await expect(
      createField('project-1', fieldInput, 'type-1', 'owner-1')
    ).rejects.toThrow(
      'A field with this key already exists in this item type'
    );
  });

  it('throws AuthorizationError when non-owner member calls create', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      createField('project-1', fieldInput, 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.createField).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateField
// ---------------------------------------------------------------------------
describe('updateField', () => {
  it('requires project ownership, validates input, and updates a field', async () => {
    const updateInput = { name: 'Updated Name' };
    vi.mocked(repository.updateField).mockResolvedValue({
      ...activeField,
      name: 'Updated Name',
    } as never);

    const result = await updateField(
      'project-1',
      'field-1',
      updateInput,
      'type-1',
      'owner-1'
    );

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.updateField).toHaveBeenCalledWith(
      'project-1',
      'field-1',
      'type-1',
      expect.objectContaining({ name: 'Updated Name' })
    );
    expect(result.name).toBe('Updated Name');
  });

  it('throws ValidationError when update input fails Zod validation', async () => {
    const invalidInput = { key: 'Invalid Key!' };

    await expect(
      updateField('project-1', 'field-1', invalidInput, 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.updateField).not.toHaveBeenCalled();
  });

  it('throws AuthorizationError when non-owner member calls update', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      updateField('project-1', 'field-1', { name: 'X' }, 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.updateField).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deactivateField
// ---------------------------------------------------------------------------
describe('deactivateField', () => {
  it('requires project ownership and deactivates a field', async () => {
    vi.mocked(repository.deactivateField).mockResolvedValue({
      ...activeField,
      active: false,
    } as never);

    const result = await deactivateField(
      'project-1',
      'field-1',
      'type-1',
      'owner-1'
    );

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.deactivateField).toHaveBeenCalledWith(
      'project-1',
      'field-1',
      'type-1'
    );
    expect(result.active).toBe(false);
  });

  it('throws NotFoundError when field is already deactivated', async () => {
    const notFoundErr = new NotFoundError('Dynamic field', 'field-3');
    vi.mocked(repository.deactivateField).mockRejectedValue(notFoundErr);

    await expect(
      deactivateField('project-1', 'field-3', 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws AuthorizationError when non-owner member calls deactivate', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      deactivateField('project-1', 'field-1', 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.deactivateField).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderFields
// ---------------------------------------------------------------------------
describe('reorderFields', () => {
  it('requires project ownership, validates input, and reorders fields', async () => {
    vi.mocked(repository.reorderFields).mockResolvedValue(undefined as never);

    await reorderFields(
      'project-1',
      ['field-2', 'field-1', 'field-3'],
      'type-1',
      'owner-1'
    );

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.reorderFields).toHaveBeenCalledWith(
      'project-1',
      'type-1',
      ['field-2', 'field-1', 'field-3']
    );
  });

  it('throws ValidationError when fieldIds array is empty', async () => {
    await expect(
      reorderFields('project-1', [], 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.reorderFields).not.toHaveBeenCalled();
  });

  it('throws AuthorizationError when non-owner member calls reorder', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      reorderFields('project-1', ['field-1'], 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.reorderFields).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, ValidationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/repositories/location-repository', () => ({
  createLocation: vi.fn(),
  findLocationById: vi.fn(),
  findLocationsByProject: vi.fn(),
  findLocationTree: vi.fn(),
  updateLocation: vi.fn(),
  reorderLocations: vi.fn(),
  deleteLocation: vi.fn(),
}));
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));

import {
  createLocation,
  getLocation,
  listLocations,
  getTree,
  updateLocation,
  reorderLocations,
  deleteLocation,
} from './location-service';
import * as repository from '@/lib/repositories/location-repository';
import * as access from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Fixtures — valid CUIDs for Zod validation
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const LOCATION_ID = 'clloc1xxxxxxxxxxxxxxxxxx';
const OWNER_ID = 'clownerxxxxxxxxxxxxxxxxx';
const MEMBER_ID = 'clmembxxxxxxxxxxxxxxxxx';

const rootLocation = {
  id: LOCATION_ID,
  projectId: PROJECT_ID,
  parentId: null,
  name: 'Main Center',
  level: 0,
  order: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const childLocation = {
  id: 'clloc2xxxxxxxxxxxxxxxxxx',
  projectId: PROJECT_ID,
  parentId: LOCATION_ID,
  name: 'Building A',
  level: 1,
  order: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const deepLocation = {
  id: 'clloc3xxxxxxxxxxxxxxxxxx',
  projectId: PROJECT_ID,
  parentId: 'clloc-deepxxxxxxxxxxxxx',
  name: 'Zone 1',
  level: 4,
  order: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(access.requireProjectOwner).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createLocation
// ---------------------------------------------------------------------------
describe('location service createLocation', () => {
  it('requires owner access for creation', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new ValidationError('Not owner'));

    await expect(
      createLocation(PROJECT_ID, { name: 'Center', level: 0 }, MEMBER_ID)
    ).rejects.toThrow();
    expect(repository.createLocation).not.toHaveBeenCalled();
  });

  it('creates a root location (level 0, no parent)', async () => {
    vi.mocked(repository.createLocation).mockResolvedValue(rootLocation as never);

    const result = await createLocation(
      PROJECT_ID,
      { name: 'Main Center', level: 0 },
      OWNER_ID
    );

    expect(repository.createLocation).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ name: 'Main Center', level: 0, parentId: undefined })
    );
    expect(result.location).toEqual(rootLocation);
  });

  it('creates a child location with valid parent', async () => {
    vi.mocked(repository.findLocationById).mockResolvedValue(rootLocation as never);
    vi.mocked(repository.createLocation).mockResolvedValue(childLocation as never);

    const result = await createLocation(
      PROJECT_ID,
      { name: 'Building A', level: 1, parentId: LOCATION_ID },
      OWNER_ID
    );

    expect(repository.findLocationById).toHaveBeenCalledWith(PROJECT_ID, LOCATION_ID);
    expect(repository.createLocation).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ name: 'Building A', level: 1, parentId: LOCATION_ID })
    );
    expect(result.location).toEqual(childLocation);
  });

  it('rejects creation when parent does not exist', async () => {
    vi.mocked(repository.findLocationById).mockResolvedValue(null);

    await expect(
      createLocation(
        PROJECT_ID,
        { name: 'Building', level: 1, parentId: 'clnonexistentxxxxxxxxxxx' },
        OWNER_ID
      )
    ).rejects.toThrow(NotFoundError);
    expect(repository.createLocation).not.toHaveBeenCalled();
  });

  it('rejects creation when level exceeds maximum (5)', async () => {
    // Zod schema rejects level > 4 before service validation runs
    await expect(
      createLocation(PROJECT_ID, { name: 'Too Deep', level: 5 }, OWNER_ID)
    ).rejects.toThrow();
    expect(repository.createLocation).not.toHaveBeenCalled();
  });

  it('rejects creation when parent level + 1 != child level', async () => {
    vi.mocked(repository.findLocationById).mockResolvedValue(rootLocation as never);

    await expect(
      createLocation(
        PROJECT_ID,
        { name: 'Wrong Level', level: 2, parentId: LOCATION_ID },
        OWNER_ID
      )
    ).rejects.toThrow(ValidationError);
    expect(repository.createLocation).not.toHaveBeenCalled();
  });

  it('validates input with Zod schema', async () => {
    await expect(
      createLocation(PROJECT_ID, { name: '', level: 0 }, OWNER_ID)
    ).rejects.toThrow();
    expect(repository.createLocation).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getLocation
// ---------------------------------------------------------------------------
describe('location service getLocation', () => {
  it('requires member access', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new ValidationError('Not member'));

    await expect(getLocation(PROJECT_ID, LOCATION_ID, MEMBER_ID)).rejects.toThrow();
  });

  it('returns a location by ID', async () => {
    vi.mocked(repository.findLocationById).mockResolvedValue(rootLocation as never);

    const result = await getLocation(PROJECT_ID, LOCATION_ID, MEMBER_ID);

    expect(repository.findLocationById).toHaveBeenCalledWith(PROJECT_ID, LOCATION_ID);
    expect(result.location).toEqual(rootLocation);
  });

  it('throws NotFoundError when location does not exist', async () => {
    vi.mocked(repository.findLocationById).mockResolvedValue(null);

    await expect(
      getLocation(PROJECT_ID, 'clnonexistentxxxxxxxxxxx', MEMBER_ID)
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// listLocations
// ---------------------------------------------------------------------------
describe('location service listLocations', () => {
  it('requires member access', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new ValidationError('Not member'));

    await expect(listLocations(PROJECT_ID, MEMBER_ID)).rejects.toThrow();
  });

  it('returns all locations for a project', async () => {
    vi.mocked(repository.findLocationsByProject).mockResolvedValue([
      rootLocation,
      childLocation,
    ] as never);

    const result = await listLocations(PROJECT_ID, MEMBER_ID);

    expect(repository.findLocationsByProject).toHaveBeenCalledWith(PROJECT_ID);
    expect(result.locations).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getTree
// ---------------------------------------------------------------------------
describe('location service getTree', () => {
  it('requires member access', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new ValidationError('Not member'));

    await expect(getTree(PROJECT_ID, MEMBER_ID)).rejects.toThrow();
  });

  it('returns the location tree', async () => {
    const tree = [{ ...rootLocation, children: [{ ...childLocation, children: [] }] }];
    vi.mocked(repository.findLocationTree).mockResolvedValue(tree as never);

    const result = await getTree(PROJECT_ID, MEMBER_ID);

    expect(repository.findLocationTree).toHaveBeenCalledWith(PROJECT_ID);
    expect(result.tree).toEqual(tree);
  });
});

// ---------------------------------------------------------------------------
// updateLocation
// ---------------------------------------------------------------------------
describe('location service updateLocation', () => {
  it('requires owner access for updates', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new ValidationError('Not owner'));

    await expect(
      updateLocation(PROJECT_ID, LOCATION_ID, { name: 'Updated' }, MEMBER_ID)
    ).rejects.toThrow();
    expect(repository.updateLocation).not.toHaveBeenCalled();
  });

  it('updates a location name', async () => {
    vi.mocked(repository.findLocationById).mockResolvedValue(rootLocation as never);
    vi.mocked(repository.updateLocation).mockResolvedValue({
      ...rootLocation,
      name: 'Updated Center',
    } as never);

    const result = await updateLocation(
      PROJECT_ID,
      LOCATION_ID,
      { name: 'Updated Center' },
      OWNER_ID
    );

    expect(repository.findLocationById).toHaveBeenCalledWith(PROJECT_ID, LOCATION_ID);
    expect(repository.updateLocation).toHaveBeenCalledWith(
      PROJECT_ID,
      LOCATION_ID,
      { name: 'Updated Center' }
    );
    expect(result.location.name).toBe('Updated Center');
  });

  it('validates input with Zod schema', async () => {
    await expect(
      updateLocation(PROJECT_ID, LOCATION_ID, {}, OWNER_ID)
    ).rejects.toThrow();
    expect(repository.updateLocation).not.toHaveBeenCalled();
  });

  it('detects cycle when updating parentId to a descendant', async () => {
    // A -> B -> C: updating A.parentId = C would create a cycle
    const locA = { ...rootLocation, id: 'loc-a', parentId: null, level: 0 };
    const locB = { ...childLocation, id: 'loc-b', parentId: 'loc-a', level: 1 };
    const locC = { ...deepLocation, id: 'loc-c', parentId: 'loc-b', level: 2 };

    vi.mocked(repository.findLocationById)
      .mockResolvedValueOnce(locA as never) // verify location exists
      .mockResolvedValueOnce(locC as never); // verify new parent exists
    vi.mocked(repository.findLocationsByProject).mockResolvedValue([
      locA,
      locB,
      locC,
    ] as never);

    await expect(
      updateLocation(PROJECT_ID, 'loc-a', { name: 'Updated A', parentId: 'loc-c' }, OWNER_ID)
    ).rejects.toThrow(ValidationError);
    expect(repository.updateLocation).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderLocations
// ---------------------------------------------------------------------------
describe('location service reorderLocations', () => {
  it('requires owner access for reorder', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new ValidationError('Not owner'));

    await expect(
      reorderLocations(PROJECT_ID, { locationIds: [LOCATION_ID] }, MEMBER_ID)
    ).rejects.toThrow();
    expect(repository.reorderLocations).not.toHaveBeenCalled();
  });

  it('delegates to repository for valid reorder', async () => {
    vi.mocked(repository.reorderLocations).mockResolvedValue(undefined);

    const ids = ['cllocaa1xxxxxxxxxxxxxxxxxx', 'cllocaa2xxxxxxxxxxxxxxxxxx', 'cllocaa3xxxxxxxxxxxxxxxxxx'];
    await reorderLocations(PROJECT_ID, { locationIds: ids }, OWNER_ID);

    expect(repository.reorderLocations).toHaveBeenCalledWith(PROJECT_ID, ids);
  });

  it('validates input with Zod schema', async () => {
    await expect(
      reorderLocations(PROJECT_ID, { locationIds: [] }, OWNER_ID)
    ).rejects.toThrow();
    expect(repository.reorderLocations).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteLocation
// ---------------------------------------------------------------------------
describe('location service deleteLocation', () => {
  it('requires owner access for deletion', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new ValidationError('Not owner'));

    await expect(deleteLocation(PROJECT_ID, LOCATION_ID, MEMBER_ID)).rejects.toThrow();
    expect(repository.deleteLocation).not.toHaveBeenCalled();
  });

  it('deletes a location', async () => {
    vi.mocked(repository.deleteLocation).mockResolvedValue(undefined);

    await deleteLocation(PROJECT_ID, LOCATION_ID, OWNER_ID);

    expect(repository.deleteLocation).toHaveBeenCalledWith(PROJECT_ID, LOCATION_ID);
  });

  it('throws NotFoundError when location does not exist', async () => {
    vi.mocked(repository.deleteLocation).mockRejectedValue(
      new NotFoundError('Location', 'loc-999')
    );

    await expect(
      deleteLocation(PROJECT_ID, 'clnonexistentxxxxxxxxxxx', OWNER_ID)
    ).rejects.toThrow(NotFoundError);
  });
});

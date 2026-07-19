/**
 * Tests for FloorPlanService — business logic for floor plans and markers.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "FloorPlan model with image upload" — upload via StorageDriver
 *   "Reject unsupported format" — format validation
 *   "Reject oversized file" — size validation
 *   "LocationMarker model with normalized coordinates" — coordinate validation
 *   "Floor plan CRUD access" — project-scoped access
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Upload via StorageDriver, marker coordinate validation, cascade delete"
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, ValidationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted to avoid hoisting issues
// ---------------------------------------------------------------------------

const { mockStorageDriver } = vi.hoisted(() => ({
  mockStorageDriver: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
    fileExists: vi.fn(),
  },
}));

vi.mock('@/lib/storage', () => ({
  getStorageDriver: () => mockStorageDriver,
}));

vi.mock('@/lib/repositories/floor-plan-repository', () => ({
  createFloorPlan: vi.fn(),
  findFloorPlanById: vi.fn(),
  findFloorPlansByLocation: vi.fn(),
  deleteFloorPlan: vi.fn(),
  createMarker: vi.fn(),
  findMarkerById: vi.fn(),
  findMarkersByFloorPlan: vi.fn(),
  updateMarker: vi.fn(),
  deleteMarker: vi.fn(),
}));

vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));

import {
  uploadFloorPlan,
  getFloorPlan,
  getFloorPlanImage,
  listFloorPlans,
  removeFloorPlan,
  addMarker,
  listMarkers,
  editMarker,
  removeMarker,
  validateFileExtension,
  validateFileSize,
  validateCoordinates,
  detectMimeType,
} from './floor-plan-service';
import * as repository from '@/lib/repositories/floor-plan-repository';
import * as access from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const LOCATION_ID = 'clloc1xxxxxxxxxxxxxxxxxx';
const FLOOR_PLAN_ID = 'clfp1xxxxxxxxxxxxxxxxxxx';
const MARKER_ID = 'clmk1xxxxxxxxxxxxxxxxxxx';
const OWNER_ID = 'clownerxxxxxxxxxxxxxxxxx';
const MEMBER_ID = 'clmembxxxxxxxxxxxxxxxxx';

const floorPlanRecord = {
  id: FLOOR_PLAN_ID,
  locationId: LOCATION_ID,
  name: 'Ground Floor',
  imageUrl: '/storage/proj1/floor-plans/1234-plan.png',
  width: 1920,
  height: 1080,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const markerRecord = {
  id: MARKER_ID,
  floorPlanId: FLOOR_PLAN_ID,
  itemId: null,
  x: 0.5,
  y: 0.3,
  label: 'Server Rack',
  color: '#ff0000',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMockFile(
  name: string,
  size: number,
  type: string = 'image/png'
): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(access.requireProjectOwner).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Pure validation functions
// ---------------------------------------------------------------------------

describe('validateFileExtension', () => {
  it('accepts .png files', () => {
    expect(() => validateFileExtension('plan.png')).not.toThrow();
  });

  it('accepts .jpg files', () => {
    expect(() => validateFileExtension('plan.jpg')).not.toThrow();
  });

  it('accepts .jpeg files', () => {
    expect(() => validateFileExtension('plan.jpeg')).not.toThrow();
  });

  it('accepts .svg files', () => {
    expect(() => validateFileExtension('plan.svg')).not.toThrow();
  });

  it('rejects .pdf files', () => {
    expect(() => validateFileExtension('plan.pdf')).toThrow(ValidationError);
  });

  it('rejects .exe files', () => {
    expect(() => validateFileExtension('plan.exe')).toThrow(ValidationError);
  });

  it('rejects files without extension', () => {
    expect(() => validateFileExtension('planfile')).toThrow(ValidationError);
  });

  it('is case-insensitive', () => {
    expect(() => validateFileExtension('plan.PNG')).not.toThrow();
    expect(() => validateFileExtension('plan.JPG')).not.toThrow();
  });
});

describe('validateFileSize', () => {
  it('accepts files under 10MB', () => {
    expect(() => validateFileSize(5 * 1024 * 1024)).not.toThrow();
  });

  it('accepts files at exactly 10MB', () => {
    expect(() => validateFileSize(10 * 1024 * 1024)).not.toThrow();
  });

  it('rejects files over 10MB', () => {
    expect(() => validateFileSize(11 * 1024 * 1024)).toThrow(ValidationError);
  });
});

describe('validateCoordinates', () => {
  it('accepts (0, 0)', () => {
    expect(() => validateCoordinates(0, 0)).not.toThrow();
  });

  it('accepts (1, 1)', () => {
    expect(() => validateCoordinates(1, 1)).not.toThrow();
  });

  it('accepts (0.5, 0.3)', () => {
    expect(() => validateCoordinates(0.5, 0.3)).not.toThrow();
  });

  it('rejects x > 1', () => {
    expect(() => validateCoordinates(1.5, 0.5)).toThrow(ValidationError);
  });

  it('rejects x < 0', () => {
    expect(() => validateCoordinates(-0.1, 0.5)).toThrow(ValidationError);
  });

  it('rejects y > 1', () => {
    expect(() => validateCoordinates(0.5, 1.1)).toThrow(ValidationError);
  });

  it('rejects y < 0', () => {
    expect(() => validateCoordinates(0.5, -0.1)).toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// uploadFloorPlan
// ---------------------------------------------------------------------------

describe('FloorPlanService uploadFloorPlan', () => {
  it('requires owner access for upload', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(
      new ValidationError('Not owner')
    );
    const file = createMockFile('plan.png', 1024);

    await expect(
      uploadFloorPlan(PROJECT_ID, LOCATION_ID, file, { name: 'Plan', width: 100, height: 100 }, MEMBER_ID)
    ).rejects.toThrow();
    expect(repository.createFloorPlan).not.toHaveBeenCalled();
  });

  it('uploads a valid floor plan image', async () => {
    const file = createMockFile('plan.png', 1024);
    mockStorageDriver.writeFile.mockResolvedValue('/storage/proj1/1234-plan.png');
    vi.mocked(repository.createFloorPlan).mockResolvedValue(floorPlanRecord as never);

    const result = await uploadFloorPlan(
      PROJECT_ID,
      LOCATION_ID,
      file,
      { name: 'Ground Floor', width: 1920, height: 1080 },
      OWNER_ID
    );

    expect(mockStorageDriver.writeFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining(LOCATION_ID)
    );
    expect(repository.createFloorPlan).toHaveBeenCalledWith(
      LOCATION_ID,
      expect.objectContaining({ name: 'Ground Floor' })
    );
    expect(result.floorPlan).toEqual(floorPlanRecord);
  });

  it('rejects unsupported file format', async () => {
    const file = createMockFile('plan.pdf', 1024, 'application/pdf');

    await expect(
      uploadFloorPlan(PROJECT_ID, LOCATION_ID, file, { name: 'Plan', width: 100, height: 100 }, OWNER_ID)
    ).rejects.toThrow(ValidationError);
    expect(mockStorageDriver.writeFile).not.toHaveBeenCalled();
  });

  it('rejects oversized file', async () => {
    const file = createMockFile('plan.png', 11 * 1024 * 1024);

    await expect(
      uploadFloorPlan(PROJECT_ID, LOCATION_ID, file, { name: 'Plan', width: 100, height: 100 }, OWNER_ID)
    ).rejects.toThrow(ValidationError);
    expect(mockStorageDriver.writeFile).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getFloorPlan
// ---------------------------------------------------------------------------

describe('FloorPlanService getFloorPlan', () => {
  it('requires member access', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(
      new ValidationError('Not member')
    );

    await expect(getFloorPlan(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID)).rejects.toThrow();
  });

  it('returns a floor plan by ID', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);

    const result = await getFloorPlan(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID);

    expect(repository.findFloorPlanById).toHaveBeenCalledWith(FLOOR_PLAN_ID);
    expect(result.floorPlan).toEqual(floorPlanRecord);
  });

  it('throws NotFoundError when floor plan does not exist', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(null);

    await expect(
      getFloorPlan(PROJECT_ID, 'clnonexistentxxxxxxx', MEMBER_ID)
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// listFloorPlans
// ---------------------------------------------------------------------------

describe('FloorPlanService listFloorPlans', () => {
  it('requires member access', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(
      new ValidationError('Not member')
    );

    await expect(listFloorPlans(PROJECT_ID, LOCATION_ID, MEMBER_ID)).rejects.toThrow();
  });

  it('returns floor plans for a location', async () => {
    vi.mocked(repository.findFloorPlansByLocation).mockResolvedValue([floorPlanRecord] as never);

    const result = await listFloorPlans(PROJECT_ID, LOCATION_ID, MEMBER_ID);

    expect(repository.findFloorPlansByLocation).toHaveBeenCalledWith(LOCATION_ID);
    expect(result.floorPlans).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// removeFloorPlan
// ---------------------------------------------------------------------------

describe('FloorPlanService removeFloorPlan', () => {
  it('requires owner access for deletion', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(
      new ValidationError('Not owner')
    );

    await expect(removeFloorPlan(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID)).rejects.toThrow();
    expect(repository.deleteFloorPlan).not.toHaveBeenCalled();
  });

  it('deletes floor plan and its storage file', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    vi.mocked(repository.deleteFloorPlan).mockResolvedValue(undefined);
    mockStorageDriver.deleteFile.mockResolvedValue(undefined);

    await removeFloorPlan(PROJECT_ID, FLOOR_PLAN_ID, OWNER_ID);

    expect(mockStorageDriver.deleteFile).toHaveBeenCalledWith(floorPlanRecord.imageUrl);
    expect(repository.deleteFloorPlan).toHaveBeenCalledWith(FLOOR_PLAN_ID);
  });

  it('deletes floor plan even if storage file deletion fails', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    vi.mocked(repository.deleteFloorPlan).mockResolvedValue(undefined);
    mockStorageDriver.deleteFile.mockRejectedValue(new Error('ENOENT'));

    await removeFloorPlan(PROJECT_ID, FLOOR_PLAN_ID, OWNER_ID);

    expect(repository.deleteFloorPlan).toHaveBeenCalledWith(FLOOR_PLAN_ID);
  });

  it('throws NotFoundError when floor plan does not exist', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(null);

    await expect(
      removeFloorPlan(PROJECT_ID, 'clnonexistentxxxxxxx', OWNER_ID)
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// addMarker
// ---------------------------------------------------------------------------

describe('FloorPlanService addMarker', () => {
  it('requires owner access for marker creation', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(
      new ValidationError('Not owner')
    );

    await expect(
      addMarker(PROJECT_ID, FLOOR_PLAN_ID, { type: 'POINT', x: 0.5, y: 0.3 }, MEMBER_ID)
    ).rejects.toThrow();
    expect(repository.createMarker).not.toHaveBeenCalled();
  });

  it('creates a marker with valid coordinates', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    vi.mocked(repository.createMarker).mockResolvedValue(markerRecord as never);

    const result = await addMarker(
      PROJECT_ID,
      FLOOR_PLAN_ID,
      { type: 'POINT', x: 0.5, y: 0.3, label: 'Server Rack', color: '#ff0000' },
      OWNER_ID
    );

    expect(repository.createMarker).toHaveBeenCalledWith(
      FLOOR_PLAN_ID,
      expect.objectContaining({ x: 0.5, y: 0.3, label: 'Server Rack' })
    );
    expect(result.marker).toEqual(markerRecord);
  });

  it('rejects out-of-range coordinates (x > 1)', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);

    await expect(
      addMarker(PROJECT_ID, FLOOR_PLAN_ID, { type: 'POINT', x: 1.5, y: 0.3 }, OWNER_ID)
    ).rejects.toThrow(); // Zod rejects first
    expect(repository.createMarker).not.toHaveBeenCalled();
  });

  it('rejects out-of-range coordinates (y < 0)', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);

    await expect(
      addMarker(PROJECT_ID, FLOOR_PLAN_ID, { type: 'POINT', x: 0.5, y: -0.1 }, OWNER_ID)
    ).rejects.toThrow(); // Zod rejects first
    expect(repository.createMarker).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when floor plan does not exist', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(null);

    await expect(
      addMarker(PROJECT_ID, 'clnonexistentxxxxxxx', { type: 'POINT', x: 0.5, y: 0.3 }, OWNER_ID)
    ).rejects.toThrow(NotFoundError);
    expect(repository.createMarker).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// listMarkers
// ---------------------------------------------------------------------------

describe('FloorPlanService listMarkers', () => {
  it('requires member access', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(
      new ValidationError('Not member')
    );

    await expect(listMarkers(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID)).rejects.toThrow();
  });

  it('returns markers for a floor plan', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    vi.mocked(repository.findMarkersByFloorPlan).mockResolvedValue([markerRecord] as never);

    const result = await listMarkers(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID);

    expect(repository.findMarkersByFloorPlan).toHaveBeenCalledWith(FLOOR_PLAN_ID);
    expect(result.markers).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// editMarker
// ---------------------------------------------------------------------------

describe('FloorPlanService editMarker', () => {
  it('requires owner access for marker update', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(
      new ValidationError('Not owner')
    );

    await expect(
      editMarker(PROJECT_ID, FLOOR_PLAN_ID, MARKER_ID, { x: 0.7 }, MEMBER_ID)
    ).rejects.toThrow();
    expect(repository.updateMarker).not.toHaveBeenCalled();
  });

  it('updates marker coordinates', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    vi.mocked(repository.findMarkerById).mockResolvedValue(markerRecord as never);
    vi.mocked(repository.updateMarker).mockResolvedValue({ ...markerRecord, x: 0.7 } as never);

    const result = await editMarker(
      PROJECT_ID,
      FLOOR_PLAN_ID,
      MARKER_ID,
      { x: 0.7, y: 0.8 },
      OWNER_ID
    );

    expect(repository.updateMarker).toHaveBeenCalledWith(
      FLOOR_PLAN_ID,
      MARKER_ID,
      expect.objectContaining({ x: 0.7, y: 0.8 })
    );
    expect(result.marker.x).toBe(0.7);
  });

  it('rejects out-of-range coordinates', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    vi.mocked(repository.findMarkerById).mockResolvedValue(markerRecord as never);

    await expect(
      editMarker(PROJECT_ID, FLOOR_PLAN_ID, MARKER_ID, { x: 1.5 }, OWNER_ID)
    ).rejects.toThrow(); // Zod rejects first
    expect(repository.updateMarker).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// removeMarker
// ---------------------------------------------------------------------------

describe('FloorPlanService removeMarker', () => {
  it('requires owner access for marker deletion', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(
      new ValidationError('Not owner')
    );

    await expect(
      removeMarker(PROJECT_ID, FLOOR_PLAN_ID, MARKER_ID, MEMBER_ID)
    ).rejects.toThrow();
    expect(repository.deleteMarker).not.toHaveBeenCalled();
  });

  it('deletes a marker', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    vi.mocked(repository.deleteMarker).mockResolvedValue(undefined);

    await removeMarker(PROJECT_ID, FLOOR_PLAN_ID, MARKER_ID, OWNER_ID);

    expect(repository.deleteMarker).toHaveBeenCalledWith(FLOOR_PLAN_ID, MARKER_ID);
  });

  it('throws NotFoundError when floor plan does not exist', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(null);

    await expect(
      removeMarker(PROJECT_ID, 'clnonexistentxxxxxxx', MARKER_ID, OWNER_ID)
    ).rejects.toThrow(NotFoundError);
    expect(repository.deleteMarker).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// detectMimeType — pure utility
// ---------------------------------------------------------------------------

describe('detectMimeType', () => {
  it('returns image/png for .png files', () => {
    expect(detectMimeType('floor-plan.png')).toBe('image/png');
  });

  it('returns image/jpeg for .jpg files', () => {
    expect(detectMimeType('photo.jpg')).toBe('image/jpeg');
  });

  it('returns image/jpeg for .jpeg files', () => {
    expect(detectMimeType('photo.jpeg')).toBe('image/jpeg');
  });

  it('returns image/svg+xml for .svg files', () => {
    expect(detectMimeType('diagram.svg')).toBe('image/svg+xml');
  });

  it('returns application/octet-stream for unknown extensions', () => {
    expect(detectMimeType('file.bin')).toBe('application/octet-stream');
  });

  it('is case-insensitive (uppercase extension)', () => {
    expect(detectMimeType('plan.PNG')).toBe('image/png');
    expect(detectMimeType('photo.JPG')).toBe('image/jpeg');
  });

  it('returns application/octet-stream for files without extension', () => {
    expect(detectMimeType('readme')).toBe('application/octet-stream');
  });
});

// ---------------------------------------------------------------------------
// getFloorPlanImage
// ---------------------------------------------------------------------------

describe('FloorPlanService getFloorPlanImage', () => {
  const storagePlanPath = 'LOC001/1234-floor.png';
  const imageBuffer = Buffer.from('fake-image-data');

  beforeEach(() => {
    mockStorageDriver.readFile.mockResolvedValue(imageBuffer);
  });

  it('requires member access', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(
      new ValidationError('Not member')
    );

    await expect(
      getFloorPlanImage(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID)
    ).rejects.toThrow();
  });

  it('returns buffer and correct PNG mimeType', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue({
      ...floorPlanRecord,
      imageUrl: storagePlanPath,
    } as never);

    const result = await getFloorPlanImage(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, MEMBER_ID);
    expect(repository.findFloorPlanById).toHaveBeenCalledWith(FLOOR_PLAN_ID);
    expect(mockStorageDriver.readFile).toHaveBeenCalledWith(storagePlanPath);
    expect(result.buffer).toEqual(imageBuffer);
    expect(result.mimeType).toBe('image/png');
  });

  it('returns correct mimeType for JPG', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue({
      ...floorPlanRecord,
      imageUrl: 'LOC001/image.jpg',
    } as never);

    const result = await getFloorPlanImage(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID);

    expect(result.mimeType).toBe('image/jpeg');
  });

  it('returns correct mimeType for SVG', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue({
      ...floorPlanRecord,
      imageUrl: 'LOC001/diagram.svg',
    } as never);

    const result = await getFloorPlanImage(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID);

    expect(result.mimeType).toBe('image/svg+xml');
  });

  it('throws NotFoundError when floor plan does not exist', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(null);

    await expect(
      getFloorPlanImage(PROJECT_ID, 'clnonexistentxxxxxxx', MEMBER_ID)
    ).rejects.toThrow(NotFoundError);
    expect(mockStorageDriver.readFile).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when image file is missing on disk', async () => {
    vi.mocked(repository.findFloorPlanById).mockResolvedValue(floorPlanRecord as never);
    mockStorageDriver.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

    await expect(
      getFloorPlanImage(PROJECT_ID, FLOOR_PLAN_ID, MEMBER_ID)
    ).rejects.toThrow(NotFoundError);
  });
});

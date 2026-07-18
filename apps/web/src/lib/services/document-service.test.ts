import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, ValidationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/repositories/document-repository', () => ({
  createDocument: vi.fn(),
  findDocumentsByItem: vi.fn(),
  findDocumentById: vi.fn(),
  deleteDocument: vi.fn(),
  updateDocument: vi.fn(),
  createDocumentVersion: vi.fn(),
  findVersionsByDocument: vi.fn(),
}));
vi.mock('@/lib/storage', () => ({
  getStorageDriver: vi.fn(),
}));
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
}));

import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  downloadDocument,
  getVersionHistory,
  updateDocumentMetadata,
} from './document-service';
import * as repository from '@/lib/repositories/document-repository';
import * as storage from '@/lib/storage';
import * as access from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'project-1';
const ITEM_ID = 'item-1';
const DOC_ID = 'doc-1';
const VERSION_ID = 'ver-1';
const USER_ID = 'user-1';

const document = {
  id: DOC_ID,
  itemId: ITEM_ID,
  name: 'Manual.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  expiresAt: null,
  currentVersionId: VERSION_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const documentVersion = {
  id: VERSION_ID,
  documentId: DOC_ID,
  version: 1,
  fileName: 'manual-v1.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  storagePath: 'project-1/item-1/ver-1-manual-v1.pdf',
  uploadedBy: USER_ID,
  createdAt: new Date(),
};

const mockStorageDriver = {
  writeFile: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn(),
  fileExists: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(storage.getStorageDriver).mockReturnValue(mockStorageDriver as any);
});

// ---------------------------------------------------------------------------
// uploadDocument
// ---------------------------------------------------------------------------
describe('document service uploadDocument', () => {
  const file = {
    name: 'manual.pdf',
    type: 'application/pdf',
    size: 1024,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
  };

  it('requires project membership', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new Error('Unauthorized'));
    await expect(
      uploadDocument(PROJECT_ID, ITEM_ID, file as any, { name: 'Manual' }, USER_ID)
    ).rejects.toThrow('Unauthorized');
  });

  it('validates file size exceeds limit', async () => {
    const largeFile = { ...file, size: 60 * 1024 * 1024 }; // 60MB
    await expect(
      uploadDocument(PROJECT_ID, ITEM_ID, largeFile as any, { name: 'Manual' }, USER_ID)
    ).rejects.toThrow(/size/i);
  });

  it('validates disallowed file type', async () => {
    const badFile = { ...file, type: 'application/x-executable' };
    await expect(
      uploadDocument(PROJECT_ID, ITEM_ID, badFile as any, { name: 'Manual' }, USER_ID)
    ).rejects.toThrow(/type/i);
  });

  it('stores file and creates document with initial version', async () => {
    mockStorageDriver.writeFile.mockResolvedValue('project-1/item-1/ver-1-manual.pdf');
    vi.mocked(repository.createDocument).mockResolvedValue(document);
    vi.mocked(repository.createDocumentVersion).mockResolvedValue(documentVersion);
    vi.mocked(repository.updateDocument).mockResolvedValue(document);

    const result = await uploadDocument(
      PROJECT_ID,
      ITEM_ID,
      file as any,
      { name: 'Manual.pdf' },
      USER_ID
    );

    expect(mockStorageDriver.writeFile).toHaveBeenCalled();
    expect(repository.createDocument).toHaveBeenCalledWith(ITEM_ID, expect.objectContaining({
      name: 'Manual.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    }));
    expect(repository.createDocumentVersion).toHaveBeenCalledWith(DOC_ID, expect.objectContaining({
      version: 1,
      fileName: 'manual.pdf',
      uploadedBy: USER_ID,
    }));
    expect(result.document).toEqual(document);
  });

  it('creates document with expiration date', async () => {
    const expiresAt = new Date('2025-12-31');
    mockStorageDriver.writeFile.mockResolvedValue('project-1/item-1/ver-1-manual.pdf');
    vi.mocked(repository.createDocument).mockResolvedValue({ ...document, expiresAt });
    vi.mocked(repository.createDocumentVersion).mockResolvedValue(documentVersion);
    vi.mocked(repository.updateDocument).mockResolvedValue({ ...document, expiresAt });

    await uploadDocument(
      PROJECT_ID,
      ITEM_ID,
      file as any,
      { name: 'Manual.pdf', expiresAt: expiresAt.toISOString() },
      USER_ID
    );

    expect(repository.createDocument).toHaveBeenCalledWith(ITEM_ID, expect.objectContaining({
      expiresAt,
    }));
  });
});

// ---------------------------------------------------------------------------
// listDocuments
// ---------------------------------------------------------------------------
describe('document service listDocuments', () => {
  it('requires project membership', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new Error('Unauthorized'));
    await expect(listDocuments(PROJECT_ID, ITEM_ID, USER_ID)).rejects.toThrow('Unauthorized');
  });

  it('returns documents for an item', async () => {
    vi.mocked(repository.findDocumentsByItem).mockResolvedValue([document]);

    const result = await listDocuments(PROJECT_ID, ITEM_ID, USER_ID);

    expect(repository.findDocumentsByItem).toHaveBeenCalledWith(ITEM_ID);
    expect(result.documents).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getDocument
// ---------------------------------------------------------------------------
describe('document service getDocument', () => {
  it('requires project membership', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new Error('Unauthorized'));
    await expect(getDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID)).rejects.toThrow('Unauthorized');
  });

  it('returns document with current version', async () => {
    vi.mocked(repository.findDocumentById).mockResolvedValue(document);

    const result = await getDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID);

    expect(repository.findDocumentById).toHaveBeenCalledWith(DOC_ID);
    expect(result.document).toEqual(document);
  });

  it('throws NotFoundError when document does not exist', async () => {
    vi.mocked(repository.findDocumentById).mockResolvedValue(null);

    await expect(
      getDocument(PROJECT_ID, ITEM_ID, 'doc-999', USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when document belongs to different item', async () => {
    const wrongItemDoc = { ...document, itemId: 'item-2' };
    vi.mocked(repository.findDocumentById).mockResolvedValue(wrongItemDoc);

    await expect(
      getDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------
describe('document service deleteDocument', () => {
  it('requires project membership', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new Error('Unauthorized'));
    await expect(deleteDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID)).rejects.toThrow('Unauthorized');
  });

  it('deletes document and its files', async () => {
    vi.mocked(repository.findDocumentById).mockResolvedValue(document);
    vi.mocked(repository.findVersionsByDocument).mockResolvedValue([documentVersion]);
    vi.mocked(repository.deleteDocument).mockResolvedValue(undefined);
    mockStorageDriver.deleteFile.mockResolvedValue(undefined);

    await deleteDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID);

    expect(repository.findDocumentById).toHaveBeenCalledWith(DOC_ID);
    expect(repository.findVersionsByDocument).toHaveBeenCalledWith(DOC_ID);
    expect(mockStorageDriver.deleteFile).toHaveBeenCalledWith(documentVersion.storagePath);
    expect(repository.deleteDocument).toHaveBeenCalledWith(DOC_ID);
  });

  it('throws NotFoundError when document does not exist', async () => {
    vi.mocked(repository.findDocumentById).mockResolvedValue(null);

    await expect(
      deleteDocument(PROJECT_ID, ITEM_ID, 'doc-999', USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when document belongs to different item', async () => {
    const wrongItemDoc = { ...document, itemId: 'item-2' };
    vi.mocked(repository.findDocumentById).mockResolvedValue(wrongItemDoc);

    await expect(
      deleteDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// downloadDocument
// ---------------------------------------------------------------------------
describe('document service downloadDocument', () => {
  it('requires project membership', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new Error('Unauthorized'));
    await expect(downloadDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID)).rejects.toThrow('Unauthorized');
  });

  it('returns file buffer and metadata', async () => {
    const fileBuffer = Buffer.from('file content');
    vi.mocked(repository.findDocumentById).mockResolvedValue(document);
    vi.mocked(repository.findVersionsByDocument).mockResolvedValue([documentVersion]);
    mockStorageDriver.readFile.mockResolvedValue(fileBuffer);

    const result = await downloadDocument(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID);

    expect(repository.findDocumentById).toHaveBeenCalledWith(DOC_ID);
    expect(repository.findVersionsByDocument).toHaveBeenCalledWith(DOC_ID);
    expect(mockStorageDriver.readFile).toHaveBeenCalledWith(documentVersion.storagePath);
    expect(result.buffer).toEqual(fileBuffer);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName).toBe('manual-v1.pdf');
  });

  it('throws NotFoundError when document does not exist', async () => {
    vi.mocked(repository.findDocumentById).mockResolvedValue(null);

    await expect(
      downloadDocument(PROJECT_ID, ITEM_ID, 'doc-999', USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// getVersionHistory
// ---------------------------------------------------------------------------
describe('document service getVersionHistory', () => {
  it('requires project membership', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new Error('Unauthorized'));
    await expect(getVersionHistory(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID)).rejects.toThrow('Unauthorized');
  });

  it('returns version history ordered desc', async () => {
    const version2 = { ...documentVersion, id: 'ver-2', version: 2 };
    vi.mocked(repository.findDocumentById).mockResolvedValue(document);
    vi.mocked(repository.findVersionsByDocument).mockResolvedValue([version2, documentVersion]);

    const result = await getVersionHistory(PROJECT_ID, ITEM_ID, DOC_ID, USER_ID);

    expect(repository.findVersionsByDocument).toHaveBeenCalledWith(DOC_ID);
    expect(result.versions).toHaveLength(2);
    expect(result.versions[0].version).toBe(2);
  });

  it('throws NotFoundError when document does not exist', async () => {
    vi.mocked(repository.findDocumentById).mockResolvedValue(null);

    await expect(
      getVersionHistory(PROJECT_ID, ITEM_ID, 'doc-999', USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// updateDocumentMetadata
// ---------------------------------------------------------------------------
describe('document service updateDocumentMetadata', () => {
  it('requires project membership', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new Error('Unauthorized'));
    await expect(
      updateDocumentMetadata(PROJECT_ID, ITEM_ID, DOC_ID, { name: 'Updated' }, USER_ID)
    ).rejects.toThrow('Unauthorized');
  });

  it('updates document name', async () => {
    const updatedDoc = { ...document, name: 'Updated Manual.pdf' };
    vi.mocked(repository.findDocumentById).mockResolvedValue(document);
    vi.mocked(repository.updateDocument).mockResolvedValue(updatedDoc);

    const result = await updateDocumentMetadata(
      PROJECT_ID,
      ITEM_ID,
      DOC_ID,
      { name: 'Updated Manual.pdf' },
      USER_ID
    );

    expect(repository.updateDocument).toHaveBeenCalledWith(DOC_ID, { name: 'Updated Manual.pdf' });
    expect(result.document.name).toBe('Updated Manual.pdf');
  });

  it('throws NotFoundError when document does not exist', async () => {
    vi.mocked(repository.findDocumentById).mockResolvedValue(null);

    await expect(
      updateDocumentMetadata(PROJECT_ID, ITEM_ID, 'doc-999', { name: 'Updated' }, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when document belongs to different item', async () => {
    const wrongItemDoc = { ...document, itemId: 'item-2' };
    vi.mocked(repository.findDocumentById).mockResolvedValue(wrongItemDoc);

    await expect(
      updateDocumentMetadata(PROJECT_ID, ITEM_ID, DOC_ID, { name: 'Updated' }, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
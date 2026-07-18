import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock Prisma client — inline factories to avoid Vitest hoisting issues
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    documentVersion: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// Import production code — RED until GREEN
import {
  createDocument,
  findDocumentsByItem,
  findDocumentById,
  deleteDocument,
  updateDocument,
  createDocumentVersion,
  findVersionsByDocument,
} from './document-repository';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const item = {
  id: 'item-1',
  name: 'Industrial Pump A',
  itemTypeId: 'type-1',
};

const document = {
  id: 'doc-1',
  itemId: 'item-1',
  name: 'Manual.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  expiresAt: null,
  currentVersionId: 'ver-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const documentVersion = {
  id: 'ver-1',
  documentId: 'doc-1',
  version: 1,
  fileName: 'manual-v1.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  storagePath: 'project-1/item-1/ver-1-manual-v1.pdf',
  uploadedBy: 'user-1',
  createdAt: new Date(),
};

const documentVersion2 = {
  ...documentVersion,
  id: 'ver-2',
  version: 2,
  fileName: 'manual-v2.pdf',
  storagePath: 'project-1/item-1/ver-2-manual-v2.pdf',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createDocument
// ---------------------------------------------------------------------------
describe('createDocument', () => {
  const createData = {
    name: 'Manual.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    expiresAt: null,
  };

  it('creates a document for an item', async () => {
    (db.document.create as ReturnType<typeof vi.fn>).mockResolvedValue(document);

    const result = await createDocument('item-1', createData);

    expect(db.document.create).toHaveBeenCalledWith({
      data: {
        itemId: 'item-1',
        name: 'Manual.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        expiresAt: null,
      },
    });
    expect(result).toEqual(document);
  });

  it('creates a document with expiration date', async () => {
    const expiresAt = new Date('2025-12-31');
    const docWithExpiry = { ...document, expiresAt };
    (db.document.create as ReturnType<typeof vi.fn>).mockResolvedValue(docWithExpiry);

    const result = await createDocument('item-1', { ...createData, expiresAt });

    expect(db.document.create).toHaveBeenCalledWith({
      data: {
        itemId: 'item-1',
        name: 'Manual.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        expiresAt,
      },
    });
    expect(result.expiresAt).toEqual(expiresAt);
  });
});

// ---------------------------------------------------------------------------
// findDocumentsByItem
// ---------------------------------------------------------------------------
describe('findDocumentsByItem', () => {
  it('returns all documents for an item with current version', async () => {
    (db.document.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([document]);

    const result = await findDocumentsByItem('item-1');

    expect(db.document.findMany).toHaveBeenCalledWith({
      where: { itemId: 'item-1' },
      include: { currentVersion: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].currentVersionId).toBe('ver-1');
  });

  it('returns empty array when no documents exist', async () => {
    (db.document.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await findDocumentsByItem('item-999');

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findDocumentById
// ---------------------------------------------------------------------------
describe('findDocumentById', () => {
  it('returns a single document by id', async () => {
    (db.document.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(document);

    const result = await findDocumentById('doc-1');

    expect(db.document.findFirst).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      include: { currentVersion: true },
    });
    expect(result).toEqual(document);
  });

  it('returns null for a non-existent document', async () => {
    (db.document.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await findDocumentById('doc-999');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------
describe('deleteDocument', () => {
  it('deletes a document and its versions', async () => {
    (db.document.delete as ReturnType<typeof vi.fn>).mockResolvedValue(document);

    await deleteDocument('doc-1');

    expect(db.document.delete).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
    });
  });

  it('throws NotFoundError when document does not exist', async () => {
    (db.document.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Record to delete does not exist')
    );

    await expect(deleteDocument('doc-999')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateDocument
// ---------------------------------------------------------------------------
describe('updateDocument', () => {
  const updateData = { name: 'Updated Manual.pdf' };

  it('updates document metadata', async () => {
    const updatedDoc = { ...document, ...updateData };
    (db.document.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDoc);

    const result = await updateDocument('doc-1', updateData);

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: updateData,
    });
    expect(result.name).toBe('Updated Manual.pdf');
  });

  it('updates expiration date', async () => {
    const expiresAt = new Date('2025-12-31');
    const updatedDoc = { ...document, expiresAt };
    (db.document.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDoc);

    const result = await updateDocument('doc-1', { expiresAt });

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { expiresAt },
    });
    expect(result.expiresAt).toEqual(expiresAt);
  });

  it('clears expiration date when set to null', async () => {
    const updatedDoc = { ...document, expiresAt: null };
    (db.document.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDoc);

    const result = await updateDocument('doc-1', { expiresAt: null });

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { expiresAt: null },
    });
    expect(result.expiresAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createDocumentVersion
// ---------------------------------------------------------------------------
describe('createDocumentVersion', () => {
  const versionData = {
    version: 1,
    fileName: 'manual-v1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storagePath: 'project-1/item-1/ver-1-manual-v1.pdf',
    uploadedBy: 'user-1',
  };

  it('creates a document version', async () => {
    (db.documentVersion.create as ReturnType<typeof vi.fn>).mockResolvedValue(documentVersion);

    const result = await createDocumentVersion('doc-1', versionData);

    expect(db.documentVersion.create).toHaveBeenCalledWith({
      data: {
        documentId: 'doc-1',
        version: 1,
        fileName: 'manual-v1.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storagePath: 'project-1/item-1/ver-1-manual-v1.pdf',
        uploadedBy: 'user-1',
      },
    });
    expect(result).toEqual(documentVersion);
  });

  it('creates a second version', async () => {
    (db.documentVersion.create as ReturnType<typeof vi.fn>).mockResolvedValue(documentVersion2);

    const result = await createDocumentVersion('doc-1', {
      ...versionData,
      version: 2,
      fileName: 'manual-v2.pdf',
      storagePath: 'project-1/item-1/ver-2-manual-v2.pdf',
    });

    expect(result.version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// findVersionsByDocument
// ---------------------------------------------------------------------------
describe('findVersionsByDocument', () => {
  it('returns all versions for a document ordered desc', async () => {
    (db.documentVersion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      documentVersion2,
      documentVersion,
    ]);

    const result = await findVersionsByDocument('doc-1');

    expect(db.documentVersion.findMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1' },
      orderBy: { version: 'desc' },
    });
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe(2);
    expect(result[1].version).toBe(1);
  });

  it('returns empty array when no versions exist', async () => {
    (db.documentVersion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await findVersionsByDocument('doc-999');

    expect(result).toHaveLength(0);
  });
});
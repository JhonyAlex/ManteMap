import { uploadDocumentSchema, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@mantemap/validation';
import { NotFoundError, ValidationError } from '@mantemap/shared';
import {
  createDocument,
  findDocumentsByItem,
  findDocumentById,
  deleteDocument as deleteDocumentRepo,
  updateDocument,
  createDocumentVersion,
  findVersionsByDocument,
  type CreateDocumentData,
} from '@/lib/repositories/document-repository';
import { getStorageDriver } from '@/lib/storage';
import { requireProjectMember } from '@/lib/services/project-access-service';
import { generateAlert } from '@/lib/services/alert-service';
import { mapDaysToSeverity } from '@/lib/services/alert-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadDocumentInput = {
  name: string;
  expiresAt?: string | null;
};

export type UpdateDocumentMetadataInput = {
  name?: string;
  expiresAt?: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(`File size ${size} bytes exceeds maximum of ${MAX_FILE_SIZE_BYTES} bytes`);
  }
}

function validateFileType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
    throw new ValidationError(`File type ${mimeType} not allowed. Allowed types: pdf, png, jpg, jpeg, gif, doc, docx, xls, xlsx, csv, txt, dwg, dxf`);
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function uploadDocument(
  projectId: string,
  itemId: string,
  file: File,
  input: UploadDocumentInput,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  // Validate file size and type
  validateFileSize(file.size);
  validateFileType(file.type);

  // Parse and validate input
  const parsed = uploadDocumentSchema.parse({
    ...input,
    sizeBytes: file.size,
    mimeType: file.type,
  });

  // Store file via storage driver
  const storageDriver = getStorageDriver();
  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = `${projectId}/${itemId}/${Date.now()}-${file.name}`;
  const storagePath = await storageDriver.writeFile(buffer, relativePath);

  // Create document record
  const document = await createDocument(itemId, {
    name: parsed.name,
    mimeType: file.type,
    sizeBytes: file.size,
    expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
  });

  // Create initial version
  const version = await createDocumentVersion(document.id, {
    version: 1,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath,
    uploadedBy: userId,
  });

  // Update document with current version
  await updateDocument(document.id, { currentVersionId: version.id });

  return { document, version };
}

export async function listDocuments(
  projectId: string,
  itemId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const documents = await findDocumentsByItem(itemId);
  return { documents };
}

export async function getDocument(
  projectId: string,
  itemId: string,
  documentId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const document = await findDocumentById(documentId);
  if (!document) throw new NotFoundError('Document', documentId);
  if (document.itemId !== itemId) throw new NotFoundError('Document', documentId);
  return { document };
}

export async function deleteDocument(
  projectId: string,
  itemId: string,
  documentId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const document = await findDocumentById(documentId);
  if (!document) throw new NotFoundError('Document', documentId);
  if (document.itemId !== itemId) throw new NotFoundError('Document', documentId);

  // Get all versions to delete files
  const versions = await findVersionsByDocument(documentId);
  const storageDriver = getStorageDriver();

  // Delete files from storage
  for (const version of versions) {
    try {
      await storageDriver.deleteFile(version.storagePath);
    } catch (error) {
      // Log but don't fail if file already missing
      console.warn(`Failed to delete file ${version.storagePath}:`, error);
    }
  }

  // Delete document (cascade deletes versions)
  await deleteDocumentRepo(documentId);
}

export async function downloadDocument(
  projectId: string,
  itemId: string,
  documentId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const document = await findDocumentById(documentId);
  if (!document) throw new NotFoundError('Document', documentId);
  if (document.itemId !== itemId) throw new NotFoundError('Document', documentId);

  // Get latest version
  const versions = await findVersionsByDocument(documentId);
  if (versions.length === 0) throw new NotFoundError('Document version', documentId);

  const latestVersion = versions[0]; // Already sorted desc
  const storageDriver = getStorageDriver();
  const buffer = await storageDriver.readFile(latestVersion.storagePath);

  return {
    buffer,
    mimeType: latestVersion.mimeType,
    fileName: latestVersion.fileName,
  };
}

export async function getVersionHistory(
  projectId: string,
  itemId: string,
  documentId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const document = await findDocumentById(documentId);
  if (!document) throw new NotFoundError('Document', documentId);
  if (document.itemId !== itemId) throw new NotFoundError('Document', documentId);

  const versions = await findVersionsByDocument(documentId);
  return { versions };
}

export async function updateDocumentMetadata(
  projectId: string,
  itemId: string,
  documentId: string,
  input: UpdateDocumentMetadataInput,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const document = await findDocumentById(documentId);
  if (!document) throw new NotFoundError('Document', documentId);
  if (document.itemId !== itemId) throw new NotFoundError('Document', documentId);

  const updateData: { name?: string; expiresAt?: Date | null } = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.expiresAt !== undefined) {
    updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  }

  const updated = await updateDocument(documentId, updateData);

  // Fire-and-forget: generate alert when expiresAt changes
  if (input.expiresAt !== undefined) {
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    const days = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
      : 0;
    const severity = expiresAt ? mapDaysToSeverity(days) : 'INFO';

    void generateAlert(projectId, {
      alertType: 'DOCUMENT_EXPIRING',
      severity,
      sourceType: 'document',
      sourceId: documentId,
      title: expiresAt
        ? `Document "${document.name}" expires in ${days} day${days !== 1 ? 's' : ''}`
        : `Document "${document.name}" expiration cleared`,
      message: expiresAt
        ? `This document expires on ${expiresAt.toISOString().split('T')[0]}`
        : `Expiration date has been removed.`,
      metadata: { daysUntilExpiry: days },
    });
  }

  return { document: updated };
}
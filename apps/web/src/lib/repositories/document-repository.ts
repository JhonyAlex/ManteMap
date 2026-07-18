import type { Prisma } from '@mantemap/database';
import prisma from '@mantemap/database';
import type { Document, DocumentVersion, PrismaClient } from '@mantemap/database';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateDocumentData = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt?: Date | null;
};

export type UpdateDocumentData = {
  name?: string;
  expiresAt?: Date | null;
  currentVersionId?: string | null;
};

export type CreateDocumentVersionData = {
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
};

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function createDocument(
  itemId: string,
  data: CreateDocumentData,
  client: PrismaClient = prisma
): Promise<Document> {
  return client.document.create({
    data: {
      itemId,
      name: data.name,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      expiresAt: data.expiresAt ?? null,
    },
  });
}

export async function findDocumentsByItem(
  itemId: string,
  client: PrismaClient = prisma
): Promise<Document[]> {
  return client.document.findMany({
    where: { itemId },
    include: { currentVersion: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findDocumentById(
  documentId: string,
  client: PrismaClient = prisma
): Promise<Document | null> {
  return client.document.findFirst({
    where: { id: documentId },
    include: { currentVersion: true },
  });
}

export async function deleteDocument(
  documentId: string,
  client: PrismaClient = prisma
): Promise<void> {
  await client.document.delete({
    where: { id: documentId },
  });
}

export async function updateDocument(
  documentId: string,
  data: UpdateDocumentData,
  client: PrismaClient = prisma
): Promise<Document> {
  return client.document.update({
    where: { id: documentId },
    data,
  });
}

export async function createDocumentVersion(
  documentId: string,
  data: CreateDocumentVersionData,
  client: PrismaClient = prisma
): Promise<DocumentVersion> {
  return client.documentVersion.create({
    data: {
      documentId,
      version: data.version,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      storagePath: data.storagePath,
      uploadedBy: data.uploadedBy,
    },
  });
}

export async function findVersionsByDocument(
  documentId: string,
  client: PrismaClient = prisma
): Promise<DocumentVersion[]> {
  return client.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: 'desc' },
  });
}

/**
 * Find documents with expiresAt on or before the given date.
 * Used by the alert scan to find expiring documents.
 */
export async function findExpiringDocuments(
  projectId: string,
  beforeDate: Date,
  client: PrismaClient = prisma
): Promise<Document[]> {
  return client.document.findMany({
    where: {
      item: { itemType: { projectId } },
      expiresAt: { lte: beforeDate, not: null },
    },
    orderBy: { expiresAt: 'asc' },
  });
}
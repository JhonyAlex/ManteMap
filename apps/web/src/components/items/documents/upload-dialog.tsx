/**
 * UploadDialog — dialog for uploading a document to an item.
 *
 * Provides file input, name field, optional expiration date,
 * and client-side validation before multipart submission.
 *
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document Upload" — multipart form with validation
 *   "Reject oversized file" — client-side >50MB check
 *   "Reject disallowed type" — client-side .exe check
 * Design: openspec/changes/phase-5-documents/design.md
 *   "dialog with file input, name field, optional expiresAt, multipart submit"
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
} from '@mantemap/ui';
import { useUploadDocument } from '@/hooks/use-documents';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@mantemap/validation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UploadDialogProps {
  projectId: string;
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return `File type not allowed. Allowed types: pdf, png, jpg, jpeg, gif, doc, docx, xls, xlsx, csv, txt, dwg, dxf`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UploadDialog({
  projectId,
  itemId,
  open,
  onOpenChange,
}: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const uploadMutation = useUploadDocument(projectId, itemId);

  // Close on success
  useEffect(() => {
    if (uploadMutation.isSuccess) {
      onOpenChange(false);
    }
  }, [uploadMutation.isSuccess, onOpenChange]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFile(null);
      setName('');
      setExpiresAt('');
      setErrors({});
    }
  }, [open]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] ?? null;
      setFile(selected);
      if (selected) {
        const error = validateFile(selected);
        if (error) {
          setErrors((prev) => ({ ...prev, file: error }));
        } else {
          setErrors((prev) => {
            const { file: _fileError, ...rest } = prev;
            return rest;
          });
        }
      }
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const newErrors: Record<string, string> = {};

      if (!file) {
        newErrors.file = 'File is required';
      } else {
        const fileError = validateFile(file);
        if (fileError) newErrors.file = fileError;
      }

      if (!name.trim()) {
        newErrors.name = 'Name is required';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const formData = new FormData();
      formData.append('file', file!);
      formData.append('name', name.trim());
      if (expiresAt) {
        formData.append('expiresAt', new Date(expiresAt).toISOString());
      }

      uploadMutation.mutate(formData);
    },
    [file, name, expiresAt, uploadMutation]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Attach a file to this item. Max 50MB.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File input */}
          <div className="space-y-2">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              onChange={handleFileChange}
              accept={ALLOWED_MIME_TYPES.join(',')}
            />
            {errors.file && (
              <p className="text-sm text-destructive">{errors.file}</p>
            )}
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="doc-name">Name</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Document name"
              maxLength={255}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Optional expiration date */}
          <div className="space-y-2">
            <Label htmlFor="doc-expires">Expiration Date (optional)</Label>
            <Input
              id="doc-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InspectionFormProps {
  projectId: string;
  itemId: string;
  userId: string;
  /** Current status ID to display (read-only for now). */
  currentStatusId?: string;
  /** Called when the form submits with notes and optional fields. */
  onSubmit: (data: {
    notes?: string;
    statusId?: string;
    photoPath?: string;
  }) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectionForm({
  onSubmit,
  userId: _userId,
  projectId: _projectId,
  itemId: _itemId,
  currentStatusId: _currentStatusId,
}: InspectionFormProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        await onSubmit({
          notes: notes.trim() || undefined,
          statusId: undefined,
          photoPath: undefined,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [notes, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Log Inspection</h3>

      <div>
        <textarea
          placeholder="Add inspection notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full min-h-[48px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        size="lg"
        className="w-full min-h-[48px]"
      >
        {submitting ? 'Saving...' : 'Log Inspection'}
      </Button>
    </form>
  );
}

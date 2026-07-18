/**
 * StatusTransition — Client Component for changing item status.
 *
 * Renders a DropdownMenu with available status transitions.
 * Disabled when current status isFinal.
 * Shows toast notifications on transition errors (409, 404).
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Status transition UI"
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Status transition as DropdownMenu on detail page"
 */

'use client';

import React, { useCallback } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@mantemap/ui';
import { useTransitionStatus } from '@/hooks/use-items';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusOption {
  id: string;
  name: string;
  key: string;
  color: string;
  isFinal: boolean;
}

export interface StatusTransitionProps {
  projectId: string;
  itemId: string;
  currentStatusId: string | null;
  availableStatuses: StatusOption[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusTransition({
  projectId,
  itemId,
  currentStatusId,
  availableStatuses,
}: StatusTransitionProps) {
  const transitionMutation = useTransitionStatus(projectId, itemId);

  const currentStatus = availableStatuses.find((s) => s.id === currentStatusId);
  const isFinal = currentStatus?.isFinal ?? false;

  // Filter out the current status from available transitions
  const transitions = availableStatuses.filter((s) => s.id !== currentStatusId);

  const handleTransition = useCallback(
    async (statusId: string) => {
      try {
        await transitionMutation.mutateAsync(statusId);
        const targetStatus = availableStatuses.find((s) => s.id === statusId);
        toast.success(`Status changed to "${targetStatus?.name ?? statusId}"`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to change status';
        toast.error(message);
      }
    },
    [transitionMutation, availableStatuses]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isFinal}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        Change Status
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Transition to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {transitions.length === 0 ? (
          <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
        ) : (
          transitions.map((status) => (
            <DropdownMenuItem
              key={status.id}
              onClick={() => handleTransition(status.id)}
              disabled={transitionMutation.isPending}
            >
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: status.color }}
                aria-hidden="true"
              />
              {status.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

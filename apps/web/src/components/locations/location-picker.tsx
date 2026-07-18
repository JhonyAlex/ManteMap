/**
 * LocationPicker — Searchable tree-select for assigning locations.
 *
 * Renders a dropdown with the full location hierarchy for selection.
 * Displays the full path of the selected location (e.g., "Center > Building > Floor").
 * Supports search filtering and clear action.
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-assignment/spec.md
 *   "LocationPicker component" — searchable tree-select, display path, clear
 * Design: openspec/changes/phase-7-locations/design.md
 *   "LocationPicker for forms"
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocationTree } from '@/hooks/use-locations';
import type { LocationTreeNode } from '@/hooks/use-locations';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LocationPickerProps {
  projectId: string;
  value?: string | null;
  onChange?: (locationId: string | null) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers — find path to a node
// ---------------------------------------------------------------------------

function findPath(
  nodes: LocationTreeNode[],
  targetId: string,
  path: LocationTreeNode[] = []
): LocationTreeNode[] | null {
  for (const node of nodes) {
    const currentPath = [...path, node];
    if (node.id === targetId) {
      return currentPath;
    }
    if (node.children.length > 0) {
      const found = findPath(node.children, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Build a flat list of nodes that match a search filter.
 * A node matches if its name contains the search text (case-insensitive).
 * Only matching nodes are included (no parent inclusion).
 */
function filterTree(
  nodes: LocationTreeNode[],
  search: string
): LocationTreeNode[] {
  const lowerSearch = search.toLowerCase();
  const result: LocationTreeNode[] = [];

  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, search);
    const nameMatches = node.name.toLowerCase().includes(lowerSearch);

    if (nameMatches) {
      // Node matches — include with all its original children
      result.push(node);
    } else if (filteredChildren.length > 0) {
      // Node doesn't match but has matching descendants
      result.push({
        ...node,
        children: filteredChildren,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// TreeNodeOption — recursive dropdown option
// ---------------------------------------------------------------------------

interface TreeNodeOptionProps {
  node: LocationTreeNode;
  depth: number;
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

function TreeNodeOption({ node, depth, selectedId, onSelect }: TreeNodeOptionProps) {
  const isSelected = node.id === selectedId;

  return (
    <>
      <button
        type="button"
        className={`flex w-full items-center py-1.5 px-2 text-sm hover:bg-accent ${
          isSelected ? 'bg-accent font-medium text-primary' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {node.name}
      </button>
      {node.children.map((child) => (
        <TreeNodeOption
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// LocationPicker
// ---------------------------------------------------------------------------

export function LocationPicker({
  projectId,
  value,
  onChange,
  disabled = false,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: tree, isLoading } = useLocationTree(projectId);

  // Find the path to the selected location
  const selectedPath = useMemo(() => {
    if (!value || !tree) return null;
    return findPath(tree, value);
  }, [value, tree]);

  const displayText = useMemo(() => {
    if (!selectedPath) return null;
    return selectedPath.map((n) => n.name).join(' > ');
  }, [selectedPath]);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    if (!tree || !search.trim()) return tree ?? [];
    return filterTree(tree, search.trim());
  }, [tree, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = useCallback(
    (id: string) => {
      onChange?.(id);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(null);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <span className={displayText ? '' : 'text-muted-foreground'}>
          {displayText ?? 'Select location...'}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              aria-label="Clear location"
              onClick={handleClear}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search input */}
          <div className="border-b p-2">
            <input
              type="text"
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-sm border bg-background px-2 text-sm focus-visible:outline-none"
              autoFocus
            />
          </div>

          {/* Tree */}
          <div className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Loading locations...
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No locations found.
              </div>
            ) : (
              filteredTree.map((node) => (
                <TreeNodeOption
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={value}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

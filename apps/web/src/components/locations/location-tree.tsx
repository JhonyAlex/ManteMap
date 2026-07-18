/**
 * LocationTree — Recursive tree view for hierarchical locations.
 *
 * Renders locations as an expandable tree with indentation for depth levels.
 * Supports selection highlighting and expand/collapse.
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Tree endpoint" — renders hierarchical tree
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Hierarchical location tree component"
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { TreeNode } from '@/lib/repositories/location-repository';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LocationTreeProps {
  tree: TreeNode[];
  projectId: string;
  selectedId?: string;
  defaultExpanded?: boolean;
  onSelect?: (node: TreeNode) => void;
}

// ---------------------------------------------------------------------------
// TreeNodeItem — recursive node
// ---------------------------------------------------------------------------

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedId?: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (node: TreeNode) => void;
}

function TreeNodeItem({ node, depth, selectedId, expanded, onToggle, onSelect }: TreeNodeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = node.id === selectedId;

  const handleToggle = useCallback(() => {
    onToggle(node.id);
  }, [node.id, onToggle]);

  const handleSelect = useCallback(() => {
    onSelect?.(node);
  }, [node, onSelect]);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 rounded-md hover:bg-accent cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        data-selected={isSelected ? 'true' : undefined}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            <svg
              className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
          </span>
        )}
        <button
          onClick={handleSelect}
          className={`flex-1 text-left text-sm ${isSelected ? 'font-medium text-primary' : 'text-foreground'}`}
        >
          {node.name}
        </button>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LocationTree
// ---------------------------------------------------------------------------

export function LocationTree({
  tree,
  projectId,
  selectedId,
  defaultExpanded = false,
  onSelect,
}: LocationTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (!defaultExpanded) return new Set();
    // Expand all nodes by default
    const ids = new Set<string>();
    const collect = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          ids.add(node.id);
          collect(node.children);
        }
      }
    };
    collect(tree);
    return ids;
  });

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (tree.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No locations found.
      </div>
    );
  }

  return (
    <div className="space-y-0.5" role="tree" aria-label="Location tree">
      {tree.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          expanded={expanded}
          onToggle={handleToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

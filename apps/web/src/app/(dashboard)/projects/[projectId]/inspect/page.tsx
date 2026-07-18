'use client';

/**
 * Mobile Inspection Page — camera QR scanning with manual search fallback.
 *
 * Spec MI-001, MI-005, MI-006
 * Design: Slice C — Mobile Inspections
 */

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Input } from '@mantemap/ui';
import { useQRScanner } from '@/hooks/use-qr-scanner';
import type { Item } from '@mantemap/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract project slug and item slug from a ManteMap QR URL.
 * Pattern: {BASE_URL}/p/{projectSlug}/i/{itemSlug}
 */
function parseQrUrl(url: string): { projectSlug: string; itemSlug: string } | null {
  const match = url.match(/\/p\/([\w-]+)\/i\/([\w-]+)/i);
  if (!match) return null;
  return { projectSlug: match[1]!, itemSlug: match[2]! };
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = 'scan' | 'search';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InspectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function InspectPage({ params }: InspectPageProps) {
  // Unwrap params synchronously via React.use()
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.projectId;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>('scan');
  const [searchQuery, setSearchQuery] = useState('');

  // Camera scanner
  const { result: scannedUrl, error: scanError, scanning } = useQRScanner({
    targetElementId: 'qr-scanner-viewfinder',
  });

  // When a valid ManteMap QR is scanned, parse and navigate
  React.useEffect(() => {
    if (!scannedUrl) return;
    const parsed = parseQrUrl(scannedUrl);
    if (parsed) {
      router.push(`/projects/${projectId}/items/scan-result?projectSlug=${parsed.projectSlug}&itemSlug=${parsed.itemSlug}`);
    }
  }, [scannedUrl, projectId, router]);

  // Manual search — search items by name/slug
  const searchResults = useQuery({
    queryKey: ['inspect-search', projectId, searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(
        `/api/projects/${projectId}/items/search?q=${encodeURIComponent(searchQuery)}`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []) as Item[];
    },
    enabled: searchQuery.length >= 2,
  });

  const handleItemClick = useCallback(
    (itemId: string) => {
      router.push(`/projects/${projectId}/items/${itemId}?inspect=true`);
    },
    [projectId, router],
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Inspect</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium min-h-[44px] transition-colors ${
            activeTab === 'scan'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Scan QR
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium min-h-[44px] transition-colors ${
            activeTab === 'search'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Manual Search
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'scan' ? (
        <div className="space-y-4">
          {/* Camera viewfinder */}
          <div className="relative overflow-hidden rounded-lg border bg-black aspect-square">
            {scanning ? (
              <>
                <div
                  id="qr-scanner-viewfinder"
                  className="h-full w-full"
                />
                {/* Scan region overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-48 w-48 rounded-lg border-2 border-white/60" />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-white">
                <div className="text-center">
                  {scanError ? (
                    <p className="text-sm px-4">{scanError}</p>
                  ) : (
                    <p className="text-sm">Camera not active</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {scanError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{scanError}</p>
              <button
                onClick={() => setActiveTab('search')}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Search manually instead
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Manual search input */}
          <Input
            type="text"
            placeholder="Search items by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[48px] text-base"
          />

          {/* Search results */}
          {searchResults.isLoading && (
            <p className="text-sm text-muted-foreground">Searching...</p>
          )}

          {searchResults.data && searchResults.data.length > 0 && (
            <div className="divide-y rounded-lg border">
              {searchResults.data.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="flex w-full min-h-[48px] items-center px-4 py-3 text-left hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.slug}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchResults.data && searchResults.data.length === 0 && searchQuery.length >= 2 && (
            <p className="text-sm text-muted-foreground">No items found.</p>
          )}
        </div>
      )}
    </div>
  );
}

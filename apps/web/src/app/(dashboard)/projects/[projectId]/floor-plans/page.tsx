'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createFloorPlanSchema, type CreateFloorPlanInput } from '@mantemap/validation';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FloorPlanItem {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  locationId: string;
  active: boolean;
  createdAt: string;
  location?: {
    id: string;
    name: string;
  };
}

interface LocationItem {
  id: string;
  name: string;
  level: number;
  active?: boolean;
}

interface FormErrors {
  name?: string;
  locationId?: string;
  imageUrl?: string;
  width?: string;
  height?: string;
  file?: string;
  general?: string;
}

interface FloorPlansPageProps {
  params: Promise<{ projectId: string }>;
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'Center',
  1: 'Building',
  2: 'Floor',
  3: 'Room',
  4: 'Zone',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FloorPlansPage({ params }: FloorPlansPageProps) {
  const { projectId } = React.use(params);
  const router = useRouter();

  const [floorPlans, setFloorPlans] = useState<FloorPlanItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [width, setWidth] = useState('800');
  const [height, setHeight] = useState('600');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchFloorPlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/floor-plans`);
      if (res.ok) {
        const body = await res.json();
        setFloorPlans(body.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/locations`);
      if (res.ok) {
        const body = await res.json();
        setLocations(body.data ?? []);
      }
    } catch {
      // silent
    }
  }, [projectId]);

  useEffect(() => {
    fetchFloorPlans();
    fetchLocations();
  }, [fetchFloorPlans, fetchLocations]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.svg'];
    if (!allowedExts.includes(ext)) {
      setErrors({ file: `Unsupported format. Allowed: ${allowedExts.join(', ')}` });
      return;
    }

    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ file: 'File size exceeds 10 MB limit.' });
      return;
    }

    setSelectedFile(file);
    setErrors({});
  }

  async function handleUrlUpload(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload = {
      name,
      locationId: selectedLocationId,
      imageUrl,
      width: Number(width),
      height: Number(height),
    };

    let parsed: CreateFloorPlanInput;
    try {
      parsed = createFloorPlanSchema.parse(payload);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        for (const issue of err.issues) {
          const f = issue.path[0] as keyof FormErrors;
          if (f === 'name' || f === 'locationId' || f === 'imageUrl' || f === 'width' || f === 'height') {
            fieldErrors[f] = issue.message;
          }
        }
        setErrors(fieldErrors);
      }
      return;
    }

    await submitFloorPlan(parsed);
  }

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!selectedFile) {
      setErrors({ file: 'Please select a file to upload.' });
      return;
    }

    if (!name.trim()) {
      setErrors({ name: 'Name is required.' });
      return;
    }

    if (!selectedLocationId) {
      setErrors({ locationId: 'Location is required.' });
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', name.trim());
      formData.append('locationId', selectedLocationId);

      // Get image dimensions from the file
      const dims = await getImageDimensions(selectedFile);
      formData.append('width', String(dims.width));
      formData.append('height', String(dims.height));

      const res = await fetch(`/api/projects/${projectId}/floor-plans`, {
        method: 'POST',
        body: formData,
      });

      if (res.status === 201) {
        resetForm();
        setShowForm(false);
        fetchFloorPlans();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      setErrors({ general: body.message || 'Failed to upload floor plan.' });
    } catch {
      setErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsCreating(false);
    }
  }

  async function submitFloorPlan(parsed: CreateFloorPlanInput) {
    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/floor-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.status === 201) {
        resetForm();
        setShowForm(false);
        fetchFloorPlans();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      setErrors({ general: body.message || 'Failed to create floor plan.' });
    } catch {
      setErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsCreating(false);
    }
  }

  function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to read image dimensions'));
      };
      img.src = url;
    });
  }

  function resetForm() {
    setName('');
    setSelectedLocationId('');
    setImageUrl('');
    setWidth('800');
    setHeight('600');
    setSelectedFile(null);
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    if (uploadMode === 'file') {
      handleFileUpload(e);
    } else {
      handleUrlUpload(e);
    }
  }

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Floor Plans</h2>
          <p className="text-sm text-muted-foreground">
            Upload and manage interactive floor plans with markers and polygons.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upload Plan
          </button>
        )}
      </div>

      {/* Create/Upload form */}
      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="mb-8 rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">Upload Floor Plan</h3>

          {errors.general && (
            <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {/* Upload mode toggle */}
            <div className="flex rounded-md border">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 rounded-l-md px-4 py-2 text-sm font-medium ${
                  uploadMode === 'file'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-accent'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 rounded-r-md px-4 py-2 text-sm font-medium ${
                  uploadMode === 'url'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-accent'
                }`}
              >
                Image URL
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div>
                <label htmlFor="fp-file" className="mb-1 block text-sm font-medium">Floor Plan Image</label>
                <input
                  id="fp-file"
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleFileChange}
                  className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground"
                />
                {errors.file && <p className="mt-1 text-sm text-destructive">{errors.file}</p>}
                {selectedFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="fp-url" className="mb-1 block text-sm font-medium">Image URL</label>
                <input
                  id="fp-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="https://example.com/floor-plan.png"
                />
                {errors.imageUrl && <p className="mt-1 text-sm text-destructive">{errors.imageUrl}</p>}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="fp-width" className="mb-1 block text-xs text-muted-foreground">Width (px)</label>
                    <input
                      id="fp-width"
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      min={1}
                    />
                    {errors.width && <p className="mt-1 text-sm text-destructive">{errors.width}</p>}
                  </div>
                  <div>
                    <label htmlFor="fp-height" className="mb-1 block text-xs text-muted-foreground">Height (px)</label>
                    <input
                      id="fp-height"
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      min={1}
                    />
                    {errors.height && <p className="mt-1 text-sm text-destructive">{errors.height}</p>}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="fp-name" className="mb-1 block text-sm font-medium">Plan Name</label>
              <input
                id="fp-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="e.g. First Floor"
                maxLength={200}
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="fp-location" className="mb-1 block text-sm font-medium">Location</label>
              <select
                id="fp-location"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select a location...</option>
                {locations
                  .filter((l) => l.active !== false)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      [{LEVEL_LABELS[loc.level] ?? `L${loc.level}`}] {loc.name}
                    </option>
                  ))}
              </select>
              {errors.locationId && <p className="mt-1 text-sm text-destructive">{errors.locationId}</p>}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? 'Uploading...' : 'Upload Plan'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Floor plans list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : floorPlans.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            No floor plans uploaded yet. Upload your first floor plan to start placing markers.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upload First Plan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {floorPlans.map((plan) => (
            <div key={plan.id} className="overflow-hidden rounded-lg border">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                <img
                  src={plan.imageUrl}
                  alt={plan.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.width}×{plan.height}px
                    {plan.location && <span> · {plan.location.name}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {plan.active === false && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                  <a
                    href={`/projects/${projectId}/floor-plans/${plan.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

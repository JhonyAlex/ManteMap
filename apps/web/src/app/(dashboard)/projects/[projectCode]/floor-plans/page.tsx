'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createFloorPlanSchema, type CreateFloorPlanInput } from '@mantemap/validation';
import { ZodError } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Skeleton,
} from '@mantemap/ui';
import { toast } from 'sonner';
import { Trash2, Plus, Map } from 'lucide-react';

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
  params: Promise<{ projectCode: string }>;
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
  const { projectCode: projectId } = React.use(params);
  const router = useRouter();

  const [floorPlans, setFloorPlans] = useState<FloorPlanItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [width, setWidth] = useState('800');
  const [height, setHeight] = useState('600');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<FloorPlanItem | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

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

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.svg'];
    if (!allowedExts.includes(ext)) {
      setErrors({ file: `Unsupported format. Allowed: ${allowedExts.join(', ')}` });
      return;
    }

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

      const dims = await getImageDimensions(selectedFile);
      formData.append('width', String(dims.width));
      formData.append('height', String(dims.height));

      const res = await fetch(`/api/projects/${projectId}/floor-plans`, {
        method: 'POST',
        body: formData,
      });

      if (res.status === 201) {
        resetForm();
        setDialogOpen(false);
        fetchFloorPlans();
        router.refresh();
        toast.success('Floor plan uploaded.');
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
        setDialogOpen(false);
        fetchFloorPlans();
        router.refresh();
        toast.success('Floor plan created.');
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

  function openDeleteDialog(plan: FloorPlanItem) {
    setPlanToDelete(plan);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!planToDelete) return;
    setDeletingPlanId(planToDelete.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/floor-plans/${planToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok || res.status === 204) {
        setDeleteOpen(false);
        setPlanToDelete(null);
        fetchFloorPlans();
        router.refresh();
        toast.success('Floor plan deleted.');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message || 'Failed to delete floor plan.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setDeletingPlanId(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    if (uploadMode === 'file') {
      handleFileUpload(e);
    } else {
      handleUrlUpload(e);
    }
  }

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
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Upload Plan
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Floor Plan</DialogTitle>
            <DialogDescription>
              Upload an image file or provide an image URL for a new floor plan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.general && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {errors.general}
              </div>
            )}

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
                <Label htmlFor="fp-file">Floor Plan Image</Label>
                <Input
                  id="fp-file"
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleFileChange}
                  className="file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground"
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
                <Label htmlFor="fp-url">Image URL</Label>
                <Input
                  id="fp-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/floor-plan.png"
                />
                {errors.imageUrl && <p className="mt-1 text-sm text-destructive">{errors.imageUrl}</p>}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Width (px)</Label>
                    <Input
                      id="fp-width"
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      min={1}
                    />
                    {errors.width && <p className="mt-1 text-sm text-destructive">{errors.width}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height (px)</Label>
                    <Input
                      id="fp-height"
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      min={1}
                    />
                    {errors.height && <p className="mt-1 text-sm text-destructive">{errors.height}</p>}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="fp-name">Plan Name</Label>
              <Input
                id="fp-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. First Floor"
                maxLength={200}
                autoFocus
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="fp-location">Location</Label>
              <Select value={selectedLocationId} onValueChange={(v) => setSelectedLocationId(v === 'none' ? '' : v)}>
                <SelectTrigger id="fp-location">
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a location...</SelectItem>
                  {locations
                    .filter((l) => l.active !== false)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        [{LEVEL_LABELS[loc.level] ?? `L${loc.level}`}] {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.locationId && <p className="mt-1 text-sm text-destructive">{errors.locationId}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Uploading...' : 'Upload Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {planToDelete?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{planToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deletingPlanId != null}>
              {deletingPlanId != null ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floor plans list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      ) : floorPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Map className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No floor plans yet</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Upload your first floor plan to start placing markers.
          </p>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />
            Upload First Plan
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {floorPlans.map((plan) => (
            <div key={plan.id} className="overflow-hidden rounded-lg border">
              <div className="relative aspect-video bg-muted">
                <img
                  src={`/api/projects/${projectId}/floor-plans/${plan.id}/image`}
                  alt={plan.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />\n              </div>
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
                  <Link
                    href={`/projects/${projectId}/floor-plans/${plan.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(plan)}
                    disabled={deletingPlanId === plan.id}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

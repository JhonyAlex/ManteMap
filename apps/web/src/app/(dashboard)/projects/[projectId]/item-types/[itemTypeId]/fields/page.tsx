'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createDynamicFieldSchema,
  type CreateDynamicFieldInput,
  updateDynamicFieldSchema,
  type UpdateDynamicFieldInput,
  reorderFieldsSchema,
  type ReorderFieldsInput,
  dynamicFieldTypeEnum,
  type DynamicFieldType,
} from '@mantemap/validation';
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
  Checkbox,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Skeleton,
} from '@mantemap/ui';
import { toast } from 'sonner';
import { Pencil, Trash2, Copy, GripVertical, Plus, Columns3 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldOption {
  label: string;
  value: string;
  color?: string;
}

interface DynamicFieldItem {
  id: string;
  name: string;
  key: string;
  type: DynamicFieldType;
  required: boolean;
  order: number;
  visible: boolean;
  description?: string | null;
  unit?: string | null;
  helpText?: string | null;
  placeholder?: string | null;
  defaultValue?: unknown;
  options?: FieldOption[];
  validation?: Record<string, unknown>;
  showInList?: boolean;
  showInSearch?: boolean;
  groupName?: string | null;
}

interface ItemTypeInfo {
  id: string;
  name: string;
  slug: string;
}

interface FormErrors {
  name?: string;
  key?: string;
  type?: string;
  options?: string;
  validation?: string;
  general?: string;
}

interface FieldsPageProps {
  params: Promise<{ projectId: string; itemTypeId: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_TYPES: { value: DynamicFieldType; label: string }[] = [
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'CURRENCY', label: 'Currency' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'Date & Time' },
  { value: 'SELECT', label: 'Select (Dropdown)' },
  { value: 'MULTI_SELECT', label: 'Multi-Select' },
  { value: 'URL', label: 'URL' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'FILE', label: 'File' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'ITEM_RELATION', label: 'Item Relation' },
  { value: 'LOCATION_RELATION', label: 'Location Relation' },
  { value: 'USER_RELATION', label: 'User Relation' },
];

const OPTIONS_REQUIRED_TYPES = new Set<DynamicFieldType>(['SELECT', 'MULTI_SELECT']);
const NUMERIC_TYPES = new Set<DynamicFieldType>(['NUMBER', 'DECIMAL', 'CURRENCY']);
const TEXT_TYPES = new Set<DynamicFieldType>(['SHORT_TEXT', 'LONG_TEXT']);
const DATE_TYPES = new Set<DynamicFieldType>(['DATE', 'DATETIME']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHumanTypeLabel(t: DynamicFieldType): string {
  return FIELD_TYPES.find((ft) => ft.value === t)?.label ?? t;
}

function buildValidationPayload(type: DynamicFieldType, raw: {
  valMin: string; valMax: string;
  valMinLength: string; valMaxLength: string;
  valPattern: string; valMinDate: string; valMaxDate: string;
}): Record<string, unknown> | undefined {
  if (NUMERIC_TYPES.has(type)) {
    if (raw.valMin || raw.valMax) {
      const v: Record<string, unknown> = {};
      if (raw.valMin) v.min = Number(raw.valMin);
      if (raw.valMax) v.max = Number(raw.valMax);
      return v;
    }
  } else if (TEXT_TYPES.has(type)) {
    if (raw.valMinLength || raw.valMaxLength || raw.valPattern) {
      const v: Record<string, unknown> = {};
      if (raw.valMinLength) v.minLength = Number(raw.valMinLength);
      if (raw.valMaxLength) v.maxLength = Number(raw.valMaxLength);
      if (raw.valPattern) v.pattern = raw.valPattern;
      return v;
    }
  } else if (DATE_TYPES.has(type)) {
    if (raw.valMinDate || raw.valMaxDate) {
      const v: Record<string, unknown> = {};
      if (raw.valMinDate) v.minDate = raw.valMinDate;
      if (raw.valMaxDate) v.maxDate = raw.valMaxDate;
      return v;
    }
  }
  return undefined;
}

function populateValidationFromField(field: DynamicFieldItem) {
  const v = field.validation ?? {};
  return {
    valMin: v.min != null ? String(v.min) : '',
    valMax: v.max != null ? String(v.max) : '',
    valMinLength: v.minLength != null ? String(v.minLength) : '',
    valMaxLength: v.maxLength != null ? String(v.maxLength) : '',
    valPattern: typeof v.pattern === 'string' ? v.pattern : '',
    valMinDate: typeof v.minDate === 'string' ? v.minDate : '',
    valMaxDate: typeof v.maxDate === 'string' ? v.maxDate : '',
  };
}

function generateCopyKey(originalKey: string, existingKeys: string[]): string {
  const base = `${originalKey}-copy`;
  if (!existingKeys.includes(base)) return base;
  let i = 2;
  while (existingKeys.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DynamicFieldsPage({ params }: FieldsPageProps) {
  const { projectId, itemTypeId } = React.use(params);
  const router = useRouter();

  const [itemType, setItemType] = useState<ItemTypeInfo | null>(null);
  const [fields, setFields] = useState<DynamicFieldItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<DynamicFieldType>('SHORT_TEXT');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [showInList, setShowInList] = useState(false);
  const [showInSearch, setShowInSearch] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [unit, setUnit] = useState('');
  const [order, setOrder] = useState('0');
  const [options, setOptions] = useState<FieldOption[]>([{ label: '', value: '' }]);
  const [valMin, setValMin] = useState('');
  const [valMax, setValMax] = useState('');
  const [valMinLength, setValMinLength] = useState('');
  const [valMaxLength, setValMaxLength] = useState('');
  const [valPattern, setValPattern] = useState('');
  const [valMinDate, setValMinDate] = useState('');
  const [valMaxDate, setValMaxDate] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<DynamicFieldItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchItemType = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}`);
      if (res.ok) {
        const body = await res.json();
        setItemType(body.data);
      }
    } catch {
      // silent
    }
  }, [projectId, itemTypeId]);

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/fields`);
      if (res.ok) {
        const body = await res.json();
        setFields(body.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [projectId, itemTypeId]);

  useEffect(() => {
    fetchItemType();
    fetchFields();
  }, [fetchItemType, fetchFields]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  function handleNameChange(value: string) {
    setName(value);
    if (!key || key === name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
      setKey(
        value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      );
    }
  }

  function handleAddOption() {
    setOptions((prev) => [...prev, { label: '', value: '' }]);
  }

  function handleRemoveOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleOptionChange(index: number, field: 'label' | 'value' | 'color', value: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  }

  function resetForm() {
    setName('');
    setKey('');
    setType('SHORT_TEXT');
    setDescription('');
    setRequired(false);
    setShowInList(false);
    setShowInSearch(false);
    setHelpText('');
    setUnit('');
    setOrder('0');
    setOptions([{ label: '', value: '' }]);
    setValMin('');
    setValMax('');
    setValMinLength('');
    setValMaxLength('');
    setValPattern('');
    setValMinDate('');
    setValMaxDate('');
    setErrors({});
    setEditingFieldId(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(field: DynamicFieldItem) {
    setEditingFieldId(field.id);
    setName(field.name);
    setKey(field.key);
    setType(field.type);
    setDescription(field.description ?? '');
    setRequired(field.required);
    setShowInList(field.showInList ?? false);
    setShowInSearch(field.showInSearch ?? false);
    setHelpText(field.helpText ?? '');
    setUnit(field.unit ?? '');
    setOrder(String(field.order));
    setOptions(field.options?.length ? [...field.options] : [{ label: '', value: '' }]);

    const v = populateValidationFromField(field);
    setValMin(v.valMin);
    setValMax(v.valMax);
    setValMinLength(v.valMinLength);
    setValMaxLength(v.valMaxLength);
    setValPattern(v.valPattern);
    setValMinDate(v.valMinDate);
    setValMaxDate(v.valMaxDate);

    setErrors({});
    setDialogOpen(true);
  }

  function openDeleteDialog(field: DynamicFieldItem) {
    setFieldToDelete(field);
    setDeleteOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Submit (create or update)
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const isEditing = editingFieldId !== null;

    const fieldOptions = OPTIONS_REQUIRED_TYPES.has(type)
      ? options.filter((o) => o.label.trim() && o.value.trim())
      : undefined;

    const validation = buildValidationPayload(type, {
      valMin, valMax, valMinLength, valMaxLength, valPattern, valMinDate, valMaxDate,
    });

    const payload = {
      name,
      key,
      type,
      description: description || undefined,
      required,
      order: Number(order) || 0,
      visible: true,
      options: fieldOptions?.length ? fieldOptions : undefined,
      unit: unit || undefined,
      validation,
      showInList,
      showInSearch,
      helpText: helpText || undefined,
    };

    if (isEditing) {
      let parsed: UpdateDynamicFieldInput;
      try {
        parsed = updateDynamicFieldSchema.parse(payload);
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors: FormErrors = {};
          for (const issue of err.issues) {
            const f = issue.path[0] as keyof FormErrors;
            if (f === 'name' || f === 'key' || f === 'type' || f === 'options' || f === 'validation') {
              fieldErrors[f] = issue.message;
            }
          }
          setErrors(fieldErrors);
        }
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/fields/${editingFieldId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });

        if (res.ok) {
          resetForm();
          setDialogOpen(false);
          fetchFields();
          router.refresh();
          toast.success('Field updated.');
          return;
        }

        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrors({ key: body.message || 'A field with this key already exists.' });
          return;
        }
        setErrors({ general: body.message || 'Failed to update field.' });
      } catch {
        setErrors({ general: 'An unexpected error occurred.' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      let parsed: CreateDynamicFieldInput;
      try {
        parsed = createDynamicFieldSchema.parse(payload);
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors: FormErrors = {};
          for (const issue of err.issues) {
            const f = issue.path[0] as keyof FormErrors;
            if (f === 'name' || f === 'key' || f === 'type' || f === 'options' || f === 'validation') {
              fieldErrors[f] = issue.message;
            }
          }
          setErrors(fieldErrors);
        }
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });

        if (res.status === 201) {
          resetForm();
          setDialogOpen(false);
          fetchFields();
          router.refresh();
          toast.success('Field created.');
          return;
        }

        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrors({ key: body.message || 'A field with this key already exists.' });
          return;
        }
        setErrors({ general: body.message || 'Failed to create field.' });
      } catch {
        setErrors({ general: 'An unexpected error occurred.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDeleteConfirm() {
    if (!fieldToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/fields/${fieldToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteOpen(false);
        setFieldToDelete(null);
        fetchFields();
        router.refresh();
        toast.success('Field deleted.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast.error(body.message || 'Failed to delete field.');
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Duplicate
  // ---------------------------------------------------------------------------

  async function handleDuplicate(field: DynamicFieldItem) {
    const existingKeys = fields.map((f) => f.key);
    const newKey = generateCopyKey(field.key, existingKeys);

    const payload = {
      name: `${field.name} (copy)`,
      key: newKey,
      type: field.type,
      description: field.description || undefined,
      required: field.required,
      order: field.order + 1,
      visible: field.visible,
      options: field.options?.length ? field.options : undefined,
      unit: field.unit || undefined,
      validation: field.validation && Object.keys(field.validation).length > 0 ? field.validation : undefined,
      showInList: field.showInList ?? false,
      showInSearch: field.showInSearch ?? false,
      helpText: field.helpText || undefined,
    };

    let parsed: CreateDynamicFieldInput;
    try {
      parsed = createDynamicFieldSchema.parse(payload);
    } catch {
      toast.error('Failed to validate duplicate field.');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.status === 201) {
        fetchFields();
        router.refresh();
        toast.success('Field duplicated.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast.error(body.message || 'Failed to duplicate field.');
    } catch {
      toast.error('An unexpected error occurred.');
    }
  }

  // ---------------------------------------------------------------------------
  // Reorder via drag & drop
  // ---------------------------------------------------------------------------

  function handleDragReorder(draggedId: string, targetId: string) {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const draggedIdx = sorted.findIndex((f) => f.id === draggedId);
    const targetIdx = sorted.findIndex((f) => f.id === targetId);
    if (draggedIdx < 0 || targetIdx < 0 || draggedIdx === targetIdx) return;
    const newSorted = [...sorted];
    const [moved] = newSorted.splice(draggedIdx, 1);
    newSorted.splice(targetIdx, 0, moved!);
    submitReorder(newSorted.map((f) => f.id));
  }

  async function submitReorder(fieldIds: string[]) {
    let parsed: ReorderFieldsInput;
    try {
      parsed = reorderFieldsSchema.parse({ fieldIds });
    } catch {
      toast.error('Invalid reorder data.');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/fields/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.ok) {
        fetchFields();
        router.refresh();
        toast.success('Fields reordered.');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message || 'Failed to reorder fields.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const showsValidation = NUMERIC_TYPES.has(type) || TEXT_TYPES.has(type) || DATE_TYPES.has(type);
  const showsOptions = OPTIONS_REQUIRED_TYPES.has(type);
  const sorted = fields.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/projects/${projectId}/item-types`} className="hover:text-foreground hover:underline">
              Item Types
            </Link>
            <span>/</span>
            <span className="text-foreground">{itemType?.name ?? 'Loading...'}</span>
            <span>/</span>
            <span className="font-medium text-foreground">Fields</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Dynamic Fields</h2>
          <p className="text-sm text-muted-foreground">
            Configure custom fields for this item type.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add Field
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFieldId ? 'Edit Field' : 'New Field'}</DialogTitle>
            <DialogDescription>
              {editingFieldId ? 'Update the field settings.' : 'Add a new dynamic field to this item type.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.general && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            {/* Name + Key row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="df-name">Name</Label>
                <Input
                  id="df-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Serial Number"
                  maxLength={100}
                  autoFocus
                />
                {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="df-key">Key</Label>
                <Input
                  id="df-key"
                  type="text"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="font-mono"
                  placeholder="e.g. serial-number"
                  maxLength={100}
                />
                {errors.key && <p className="mt-1 text-sm text-destructive">{errors.key}</p>}
              </div>
            </div>

            {/* Type selector */}
            <div>
              <Label htmlFor="df-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as DynamicFieldType)}>
                <SelectTrigger id="df-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="mt-1 text-sm text-destructive">{errors.type}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="df-desc">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="df-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Options (SELECT / MULTI_SELECT) */}
            {showsOptions && (
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Options</h4>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddOption}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Option
                  </Button>
                </div>
                {errors.options && <p className="mb-2 text-sm text-destructive">{errors.options}</p>}
                <div className="space-y-2">
                  {options.map((opt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                        className="flex-1"
                        placeholder="Label"
                      />
                      <Input
                        type="text"
                        value={opt.value}
                        onChange={(e) => handleOptionChange(index, 'value', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="flex-1 font-mono"
                        placeholder="value"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={opt.color || '#6B7280'}
                          onChange={(e) => handleOptionChange(index, 'color', e.target.value)}
                          className="h-9 w-9 cursor-pointer rounded border p-0.5"
                        />
                        <Input
                          type="text"
                          value={opt.color ?? ''}
                          onChange={(e) => handleOptionChange(index, 'color', e.target.value)}
                          className="w-20 font-mono text-xs"
                          placeholder="#hex"
                          maxLength={7}
                        />
                      </div>
                      {options.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove option"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation rules */}
            {showsValidation && (
              <div className="rounded-md border p-3">
                <h4 className="mb-2 text-sm font-medium">Validation Rules</h4>
                {errors.validation && <p className="mb-2 text-sm text-destructive">{errors.validation}</p>}

                {NUMERIC_TYPES.has(type) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        value={valMin}
                        onChange={(e) => setValMin(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        value={valMax}
                        onChange={(e) => setValMax(e.target.value)}
                        placeholder="999"
                      />
                    </div>
                  </div>
                )}

                {TEXT_TYPES.has(type) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Min Length</Label>
                        <Input
                          type="number"
                          value={valMinLength}
                          onChange={(e) => setValMinLength(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max Length</Label>
                        <Input
                          type="number"
                          value={valMaxLength}
                          onChange={(e) => setValMaxLength(e.target.value)}
                          placeholder="255"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Regex Pattern</Label>
                      <Input
                        type="text"
                        value={valPattern}
                        onChange={(e) => setValPattern(e.target.value)}
                        className="font-mono"
                        placeholder="e.g. ^[A-Z]{3}-\d{4}$"
                      />
                    </div>
                  </div>
                )}

                {DATE_TYPES.has(type) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min Date</Label>
                      <Input
                        type="date"
                        value={valMinDate}
                        onChange={(e) => setValMinDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max Date</Label>
                      <Input
                        type="date"
                        value={valMaxDate}
                        onChange={(e) => setValMaxDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="df-unit">
                  Unit <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="df-unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. kg, m², psi"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="df-order">Order</Label>
                <Input
                  id="df-order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Help text */}
            <div>
              <Label htmlFor="df-help">
                Help Text <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="df-help"
                type="text"
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                placeholder="Brief helper text shown below the field"
                maxLength={500}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={required}
                  onCheckedChange={(checked) => setRequired(checked === true)}
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showInList}
                  onCheckedChange={(checked) => setShowInList(checked === true)}
                />
                Show in list
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showInSearch}
                  onCheckedChange={(checked) => setShowInSearch(checked === true)}
                />
                Show in search
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingFieldId ? 'Update Field' : 'Create Field'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {fieldToDelete?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{fieldToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fields list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Columns3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No fields yet</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Add your first dynamic field to start collecting data for this item type.
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            Add First Field
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', field.id); }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                handleDragReorder(draggedId, field.id);
              }}
              className="flex cursor-grab items-center justify-between rounded-lg border p-3 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {getHumanTypeLabel(field.type)}
                </span>
                <div>
                  <p className="font-medium">
                    {field.name}
                    {field.required && <span className="ml-1 text-xs text-destructive">*</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{field.key}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-2 text-xs text-muted-foreground">
                  {field.showInList && <span className="rounded bg-muted px-1.5 py-0.5">In list</span>}
                  {field.unit && <span className="ml-1 rounded bg-muted px-1.5 py-0.5">{field.unit}</span>}
                  <span className="ml-1">order {field.order}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicate(field)}
                  title="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(field)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDeleteDialog(field)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

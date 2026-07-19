'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDynamicFieldSchema, dynamicFieldTypeEnum, type CreateDynamicFieldInput, type DynamicFieldType } from '@mantemap/validation';
import { ZodError } from 'zod';

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

/** Types that require options */
const OPTIONS_REQUIRED_TYPES = new Set<DynamicFieldType>(['SELECT', 'MULTI_SELECT']);

/** Types that support numeric validation (min, max) */
const NUMERIC_TYPES = new Set<DynamicFieldType>(['NUMBER', 'DECIMAL', 'CURRENCY']);

/** Types that support text validation (minLength, maxLength, pattern) */
const TEXT_TYPES = new Set<DynamicFieldType>(['SHORT_TEXT', 'LONG_TEXT']);

/** Types that support date validation (minDate, maxDate) */
const DATE_TYPES = new Set<DynamicFieldType>(['DATE', 'DATETIME']);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DynamicFieldsPage({ params }: FieldsPageProps) {
  const { projectId, itemTypeId } = React.use(params);
  const router = useRouter();

  const [itemType, setItemType] = useState<ItemTypeInfo | null>(null);
  const [fields, setFields] = useState<DynamicFieldItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
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

  // Options (SELECT / MULTI_SELECT)
  const [options, setOptions] = useState<FieldOption[]>([{ label: '', value: '' }]);

  // Validation fields
  const [valMin, setValMin] = useState('');
  const [valMax, setValMax] = useState('');
  const [valMinLength, setValMinLength] = useState('');
  const [valMaxLength, setValMaxLength] = useState('');
  const [valPattern, setValPattern] = useState('');
  const [valMinDate, setValMinDate] = useState('');
  const [valMaxDate, setValMaxDate] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

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
    // Auto-generate key from name if key is empty or was auto-generated
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

  function getHumanTypeLabel(t: DynamicFieldType): string {
    return FIELD_TYPES.find((ft) => ft.value === t)?.label ?? t;
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Build validation object
    let validation: Record<string, unknown> | undefined;
    if (NUMERIC_TYPES.has(type)) {
      if (valMin || valMax) {
        validation = {};
        if (valMin) validation.min = Number(valMin);
        if (valMax) validation.max = Number(valMax);
      }
    } else if (TEXT_TYPES.has(type)) {
      if (valMinLength || valMaxLength || valPattern) {
        validation = {};
        if (valMinLength) validation.minLength = Number(valMinLength);
        if (valMaxLength) validation.maxLength = Number(valMaxLength);
        if (valPattern) validation.pattern = valPattern;
      }
    } else if (DATE_TYPES.has(type)) {
      if (valMinDate || valMaxDate) {
        validation = {};
        if (valMinDate) validation.minDate = valMinDate;
        if (valMaxDate) validation.maxDate = valMaxDate;
      }
    }

    // Build options for SELECT/MULTI_SELECT
    const fieldOptions = OPTIONS_REQUIRED_TYPES.has(type)
      ? options.filter((o) => o.label.trim() && o.value.trim())
      : undefined;

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

    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.status === 201) {
        resetForm();
        setShowForm(false);
        fetchFields();
        router.refresh();
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
      setIsCreating(false);
    }
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
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const showsValidation = NUMERIC_TYPES.has(type) || TEXT_TYPES.has(type) || DATE_TYPES.has(type);
  const showsOptions = OPTIONS_REQUIRED_TYPES.has(type);

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
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Field
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} noValidate className="mb-8 rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">New Field</h3>

          {errors.general && (
            <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {/* Name + Key row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="df-name" className="mb-1 block text-sm font-medium">Name</label>
                <input
                  id="df-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g. Serial Number"
                  maxLength={100}
                />
                {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="df-key" className="mb-1 block text-sm font-medium">Key</label>
                <input
                  id="df-key"
                  type="text"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                  placeholder="e.g. serial-number"
                  maxLength={100}
                />
                {errors.key && <p className="mt-1 text-sm text-destructive">{errors.key}</p>}
              </div>
            </div>

            {/* Type selector */}
            <div>
              <label htmlFor="df-type" className="mb-1 block text-sm font-medium">Type</label>
              <select
                id="df-type"
                value={type}
                onChange={(e) => setType(e.target.value as DynamicFieldType)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
              {errors.type && <p className="mt-1 text-sm text-destructive">{errors.type}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="df-desc" className="mb-1 block text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="df-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                maxLength={500}
              />
            </div>

            {/* Options (SELECT / MULTI_SELECT) */}
            {showsOptions && (
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Options</h4>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add Option
                  </button>
                </div>
                {errors.options && <p className="mb-2 text-sm text-destructive">{errors.options}</p>}
                <div className="space-y-2">
                  {options.map((opt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                        className="flex-1 rounded-md border px-2 py-1.5 text-sm"
                        placeholder="Label"
                      />
                      <input
                        type="text"
                        value={opt.value}
                        onChange={(e) => handleOptionChange(index, 'value', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="flex-1 rounded-md border px-2 py-1.5 text-sm font-mono"
                        placeholder="value"
                      />
                      <input
                        type="text"
                        value={opt.color ?? ''}
                        onChange={(e) => handleOptionChange(index, 'color', e.target.value)}
                        className="w-20 rounded-md border px-2 py-1.5 text-sm"
                        placeholder="#hex"
                        maxLength={7}
                      />
                      {options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                          aria-label="Remove option"
                        >
                          ✕
                        </button>
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
                      <label className="mb-1 block text-xs text-muted-foreground">Min</label>
                      <input
                        type="number"
                        value={valMin}
                        onChange={(e) => setValMin(e.target.value)}
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Max</label>
                      <input
                        type="number"
                        value={valMax}
                        onChange={(e) => setValMax(e.target.value)}
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        placeholder="999"
                      />
                    </div>
                  </div>
                )}

                {TEXT_TYPES.has(type) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Min Length</label>
                        <input
                          type="number"
                          value={valMinLength}
                          onChange={(e) => setValMinLength(e.target.value)}
                          className="w-full rounded-md border px-2 py-1.5 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Max Length</label>
                        <input
                          type="number"
                          value={valMaxLength}
                          onChange={(e) => setValMaxLength(e.target.value)}
                          className="w-full rounded-md border px-2 py-1.5 text-sm"
                          placeholder="255"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Regex Pattern</label>
                      <input
                        type="text"
                        value={valPattern}
                        onChange={(e) => setValPattern(e.target.value)}
                        className="w-full rounded-md border px-2 py-1.5 text-sm font-mono"
                        placeholder="e.g. ^[A-Z]{3}-\d{4}$"
                      />
                    </div>
                  </div>
                )}

                {DATE_TYPES.has(type) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Min Date</label>
                      <input
                        type="date"
                        value={valMinDate}
                        onChange={(e) => setValMinDate(e.target.value)}
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Max Date</label>
                      <input
                        type="date"
                        value={valMaxDate}
                        onChange={(e) => setValMaxDate(e.target.value)}
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="df-unit" className="mb-1 block text-sm font-medium">
                  Unit <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="df-unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g. kg, m², psi"
                  maxLength={50}
                />
              </div>

              <div>
                <label htmlFor="df-order" className="mb-1 block text-sm font-medium">Order</label>
                <input
                  id="df-order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  min={0}
                />
              </div>
            </div>

            {/* Help text */}
            <div>
              <label htmlFor="df-help" className="mb-1 block text-sm font-medium">
                Help Text <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="df-help"
                type="text"
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Brief helper text shown below the field"
                maxLength={500}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded"
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInList}
                  onChange={(e) => setShowInList(e.target.checked)}
                  className="rounded"
                />
                Show in list
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInSearch}
                  onChange={(e) => setShowInSearch(e.target.checked)}
                  className="rounded"
                />
                Show in search
              </label>
            </div>
          </div>

          {/* Form actions */}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Field'}
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

      {/* Fields list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : fields.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            No fields configured yet. Add your first dynamic field to start collecting data for this item type.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add First Field
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {fields
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((field) => (
              <div key={field.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {field.showInList && <span className="rounded bg-muted px-1.5 py-0.5">In list</span>}
                  {field.unit && <span className="rounded bg-muted px-1.5 py-0.5">{field.unit}</span>}
                  <span className="text-xs">order {field.order}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

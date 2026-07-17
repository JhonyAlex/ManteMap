import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared DynamicFieldType enum — must match Prisma DynamicFieldType + shared types
// ---------------------------------------------------------------------------
export const dynamicFieldTypeEnum = z.enum([
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DECIMAL',
  'CURRENCY',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  'SELECT',
  'MULTI_SELECT',
  'URL',
  'EMAIL',
  'PHONE',
  'FILE',
  'IMAGE',
  'ITEM_RELATION',
  'LOCATION_RELATION',
  'USER_RELATION',
]);

export type DynamicFieldType = z.infer<typeof dynamicFieldTypeEnum>;

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------
const fieldOptionSchema = z.object({
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
  color: z.string().optional(),
});

const keySchema = z
  .string()
  .min(1, 'Key is required')
  .max(100, 'Key cannot exceed 100 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Key must be lowercase letters, numbers, and hyphens (kebab-case)');

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name cannot exceed 100 characters');

const validationJsonSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().int().positive().optional(),
    maxLength: z.number().int().positive().optional(),
    pattern: z.string().optional(),
    minDate: z.string().optional(),
    maxDate: z.string().optional(),
    customMessage: z.string().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Type → allowed validation keys (excluding customMessage, which is universal)
// ---------------------------------------------------------------------------
const typeValidationKeys: Record<string, string[] | null> = {
  NUMBER: ['min', 'max'],
  DECIMAL: ['min', 'max'],
  CURRENCY: ['min', 'max'],
  SHORT_TEXT: ['minLength', 'maxLength', 'pattern'],
  LONG_TEXT: ['minLength', 'maxLength', 'pattern'],
  DATE: ['minDate', 'maxDate'],
  DATETIME: ['minDate', 'maxDate'],
  SELECT: null,
  MULTI_SELECT: null,
  // SELECT / MULTI_SELECT use options, not validation rules (null = no-op, don't reject)
  // All other types (BOOLEAN, URL, EMAIL, PHONE, FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION) → no validation (undefined → reject)
};

function refineValidation(
  type: string | undefined,
  validation: Record<string, unknown> | undefined,
  ctx: z.RefinementCtx
): void {
  if (!validation) return;
  if (!type) {
    // Update without type change — can't cross-validate, let base schema handle it
    return;
  }

  const allowed = typeValidationKeys[type];
  if (allowed === undefined) {
    // Type doesn't support any validation rules
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Field type "${type}" does not support validation rules`,
      path: ['validation'],
    });
    return;
  }
  if (allowed === null) {
    // SELECT / MULTI_SELECT — validation is handled by options
    return;
  }

  const validationKeys = Object.keys(validation).filter((k) => k !== 'customMessage');
  const invalidKeys = validationKeys.filter((k) => !allowed.includes(k));
  if (invalidKeys.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Validation rule(s) [${invalidKeys.join(', ')}] are not valid for field type "${type}". Allowed rules: [${allowed.join(', ')}]`,
      path: ['validation'],
    });
  }
}

// ---------------------------------------------------------------------------
// createDynamicFieldSchema
// ---------------------------------------------------------------------------
export const createDynamicFieldSchema = z
  .object({
    name: nameSchema,
    key: keySchema,
    type: dynamicFieldTypeEnum,
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    required: z.boolean().optional().default(false),
    defaultValue: z.any().optional(),
    order: z.number().int().min(0, 'Order must be a non-negative integer').optional().default(0),
    visible: z.boolean().optional().default(true),
    options: z.array(fieldOptionSchema).min(1, 'Options must have at least one entry').optional(),
    unit: z.string().max(50, 'Unit cannot exceed 50 characters').optional(),
    validation: validationJsonSchema.optional(),
    showInList: z.boolean().optional().default(false),
    showInSearch: z.boolean().optional().default(false),
    helpText: z.string().max(500, 'Help text cannot exceed 500 characters').optional(),
  })
  .superRefine((data, ctx) => {
    // SELECT and MULTI_SELECT MUST have a non-empty options array
    if (data.type === 'SELECT' || data.type === 'MULTI_SELECT') {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Field type "${data.type}" requires a non-empty options array`,
          path: ['options'],
        });
      }
    }

    // Type-aware validation rules
    refineValidation(data.type, data.validation, ctx);
  });

export type CreateDynamicFieldInput = z.infer<typeof createDynamicFieldSchema>;

// ---------------------------------------------------------------------------
// updateDynamicFieldSchema
// ---------------------------------------------------------------------------
export const updateDynamicFieldSchema = z
  .object({
    name: nameSchema.optional(),
    key: keySchema.optional(),
    type: dynamicFieldTypeEnum.optional(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    required: z.boolean().optional(),
    defaultValue: z.any().optional(),
    order: z.number().int().min(0, 'Order must be a non-negative integer').optional(),
    visible: z.boolean().optional(),
    options: z.array(fieldOptionSchema).min(1, 'Options must have at least one entry').optional(),
    unit: z.string().max(50, 'Unit cannot exceed 50 characters').optional(),
    validation: validationJsonSchema.optional(),
    showInList: z.boolean().optional(),
    showInSearch: z.boolean().optional(),
    helpText: z.string().max(500, 'Help text cannot exceed 500 characters').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .superRefine((data, ctx) => {
    // SELECT and MULTI_SELECT MUST have a non-empty options array
    if (data.type === 'SELECT' || data.type === 'MULTI_SELECT') {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Field type "${data.type}" requires a non-empty options array`,
          path: ['options'],
        });
      }
    }

    // Type-aware validation rules
    refineValidation(data.type, data.validation, ctx);
  });

export type UpdateDynamicFieldInput = z.infer<typeof updateDynamicFieldSchema>;

// ---------------------------------------------------------------------------
// reorderFieldsSchema
// ---------------------------------------------------------------------------
export const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string().min(1, 'Field ID cannot be empty')).min(1, 'At least one field ID is required'),
});

export type ReorderFieldsInput = z.infer<typeof reorderFieldsSchema>;

// ---------------------------------------------------------------------------
// createFieldValueSchema — builds a Zod schema from DynamicFieldDefinition[]
// ---------------------------------------------------------------------------

/**
 * Maps a DynamicFieldDefinition[] to a z.ZodObject for form validation.
 * Each field's type determines the base Zod type; per-type validation rules
 * (min/max, minLength/maxLength, pattern, minDate/maxDate) are applied.
 *
 * Deferred types (FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION)
 * are always .optional() regardless of the `required` flag.
 */
export function createFieldValueSchema(
  fields: { key: string; type: string; required: boolean; defaultValue?: unknown; options?: { label: string; value: string }[]; validation?: Record<string, unknown> }[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  /** Deferred types — always optional, placeholder schema */
  const deferredTypes = new Set(['FILE', 'IMAGE', 'ITEM_RELATION', 'LOCATION_RELATION', 'USER_RELATION']);

  for (const field of fields) {
    let schema: z.ZodTypeAny;

    // --- Build base schema from field type ---
    switch (field.type) {
      // --- Numeric types ---
      case 'NUMBER':
      case 'DECIMAL':
      case 'CURRENCY': {
        let numSchema = z.coerce.number();
        const v = field.validation as { min?: number; max?: number } | undefined;
        if (v?.min !== undefined) {
          numSchema = numSchema.min(v.min, `Must be ≥ ${v.min}`);
        }
        if (v?.max !== undefined) {
          numSchema = numSchema.max(v.max, `Must be ≤ ${v.max}`);
        }
        schema = numSchema;
        break;
      }

      // --- Text types ---
      case 'SHORT_TEXT':
      case 'LONG_TEXT': {
        let strSchema = z.string();
        const v = field.validation as { minLength?: number; maxLength?: number; pattern?: string } | undefined;
        if (v?.minLength !== undefined) {
          strSchema = strSchema.min(v.minLength, `Must be at least ${v.minLength} characters`);
        }
        if (v?.maxLength !== undefined) {
          strSchema = strSchema.max(v.maxLength, `Must be at most ${v.maxLength} characters`);
        }
        if (v?.pattern !== undefined) {
          strSchema = strSchema.regex(new RegExp(v.pattern), `Must match pattern: ${v.pattern}`);
        }
        schema = strSchema;
        break;
      }

      // --- Boolean ---
      case 'BOOLEAN':
        schema = z.boolean({ required_error: 'This field is required', invalid_type_error: 'Must be true or false' });
        break;

      // --- Date types ---
      case 'DATE':
      case 'DATETIME': {
        let dateSchema: z.ZodTypeAny = z.string().refine(
          (val) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(val),
          { message: 'Must be a valid ISO date' }
        );
        const v = field.validation as { minDate?: string; maxDate?: string } | undefined;
        if (v?.minDate !== undefined) {
          dateSchema = dateSchema.refine(
            (val: string) => val >= v.minDate!,
            { message: `Date must be on or after ${v.minDate}` }
          );
        }
        if (v?.maxDate !== undefined) {
          dateSchema = dateSchema.refine(
            (val: string) => val <= v.maxDate!,
            { message: `Date must be on or before ${v.maxDate}` }
          );
        }
        schema = dateSchema;
        break;
      }

      // --- SELECT ---
      case 'SELECT': {
        const options = field.options ?? [];
        if (options.length > 0) {
          const values = options.map((o) => o.value) as [string, ...string[]];
          schema = z.enum(values);
        } else {
          schema = z.string();
        }
        break;
      }

      // --- MULTI_SELECT ---
      case 'MULTI_SELECT': {
        const options = field.options ?? [];
        if (options.length > 0) {
          const validValues = new Set(options.map((o) => o.value));
          schema = z.array(z.string()).refine(
            (vals) => vals.every((v) => validValues.has(v)),
            { message: 'One or more selected values are invalid' }
          );
        } else {
          schema = z.array(z.string());
        }
        break;
      }

      // --- URL ---
      case 'URL':
        schema = z.string().url('Must be a valid URL');
        break;

      // --- EMAIL ---
      case 'EMAIL':
        schema = z.string().email('Must be a valid email');
        break;

      // --- PHONE (plain string — no strict validation) ---
      case 'PHONE':
        schema = z.string();
        break;

      // --- Deferred types ---
      default:
        // All unknown or deferred types become optional strings
        schema = z.string().optional();
        break;
    }

    // --- Apply required/optional/default ---
    // Deferred types are ALWAYS optional regardless of required flag
    if (deferredTypes.has(field.type)) {
      schema = z.string().optional();
      // Skip defaultValue for deferred — no meaningful default yet
    } else if (field.required) {
      // For required string fields, reject empty strings
      if (schema instanceof z.ZodString) {
        schema = schema.min(1, 'This field is required');
      }
      // number/boolean types are already required by Zod default
    } else {
      // Optional — make omitable and apply default if present
      schema = schema.optional();
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        // Cast to any because .default() type is complex to narrow here
        schema = (schema as z.ZodOptional<z.ZodTypeAny>).default(field.defaultValue);
      }
    }

    shape[field.key] = schema;
  }

  return z.object(shape);
}

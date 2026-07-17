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

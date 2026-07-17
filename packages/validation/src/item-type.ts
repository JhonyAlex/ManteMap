import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(80, 'Slug cannot exceed 80 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters');

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} cannot exceed ${max} characters`).optional();

export const createItemTypeSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  description: optionalText(500, 'Description'),
  icon: optionalText(100, 'Icon'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a six-digit hexadecimal value')
    .optional(),
});

export const updateItemTypeSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: optionalText(500, 'Description'),
    icon: optionalText(100, 'Icon'),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a six-digit hexadecimal value')
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type CreateItemTypeInput = z.infer<typeof createItemTypeSchema>;
export type UpdateItemTypeInput = z.infer<typeof updateItemTypeSchema>;

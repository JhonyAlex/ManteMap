import { z } from 'zod';

/**
 * Schema for creating a project.
 *
 * The `code` field is normalized to uppercase via Zod preprocess so that
 * `my-project` becomes `MY-PROJECT` before validation or persistence.
 * This ensures uniqueness is enforced on the normalized form.
 */
export const createProjectSchema = z.object({
  code: z
    .preprocess(
      (val) => typeof val === 'string' ? val.trim().toUpperCase() : val,
      z
        .string()
        .min(2, 'Code must be at least 2 characters')
        .max(20, 'Code cannot exceed 20 characters')
        .regex(
          /^[A-Z0-9-_]+$/,
          'Code can only contain uppercase letters, numbers, hyphens, and underscores'
        )
    ),
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

/** Schema for updating a project (all fields optional) */
export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

/** Inferred type for project creation */
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Inferred type for project update */
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

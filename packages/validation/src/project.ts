import { z } from 'zod';

/** Esquema para crear proyecto */
export const createProjectSchema = z.object({
  code: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(20, 'El código no puede tener más de 20 caracteres')
    .regex(/^[A-Z0-9-_]+$/, 'El código solo puede contener letras mayúsculas, números, guiones y guiones bajos'),
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede tener más de 500 caracteres')
    .optional(),
});

/** Esquema para actualizar proyecto */
export const updateProjectSchema = createProjectSchema.partial();

/** Tipo inferido para crear proyecto */
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Tipo inferido para actualizar proyecto */
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

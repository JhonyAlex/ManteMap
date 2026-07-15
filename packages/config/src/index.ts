// ManteMap — Config Package
// Configuración compartida (ESLint, Tailwind presets, constants).

/** Configuración de la aplicación */
export const APP_CONFIG = {
  name: 'ManteMap',
  version: '0.1.0',
  defaultPageSize: 20,
  maxPageSize: 100,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  allowedPlanTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
} as const;

/** Roles de usuario */
export const USER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'VIEWER'] as const;

/** Estados de proyecto */
export const PROJECT_STATUSES = ['ACTIVE', 'ARCHIVED', 'DELETED'] as const;

/** Roles de proyecto */
export const PROJECT_ROLES = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'] as const;

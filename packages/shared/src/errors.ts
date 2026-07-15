// ManteMap — Tipos de error

/** Error base de la aplicación */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Error de validación */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/** Error de autenticación */
export class AuthenticationError extends AppError {
  constructor(message: string = 'No autenticado') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/** Error de autorización */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Sin permisos') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/** Error de recurso no encontrado */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} con ID '${id}' no encontrado` : `${resource} no encontrado`;
    super(msg, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/** Error de conflicto */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

/** Transformar errores de Prisma a AppError */
export function handlePrismaError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const err = error as { code?: string; message?: string };

  switch (err.code) {
    case 'P2002':
      return new ConflictError('Ya existe un registro con esos datos únicos');
    case 'P2025':
      return new NotFoundError('Registro');
    case 'P2003':
      return new ValidationError('Referencia a registro inexistente');
    default:
      return new AppError(err.message || 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
}

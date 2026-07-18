// ManteMap — Tipos comunes

export * from './domain';
export * from './metrics';

/** Respuesta estándar de la API */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

/** Paginación */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Ordenamiento */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/** Filtros base */
export interface BaseFilters {
  search?: string;
  projectId?: string;
  status?: string;
}

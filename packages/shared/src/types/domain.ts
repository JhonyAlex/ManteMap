/** Tipos específicos del dominio ManteMap */

/** Estado del ítem */
export interface ItemStatus {
  id: string;
  itemTypeId: string;
  name: string;
  key: string;
  color: string;
  icon?: string;
  description?: string;
  order: number;
  isDefault: boolean;
  active: boolean;
  isFinal: boolean;
  isBlocking: boolean;
  isIncident: boolean;
}

/** Campo dinámico definición */
export interface DynamicFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: DynamicFieldType;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  order: number;
  visible: boolean;
  active: boolean;
  options?: FieldOption[];
  unit?: string;
  validation?: FieldValidation;
  showInList: boolean;
  showInSearch: boolean;
  helpText?: string;
}

/** Tipos de campo dinámico */
export type DynamicFieldType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'DECIMAL'
  | 'CURRENCY'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'FILE'
  | 'IMAGE'
  | 'ITEM_RELATION'
  | 'LOCATION_RELATION'
  | 'USER_RELATION';

/** Opción de campo de selección */
export interface FieldOption {
  label: string;
  value: string;
  color?: string;
}

/** Reglas de validación de campo */
export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minDate?: string;
  maxDate?: string;
  customMessage?: string;
}

/** Posición de ítem en plano */
export interface ItemPosition {
  id: string;
  itemId: string;
  planId: string;
  x: number; // 0 a 1
  y: number; // 0 a 1
  rotation?: number;
  scale?: number;
  layerId?: string;
  placedAt: Date;
  placedBy: string;
}

/** Configuración de recurrencia */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  baseDate: Date;
  nextDate?: Date;
  endDate?: Date;
  maxOccurrences?: number;
  noticeDays: number;
  timezone: string;
  holidayPolicy: 'BEFORE' | 'AFTER' | 'SKIP' | 'NONE';
}

/** Frecuencia de recurrencia */
export type RecurrenceFrequency =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'CUSTOM_DAYS'
  | 'CUSTOM_WEEKS'
  | 'CUSTOM_MONTHS';

/** Ubicación jerárquica */
export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  parentId?: string;
  projectId: string;
  description?: string;
  responsibleId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  planId?: string;
  order: number;
}

/** Tipo de ubicación */
export type LocationType = 'CENTER' | 'BUILDING' | 'FLOOR' | 'AREA' | 'SUBAREA';

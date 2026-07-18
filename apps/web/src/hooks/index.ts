/**
 * Hooks barrel — exports all custom hooks.
 */

export {
  useItems,
  useItem,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useTransitionStatus,
  itemKeys,
} from './use-items';

export type {
  UseItemsOptions,
  UseItemOptions,
  ItemSummary,
  ItemDetail,
  ItemStatusSnapshot,
  FieldValueSnapshot,
} from './use-items';

export {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDocumentVersions,
  documentKeys,
} from './use-documents';

export type {
  DocumentWithVersion,
  DocumentVersion,
} from './use-documents';

export {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  eventKeys,
} from './use-events';

export type {
  CalendarEvent,
  CreateEventPayload,
  UpdateEventPayload,
} from './use-events';

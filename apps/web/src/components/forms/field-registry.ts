import type { DynamicFieldType } from '@mantemap/shared';
import type { ComponentType } from 'react';
import type { FieldInputProps } from './fields/text-field';

import { TextFieldInput } from './fields/text-field';
import { LongTextFieldInput } from './fields/long-text-field';
import { NumberFieldInput } from './fields/number-field';
import { DecimalFieldInput } from './fields/decimal-field';
import { CurrencyFieldInput } from './fields/currency-field';
import { BooleanFieldInput } from './fields/boolean-field';
import { DateFieldInput } from './fields/date-field';
import { DateTimeFieldInput } from './fields/datetime-field';
import { SelectFieldInput } from './fields/select-field';
import { MultiSelectFieldInput } from './fields/multi-select-field';
import { UrlFieldInput } from './fields/url-field';
import { EmailFieldInput } from './fields/email-field';
import { PhoneFieldInput } from './fields/phone-field';
import { DeferredFieldInput } from './fields/deferred-placeholder';
import { LocationRelationField } from './fields/location-relation-field';

/**
 * Field registry mapping each DynamicFieldType to its React component.
 *
 * 14 active types have real input components.
 * 4 deferred types (FILE, IMAGE, ITEM_RELATION, USER_RELATION)
 * render the DeferredFieldPlaceholder.
 * LOCATION_RELATION renders LocationRelationField (LocationPicker).
 */
export const fieldRegistry: Record<DynamicFieldType, ComponentType<FieldInputProps>> = {
  SHORT_TEXT: TextFieldInput,
  LONG_TEXT: LongTextFieldInput,
  NUMBER: NumberFieldInput,
  DECIMAL: DecimalFieldInput,
  CURRENCY: CurrencyFieldInput,
  BOOLEAN: BooleanFieldInput,
  DATE: DateFieldInput,
  DATETIME: DateTimeFieldInput,
  SELECT: SelectFieldInput,
  MULTI_SELECT: MultiSelectFieldInput,
  URL: UrlFieldInput,
  EMAIL: EmailFieldInput,
  PHONE: PhoneFieldInput,
  FILE: DeferredFieldInput,
  IMAGE: DeferredFieldInput,
  ITEM_RELATION: DeferredFieldInput,
  LOCATION_RELATION: LocationRelationField,
  USER_RELATION: DeferredFieldInput,
};

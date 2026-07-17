'use client';

import React from 'react';
import { Input } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function DateTimeFieldInput({ field, definition }: FieldInputProps) {
  return (
    <FormControl>
      <Input
        type="datetime-local"
        name={field.name}
        value={field.value as string | undefined}
        onChange={field.onChange as React.ChangeEventHandler<HTMLInputElement>}
        onBlur={field.onBlur}
        disabled={field.disabled}
        ref={field.ref as React.Ref<HTMLInputElement>}
        placeholder={definition.description || 'Select date and time'}
      />
    </FormControl>
  );
}

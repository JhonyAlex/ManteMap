'use client';

import React from 'react';
import { Input } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function DateFieldInput({ field, definition }: FieldInputProps) {
  return (
    <FormControl>
      <Input
        type="date"
        name={field.name}
        value={field.value as string | undefined}
        onChange={field.onChange as React.ChangeEventHandler<HTMLInputElement>}
        onBlur={field.onBlur}
        disabled={field.disabled}
        ref={field.ref as React.Ref<HTMLInputElement>}
        placeholder={definition.description || 'Select a date'}
      />
    </FormControl>
  );
}

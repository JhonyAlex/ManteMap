'use client';

import React from 'react';
import { Input } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function DecimalFieldInput({ field, definition }: FieldInputProps) {
  return (
    <FormControl>
      <Input
        type="number"
        step="0.01"
        name={field.name}
        value={field.value as number | undefined}
        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onBlur={field.onBlur}
        disabled={field.disabled}
        ref={field.ref as React.Ref<HTMLInputElement>}
        placeholder={definition.description || `Enter ${definition.name}`}
      />
    </FormControl>
  );
}

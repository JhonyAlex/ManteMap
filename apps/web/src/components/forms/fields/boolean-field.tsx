'use client';

import React from 'react';
import { Switch } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function BooleanFieldInput({ field, definition: _def }: FieldInputProps) {
  return (
    <FormControl>
      <Switch
        checked={!!field.value}
        onCheckedChange={field.onChange}
        ref={field.ref as React.Ref<HTMLButtonElement>}
        name={field.name}
        disabled={field.disabled}
      />
    </FormControl>
  );
}

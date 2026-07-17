'use client';

import React from 'react';
import { Input } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function PhoneFieldInput({ field, definition }: FieldInputProps) {
  return (
    <FormControl>
      <Input
        type="tel"
        name={field.name}
        value={field.value as string | undefined}
        onChange={field.onChange as React.ChangeEventHandler<HTMLInputElement>}
        onBlur={field.onBlur}
        disabled={field.disabled}
        ref={field.ref as React.Ref<HTMLInputElement>}
        placeholder={definition.description || '+1 (555) 000-0000'}
      />
    </FormControl>
  );
}

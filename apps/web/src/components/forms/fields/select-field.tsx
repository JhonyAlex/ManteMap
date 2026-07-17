'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function SelectFieldInput({ field, definition }: FieldInputProps) {
  const options = definition.options ?? [];

  return (
    <Select onValueChange={field.onChange} value={(field.value as string) || ''}>
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

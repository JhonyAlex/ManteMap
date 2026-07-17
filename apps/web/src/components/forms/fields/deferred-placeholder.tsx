'use client';

import React from 'react';
import { Input } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function DeferredFieldInput({ field: _field, definition: _def }: FieldInputProps) {
  return (
    <FormControl>
      <Input disabled placeholder="Coming soon" />
    </FormControl>
  );
}

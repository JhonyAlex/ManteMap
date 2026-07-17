'use client';

import React from 'react';
import { Input } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import type { ControllerRenderProps } from 'react-hook-form';

export interface FieldInputProps {
  field: ControllerRenderProps<Record<string, unknown>>;
  definition: DynamicFieldDefinition;
}

/** Safe spread of RHF field props onto an HTML input */
function inputProps(field: ControllerRenderProps<Record<string, unknown>>, overrides?: React.InputHTMLAttributes<HTMLInputElement>): React.InputHTMLAttributes<HTMLInputElement> {
  return {
    name: field.name,
    value: field.value as string | number | readonly string[] | undefined,
    onChange: field.onChange as React.ChangeEventHandler<HTMLInputElement>,
    onBlur: field.onBlur,
    disabled: field.disabled,
    ...overrides,
  };
}

export function TextFieldInput({ field, definition }: FieldInputProps) {
  return (
    <FormControl>
      <Input
        {...inputProps(field)}
        placeholder={definition.description || `Enter ${definition.name}`}
      />
    </FormControl>
  );
}

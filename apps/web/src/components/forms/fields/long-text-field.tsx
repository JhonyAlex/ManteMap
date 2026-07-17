'use client';

import React from 'react';
import { Textarea } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { ControllerRenderProps } from 'react-hook-form';
import type { FieldInputProps } from './text-field';

/** Safe spread of RHF field props onto HTML textarea */
function textareaProps(field: ControllerRenderProps<Record<string, unknown>>): React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  return {
    name: field.name,
    value: field.value as string | undefined,
    onChange: field.onChange as React.ChangeEventHandler<HTMLTextAreaElement>,
    onBlur: field.onBlur,
    disabled: field.disabled,
  };
}

export function LongTextFieldInput({ field, definition }: FieldInputProps) {
  return (
    <FormControl>
      <Textarea
        {...textareaProps(field)}
        placeholder={definition.description || `Enter ${definition.name}`}
      />
    </FormControl>
  );
}

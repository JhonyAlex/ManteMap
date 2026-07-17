'use client';

import React from 'react';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@mantemap/ui';

interface FormFieldWrapperProps {
  definition: DynamicFieldDefinition;
  children: React.ReactNode;
}

/**
 * Wraps a field input with label, required asterisk, help text, and error message.
 * Must be rendered inside a shadcn FormField context.
 */
export function FormFieldWrapper({ definition, children }: FormFieldWrapperProps) {
  return (
    <FormItem>
      <FormLabel data-testid="field-label">
        {definition.name}
        {definition.required && (
          <span data-testid="required-asterisk" className="text-destructive ml-1">
            *
          </span>
        )}
      </FormLabel>
      <FormControl>{children}</FormControl>
      {definition.helpText && (
        <FormDescription data-testid="help-text">{definition.helpText}</FormDescription>
      )}
      <FormMessage />
    </FormItem>
  );
}

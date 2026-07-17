'use client';

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFieldValueSchema } from '@mantemap/validation';
import { Button, Form, FormField } from '@mantemap/ui';
import { fieldRegistry } from './field-registry';
import { FormFieldWrapper } from './form-field-wrapper';
import type { DynamicFieldDefinition } from '@mantemap/shared';

export interface DynamicFormProps {
  fields: DynamicFieldDefinition[];
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  defaultValues?: Record<string, unknown>;
}

/**
 * DynamicForm renders a validated form from an array of DynamicFieldDefinitions.
 *
 * Each field is rendered using its type-specific component from the field registry.
 * Active fields are sorted by order. Inactive fields are excluded.
 * Validation is performed using a Zod schema generated from the field definitions.
 *
 * Spec: specs/form-generation/spec.md
 */
export function DynamicForm({ fields, onSubmit, defaultValues }: DynamicFormProps) {
  const schema = createFieldValueSchema(fields);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const activeFields = fields
    .filter((f) => f.active !== false)
    .sort((a, b) => a.order - b.order);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {activeFields.map((definition) => {
          const FieldComponent = fieldRegistry[definition.type];
          if (!FieldComponent) return null;

          return (
            <FormField
              key={definition.key}
              control={form.control}
              name={definition.key}
              render={({ field }) => (
                <FormFieldWrapper definition={definition}>
                  <FieldComponent field={field} definition={definition} />
                </FormFieldWrapper>
              )}
            />
          );
        })}
        <Button type="submit">Submit</Button>
      </form>
    </FormProvider>
  );
}

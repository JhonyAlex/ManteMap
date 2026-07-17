'use client';

import React, { useId } from 'react';
import { Checkbox, Label } from '@mantemap/ui';
import { FormControl } from '@mantemap/ui';
import type { FieldInputProps } from './text-field';

export function MultiSelectFieldInput({ field, definition }: FieldInputProps) {
  const selected = (field.value as string[]) || [];
  const baseId = useId();
  const options = definition.options ?? [];

  return (
    <FormControl>
      <div className="space-y-2">
        {options.map((opt) => {
          const itemId = `${baseId}-${opt.value}`;
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                id={itemId}
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selected, opt.value]
                    : selected.filter((v) => v !== opt.value);
                  field.onChange(next);
                }}
              />
              <Label htmlFor={itemId} className="cursor-pointer text-sm font-normal">
                {opt.label}
              </Label>
            </div>
          );
        })}
      </div>
    </FormControl>
  );
}

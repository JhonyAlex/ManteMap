'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProjectSchema, type CreateProjectInput } from '@mantemap/validation';
import { ZodError } from 'zod';

interface FormErrors {
  code?: string;
  name?: string;
  description?: string;
  general?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    let parsed: CreateProjectInput;
    try {
      parsed = createProjectSchema.parse({ code, name, description: description || undefined });
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        for (const issue of err.issues) {
          const field = issue.path[0] as keyof FormErrors;
          if (field === 'code' || field === 'name' || field === 'description') {
            fieldErrors[field] = issue.message;
          }
        }
        setErrors(fieldErrors);
      }
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.status === 201) {
        const data = await res.json();
        router.push(`/projects/${data.project.id}`);
        router.refresh();
        return;
      }

      if (res.status === 409) {
        setErrors({ code: 'A project with this code already exists.' });
        return;
      }

      const data = await res.json().catch(() => ({}));
      setErrors({ general: data.message || 'Failed to create project. Please try again.' });
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New Project</h1>

      {errors.general && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium">
            Code
          </label>
          <input
            id="code"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            placeholder="e.g. EDIFICIO-A"
            maxLength={20}
          />
          {errors.code && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.code}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Short identifier. Letters, numbers, hyphens, and underscores. 2-20 characters.
          </p>
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            placeholder="e.g. Edificio Central"
            maxLength={100}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            placeholder="Brief description of this project..."
            maxLength={500}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

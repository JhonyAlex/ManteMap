// @vitest-environment jsdom

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

const { mockRefresh, mockToastError } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn() },
}));

vi.mock('@mantemap/ui', () => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  );
  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />;
  const Select = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  return {
    Dialog: Wrapper,
    DialogContent: Wrapper,
    DialogHeader: Wrapper,
    DialogTitle: Wrapper,
    DialogDescription: Wrapper,
    DialogFooter: Wrapper,
    Button,
    Input,
    Label: Wrapper,
    Select,
    SelectTrigger: Wrapper,
    SelectContent: Wrapper,
    SelectItem: Wrapper,
    SelectValue: Wrapper,
    Skeleton: Wrapper,
  };
});

import FloorPlansPage from './page';

function response(status: number, data: unknown = []) {
  return Promise.resolve(
    new Response(JSON.stringify({ data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

async function renderPage() {
  const value = { projectCode: 'PIGMEA-ED1' };
  const params = Promise.resolve(value) as Promise<typeof value> & {
    status: 'fulfilled';
    value: typeof value;
  };
  params.status = 'fulfilled';
  params.value = value;
  await act(async () => {
    render(<FloorPlansPage params={params} />);
    await Promise.resolve();
  });
}

describe('FloorPlansPage loading failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a visible error instead of a misleading empty state on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL | Request) =>
        String(url).endsWith('/floor-plans') ? response(404) : response(200)
      )
    );

    await renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Floor plans could not be loaded');
    expect(screen.queryByText('No floor plans yet')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('emits only one prudent toast when both initial requests fail', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response(404)));

    await renderPage();

    await screen.findByRole('alert');
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).toHaveBeenCalledWith(
      'Floor plans could not be loaded. Your uploaded data may still be available.'
    );
  });

  it('keeps loaded floor plans visible when only locations fail and disables uploads', async () => {
    const floorPlans = [
      {
        id: 'floor-plan-1',
        name: 'Ground Floor',
        imageUrl: '/stored/ground-floor.png',
        width: 1920,
        height: 1080,
        locationId: 'location-1',
        active: true,
        createdAt: '2026-07-19T10:00:00.000Z',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL | Request) =>
        String(url).endsWith('/floor-plans') ? response(200, floorPlans) : response(404)
      )
    );

    await renderPage();

    expect(await screen.findByText('Ground Floor')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Locations could not be loaded');
    expect(screen.queryByText('Floor plans could not be loaded')).not.toBeInTheDocument();
    expect(screen.queryByText('No floor plans yet')).not.toBeInTheDocument();
    for (const uploadButton of screen.getAllByRole('button', { name: 'Upload Plan' })) {
      expect(uploadButton).toBeDisabled();
    }
    expect(mockToastError).toHaveBeenCalledTimes(1);
  });
});

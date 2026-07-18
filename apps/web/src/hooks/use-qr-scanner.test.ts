// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock html5-qrcode
// ---------------------------------------------------------------------------
let onScanSuccess: ((decoded: string) => void) | null = null;
let onScanFailure: ((err: unknown) => void) | null = null;

const mockStart = vi.fn();
const mockStop = vi.fn().mockResolvedValue(undefined);
const mockClear = vi.fn();

// Register the mock BEFORE importing the hook
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    start = mockStart.mockImplementation(
      (
        _cameraId: unknown,
        _config: unknown,
        successCallback: (decoded: string) => void,
        failureCallback: (err: unknown) => void,
      ) => {
        onScanSuccess = successCallback;
        onScanFailure = failureCallback;
        return Promise.resolve();
      },
    );
    stop = mockStop;
    clear = mockClear;
  },
}));

// RED — production code does not exist yet
import { useQRScanner } from './use-qr-scanner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simulateScan(decodedText: string) {
  if (onScanSuccess) onScanSuccess(decodedText);
}

function simulateScanError() {
  if (onScanFailure) onScanFailure('Scan error');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useQRScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onScanSuccess = null;
    onScanFailure = null;
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({}),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start scanning automatically', async () => {
    const { result } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(result.current.scanning).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('should decode a ManteMap QR code and set result', async () => {
    const { result } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(result.current.scanning).toBe(true);
    });

    await act(async () => {
      simulateScan('https://mante.saharapro.team/p/plant-a/i/industrial-pump');
    });

    await waitFor(() => {
      expect(result.current.scanning).toBe(false);
    });

    expect(result.current.result).toBe(
      'https://mante.saharapro.team/p/plant-a/i/industrial-pump',
    );
  });

  it('should not stop scanning for non-ManteMap QR codes', async () => {
    const { result } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(result.current.scanning).toBe(true);
    });

    await act(async () => {
      simulateScan('https://example.com/some-other-page');
    });

    expect(result.current.scanning).toBe(true);
    expect(result.current.error).toBe('Not a ManteMap QR code');
  });

  it('should handle camera permission denial', async () => {
    mockStart.mockRejectedValueOnce(new Error('NotAllowedError: Permission denied'));

    const { result } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(result.current.error).toContain('Camera permission denied');
    });

    expect(result.current.scanning).toBe(false);
  });

  it('should handle camera not available', async () => {
    mockStart.mockRejectedValueOnce(new Error('NotFoundError'));

    const { result } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(result.current.error).toContain('No camera found');
    });

    expect(result.current.scanning).toBe(false);
  });

  it('should expose stop function that stops scanning', async () => {
    const { result } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(result.current.scanning).toBe(true);
    });

    await act(async () => {
      result.current.stop();
    });

    expect(mockStop).toHaveBeenCalled();
  });

  it('should clean up (stop) on unmount', async () => {
    const { unmount } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });

    unmount();

    expect(mockStop).toHaveBeenCalled();
  });

  it('should handle scanner errors gracefully', async () => {
    const { result } = renderHook(() => useQRScanner({ targetElementId: 'reader' }));

    await waitFor(() => {
      expect(result.current.scanning).toBe(true);
    });

    await act(async () => {
      simulateScanError();
    });

    // Scanner should still be active after a scan error
    expect(result.current.scanning).toBe(true);
  });
});

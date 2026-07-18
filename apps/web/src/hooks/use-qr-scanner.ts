'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * ManteMap QR URL pattern: {BASE_URL}/p/{projectSlug}/i/{itemSlug}
 * Matches URLs pointing to any item detail page.
 */
const MANTEMAP_QR_PATTERN = /\/p\/[\w-]+\/i\/[\w-]+/i;

/**
 * useQRScanner — wraps html5-qrcode for QR scanning.
 *
 * Actively scans the device camera until a valid ManteMap QR code is found,
 * then stops and returns the decoded URL. Non-ManteMap codes show an error
 * but continue scanning.
 *
 * @returns { result, error, scanning, stop }
 *
 * Spec MI-001, MI-006
 */
export interface QRScannerOptions {
  /** DOM element ID to mount the scanner viewfinder into. */
  targetElementId: string;
}

export interface QRScannerResult {
  /** The decoded QR text, or null if nothing has been scanned yet. */
  result: string | null;
  /** Error message, or null. */
  error: string | null;
  /** Whether the scanner is currently active. */
  scanning: boolean;
  /** Manually stop the scanner. */
  stop: () => void;
}

export function useQRScanner({ targetElementId }: QRScannerOptions): QRScannerResult {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      stoppedRef.current = true;
      try {
        await scannerRef.current.stop();
      } catch {
        // Already stopped
      }
      scannerRef.current = null;
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      const html5QrCode = new Html5Qrcode(targetElementId);
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (!mounted || stoppedRef.current) return;

            if (MANTEMAP_QR_PATTERN.test(decodedText)) {
              setResult(decodedText);
              setScanning(false);
              // Stop scanning after successful decode
              html5QrCode.stop().catch(() => {});
              scannerRef.current = null;
            } else {
              setError('Not a ManteMap QR code');
            }
          },
          () => {
            // Scan failure — camera is still trying, no need to surface every miss
          },
        );
        if (mounted) {
          setScanning(true);
          setError(null);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('NotAllowedError') || message.includes('Permission')) {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (message.includes('NotFoundError') || message.includes('NotReadableError')) {
          setError('No camera found or camera is in use by another application.');
        } else {
          setError(`Camera error: ${message}`);
        }
        setScanning(false);
        scannerRef.current = null;
      }
    };

    void startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetElementId]);

  return { result, error, scanning, stop };
}

import { NextResponse } from 'next/server';

/**
 * Healthcheck endpoint para Docker y monitoreo.
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
    },
    { status: 200 }
  );
}

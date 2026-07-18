import { NextResponse } from 'next/server';
import type { ApiResponse } from '@mantemap/shared';

/**
 * Standardized API error responses.
 * Never exposes internal database errors or stack traces to the client.
 */
export function apiError(status: number, message: string, error?: string) {
  const body: ApiResponse = {
    error: error || 'ERROR',
    message,
  };
  return NextResponse.json(body, { status });
}

/** 400 Bad Request */
export function badRequest(message: string = 'Invalid request data') {
  return apiError(400, message, 'VALIDATION_ERROR');
}

/** 401 Unauthorized */
export function unauthorized(message: string = 'Authentication required') {
  return apiError(401, message, 'AUTHENTICATION_ERROR');
}

/** 403 Forbidden */
export function forbidden(message: string = 'Insufficient permissions') {
  return apiError(403, message, 'AUTHORIZATION_ERROR');
}

/** 404 Not Found */
export function notFound(message: string = 'Resource not found') {
  return apiError(404, message, 'NOT_FOUND');
}

/** 409 Conflict */
export function conflict(message: string = 'Resource already exists') {
  return apiError(409, message, 'CONFLICT');
}

/** 500 Internal Server Error */
export function internalError(_message?: string) {
  return apiError(500, 'Internal server error', 'INTERNAL_ERROR');
}

/** 413 Payload Too Large */
export function payloadTooLarge(message: string = 'File size exceeds maximum') {
  return apiError(413, message, 'PAYLOAD_TOO_LARGE');
}

/** 415 Unsupported Media Type */
export function unsupportedMediaType(message: string = 'File type not allowed') {
  return apiError(415, message, 'UNSUPPORTED_MEDIA_TYPE');
}

/** 503 Service Unavailable */
export function serviceUnavailable(_message?: string) {
  return apiError(503, 'Service temporarily unavailable', 'SERVICE_UNAVAILABLE');
}

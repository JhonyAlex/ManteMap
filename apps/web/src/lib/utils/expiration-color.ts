/**
 * Document expiration urgency color utilities.
 *
 * Used by the event service to color-code document expiration events
 * on the calendar based on proximity to expiration.
 */

/**
 * Determine color for a document expiration event based on proximity.
 * - Red (#EF4444): already expired
 * - Yellow (#EAB308): expiring within 30 days
 * - Blue (#3B82F6): expiring beyond 30 days (default)
 */
export function getExpirationColor(expiresAt: Date, now: Date = new Date()): string {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (expiresAt < now) return '#EF4444'; // red
  if (expiresAt.getTime() - now.getTime() <= thirtyDaysMs) return '#EAB308'; // yellow
  return '#3B82F6'; // blue
}

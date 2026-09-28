/**
 * Parse a timestamp from the Edge Server's SQLite database.
 *
 * SQLite's CURRENT_TIMESTAMP is UTC formatted as "YYYY-MM-DD HH:MM:SS" with no
 * zone marker, which `new Date()` would otherwise read as local time.
 */
export function parseDbTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasZone ? value : `${value.replace(" ", "T")}Z`);
  return isNaN(date.getTime()) ? null : date;
}

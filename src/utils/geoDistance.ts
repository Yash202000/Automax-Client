/**
 * Calculates distance between two geographical points using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Returns formatted distance (e.g. "450 m" or "1.2 km"), falling back to calculation
 * if backend does not supply a precomputed distance string.
 */
export function getIncidentDistance(
  currentLat?: number | null,
  currentLng?: number | null,
  targetLat?: number | null,
  targetLng?: number | null,
  existingDistance?: string,
): string | null {
  if (existingDistance) return existingDistance;
  if (
    currentLat == null ||
    currentLng == null ||
    targetLat == null ||
    targetLng == null ||
    isNaN(currentLat) ||
    isNaN(currentLng) ||
    isNaN(targetLat) ||
    isNaN(targetLng)
  ) {
    return null;
  }
  const meters = calculateHaversineDistanceMeters(
    currentLat,
    currentLng,
    targetLat,
    targetLng,
  );
  return formatDistance(meters);
}

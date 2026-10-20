/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates the forward azimuth / bearing in degrees (0 - 360)
 * from a start coordinate to an end coordinate.
 * Uses standard spherical geodesy formulas.
 */
export function calculateBearing(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const rad = Math.PI / 180;
  const lat1 = start.lat * rad;
  const lat2 = end.lat * rad;
  const dLng = (end.lng - start.lng) * rad;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = Math.atan2(y, x) * (180 / Math.PI);
  brng = (brng + 360) % 360;
  return Math.round(brng);
}

/**
 * Calculates the approximate distance in meters between two lat/lng coordinates
 * using the Haversine formula.
 */
export function calculateDistanceMeters(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const phi1 = coord1.lat * rad;
  const phi2 = coord2.lat * rad;
  const deltaPhi = (coord2.lat - coord1.lat) * rad;
  const deltaLambda = (coord2.lng - coord1.lng) * rad;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Converts a bearing in degrees (0 - 360) to a compass direction (e.g. 'N', 'NE', 'ESE').
 */
export function getCompassDirection(bearing: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Computes the travel heading for a given route step from its decoded polyline
 * or departure/arrival coordinates. Ensures consecutive points are sufficiently
 * separated to avoid erratic bearings from micro-jitter.
 */
export function getStepTravelHeading(
  decodedPoints: { lat: number; lng: number }[],
  fallbackStart?: { lat: number; lng: number },
  fallbackEnd?: { lat: number; lng: number }
): number {
  if (decodedPoints && decodedPoints.length >= 2) {
    const startPt = decodedPoints[0];
    // Find first point at least 4 meters ahead
    for (let i = 1; i < decodedPoints.length; i++) {
      const dist = calculateDistanceMeters(startPt, decodedPoints[i]);
      if (dist >= 4) {
        return calculateBearing(startPt, decodedPoints[i]);
      }
    }
    // If all points are very close, take the second point or last point
    return calculateBearing(startPt, decodedPoints[decodedPoints.length - 1]);
  }

  if (fallbackStart && fallbackEnd) {
    return calculateBearing(fallbackStart, fallbackEnd);
  }

  return 0; // Default North
}

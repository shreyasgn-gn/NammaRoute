/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouteStep } from '../types/routes';

/**
 * Decodes an encoded polyline string into an array of { lat, lng } points.
 * Standard Google Maps encoded polyline algorithm.
 */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  if (!encoded) return [];

  const poly: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return poly;
}

/**
 * Calculates geographic bearing (forward azimuth in degrees [0, 360))
 * from a start coordinate to an end coordinate using the great-circle formula.
 * 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function calculateBearing(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const lat1 = (start.lat * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates the Haversine distance in meters between two coordinates.
 */
export function calculateDistanceMeters(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const deltaPhi = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts a degree heading [0, 360) into a cardinal/intercardinal direction string.
 * Example: 90 -> "East", 45 -> "North-East".
 */
export function getCompassDirection(bearing: number): { code: string; label: string } {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions = [
    { code: 'N', label: 'North' },
    { code: 'NNE', label: 'North-North-East' },
    { code: 'NE', label: 'North-East' },
    { code: 'ENE', label: 'East-North-East' },
    { code: 'E', label: 'East' },
    { code: 'ESE', label: 'East-South-East' },
    { code: 'SE', label: 'South-East' },
    { code: 'SSE', label: 'South-South-East' },
    { code: 'S', label: 'South' },
    { code: 'SSW', label: 'South-South-West' },
    { code: 'SW', label: 'South-West' },
    { code: 'WSW', label: 'West-South-West' },
    { code: 'W', label: 'West' },
    { code: 'WNW', label: 'West-North-West' },
    { code: 'NW', label: 'North-West' },
    { code: 'NNW', label: 'North-North-West' },
  ];

  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

export interface StepHeadingResult {
  heading: number;
  cameraPosition: { lat: number; lng: number };
  directionLabel: string;
  compassCode: string;
  targetPoint: { lat: number; lng: number } | null;
  method: 'polyline_segment' | 'step_endpoints' | 'transit_stops' | 'next_step' | 'fallback';
}

/**
 * Calculates the exact geographic camera heading along the selected route step.
 * Reads consecutive route coordinates from decoded polyline geometry so the
 * camera points along the real direction the user should travel.
 */
export function calculateStepRouteHeading(
  step: RouteStep,
  nextStep?: RouteStep,
  fallbackDestination?: { lat: number; lng: number }
): StepHeadingResult {
  // 1. Determine camera base position along route:
  // For transit steps: boarding stop location
  // For walking steps: startLocation or first polyline point
  let cameraPosition: { lat: number; lng: number } =
    step.travelMode === 'TRANSIT' && step.transitDetails
      ? { lat: step.transitDetails.departureStop.lat, lng: step.transitDetails.departureStop.lng }
      : step.startLocation || { lat: 12.9716, lng: 77.5946 };

  // 2. Decode the actual step polyline if available
  const points = step.polyline ? decodePolyline(step.polyline) : [];

  if (points.length >= 2) {
    const origin = points[0];
    cameraPosition = origin;

    // Find the next point along the polyline path that is at least 6 meters ahead
    // to avoid jitter from sub-meter GPS points while capturing the true road heading
    let target = points[1];
    for (let i = 1; i < points.length; i++) {
      if (calculateDistanceMeters(origin, points[i]) >= 6) {
        target = points[i];
        break;
      }
    }

    const heading = calculateBearing(origin, target);
    const compass = getCompassDirection(heading);

    return {
      heading: Math.round(heading * 10) / 10,
      cameraPosition,
      directionLabel: compass.label,
      compassCode: compass.code,
      targetPoint: target,
      method: 'polyline_segment',
    };
  }

  // 3. Fallback: Step Start to Step End if endpoints are provided
  if (step.startLocation && step.endLocation) {
    const dist = calculateDistanceMeters(step.startLocation, step.endLocation);
    if (dist >= 4) {
      const heading = calculateBearing(step.startLocation, step.endLocation);
      const compass = getCompassDirection(heading);
      return {
        heading: Math.round(heading * 10) / 10,
        cameraPosition: step.startLocation,
        directionLabel: compass.label,
        compassCode: compass.code,
        targetPoint: step.endLocation,
        method: 'step_endpoints',
      };
    }
  }

  // 4. Fallback for transit: Departure stop to Arrival stop
  if (step.transitDetails) {
    const dep = step.transitDetails.departureStop;
    const arr = step.transitDetails.arrivalStop;
    if (dep && arr && (dep.lat !== arr.lat || dep.lng !== arr.lng)) {
      const startPt = { lat: dep.lat, lng: dep.lng };
      const endPt = { lat: arr.lat, lng: arr.lng };
      const heading = calculateBearing(startPt, endPt);
      const compass = getCompassDirection(heading);
      return {
        heading: Math.round(heading * 10) / 10,
        cameraPosition: startPt,
        directionLabel: compass.label,
        compassCode: compass.code,
        targetPoint: endPt,
        method: 'transit_stops',
      };
    }
  }

  // 5. Fallback: Bearing towards next step's start position
  if (nextStep && nextStep.startLocation) {
    const heading = calculateBearing(cameraPosition, nextStep.startLocation);
    const compass = getCompassDirection(heading);
    return {
      heading: Math.round(heading * 10) / 10,
      cameraPosition,
      directionLabel: compass.label,
      compassCode: compass.code,
      targetPoint: nextStep.startLocation,
      method: 'next_step',
    };
  }

  // 6. Fallback: Bearing towards destination
  if (fallbackDestination) {
    const heading = calculateBearing(cameraPosition, fallbackDestination);
    const compass = getCompassDirection(heading);
    return {
      heading: Math.round(heading * 10) / 10,
      cameraPosition,
      directionLabel: compass.label,
      compassCode: compass.code,
      targetPoint: fallbackDestination,
      method: 'fallback',
    };
  }

  // Default neutral facing
  return {
    heading: 0,
    cameraPosition,
    directionLabel: 'North',
    compassCode: 'N',
    targetPoint: null,
    method: 'fallback',
  };
}

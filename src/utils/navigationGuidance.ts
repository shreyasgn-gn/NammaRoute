/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouteStep } from '../types/routes';
import { calculateDistanceMeters } from './geo';
import { getVerifiedStepMode } from './transitStages';

export type ManeuverType =
  | 'turn_left'
  | 'turn_right'
  | 'slight_left'
  | 'slight_right'
  | 'u_turn'
  | 'straight'
  | 'board_bus'
  | 'board_metro'
  | 'alight_bus'
  | 'alight_metro'
  | 'transfer_walk'
  | 'walk'
  | 'arrive';

export interface ManeuverDetails {
  type: ManeuverType;
  actionTitle: string;
  subTitle: string;
  distanceToTurnMeters: number;
  distanceToTurnText: string;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return '< 1 min';
  }
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} hr ${remMins} min` : `${hours} hr`;
}

/**
 * Analyzes step instructions and metadata to return clean Google Maps-style maneuver details
 */
export function parseStepManeuver(
  step: RouteStep,
  stepIndex: number,
  totalSteps: number,
  userCoords?: { lat: number; lng: number } | null
): ManeuverDetails {
  const isLast = stepIndex >= totalSteps - 1;
  const isTransit = step.travelMode === 'TRANSIT';
  const td = step.transitDetails;
  const verifiedMode = getVerifiedStepMode(step);
  const isMetro = isTransit && verifiedMode === 'METRO';

  // Distance to the end of this maneuver/step
  let distToTurn = step.distanceMeters || 0;
  if (userCoords && step.endLocation) {
    const liveDist = calculateDistanceMeters(userCoords, step.endLocation);
    // If user is within reasonable range (e.g. within 2x step distance or 5km), use real distance
    if (liveDist >= 0 && liveDist <= Math.max(distToTurn * 2, 5000)) {
      distToTurn = liveDist;
    }
  }

  const distText = formatDistance(distToTurn);
  const rawText = (step.instructions || '').toLowerCase();

  if (isLast && distToTurn < 40) {
    return {
      type: 'arrive',
      actionTitle: 'Arriving at destination',
      subTitle: step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }

  if (isTransit) {
    if (isMetro) {
      return {
        type: 'board_metro',
        actionTitle: `Board Namma Metro ${td?.line.shortName || td?.line.name || ''}`,
        subTitle: td?.headsign ? `Towards ${td.headsign} (${td.stopCount} stops)` : step.instructions,
        distanceToTurnMeters: distToTurn,
        distanceToTurnText: distText,
      };
    }
    return {
      type: 'board_bus',
      actionTitle: `Board BMTC Bus ${td?.line.shortName || td?.line.name || ''}`,
      subTitle: td?.headsign ? `Towards ${td.headsign} (${td.stopCount} stops)` : step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }

  // Walking maneuvers
  if (rawText.includes('u-turn') || rawText.includes('uturn')) {
    return {
      type: 'u_turn',
      actionTitle: `Make a U-turn in ${distText}`,
      subTitle: step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }
  if (rawText.includes('slight left')) {
    return {
      type: 'slight_left',
      actionTitle: `Slight left in ${distText}`,
      subTitle: step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }
  if (rawText.includes('slight right')) {
    return {
      type: 'slight_right',
      actionTitle: `Slight right in ${distText}`,
      subTitle: step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }
  if (rawText.includes('turn left')) {
    return {
      type: 'turn_left',
      actionTitle: `Turn left in ${distText}`,
      subTitle: step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }
  if (rawText.includes('turn right')) {
    return {
      type: 'turn_right',
      actionTitle: `Turn right in ${distText}`,
      subTitle: step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }
  if (rawText.includes('continue') || rawText.includes('straight') || rawText.includes('head')) {
    return {
      type: 'straight',
      actionTitle: `Continue straight for ${distText}`,
      subTitle: step.instructions,
      distanceToTurnMeters: distToTurn,
      distanceToTurnText: distText,
    };
  }

  // Generic walking
  return {
    type: 'walk',
    actionTitle: `Walk ${distText}`,
    subTitle: step.instructions,
    distanceToTurnMeters: distToTurn,
    distanceToTurnText: distText,
  };
}

/**
 * Calculates remaining route statistics strictly based on returned route geometry
 */
export function calculateRemainingRouteStats(
  steps: RouteStep[],
  currentStepIndex: number,
  userCoords?: { lat: number; lng: number } | null
) {
  if (!steps || steps.length === 0 || currentStepIndex >= steps.length) {
    return {
      remainingMeters: 0,
      remainingDistanceText: '0 m',
      remainingSeconds: 0,
      remainingDurationText: '0 min',
      etaFormatted: '--:--',
      distanceToTurnMeters: 0,
      distanceToTurnText: '0 m',
    };
  }

  const currentStep = steps[currentStepIndex];

  // Calculate real distance to next turn/step boundary
  let distToNextTurn = currentStep.distanceMeters || 0;
  if (userCoords && currentStep.endLocation) {
    const liveDist = calculateDistanceMeters(userCoords, currentStep.endLocation);
    if (liveDist >= 0 && liveDist <= Math.max(distToNextTurn * 2, 5000)) {
      distToNextTurn = liveDist;
    }
  }

  // Sum remaining steps
  let remainingMeters = distToNextTurn;
  let remainingSeconds = currentStep.durationSeconds || 0;

  for (let i = currentStepIndex + 1; i < steps.length; i++) {
    remainingMeters += steps[i].distanceMeters || 0;
    remainingSeconds += steps[i].durationSeconds || 0;
  }

  const etaDate = new Date(Date.now() + remainingSeconds * 1000);
  const etaFormatted = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    remainingMeters,
    remainingDistanceText: formatDistance(remainingMeters),
    remainingSeconds,
    remainingDurationText: formatDuration(remainingSeconds),
    etaFormatted,
    distanceToTurnMeters: distToNextTurn,
    distanceToTurnText: formatDistance(distToNextTurn),
  };
}

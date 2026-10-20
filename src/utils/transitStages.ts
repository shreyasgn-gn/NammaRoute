/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JourneyRoute, JourneyStage, RouteStep, TransportOptionCategory } from '../types/routes';

/**
 * Formats distance in meters to a human-readable string.
 */
export function formatMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats seconds into minutes / hours.
 */
export function formatSeconds(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min${mins === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} hr ${remMins} mins` : `${hours} hr`;
}

/**
 * Determines verified transport mode from actual step data.
 * Source of truth: step.travelMode and step.transitDetails (vehicleType, agencyName, line).
 * Returns 'BUS', 'METRO', 'WALK', or null if indeterminate.
 */
export function getVerifiedStepMode(step?: RouteStep | null): 'BUS' | 'METRO' | 'WALK' | null {
  if (!step) return null;

  // 1. Walking Step (Requirement 5)
  if (step.travelMode === 'WALK') {
    return 'WALK';
  }

  // 2. Transit Step (Requirement 3, 4, 6 & 9)
  if (step.travelMode === 'TRANSIT') {
    const rawVType = (step.transitDetails?.line?.vehicleType || '').toUpperCase();
    const agency = (step.transitDetails?.line?.agencyName || '').toLowerCase();
    const lineName = (step.transitDetails?.line?.name || '').toLowerCase();
    const shortName = (step.transitDetails?.line?.shortName || '').toLowerCase();

    // Check BMTC authority or BMTC line markers first (absolute priority for bus authority in Bengaluru)
    const isBmtcAgency =
      agency.includes('bmtc') ||
      agency.includes('bangalore metropolitan transport') ||
      agency.includes('bengaluru metropolitan transport');

    const isBmtcLine =
      lineName.includes('bmtc') ||
      shortName.includes('bmtc');

    const isBusVehicleType =
      rawVType === 'BUS' ||
      rawVType === 'INTERCITY_BUS' ||
      rawVType === 'TROLLEYBUS';

    if (isBmtcAgency || isBmtcLine || isBusVehicleType) {
      return 'BUS';
    }

    // Check BMRCL authority or verified Namma Metro line markers
    const isBmrclAgency =
      agency.includes('bmrcl') ||
      agency.includes('bangalore metro rail') ||
      agency.includes('bengaluru metro rail') ||
      agency.includes('namma metro');

    const isMetroLineName =
      lineName.includes('namma metro') ||
      shortName.includes('namma metro') ||
      lineName.includes('purple line') ||
      lineName.includes('green line') ||
      lineName.includes('yellow line') ||
      lineName.includes('pink line') ||
      lineName.includes('blue line') ||
      shortName.includes('purple line') ||
      shortName.includes('green line');

    const isMetroVehicleType =
      rawVType === 'SUBWAY' ||
      rawVType === 'METRO_RAIL' ||
      rawVType === 'MONORAIL' ||
      rawVType === 'TRAIN' ||
      rawVType === 'HEAVY_RAIL';

    if (isBmrclAgency || isMetroLineName || isMetroVehicleType) {
      return 'METRO';
    }

    // If step data does not provide sufficient data to determine mode, do not guess (Requirement 9)
    return null;
  }

  return null;
}

/**
 * Categorizes a route based on transit vehicles involved.
 */
export function categorizeRoute(route: Partial<JourneyRoute>): {
  transportType: TransportOptionCategory;
  categoryLabel: string;
} {
  const steps = route.steps || [];
  const transitSteps = steps.filter((s) => s.travelMode === 'TRANSIT');

  if (transitSteps.length === 0) {
    return {
      transportType: 'WALK',
      categoryLabel: 'Direct Walking',
    };
  }

  let hasMetro = false;
  let hasBus = false;

  for (const ts of transitSteps) {
    const mode = getVerifiedStepMode(ts);
    if (mode === 'METRO') {
      hasMetro = true;
    } else if (mode === 'BUS') {
      hasBus = true;
    }
  }

  if (hasMetro && hasBus) {
    return {
      transportType: 'BUS_METRO',
      categoryLabel: 'Bus + Metro',
    };
  }

  if (hasMetro) {
    return {
      transportType: 'METRO',
      categoryLabel: 'Namma Metro',
    };
  }

  return {
    transportType: 'BUS',
    categoryLabel: 'BMTC Bus',
  };
}

/**
 * Calculates separated walking segments breakdown (Requirement 2 & 1)
 */
export function calculateWalkingSegments(steps: RouteStep[] = []) {
  let firstMileMeters = 0;
  let firstMileSeconds = 0;
  let lastMileMeters = 0;
  let lastMileSeconds = 0;
  let transferMeters = 0;
  let transferSeconds = 0;
  let totalWalkMeters = 0;
  let totalWalkSeconds = 0;

  const transitIndices = steps
    .map((s, idx) => (s.travelMode === 'TRANSIT' ? idx : -1))
    .filter((idx) => idx !== -1);

  if (transitIndices.length === 0) {
    // Pure walk
    for (const s of steps) {
      totalWalkMeters += s.distanceMeters || 0;
      totalWalkSeconds += s.durationSeconds || 0;
    }
    return {
      firstMileMeters: totalWalkMeters,
      firstMileText: formatMeters(totalWalkMeters),
      lastMileMeters: 0,
      lastMileText: '0 m',
      transferMeters: 0,
      transferText: '0 m',
      totalWalkMeters,
      totalWalkText: formatMeters(totalWalkMeters),
      totalWalkSeconds,
      totalWalkDurationText: formatSeconds(totalWalkSeconds),
    };
  }

  const firstTransitIdx = transitIndices[0];
  const lastTransitIdx = transitIndices[transitIndices.length - 1];

  steps.forEach((step, sIdx) => {
    if (step.travelMode !== 'WALK') return;

    const dist = step.distanceMeters || 0;
    const dur = step.durationSeconds || 0;
    totalWalkMeters += dist;
    totalWalkSeconds += dur;

    if (sIdx < firstTransitIdx) {
      firstMileMeters += dist;
      firstMileSeconds += dur;
    } else if (sIdx > lastTransitIdx) {
      lastMileMeters += dist;
      lastMileSeconds += dur;
    } else {
      transferMeters += dist;
      transferSeconds += dur;
    }
  });

  return {
    firstMileMeters,
    firstMileText: formatMeters(firstMileMeters),
    lastMileMeters,
    lastMileText: formatMeters(lastMileMeters),
    transferMeters,
    transferText: formatMeters(transferMeters),
    totalWalkMeters,
    totalWalkText: formatMeters(totalWalkMeters),
    totalWalkSeconds,
    totalWalkDurationText: formatSeconds(totalWalkSeconds),
  };
}

/**
 * Builds clear, sequential stages for the journey (Requirement 2):
 * - Walk from user's starting point to correct bus stop or metro station
 * - Show verified bus number and direction, or correct metro line and direction
 * - Explain where to board and where to get off
 * - Show transfer instructions if user needs to change buses or metro lines
 * - Guide user from final stop or station to their destination
 * - Display walking distance for each walking segment separately
 */
export function buildJourneyStages(
  route: JourneyRoute,
  originName: string,
  destName: string
): JourneyStage[] {
  const steps = route.steps || [];
  if (steps.length === 0) return [];

  const transitIndices = steps
    .map((s, idx) => (s.travelMode === 'TRANSIT' ? idx : -1))
    .filter((idx) => idx !== -1);

  const stages: JourneyStage[] = [];
  let stageNumber = 1;

  // Case A: Pure Walking Journey
  if (transitIndices.length === 0) {
    stages.push({
      stageNumber: 1,
      stageType: 'WALK_DIRECT',
      title: `Walk to ${destName}`,
      stageBadge: 'Direct Walk',
      instructions: steps.map((s) => s.instructions).join(' Then '),
      walkingDistanceMeters: route.walkingDistanceMeters || route.distanceMeters,
      walkingDistanceText: route.walkingDistanceText || route.distanceText,
      durationSeconds: route.durationSeconds,
      durationText: route.durationText,
      stepIndex: 0,
      fromPlace: originName,
      toPlace: destName,
    });
    return stages;
  }

  // Case B: Public Transit Journey with Stages
  const firstTransitIdx = transitIndices[0];
  const firstTransitStep = steps[firstTransitIdx];
  const firstTD = firstTransitStep?.transitDetails;
  const isFirstMetro = getVerifiedStepMode(firstTransitStep) === 'METRO';

  // 1. Stage: First-Mile Guidance (Walk from origin to first transit stop)
  if (firstTransitIdx > 0 || steps[0].travelMode === 'WALK') {
    let walkDist = 0;
    let walkSecs = 0;
    const walkInstructions: string[] = [];

    for (let i = 0; i < firstTransitIdx; i++) {
      walkDist += steps[i].distanceMeters || 0;
      walkSecs += steps[i].durationSeconds || 0;
      if (steps[i].instructions) walkInstructions.push(steps[i].instructions);
    }

    const firstStopName = firstTD?.departureStop?.name || (isFirstMetro ? 'Metro Station' : 'Bus Stop');

    stages.push({
      stageNumber: stageNumber++,
      stageType: 'WALK_FIRST_MILE',
      title: `Walk to ${firstStopName}`,
      stageBadge: 'First-Mile Walk',
      instructions:
        walkInstructions.length > 0
          ? walkInstructions.join(' Then ')
          : `Walk from ${originName} to ${firstStopName}.`,
      walkingDistanceMeters: walkDist,
      walkingDistanceText: formatMeters(walkDist),
      durationSeconds: walkSecs,
      durationText: formatSeconds(walkSecs),
      stepIndex: 0,
      fromPlace: originName,
      toPlace: firstStopName,
    });
  }

  // 2. Iterate through each transit leg and intermediate transfers
  for (let t = 0; t < transitIndices.length; t++) {
    const curTransitIdx = transitIndices[t];
    const curStep = steps[curTransitIdx];
    const td = curStep.transitDetails;
    const isMetro = getVerifiedStepMode(curStep) === 'METRO';
    const lineLabel = td?.line?.shortName || td?.line?.name || (isMetro ? 'Metro Line' : 'BMTC Bus');
    const boardStop = td?.departureStop?.name || (isMetro ? 'Metro Station' : 'Bus Stop');
    const alightStop = td?.arrivalStop?.name || (isMetro ? 'Exit Station' : 'Arrival Stop');
    const headsign = td?.headsign ? `Towards ${td.headsign}` : '';

    // Transit Stage
    stages.push({
      stageNumber: stageNumber++,
      stageType: isMetro ? 'TRANSIT_METRO' : 'TRANSIT_BUS',
      title: isMetro ? `Ride Namma Metro (${lineLabel})` : `Board BMTC Bus (${lineLabel})`,
      stageBadge: isMetro ? 'Namma Metro' : 'BMTC Bus',
      instructions: `Board ${isMetro ? 'metro' : 'bus'} ${lineLabel} at ${boardStop}${
        headsign ? ` (${headsign})` : ''
      }. Ride for ${td?.stopCount || 1} stops (${curStep.durationText}) and alight at ${alightStop}.`,
      walkingDistanceMeters: 0,
      walkingDistanceText: '0 m',
      durationSeconds: curStep.durationSeconds,
      durationText: curStep.durationText,
      stepIndex: curTransitIdx,
      departureStopName: boardStop,
      departureTimeFormatted: td?.departureTimeFormatted,
      arrivalStopName: alightStop,
      arrivalTimeFormatted: td?.arrivalTimeFormatted,
      lineIdentifier: lineLabel,
      directionHeadsign: headsign,
      stopCount: td?.stopCount || 0,
      agencyName: td?.line?.agencyName || (isMetro ? 'BMRCL' : 'BMTC'),
      color: td?.line?.color,
      textColor: td?.line?.textColor,
      fromPlace: boardStop,
      toPlace: alightStop,
    });

    // Check if there is a transfer walk to the next transit leg
    if (t < transitIndices.length - 1) {
      const nextTransitIdx = transitIndices[t + 1];
      const nextStep = steps[nextTransitIdx];
      const nextTD = nextStep.transitDetails;
      const nextBoardStop = nextTD?.departureStop?.name || 'Next Transit Stop';
      const nextLineLabel = nextTD?.line?.shortName || nextTD?.line?.name || 'connecting service';

      let transferDist = 0;
      let transferSecs = 0;
      const transferWalkInstr: string[] = [];

      for (let w = curTransitIdx + 1; w < nextTransitIdx; w++) {
        transferDist += steps[w].distanceMeters || 0;
        transferSecs += steps[w].durationSeconds || 0;
        if (steps[w].instructions) transferWalkInstr.push(steps[w].instructions);
      }

      stages.push({
        stageNumber: stageNumber++,
        stageType: 'TRANSFER_WALK',
        title: `Transfer: Walk to ${nextBoardStop}`,
        stageBadge: 'Transfer Connection',
        instructions: `Alight from ${lineLabel} at ${alightStop}. ${
          transferWalkInstr.length > 0 ? transferWalkInstr.join(' Then ') : `Walk ${formatMeters(transferDist)}`
        } to reach ${nextBoardStop} to connect with ${nextLineLabel}.`,
        walkingDistanceMeters: transferDist,
        walkingDistanceText: formatMeters(transferDist),
        durationSeconds: transferSecs,
        durationText: formatSeconds(transferSecs),
        stepIndex: curTransitIdx + 1,
        fromPlace: alightStop,
        toPlace: nextBoardStop,
      });
    }
  }

  // 3. Stage: Last-Mile Guidance (Walk from final transit stop to destination)
  const lastTransitIdx = transitIndices[transitIndices.length - 1];
  if (lastTransitIdx < steps.length - 1) {
    let lastWalkDist = 0;
    let lastWalkSecs = 0;
    const lastWalkInstr: string[] = [];

    for (let l = lastTransitIdx + 1; l < steps.length; l++) {
      lastWalkDist += steps[l].distanceMeters || 0;
      lastWalkSecs += steps[l].durationSeconds || 0;
      if (steps[l].instructions) lastWalkInstr.push(steps[l].instructions);
    }

    const lastStopName =
      steps[lastTransitIdx]?.transitDetails?.arrivalStop?.name || 'Final Transit Stop';

    stages.push({
      stageNumber: stageNumber++,
      stageType: 'WALK_LAST_MILE',
      title: `Walk to ${destName}`,
      stageBadge: 'Last-Mile Walk',
      instructions:
        lastWalkInstr.length > 0
          ? lastWalkInstr.join(' Then ')
          : `Exit at ${lastStopName} and walk ${formatMeters(lastWalkDist)} to arrive at ${destName}.`,
      walkingDistanceMeters: lastWalkDist,
      walkingDistanceText: formatMeters(lastWalkDist),
      durationSeconds: lastWalkSecs,
      durationText: formatSeconds(lastWalkSecs),
      stepIndex: lastTransitIdx + 1,
      fromPlace: lastStopName,
      toPlace: destName,
    });
  }

  return stages;
}

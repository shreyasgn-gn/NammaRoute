import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_SERVER_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyC1v5Rf9GLyTDwlUMAuLgcZ-KjLD27sfdc';

// Helper: Haversine distance in meters
function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Helper: Format duration seconds
function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min${mins === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} hr ${remMins} mins` : `${hours} hr${hours === 1 ? '' : 's'}`;
}

// Helper: Format meters
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Helper: Format ISO timestamp in Asia/Kolkata
function formatTime(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

// Geocode fallback for text addresses in Bengaluru
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', `${address}, Bengaluru, India`);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('region', 'in');

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      return {
        lat: loc.lat,
        lng: loc.lng,
        formatted: data.results[0].formatted_address,
      };
    }
    return null;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

// API: Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(GOOGLE_MAPS_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// API: Nearby transit stops
app.post('/api/places/nearby-transit', async (req: Request, res: Response) => {
  const { lat, lng, radius = 1500 } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  try {
    const endpoint = 'https://places.googleapis.com/v1/places:searchNearby';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.formattedAddress',
      },
      body: JSON.stringify({
        includedTypes: ['transit_station', 'bus_station', 'subway_station', 'bus_stop'],
        maxResultCount: 8,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(Number(radius), 3000),
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Places API error:', errText);
      return res.status(502).json({ error: 'Failed to query nearby transit places', details: errText });
    }

    const data = await response.json();
    const rawPlaces = data.places || [];

    const stops = rawPlaces.map((p: any) => {
      const types: string[] = p.types || [];
      let type: 'METRO' | 'BUS' | 'TRAIN' = 'BUS';

      if (types.includes('subway_station') || (p.displayName?.text && p.displayName.text.toLowerCase().includes('metro'))) {
        type = 'METRO';
      } else if (types.includes('train_station')) {
        type = 'TRAIN';
      }

      const pLat = p.location?.latitude || 0;
      const pLng = p.location?.longitude || 0;
      const dist = getHaversineDistance(lat, lng, pLat, pLng);

      return {
        id: p.id,
        name: p.displayName?.text || 'Transit Stop',
        type,
        types,
        address: p.formattedAddress || '',
        lat: pLat,
        lng: pLng,
        distanceMeters: dist,
      };
    });

    // Sort by distance
    stops.sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);

    return res.json({ stops });
  } catch (err: any) {
    console.error('Error fetching nearby transit:', err);
    return res.status(500).json({ error: 'Internal server error fetching transit stops', message: err.message });
  }
});

// API: Real Google Routes transit planning
app.post('/api/routes/transit', async (req: Request, res: Response) => {
  const { origin, destination, routingPreference } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  // Resolve coordinates if missing
  let originLat = origin.lat;
  let originLng = origin.lng;
  let originName = origin.name || 'Starting Point';

  let destLat = destination.lat;
  let destLng = destination.lng;
  let destName = destination.name || 'Destination';

  if (typeof originLat !== 'number' || typeof originLng !== 'number') {
    const geo = await geocodeAddress(originName);
    if (!geo) {
      return res.status(404).json({ error: `Could not geocode origin location "${originName}" in Bengaluru` });
    }
    originLat = geo.lat;
    originLng = geo.lng;
  }

  if (typeof destLat !== 'number' || typeof destLng !== 'number') {
    const geo = await geocodeAddress(destName);
    if (!geo) {
      return res.status(404).json({ error: `Could not geocode destination location "${destName}" in Bengaluru` });
    }
    destLat = geo.lat;
    destLng = geo.lng;
  }

  try {
    const requestPayload: any = {
      origin: {
        location: {
          latLng: { latitude: originLat, longitude: originLng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destLat, longitude: destLng },
        },
      },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: true,
      languageCode: 'en-IN',
    };

    if (routingPreference && routingPreference !== 'DEFAULT') {
      requestPayload.transitPreferences = {
        routingPreference,
      };
    }

    const directDistanceMeters = getHaversineDistance(originLat, originLng, destLat, destLng);
    const endpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    // Query 1: Public Transit routes
    const transitRequestPayload: any = {
      origin: {
        location: {
          latLng: { latitude: originLat, longitude: originLng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destLat, longitude: destLng },
        },
      },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: true,
      languageCode: 'en-IN',
    };

    if (routingPreference && routingPreference !== 'DEFAULT') {
      transitRequestPayload.transitPreferences = {
        routingPreference,
      };
    }

    // Prepare parallel queries: TRANSIT and (if feasible walking distance <= 5000m) WALK
    const transitPromise = fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps,routes.warnings',
      },
      body: JSON.stringify(transitRequestPayload),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.warn('Google Routes transit error:', text);
        return { routes: [] };
      }
      return res.json();
    }).catch((err) => {
      console.error('Transit fetch exception:', err);
      return { routes: [] };
    });

    const shouldQueryWalk = directDistanceMeters <= 5000;
    const walkPromise = shouldQueryWalk
      ? fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask':
              'routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps,routes.warnings',
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
            destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
            travelMode: 'WALK',
            languageCode: 'en-IN',
          }),
        }).then(async (res) => {
          if (!res.ok) return { routes: [] };
          return res.json();
        }).catch(() => ({ routes: [] }))
      : Promise.resolve({ routes: [] });

    const [transitData, walkData] = await Promise.all([transitPromise, walkPromise]);

    const rawTransitRoutes = transitData.routes || [];
    const rawWalkRoutes = walkData.routes || [];

    if (rawTransitRoutes.length === 0 && rawWalkRoutes.length === 0) {
      return res.json({
        success: false,
        origin: { name: originName, lat: originLat, lng: originLng },
        destination: { name: destName, lat: destLat, lng: destLng },
        routes: [],
        dataNotice:
          'No direct or connecting public transit routes found between these locations via Google Routes API. BMTC local feeder services in some outer zones of Bengaluru are not currently included in public GTFS data. Try selecting a nearby arterial road, TTMC bus stand, or Namma Metro station.',
      });
    }

    const processedRoutes: any[] = [];
    let routeCounter = 1;

    // Helper to process steps & compute separate walking segments
    const parseStepsAndStages = (leg: any, isDirectWalk: boolean = false) => {
      let walkingDistanceMeters = 0;
      let walkingDurationSeconds = 0;
      let transitLegCount = 0;
      const transitLines: any[] = [];
      const transitModesSet = new Set<string>();

      const steps: any[] = (leg.steps || []).map((s: any) => {
        const stepDist = s.distanceMeters || 0;
        const stepDurationSec = parseInt((s.staticDuration || s.duration || '0s').replace('s', ''), 10);
        const polyline = s.polyline?.encodedPolyline || '';
        const startLoc = {
          lat: s.startLocation?.latLng?.latitude || 0,
          lng: s.startLocation?.latLng?.longitude || 0,
        };
        const endLoc = {
          lat: s.endLocation?.latLng?.latitude || 0,
          lng: s.endLocation?.latLng?.longitude || 0,
        };

        if (s.travelMode === 'TRANSIT' && s.transitDetails) {
          transitLegCount += 1;
          const td = s.transitDetails;
          const tLine = td.transitLine || {};
          const vehicle = tLine.vehicle || {};
          const rawVType = (vehicle.type || '').toUpperCase();
          const agencyName = (tLine.agencies?.[0]?.name || '').toLowerCase();
          const lineName = (tLine.name || '').toLowerCase();
          const shortName = (tLine.nameShort || '').toLowerCase();

          const isBus =
            rawVType === 'BUS' ||
            rawVType === 'INTERCITY_BUS' ||
            rawVType === 'TROLLEYBUS' ||
            agencyName.includes('bmtc') ||
            agencyName.includes('bangalore metropolitan transport') ||
            agencyName.includes('bengaluru metropolitan transport') ||
            lineName.includes('bmtc') ||
            shortName.includes('bmtc');

          const isMetro =
            !isBus &&
            (rawVType === 'SUBWAY' ||
              rawVType === 'METRO_RAIL' ||
              rawVType === 'MONORAIL' ||
              agencyName.includes('bmrcl') ||
              agencyName.includes('bangalore metro rail') ||
              agencyName.includes('bengaluru metro rail') ||
              agencyName.includes('namma metro') ||
              lineName.includes('namma metro') ||
              shortName.includes('namma metro') ||
              lineName.includes('purple line') ||
              lineName.includes('green line') ||
              lineName.includes('yellow line') ||
              lineName.includes('pink line') ||
              lineName.includes('blue line'));

          const vehicleType: 'BUS' | 'SUBWAY' = isMetro ? 'SUBWAY' : 'BUS';

          const lineInfo = {
            name: tLine.name || tLine.nameShort || (isMetro ? 'Namma Metro Line' : 'BMTC Bus'),
            shortName: tLine.nameShort || tLine.name || '',
            vehicleType,
            agencyName: tLine.agencies?.[0]?.name || (isMetro ? 'BMRCL (Namma Metro)' : 'BMTC'),
            agencyUri: tLine.agencies?.[0]?.uri,
            color: tLine.color || (isMetro ? '#9333ea' : '#2563eb'),
            textColor: tLine.textColor,
          };

          transitLines.push(lineInfo);
          transitModesSet.add(isMetro ? 'Namma Metro' : 'BMTC Bus');

          return {
            travelMode: 'TRANSIT',
            instructions: s.navigationInstruction?.instructions || `Take ${lineInfo.name}`,
            distanceMeters: stepDist,
            distanceText: formatDistance(stepDist),
            durationSeconds: stepDurationSec,
            durationText: formatDuration(stepDurationSec),
            polyline,
            startLocation: startLoc,
            endLocation: endLoc,
            transitDetails: {
              line: lineInfo,
              headsign: td.headsign || '',
              stopCount: td.stopCount || 1,
              departureStop: {
                name: td.stopDetails?.departureStop?.name || (isMetro ? 'Metro Station' : 'Bus Stop'),
                lat: td.stopDetails?.departureStop?.location?.latLng?.latitude || startLoc.lat,
                lng: td.stopDetails?.departureStop?.location?.latLng?.longitude || startLoc.lng,
              },
              departureTime: td.stopDetails?.departureTime,
              departureTimeFormatted: formatTime(td.stopDetails?.departureTime),
              arrivalStop: {
                name: td.stopDetails?.arrivalStop?.name || (isMetro ? 'Metro Station' : 'Bus Stop'),
                lat: td.stopDetails?.arrivalStop?.location?.latLng?.latitude || endLoc.lat,
                lng: td.stopDetails?.arrivalStop?.location?.latLng?.longitude || endLoc.lng,
              },
              arrivalTime: td.stopDetails?.arrivalTime,
              arrivalTimeFormatted: formatTime(td.stopDetails?.arrivalTime),
            },
          };
        }

        // Walk step
        walkingDistanceMeters += stepDist;
        walkingDurationSeconds += stepDurationSec;

        return {
          travelMode: 'WALK',
          instructions: s.navigationInstruction?.instructions || 'Walk along path',
          distanceMeters: stepDist,
          distanceText: formatDistance(stepDist),
          durationSeconds: stepDurationSec,
          durationText: formatDuration(stepDurationSec),
          polyline,
          startLocation: startLoc,
          endLocation: endLoc,
        };
      });

      // Compute separate walking distances: First-mile, Last-mile, and Transfers (Requirement 2)
      let firstMileWalkingMeters = 0;
      let lastMileWalkingMeters = 0;
      let transferWalkingMeters = 0;

      const transitStepIndices = steps
        .map((s, idx) => (s.travelMode === 'TRANSIT' ? idx : -1))
        .filter((idx) => idx !== -1);

      if (transitStepIndices.length === 0) {
        firstMileWalkingMeters = walkingDistanceMeters;
      } else {
        const firstTransitIdx = transitStepIndices[0];
        const lastTransitIdx = transitStepIndices[transitStepIndices.length - 1];

        steps.forEach((step, idx) => {
          if (step.travelMode !== 'WALK') return;
          if (idx < firstTransitIdx) {
            firstMileWalkingMeters += step.distanceMeters;
          } else if (idx > lastTransitIdx) {
            lastMileWalkingMeters += step.distanceMeters;
          } else {
            transferWalkingMeters += step.distanceMeters;
          }
        });
      }

      // Generate clear, sequential stages (Requirement 2)
      const stages: any[] = [];
      let stageNumber = 1;

      if (transitStepIndices.length === 0) {
        // Direct walk
        stages.push({
          stageNumber: 1,
          stageType: 'WALK_DIRECT',
          title: `Walk to ${destName}`,
          stageBadge: 'Direct Walk',
          instructions: steps.map((s) => s.instructions).join(' · '),
          walkingDistanceMeters,
          walkingDistanceText: formatDistance(walkingDistanceMeters),
          durationSeconds: walkingDurationSeconds,
          durationText: formatDuration(walkingDurationSeconds),
          stepIndex: 0,
          fromPlace: originName,
          toPlace: destName,
        });
      } else {
        const firstTransitIdx = transitStepIndices[0];
        const firstTransitStep = steps[firstTransitIdx];
        const firstTD = firstTransitStep?.transitDetails;
        const isFirstMetro = firstTD?.line?.vehicleType === 'SUBWAY';
        const firstBoardingStop = firstTD?.departureStop?.name || (isFirstMetro ? 'Metro Station' : 'Bus Stop');

        // Stage 1: First-Mile Walk to transit
        if (firstMileWalkingMeters > 0 || firstTransitIdx > 0) {
          stages.push({
            stageNumber: stageNumber++,
            stageType: 'WALK_FIRST_MILE',
            title: `Walk to ${firstBoardingStop}`,
            stageBadge: 'First-Mile Walk',
            instructions: `Walk from ${originName} to ${firstBoardingStop}.`,
            walkingDistanceMeters: firstMileWalkingMeters,
            walkingDistanceText: formatDistance(firstMileWalkingMeters),
            durationSeconds: Math.round(firstMileWalkingMeters / 1.3),
            durationText: formatDuration(Math.round(firstMileWalkingMeters / 1.3)),
            stepIndex: 0,
            fromPlace: originName,
            toPlace: firstBoardingStop,
          });
        }

        // Sequential Transit & Transfer stages
        for (let t = 0; t < transitStepIndices.length; t++) {
          const curIdx = transitStepIndices[t];
          const curStep = steps[curIdx];
          const td = curStep.transitDetails;
          const isMetro = td.line.vehicleType === 'SUBWAY';
          const lineName = td.line.shortName || td.line.name;
          const headsign = td.headsign ? `towards ${td.headsign}` : '';

          stages.push({
            stageNumber: stageNumber++,
            stageType: isMetro ? 'TRANSIT_METRO' : 'TRANSIT_BUS',
            title: isMetro ? `Ride Namma Metro (${lineName})` : `Board BMTC Bus (${lineName})`,
            stageBadge: isMetro ? 'Namma Metro' : 'BMTC Bus',
            instructions: `Board ${isMetro ? 'Namma Metro' : 'BMTC Bus'} ${lineName} ${headsign} at ${td.departureStop.name}. Ride for ${td.stopCount} stops and alight at ${td.arrivalStop.name}.`,
            walkingDistanceMeters: 0,
            walkingDistanceText: '0 m',
            durationSeconds: curStep.durationSeconds,
            durationText: curStep.durationText,
            stepIndex: curIdx,
            departureStopName: td.departureStop.name,
            departureTimeFormatted: td.departureTimeFormatted,
            arrivalStopName: td.arrivalStop.name,
            arrivalTimeFormatted: td.arrivalTimeFormatted,
            lineIdentifier: lineName,
            directionHeadsign: td.headsign,
            stopCount: td.stopCount,
            agencyName: td.line.agencyName,
            color: td.line.color,
            fromPlace: td.departureStop.name,
            toPlace: td.arrivalStop.name,
          });

          // Transfer stage if intermediate transfer exists
          if (t < transitStepIndices.length - 1) {
            const nextIdx = transitStepIndices[t + 1];
            const nextStep = steps[nextIdx];
            const nextTD = nextStep.transitDetails;

            let transferWalkDist = 0;
            for (let w = curIdx + 1; w < nextIdx; w++) {
              transferWalkDist += steps[w].distanceMeters;
            }

            stages.push({
              stageNumber: stageNumber++,
              stageType: 'TRANSFER_WALK',
              title: `Transfer to ${nextTD.line.shortName || nextTD.line.name}`,
              stageBadge: 'Transfer Walk',
              instructions: `Alight from ${lineName} at ${td.arrivalStop.name}. Walk ${formatDistance(transferWalkDist)} to connect with ${nextTD.line.shortName || nextTD.line.name} at ${nextTD.departureStop.name}.`,
              walkingDistanceMeters: transferWalkDist,
              walkingDistanceText: formatDistance(transferWalkDist),
              durationSeconds: Math.round(transferWalkDist / 1.3),
              durationText: formatDuration(Math.round(transferWalkDist / 1.3)),
              stepIndex: curIdx + 1,
              fromPlace: td.arrivalStop.name,
              toPlace: nextTD.departureStop.name,
            });
          }
        }

        // Last-Mile Walk to Destination
        const lastTransitIdx = transitStepIndices[transitStepIndices.length - 1];
        if (lastMileWalkingMeters > 0 || lastTransitIdx < steps.length - 1) {
          const finalStopName = steps[lastTransitIdx]?.transitDetails?.arrivalStop?.name || 'Final Station';
          stages.push({
            stageNumber: stageNumber++,
            stageType: 'WALK_LAST_MILE',
            title: `Walk to ${destName}`,
            stageBadge: 'Last-Mile Walk',
            instructions: `Exit from ${finalStopName} and walk ${formatDistance(lastMileWalkingMeters)} to arrive at ${destName}.`,
            walkingDistanceMeters: lastMileWalkingMeters,
            walkingDistanceText: formatDistance(lastMileWalkingMeters),
            durationSeconds: Math.round(lastMileWalkingMeters / 1.3),
            durationText: formatDuration(Math.round(lastMileWalkingMeters / 1.3)),
            stepIndex: lastTransitIdx + 1,
            fromPlace: finalStopName,
            toPlace: destName,
          });
        }
      }

      return {
        steps,
        stages,
        walkingDistanceMeters,
        walkingDistanceText: formatDistance(walkingDistanceMeters),
        walkingDurationSeconds,
        walkingDurationText: formatDuration(walkingDurationSeconds),
        firstMileWalkingMeters,
        firstMileWalkingText: formatDistance(firstMileWalkingMeters),
        lastMileWalkingMeters,
        lastMileWalkingText: formatDistance(lastMileWalkingMeters),
        transferWalkingMeters,
        transferWalkingText: formatDistance(transferWalkingMeters),
        transitLegCount,
        transitLines,
        transitModes: Array.from(transitModesSet),
      };
    };

    // 1. Process returned Transit Routes
    rawTransitRoutes.forEach((r: any) => {
      const leg = r.legs?.[0] || {};
      const durationSeconds = parseInt((r.duration || leg.duration || '0s').replace('s', ''), 10);
      const distanceMeters = r.distanceMeters || leg.distanceMeters || 0;

      const parsed = parseStepsAndStages(leg, false);
      const transferCount = Math.max(0, parsed.transitLegCount - 1);

      // Categorize transport option (Requirement 1)
      let transportType: 'BUS' | 'METRO' | 'BUS_METRO' | 'TRANSIT' = 'BUS';
      let categoryLabel = 'BMTC Bus';

      const hasMetro = parsed.transitModes.includes('Namma Metro');
      const hasBus = parsed.transitModes.includes('BMTC Bus');

      if (hasMetro && hasBus) {
        transportType = 'BUS_METRO';
        categoryLabel = 'Bus + Metro';
      } else if (hasMetro) {
        transportType = 'METRO';
        categoryLabel = 'Namma Metro';
      } else if (hasBus) {
        transportType = 'BUS';
        categoryLabel = 'BMTC Bus';
      }

      let summary = r.description || '';
      if (!summary && parsed.transitLines.length > 0) {
        summary = parsed.transitLines.map((l: any) => l.shortName || l.name).join(' → ');
      }

      processedRoutes.push({
        id: `route-${routeCounter++}`,
        summary: summary || `${categoryLabel} Journey`,
        transportType,
        categoryLabel,
        durationSeconds,
        durationText: formatDuration(durationSeconds),
        distanceMeters,
        distanceText: formatDistance(distanceMeters),
        walkingDistanceMeters: parsed.walkingDistanceMeters,
        walkingDistanceText: parsed.walkingDistanceText,
        walkingDurationSeconds: parsed.walkingDurationSeconds,
        walkingDurationText: parsed.walkingDurationText,
        firstMileWalkingMeters: parsed.firstMileWalkingMeters,
        firstMileWalkingText: parsed.firstMileWalkingText,
        lastMileWalkingMeters: parsed.lastMileWalkingMeters,
        lastMileWalkingText: parsed.lastMileWalkingText,
        transferWalkingMeters: parsed.transferWalkingMeters,
        transferWalkingText: parsed.transferWalkingText,
        transferCount,
        transitModes: parsed.transitModes,
        transitLines: parsed.transitLines,
        isRecommended: false,
        steps: parsed.steps,
        stages: parsed.stages,
        overviewPolyline: r.polyline?.encodedPolyline || leg.polyline?.encodedPolyline || '',
        warnings: r.warnings || [],
      });
    });

    // 2. Process returned Walking Route (if available)
    rawWalkRoutes.forEach((r: any) => {
      const leg = r.legs?.[0] || {};
      const durationSeconds = parseInt((r.duration || leg.duration || '0s').replace('s', ''), 10);
      const distanceMeters = r.distanceMeters || leg.distanceMeters || 0;

      const parsed = parseStepsAndStages(leg, true);

      processedRoutes.push({
        id: `route-${routeCounter++}`,
        summary: 'Direct Walking',
        transportType: 'WALK',
        categoryLabel: 'Walking',
        durationSeconds,
        durationText: formatDuration(durationSeconds),
        distanceMeters,
        distanceText: formatDistance(distanceMeters),
        walkingDistanceMeters: distanceMeters,
        walkingDistanceText: formatDistance(distanceMeters),
        walkingDurationSeconds: durationSeconds,
        walkingDurationText: formatDuration(durationSeconds),
        firstMileWalkingMeters: distanceMeters,
        firstMileWalkingText: formatDistance(distanceMeters),
        lastMileWalkingMeters: 0,
        lastMileWalkingText: '0 m',
        transferWalkingMeters: 0,
        transferWalkingText: '0 m',
        transferCount: 0,
        transitModes: ['Walking'],
        transitLines: [],
        isRecommended: false,
        steps: parsed.steps,
        stages: parsed.stages,
        overviewPolyline: r.polyline?.encodedPolyline || leg.polyline?.encodedPolyline || '',
        warnings: r.warnings || [],
      });
    });

    // 3. INTELLIGENT RECOMMENDATION ENGINE (Requirement 1):
    // "If the destination is far away, do not recommend walking the entire distance when a suitable bus or metro journey is available.
    // Compare available options using actual route data, travel time, walking distance, transfers, and stop locations."
    const isDestinationFarAway = directDistanceMeters > 1800;
    const hasViableTransit = processedRoutes.some((r) => r.transportType !== 'WALK');

    processedRoutes.forEach((route) => {
      let score = route.durationSeconds;

      if (route.transportType === 'WALK') {
        if (isDestinationFarAway && hasViableTransit) {
          // Rule: Never recommend walking when destination is far away and bus/metro is available!
          score += 200000;
        } else if (route.distanceMeters > 1500) {
          score += (route.distanceMeters - 1500) * 15;
        } else {
          // Close proximity (< 1.5km): Walking is direct and avoids waiting for BMTC buses
          score -= 150;
        }
      } else {
        // Evaluate transfers: transfers in Bengaluru incur high wait times & road crossing overhead
        score += route.transferCount * 650;

        // Walking distance penalty beyond reasonable access
        if (route.walkingDistanceMeters > 450) {
          score += (route.walkingDistanceMeters - 450) * 1.1;
        }

        // Metro grade-separation bonus: Namma Metro completely avoids road gridlocks
        if (route.transportType === 'METRO') {
          score -= 320;
        } else if (route.transportType === 'BUS_METRO') {
          score -= 120;
        }

        // Direct corridor bonus (0 transfers)
        if (route.transferCount === 0) {
          score -= 200;
        }

        // First-mile proximity bonus
        if (route.firstMileWalkingMeters <= 350) {
          score -= 100;
        }
      }

      route.evaluationScore = score;
    });

    // Select the best travel option
    let bestIdx = 0;
    let minScore = Infinity;

    processedRoutes.forEach((route, idx) => {
      if (route.evaluationScore < minScore) {
        minScore = route.evaluationScore;
        bestIdx = idx;
      }
    });

    processedRoutes[bestIdx].isRecommended = true;

    const best = processedRoutes[bestIdx];
    if (best.transportType === 'METRO') {
      best.recommendationReason = `⭐ Recommended: Namma Metro offers rapid grade-separated transit bypassing road traffic, with ${
        best.transferCount === 0 ? '0 transfers (direct)' : `${best.transferCount} interchange`
      } and ${best.walkingDistanceText} total walking (${best.durationText}).`;
    } else if (best.transportType === 'BUS' && best.transferCount === 0) {
      best.recommendationReason = `⭐ Recommended: Direct BMTC bus corridor (${best.summary}) with 0 transfers and only ${best.walkingDistanceText} walking to boarding stops (${best.durationText}).`;
    } else if (best.transportType === 'BUS_METRO') {
      best.recommendationReason = `⭐ Recommended: Optimized Bus + Metro connection combines convenient feeder boarding with rapid metro rail, achieving the fastest total trip time (${best.durationText}).`;
    } else if (best.transportType === 'WALK') {
      best.recommendationReason = `⭐ Recommended: Walking (${best.distanceText}, ${best.durationText}) is the quickest and most direct option for this short distance, avoiding public transit boarding delays.`;
    } else {
      best.recommendationReason = `⭐ Recommended: Best balance of trip duration (${best.durationText}), minimal transfers (${best.transferCount}), and convenient stop access (${best.walkingDistanceText} walking).`;
    }

    // Attach comparative notes for alternative options
    processedRoutes.forEach((route, idx) => {
      if (idx !== bestIdx) {
        const timeDiffSec = route.durationSeconds - best.durationSeconds;
        const timeDiffMins = Math.round(Math.abs(timeDiffSec) / 60);
        const timeDiffText =
          timeDiffSec > 60
            ? `${timeDiffMins} mins slower`
            : timeDiffSec < -60
            ? `${timeDiffMins} mins faster`
            : 'similar duration';

        if (route.transportType === 'WALK' && isDestinationFarAway) {
          route.comparisonNote = `Not recommended: Walking ${route.distanceText} (${route.durationText}) is impractical when verified bus/metro routes exist.`;
        } else if (route.transferCount > best.transferCount) {
          route.comparisonNote = `Requires ${route.transferCount - best.transferCount} more transfer (${timeDiffText}).`;
        } else if (route.walkingDistanceMeters > best.walkingDistanceMeters + 250) {
          route.comparisonNote = `Requires ${formatDistance(route.walkingDistanceMeters - best.walkingDistanceMeters)} more walking (${timeDiffText}).`;
        } else {
          route.comparisonNote = `Alternative travel option (${timeDiffText}, ${route.transferCount} transfers).`;
        }
      }
    });

    return res.json({
      success: true,
      origin: { name: originName, lat: originLat, lng: originLng },
      destination: { name: destName, lat: destLat, lng: destLng },
      routes: processedRoutes,
      recommendedRouteId: processedRoutes[bestIdx].id,
      dataNotice:
        'Schedules, corridors, and walking paths retrieved from official Google Routes data for Bengaluru (BMTC & BMRCL). Real-time GPS bus positions and sudden traffic diversions require onboard vehicle telemetry.',
    });
  } catch (err: any) {
    console.error('Error in transit route calculation:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while computing Bengaluru transit routes',
      message: err.message,
    });
  }
});

// Vite middleware mounting in development, or static hosting in production
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Namma Route server running on http://0.0.0.0:${PORT}`);
  });
});

import React, { useEffect, useState, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Map as MapIcon,
  Navigation,
  MapPin,
  AlertTriangle,
  Info,
  Layers,
  Compass,
  Bus,
  Train,
  Footprints,
  ExternalLink,
  Maximize2,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GitFork,
  ArrowRight,
  Eye,
  ShieldCheck,
  Crosshair,
  Camera,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  Clock,
} from 'lucide-react';
import { LocationCoordinates } from '../types/transit';
import { JourneyRoute, RouteStep } from '../types/routes';
import { TransitMapPlaceholder } from './TransitMapPlaceholder';
import { StreetViewPreview } from './StreetViewPreview';
import { decodePolyline } from '../utils/polyline';
import { calculateDistanceMeters } from '../utils/geo';
import {
  parseStepManeuver,
  calculateRemainingRouteStats,
  ManeuverType,
} from '../utils/navigationGuidance';
import { getVerifiedStepMode } from '../utils/transitStages';

interface InteractiveTransitMapProps {
  originName: string;
  destinationName: string;
  originCoords?: LocationCoordinates;
  destinationCoords?: LocationCoordinates;
  isApiKeyConfigured: boolean;
  selectedRoute?: JourneyRoute | null;
  selectedStepIndex?: number | null;
  onSelectStepIndex?: (idx: number | null) => void;
  isNavigating?: boolean;
  onToggleNavigation?: () => void;
  activeViewMode?: 'map' | 'streetview';
  onChangeViewMode?: (mode: 'map' | 'streetview') => void;
  className?: string;
}

interface TransitMarkerInfo {
  id: string;
  type: 'origin' | 'destination' | 'board' | 'alight' | 'metro_board' | 'metro_alight' | 'transfer' | 'walk_endpoint' | 'next_turn';
  title: string;
  subtitle?: string;
  position: { lat: number; lng: number };
  time?: string;
  agency?: string;
  stepIndex?: number;
  isRelevantToStep?: boolean;
}

function renderManeuverIcon(type: ManeuverType, className = 'w-5 h-5') {
  switch (type) {
    case 'turn_left':
    case 'slight_left':
      return <CornerUpLeft className={className} />;
    case 'turn_right':
    case 'slight_right':
      return <CornerUpRight className={className} />;
    case 'straight':
      return <ArrowUp className={className} />;
    case 'board_metro':
      return <Train className={className} />;
    case 'board_bus':
      return <Bus className={className} />;
    case 'arrive':
      return <MapPin className={className} />;
    default:
      return <Footprints className={className} />;
  }
}

// Controller component to draw polylines on the map with active step highlighting and visual dimming
function TransitPolylineRenderer({
  steps,
  overviewPolyline,
  selectedStepIndex,
}: {
  steps?: RouteStep[];
  overviewPolyline?: string;
  selectedStepIndex?: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const polylines: google.maps.Polyline[] = [];

    // If step-by-step polylines exist, render each step
    if (steps && steps.length > 0) {
      steps.forEach((step, idx) => {
        if (!step.polyline) return;
        const path = decodePolyline(step.polyline);
        if (path.length === 0) return;

        const isTransit = step.travelMode === 'TRANSIT';
        const stepMode = getVerifiedStepMode(step);
        const isMetro = stepMode === 'METRO';
        const isBus = stepMode === 'BUS';

        const isStepSelected = selectedStepIndex !== null && selectedStepIndex === idx;
        const hasStepSelection = selectedStepIndex !== null && selectedStepIndex !== undefined;

        // Distinct accessible colours per requirement:
        // BMTC Bus: Vibrant Blue (#2563eb)
        // Namma Metro: Vivid Purple (#9333ea)
        // Walking / Other: Neutral Slate (#475569)
        const baseColor = isMetro
          ? '#9333ea'
          : isBus
          ? '#2563eb'
          : '#475569';

        if (hasStepSelection) {
          if (isStepSelected) {
            // CURRENT ACTIVE STEP: Highlighted prominently with glow casing and high-contrast core stroke (Requirement 1, 3 & 4)
            const casingPoly = new google.maps.Polyline({
              path,
              strokeColor: '#fde047', // Yellow-amber glow halo matching "Active Step (Focused)"
              strokeOpacity: 0.9,
              strokeWeight: 14,
              zIndex: 90,
              map,
            });
            polylines.push(casingPoly);

            const corePoly = new google.maps.Polyline({
              path,
              strokeColor: !isTransit ? '#0284c7' : baseColor,
              strokeOpacity: 1.0,
              strokeWeight: 7.5,
              zIndex: 100,
              map,
            });
            polylines.push(corePoly);
          } else if (idx > selectedStepIndex) {
            // REMAINING ROUTE: Displayed with Cyan casing (#0891b2) and inner core in mode color (Requirement 3 & 4)
            const remainingCasing = new google.maps.Polyline({
              path,
              strokeColor: '#0891b2', // Accessible Vivid Cyan
              strokeOpacity: 0.85,
              strokeWeight: 6,
              zIndex: 30,
              map,
            });
            polylines.push(remainingCasing);

            const remainingCore = new google.maps.Polyline({
              path,
              strokeColor: baseColor,
              strokeOpacity: 0.95,
              strokeWeight: 3.5,
              zIndex: 35,
              map,
            });
            polylines.push(remainingCore);
          } else {
            // PRECEDING / COMPLETED STEPS: Visually dimmed (Requirement 3 & 4)
            const dimmedPoly = new google.maps.Polyline({
              path,
              strokeColor: '#94a3b8',
              strokeOpacity: 0.35,
              strokeWeight: 3.5,
              zIndex: 5,
              map,
            });
            polylines.push(dimmedPoly);
          }
        } else {
          // FULL ROUTE OVERVIEW (no step selected): Render all sections with clear distinction
          const poly = new google.maps.Polyline({
            path,
            strokeColor: baseColor,
            strokeOpacity: isTransit ? 0.95 : 0.8,
            strokeWeight: isTransit ? 6 : 4,
            zIndex: isTransit ? 20 : 10,
            map,
          });
          polylines.push(poly);
        }
      });
    } else if (overviewPolyline) {
      // Fallback to overview polyline if individual step polylines are not present
      const path = decodePolyline(overviewPolyline);
      if (path.length > 0) {
        const poly = new google.maps.Polyline({
          path,
          strokeColor: '#059669',
          strokeOpacity: 0.85,
          strokeWeight: 6,
          zIndex: 15,
          map,
        });
        polylines.push(poly);
      }
    }

    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, steps, overviewPolyline, selectedStepIndex]);

  return null;
}

// Controller component to smoothly adjust camera bounds for route and steps
function MapBoundsController({
  originCoords,
  destinationCoords,
  routePolyline,
  steps,
  selectedStepIndex,
  fitRouteTrigger,
}: {
  originCoords?: LocationCoordinates;
  destinationCoords?: LocationCoordinates;
  routePolyline?: string;
  steps?: RouteStep[];
  selectedStepIndex?: number | null;
  fitRouteTrigger?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // 1. If a specific step is selected, zoom directly to that step's segment (Requirement 3 & 12)
    if (
      selectedStepIndex !== null &&
      selectedStepIndex !== undefined &&
      steps &&
      steps[selectedStepIndex]
    ) {
      const step = steps[selectedStepIndex];
      const stepBounds = new google.maps.LatLngBounds();
      const isWalking = step.travelMode === 'WALK';

      if (step.polyline) {
        const pts = decodePolyline(step.polyline);
        if (pts.length > 0) {
          pts.forEach((p) => stepBounds.extend(p));

          if (isWalking) {
            // For walking steps, zoom close enough so streets and crossings are easy to identify (Requirement 12)
            map.fitBounds(stepBounds, { top: 80, right: 70, bottom: 80, left: 70 });
            google.maps.event.addListenerOnce(map, 'idle', () => {
              const currentZoom = map.getZoom();
              if (currentZoom && currentZoom > 17) {
                map.setZoom(17);
              } else if (currentZoom && currentZoom < 15) {
                map.setZoom(16);
              }
            });
          } else {
            // For transit steps, fit boarding and get-off segment
            map.fitBounds(stepBounds, { top: 90, right: 80, bottom: 90, left: 80 });
          }
          return;
        }
      }

      // If polyline is missing, fit start and end locations
      if (step.startLocation && step.endLocation) {
        stepBounds.extend(step.startLocation);
        stepBounds.extend(step.endLocation);
        map.fitBounds(stepBounds, { top: 80, right: 70, bottom: 80, left: 70 });
        return;
      }
    }

    // 2. Otherwise, fit the complete selected journey visible at once (Requirement 1 & 9)
    if (routePolyline) {
      const path = decodePolyline(routePolyline);
      if (path.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(pt));
        if (originCoords) bounds.extend(originCoords);
        if (destinationCoords) bounds.extend(destinationCoords);
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        return;
      }
    }

    // 3. Fallback when no polyline yet: fit origin and destination markers
    if (originCoords && destinationCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(originCoords);
      bounds.extend(destinationCoords);
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else if (originCoords) {
      map.panTo(originCoords);
      map.setZoom(14);
    } else if (destinationCoords) {
      map.panTo(destinationCoords);
      map.setZoom(14);
    }
  }, [
    map,
    originCoords,
    destinationCoords,
    routePolyline,
    steps,
    selectedStepIndex,
    fitRouteTrigger,
  ]);

  return null;
}

export const InteractiveTransitMap: React.FC<InteractiveTransitMapProps> = ({
  originName,
  destinationName,
  originCoords,
  destinationCoords,
  isApiKeyConfigured,
  selectedRoute,
  selectedStepIndex = null,
  onSelectStepIndex,
  isNavigating = false,
  onToggleNavigation,
  activeViewMode,
  onChangeViewMode,
  className = '',
}) => {
  // Local view mode state with external sync
  const [internalViewMode, setInternalViewMode] = useState<'map' | 'streetview' | 'schematic'>(
    isApiKeyConfigured ? 'map' : 'schematic'
  );

  const viewMode = activeViewMode || internalViewMode;

  const setViewMode = (mode: 'map' | 'streetview' | 'schematic') => {
    setInternalViewMode(mode);
    if (onChangeViewMode && (mode === 'map' || mode === 'streetview')) {
      onChangeViewMode(mode);
    }
  };

  const [activeMarkerInfo, setActiveMarkerInfo] = useState<TransitMarkerInfo | null>(null);
  const [fitRouteTrigger, setFitRouteTrigger] = useState<number>(0);

  const steps = selectedRoute?.steps || [];
  const totalSteps = steps.length;
  // Effective step index: strictly synchronizes the active step with navigation state and journey instruction panel (Requirement 7 & 8)
  const effectiveStepIndex =
    selectedStepIndex !== null && selectedStepIndex !== undefined
      ? selectedStepIndex
      : isNavigating && totalSteps > 0
      ? 0
      : null;
  const isStepFocused = effectiveStepIndex !== null;
  const currentStep: RouteStep | undefined =
    effectiveStepIndex !== null ? steps[effectiveStepIndex] : undefined;

  // Extract intermediate transit stops and transfer points for accessible markers (Requirements 4, 5, 6, 7, 8)
  const transitMarkers = useMemo(() => {
    const list: TransitMarkerInfo[] = [];
    const hasSelection = effectiveStepIndex !== null;

    // Add Origin Marker (User Starting Location)
    if (originCoords) {
      const isOriginRelevant =
        !hasSelection || effectiveStepIndex === 0 || (currentStep && currentStep.travelMode === 'WALK' && effectiveStepIndex === 0);

      list.push({
        id: 'origin',
        type: 'origin',
        title: originName || 'Starting Location',
        subtitle: 'Journey Origin (Starting Location)',
        position: originCoords,
        stepIndex: 0,
        isRelevantToStep: isOriginRelevant,
      });
    }

    // Add Destination Marker
    if (destinationCoords) {
      const isDestRelevant =
        !hasSelection || (effectiveStepIndex !== null && effectiveStepIndex === steps.length - 1);

      list.push({
        id: 'destination',
        type: 'destination',
        title: destinationName || 'Destination',
        subtitle: 'Final Journey Destination',
        position: destinationCoords,
        stepIndex: steps.length - 1,
        isRelevantToStep: isDestRelevant,
      });
    }

    // Intermediate boarding and alighting stops from real transit steps
    if (selectedRoute && selectedRoute.steps) {
      selectedRoute.steps.forEach((step, sIdx) => {
        if (step.travelMode === 'TRANSIT' && step.transitDetails) {
          const td = step.transitDetails;
          const stepMode = getVerifiedStepMode(step);
          const isMetro = stepMode === 'METRO';
          const isThisStepSelected = effectiveStepIndex === sIdx;

          const isTransferDeparture = sIdx > 0 && selectedRoute.steps[sIdx - 1].travelMode === 'TRANSIT';
          const isTransferArrival = sIdx < selectedRoute.steps.length - 1 && selectedRoute.steps[sIdx + 1].travelMode === 'TRANSIT';

          // Boarding stop
          list.push({
            id: `board-${sIdx}`,
            type: isMetro ? 'metro_board' : isTransferDeparture ? 'transfer' : 'board',
            title: td.departureStop.name,
            subtitle: `Board ${isMetro ? 'Namma Metro' : 'BMTC Bus'} ${td.line.shortName || td.line.name} towards ${td.headsign || 'terminus'}`,
            position: { lat: td.departureStop.lat, lng: td.departureStop.lng },
            time: td.departureTimeFormatted,
            agency: td.line.agencyName,
            stepIndex: sIdx,
            isRelevantToStep: !hasSelection || isThisStepSelected,
          });

          // Alight stop
          list.push({
            id: `alight-${sIdx}`,
            type: isMetro ? 'metro_alight' : isTransferArrival ? 'transfer' : 'alight',
            title: td.arrivalStop.name,
            subtitle: `Get off / Alight ${isMetro ? 'Namma Metro' : 'BMTC Bus'} ${td.line.shortName || td.line.name}`,
            position: { lat: td.arrivalStop.lat, lng: td.arrivalStop.lng },
            time: td.arrivalTimeFormatted,
            agency: td.line.agencyName,
            stepIndex: sIdx,
            isRelevantToStep: !hasSelection || isThisStepSelected,
          });
        } else if (step.travelMode === 'WALK' && hasSelection && effectiveStepIndex === sIdx) {
          // For walking transfer steps: show walking connection endpoints
          if (step.startLocation) {
            list.push({
              id: `walk-start-${sIdx}`,
              type: 'walk_endpoint',
              title: sIdx === 0 ? 'Start Walking from Origin' : 'Transfer Walking Connection',
              subtitle: step.instructions,
              position: step.startLocation,
              stepIndex: sIdx,
              isRelevantToStep: true,
            });
          }
          if (step.endLocation) {
            list.push({
              id: `walk-end-${sIdx}`,
              type: 'walk_endpoint',
              title: sIdx === steps.length - 1 ? 'Walk to Destination' : 'Walk to Next Transit Boarding Stop',
              subtitle: step.instructions,
              position: step.endLocation,
              stepIndex: sIdx,
              isRelevantToStep: true,
            });
          }
        }
      });
    }

    // Mark the next turn, boarding point, transfer point and destination when relevant (Requirement 3)
    if (hasSelection && currentStep && effectiveStepIndex !== null && steps.length > 0) {
      const nextStep = steps[effectiveStepIndex + 1];
      const turnLocation = currentStep.endLocation;
      if (turnLocation) {
        let turnTitle = 'Next Action Point';
        let turnSubtitle = 'Transition to next route segment';

        if (nextStep) {
          if (nextStep.travelMode === 'TRANSIT' && nextStep.transitDetails) {
            const nextMode = getVerifiedStepMode(nextStep);
            turnTitle = `Next: Board ${nextMode === 'METRO' ? 'Namma Metro' : 'BMTC Bus'} ${nextStep.transitDetails.line.shortName || nextStep.transitDetails.line.name}`;
            turnSubtitle = `At ${nextStep.transitDetails.departureStop.name}`;
          } else {
            turnTitle = 'Next: Street Turn / Walk';
            turnSubtitle = nextStep.instructions;
          }
        } else {
          turnTitle = 'Arrive at Final Destination';
          turnSubtitle = destinationName || 'Journey Destination';
        }

        list.push({
          id: `next-turn-${effectiveStepIndex}`,
          type: 'next_turn',
          title: turnTitle,
          subtitle: turnSubtitle,
          position: turnLocation,
          stepIndex: effectiveStepIndex,
          isRelevantToStep: true,
        });
      }
    }

    return list;
  }, [originCoords, destinationCoords, originName, destinationName, selectedRoute, effectiveStepIndex, steps, currentStep]);

  // Determine coordinates and label for Street View preview
  const streetViewTarget = useMemo(() => {
    if (currentStep) {
      if (currentStep.travelMode === 'TRANSIT' && currentStep.transitDetails) {
        return {
          coords: {
            lat: currentStep.transitDetails.departureStop.lat,
            lng: currentStep.transitDetails.departureStop.lng,
          },
          name: currentStep.transitDetails.departureStop.name,
        };
      }
      if (currentStep.startLocation) {
        return {
          coords: currentStep.startLocation,
          name: currentStep.instructions || 'Walking Route Segment',
        };
      }
    }

    if (originCoords) {
      return {
        coords: originCoords,
        name: originName || 'Starting Location',
      };
    }

    return null;
  }, [currentStep, originCoords, originName]);

  // Handle "Reset to Full Route" action (Requirement 9)
  const handleResetToFullRoute = () => {
    if (onSelectStepIndex) {
      onSelectStepIndex(null);
    }
    setViewMode('map');
    setFitRouteTrigger((prev) => prev + 1);
  };

  // Step advance handlers (Requirement 9 & 11)
  const handlePrevStep = () => {
    if (!onSelectStepIndex || totalSteps === 0) return;
    if (selectedStepIndex === null || selectedStepIndex === 0) {
      onSelectStepIndex(0);
    } else {
      onSelectStepIndex(selectedStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (!onSelectStepIndex || totalSteps === 0) return;
    if (selectedStepIndex === null) {
      onSelectStepIndex(0);
    } else if (selectedStepIndex < totalSteps - 1) {
      onSelectStepIndex(selectedStepIndex + 1);
    }
  };

  // User Geolocation state for live route guidance and Google Maps blue dot (Requirement 2)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'tracking' | 'denied' | 'unavailable'>('idle');
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Toggle device GPS tracking
  const handleToggleGps = () => {
    if (geoStatus === 'tracking') {
      setUserLocation(null);
      setGeoStatus('idle');
      setGeoNotice(null);
      return;
    }

    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }

    setGeoStatus('tracking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGeoNotice(`GPS tracking active (±${Math.round(pos.coords.accuracy)}m accuracy)`);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('denied');
          setGeoNotice('Location permission denied in browser. Use Next Step to advance manually.');
        } else {
          setGeoStatus('unavailable');
          setGeoNotice('GPS signal unavailable. Step guidance is in manual mode.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Calculate current maneuver, next maneuver, and remaining trip stats strictly from real route geometry (Requirement 7 & 8)
  const currentManeuver = currentStep
    ? parseStepManeuver(currentStep, effectiveStepIndex || 0, totalSteps, userLocation)
    : null;

  const nextStep =
    effectiveStepIndex !== null && effectiveStepIndex < totalSteps - 1
      ? steps[effectiveStepIndex + 1]
      : null;

  const nextManeuver = nextStep
    ? parseStepManeuver(nextStep, (effectiveStepIndex || 0) + 1, totalSteps, userLocation)
    : null;

  const remainingStats = useMemo(() => {
    if (!selectedRoute || effectiveStepIndex === null) return null;
    return calculateRemainingRouteStats(steps, effectiveStepIndex, userLocation);
  }, [selectedRoute, steps, effectiveStepIndex, userLocation]);

  const handleStartJourney = () => {
    // Keep Map view for all journey types, including walking (Requirement 1)
    setViewMode('map');
    if (onSelectStepIndex && totalSteps > 0) {
      onSelectStepIndex(0);
    }
    if (onToggleNavigation && !isNavigating) {
      onToggleNavigation();
    }
  };

  // Google Maps external transit link (Requirement 9)
  const googleMapsDirectionsUrl = useMemo(() => {
    const originParam = originCoords
      ? `${originCoords.lat},${originCoords.lng}`
      : originName || '';
    const destParam = destinationCoords
      ? `${destinationCoords.lat},${destinationCoords.lng}`
      : destinationName || '';

    if (!originParam && !destParam) {
      return 'https://www.google.com/maps';
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=transit`;
  }, [originCoords, destinationCoords, originName, destinationName]);

  // Check if API key is not configured
  if (!isApiKeyConfigured) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                Google Maps API Configuration Pending
              </p>
              <p className="text-amber-800 mt-0.5">
                Configure <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">VITE_GOOGLE_MAPS_API_KEY</code> in environment settings to enable live interactive map rendering, Place Autocomplete, Street View, and transit polylines.
              </p>
            </div>
          </div>
        </div>

        <TransitMapPlaceholder
          startLocation={originName}
          destination={destinationName}
        />
      </div>
    );
  }

  // Dynamically determine the active transport mode strictly from the actual step navigation data (Requirement 2, 3, 4, 5, 6, 9)
  const activeSegmentMode: 'WALK' | 'BUS' | 'METRO' | null = useMemo(() => {
    if (!isStepFocused || !currentStep) return null;
    return getVerifiedStepMode(currentStep);
  }, [isStepFocused, currentStep]);

  // Track modes present across the entire journey route for clear state indication
  const routeModesPresent = useMemo(() => {
    if (!selectedRoute?.steps || selectedRoute.steps.length === 0) {
      return { hasMetro: false, hasBus: false, hasWalk: true };
    }
    let hasMetro = false;
    let hasBus = false;
    let hasWalk = false;
    selectedRoute.steps.forEach((step) => {
      const mode = getVerifiedStepMode(step);
      if (mode === 'WALK') hasWalk = true;
      if (mode === 'BUS') hasBus = true;
      if (mode === 'METRO') hasMetro = true;
    });
    return { hasMetro, hasBus, hasWalk };
  }, [selectedRoute]);

  const completedStepsCount = effectiveStepIndex !== null ? effectiveStepIndex : 0;
  const remainingStepsCount =
    effectiveStepIndex !== null ? Math.max(0, totalSteps - effectiveStepIndex - 1) : 0;

  return (
    <div className={`w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col ${className}`}>
      {/* Map Header Toolbar with Controls */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            {viewMode === 'streetview' ? (
              <Camera className="w-4 h-4" />
            ) : (
              <MapIcon className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-none">
              {viewMode === 'streetview' ? 'Street View Preview' : 'Interactive Route Map'}
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              Google Maps Platform · {viewMode === 'streetview' ? '360° Real Road Imagery' : 'Step Geometry & Corridors'}
            </span>
          </div>
        </div>

        {/* Toolbar Action Buttons & View Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Map vs Street View Switcher (Requirement: simple Map / Street View switch) */}
          <div className="inline-flex items-center p-0.5 bg-slate-200/90 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('streetview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'streetview'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Street View</span>
            </button>
          </div>

          {/* Start Journey button */}
          {selectedRoute && !isStepFocused && (
            <button
              type="button"
              onClick={handleStartJourney}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-3 h-3 fill-white" />
              <span className="hidden sm:inline">Start Journey</span>
            </button>
          )}

          {/* Reset to Full Route button */}
          {selectedRoute && isStepFocused && (
            <button
              type="button"
              onClick={handleResetToFullRoute}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Show entire route on map"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Full Route</span>
            </button>
          )}

          {/* Open in Google Maps External Button */}
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Open directions in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Google Maps</span>
          </a>
        </div>
      </div>

      {viewMode === 'schematic' ? (
        <TransitMapPlaceholder
          startLocation={originName}
          destination={destinationName}
        />
      ) : viewMode === 'streetview' ? (
        /* Interactive Google Street View Panel (Requirement: compact interactive Street View inside right-hand section) */
        <StreetViewPreview
          step={currentStep}
          nextStep={selectedStepIndex !== null && selectedStepIndex < totalSteps - 1 ? steps[selectedStepIndex + 1] : null}
          stepIndex={selectedStepIndex}
          totalSteps={totalSteps}
          locationCoords={streetViewTarget?.coords}
          destinationCoords={destinationCoords}
          locationName={streetViewTarget?.name || originName}
          onSwitchToMap={() => setViewMode('map')}
          onPrevStep={handlePrevStep}
          onNextStep={handleNextStep}
        />
      ) : (
        /* Interactive Google Map Panel */
        <div className="relative flex-1 flex flex-col">
          {/* Unobtrusive Next-Turn Instruction Bar (Requirement 6) */}
          {selectedRoute && isStepFocused && currentStep && currentManeuver && (
            <div className="bg-slate-900 text-white px-3.5 py-2 border-b border-slate-800 flex items-center justify-between gap-3 z-10 relative">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                  {renderManeuverIcon(currentManeuver.type, 'w-4 h-4 stroke-[2.5]')}
                </div>
                <div className="min-w-0 flex items-center gap-2 truncate">
                  <span className="text-xs font-bold text-white shrink-0">
                    {currentManeuver.distanceToTurnText
                      ? `${currentManeuver.actionTitle} in ${currentManeuver.distanceToTurnText}`
                      : currentManeuver.actionTitle}
                  </span>
                  <span className="text-slate-600 text-xs hidden sm:inline">·</span>
                  <span className="text-xs text-slate-300 font-medium truncate hidden sm:inline">
                    {currentStep.instructions}
                  </span>
                </div>
              </div>

              {nextManeuver && (
                <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide bg-slate-800 px-1.5 py-0.5 rounded">
                    Then
                  </span>
                  <span className="truncate max-w-[220px]">{nextManeuver.actionTitle}</span>
                </div>
              )}
            </div>
          )}

          {/* Map Canvas (Large and easy to understand per Requirement 10) */}
          <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[580px] xl:h-[620px] bg-slate-100">
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
            >
              {/* Camera Bounds Controller: Auto-fits route or selected step (Requirement 12) */}
              <MapBoundsController
                originCoords={originCoords}
                destinationCoords={destinationCoords}
                routePolyline={selectedRoute?.overviewPolyline}
                steps={selectedRoute?.steps}
                selectedStepIndex={effectiveStepIndex}
                fitRouteTrigger={fitRouteTrigger}
              />

              {/* Transit & Walking Polyline Renderer with Highlighting & Dimming (Requirements 2, 4, 5, 6, 7) */}
              <TransitPolylineRenderer
                steps={selectedRoute?.steps}
                overviewPolyline={selectedRoute?.overviewPolyline}
                selectedStepIndex={effectiveStepIndex}
              />

              {/* Render Transit Markers: Origin, Destination, Boarding, Alighting, Next Turn, Metro Stations (Requirements 3-8) */}
              {transitMarkers.map((marker) => {
                const isOrigin = marker.type === 'origin';
                const isDest = marker.type === 'destination';
                const isNextTurn = marker.type === 'next_turn';
                const isMetro = marker.type === 'metro_board' || marker.type === 'metro_alight';
                const isBoard = marker.type === 'board' || marker.type === 'metro_board';
                const isTransfer = marker.type === 'transfer' || marker.type === 'walk_endpoint';
                const isRelevant = marker.isRelevantToStep !== false;

                const bg = isOrigin
                  ? '#059669' // Green
                  : isDest
                  ? '#dc2626' // Red
                  : isNextTurn
                  ? '#ea580c' // Vibrant Orange for Next Turn
                  : isMetro
                  ? '#9333ea' // Purple
                  : isTransfer
                  ? '#f59e0b' // Amber for transfer points
                  : isBoard
                  ? '#2563eb' // Blue
                  : '#1d4ed8'; // Darker blue

                return (
                  <AdvancedMarker
                    key={marker.id}
                    position={marker.position}
                    title={marker.title}
                    onClick={() => setActiveMarkerInfo(marker)}
                  >
                    <Pin
                      background={bg}
                      borderColor={isNextTurn ? '#fde047' : isRelevant && isStepFocused ? '#fef08a' : '#ffffff'}
                      glyphColor="#ffffff"
                      scale={
                        isNextTurn
                          ? 1.25
                          : isRelevant && isStepFocused
                          ? 1.2
                          : isStepFocused
                          ? 0.7
                          : isOrigin || isDest
                          ? 1.05
                          : 0.85
                      }
                    />
                  </AdvancedMarker>
                );
              })}

              {/* Real-time User Location Marker (Google Maps pulsing blue dot per Requirement 2) */}
              {userLocation && (
                <AdvancedMarker
                  position={{ lat: userLocation.lat, lng: userLocation.lng }}
                  title={`Your Current Position (±${userLocation.accuracy || 10}m accuracy)`}
                  zIndex={999}
                >
                  <div className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/30 animate-ping absolute" />
                    <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg relative z-10" />
                  </div>
                </AdvancedMarker>
              )}

              {/* InfoWindow for marker click */}
              {activeMarkerInfo && (
                <InfoWindow
                  position={activeMarkerInfo.position}
                  onCloseClick={() => setActiveMarkerInfo(null)}
                >
                  <div className="p-1 max-w-xs text-slate-900 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      {activeMarkerInfo.type === 'origin'
                        ? 'Starting Location'
                        : activeMarkerInfo.type === 'destination'
                        ? 'Destination'
                        : activeMarkerInfo.type === 'next_turn'
                        ? 'Next Turn / Action Point'
                        : activeMarkerInfo.type.startsWith('metro')
                        ? 'Namma Metro Station'
                        : activeMarkerInfo.type === 'transfer'
                        ? 'Transfer Connection Point'
                        : activeMarkerInfo.type === 'board'
                        ? 'BMTC Boarding Stop'
                        : activeMarkerInfo.type === 'alight'
                        ? 'BMTC Alight / Get-off Stop'
                        : 'Walking Connection Point'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {activeMarkerInfo.title}
                    </h4>
                    {activeMarkerInfo.subtitle && (
                      <p className="text-xs text-slate-600 mt-1 leading-snug">
                        {activeMarkerInfo.subtitle}
                      </p>
                    )}
                    {activeMarkerInfo.time && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Scheduled time: <strong>{activeMarkerInfo.time}</strong>
                      </p>
                    )}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      {activeMarkerInfo.stepIndex !== undefined && onSelectStepIndex && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectStepIndex(activeMarkerInfo.stepIndex ?? null);
                            setActiveMarkerInfo(null);
                          }}
                          className="flex-1 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                        >
                          Focus on Map
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (activeMarkerInfo.stepIndex !== undefined && onSelectStepIndex) {
                            onSelectStepIndex(activeMarkerInfo.stepIndex);
                          }
                          setViewMode('streetview');
                          setActiveMarkerInfo(null);
                        }}
                        className="py-1 px-2 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                        title="Open Street View at this stop"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Street View</span>
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>

            {/* Dynamic Synchronized Route Path Legend (Requirement 4) */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-2.5 sm:p-3 w-[240px] sm:w-[260px] shadow-lg z-10 text-xs">
              <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Route Path Legend
                </span>
                {geoStatus === 'tracking' ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    LIVE GPS
                  </span>
                ) : isStepFocused ? (
                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    PREVIEW · {selectedStepIndex !== null ? selectedStepIndex + 1 : 1}/{totalSteps}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    OVERVIEW
                  </span>
                )}
              </div>

              {/* Mode Breakdown with Dynamic Active Highlight (Requirement 1, 2, 4 & 6) */}
              <div className="space-y-1">
                {/* 1. Namma Metro (Purple) */}
                <div
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg transition-all ${
                    isStepFocused && activeSegmentMode === 'METRO'
                      ? 'bg-purple-50 border border-purple-300 text-purple-950 font-bold shadow-2xs'
                      : routeModesPresent.hasMetro
                      ? 'text-slate-700 font-medium'
                      : 'text-slate-400 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`rounded-full shrink-0 ${
                        isStepFocused && activeSegmentMode === 'METRO'
                          ? 'w-4 h-2 bg-[#9333ea] ring-2 ring-purple-300'
                          : 'w-4 h-1.5 bg-[#9333ea]'
                      }`}
                    />
                    <span className="truncate">Namma Metro (Purple)</span>
                  </div>
                  {isStepFocused && activeSegmentMode === 'METRO' ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-purple-600 text-white px-1.5 py-0.5 rounded shrink-0 shadow-2xs">
                      CURRENT MODE
                    </span>
                  ) : !routeModesPresent.hasMetro ? (
                    <span className="text-[9px] text-slate-400 font-normal shrink-0">Not in route</span>
                  ) : null}
                </div>

                {/* 2. BMTC Bus (Blue) */}
                <div
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg transition-all ${
                    isStepFocused && activeSegmentMode === 'BUS'
                      ? 'bg-blue-50 border border-blue-300 text-blue-950 font-bold shadow-2xs'
                      : routeModesPresent.hasBus
                      ? 'text-slate-700 font-medium'
                      : 'text-slate-400 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`rounded-full shrink-0 ${
                        isStepFocused && activeSegmentMode === 'BUS'
                          ? 'w-4 h-2 bg-[#2563eb] ring-2 ring-blue-300'
                          : 'w-4 h-1.5 bg-[#2563eb]'
                      }`}
                    />
                    <span className="truncate">BMTC Bus (Blue)</span>
                  </div>
                  {isStepFocused && activeSegmentMode === 'BUS' ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.5 rounded shrink-0 shadow-2xs">
                      CURRENT MODE
                    </span>
                  ) : !routeModesPresent.hasBus ? (
                    <span className="text-[9px] text-slate-400 font-normal shrink-0">Not in route</span>
                  ) : null}
                </div>

                {/* 3. Walking Segment (Slate) */}
                <div
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg transition-all ${
                    isStepFocused && activeSegmentMode === 'WALK'
                      ? 'bg-slate-100 border border-slate-300 text-slate-900 font-bold shadow-2xs'
                      : routeModesPresent.hasWalk
                      ? 'text-slate-700 font-medium'
                      : 'text-slate-400 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`rounded-full shrink-0 ${
                        isStepFocused && activeSegmentMode === 'WALK'
                          ? 'w-4 h-2 bg-[#475569] ring-2 ring-slate-400'
                          : 'w-4 h-1 bg-[#475569]'
                      }`}
                    />
                    <span className="truncate">Walking Segment (Slate)</span>
                  </div>
                  {isStepFocused && activeSegmentMode === 'WALK' ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-slate-700 text-white px-1.5 py-0.5 rounded shrink-0 shadow-2xs">
                      CURRENT MODE
                    </span>
                  ) : !routeModesPresent.hasWalk ? (
                    <span className="text-[9px] text-slate-400 font-normal shrink-0">Not in route</span>
                  ) : null}
                </div>

                {/* Indeterminate mode notice if active step mode cannot be verified from data (Requirement 9) */}
                {isStepFocused && !activeSegmentMode && (
                  <div className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-medium">
                    Active travel mode unspecified in route data
                  </div>
                )}
              </div>

              {/* Progress & Geometry Segment Indicator (Requirement 3, 4 & 5) */}
              {isStepFocused ? (
                <div className="space-y-1 pt-1.5 mt-1.5 border-t border-slate-100">
                  {/* 4. Active Step (Focused) */}
                  <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-950 font-bold">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-2 bg-[#fde047] ring-1.5 ring-amber-400 rounded-full shrink-0 shadow-2xs" />
                      <span className="truncate">Active Step (Focused)</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 shrink-0">
                      Step {(effectiveStepIndex ?? 0) + 1}
                    </span>
                  </div>

                  {/* 5. Remaining Route (Cyan) */}
                  <div className="flex items-center justify-between gap-2 px-2 py-0.5 text-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-1.5 bg-[#0891b2] rounded-full shrink-0" />
                      <span className="text-cyan-900 font-semibold truncate">Remaining Route (Cyan)</span>
                    </div>
                    <span className="text-[10px] text-cyan-700 font-medium shrink-0">
                      {remainingStepsCount > 0
                        ? `${remainingStepsCount} step${remainingStepsCount === 1 ? '' : 's'}`
                        : 'Final step'}
                    </span>
                  </div>

                  {/* 6. Preceding Steps (Dimmed) */}
                  <div className="flex items-center justify-between gap-2 px-2 py-0.5 text-slate-500">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-1 bg-[#94a3b8] rounded-full shrink-0 opacity-70" />
                      <span className="text-slate-500 font-medium truncate">Preceding Steps (Dimmed)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {completedStepsCount > 0 ? `${completedStepsCount} done` : 'Start of trip'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                      <span className="font-bold">Full Journey Overview</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      {totalSteps} steps
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Footer Bar with Markers Key */}
          <div className="px-4 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Origin
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                Destination
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                Next Turn / Action
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Bus Stop
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                Metro Station
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Transfer Point
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'map' ? 'streetview' : 'map')}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                <span>Toggle Street View</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

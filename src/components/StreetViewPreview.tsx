/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Camera,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  Loader2,
  Maximize2,
  ExternalLink,
  Compass,
  Bus,
  Train,
  Footprints,
  Info,
  Navigation,
  ArrowUpRight,
  ShieldCheck,
  CornerUpRight,
} from 'lucide-react';
import { RouteStep } from '../types/routes';
import {
  calculateStepRouteHeading,
  calculateBearing,
  decodePolyline,
  getCompassDirection,
  StepHeadingResult,
} from '../utils/polyline';
import { getVerifiedStepMode } from '../utils/transitStages';

interface StreetViewPreviewProps {
  step?: RouteStep | null;
  nextStep?: RouteStep | null;
  stepIndex?: number | null;
  totalSteps?: number;
  locationCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  locationName: string;
  onSwitchToMap: () => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
}

export const StreetViewPreview: React.FC<StreetViewPreviewProps> = ({
  step,
  nextStep,
  stepIndex = 0,
  totalSteps = 1,
  locationCoords,
  destinationCoords,
  locationName,
  onSwitchToMap,
  onPrevStep,
  onNextStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [panoramaDescription, setPanoramaDescription] = useState<string>('');
  const [currentPovHeading, setCurrentPovHeading] = useState<number | null>(null);
  const [waypointIndex, setWaypointIndex] = useState<number>(0);

  const isTransit = step?.travelMode === 'TRANSIT';
  const isWalking = step?.travelMode === 'WALK';
  const transitDetail = step?.transitDetails;
  const stepMode = getVerifiedStepMode(step);
  const isMetro = isTransit && stepMode === 'METRO';

  // Decode walking polyline points for multi-panorama traversal along the path (Requirement 3)
  const walkingWaypoints = useMemo(() => {
    if (!step?.polyline || !isWalking) return [];
    const points = decodePolyline(step.polyline);
    if (points.length <= 4) return points;

    // Sample up to 5 strategic waypoints along the walking path (start, turns, and end)
    const sampled: { lat: number; lng: number }[] = [points[0]];
    const stepInterval = Math.max(1, Math.floor(points.length / 4));
    for (let i = stepInterval; i < points.length - 1; i += stepInterval) {
      sampled.push(points[i]);
    }
    sampled.push(points[points.length - 1]);
    return sampled;
  }, [step?.polyline, isWalking]);

  // Reset waypoint index when step changes
  useEffect(() => {
    setWaypointIndex(0);
  }, [stepIndex, step?.polyline]);

  // Compute camera direction along the actual route geometry using geographic bearing calculations
  const routeHeadingInfo: StepHeadingResult | null = useMemo(() => {
    if (!step) return null;

    // If traversing waypoints along a walking route:
    if (isWalking && walkingWaypoints.length > 1 && waypointIndex < walkingWaypoints.length) {
      const curPt = walkingWaypoints[waypointIndex];
      const nextPt =
        waypointIndex < walkingWaypoints.length - 1
          ? walkingWaypoints[waypointIndex + 1]
          : nextStep?.startLocation || destinationCoords || curPt;

      const bearing = calculateBearing(curPt, nextPt);
      const compass = getCompassDirection(bearing);

      return {
        heading: Math.round(bearing),
        cameraPosition: curPt,
        directionLabel: compass.label,
        compassCode: compass.code,
        targetPoint: nextPt,
        method: 'polyline_segment' as const,
      };
    }

    return calculateStepRouteHeading(step, nextStep || undefined, destinationCoords);
  }, [step, nextStep, destinationCoords, isWalking, walkingWaypoints, waypointIndex]);

  // Target coordinates for Street View query
  const targetCoords = useMemo(() => {
    if (routeHeadingInfo) {
      return routeHeadingInfo.cameraPosition;
    }
    return locationCoords;
  }, [routeHeadingInfo, locationCoords]);

  const targetHeading = routeHeadingInfo ? routeHeadingInfo.heading : 0;

  useEffect(() => {
    if (!containerRef.current || !targetCoords) {
      setIsAvailable(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsAvailable(null);

    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      setIsAvailable(false);
      setLoading(false);
      return;
    }

    const sv = new google.maps.StreetViewService();

    // Search for nearest outdoor street panorama within 120m
    sv.getPanorama(
      {
        location: targetCoords,
        radius: 120,
        source: google.maps.StreetViewSource.OUTDOOR,
        preference: google.maps.StreetViewPreference.NEAREST,
      },
      (data, status) => {
        setLoading(false);
        if (
          status === google.maps.StreetViewStatus.OK &&
          data &&
          data.location?.latLng &&
          containerRef.current
        ) {
          setIsAvailable(true);
          const panoDesc =
            data.location.description ||
            (data.location.shortDescription ? data.location.shortDescription : '') ||
            locationName ||
            'Bengaluru Street Level';
          setPanoramaDescription(panoDesc);

          try {
            const desiredPov = {
              heading: targetHeading,
              pitch: 2, // Slight downward road pitch for natural street guidance
              zoom: 1, // Clear street-level preview
            };

            if (!panoramaRef.current) {
              const pano = new google.maps.StreetViewPanorama(containerRef.current, {
                position: data.location.latLng,
                pov: desiredPov,
                addressControl: true,
                showRoadLabels: true,
                motionTracking: false,
                motionTrackingControl: false,
                fullscreenControl: false,
                enableCloseButton: false,
                panControl: true,
                zoomControl: true,
                linksControl: true,
              });

              pano.addListener('pov_changed', () => {
                const currentPov = pano.getPov();
                setCurrentPovHeading(Math.round(currentPov.heading));
              });

              panoramaRef.current = pano;
            } else {
              panoramaRef.current.setPosition(data.location.latLng);
              if (data.location.pano) {
                panoramaRef.current.setPano(data.location.pano);
              }
              // Update camera heading along the user's travel direction
              panoramaRef.current.setPov(desiredPov);
              panoramaRef.current.setVisible(true);
            }
            setCurrentPovHeading(Math.round(targetHeading));
          } catch (err) {
            console.error('Error initializing Street View Panorama:', err);
            setIsAvailable(false);
          }
        } else {
          setIsAvailable(false);
        }
      }
    );
  }, [targetCoords?.lat, targetCoords?.lng, targetHeading, locationName]);

  // Handle re-centering camera along calculated route bearing
  const handleRecenterHeading = () => {
    if (panoramaRef.current && routeHeadingInfo) {
      panoramaRef.current.setPov({
        heading: routeHeadingInfo.heading,
        pitch: 2,
      });
      panoramaRef.current.setZoom(1);
      setCurrentPovHeading(Math.round(routeHeadingInfo.heading));
    }
  };

  // Move along walking path waypoints (Requirement 3: Move between available panoramas along selected route)
  const handleNextWaypoint = () => {
    if (waypointIndex < walkingWaypoints.length - 1) {
      setWaypointIndex((prev) => prev + 1);
    }
  };

  const handlePrevWaypoint = () => {
    if (waypointIndex > 0) {
      setWaypointIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[580px] xl:h-[620px] bg-slate-900 overflow-hidden flex flex-col">
      {/* Top Street View Header & Route-Following HUD */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Floating compact HUD synchronized with route step */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl pointer-events-auto text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isTransit
                  ? isMetro
                    ? 'bg-purple-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isTransit ? (
                isMetro ? (
                  <Train className="w-4 h-4" />
                ) : (
                  <Bus className="w-4 h-4" />
                )
              ) : (
                <Footprints className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Step {stepIndex !== null ? stepIndex + 1 : 1} of {totalSteps}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 truncate">
                  {isTransit
                    ? isMetro
                      ? `Namma Metro · ${transitDetail?.line.name || ''}`
                      : `BMTC Bus · ${transitDetail?.line.shortName || transitDetail?.line.name || ''}`
                    : 'Walking Route Segment'}
                </span>

                {/* Route-calculated camera heading pill */}
                {routeHeadingInfo && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700"
                    title={`Calculated along route travel direction (${routeHeadingInfo.method})`}
                  >
                    <Compass className="w-3 h-3 text-amber-400" />
                    <span>
                      Facing {Math.round(routeHeadingInfo.heading)}° ({routeHeadingInfo.compassCode})
                    </span>
                  </span>
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {step?.instructions || locationName}
              </h4>
            </div>
          </div>

          {/* Controls: Prev, Next, Recenter Heading, and Return to Map */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {routeHeadingInfo && isAvailable && (
              <button
                type="button"
                onClick={handleRecenterHeading}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 transition-colors"
                title="Recenter camera along route travel direction"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Align Route</span>
              </button>
            )}

            {onPrevStep && (
              <button
                type="button"
                onClick={onPrevStep}
                disabled={stepIndex === 0}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors ${
                  stepIndex === 0
                    ? 'text-slate-500 bg-slate-800 cursor-not-allowed'
                    : 'text-slate-200 bg-slate-800 hover:bg-slate-700'
                }`}
                title="Previous step preview"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {onNextStep && (
              <button
                type="button"
                onClick={onNextStep}
                disabled={stepIndex === totalSteps - 1}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors ${
                  stepIndex === totalSteps - 1
                    ? 'text-slate-500 bg-slate-800 cursor-not-allowed'
                    : 'text-slate-200 bg-slate-800 hover:bg-slate-700'
                }`}
                title="Next step preview"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onSwitchToMap}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-[0.98]"
              title="Return to route map view"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>

        {/* Walking Waypoint Progression Controls (Requirement 3: Move between available panoramas along route) */}
        {isWalking && walkingWaypoints.length > 1 && isAvailable && (
          <div className="bg-slate-900/90 backdrop-blur-xs border border-emerald-500/50 rounded-xl px-3 py-2 text-white flex items-center justify-between pointer-events-auto text-xs shadow-md">
            <div className="flex items-center gap-2">
              <CornerUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-slate-300">
                Move Along Walking Path: <strong className="text-white">Panorama {waypointIndex + 1} of {walkingWaypoints.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevWaypoint}
                disabled={waypointIndex === 0}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                  waypointIndex === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Previous panorama along walking route"
              >
                ◀ Step Back
              </button>
              <button
                type="button"
                onClick={handleNextWaypoint}
                disabled={waypointIndex === walkingWaypoints.length - 1}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                  waypointIndex === walkingWaypoints.length - 1
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title="Advance to next panorama along walking route"
              >
                Step Forward ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <h4 className="text-sm font-bold">Aligning Google Street View Along Route</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Positioning camera at step coordinates and orienting along road heading ({targetHeading}°)...
          </p>
        </div>
      )}

      {/* Unavailable State: Clear fallback when Street View imagery is not recorded or does not clearly show a turn (Requirement 3) */}
      {!loading && isAvailable === false && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/95 text-white p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
            Street View Notice
          </span>
          <h4 className="text-sm sm:text-base font-bold text-white max-w-sm">
            Street View Unavailable for this Segment
          </h4>
          <p className="text-xs text-slate-300 mt-1.5 max-w-md leading-relaxed">
            Google Street View coverage is not recorded for this exact location or pedestrian passage ({locationName}).
            Switch to the interactive route map to inspect the exact path geometry, or follow the written instructions.
          </p>

          {/* Written instruction box displayed directly inside fallback */}
          {step?.instructions && (
            <div className="mt-4 p-3 bg-slate-800/90 rounded-xl border border-slate-700 text-left max-w-md w-full text-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                Written Instruction:
              </span>
              <p className="text-white font-medium">{step.instructions}</p>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Distance: {step.distanceText}</span>
                <span>Duration: {step.durationText}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onSwitchToMap}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Switch to Route Map</span>
            </button>

            {onNextStep && stepIndex !== null && stepIndex < totalSteps - 1 && (
              <button
                type="button"
                onClick={onNextStep}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
              >
                <span>Try Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Street View Panorama Target Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full flex-1"
        style={{ display: isAvailable ? 'block' : 'none' }}
      />

      {/* Bottom Status & Next Step Preview Bar */}
      {isAvailable && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-2">
          {/* Active Street Label */}
          <div className="bg-slate-900/85 backdrop-blur-xs border border-slate-700/60 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 flex items-center gap-1.5 shadow-md">
            <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-xs">
              {panoramaDescription || 'Interactive Google Street View'}
            </span>
          </div>

          {/* Next Turn / Action Preview */}
          {nextStep && (
            <div className="bg-slate-900/90 backdrop-blur-xs border border-emerald-500/40 rounded-lg px-2.5 py-1 text-[11px] text-emerald-300 flex items-center gap-1.5 shadow-md">
              <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="font-bold text-[10px] uppercase text-emerald-400">Next Action:</span>
              <span className="truncate max-w-[180px] sm:max-w-xs text-white">
                {nextStep.travelMode === 'TRANSIT' && nextStep.transitDetails
                  ? `Board ${nextStep.transitDetails.line.shortName || nextStep.transitDetails.line.name} at ${nextStep.transitDetails.departureStop.name}`
                  : nextStep.instructions}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

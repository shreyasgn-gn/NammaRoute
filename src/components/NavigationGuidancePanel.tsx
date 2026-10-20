/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Footprints,
  Bus,
  Train,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Crosshair,
  X,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  Clock,
  Navigation as NavigationIcon,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { JourneyRoute, RouteStep } from '../types/routes';
import {
  parseStepManeuver,
  calculateRemainingRouteStats,
  ManeuverType,
} from '../utils/navigationGuidance';
import { getVerifiedStepMode } from '../utils/transitStages';

interface NavigationGuidancePanelProps {
  route: JourneyRoute;
  currentStepIndex: number;
  onSelectStepIndex: (index: number) => void;
  onExitNavigation: () => void;
  originName: string;
  destinationName: string;
  onOpenGoogleMaps: () => void;
  onOpenStreetView?: () => void;
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

export const NavigationGuidancePanel: React.FC<NavigationGuidancePanelProps> = ({
  route,
  currentStepIndex,
  onSelectStepIndex,
  onExitNavigation,
  originName,
  destinationName,
  onOpenGoogleMaps,
  onOpenStreetView,
}) => {
  const steps = route.steps || [];
  const totalSteps = steps.length;
  const currentStep: RouteStep | undefined = steps[currentStepIndex];
  const nextStep: RouteStep | undefined = steps[currentStepIndex + 1];

  // Geolocation tracking state for live guidance
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'tracking' | 'denied' | 'unavailable'>('idle');
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // Request live geolocation
  const handleToggleGps = () => {
    if (gpsStatus === 'tracking') {
      setUserCoords(null);
      setGpsStatus('idle');
      setGpsMessage(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsMessage('Browser geolocation is not supported on this device.');
      return;
    }

    setGpsStatus('tracking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsMessage(`Live GPS active (±${Math.round(pos.coords.accuracy)}m accuracy).`);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setGpsMessage('Location permission denied in browser. Use Next Step to advance manually.');
        } else {
          setGpsStatus('unavailable');
          setGpsMessage('Unable to acquire GPS signal. Manual progression enabled.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!currentStep) return null;

  const maneuver = parseStepManeuver(currentStep, currentStepIndex, totalSteps, userCoords);
  const nextManeuver = nextStep
    ? parseStepManeuver(nextStep, currentStepIndex + 1, totalSteps, userCoords)
    : null;

  const remainingStats = calculateRemainingRouteStats(steps, currentStepIndex, userCoords);
  const isTransit = currentStep.travelMode === 'TRANSIT';
  const transitDetail = currentStep.transitDetails;
  const verifiedStepMode = getVerifiedStepMode(currentStep);
  const isMetro = isTransit && verifiedStepMode === 'METRO';
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onSelectStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      onSelectStepIndex(currentStepIndex + 1);
    }
  };

  return (
    <div className="w-full bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 space-y-4">
      {/* Top Header: Navigation Mode & Actions */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Route Navigation Mode
          </span>
          <span className="text-[11px] text-slate-400">· Step {currentStepIndex + 1} of {totalSteps}</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenStreetView && (
            <button
              type="button"
              onClick={onOpenStreetView}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-colors border border-slate-700 cursor-pointer"
              title="View Street View panorama"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Street View</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGoogleMaps}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors border border-slate-700 cursor-pointer"
            title="Open in Google Maps application"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Google Maps</span>
          </button>

          <button
            type="button"
            onClick={onExitNavigation}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Exit navigation mode"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Primary Maneuver Guidance Spotlight (Google Maps Style) */}
      <div className="bg-emerald-950/80 rounded-2xl p-4 border border-emerald-600/50 shadow-lg space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
            {renderManeuverIcon(maneuver.type, 'w-6 h-6 stroke-[2.5]')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                {maneuver.distanceToTurnText}
              </span>
              <span className="text-slate-400 text-xs">·</span>
              <span className="text-xs text-emerald-200/80 font-medium">
                {currentStep.durationText}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
              {maneuver.actionTitle}
            </h3>

            <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed font-medium">
              {currentStep.instructions}
            </p>
          </div>
        </div>

        {/* Next Maneuver Preview if available */}
        {nextManeuver && (
          <div className="pt-2.5 border-t border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-200/90">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider shrink-0 bg-emerald-900/80 px-1.5 py-0.5 rounded">
              Then
            </span>
            <div className="flex items-center gap-1.5 truncate">
              {renderManeuverIcon(nextManeuver.type, 'w-3.5 h-3.5 text-emerald-300 shrink-0')}
              <span className="truncate">{nextManeuver.actionTitle}</span>
            </div>
          </div>
        )}
      </div>

      {/* Transit Boarding & Alighting Specifics */}
      {isTransit && transitDetail && (
        <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Board At ({isMetro ? 'Metro Station' : 'Bus Stop'})
            </span>
            <span className="font-bold text-white block mt-0.5">
              {transitDetail.departureStop.name}
            </span>
            {transitDetail.departureTimeFormatted && (
              <span className="text-slate-400 text-[11px] block mt-0.5">
                Departure: <strong className="text-slate-200">{transitDetail.departureTimeFormatted}</strong>
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Alight At / Get Off
            </span>
            <span className="font-bold text-white block mt-0.5">
              {transitDetail.arrivalStop.name}
            </span>
            {transitDetail.arrivalTimeFormatted && (
              <span className="text-slate-400 text-[11px] block mt-0.5">
                Arrival: <strong className="text-slate-200">{transitDetail.arrivalTimeFormatted}</strong>
              </span>
            )}
          </div>

          <div className="sm:col-span-2 pt-1 border-t border-slate-700/80 text-[11px] text-slate-300 flex items-center justify-between">
            <span>
              Line: <strong className="text-white">{transitDetail.line.name}</strong> ({transitDetail.line.agencyName})
            </span>
            <span>
              Ride <strong className="text-emerald-300">{transitDetail.stopCount} stops</strong>
            </span>
          </div>
        </div>
      )}

      {/* Trip Remaining Distance, Duration & ETA (Calculated strictly from valid geometry) */}
      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining</span>
          <span className="text-sm font-extrabold text-white block mt-0.5">
            {remainingStats.remainingDistanceText}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Left</span>
          <span className="text-sm font-extrabold text-emerald-400 block mt-0.5">
            {remainingStats.remainingDurationText}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Arrival</span>
          <span className="text-sm font-extrabold text-slate-200 block mt-0.5">
            {remainingStats.etaFormatted}
          </span>
        </div>
      </div>

      {/* Live Geolocation / Progression Notice */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              {gpsStatus === 'tracking'
                ? 'Live GPS tracking active for proximity detection'
                : 'Step progression uses manual controls below'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleGps}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
              gpsStatus === 'tracking'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
            }`}
          >
            <Crosshair className="w-3 h-3 text-emerald-400" />
            <span>{gpsStatus === 'tracking' ? 'GPS On' : 'Enable GPS'}</span>
          </button>
        </div>

        {gpsMessage && (
          <p className="text-[11px] text-slate-400 italic">
            {gpsMessage}
          </p>
        )}
      </div>

      {/* Step Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5 text-slate-400">
          <span className="font-semibold text-slate-200">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <span className="font-mono text-emerald-400 font-bold">{progressPercent}% Completed</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Navigation Controls: Previous / Next */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
            currentStepIndex === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 active:scale-[0.98]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentStepIndex === totalSteps - 1}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
            currentStepIndex === totalSteps - 1
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md active:scale-[0.98]'
          }`}
        >
          <span>Next Step</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

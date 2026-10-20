/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Compass,
  Info,
  ArrowRight,
  Bus,
  Train,
  Footprints,
  GitFork,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Star,
  MapPin,
  Navigation,
  Check,
  Play,
  Camera,
  Map as MapIcon,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { TravelMode, LocationCoordinates } from '../types/transit';
import { TRAVEL_MODES } from '../data/bengaluruLocations';
import { TransitRoutesResponse, JourneyRoute, RouteStep, JourneyStage } from '../types/routes';
import { buildJourneyStages, calculateWalkingSegments, categorizeRoute, getVerifiedStepMode } from '../utils/transitStages';

interface JourneyResultsAreaProps {
  routesResponse: TransitRoutesResponse | null;
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  selectedStepIndex: number | null;
  onSelectStepIndex: (idx: number | null, preferredView?: 'map' | 'streetview') => void;
  activeViewMode?: 'map' | 'streetview';
  onChangeViewMode?: (mode: 'map' | 'streetview') => void;
  isNavigating: boolean;
  onToggleNavigation: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  startLocation: string;
  destination: string;
  startCoords?: LocationCoordinates;
  destCoords?: LocationCoordinates;
  onResetSearch: () => void;
  selectedMode: TravelMode;
  onChangeMode: (mode: TravelMode) => void;
}

export const JourneyResultsArea: React.FC<JourneyResultsAreaProps> = ({
  routesResponse,
  selectedRouteIndex,
  onSelectRouteIndex,
  selectedStepIndex,
  onSelectStepIndex,
  activeViewMode = 'map',
  onChangeViewMode,
  isNavigating,
  onToggleNavigation,
  isLoading,
  errorMessage,
  startLocation,
  destination,
  startCoords,
  destCoords,
  onResetSearch,
  selectedMode,
  onChangeMode,
}) => {
  const [activeTab, setActiveTab] = useState<'stages' | 'steps'>('stages');

  // External Google Maps directions URL (Requirement 9)
  const googleMapsDirectionsUrl = useMemo(() => {
    const originParam = startCoords ? `${startCoords.lat},${startCoords.lng}` : startLocation;
    const destParam = destCoords ? `${destCoords.lat},${destCoords.lng}` : destination;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=transit`;
  }, [startCoords, startLocation, destCoords, destination]);

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
            <Compass className="w-7 h-7 animate-spin" style={{ animationDuration: '2.5s' }} />
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            Multi-Modal Journey Engine
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            Comparing Bengaluru Travel Options
          </h3>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Evaluating BMTC buses, Namma Metro lines, walking distances, and multimodal transfers between{' '}
            <span className="font-semibold text-slate-700">{startLocation}</span> and{' '}
            <span className="font-semibold text-slate-700">{destination}</span>...
          </p>

          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-6">
            <div className="h-full bg-emerald-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error or API limitation state
  if (errorMessage || (routesResponse && !routesResponse.success)) {
    const errorText = errorMessage || routesResponse?.error || routesResponse?.dataNotice || 'No routes available';

    return (
      <div className="w-full bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Transit Routing Service Notice
              </h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {errorText}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <span className="font-bold text-slate-800 block">
                Understanding Bengaluru Transit Data Coverage:
              </span>
              <p>
                Google Routes API provides transit routing based on official GTFS data feeds supplied by BMTC and BMRCL. Some peripheral areas, local feeder routes, or unmapped neighborhood stops in Bengaluru may not return direct transit steps.
              </p>
              <p className="text-slate-500">
                <strong>Helpful Tip:</strong> Try selecting a nearby arterial road, TTMC bus stand, or Namma Metro station, then plan the last mile on foot or via local bus.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onResetSearch}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Try Another Search
              </button>
              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                <span>Search in Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not searched state
  if (!routesResponse || !routesResponse.routes || routesResponse.routes.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-10 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3.5">
            <Compass className="w-6 h-6 text-emerald-700" />
          </div>
          <span className="inline-block text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            Intelligent Journey Planner
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Real Transit Guidance Will Appear Here
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Enter your starting point (or click <strong className="text-slate-700">Use My Current Location</strong>), choose your destination, and click <strong className="text-slate-700">Find Transit Routes</strong> to compare BMTC buses, Namma Metro, and walking options.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
              <Bus className="w-3.5 h-3.5 text-blue-600" /> BMTC Bus
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
              <Train className="w-3.5 h-3.5 text-purple-600" /> Namma Metro
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Bus + Metro
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
              <Footprints className="w-3.5 h-3.5 text-emerald-600" /> Walking Guidance
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Active Journey Results Display
  const routes = routesResponse.routes;
  const currentRoute: JourneyRoute = routes[selectedRouteIndex] || routes[0];
  const steps = currentRoute.steps || [];
  const totalSteps = steps.length;
  const isStepSelected = selectedStepIndex !== null && selectedStepIndex !== undefined;

  // Build sequential stages (Requirement 2)
  const stages: JourneyStage[] = useMemo(() => {
    if (currentRoute.stages && currentRoute.stages.length > 0) {
      return currentRoute.stages;
    }
    return buildJourneyStages(
      currentRoute,
      routesResponse.origin.name,
      routesResponse.destination.name
    );
  }, [currentRoute, routesResponse.origin.name, routesResponse.destination.name]);

  // Compute separate walking distances breakdown (Requirement 2)
  const walkingBreakdown = useMemo(() => {
    return calculateWalkingSegments(steps);
  }, [steps]);

  // Step progression helpers (Requirements 1, 2 & 3)
  const handleStartJourney = () => {
    // Remain in Map view for all journey types per Requirement 1
    onSelectStepIndex(0, 'map');
    if (onToggleNavigation && !isNavigating) {
      onToggleNavigation();
    }
    const mapElement = document.getElementById('visual-journey-workspace');
    if (mapElement && window.innerWidth < 1024) {
      mapElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (selectedStepIndex === null || selectedStepIndex === 0) {
      onSelectStepIndex(0);
    } else {
      const prevIdx = selectedStepIndex - 1;
      // Do not auto-switch to street view; preserve current view mode
      onSelectStepIndex(prevIdx);
    }
  };

  const handleNextStep = () => {
    if (selectedStepIndex === null) {
      onSelectStepIndex(0);
    } else if (selectedStepIndex < totalSteps - 1) {
      const nextIdx = selectedStepIndex + 1;
      // Do not auto-switch to street view; preserve current view mode
      onSelectStepIndex(nextIdx);
    }
  };

  const handleResetToFullRoute = () => {
    onSelectStepIndex(null, 'map');
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. RECOMMEND THE BEST TRANSPORT OPTION (Requirement 1) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
              <span>Multi-Modal Journey Evaluation</span>
              <span aria-hidden="true">·</span>
              <span>{routes.length} Travel Option{routes.length > 1 ? 's' : ''} Checked</span>
            </div>
            <div className="flex items-center flex-wrap gap-2 text-base sm:text-lg font-bold text-slate-900">
              <span>{routesResponse.origin.name}</span>
              <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{routesResponse.destination.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Open in Google Maps button (Requirement 9) */}
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Maps</span>
            </a>

            <button
              type="button"
              onClick={onResetSearch}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Search</span>
            </button>
          </div>
        </div>

        {/* Alternative Routes Comparison Cards (Requirement 1) */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">
              Compare Travel Options:
            </span>
            <span className="text-[11px] text-slate-500">
              Updates route geometry & camera view
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {routes.map((route, idx) => {
              const isSelected = selectedRouteIndex === idx;
              const cat = categorizeRoute(route);
              const isMetro = cat.transportType === 'METRO';
              const isBus = cat.transportType === 'BUS';
              const isBusMetro = cat.transportType === 'BUS_METRO';
              const isWalk = cat.transportType === 'WALK';

              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => {
                    onSelectRouteIndex(idx);
                    onSelectStepIndex(null, 'map');
                  }}
                  className={`text-left p-4 rounded-xl border transition-all duration-150 relative flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Header: Mode Badge + Recommended Tag */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                          isMetro
                            ? 'bg-purple-100/80 text-purple-900 border border-purple-200'
                            : isBusMetro
                            ? 'bg-indigo-100/80 text-indigo-900 border border-indigo-200'
                            : isBus
                            ? 'bg-blue-100/80 text-blue-900 border border-blue-200'
                            : 'bg-emerald-100/80 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {isMetro ? (
                          <Train className="w-3.5 h-3.5 text-purple-700" />
                        ) : isBusMetro ? (
                          <Layers className="w-3.5 h-3.5 text-indigo-700" />
                        ) : isBus ? (
                          <Bus className="w-3.5 h-3.5 text-blue-700" />
                        ) : (
                          <Footprints className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        <span>{route.categoryLabel || cat.categoryLabel}</span>
                      </span>

                      {route.isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-100/80 border border-amber-300/80 rounded-md px-2 py-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                          Recommended
                        </span>
                      )}
                    </div>

                    {/* Travel Time & Distance */}
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
                        {route.durationText}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {route.distanceText}
                      </span>
                    </div>

                    {/* Transfers & Walking Distance */}
                    <div className="text-xs text-slate-600 space-y-1 mb-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="text-slate-800 font-semibold">
                          {isWalk
                            ? 'Direct Walk'
                            : route.transferCount === 0
                            ? 'Direct route'
                            : `${route.transferCount} transfer${route.transferCount > 1 ? 's' : ''}`}
                        </span>
                        {!isWalk && route.walkingDistanceText && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span>{route.walkingDistanceText} walk</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Comparative Note */}
                    {route.comparisonNote && !route.isRecommended && (
                      <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 mt-1 leading-snug">
                        {route.comparisonNote}
                      </p>
                    )}

                    {/* Transit Lines */}
                    {route.transitLines && route.transitLines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {route.transitLines.map((line, lIdx) => (
                          <span
                            key={lIdx}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                              line.vehicleType === 'SUBWAY'
                                ? 'bg-purple-50 text-purple-900 border border-purple-200'
                                : 'bg-blue-50 text-blue-900 border border-blue-200'
                            }`}
                          >
                            {line.vehicleType === 'SUBWAY' ? (
                              <Train className="w-3 h-3 text-purple-600" />
                            ) : (
                              <Bus className="w-3 h-3 text-blue-600" />
                            )}
                            <span>{line.shortName || line.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      {isWalk ? 'Walking only' : `${route.steps.length} segments`}
                    </span>
                    <span
                      className={`font-semibold ${
                        isSelected ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Selected</span>
                        </>
                      ) : (
                        'Select'
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recommendation Reason Spotlight */}
        {currentRoute.recommendationReason && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs">
            <Star className="w-4 h-4 fill-amber-400 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950 text-xs block">
                Why this route is recommended:
              </span>
              <p className="text-amber-900 leading-relaxed font-medium">
                {currentRoute.recommendationReason}
              </p>
            </div>
          </div>
        )}

        {/* Walking Breakdown for Selected Journey */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs">
          <span className="text-xs font-bold text-slate-800 block mb-2">
            Walking Distance Breakdown
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">First-Mile</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">{walkingBreakdown.firstMileText}</span>
            </div>
            {walkingBreakdown.transferMeters > 0 ? (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Transfers</span>
                <span className="text-xs font-bold text-amber-800 mt-0.5 block">{walkingBreakdown.transferText}</span>
              </div>
            ) : null}
            {walkingBreakdown.lastMileMeters > 0 ? (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Last-Mile</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">{walkingBreakdown.lastMileText}</span>
              </div>
            ) : null}
            <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Total Walking</span>
              <span className="text-xs font-bold text-emerald-950 mt-0.5 block">
                {walkingBreakdown.totalWalkText} <span className="text-emerald-700 font-normal">({walkingBreakdown.totalWalkDurationText})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BREAK THE JOURNEY INTO CLEAR STAGES (Requirement 2 & 3) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {/* Navigation / Stages View Selector & Step Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {activeTab === 'stages' ? 'Journey Stages Breakdown' : 'Step-by-Step Instructions'}
              </h3>
              {isStepSelected && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Step {selectedStepIndex + 1} of {totalSteps} Focused
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Each stage provides explicit boarding, alight, transfer, and walking guidance.
            </p>
          </div>

          {/* Tab Switcher & Step Advance Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher: Stages vs Detailed Steps */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('stages')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'stages'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Journey Stages ({stages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('steps')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'steps'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Turn Timeline ({totalSteps})
              </button>
            </div>

            {/* Stepper buttons */}
            {!isStepSelected ? (
              <button
                type="button"
                onClick={handleStartJourney}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Journey</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={selectedStepIndex === 0}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    selectedStepIndex === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs'
                  }`}
                  title="Previous Step"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={selectedStepIndex === totalSteps - 1}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    selectedStepIndex === totalSteps - 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                  }`}
                  title="Next Step"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleResetToFullRoute}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Reset to view entire route on map"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2A. TAB: JOURNEY STAGES VIEW (Requirement 2: Break journey into clear stages) */}
        {activeTab === 'stages' && (
          <div className="space-y-4">
            {stages.map((stage, stageIdx) => {
              const isFirstMile = stage.stageType === 'WALK_FIRST_MILE';
              const isLastMile = stage.stageType === 'WALK_LAST_MILE';
              const isTransferWalk = stage.stageType === 'TRANSFER_WALK';
              const isDirectWalk = stage.stageType === 'WALK_DIRECT';
              const isWalkingStage = isFirstMile || isLastMile || isTransferWalk || isDirectWalk;
              const isMetro = stage.stageType === 'TRANSIT_METRO';
              const isBus = stage.stageType === 'TRANSIT_BUS';

              const isStageSelected = selectedStepIndex === stage.stepIndex;

              return (
                <div
                  key={stageIdx}
                  className={`p-4 sm:p-5 rounded-xl border transition-all duration-150 ${
                    isStageSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/30 shadow-xs'
                      : isMetro
                      ? 'border-purple-200 bg-purple-50/20 hover:border-purple-300'
                      : isBus
                      ? 'border-blue-200 bg-blue-50/20 hover:border-blue-300'
                      : isTransferWalk
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  {/* Stage Top Bar: Stage Number, Category, and Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {stage.stageNumber}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isMetro
                            ? 'bg-purple-100/90 text-purple-900 border border-purple-200'
                            : isBus
                            ? 'bg-blue-100/90 text-blue-900 border border-blue-200'
                            : isTransferWalk
                            ? 'bg-amber-100/90 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100/90 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {stage.stageBadge}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Stage {stage.stageNumber} of {stages.length}
                      </span>
                    </div>

                    {/* Preview on Map & Street View buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStepIndex(stage.stepIndex, 'map');
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                          isStageSelected && activeViewMode === 'map'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                        }`}
                        title="Preview stage on map"
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span>{isStageSelected && activeViewMode === 'map' ? 'Active on Map' : 'Preview Map'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectStepIndex(stage.stepIndex, 'streetview');
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                          isStageSelected && activeViewMode === 'streetview'
                            ? 'bg-slate-900 text-emerald-400 border border-emerald-500'
                            : isWalkingStage
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                        }`}
                        title="Inspect in 360° Street View"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {isStageSelected && activeViewMode === 'streetview'
                            ? 'Street View Active'
                            : 'Street View'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Stage Content */}
                  {isWalkingStage ? (
                    /* Walking Stage Details: Display walking distance separately */
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Footprints className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{stage.title}</span>
                        </h4>

                        {/* Separate Walking Distance Badge */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-950 font-semibold text-xs">
                          <Footprints className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Walking:</span>
                          <strong className="text-emerald-900 font-bold">
                            {stage.walkingDistanceText}
                          </strong>
                          <span className="text-emerald-700 font-medium">({stage.durationText})</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {stage.instructions}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                        <span>From: <strong className="text-slate-700">{stage.fromPlace}</strong></span>
                        <span>To: <strong className="text-slate-700">{stage.toPlace}</strong></span>
                      </div>
                    </div>
                  ) : (
                    /* Transit Stage Details: Verified bus number & direction, boarding & get-off points */
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                              isMetro ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {isMetro ? <Train className="w-3.5 h-3.5" /> : <Bus className="w-3.5 h-3.5" />}
                            <span>
                              {isMetro ? 'Namma Metro' : 'BMTC Bus'} {stage.lineIdentifier}
                            </span>
                          </span>

                          {stage.directionHeadsign && (
                            <span className="text-xs font-semibold text-slate-700">
                              Towards <strong className="text-slate-900">{stage.directionHeadsign}</strong>
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-semibold text-slate-500">
                          Operated by: <strong>{stage.agencyName}</strong>
                        </span>
                      </div>

                      {/* Boarding and Alighting Info (Requirement 2) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Where to Board ({isMetro ? 'Station' : 'Stop'})
                          </span>
                          <span className="font-bold text-slate-900 block mt-0.5">
                            {stage.departureStopName}
                          </span>
                          {stage.departureTimeFormatted && (
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              Scheduled departure: <strong>{stage.departureTimeFormatted}</strong>
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                            Where to Get Off / Alight ({isMetro ? 'Station' : 'Stop'})
                          </span>
                          <span className="font-bold text-slate-900 block mt-0.5">
                            {stage.arrivalStopName}
                          </span>
                          {stage.arrivalTimeFormatted && (
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              Scheduled arrival: <strong>{stage.arrivalTimeFormatted}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 font-medium">
                        <span>
                          Ride for <strong>{stage.stopCount || 1} stops</strong> ({stage.durationText})
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          Follow in-vehicle stop announcements
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 2B. TAB: DETAILED TURN-BY-TURN TIMELINE */}
        {activeTab === 'steps' && (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {steps.map((step, sIdx) => {
              const isFirst = sIdx === 0;
              const isLast = sIdx === steps.length - 1;
              const isTransit = step.travelMode === 'TRANSIT';
              const transitDetail = step.transitDetails;
              const stepMode = getVerifiedStepMode(step);
              const isMetro = isTransit && stepMode === 'METRO';
              const isSelected = selectedStepIndex === sIdx;

              const isTransfer =
                !isTransit &&
                !isFirst &&
                !isLast &&
                sIdx > 0 &&
                sIdx < steps.length - 1 &&
                (steps[sIdx - 1].travelMode === 'TRANSIT' || steps[sIdx + 1].travelMode === 'TRANSIT');

              return (
                <div key={sIdx} className="relative group">
                  {/* Timeline node icon */}
                  <div
                    className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${
                      isSelected ? 'scale-125 ring-emerald-300 z-10' : ''
                    } ${
                      isTransit
                        ? isMetro
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-600 text-white'
                        : isTransfer
                        ? 'bg-amber-500 text-white'
                        : isFirst
                        ? 'bg-emerald-600 text-white'
                        : isLast
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-400 text-white'
                    }`}
                  >
                    {isTransit ? (
                      isMetro ? (
                        <Train className="w-3 h-3" />
                      ) : (
                        <Bus className="w-3 h-3" />
                      )
                    ) : isTransfer ? (
                      <GitFork className="w-3 h-3" />
                    ) : (
                      <Footprints className="w-3 h-3" />
                    )}
                  </div>

                  {/* Step Content Card */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'ring-2 ring-emerald-600 border-emerald-500 bg-emerald-50/50 shadow-md'
                        : isTransit
                        ? isMetro
                          ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300'
                          : 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
                        : isTransfer
                        ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          Step {sIdx + 1} of {totalSteps}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isTransit
                              ? isMetro
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                              : isTransfer
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : isFirst
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : isLast
                              ? 'bg-red-100 text-red-900 border border-red-200'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {isTransit
                            ? isMetro
                              ? 'Namma Metro'
                              : 'BMTC Bus'
                            : isTransfer
                            ? 'Transfer Walk'
                            : isFirst
                            ? 'First-Mile Walk'
                            : isLast
                            ? 'Last-Mile Walk'
                            : 'Walking'}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectStepIndex(isSelected && activeViewMode === 'map' ? null : sIdx, 'map');
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                            isSelected && activeViewMode === 'map'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                          }`}
                          title="Preview route on map"
                        >
                          <MapIcon className="w-3.5 h-3.5" />
                          <span>{isSelected && activeViewMode === 'map' ? 'Map Active' : 'Preview'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectStepIndex(sIdx, 'streetview');
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                            isSelected && activeViewMode === 'streetview'
                              ? 'bg-slate-900 text-emerald-400 border border-emerald-500'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                          }`}
                          title="Preview in 360° Street View (Requirement 3)"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {isSelected && activeViewMode === 'streetview'
                              ? 'Street View Active'
                              : 'Street View'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {isTransit && transitDetail ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              isMetro ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {transitDetail.line.shortName || transitDetail.line.name}
                          </span>
                          {transitDetail.headsign && (
                            <span className="text-xs text-slate-700">
                              Towards <strong>{transitDetail.headsign}</strong>
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200/80">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 block">Board:</span>
                            <span className="font-semibold text-slate-900">{transitDetail.departureStop.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-red-700 block">Get-off:</span>
                            <span className="font-semibold text-slate-900">{transitDetail.arrivalStop.name}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 flex justify-between">
                          <span>{transitDetail.stopCount} stops ({step.durationText})</span>
                          <span>{step.distanceText}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {isTransfer
                              ? 'Transfer Walk'
                              : isFirst
                              ? 'Walk from Origin'
                              : isLast
                              ? 'Walk to Destination'
                              : 'Walk'}
                          </span>
                          <span className="font-semibold text-slate-600">
                            {step.distanceText} · {step.durationText}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{step.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Data Authenticity Notice */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-start gap-3 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Authenticity Notice:</strong> All transit routes, stops, and schedules are retrieved directly from Google Routes API for Bengaluru. Real-time GPS bus positions and sudden road diversions require live onboard vehicle feeds.
          </p>
        </div>
      </div>
    </div>
  );
};

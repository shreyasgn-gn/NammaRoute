/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Navbar } from './components/Navbar';
import { RouteSearchForm } from './components/RouteSearchForm';
import { TravelModeSelector } from './components/TravelModeSelector';
import { InteractiveTransitMap } from './components/InteractiveTransitMap';
import { JourneyResultsArea } from './components/JourneyResultsArea';
import { NavigationGuidancePanel } from './components/NavigationGuidancePanel';
import { HowToUseSection } from './components/HowToUseSection';
import { TransitEssentials } from './components/TransitEssentials';
import { Footer } from './components/Footer';
import { MapsConfigGuideModal } from './components/MapsConfigGuideModal';
import { TravelMode, LocationCoordinates } from './types/transit';
import { TransitRoutesResponse, NearbyTransitStop } from './types/routes';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Navigation,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
const isApiKeyConfigured = Boolean(GOOGLE_MAPS_API_KEY.length > 0);

export default function App() {
  const [startLocation, setStartLocation] = useState<string>('');
  const [startCoords, setStartCoords] = useState<LocationCoordinates | undefined>(undefined);
  const [destination, setDestination] = useState<string>('');
  const [destCoords, setDestCoords] = useState<LocationCoordinates | undefined>(undefined);

  const [selectedMode, setSelectedMode] = useState<TravelMode>('combined');
  const [routingPreference, setRoutingPreference] = useState<'DEFAULT' | 'FEWER_TRANSFERS' | 'LESS_WALKING'>('DEFAULT');

  const [nearbyStops, setNearbyStops] = useState<NearbyTransitStop[]>([]);
  const [isLoadingNearbyStops, setIsLoadingNearbyStops] = useState<boolean>(false);

  const [routesResponse, setRoutesResponse] = useState<TransitRoutesResponse | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'streetview'>('map');

  // Mobile expandable instructions drawer state (Requirement 10)
  const [isMobilePanelExpanded, setIsMobilePanelExpanded] = useState<boolean>(true);

  const [isLoadingRoutes, setIsLoadingRoutes] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isConfigGuideOpen, setIsConfigGuideOpen] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  // Client-side quota event listener per Google Maps Platform guidelines
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const handleSwapLocations = () => {
    const tempLoc = startLocation;
    const tempCoords = startCoords;
    setStartLocation(destination);
    setStartCoords(destCoords);
    setDestination(tempLoc);
    setDestCoords(tempCoords);
    if (errorMessage) setErrorMessage(null);
  };

  const handleStartLocationChange = (val: string, coords?: LocationCoordinates) => {
    setStartLocation(val);
    setStartCoords(coords);
  };

  const handleDestinationChange = (val: string, coords?: LocationCoordinates) => {
    setDestination(val);
    setDestCoords(coords);
  };

  // Fetch nearby transit stops around specified coordinates
  const handleFetchNearbyStops = async (lat: number, lng: number) => {
    try {
      setIsLoadingNearbyStops(true);
      const res = await fetch('/api/places/nearby-transit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius: 1500 }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch nearby transit stops');
      }

      const data = await res.json();
      setNearbyStops(data.stops || []);
    } catch (err) {
      console.error('Error fetching nearby transit:', err);
    } finally {
      setIsLoadingNearbyStops(false);
    }
  };

  // Main Route Finder handler: queries server-side Google Routes API
  const handleFindRoutes = async () => {
    const trimmedStart = startLocation.trim();
    const trimmedDest = destination.trim();

    if (!trimmedStart && !trimmedDest) {
      setErrorMessage('Please enter both your starting location and destination to plan your journey.');
      return;
    }

    if (!trimmedStart) {
      setErrorMessage('Please enter your starting location.');
      return;
    }

    if (!trimmedDest) {
      setErrorMessage('Please enter your destination.');
      return;
    }

    if (trimmedStart.toLowerCase() === trimmedDest.toLowerCase()) {
      setErrorMessage('Your starting location and destination are the same. Please choose different locations.');
      return;
    }

    setErrorMessage(null);
    setIsLoadingRoutes(true);

    try {
      const response = await fetch('/api/routes/transit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: {
            lat: startCoords?.lat,
            lng: startCoords?.lng,
            name: trimmedStart,
          },
          destination: {
            lat: destCoords?.lat,
            lng: destCoords?.lng,
            name: trimmedDest,
          },
          routingPreference,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.details || 'Unable to compute transit routes');
      }

      const data: TransitRoutesResponse = await response.json();
      setRoutesResponse(data);

      // If coordinates were resolved by geocoding on server, update state
      if (data.origin && (!startCoords || startCoords.lat !== data.origin.lat)) {
        setStartCoords({ lat: data.origin.lat, lng: data.origin.lng });
      }
      if (data.destination && (!destCoords || destCoords.lat !== data.destination.lat)) {
        setDestCoords({ lat: data.destination.lat, lng: data.destination.lng });
      }

      // Default selection to recommended route index and clear step selection
      if (data.routes && data.routes.length > 0) {
        const recIndex = data.routes.findIndex((r) => r.isRecommended);
        setSelectedRouteIndex(recIndex >= 0 ? recIndex : 0);
        setSelectedStepIndex(null);
      }

      // Scroll smoothly to results area
      setTimeout(() => {
        const resultsEl = document.getElementById('visual-journey-workspace');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: any) {
      console.error('Route calculation error:', err);
      setErrorMessage(err.message || 'Error occurred while contacting Google Routes service.');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const handleResetSearch = () => {
    setRoutesResponse(null);
    setSelectedStepIndex(null);
    setIsNavigating(false);
    setViewMode('map');
    setErrorMessage(null);
  };

  const scrollToSection = (id: string) => {
    const targetId = id === 'transport-guide' ? 'transit-essentials' : id;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeRoute = routesResponse?.routes?.[selectedRouteIndex] || null;

  // Step selection handler: Keep Map as default, never automatically switch to Street View (Requirement 1)
  const handleSelectStep = (idx: number | null, preferredView?: 'map' | 'streetview') => {
    setSelectedStepIndex(idx);
    if (preferredView) {
      setViewMode(preferredView);
    }
  };

  // External Google Maps directions URL (Requirement 9)
  const googleMapsDirectionsUrl = React.useMemo(() => {
    const originParam = startCoords ? `${startCoords.lat},${startCoords.lng}` : startLocation;
    const destParam = destCoords ? `${destCoords.lat},${destCoords.lng}` : destination;
    if (!originParam && !destParam) return 'https://www.google.com/maps';
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=transit`;
  }, [startCoords, startLocation, destCoords, destination]);

  const content = (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Quota Warning Banner (if triggered) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Navbar onScrollTo={scrollToSection} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-slate-50 to-white pt-10 pb-8 sm:pt-12 sm:pb-10 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-2.5 text-xs text-slate-500 font-medium">
                <span className="font-semibold text-emerald-700 tracking-wide uppercase">
                  Bengaluru Travel Assistant
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>BMTC Bus</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>Namma Metro</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>Walking Routes</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1E3F] tracking-tight text-balance leading-tight">
                Find Your Way Around Bengaluru
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mt-2.5 font-medium text-balance">
                Simple, reliable travel guidance for everyone.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-2xl">
                Depart from your current location or enter any Bengaluru address to discover verified BMTC bus connections, Namma Metro corridors, and first-mile/last-mile walking directions.
              </p>
            </div>
          </div>
        </section>

        {/* Search & Planner Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* If NO routes yet: Standard Clean Planning View */}
          {!routesResponse || !routesResponse.success ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Route Search Form */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
                    Plan Your Journey
                  </h2>
                  <p className="text-xs text-slate-500">
                    Use your current GPS location or type an origin and destination to calculate real transit itineraries.
                  </p>
                </div>

                <RouteSearchForm
                  startLocation={startLocation}
                  startCoords={startCoords}
                  destination={destination}
                  destCoords={destCoords}
                  onStartLocationChange={handleStartLocationChange}
                  onDestinationChange={handleDestinationChange}
                  onSwapLocations={handleSwapLocations}
                  onSubmitSearch={handleFindRoutes}
                  isLoading={isLoadingRoutes}
                  errorMessage={errorMessage}
                  onClearError={() => setErrorMessage(null)}
                  isGoogleMapsLoaded={isApiKeyConfigured}
                  routingPreference={routingPreference}
                  onChangeRoutingPreference={setRoutingPreference}
                  nearbyStops={nearbyStops}
                  isLoadingNearbyStops={isLoadingNearbyStops}
                  onFetchNearbyStops={handleFetchNearbyStops}
                />
              </div>

              {/* Right Column: Interactive Map Preview */}
              <div className="lg:col-span-6">
                <InteractiveTransitMap
                  originName={startLocation}
                  destinationName={destination}
                  originCoords={startCoords}
                  destinationCoords={destCoords}
                  isApiKeyConfigured={isApiKeyConfigured}
                  selectedRoute={null}
                  selectedStepIndex={null}
                  onSelectStepIndex={() => {}}
                  isNavigating={false}
                  onToggleNavigation={() => {}}
                />
              </div>
            </div>
          ) : (
            /* When Routes ARE available: Immersive Google Maps-Style Visual Journey Experience (Requirements 1, 5, 6, 7, 8, 9, 10) */
            <div id="visual-journey-workspace" className="space-y-6 scroll-mt-20">
              {/* Quick Route Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse" />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold uppercase tracking-wider">
                      <span>Active Journey Route</span>
                      <span>·</span>
                      <span>{routesResponse.routes.length} Alternatives</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
                      <span>{startLocation}</span>
                      <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{destination}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Open in Google Maps</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Change Route
                  </button>
                </div>
              </div>

              {/* Responsive Layout: Side by Side on Desktop, Map + Expandable Panel on Mobile (Requirement 10) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* On Mobile: Map at Top. On Desktop: Right Column Sticky Map */}
                <div className="order-1 lg:order-2 lg:col-span-6 xl:col-span-7">
                  <div className="lg:sticky lg:top-20 space-y-3">
                    <InteractiveTransitMap
                      originName={startLocation}
                      destinationName={destination}
                      originCoords={startCoords}
                      destinationCoords={destCoords}
                      isApiKeyConfigured={isApiKeyConfigured}
                      selectedRoute={activeRoute}
                      selectedStepIndex={selectedStepIndex}
                      onSelectStepIndex={handleSelectStep}
                      isNavigating={isNavigating}
                      onToggleNavigation={() => setIsNavigating((prev) => !prev)}
                      activeViewMode={viewMode}
                      onChangeViewMode={setViewMode}
                    />

                    {/* Mobile Expand / Collapse Toggle Bar (visible only on mobile screens < lg) */}
                    <div className="lg:hidden">
                      <button
                        type="button"
                        onClick={() => setIsMobilePanelExpanded((prev) => !prev)}
                        className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-md active:scale-[0.99] transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {isMobilePanelExpanded
                              ? 'Collapse Journey Instructions'
                              : `View Journey Instructions (${activeRoute?.steps.length || 0} Steps)`}
                          </span>
                        </span>
                        {isMobilePanelExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instructions & Alternatives Panel: On Mobile collapsible, on Desktop scrollable Left Column */}
                <div
                  className={`order-2 lg:order-1 lg:col-span-6 xl:col-span-5 space-y-6 ${
                    isMobilePanelExpanded ? 'block' : 'hidden lg:block'
                  }`}
                >
                  {isNavigating && activeRoute && (
                    <NavigationGuidancePanel
                      route={activeRoute}
                      currentStepIndex={selectedStepIndex ?? 0}
                      onSelectStepIndex={(idx) => handleSelectStep(idx)}
                      onExitNavigation={() => setIsNavigating(false)}
                      originName={startLocation}
                      destinationName={destination}
                      onOpenGoogleMaps={() => window.open(googleMapsDirectionsUrl, '_blank')}
                      onOpenStreetView={() => setViewMode('streetview')}
                    />
                  )}

                  <JourneyResultsArea
                    routesResponse={routesResponse}
                    selectedRouteIndex={selectedRouteIndex}
                    onSelectRouteIndex={(idx) => {
                      setSelectedRouteIndex(idx);
                      setSelectedStepIndex(null);
                      setIsNavigating(false);
                      setViewMode('map');
                    }}
                    selectedStepIndex={selectedStepIndex}
                    onSelectStepIndex={handleSelectStep}
                    activeViewMode={viewMode}
                    onChangeViewMode={setViewMode}
                    isNavigating={isNavigating}
                    onToggleNavigation={() => {
                      setIsNavigating((prev) => {
                        const next = !prev;
                        if (next && selectedStepIndex === null) {
                          setSelectedStepIndex(0);
                        }
                        setViewMode('map');
                        return next;
                      });
                    }}
                    isLoading={isLoadingRoutes}
                    errorMessage={errorMessage}
                    startLocation={startLocation}
                    destination={destination}
                    startCoords={startCoords}
                    destCoords={destCoords}
                    onResetSearch={handleResetSearch}
                    selectedMode={selectedMode}
                    onChangeMode={setSelectedMode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Travel Mode Selector (Full Width) */}
          <div className="mt-12">
            <TravelModeSelector
              selectedMode={selectedMode}
              onSelectMode={(mode) => {
                setSelectedMode(mode);
              }}
            />
          </div>
        </section>

        {/* First-Time Visitor Guide Section */}
        <HowToUseSection />

        {/* Bengaluru Public Transport Overview Section */}
        <TransitEssentials onScrollTo={scrollToSection} />
      </main>

      {/* Footer */}
      <Footer onScrollTo={scrollToSection} />

      {/* Maps Configuration Guide Modal */}
      <MapsConfigGuideModal
        isOpen={isConfigGuideOpen}
        onClose={() => setIsConfigGuideOpen(false)}
        isApiKeyConfigured={isApiKeyConfigured}
      />
    </div>
  );

  if (isApiKeyConfigured) {
    return (
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="GMP_aistudio">
        {content}
      </APIProvider>
    );
  }

  return content;
}

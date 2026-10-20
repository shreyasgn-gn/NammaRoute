import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  ArrowUpDown,
  Search,
  X,
  AlertCircle,
  Loader2,
  Crosshair,
  Bus,
  Train,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { POPULAR_LOCATIONS } from '../data/bengaluruLocations';
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete';
import { LocationCoordinates } from '../types/transit';
import { NearbyTransitStop } from '../types/routes';

interface RouteSearchFormProps {
  startLocation: string;
  startCoords?: LocationCoordinates;
  destination: string;
  destCoords?: LocationCoordinates;
  onStartLocationChange: (val: string, coords?: LocationCoordinates) => void;
  onDestinationChange: (val: string, coords?: LocationCoordinates) => void;
  onSwapLocations: () => void;
  onSubmitSearch: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  isGoogleMapsLoaded: boolean;
  routingPreference: 'DEFAULT' | 'FEWER_TRANSFERS' | 'LESS_WALKING';
  onChangeRoutingPreference: (pref: 'DEFAULT' | 'FEWER_TRANSFERS' | 'LESS_WALKING') => void;
  nearbyStops: NearbyTransitStop[];
  isLoadingNearbyStops: boolean;
  onFetchNearbyStops: (lat: number, lng: number) => void;
}

export const RouteSearchForm: React.FC<RouteSearchFormProps> = ({
  startLocation,
  startCoords,
  destination,
  destCoords,
  onStartLocationChange,
  onDestinationChange,
  onSwapLocations,
  onSubmitSearch,
  isLoading,
  errorMessage,
  onClearError,
  isGoogleMapsLoaded,
  routingPreference,
  onChangeRoutingPreference,
  nearbyStops,
  isLoadingNearbyStops,
  onFetchNearbyStops,
}) => {
  const [quickTarget, setQuickTarget] = useState<'start' | 'destination'>('start');
  const [activeDropdown, setActiveDropdown] = useState<'start' | 'destination' | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [showNearbyStops, setShowNearbyStops] = useState<boolean>(true);

  // Autocomplete hooks for start and destination
  const startAutocomplete = usePlaceAutocomplete(isGoogleMapsLoaded);
  const destAutocomplete = usePlaceAutocomplete(isGoogleMapsLoaded);

  const startContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search for starting location
  useEffect(() => {
    if (activeDropdown !== 'start') return;
    const timer = setTimeout(() => {
      startAutocomplete.searchPlaces(startLocation);
    }, 250);
    return () => clearTimeout(timer);
  }, [startLocation, activeDropdown]);

  // Debounced search for destination
  useEffect(() => {
    if (activeDropdown !== 'destination') return;
    const timer = setTimeout(() => {
      destAutocomplete.searchPlaces(destination);
    }, 250);
    return () => clearTimeout(timer);
  }, [destination, activeDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        startContainerRef.current &&
        !startContainerRef.current.contains(e.target as Node) &&
        destContainerRef.current &&
        !destContainerRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Request browser geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice({
        type: 'error',
        message: 'Geolocation is not supported by your browser. Please type an address manually.',
      });
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);
    onClearError();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const coords = { lat: latitude, lng: longitude };

        onStartLocationChange('My Current Location (GPS)', coords);
        setLocationNotice({
          type: 'success',
          message: 'Location acquired. Checking for nearby transit stops in Bengaluru...',
        });

        // Trigger fetching nearby transit stops
        onFetchNearbyStops(latitude, longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        let msg = 'Unable to retrieve location. Please type an address or pick a hub.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can enter an address manually below.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please enter an address manually.';
        }
        setLocationNotice({ type: 'error', message: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveDropdown(null);
    onSubmitSearch();
  };

  const handleSelectStartSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    const result = await startAutocomplete.resolvePlaceDetails(suggestion);
    if (result) {
      onStartLocationChange(result.name, result.coordinates);
      if (result.coordinates) {
        onFetchNearbyStops(result.coordinates.lat, result.coordinates.lng);
      }
    } else {
      const fallbackName =
        suggestion.placePrediction?.mainText?.text ||
        suggestion.placePrediction?.text?.text ||
        '';
      onStartLocationChange(fallbackName);
    }
    setActiveDropdown(null);
    onClearError();
  };

  const handleSelectDestSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    const result = await destAutocomplete.resolvePlaceDetails(suggestion);
    if (result) {
      onDestinationChange(result.name, result.coordinates);
    } else {
      const fallbackName =
        suggestion.placePrediction?.mainText?.text ||
        suggestion.placePrediction?.text?.text ||
        '';
      onDestinationChange(fallbackName);
    }
    setActiveDropdown(null);
    onClearError();
  };

  const handleSetStart = (locName: string) => {
    onStartLocationChange(locName);
    onClearError();
  };

  const handleSetDestination = (locName: string) => {
    onDestinationChange(locName);
    onClearError();
  };

  const handleSelectQuickLocation = (locName: string) => {
    if (quickTarget === 'start') {
      handleSetStart(locName);
      setQuickTarget('destination');
    } else {
      handleSetDestination(locName);
    }
  };

  return (
    <div id="route-finder" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
      <form onSubmit={handleSubmit} noValidate>
        {/* Current Location Quick Action Strip */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-50/90 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Depart from your current location?
              </span>
              <span className="text-[11px] text-slate-500">
                Uses browser GPS to pinpoint your starting stop
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 rounded-lg shadow-2xs transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span>Use Current Location</span>
              </>
            )}
          </button>
        </div>

        {/* Location Notice (GPS error or success) */}
        {locationNotice && (
          <div
            className={`mb-3.5 p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs ${
              locationNotice.type === 'error'
                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            <AlertCircle
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                locationNotice.type === 'error' ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
            <div className="flex-1 font-medium">
              <span>{locationNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setLocationNotice(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 relative">
          {/* Starting Location (Origin) */}
          <div className="relative" ref={startContainerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="start-location-input"
                className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
              >
                <span>Starting Location (Origin)</span>
                {startCoords && (
                  <span className="text-[10px] text-emerald-700 font-mono font-medium">
                    (GPS Pinned)
                  </span>
                )}
              </label>
              {startLocation && (
                <button
                  type="button"
                  onClick={() => onStartLocationChange('')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-emerald-600 pointer-events-none">
                <Navigation className="w-5 h-5 fill-emerald-600/15" />
              </div>
              <input
                id="start-location-input"
                type="text"
                autoComplete="off"
                value={startLocation}
                onFocus={() => {
                  setQuickTarget('start');
                  setActiveDropdown('start');
                  if (errorMessage) onClearError();
                }}
                onChange={(e) => {
                  onStartLocationChange(e.target.value);
                  setActiveDropdown('start');
                  if (errorMessage) onClearError();
                }}
                placeholder="e.g., Majestic Bus Stand, MG Road, or your neighborhood"
                className="w-full pl-11 pr-10 py-3 text-sm text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
              />
              {startAutocomplete.isLoading ? (
                <div className="absolute right-3.5 pointer-events-none text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                </div>
              ) : startLocation ? (
                <button
                  type="button"
                  onClick={() => onStartLocationChange('')}
                  aria-label="Clear starting location"
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Autocomplete Dropdown for Origin */}
            {activeDropdown === 'start' && isGoogleMapsLoaded && startLocation.trim().length >= 2 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Google Maps Places & Transit Stops</span>
                  {startAutocomplete.isLoading && <span>Searching Bengaluru...</span>}
                </div>

                {startAutocomplete.suggestions.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {startAutocomplete.suggestions.map((item, idx) => {
                      const mainText =
                        item.placePrediction?.mainText?.text ||
                        item.placePrediction?.text?.text ||
                        '';
                      const secondaryText = item.placePrediction?.secondaryText?.text;

                      return (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => handleSelectStartSuggestion(item)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/60 focus:bg-emerald-50/60 focus:outline-none flex items-start gap-2.5 transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-slate-900 block truncate">
                                {mainText}
                              </span>
                              {secondaryText && (
                                <span className="text-[11px] text-slate-500 block truncate">
                                  {secondaryText}
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : !startAutocomplete.isLoading ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching places found for "{startLocation}" in Bengaluru.
                  </div>
                ) : null}
              </div>
            )}

            {/* Nearby Transit Stops around Origin Box (when coordinates exist) */}
            {startCoords && (nearbyStops.length > 0 || isLoadingNearbyStops) && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-[11px] font-bold text-slate-700">
                      Nearby Transit Stops (Around Origin):
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNearbyStops(!showNearbyStops)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 font-medium"
                  >
                    <span>{showNearbyStops ? 'Hide' : 'Show'}</span>
                    {showNearbyStops ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {isLoadingNearbyStops ? (
                  <div className="flex items-center gap-2 py-1 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Locating nearby bus stops & metro stations...</span>
                  </div>
                ) : showNearbyStops ? (
                  <div>
                    <p className="text-[10px] text-slate-500 mb-2">
                      Click any stop to depart directly from it. Note: The closest station might not always offer direct routes to your destination.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {nearbyStops.map((stop) => {
                        return (
                          <button
                            key={stop.id}
                            type="button"
                            onClick={() => onStartLocationChange(stop.name, { lat: stop.lat, lng: stop.lng })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                          >
                            {stop.type === 'METRO' ? (
                              <Train className="w-3 h-3 text-purple-600" />
                            ) : (
                              <Bus className="w-3 h-3 text-blue-600" />
                            )}
                            <span className="truncate max-w-[150px]">{stop.name}</span>
                            {stop.distanceMeters !== undefined && (
                              <span className="text-[10px] text-slate-400">
                                ({stop.distanceMeters < 1000 ? `${stop.distanceMeters}m` : `${(stop.distanceMeters / 1000).toFixed(1)}km`})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Swap Button Controls */}
          <div className="flex items-center justify-center my-1 relative">
            <div className="absolute inset-x-0 h-px bg-slate-200" />
            <button
              type="button"
              onClick={onSwapLocations}
              aria-label="Swap starting location and destination"
              title="Swap starting location and destination"
              className="relative z-10 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/70 transition-all text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-transform group-hover:rotate-180" />
              <span>Swap Locations</span>
            </button>
          </div>

          {/* Destination */}
          <div className="relative" ref={destContainerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="destination-input"
                className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
              >
                <span>Destination (Address, Landmark, Metro Station)</span>
                {destCoords && (
                  <span className="text-[10px] text-red-700 font-mono font-medium">
                    (Pinned)
                  </span>
                )}
              </label>
              {destination && (
                <button
                  type="button"
                  onClick={() => onDestinationChange('')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-red-600 pointer-events-none">
                <MapPin className="w-5 h-5 fill-red-600/15" />
              </div>
              <input
                id="destination-input"
                type="text"
                autoComplete="off"
                value={destination}
                onFocus={() => {
                  setQuickTarget('destination');
                  setActiveDropdown('destination');
                  if (errorMessage) onClearError();
                }}
                onChange={(e) => {
                  onDestinationChange(e.target.value);
                  setActiveDropdown('destination');
                  if (errorMessage) onClearError();
                }}
                placeholder="e.g., Whitefield ITPL, Silk Board, IISc, or St. John's Hospital"
                className="w-full pl-11 pr-10 py-3 text-sm text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
              />
              {destAutocomplete.isLoading ? (
                <div className="absolute right-3.5 pointer-events-none text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                </div>
              ) : destination ? (
                <button
                  type="button"
                  onClick={() => onDestinationChange('')}
                  aria-label="Clear destination"
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Autocomplete Dropdown for Destination */}
            {activeDropdown === 'destination' && isGoogleMapsLoaded && destination.trim().length >= 2 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Google Maps Places & Landmarks</span>
                  {destAutocomplete.isLoading && <span>Searching Bengaluru...</span>}
                </div>

                {destAutocomplete.suggestions.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {destAutocomplete.suggestions.map((item, idx) => {
                      const mainText =
                        item.placePrediction?.mainText?.text ||
                        item.placePrediction?.text?.text ||
                        '';
                      const secondaryText = item.placePrediction?.secondaryText?.text;

                      return (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => handleSelectDestSuggestion(item)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/60 focus:bg-emerald-50/60 focus:outline-none flex items-start gap-2.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-slate-900 block truncate">
                                {mainText}
                              </span>
                              {secondaryText && (
                                <span className="text-[11px] text-slate-500 block truncate">
                                  {secondaryText}
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : !destAutocomplete.isLoading ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching places found for "{destination}" in Bengaluru.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Routing Preferences Selector */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">
            Routing Priority:
          </span>
          <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => onChangeRoutingPreference('DEFAULT')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                routingPreference === 'DEFAULT'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => onChangeRoutingPreference('FEWER_TRANSFERS')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                routingPreference === 'FEWER_TRANSFERS'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fewer Transfers
            </button>
            <button
              type="button"
              onClick={() => onChangeRoutingPreference('LESS_WALKING')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                routingPreference === 'LESS_WALKING'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Less Walking
            </button>
          </div>
        </div>

        {/* Error Message Notice */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Required Input Missing</p>
              <p className="text-red-700 text-xs mt-0.5">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={onClearError}
              className="text-red-400 hover:text-red-700 focus:outline-none"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Popular Bengaluru Hubs Quick Selector */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Popular Bengaluru Transit Hubs
              </span>
              <span className="text-[11px] text-slate-500">
                Quickly populate Origin or Destination with key interchange stations
              </span>
            </div>

            {/* Quick Target Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-center">
              <span className="text-[11px] font-medium text-slate-500 px-2">Fill into:</span>
              <button
                type="button"
                onClick={() => setQuickTarget('start')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  quickTarget === 'start'
                    ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Origin
              </button>
              <button
                type="button"
                onClick={() => setQuickTarget('destination')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  quickTarget === 'destination'
                    ? 'bg-white text-red-800 shadow-2xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Destination
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {POPULAR_LOCATIONS.slice(0, 8).map((loc) => {
              const shortName = loc.name.split(' (')[0];
              const isStart = startLocation === loc.name;
              const isDest = destination === loc.name;

              return (
                <div
                  key={loc.name}
                  className="flex items-center justify-between gap-1.5 p-2 bg-slate-50/70 border border-slate-200/90 rounded-xl hover:bg-slate-100/70 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectQuickLocation(loc.name)}
                    title={`Fill into active target (${quickTarget === 'start' ? 'Origin' : 'Destination'})`}
                    className="flex-1 text-left min-w-0 pr-1 hover:text-emerald-700 cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      {shortName}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {loc.area}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetStart(loc.name)}
                      aria-label={`Set ${shortName} as Origin`}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors border cursor-pointer ${
                        isStart
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      {isStart ? 'Origin ✓' : '+ Origin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDestination(loc.name)}
                      aria-label={`Set ${shortName} as Destination`}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors border cursor-pointer ${
                        isDest
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                      }`}
                    >
                      {isDest ? 'Dest ✓' : '+ Dest'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Find My Route Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl text-white font-extrabold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                <span>Computing Real Transit Routes...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 text-emerald-100" />
                <span>Find Transit Routes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

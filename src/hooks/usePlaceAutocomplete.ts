import { useEffect, useRef, useState, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export interface AutocompleteResult {
  placeId?: string;
  name: string;
  formattedAddress?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export function usePlaceAutocomplete(isApiAvailable: boolean) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or maintain session token
  const getSessionToken = useCallback(() => {
    if (!placesLib) return null;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, [placesLib]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setIsLoading(false);
    setError(null);
  }, []);

  const searchPlaces = useCallback(
    async (inputString: string) => {
      const trimmed = inputString.trim();

      if (!trimmed) {
        setSuggestions([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (!isApiAvailable || !placesLib) {
        setSuggestions([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const token = getSessionToken();
        const { AutocompleteSuggestion } = placesLib;

        // Bias predictions towards Bengaluru metropolitan area (approx center and radius)
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: token || undefined,
          includedRegionCodes: ['IN'],
          locationBias: {
            center: { lat: 12.9716, lng: 77.5946 },
            radius: 50000, // 50 km around Bengaluru
          },
        };

        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(res.suggestions || []);
      } catch (err) {
        console.error('Error fetching autocomplete suggestions:', err);
        const msg = err instanceof Error ? err.message : 'Failed to retrieve suggestions';
        setError(msg);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isApiAvailable, placesLib, getSessionToken]
  );

  const resolvePlaceDetails = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion): Promise<AutocompleteResult | null> => {
      if (!placesLib || !suggestion.placePrediction) return null;

      try {
        setIsLoading(true);
        setError(null);

        // Convert prediction to a full Place object
        const place = suggestion.placePrediction.toPlace();

        // Fetch location and address details
        await place.fetchFields({
          fields: ['location', 'displayName', 'formattedAddress', 'id'],
        });

        // Reset session token after successful detail fetch per Google Maps Platform guidelines
        resetSession();

        const latLng = place.location;
        const coords = latLng
          ? {
              lat: typeof latLng.lat === 'function' ? latLng.lat() : (latLng.lat as unknown as number),
              lng: typeof latLng.lng === 'function' ? latLng.lng() : (latLng.lng as unknown as number),
            }
          : undefined;

        const displayName =
          place.displayName ||
          suggestion.placePrediction.mainText?.text ||
          suggestion.placePrediction.text?.text ||
          '';

        return {
          placeId: place.id,
          name: displayName,
          formattedAddress: place.formattedAddress || suggestion.placePrediction.text?.text,
          coordinates: coords,
        };
      } catch (err) {
        console.error('Error resolving place details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch place details');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [placesLib, resetSession]
  );

  return {
    suggestions,
    isLoading,
    error,
    searchPlaces,
    resolvePlaceDetails,
    resetSession,
    clearSuggestions: () => setSuggestions([]),
  };
}

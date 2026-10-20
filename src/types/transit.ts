export type TravelMode = 'bus' | 'metro' | 'walk' | 'combined';

export interface TravelModeInfo {
  id: TravelMode;
  name: string;
  kannadaName: string;
  tagline: string;
  description: string;
  highlights: string[];
  bestFor: string;
}

export interface LocationSuggestion {
  name: string;
  area: string;
  zone: string;
  hasMetro: boolean;
  hasBusTerminus: boolean;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface SelectedLocation {
  name: string;
  placeId?: string;
  coordinates?: LocationCoordinates;
  formattedAddress?: string;
}

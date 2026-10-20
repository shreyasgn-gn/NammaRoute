export type TransportOptionCategory = 'WALK' | 'BUS' | 'METRO' | 'BUS_METRO' | 'TRANSIT';

export type StageType =
  | 'WALK_FIRST_MILE'
  | 'TRANSIT_BUS'
  | 'TRANSIT_METRO'
  | 'TRANSFER_WALK'
  | 'WALK_LAST_MILE'
  | 'WALK_DIRECT';

export interface JourneyStage {
  stageNumber: number;
  stageType: StageType;
  title: string;
  stageBadge: string;
  instructions: string;
  walkingDistanceMeters?: number;
  walkingDistanceText?: string;
  durationSeconds: number;
  durationText: string;
  stepIndex: number; // mapped step index in route.steps for map & streetview syncing
  fromPlace: string;
  toPlace: string;
  // Transit details when applicable
  departureStopName?: string;
  departureTimeFormatted?: string;
  arrivalStopName?: string;
  arrivalTimeFormatted?: string;
  lineIdentifier?: string; // e.g. "500-D" or "Purple Line"
  directionHeadsign?: string; // e.g. "Towards Silk Board"
  stopCount?: number;
  agencyName?: string;
  color?: string;
  textColor?: string;
}

export interface TransitStop {
  name: string;
  lat: number;
  lng: number;
}

export interface TransitLineInfo {
  name: string;
  shortName: string;
  vehicleType: 'BUS' | 'SUBWAY' | 'TRAIN' | 'TRANSIT';
  agencyName: string;
  agencyUri?: string;
  color?: string;
  textColor?: string;
}

export interface RouteStep {
  travelMode: 'WALK' | 'TRANSIT';
  instructions: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  polyline: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  transitDetails?: {
    line: TransitLineInfo;
    headsign: string;
    stopCount: number;
    departureStop: TransitStop;
    departureTime?: string;
    departureTimeFormatted?: string;
    arrivalStop: TransitStop;
    arrivalTime?: string;
    arrivalTimeFormatted?: string;
  };
}

export interface JourneyRoute {
  id: string;
  summary: string;
  transportType: TransportOptionCategory;
  categoryLabel: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  walkingDistanceMeters: number;
  walkingDistanceText: string;
  walkingDurationSeconds: number;
  walkingDurationText: string;
  // Separate walking segments breakdown
  firstMileWalkingMeters: number;
  firstMileWalkingText: string;
  lastMileWalkingMeters: number;
  lastMileWalkingText: string;
  transferWalkingMeters: number;
  transferWalkingText: string;
  transferCount: number;
  transitModes: string[];
  transitLines: TransitLineInfo[];
  isRecommended: boolean;
  recommendationReason?: string;
  comparisonNote?: string;
  steps: RouteStep[];
  stages?: JourneyStage[];
  overviewPolyline: string;
  warnings?: string[];
}

export interface TransitRoutesResponse {
  success: boolean;
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  routes: JourneyRoute[];
  recommendedRouteId?: string;
  error?: string;
  dataNotice?: string;
}

export interface NearbyTransitStop {
  id: string;
  name: string;
  type: 'METRO' | 'BUS' | 'TRAIN';
  types: string[];
  address: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
}

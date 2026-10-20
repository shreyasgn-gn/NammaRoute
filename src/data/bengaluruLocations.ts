import { LocationSuggestion, TravelModeInfo } from '../types/transit';

export const POPULAR_LOCATIONS: LocationSuggestion[] = [
  {
    name: 'Majestic (Kempegowda Bus Station / Metro)',
    area: 'Central Bengaluru',
    zone: 'Central Interchange Hub',
    hasMetro: true,
    hasBusTerminus: true,
  },
  {
    name: 'MG Road (Mahatma Gandhi Road)',
    area: 'Central Business District',
    zone: 'Purple Line Corridor',
    hasMetro: true,
    hasBusTerminus: false,
  },
  {
    name: 'Indiranagar (100 Feet Road)',
    area: 'East Bengaluru',
    zone: 'Purple Line Corridor',
    hasMetro: true,
    hasBusTerminus: true,
  },
  {
    name: 'Whitefield (Kadugodi)',
    area: 'East Bengaluru (IT Hub)',
    zone: 'Purple Line Terminal',
    hasMetro: true,
    hasBusTerminus: true,
  },
  {
    name: 'Koramangala (Sony World Junction)',
    area: 'South-East Bengaluru',
    zone: 'Commercial & Startup District',
    hasMetro: false,
    hasBusTerminus: true,
  },
  {
    name: 'HSR Layout (BDA Complex)',
    area: 'South-East Bengaluru',
    zone: 'Residential & Outer Ring Road',
    hasMetro: false,
    hasBusTerminus: true,
  },
  {
    name: 'Electronic City (Phase 1)',
    area: 'South Bengaluru (Tech Corridor)',
    zone: 'Hosur Road Corridor',
    hasMetro: false,
    hasBusTerminus: true,
  },
  {
    name: 'Hebbal (Hebbal Flyover / Outer Ring Road)',
    area: 'North Bengaluru',
    zone: 'Airport Express Corridor',
    hasMetro: false,
    hasBusTerminus: true,
  },
  {
    name: 'Jayanagar (4th Block Complex)',
    area: 'South Bengaluru',
    zone: 'Green Line Corridor',
    hasMetro: true,
    hasBusTerminus: true,
  },
  {
    name: 'Yeshwanthpur (Railway Station & TTMC)',
    area: 'North-West Bengaluru',
    zone: 'Green Line & Rail Interchange',
    hasMetro: true,
    hasBusTerminus: true,
  },
  {
    name: 'Kempegowda International Airport (BLR)',
    area: 'Devanahalli (North)',
    zone: 'Airport Express / Vayu Vajra Hub',
    hasMetro: false,
    hasBusTerminus: true,
  },
  {
    name: 'Banashankari (TTMC)',
    area: 'South Bengaluru',
    zone: 'Green Line & Ring Road Hub',
    hasMetro: true,
    hasBusTerminus: true,
  },
];

export const TRAVEL_MODES: TravelModeInfo[] = [
  {
    id: 'bus',
    name: 'BMTC Bus',
    kannadaName: 'ಬಿಎಂಟಿಸಿ ಬಸ್',
    tagline: 'City-wide road transit network',
    description:
      'Bangalore Metropolitan Transport Corporation operates extensive non-AC ordinary and air-conditioned services across city neighborhoods and major arterial roads.',
    highlights: [
      'Extensive road coverage across residential and commercial sectors',
      'Ticketing managed onboard through conductors (cash widely used; digital options depend on equipment)',
      'Major interchanges at Traffic & Transit Management Centres (TTMCs) and Kempegowda Bus Station',
    ],
    bestFor: 'Direct road connections and locations without direct rail access',
  },
  {
    id: 'metro',
    name: 'Namma Metro',
    kannadaName: 'ನಮ್ಮ ಮೆಟ್ರೋ',
    tagline: 'Grade-separated rail corridors',
    description:
      'Bangalore Metro Rail Corporation (BMRCL) operates the Purple Line (East-West) and Green Line (North-South), connecting through central interchange at Majestic.',
    highlights: [
      'Grade-separated rail network avoiding surface road intersections',
      'Interchange between Purple & Green corridors at Nadaprabhu Kempegowda Station Majestic',
      'Fare media includes contact smart cards, official mobile QR tickets, or station tokens',
    ],
    bestFor: 'Travel along designated East-West and North-South rail lines',
  },
  {
    id: 'walk',
    name: 'Walking',
    kannadaName: 'ನಡಿಗೆ',
    tagline: 'Pedestrian access & neighborhood connections',
    description:
      'Short-distance connections for accessing transit stops, navigating stations, and moving within commercial or residential localities.',
    highlights: [
      'Best suited for short local hops and station ingress/egress',
      'Pedestrian foot-over-bridges and subways provided at designated arterial crossings',
      'Dedicated pedestrian areas available in select commercial zones',
    ],
    bestFor: 'First- and last-mile connections and station access',
  },
  {
    id: 'combined',
    name: 'Combined Journey',
    kannadaName: 'ಸಂಯುಕ್ತ ಪ್ರಯಾಣ',
    tagline: 'Multi-modal transit connections',
    description:
      'Multi-modal trip planning combining metro rail corridors with connecting local bus routes or walking for origin and destination legs.',
    highlights: [
      'Pairs rail corridors with local road or pedestrian connections',
      'Feeder and local bus stops located near major metro stations',
      'Allows multi-stage route planning across non-adjacent transit lines',
    ],
    bestFor: 'Cross-corridor travel requiring transfers between rail and road',
  },
];

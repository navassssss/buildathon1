/**
 * Nearby places service with local mock POI data
 * No external API calls - uses bundled fixtures
 */

import type { NearbyPlace } from '../types';
import { calculateDistance } from './location';

/**
 * Mock POI database - simulates common travel destinations
 * In production, this would be loaded from bundled GeoJSON fixtures
 */
const MOCK_PLACES: Omit<NearbyPlace, 'id' | 'distanceMeters'>[] = [
  // London, UK
  {
    name: 'St Thomas Hospital',
    category: 'hospital',
    address: 'Westminster Bridge Road, London SE1 7EH, UK',
    coordinates: { lat: 51.4989, lng: -0.1181 },
    phoneNumber: '+44 20 7188 7188',
    open24Hours: true,
    notes: 'Major teaching hospital with A&E',
  },
  {
    name: 'Boots Pharmacy',
    category: 'pharmacy',
    address: '44-46 Regent Street, London W1B 5RA, UK',
    coordinates: { lat: 51.5098, lng: -0.1337 },
    phoneNumber: '+44 20 7734 6126',
    open24Hours: false,
  },
  {
    name: 'Westminster Police Station',
    category: 'police',
    address: '27 Buckingham Gate, London SW1E 6JP, UK',
    coordinates: { lat: 51.4981, lng: -0.1356 },
    phoneNumber: '+44 20 7230 1212',
    open24Hours: true,
  },
  {
    name: 'HSBC ATM',
    category: 'atm',
    address: 'Trafalgar Square, London WC2N, UK',
    coordinates: { lat: 51.5080, lng: -0.1281 },
    open24Hours: true,
  },
  {
    name: 'The Ivy',
    category: 'restaurant',
    address: '1-5 West Street, London WC2H 9NQ, UK',
    coordinates: { lat: 51.5118, lng: -0.1283 },
    phoneNumber: '+44 20 7836 4751',
    open24Hours: false,
    notes: 'British cuisine, reservations recommended',
  },
  {
    name: 'Premier Inn London',
    category: 'accommodation',
    address: '82 King\'s Cross Road, London WC1X 9QE, UK',
    coordinates: { lat: 51.5301, lng: -0.1143 },
    phoneNumber: '+44 871 527 9222',
    open24Hours: true,
  },
  {
    name: 'US Embassy London',
    category: 'embassy',
    address: '33 Nine Elms Lane, London SW11 7US, UK',
    coordinates: { lat: 51.4813, lng: -0.1270 },
    phoneNumber: '+44 20 7499 9000',
    open24Hours: false,
    notes: 'American citizens services',
  },

  // Paris, France
  {
    name: 'Hôpital Européen Georges-Pompidou',
    category: 'hospital',
    address: '20 Rue Leblanc, 75015 Paris, France',
    coordinates: { lat: 48.8395, lng: 2.2771 },
    phoneNumber: '+33 1 56 09 20 00',
    open24Hours: true,
  },
  {
    name: 'Pharmacie des Champs',
    category: 'pharmacy',
    address: '84 Avenue des Champs-Élysées, 75008 Paris, France',
    coordinates: { lat: 48.8708, lng: 2.3053 },
    phoneNumber: '+33 1 45 62 02 41',
    open24Hours: true,
    notes: '24/7 pharmacy',
  },
  {
    name: 'Police Station - 8th Arrondissement',
    category: 'police',
    address: '1 Avenue du Général Eisenhower, 75008 Paris, France',
    coordinates: { lat: 48.8668, lng: 2.3122 },
    phoneNumber: '+33 1 53 76 60 00',
    open24Hours: true,
  },
  {
    name: 'BNP Paribas ATM',
    category: 'atm',
    address: 'Place de la Concorde, 75008 Paris, France',
    coordinates: { lat: 48.8656, lng: 2.3212 },
    open24Hours: true,
  },
  {
    name: 'Le Jules Verne',
    category: 'restaurant',
    address: 'Eiffel Tower, Avenue Gustave Eiffel, 75007 Paris, France',
    coordinates: { lat: 48.8584, lng: 2.2945 },
    phoneNumber: '+33 1 45 55 61 44',
    open24Hours: false,
    notes: 'Michelin-starred French cuisine',
  },
  {
    name: 'Hôtel du Louvre',
    category: 'accommodation',
    address: 'Place André Malraux, 75001 Paris, France',
    coordinates: { lat: 48.8632, lng: 2.3356 },
    phoneNumber: '+33 1 44 58 38 38',
    open24Hours: true,
  },

  // Tokyo, Japan
  {
    name: 'Tokyo Medical University Hospital',
    category: 'hospital',
    address: '6-7-1 Nishishinjuku, Shinjuku, Tokyo 160-0023, Japan',
    coordinates: { lat: 35.6938, lng: 139.6917 },
    phoneNumber: '+81 3-3342-6111',
    open24Hours: true,
  },
  {
    name: 'Matsumoto Kiyoshi Pharmacy',
    category: 'pharmacy',
    address: '3-38-1 Shinjuku, Shinjuku, Tokyo 160-0022, Japan',
    coordinates: { lat: 35.6896, lng: 139.7006 },
    phoneNumber: '+81 3-5360-7521',
    open24Hours: false,
  },
  {
    name: 'Shinjuku Police Station',
    category: 'police',
    address: '1-9-11 Kabukicho, Shinjuku, Tokyo 160-0021, Japan',
    coordinates: { lat: 35.6947, lng: 139.7030 },
    phoneNumber: '+81 3-3346-0110',
    open24Hours: true,
  },
  {
    name: 'Seven Bank ATM',
    category: 'atm',
    address: 'Shibuya Station, Tokyo 150-0002, Japan',
    coordinates: { lat: 35.6580, lng: 139.7016 },
    open24Hours: true,
    notes: 'Accepts international cards',
  },
  {
    name: 'Ichiran Ramen Shibuya',
    category: 'restaurant',
    address: '1-22-7 Jinnan, Shibuya, Tokyo 150-0041, Japan',
    coordinates: { lat: 35.6627, lng: 139.6988 },
    phoneNumber: '+81 3-3463-3667',
    open24Hours: true,
    notes: 'Famous tonkotsu ramen chain',
  },
  {
    name: 'Park Hyatt Tokyo',
    category: 'accommodation',
    address: '3-7-1-2 Nishishinjuku, Shinjuku, Tokyo 163-1055, Japan',
    coordinates: { lat: 35.6852, lng: 139.6916 },
    phoneNumber: '+81 3-5322-1234',
    open24Hours: true,
  },

  // New York, USA
  {
    name: 'NewYork-Presbyterian Hospital',
    category: 'hospital',
    address: '525 E 68th Street, New York, NY 10065, USA',
    coordinates: { lat: 40.7650, lng: -73.9540 },
    phoneNumber: '+1 212-746-5454',
    open24Hours: true,
  },
  {
    name: 'Duane Reade Pharmacy',
    category: 'pharmacy',
    address: '1279 3rd Avenue, New York, NY 10021, USA',
    coordinates: { lat: 40.7720, lng: -73.9583 },
    phoneNumber: '+1 212-744-2668',
    open24Hours: true,
  },
  {
    name: 'NYPD Midtown North Precinct',
    category: 'police',
    address: '306 W 54th Street, New York, NY 10019, USA',
    coordinates: { lat: 40.7672, lng: -73.9877 },
    phoneNumber: '+1 212-767-8400',
    open24Hours: true,
  },
  {
    name: 'Chase Bank ATM',
    category: 'atm',
    address: 'Times Square, New York, NY 10036, USA',
    coordinates: { lat: 40.7580, lng: -73.9855 },
    open24Hours: true,
  },
  {
    name: 'Eleven Madison Park',
    category: 'restaurant',
    address: '11 Madison Avenue, New York, NY 10010, USA',
    coordinates: { lat: 40.7426, lng: -73.9871 },
    phoneNumber: '+1 212-889-0905',
    open24Hours: false,
    notes: 'Fine dining, reservations required',
  },
  {
    name: 'The Plaza Hotel',
    category: 'accommodation',
    address: '768 5th Avenue, New York, NY 10019, USA',
    coordinates: { lat: 40.7644, lng: -73.9747 },
    phoneNumber: '+1 212-759-3000',
    open24Hours: true,
  },

  // Dubai, UAE
  {
    name: 'American Hospital Dubai',
    category: 'hospital',
    address: 'Oud Metha Road, Dubai, UAE',
    coordinates: { lat: 25.2336, lng: 55.3091 },
    phoneNumber: '+971 4-336-7777',
    open24Hours: true,
  },
  {
    name: 'Life Pharmacy',
    category: 'pharmacy',
    address: 'Dubai Mall, Financial Center Road, Dubai, UAE',
    coordinates: { lat: 25.1972, lng: 55.2796 },
    phoneNumber: '+971 4-339-8449',
    open24Hours: false,
  },
  {
    name: 'Dubai Police Station - Bur Dubai',
    category: 'police',
    address: 'Al Fahidi Street, Bur Dubai, UAE',
    coordinates: { lat: 25.2635, lng: 55.2972 },
    phoneNumber: '+971 4-398-8888',
    open24Hours: true,
  },
  {
    name: 'Emirates NBD ATM',
    category: 'atm',
    address: 'Burj Khalifa Boulevard, Dubai, UAE',
    coordinates: { lat: 25.1972, lng: 55.2744 },
    open24Hours: true,
  },
  {
    name: 'At.mosphere Restaurant',
    category: 'restaurant',
    address: 'Burj Khalifa, Level 122, Dubai, UAE',
    coordinates: { lat: 25.1972, lng: 55.2744 },
    phoneNumber: '+971 4-888-3828',
    open24Hours: false,
    notes: 'World\'s highest restaurant',
  },
  {
    name: 'Burj Al Arab Jumeirah',
    category: 'accommodation',
    address: 'Jumeirah Street, Dubai, UAE',
    coordinates: { lat: 25.1413, lng: 55.1853 },
    phoneNumber: '+971 4-301-7777',
    open24Hours: true,
  },
  // Tourist attractions (bundled fixture coordinates only)
  {
    name: 'London Eye',
    category: 'attraction',
    address: 'Riverside Building, County Hall, London SE1 7PB, UK',
    coordinates: { lat: 51.5033, lng: -0.1196 },
    phoneNumber: '+44 20 7967 8021',
    open24Hours: false,
    notes: 'Local fixture attraction; book ahead at peak times',
  },
  {
    name: 'Eiffel Tower',
    category: 'attraction',
    address: 'Champ de Mars, 5 Avenue Anatole France, Paris, France',
    coordinates: { lat: 48.8584, lng: 2.2945 },
    phoneNumber: '+33 1 44 11 23 23',
    open24Hours: false,
    notes: 'Local fixture attraction',
  },
  {
    name: 'Senso-ji Temple',
    category: 'attraction',
    address: '2-3-1 Asakusa, Taito City, Tokyo, Japan',
    coordinates: { lat: 35.7148, lng: 139.7967 },
    phoneNumber: '+81 3-3842-0181',
    open24Hours: true,
    notes: 'Local fixture attraction; grounds open all day',
  },
  {
    name: 'Central Park',
    category: 'attraction',
    address: 'New York, NY 10024, USA',
    coordinates: { lat: 40.7829, lng: -73.9654 },
    phoneNumber: '+1 212-310-6600',
    open24Hours: true,
    notes: 'Local fixture attraction; visitor centre hours vary',
  },
  {
    name: 'Burj Khalifa',
    category: 'attraction',
    address: '1 Sheikh Mohammed bin Rashid Blvd, Dubai, UAE',
    coordinates: { lat: 25.1972, lng: 55.2744 },
    phoneNumber: '+971 4 888 8888',
    open24Hours: false,
    notes: 'Local fixture attraction; observation deck requires a ticket',
  },
];

/**
 * Search for nearby places based on current location
 */
export async function findNearbyPlaces(
  latitude: number,
  longitude: number,
  options?: {
    categories?: NearbyPlace['category'][];
    maxDistance?: number; // in meters
    limit?: number;
  }
): Promise<NearbyPlace[]> {
  const { categories, maxDistance = 5000, limit = 50 } = options || {};

  // Calculate distances and filter
  let places = MOCK_PLACES.map((place, index) => {
    const distance = calculateDistance(
      latitude,
      longitude,
      place.coordinates.lat,
      place.coordinates.lng
    );

    return {
      ...place,
      id: `place-${index}`,
      distanceMeters: Math.round(distance),
    };
  })
    .filter((place) => place.distanceMeters <= maxDistance)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Filter by categories if specified
  if (categories && categories.length > 0) {
    places = places.filter((place) => categories.includes(place.category));
  }

  // Apply limit
  return places.slice(0, limit);
}

/**
 * Get places by specific category
 */
export async function findPlacesByCategory(
  latitude: number,
  longitude: number,
  category: NearbyPlace['category'],
  limit: number = 10
): Promise<NearbyPlace[]> {
  return findNearbyPlaces(latitude, longitude, {
    categories: [category],
    limit,
  });
}

/**
 * Search places by name or address
 */
export async function searchPlaces(
  query: string,
  latitude?: number,
  longitude?: number
): Promise<NearbyPlace[]> {
  const searchLower = query.toLowerCase();

  let places = MOCK_PLACES.map((place, index) => ({
    ...place,
    id: `place-${index}`,
    distanceMeters: latitude && longitude
      ? Math.round(calculateDistance(
          latitude,
          longitude,
          place.coordinates.lat,
          place.coordinates.lng
        ))
      : 0,
  })).filter(
    (place) =>
      place.name.toLowerCase().includes(searchLower) ||
      place.address.toLowerCase().includes(searchLower) ||
      place.category.toLowerCase().includes(searchLower)
  );

  // Sort by distance if location provided, otherwise by name
  if (latitude && longitude) {
    places.sort((a, b) => a.distanceMeters - b.distanceMeters);
  } else {
    places.sort((a, b) => a.name.localeCompare(b.name));
  }

  return places.slice(0, 20);
}

/**
 * Get emergency services (hospitals, police, pharmacies)
 */
export async function findEmergencyServices(
  latitude: number,
  longitude: number
): Promise<NearbyPlace[]> {
  return findNearbyPlaces(latitude, longitude, {
    categories: ['hospital', 'police', 'pharmacy'],
    maxDistance: 10000, // 10km for emergencies
    limit: 15,
  });
}

/** A bundled fixture city that can be explored without device geolocation. */
export interface LocalCity {
  code: string;
  name: string;
  country: string;
  coordinates: { lat: number; lng: number };
}

export const LOCAL_CITIES: LocalCity[] = [
  {
    code: 'london',
    name: 'London',
    country: 'United Kingdom',
    coordinates: { lat: 51.5007, lng: -0.1246 },
  },
  {
    code: 'paris',
    name: 'Paris',
    country: 'France',
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  {
    code: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  {
    code: 'new-york',
    name: 'New York',
    country: 'United States',
    coordinates: { lat: 40.7128, lng: -74.006 },
  },
  {
    code: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    coordinates: { lat: 25.2048, lng: 55.2708 },
  },
];

/** List bundled fixture cities (copy, safe for callers to sort). */
export function getLocalCities(): LocalCity[] {
  return LOCAL_CITIES.map((city) => ({ ...city }));
}

/** Look up a fixture city by code, case-insensitively. */
export function getLocalCity(code: string): LocalCity | null {
  const normalized = code.trim().toLowerCase();
  return LOCAL_CITIES.find((city) => city.code === normalized) ?? null;
}

/**
 * Load nearby essentials for a bundled fixture city. This works without
 * geolocation and never contacts an external service.
 */
export async function findNearbyPlacesForCity(
  code: string,
  options?: {
    categories?: NearbyPlace['category'][];
    maxDistance?: number;
    limit?: number;
  }
): Promise<NearbyPlace[]> {
  const city = getLocalCity(code);
  if (!city) return [];
  return findNearbyPlaces(city.coordinates.lat, city.coordinates.lng, {
    maxDistance: 5000,
    limit: 50,
    ...options,
  });
}

/**
 * Every bundled local place fixture, shaped like a NearbyPlace for map/list
 * rendering. `distanceMeters` is 0 because no user location is implied.
 */
export function getLocalPlaceFixtures(): NearbyPlace[] {
  return MOCK_PLACES.map((place, index) => ({
    ...place,
    id: `fixture-${index}`,
    distanceMeters: 0,
  }));
}

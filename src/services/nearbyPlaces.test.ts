import { describe, it, expect } from 'vitest';
import {
  findNearbyPlaces,
  findNearbyPlacesForCity,
  findPlacesByCategory,
  getLocalCities,
  getLocalCity,
  getLocalPlaceFixtures,
  searchPlaces,
  findEmergencyServices,
} from './nearbyPlaces';

describe('Nearby Places Service (T-004: F-NEB-001)', () => {
  describe('Find Nearby Places', () => {
    it('finds places within specified distance', async () => {
      // London coordinates
      const lat = 51.5074;
      const lng = -0.1278;

      const places = await findNearbyPlaces(lat, lng, {
        maxDistance: 5000,
        limit: 50,
      });

      expect(places).toBeDefined();
      expect(Array.isArray(places)).toBe(true);
      expect(places.length).toBeGreaterThan(0);

      // All places should be within 5km
      places.forEach((place) => {
        expect(place.distanceMeters).toBeLessThanOrEqual(5000);
      });
    });

    it('sorts places by distance (nearest first)', async () => {
      const places = await findNearbyPlaces(51.5074, -0.1278, {
        maxDistance: 10000,
      });

      // Verify ascending distance order
      for (let i = 1; i < places.length; i++) {
        expect(places[i].distanceMeters).toBeGreaterThanOrEqual(
          places[i - 1].distanceMeters
        );
      }
    });

    it('respects the limit parameter', async () => {
      const places = await findNearbyPlaces(51.5074, -0.1278, {
        maxDistance: 10000,
        limit: 5,
      });

      expect(places.length).toBeLessThanOrEqual(5);
    });

    it('filters by categories when specified', async () => {
      const places = await findNearbyPlaces(51.5074, -0.1278, {
        categories: ['hospital', 'pharmacy'],
        maxDistance: 10000,
      });

      places.forEach((place) => {
        expect(['hospital', 'pharmacy']).toContain(place.category);
      });
    });

    it('returns empty array when no places within distance', async () => {
      // Middle of ocean coordinates
      const places = await findNearbyPlaces(0, 0, {
        maxDistance: 100,
      });

      expect(places).toEqual([]);
    });

    it('includes all required place properties', async () => {
      const places = await findNearbyPlaces(51.5074, -0.1278, {
        maxDistance: 5000,
        limit: 1,
      });

      expect(places.length).toBeGreaterThan(0);
      
      const place = places[0];
      expect(place.id).toBeDefined();
      expect(place.name).toBeDefined();
      expect(place.category).toBeDefined();
      expect(place.address).toBeDefined();
      expect(place.distanceMeters).toBeDefined();
      expect(place.coordinates).toBeDefined();
      expect(place.coordinates.lat).toBeDefined();
      expect(place.coordinates.lng).toBeDefined();
      expect(typeof place.open24Hours).toBe('boolean');
    });
  });

  describe('Find Places by Category', () => {
    it('finds only hospitals', async () => {
      const places = await findPlacesByCategory(51.5074, -0.1278, 'hospital');

      expect(places.length).toBeGreaterThan(0);
      places.forEach((place) => {
        expect(place.category).toBe('hospital');
      });
    });

    it('finds only pharmacies', async () => {
      const places = await findPlacesByCategory(48.8566, 2.3522, 'pharmacy');

      expect(places.length).toBeGreaterThan(0);
      places.forEach((place) => {
        expect(place.category).toBe('pharmacy');
      });
    });

    it('finds ATMs', async () => {
      const places = await findPlacesByCategory(40.7580, -73.9855, 'atm');

      places.forEach((place) => {
        expect(place.category).toBe('atm');
      });
    });

    it('respects the limit parameter', async () => {
      const places = await findPlacesByCategory(51.5074, -0.1278, 'restaurant', 3);

      expect(places.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Search Places', () => {
    it('searches places by name', async () => {
      const places = await searchPlaces('Hospital');

      expect(places.length).toBeGreaterThan(0);
      // Some results may have hospital in different languages or contexts
      const hasHospitalRelated = places.some((place) => 
        place.name.toLowerCase().includes('hospital') ||
        place.category === 'hospital' ||
        place.address.toLowerCase().includes('hospital')
      );
      expect(hasHospitalRelated).toBe(true);
    });

    it('searches places by address', async () => {
      const places = await searchPlaces('London');

      expect(places.length).toBeGreaterThan(0);
      places.forEach((place) => {
        expect(place.address.toLowerCase()).toContain('london');
      });
    });

    it('searches places by category', async () => {
      const places = await searchPlaces('pharmacy');

      expect(places.length).toBeGreaterThan(0);
    });

    it('is case-insensitive', async () => {
      const placesLower = await searchPlaces('hospital');
      const placesUpper = await searchPlaces('HOSPITAL');
      const placesMixed = await searchPlaces('HoSpItAl');

      expect(placesLower.length).toBe(placesUpper.length);
      expect(placesLower.length).toBe(placesMixed.length);
    });

    it('sorts by distance when location provided', async () => {
      const places = await searchPlaces('St', 51.5074, -0.1278);

      if (places.length > 1) {
        for (let i = 1; i < places.length; i++) {
          expect(places[i].distanceMeters).toBeGreaterThanOrEqual(
            places[i - 1].distanceMeters
          );
        }
      }
    });

    it('sorts by name when no location provided', async () => {
      const places = await searchPlaces('Hospital');

      if (places.length > 1) {
        for (let i = 1; i < places.length; i++) {
          expect(places[i].name.localeCompare(places[i - 1].name)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('returns empty array for no matches', async () => {
      const places = await searchPlaces('NonExistentPlaceXYZ123');

      expect(places).toEqual([]);
    });

    it('limits results to 20 places', async () => {
      const places = await searchPlaces('a'); // Very broad search

      expect(places.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Find Emergency Services', () => {
    it('finds hospitals, police, and pharmacies', async () => {
      const places = await findEmergencyServices(51.5074, -0.1278);

      expect(places.length).toBeGreaterThan(0);

      places.forEach((place) => {
        expect(['hospital', 'police', 'pharmacy']).toContain(place.category);
      });
    });

    it('searches within 10km radius for emergencies', async () => {
      const places = await findEmergencyServices(51.5074, -0.1278);

      places.forEach((place) => {
        expect(place.distanceMeters).toBeLessThanOrEqual(10000);
      });
    });

    it('prioritizes nearest emergency services', async () => {
      const places = await findEmergencyServices(51.5074, -0.1278);

      // Verify sorted by distance
      for (let i = 1; i < places.length; i++) {
        expect(places[i].distanceMeters).toBeGreaterThanOrEqual(
          places[i - 1].distanceMeters
        );
      }
    });

    it('limits to 15 emergency services', async () => {
      const places = await findEmergencyServices(40.7580, -73.9855);

      expect(places.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Local fixture cities and attractions', () => {
    it('lists five bundled fixture cities and resolves them case-insensitively', () => {
      expect(getLocalCities()).toHaveLength(5);
      expect(getLocalCity('LONDON')?.name).toBe('London');
      expect(getLocalCity('nope')).toBeNull();
    });

    it('loads nearby places for a fixture city without device geolocation', async () => {
      const places = await findNearbyPlacesForCity('london');

      expect(places.length).toBeGreaterThan(0);
      places.forEach((place) => {
        expect(place.distanceMeters).toBeLessThanOrEqual(5000);
        expect(place.coordinates.lat).toBeDefined();
        expect(place.coordinates.lng).toBeDefined();
      });
    });

    it('returns no places for an unknown fixture city', async () => {
      await expect(findNearbyPlacesForCity('atlantis')).resolves.toEqual([]);
    });

    it('includes a tourist attraction category in bundled fixtures', () => {
      const attractions = getLocalPlaceFixtures().filter(
        (place) => place.category === 'attraction'
      );

      expect(attractions.length).toBeGreaterThan(0);
      attractions.forEach((place) => {
        expect(place.coordinates.lat).toBeDefined();
        expect(place.coordinates.lng).toBeDefined();
      });
    });
  });

  describe('Mock Data Coverage', () => {
    it('includes places in multiple cities', async () => {
      const london = await findNearbyPlaces(51.5074, -0.1278, { maxDistance: 10000 });
      const paris = await findNearbyPlaces(48.8566, 2.3522, { maxDistance: 10000 });
      const tokyo = await findNearbyPlaces(35.6762, 139.6503, { maxDistance: 10000 });
      const nyc = await findNearbyPlaces(40.7580, -73.9855, { maxDistance: 10000 });

      expect(london.length).toBeGreaterThan(0);
      expect(paris.length).toBeGreaterThan(0);
      expect(tokyo.length).toBeGreaterThan(0);
      expect(nyc.length).toBeGreaterThan(0);
    });

    it('includes all essential categories', async () => {
      const places = await findNearbyPlaces(51.5074, -0.1278, { maxDistance: 20000 });

      const categories = new Set(places.map((p) => p.category));

      expect(categories.has('hospital')).toBe(true);
      expect(categories.has('pharmacy')).toBe(true);
      expect(categories.has('police')).toBe(true);
      expect(categories.has('atm')).toBe(true);
      expect(categories.has('restaurant')).toBe(true);
      expect(categories.has('accommodation')).toBe(true);
    });

    it('includes contact information for places', async () => {
      const places = await findNearbyPlaces(51.5074, -0.1278, { maxDistance: 5000 });

      const placesWithPhone = places.filter((p) => p.phoneNumber);
      expect(placesWithPhone.length).toBeGreaterThan(0);
    });

    it('marks some places as 24-hour', async () => {
      const places = await findNearbyPlaces(51.5074, -0.1278, { maxDistance: 20000 });

      const open24h = places.filter((p) => p.open24Hours);
      expect(open24h.length).toBeGreaterThan(0);
    });
  });
});

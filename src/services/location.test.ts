import { describe, it, expect } from 'vitest';
import { calculateDistance, formatDistance } from './location';

describe('Location Service (T-004: F-NEB-001)', () => {
  describe('Distance Calculation', () => {
    it('calculates distance between two coordinates using Haversine formula', () => {
      // London to Paris (approx 344 km)
      const londonLat = 51.5074;
      const londonLng = -0.1278;
      const parisLat = 48.8566;
      const parisLng = 2.3522;

      const distance = calculateDistance(londonLat, londonLng, parisLat, parisLng);

      // Should be approximately 344,000 meters (344 km)
      expect(distance).toBeGreaterThan(340000);
      expect(distance).toBeLessThan(350000);
    });

    it('calculates zero distance for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    it('calculates short distances accurately (within 1 km)', () => {
      // Two points about 500m apart in NYC
      const lat1 = 40.7580;
      const lng1 = -73.9855;
      const lat2 = 40.7626;
      const lng2 = -73.9820;

      const distance = calculateDistance(lat1, lng1, lat2, lng2);

      // Should be roughly 500-600 meters
      expect(distance).toBeGreaterThan(400);
      expect(distance).toBeLessThan(700);
    });

    it('handles coordinates across the equator', () => {
      const distance = calculateDistance(10, 0, -10, 0);
      
      // Should be approximately 2,220 km (20 degrees latitude)
      expect(distance).toBeGreaterThan(2200000);
      expect(distance).toBeLessThan(2250000);
    });

    it('handles coordinates across the date line', () => {
      const distance = calculateDistance(0, 179, 0, -179);
      
      // Should be approximately 222 km (2 degrees longitude at equator)
      expect(distance).toBeGreaterThan(200000);
      expect(distance).toBeLessThan(250000);
    });
  });

  describe('Distance Formatting', () => {
    it('formats distances under 1000m in meters', () => {
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
      expect(formatDistance(50)).toBe('50 m');
    });

    it('formats distances over 1000m in kilometers with one decimal', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(1500)).toBe('1.5 km');
      expect(formatDistance(2345)).toBe('2.3 km');
      expect(formatDistance(10000)).toBe('10.0 km');
    });

    it('rounds meters to nearest integer', () => {
      expect(formatDistance(123.4)).toBe('123 m');
      expect(formatDistance(123.6)).toBe('124 m');
    });

    it('rounds kilometers to one decimal place', () => {
      expect(formatDistance(1234)).toBe('1.2 km');
      expect(formatDistance(1567)).toBe('1.6 km');
    });
  });
});

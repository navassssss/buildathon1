import { describe, it, expect } from 'vitest';
import { db } from './db';

describe('TravellerDatabase (IndexedDB/Dexie)', () => {
  it('initializes tables properly', async () => {
    expect(db.trips).toBeDefined();
    expect(db.checklists).toBeDefined();
    expect(db.documents).toBeDefined();
    expect(db.expenses).toBeDefined();
    expect(db.emergencyProfiles).toBeDefined();
    expect(db.nearbyPlaces).toBeDefined();
    expect(db.translationPhrases).toBeDefined();
  });

  it('can store and retrieve a trip record', async () => {
    const testTrip = {
      id: 'trip-test-1',
      title: 'Alpine Expedition',
      destination: 'Interlaken, Switzerland',
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      travelType: 'adventure' as const,
      status: 'planned' as const,
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.trips.add(testTrip);
    const retrieved = await db.trips.get('trip-test-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Alpine Expedition');
  });
});

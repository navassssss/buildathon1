import { describe, it, expect, beforeEach } from 'vitest';
import { useTripStore, type TripFormData } from './tripStore';
import { db } from '../services/db';

describe('Trip Store (Zustand + Dexie)', () => {
  beforeEach(async () => {
    // Clear Dexie database tables
    await db.trips.clear();
    await db.activities.clear();

    // Reset store state
    useTripStore.setState({
      trips: [],
      activeTripId: null,
      isLoading: false,
      error: null,
      statusFilter: 'all',
      searchQuery: '',
    });
  });

  const validTripData: TripFormData = {
    title: 'Kyoto Cultural Tour',
    destination: 'Kyoto, Japan',
    startDate: '2026-04-01',
    endDate: '2026-04-10',
    travelType: 'leisure',
    totalBudget: 2500,
    budgetCurrency: 'USD',
    notes: 'Cherry blossom season visit',
  };

  describe('Trip Creation & Validation', () => {
    it('creates and persists a new trip with valid data', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);

      expect(trip.id).toBeDefined();
      expect(trip.title).toBe('Kyoto Cultural Tour');
      expect(trip.destination).toBe('Kyoto, Japan');
      expect(trip.status).toBe('planned');
      expect(trip.activities).toEqual([]);

      // Verify in Zustand state
      const state = useTripStore.getState();
      expect(state.trips).toHaveLength(1);
      expect(state.trips[0].id).toBe(trip.id);

      // Verify in Dexie
      const persisted = await db.trips.get(trip.id);
      expect(persisted).toBeDefined();
      expect(persisted?.title).toBe('Kyoto Cultural Tour');
    });

    it('fails validation when destination is empty', async () => {
      const invalidData: TripFormData = {
        ...validTripData,
        destination: '   ',
      };

      await expect(useTripStore.getState().addTrip(invalidData)).rejects.toThrow(
        'Destination is required'
      );
      expect(useTripStore.getState().error).toBe('Destination is required');
      expect(useTripStore.getState().trips).toHaveLength(0);
    });

    it('fails validation when title is empty', async () => {
      const invalidData: TripFormData = {
        ...validTripData,
        title: '',
      };

      await expect(useTripStore.getState().addTrip(invalidData)).rejects.toThrow(
        'Title is required'
      );
      expect(useTripStore.getState().error).toBe('Title is required');
    });

    it('fails validation when end date is earlier than start date', async () => {
      const invalidData: TripFormData = {
        ...validTripData,
        startDate: '2026-05-10',
        endDate: '2026-05-01',
      };

      await expect(useTripStore.getState().addTrip(invalidData)).rejects.toThrow(
        'End date cannot be earlier than start date'
      );
    });

    it('fails validation when budget is negative', async () => {
      const invalidData: TripFormData = {
        ...validTripData,
        totalBudget: -100,
      };

      await expect(useTripStore.getState().addTrip(invalidData)).rejects.toThrow(
        'Budget cannot be negative'
      );
    });
  });

  describe('Trip Update & Deletion', () => {
    it('updates existing trip details in store and Dexie', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);

      const updated = await useTripStore.getState().updateTrip(trip.id, {
        title: 'Kyoto Spring Tour',
        status: 'active',
        totalBudget: 3000,
      });

      expect(updated.title).toBe('Kyoto Spring Tour');
      expect(updated.status).toBe('active');
      expect(updated.totalBudget).toBe(3000);

      const inStore = useTripStore.getState().trips.find((t) => t.id === trip.id);
      expect(inStore?.title).toBe('Kyoto Spring Tour');

      const persisted = await db.trips.get(trip.id);
      expect(persisted?.title).toBe('Kyoto Spring Tour');
      expect(persisted?.status).toBe('active');
    });

    it('fails update if updated end date is before start date', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);

      await expect(
        useTripStore.getState().updateTrip(trip.id, {
          endDate: '2026-03-01', // Before 2026-04-01
        })
      ).rejects.toThrow('End date cannot be earlier than start date');
    });

    it('deletes trip and its associated activities', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);
      useTripStore.getState().setActiveTrip(trip.id);

      await useTripStore.getState().addActivity(trip.id, {
        title: 'Fushimi Inari Shrine Visit',
        dayIndex: 1,
        time: '08:00 AM',
      });

      expect(useTripStore.getState().activeTripId).toBe(trip.id);

      await useTripStore.getState().deleteTrip(trip.id);

      expect(useTripStore.getState().trips).toHaveLength(0);
      expect(useTripStore.getState().activeTripId).toBeNull();

      // Ensure removed from Dexie
      const persistedTrip = await db.trips.get(trip.id);
      expect(persistedTrip).toBeUndefined();

      const persistedActivities = await db.activities.where('tripId').equals(trip.id).toArray();
      expect(persistedActivities).toHaveLength(0);
    });
  });

  describe('Activity Management', () => {
    it('adds activity to a trip and persists it', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);

      const activity = await useTripStore.getState().addActivity(trip.id, {
        title: 'Kinkaku-ji (Golden Pavilion)',
        dayIndex: 2,
        time: '10:00 AM',
        location: 'Kinkakujicho, Kita Ward, Kyoto',
        notes: 'Arrive early to avoid crowd',
      });

      expect(activity.id).toBeDefined();
      expect(activity.title).toBe('Kinkaku-ji (Golden Pavilion)');
      expect(activity.completed).toBe(false);

      const updatedTrip = useTripStore.getState().trips.find((t) => t.id === trip.id);
      expect(updatedTrip?.activities).toHaveLength(1);
      expect(updatedTrip?.activities[0].title).toBe('Kinkaku-ji (Golden Pavilion)');

      // Verify in Dexie
      const inDb = await db.activities.get(activity.id);
      expect(inDb).toBeDefined();
      expect(inDb?.location).toBe('Kinkakujicho, Kita Ward, Kyoto');
    });

    it('toggles activity completion state', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);
      const activity = await useTripStore.getState().addActivity(trip.id, {
        title: 'Bamboo Forest Walk',
        dayIndex: 1,
      });

      expect(activity.completed).toBe(false);

      // Toggle to completed
      await useTripStore.getState().toggleActivity(activity.id);
      let tripState = useTripStore.getState().trips.find((t) => t.id === trip.id);
      expect(tripState?.activities[0].completed).toBe(true);

      let inDb = await db.activities.get(activity.id);
      expect(inDb?.completed).toBe(true);

      // Toggle back to not completed
      await useTripStore.getState().toggleActivity(activity.id);
      tripState = useTripStore.getState().trips.find((t) => t.id === trip.id);
      expect(tripState?.activities[0].completed).toBe(false);

      inDb = await db.activities.get(activity.id);
      expect(inDb?.completed).toBe(false);
    });

    it('deletes an activity from trip and Dexie', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);
      const activity = await useTripStore.getState().addActivity(trip.id, {
        title: 'Nijo Castle',
        dayIndex: 3,
      });

      await useTripStore.getState().deleteActivity(activity.id);

      const tripState = useTripStore.getState().trips.find((t) => t.id === trip.id);
      expect(tripState?.activities).toHaveLength(0);

      const inDb = await db.activities.get(activity.id);
      expect(inDb).toBeUndefined();
    });
  });

  describe('Trip Loading and Filtering', () => {
    it('loads trips and activities correctly from Dexie', async () => {
      const trip = await useTripStore.getState().addTrip(validTripData);
      await useTripStore.getState().addActivity(trip.id, {
        title: 'Gion Evening Stroll',
        dayIndex: 1,
        time: '18:00',
      });

      // Clear Zustand in-memory state
      useTripStore.setState({ trips: [] });
      expect(useTripStore.getState().trips).toHaveLength(0);

      // Call loadTrips
      await useTripStore.getState().loadTrips();

      const trips = useTripStore.getState().trips;
      expect(trips).toHaveLength(1);
      expect(trips[0].id).toBe(trip.id);
      expect(trips[0].activities).toHaveLength(1);
      expect(trips[0].activities[0].title).toBe('Gion Evening Stroll');
    });

    it('filters trips by status and search query', async () => {
      await useTripStore.getState().addTrip({
        ...validTripData,
        title: 'Alps Hiking',
        destination: 'Zermatt, Switzerland',
        status: 'active',
      });

      await useTripStore.getState().addTrip({
        ...validTripData,
        title: 'Tokyo Street Food',
        destination: 'Tokyo, Japan',
        status: 'planned',
      });

      expect(useTripStore.getState().getFilteredTrips()).toHaveLength(2);

      // Filter by status 'active'
      useTripStore.getState().setStatusFilter('active');
      let filtered = useTripStore.getState().getFilteredTrips();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Alps Hiking');

      // Search query
      useTripStore.getState().setStatusFilter('all');
      useTripStore.getState().setSearchQuery('Tokyo');
      filtered = useTripStore.getState().getFilteredTrips();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].destination).toBe('Tokyo, Japan');
    });
  });
});

import { create } from 'zustand';
import { db } from '../services/db';
import type { Trip, Activity } from '../types';

export type TripStatusFilter = 'all' | 'planned' | 'active' | 'completed' | 'cancelled';

export interface TripFormData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelType: Trip['travelType'];
  status?: Trip['status'];
  notes?: string;
  totalBudget?: number;
  budgetCurrency?: string;
}

export interface ActivityFormData {
  title: string;
  dayIndex: number;
  date?: string;
  time?: string;
  location?: string;
  notes?: string;
}

export interface TripStoreState {
  trips: Trip[];
  activeTripId: string | null;
  isLoading: boolean;
  error: string | null;
  statusFilter: TripStatusFilter;
  searchQuery: string;

  // Actions
  loadTrips: () => Promise<void>;
  setActiveTrip: (tripId: string | null) => void;
  setStatusFilter: (filter: TripStatusFilter) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  addTrip: (data: TripFormData) => Promise<Trip>;
  updateTrip: (id: string, updates: Partial<TripFormData>) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;

  addActivity: (tripId: string, activityData: ActivityFormData) => Promise<Activity>;
  toggleActivity: (activityId: string) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;

  // Derived helpers
  getActiveTrip: () => Trip | undefined;
  getFilteredTrips: () => Trip[];
}

function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useTripStore = create<TripStoreState>((set, get) => ({
  trips: [],
  activeTripId: null,
  isLoading: false,
  error: null,
  statusFilter: 'all',
  searchQuery: '',

  loadTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      const storedTrips = await db.trips.toArray();
      const storedActivities = await db.activities.toArray();

      const activitiesByTrip = new Map<string, Activity[]>();
      for (const act of storedActivities) {
        const list = activitiesByTrip.get(act.tripId) || [];
        list.push(act);
        activitiesByTrip.set(act.tripId, list);
      }

      const populatedTrips: Trip[] = storedTrips.map((trip) => {
        const dbActs = activitiesByTrip.get(trip.id);
        const tripActs = dbActs && dbActs.length > 0 ? dbActs : (trip.activities || []);
        // Sort activities by dayIndex, then time
        const sortedActs = [...tripActs].sort((a, b) => {
          if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
          return (a.time || '').localeCompare(b.time || '');
        });

        return {
          ...trip,
          activities: sortedActs,
        };
      });

      // Sort trips by startDate descending (newest / upcoming first)
      populatedTrips.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      set({ trips: populatedTrips, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trips';
      set({ error: message, isLoading: false });
    }
  },

  setActiveTrip: (tripId) => {
    set({ activeTripId: tripId });
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  clearError: () => {
    set({ error: null });
  },

  addTrip: async (data: TripFormData) => {
    if (!data.destination || !data.destination.trim()) {
      const err = new Error('Destination is required');
      set({ error: err.message });
      throw err;
    }

    if (!data.title || !data.title.trim()) {
      const err = new Error('Title is required');
      set({ error: err.message });
      throw err;
    }

    if (!data.startDate) {
      const err = new Error('Start date is required');
      set({ error: err.message });
      throw err;
    }

    if (!data.endDate) {
      const err = new Error('End date is required');
      set({ error: err.message });
      throw err;
    }

    if (new Date(data.endDate) < new Date(data.startDate)) {
      const err = new Error('End date cannot be earlier than start date');
      set({ error: err.message });
      throw err;
    }

    const validTravelTypes: Trip['travelType'][] = [
      'solo',
      'family',
      'business',
      'leisure',
      'adventure',
      'backpacking',
    ];
    if (!data.travelType || !validTravelTypes.includes(data.travelType)) {
      const err = new Error('A valid travel type is required');
      set({ error: err.message });
      throw err;
    }

    if (data.totalBudget !== undefined && data.totalBudget !== null && data.totalBudget < 0) {
      const err = new Error('Budget cannot be negative');
      set({ error: err.message });
      throw err;
    }

    const now = new Date().toISOString();
    const newTrip: Trip = {
      id: generateId('trip'),
      title: data.title.trim(),
      destination: data.destination.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      travelType: data.travelType,
      status: data.status || 'planned',
      notes: data.notes?.trim() || undefined,
      totalBudget: data.totalBudget !== undefined && data.totalBudget !== null ? Number(data.totalBudget) : undefined,
      budgetCurrency: data.budgetCurrency || 'USD',
      activities: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.trips.add(newTrip);
      set((state) => ({
        trips: [newTrip, ...state.trips],
        error: null,
      }));
      return newTrip;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save trip to database';
      set({ error: message });
      throw err;
    }
  },

  updateTrip: async (id: string, updates: Partial<TripFormData>) => {
    const existing = get().trips.find((t) => t.id === id);
    if (!existing) {
      const err = new Error(`Trip with id ${id} not found`);
      set({ error: err.message });
      throw err;
    }

    if (updates.destination !== undefined && !updates.destination.trim()) {
      const err = new Error('Destination is required');
      set({ error: err.message });
      throw err;
    }

    if (updates.title !== undefined && !updates.title.trim()) {
      const err = new Error('Title is required');
      set({ error: err.message });
      throw err;
    }

    const newStart = updates.startDate ?? existing.startDate;
    const newEnd = updates.endDate ?? existing.endDate;
    if (new Date(newEnd) < new Date(newStart)) {
      const err = new Error('End date cannot be earlier than start date');
      set({ error: err.message });
      throw err;
    }

    if (updates.totalBudget !== undefined && updates.totalBudget !== null && updates.totalBudget < 0) {
      const err = new Error('Budget cannot be negative');
      set({ error: err.message });
      throw err;
    }

    const now = new Date().toISOString();
    const updatedTrip: Trip = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      destination: updates.destination !== undefined ? updates.destination.trim() : existing.destination,
      notes: updates.notes !== undefined ? (updates.notes.trim() || undefined) : existing.notes,
      totalBudget:
        updates.totalBudget !== undefined && updates.totalBudget !== null
          ? Number(updates.totalBudget)
          : existing.totalBudget,
      updatedAt: now,
    };

    try {
      await db.trips.put(updatedTrip);
      set((state) => ({
        trips: state.trips.map((t) => (t.id === id ? updatedTrip : t)),
        error: null,
      }));
      return updatedTrip;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update trip';
      set({ error: message });
      throw err;
    }
  },

  deleteTrip: async (id: string) => {
    try {
      await db.trips.delete(id);
      await db.activities.where('tripId').equals(id).delete();

      set((state) => ({
        trips: state.trips.filter((t) => t.id !== id),
        activeTripId: state.activeTripId === id ? null : state.activeTripId,
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete trip';
      set({ error: message });
      throw err;
    }
  },

  addActivity: async (tripId: string, activityData: ActivityFormData) => {
    const trip = get().trips.find((t) => t.id === tripId);
    if (!trip) {
      const err = new Error(`Trip with id ${tripId} not found`);
      set({ error: err.message });
      throw err;
    }

    if (!activityData.title || !activityData.title.trim()) {
      const err = new Error('Activity title is required');
      set({ error: err.message });
      throw err;
    }

    const dayIndex = Number(activityData.dayIndex);
    if (isNaN(dayIndex) || dayIndex < 1) {
      const err = new Error('Day number must be at least 1');
      set({ error: err.message });
      throw err;
    }

    const newActivity: Activity = {
      id: generateId('act'),
      tripId,
      dayIndex,
      date: activityData.date,
      time: activityData.time?.trim() || undefined,
      title: activityData.title.trim(),
      location: activityData.location?.trim() || undefined,
      notes: activityData.notes?.trim() || undefined,
      completed: false,
    };

    try {
      await db.activities.add(newActivity);

      const updatedActivities = [...trip.activities, newActivity].sort((a, b) => {
        if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
        return (a.time || '').localeCompare(b.time || '');
      });

      const now = new Date().toISOString();
      await db.trips.update(tripId, {
        activities: updatedActivities,
        updatedAt: now,
      });

      set((state) => ({
        trips: state.trips.map((t) =>
          t.id === tripId
            ? { ...t, activities: updatedActivities, updatedAt: now }
            : t
        ),
        error: null,
      }));

      return newActivity;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add activity';
      set({ error: message });
      throw err;
    }
  },

  toggleActivity: async (activityId: string) => {
    try {
      // Find activity in store
      let targetActivity: Activity | undefined;
      let targetTripId: string | undefined;

      for (const trip of get().trips) {
        const found = trip.activities.find((a) => a.id === activityId);
        if (found) {
          targetActivity = found;
          targetTripId = trip.id;
          break;
        }
      }

      if (!targetActivity || !targetTripId) {
        // Fallback to checking db
        targetActivity = await db.activities.get(activityId);
        if (!targetActivity) {
          throw new Error(`Activity with id ${activityId} not found`);
        }
        targetTripId = targetActivity.tripId;
      }

      const nextCompleted = !targetActivity.completed;

      await db.activities.update(activityId, { completed: nextCompleted });

      const currentTrip = get().trips.find((t) => t.id === targetTripId);
      if (currentTrip) {
        const updatedActivities = currentTrip.activities.map((a) =>
          a.id === activityId ? { ...a, completed: nextCompleted } : a
        );
        const now = new Date().toISOString();
        await db.trips.update(targetTripId, {
          activities: updatedActivities,
          updatedAt: now,
        });

        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === targetTripId
              ? { ...t, activities: updatedActivities, updatedAt: now }
              : t
          ),
          error: null,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update activity status';
      set({ error: message });
      throw err;
    }
  },

  deleteActivity: async (activityId: string) => {
    try {
      let targetTripId: string | undefined;
      for (const trip of get().trips) {
        if (trip.activities.some((a) => a.id === activityId)) {
          targetTripId = trip.id;
          break;
        }
      }

      await db.activities.delete(activityId);

      if (targetTripId) {
        const currentTrip = get().trips.find((t) => t.id === targetTripId);
        if (currentTrip) {
          const updatedActivities = currentTrip.activities.filter((a) => a.id !== activityId);
          const now = new Date().toISOString();
          await db.trips.update(targetTripId, {
            activities: updatedActivities,
            updatedAt: now,
          });

          set((state) => ({
            trips: state.trips.map((t) =>
              t.id === targetTripId
                ? { ...t, activities: updatedActivities, updatedAt: now }
                : t
            ),
            error: null,
          }));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete activity';
      set({ error: message });
      throw err;
    }
  },

  getActiveTrip: () => {
    const { trips, activeTripId } = get();
    if (!activeTripId) return undefined;
    return trips.find((t) => t.id === activeTripId);
  },

  getFilteredTrips: () => {
    const { trips, statusFilter, searchQuery } = get();
    return trips.filter((trip) => {
      // Status filter
      if (statusFilter !== 'all' && trip.status !== statusFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDestination = trip.destination.toLowerCase().includes(query);
        const matchesTitle = trip.title.toLowerCase().includes(query);
        const matchesTravelType = trip.travelType.toLowerCase().includes(query);
        return matchesDestination || matchesTitle || matchesTravelType;
      }
      return true;
    });
  },
}));

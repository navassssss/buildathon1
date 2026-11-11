import { db } from '../db';
import type { Trip, Activity } from '../../types';

/**
 * Local-only typed mock API service.
 * Simulates REST endpoints for trips and activities while persisting to Dexie IndexedDB.
 * Zero external network calls.
 */
export const mockApi = {
  // Trips endpoints
  async getTrips(): Promise<Trip[]> {
    return await db.trips.toArray();
  },

  async getTripById(id: string): Promise<Trip | undefined> {
    return await db.trips.get(id);
  },

  async createTrip(trip: Trip): Promise<Trip> {
    await db.trips.add(trip);
    return trip;
  },

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const existing = await db.trips.get(id);
    if (!existing) {
      throw new Error(`Trip ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.trips.put(updated);
    return updated;
  },

  async deleteTrip(id: string): Promise<void> {
    await db.trips.delete(id);
    await db.activities.where('tripId').equals(id).delete();
  },

  // Activities endpoints
  async getActivities(tripId: string): Promise<Activity[]> {
    return await db.activities.where('tripId').equals(tripId).toArray();
  },

  async addActivity(activity: Activity): Promise<Activity> {
    await db.activities.add(activity);
    return activity;
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
    const existing = await db.activities.get(id);
    if (!existing) {
      throw new Error(`Activity ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await db.activities.put(updated);
    return updated;
  },

  async deleteActivity(id: string): Promise<void> {
    await db.activities.delete(id);
  },
};

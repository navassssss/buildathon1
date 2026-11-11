import { create } from 'zustand';
import { db } from '../services/db';
import type { ChecklistItem, Trip } from '../types';
import {
  generateSuggestedPackingItems,
  type WeatherType,
  type PackingRuleInput,
} from '../utils/packingGenerator';

export interface PackingStoreState {
  items: ChecklistItem[];
  currentTripId: string | null;
  destination: string;
  weather: WeatherType;
  durationDays: number;
  travelType: Trip['travelType'];
  filterCategory: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadItems: (tripId?: string) => Promise<void>;
  generateChecklist: (params: PackingRuleInput) => Promise<void>;
  addItem: (item: Omit<ChecklistItem, 'id'>) => Promise<ChecklistItem>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAll: (tripId?: string) => Promise<void>;
  setFilterCategory: (category: string) => void;
  setWeather: (weather: WeatherType) => void;
  setDestination: (dest: string) => void;
  setDurationDays: (days: number) => void;
  setTravelType: (type: Trip['travelType']) => void;
  clearError: () => void;

  // Derived helpers
  getFilteredItems: () => ChecklistItem[];
  getPackedCount: () => number;
  getTotalCount: () => number;
  getProgressPercent: () => number;
}

function generateId(prefix: string = 'chk'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const usePackingStore = create<PackingStoreState>((set, get) => ({
  items: [],
  currentTripId: null,
  destination: '',
  weather: 'mild',
  durationDays: 5,
  travelType: 'leisure',
  filterCategory: 'all',
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  setFilterCategory: (category) => set({ filterCategory: category }),
  setWeather: (weather) => set({ weather }),
  setDestination: (dest) => set({ destination: dest }),
  setDurationDays: (days) => set({ durationDays: Math.max(1, days) }),
  setTravelType: (type) => set({ travelType: type }),

  loadItems: async (tripId) => {
    set({ isLoading: true, error: null, currentTripId: tripId || null });
    try {
      let storedItems: ChecklistItem[];
      if (tripId) {
        storedItems = await db.checklists.where('tripId').equals(tripId).toArray();
      } else {
        // Load generic items (no tripId or empty tripId)
        storedItems = await db.checklists.toArray();
      }
      set({ items: storedItems, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load packing items';
      set({ error: msg, isLoading: false });
    }
  },

  generateChecklist: async (params: PackingRuleInput) => {
    set({
      isLoading: true,
      error: null,
      destination: params.destination,
      weather: params.weather,
      durationDays: params.durationDays,
      travelType: params.travelType,
      currentTripId: params.tripId || null,
    });

    try {
      const generated = generateSuggestedPackingItems(params);

      // Preserve existing custom or user-modified packed states if same trip
      const existing = await (params.tripId
        ? db.checklists.where('tripId').equals(params.tripId).toArray()
        : db.checklists.toArray());

      const userItems = existing.filter((item) => item.suggestedBy === 'user');
      const packedMap = new Map(existing.map((item) => [item.title.toLowerCase(), item.isPacked]));

      // Apply previous packed status if items matched
      const mergedGenerated = generated.map((gen) => ({
        ...gen,
        isPacked: packedMap.get(gen.title.toLowerCase()) || false,
      }));

      const finalItems = [...mergedGenerated, ...userItems];

      // Replace items in database
      if (params.tripId) {
        await db.checklists.where('tripId').equals(params.tripId).delete();
      } else {
        await db.checklists.clear();
      }
      await db.checklists.bulkAdd(finalItems);

      set({ items: finalItems, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate checklist';
      set({ error: msg, isLoading: false });
    }
  },

  addItem: async (itemData) => {
    if (!itemData.title || !itemData.title.trim()) {
      const err = new Error('Item name is required');
      set({ error: err.message });
      throw err;
    }

    const newItem: ChecklistItem = {
      id: generateId(),
      tripId: itemData.tripId || get().currentTripId || undefined,
      category: itemData.category || 'custom',
      title: itemData.title.trim(),
      isPacked: Boolean(itemData.isPacked),
      quantity: itemData.quantity || 1,
      notes: itemData.notes?.trim() || undefined,
      suggestedBy: itemData.suggestedBy || 'user',
    };

    try {
      await db.checklists.add(newItem);
      set((state) => ({
        items: [newItem, ...state.items],
        error: null,
      }));
      return newItem;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add packing item';
      set({ error: msg });
      throw err;
    }
  },

  toggleItem: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    const nextPacked = !item.isPacked;
    try {
      await db.checklists.update(id, { isPacked: nextPacked });
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, isPacked: nextPacked } : i)),
        error: null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update item';
      set({ error: msg });
      throw err;
    }
  },

  deleteItem: async (id: string) => {
    try {
      await db.checklists.delete(id);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        error: null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete item';
      set({ error: msg });
      throw err;
    }
  },

  clearAll: async (tripId) => {
    try {
      if (tripId) {
        await db.checklists.where('tripId').equals(tripId).delete();
      } else {
        await db.checklists.clear();
      }
      set({ items: [], error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clear checklist';
      set({ error: msg });
      throw err;
    }
  },

  getFilteredItems: () => {
    const { items, filterCategory } = get();
    if (filterCategory === 'all') return items;
    return items.filter((item) => item.category === filterCategory);
  },

  getPackedCount: () => {
    return get().items.filter((i) => i.isPacked).length;
  },

  getTotalCount: () => {
    return get().items.length;
  },

  getProgressPercent: () => {
    const total = get().items.length;
    if (total === 0) return 0;
    return Math.round((get().items.filter((i) => i.isPacked).length / total) * 100);
  },
}));

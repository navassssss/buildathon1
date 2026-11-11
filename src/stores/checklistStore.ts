import { create } from 'zustand';
import { db } from '../services/db';
import type { ChecklistItem, Trip } from '../types';

export type WeatherCondition = 'sunny' | 'cold' | 'rainy' | 'snow';

export interface GenerateChecklistParams {
  destination: string;
  weather: WeatherCondition;
  duration: number; // days, e.g. 1-30
  travelType: Trip['travelType'];
  tripId?: string;
}

export interface ChecklistProgress {
  total: number;
  packed: number;
  percentage: number;
}

export interface ChecklistStoreState {
  items: ChecklistItem[];
  activeTripId?: string;
  isLoading: boolean;
  error: string | null;
  categoryFilter: ChecklistItem['category'] | 'all';
  packedFilter: 'all' | 'packed' | 'unpacked';
  searchQuery: string;
  lastParams?: GenerateChecklistParams;

  // Actions
  loadItems: (tripId?: string) => Promise<void>;
  generateChecklist: (params: GenerateChecklistParams) => Promise<ChecklistItem[]>;
  addItem: (item: Omit<ChecklistItem, 'id'>) => Promise<ChecklistItem>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearChecklist: (tripId?: string) => Promise<void>;
  resetToSuggestions: (params: GenerateChecklistParams) => Promise<ChecklistItem[]>;

  // Filters & State setters
  setActiveTripId: (tripId?: string) => void;
  setCategoryFilter: (category: ChecklistItem['category'] | 'all') => void;
  setPackedFilter: (status: 'all' | 'packed' | 'unpacked') => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  // Selectors
  getFilteredItems: () => ChecklistItem[];
  getPackingProgress: () => ChecklistProgress;
  getItemsByCategory: () => Record<ChecklistItem['category'], ChecklistItem[]>;
}

function generateId(prefix: string = 'chk'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function buildRecommendedItems(params: GenerateChecklistParams): Omit<ChecklistItem, 'id'>[] {
  const { destination, weather, duration, travelType, tripId } = params;
  const d = Math.max(1, Math.min(duration, 30));
  const items: Omit<ChecklistItem, 'id'>[] = [];

  // Helper to add item
  const add = (
    title: string,
    category: ChecklistItem['category'],
    suggestedBy: ChecklistItem['suggestedBy'],
    quantity: number = 1,
    notes?: string
  ) => {
    items.push({
      tripId,
      title,
      category,
      suggestedBy,
      quantity,
      isPacked: false,
      notes,
    });
  };

  // 1. Mandatory Essentials & Documents
  add('Passport / Government ID', 'documents', 'destination', 1, 'Ensure at least 6 months validity');
  add('Flight / Transit Tickets & Boarding Passes', 'documents', 'destination', 1);
  add('Hotel & Accommodation Bookings', 'documents', 'destination', 1);
  add('Travel Insurance Policy', 'documents', 'destination', 1);

  add('Wallet, Credit / Debit Cards & Local Cash', 'essentials', 'destination', 1, `Cash for ${destination}`);
  add('House & Luggage Keys', 'essentials', 'user', 1);

  add('Smartphone & Charging Cable', 'electronics', 'destination', 1);
  add('Portable Power Bank (10,000mAh+)', 'electronics', 'duration', 1);

  add('Toothbrush & Toothpaste', 'toiletries', 'duration', 1);
  add('Travel Shampoo & Body Wash', 'toiletries', 'duration', 1);
  add('Deodorant', 'toiletries', 'duration', 1);

  add('Personal Prescription Medications', 'health', 'destination', 1);
  add('Basic First-Aid & Pain Relievers', 'health', 'destination', 1);

  // 2. Scaled Clothing based on Duration
  const underwearQty = Math.min(d + 1, 14);
  const socksQty = Math.min(d + 1, 14);
  const topsQty = Math.min(Math.max(2, Math.ceil(d * 0.8)), 10);
  const bottomsQty = Math.min(Math.max(1, Math.ceil(d / 3) + 1), 5);
  const sleepwearQty = Math.min(Math.max(1, Math.ceil(d / 4)), 3);

  add('Underwear', 'clothing', 'duration', underwearQty);
  add('Socks', 'clothing', 'duration', socksQty);
  add('T-Shirts / Tops', 'clothing', 'duration', topsQty);
  add('Pants / Shorts / Bottoms', 'clothing', 'duration', bottomsQty);
  add('Sleepwear / Pajamas', 'clothing', 'duration', sleepwearQty);
  add('Comfortable Everyday Walking Shoes', 'clothing', 'duration', 1);

  // 3. Weather-Specific Recommendations
  switch (weather) {
    case 'sunny':
      add('Sunglasses (UV400 Protection)', 'clothing', 'weather', 1);
      add('Sunscreen Lotion (SPF 50+)', 'toiletries', 'weather', 1);
      add('Sun Hat / Baseball Cap', 'clothing', 'weather', 1);
      add('UV-Protective Lightweight Shirt', 'clothing', 'weather', 1);
      add('Swimwear & Quick-Dry Beach Towel', 'clothing', 'weather', 1);
      add('Soothing Aloe Vera / After-Sun Gel', 'toiletries', 'weather', 1);
      break;

    case 'cold':
      add('Thermal Base Layer Underwear', 'clothing', 'weather', Math.min(Math.ceil(d / 2), 4));
      add('Heavy Insulated Winter Coat / Parka', 'clothing', 'weather', 1);
      add('Knit Beanie / Wool Hat', 'clothing', 'weather', 1);
      add('Insulated Gloves / Mittens', 'clothing', 'weather', 1);
      add('Warm Fleece or Wool Scarf', 'clothing', 'weather', 1);
      add('Moisturizing Lip Balm & Cold Cream', 'toiletries', 'weather', 1);
      break;

    case 'rainy':
      add('Waterproof Rain Jacket / Windbreaker', 'clothing', 'weather', 1);
      add('Compact Windproof Umbrella', 'essentials', 'weather', 1);
      add('Waterproof Phone Pouch / Dry Bag', 'electronics', 'weather', 1);
      add('Quick-Dry Pants / Shirts', 'clothing', 'weather', 2);
      add('Extra Synthetic / Wool Socks', 'clothing', 'weather', 2);
      add('Waterproof Walking Shoes / Boots', 'clothing', 'weather', 1);
      break;

    case 'snow':
      add('Thermal Base Layer (Top & Bottom)', 'clothing', 'weather', Math.min(Math.ceil(d / 2), 4));
      add('Insulated Waterproof Snow Boots', 'clothing', 'weather', 1);
      add('Heavy Down Jacket & Snow Pants', 'clothing', 'weather', 1);
      add('Waterproof Winter Gloves / Ski Mitts', 'clothing', 'weather', 1);
      add('Chemical Hand & Toe Warmers', 'health', 'weather', Math.min(d * 2, 8));
      add('Snow Goggles / Polarized Sunglasses', 'clothing', 'weather', 1);
      break;
  }

  // 4. Travel Type-Specific Recommendations
  switch (travelType) {
    case 'adventure':
      add('Sturdy Hiking Boots (Broken-in)', 'clothing', 'travel_type', 1);
      add('Portable First-Aid Kit with Blister Care', 'health', 'travel_type', 1);
      add('LED Headlamp / Flashlight', 'electronics', 'travel_type', 1);
      add('Reusable Insulated Water Bottle', 'essentials', 'travel_type', 1);
      add('Multi-tool / Pocket Knife', 'essentials', 'travel_type', 1);
      add('Insect Repellent Spray', 'health', 'travel_type', 1);
      break;

    case 'business':
      add('Business Suit / Formal Blazer', 'clothing', 'travel_type', Math.min(Math.ceil(d / 2), 3));
      add('Wrinkle-Free Formal Shirts / Blouses', 'clothing', 'travel_type', Math.min(d, 5));
      add('Laptop, Charger & Wireless Mouse', 'electronics', 'travel_type', 1);
      add('HDMI / USB-C Presentation Adapter', 'electronics', 'travel_type', 1);
      add('Business Cards & Card Holder', 'essentials', 'travel_type', 1);
      add('Notebook & Professional Pen', 'essentials', 'travel_type', 1);
      break;

    case 'family':
      add('Healthy Travel Snacks for Kids', 'essentials', 'travel_type', 2);
      add('Family First-Aid Kit & Kids Medication', 'health', 'travel_type', 1);
      add('Kids Tablet with Downloaded Media & Headphones', 'electronics', 'travel_type', 1);
      add('Antibacterial Wet Wipes & Tissues', 'toiletries', 'travel_type', 2);
      add('Kids Emergency Contact Wristbands / Tags', 'documents', 'travel_type', 1);
      break;

    case 'backpacking':
      add('Quick-Dry Microfiber Towel', 'essentials', 'travel_type', 1);
      add('Universal International Plug Adapter', 'electronics', 'travel_type', 1);
      add('Luggage Padlock (TSA Approved)', 'essentials', 'travel_type', 1);
      add('Compression Dry Sacks / Packing Cubes', 'essentials', 'travel_type', 1);
      add('Compact Hanging Toiletry Bag', 'toiletries', 'travel_type', 1);
      break;

    case 'solo':
      add('Personal Safety Alarm / Whistle', 'essentials', 'travel_type', 1);
      add('Paper Emergency Contacts List', 'documents', 'travel_type', 1);
      add('Noise-Cancelling Earplugs & Sleep Mask', 'essentials', 'travel_type', 1);
      break;

    case 'leisure':
      add('Comfortable Daypack / Tote Bag', 'essentials', 'travel_type', 1);
      add('E-Reader / Paperback Book', 'electronics', 'travel_type', 1);
      add('Comfortable Slip-on Shoes', 'clothing', 'travel_type', 1);
      break;
  }

  return items;
}

export const useChecklistStore = create<ChecklistStoreState>((set, get) => ({
  items: [],
  activeTripId: undefined,
  isLoading: false,
  error: null,
  categoryFilter: 'all',
  packedFilter: 'all',
  searchQuery: '',
  lastParams: undefined,

  loadItems: async (tripId?: string) => {
    set({ isLoading: true, error: null, activeTripId: tripId });
    try {
      let storedItems: ChecklistItem[] = [];
      if (tripId) {
        storedItems = await db.checklists.where('tripId').equals(tripId).toArray();
      } else {
        storedItems = await db.checklists.toArray();
      }

      set({ items: storedItems, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load checklist items';
      set({ error: msg, isLoading: false });
    }
  },

  generateChecklist: async (params: GenerateChecklistParams) => {
    if (!params.destination || !params.destination.trim()) {
      const err = new Error('Destination is required to generate checklist');
      set({ error: err.message });
      throw err;
    }

    if (!params.weather) {
      const err = new Error('Weather condition is required');
      set({ error: err.message });
      throw err;
    }

    const duration = Math.max(1, Math.min(params.duration || 1, 30));
    const normalizedParams: GenerateChecklistParams = {
      ...params,
      destination: params.destination.trim(),
      duration,
    };

    set({ isLoading: true, error: null, lastParams: normalizedParams, activeTripId: params.tripId });

    try {
      // Clear existing items for this tripId if present
      if (params.tripId) {
        await db.checklists.where('tripId').equals(params.tripId).delete();
      } else {
        // standalone checklist without tripId
        await db.checklists.filter((item) => !item.tripId).delete();
      }

      const rawItems = buildRecommendedItems(normalizedParams);
      const newItems: ChecklistItem[] = rawItems.map((item) => ({
        ...item,
        id: generateId('chk'),
      }));

      await db.checklists.bulkAdd(newItems);

      // If activeTripId matches, replace state items
      set((state) => {
        const otherItems = params.tripId
          ? state.items.filter((i) => i.tripId !== params.tripId)
          : state.items.filter((i) => !!i.tripId);
        return {
          items: [...otherItems, ...newItems],
          isLoading: false,
          error: null,
        };
      });

      return newItems;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate checklist';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  addItem: async (itemData: Omit<ChecklistItem, 'id'>) => {
    if (!itemData.title || !itemData.title.trim()) {
      const err = new Error('Item title is required');
      set({ error: err.message });
      throw err;
    }

    const newItem: ChecklistItem = {
      ...itemData,
      id: generateId('item'),
      title: itemData.title.trim(),
      quantity: Math.max(1, itemData.quantity || 1),
      isPacked: !!itemData.isPacked,
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
      const msg = err instanceof Error ? err.message : 'Failed to add checklist item';
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
      const msg = err instanceof Error ? err.message : 'Failed to toggle item';
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

  clearChecklist: async (tripId?: string) => {
    try {
      if (tripId) {
        await db.checklists.where('tripId').equals(tripId).delete();
        set((state) => ({
          items: state.items.filter((i) => i.tripId !== tripId),
          error: null,
        }));
      } else {
        await db.checklists.clear();
        set({ items: [], error: null });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clear checklist';
      set({ error: msg });
      throw err;
    }
  },

  resetToSuggestions: async (params: GenerateChecklistParams) => {
    return get().generateChecklist(params);
  },

  setActiveTripId: (tripId?: string) => {
    set({ activeTripId: tripId });
    get().loadItems(tripId);
  },

  setCategoryFilter: (category) => {
    set({ categoryFilter: category });
  },

  setPackedFilter: (status) => {
    set({ packedFilter: status });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  clearError: () => {
    set({ error: null });
  },

  getFilteredItems: () => {
    const { items, activeTripId, categoryFilter, packedFilter, searchQuery } = get();

    return items.filter((item) => {
      // Scope by activeTripId if set
      if (activeTripId && item.tripId !== activeTripId) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      // Packed status filter
      if (packedFilter === 'packed' && !item.isPacked) {
        return false;
      }
      if (packedFilter === 'unpacked' && item.isPacked) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        return matchesTitle || matchesNotes || matchesCategory;
      }

      return true;
    });
  },

  getPackingProgress: () => {
    const { items, activeTripId } = get();
    const relevantItems = activeTripId
      ? items.filter((i) => i.tripId === activeTripId)
      : items;

    const total = relevantItems.length;
    const packed = relevantItems.filter((i) => i.isPacked).length;
    const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;

    return { total, packed, percentage };
  },

  getItemsByCategory: () => {
    const filtered = get().getFilteredItems();
    const grouped: Record<ChecklistItem['category'], ChecklistItem[]> = {
      essentials: [],
      clothing: [],
      electronics: [],
      documents: [],
      health: [],
      toiletries: [],
      custom: [],
    };

    for (const item of filtered) {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      } else {
        grouped.custom.push(item);
      }
    }

    return grouped;
  },
}));

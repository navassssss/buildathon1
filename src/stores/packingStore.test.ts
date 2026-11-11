import { describe, it, expect, beforeEach } from 'vitest';
import { usePackingStore } from './packingStore';
import { generateSuggestedPackingItems } from '../utils/packingGenerator';
import { db } from '../services/db';

describe('Smart Packing Checklist (T-002: F-SMPK-001)', () => {
  beforeEach(async () => {
    await db.checklists.clear();
    usePackingStore.setState({
      items: [],
      currentTripId: null,
      destination: '',
      weather: 'mild',
      durationDays: 5,
      travelType: 'leisure',
      filterCategory: 'all',
      isLoading: false,
      error: null,
    });
  });

  describe('Item Generation Logic (Generator)', () => {
    it('generates cold weather gear when weather is cold or snowy', () => {
      const coldItems = generateSuggestedPackingItems({
        destination: 'Reykjavik, Iceland',
        weather: 'cold',
        durationDays: 4,
        travelType: 'leisure',
      });

      const titles = coldItems.map((i) => i.title.toLowerCase());
      expect(titles.some((t) => t.includes('thermal base layers'))).toBe(true);
      expect(titles.some((t) => t.includes('heavy insulated coat'))).toBe(true);
      expect(titles.some((t) => t.includes('waterproof insulated gloves'))).toBe(true);
    });

    it('generates hot weather and sun gear when weather is hot or sunny', () => {
      const hotItems = generateSuggestedPackingItems({
        destination: 'Phuket, Thailand',
        weather: 'hot',
        durationDays: 5,
        travelType: 'leisure',
      });

      const titles = hotItems.map((i) => i.title.toLowerCase());
      expect(titles.some((t) => t.includes('sunscreen'))).toBe(true);
      expect(titles.some((t) => t.includes('swimwear'))).toBe(true);
      expect(titles.some((t) => t.includes('sunglasses'))).toBe(true);
      expect(titles.some((t) => t.includes('insect / mosquito repellent'))).toBe(true);
    });

    it('generates rain gear when weather is rainy', () => {
      const rainyItems = generateSuggestedPackingItems({
        destination: 'London, UK',
        weather: 'rainy',
        durationDays: 3,
        travelType: 'solo',
      });

      const titles = rainyItems.map((i) => i.title.toLowerCase());
      expect(titles.some((t) => t.includes('umbrella'))).toBe(true);
      expect(titles.some((t) => t.includes('waterproof rain jacket'))).toBe(true);
    });

    it('re-evaluates items based on travel type (business vs adventure)', () => {
      const businessItems = generateSuggestedPackingItems({
        destination: 'Frankfurt, Germany',
        weather: 'mild',
        durationDays: 3,
        travelType: 'business',
      });
      const businessTitles = businessItems.map((i) => i.title.toLowerCase());
      expect(businessTitles.some((t) => t.includes('business suit') || t.includes('blazer'))).toBe(true);
      expect(businessTitles.some((t) => t.includes('laptop'))).toBe(true);

      const adventureItems = generateSuggestedPackingItems({
        destination: 'Patagonia, Chile',
        weather: 'cold',
        durationDays: 7,
        travelType: 'adventure',
      });
      const adventureTitles = adventureItems.map((i) => i.title.toLowerCase());
      expect(adventureTitles.some((t) => t.includes('hiking boots'))).toBe(true);
      expect(adventureTitles.some((t) => t.includes('headlamp'))).toBe(true);
      expect(adventureTitles.some((t) => t.includes('first aid kit'))).toBe(true);
    });

    it('includes destination-specific smart recommendations (e.g. Japan)', () => {
      const japanItems = generateSuggestedPackingItems({
        destination: 'Tokyo, Japan',
        weather: 'mild',
        durationDays: 6,
        travelType: 'solo',
      });

      const titles = japanItems.map((i) => i.title.toLowerCase());
      expect(titles.some((t) => t.includes('slip-on shoes'))).toBe(true);
      expect(titles.some((t) => t.includes('coin pouch'))).toBe(true);
    });
  });

  describe('Zustand Packing Store CRUD & Persistence', () => {
    it('generates and persists checklist items in Dexie', async () => {
      await usePackingStore.getState().generateChecklist({
        destination: 'Interlaken, Switzerland',
        weather: 'cold',
        durationDays: 5,
        travelType: 'adventure',
      });

      const storeItems = usePackingStore.getState().items;
      expect(storeItems.length).toBeGreaterThan(10);

      // Verify in Dexie
      const inDb = await db.checklists.toArray();
      expect(inDb.length).toBe(storeItems.length);
    });

    it('allows adding and removing custom items', async () => {
      const newItem = await usePackingStore.getState().addItem({
        title: 'Custom Travel Pillow',
        category: 'essentials',
        isPacked: false,
        quantity: 1,
        suggestedBy: 'user',
      });

      expect(newItem.id).toBeDefined();
      expect(usePackingStore.getState().items).toHaveLength(1);

      // Verify in Dexie
      const inDb = await db.checklists.get(newItem.id);
      expect(inDb?.title).toBe('Custom Travel Pillow');

      // Delete item
      await usePackingStore.getState().deleteItem(newItem.id);
      expect(usePackingStore.getState().items).toHaveLength(0);

      const afterDelete = await db.checklists.get(newItem.id);
      expect(afterDelete).toBeUndefined();
    });

    it('toggles item packed status and computes progress accurately', async () => {
      const item1 = await usePackingStore.getState().addItem({
        title: 'Passport',
        category: 'documents',
        isPacked: false,
        suggestedBy: 'destination',
      });

      const item2 = await usePackingStore.getState().addItem({
        title: 'Boarding pass',
        category: 'documents',
        isPacked: false,
        suggestedBy: 'destination',
      });

      expect(usePackingStore.getState().getPackedCount()).toBe(0);
      expect(usePackingStore.getState().getProgressPercent()).toBe(0);

      // Pack item 1
      await usePackingStore.getState().toggleItem(item1.id);

      expect(usePackingStore.getState().getPackedCount()).toBe(1);
      expect(usePackingStore.getState().getProgressPercent()).toBe(50);

      const inDb = await db.checklists.get(item1.id);
      expect(inDb?.isPacked).toBe(true);

      // Pack item 2
      await usePackingStore.getState().toggleItem(item2.id);
      expect(usePackingStore.getState().getPackedCount()).toBe(2);
      expect(usePackingStore.getState().getProgressPercent()).toBe(100);
    });

    it('filters items by category', async () => {
      await usePackingStore.getState().addItem({
        title: 'Shirt',
        category: 'clothing',
        isPacked: false,
      });

      await usePackingStore.getState().addItem({
        title: 'Charger',
        category: 'electronics',
        isPacked: false,
      });

      expect(usePackingStore.getState().getFilteredItems()).toHaveLength(2);

      usePackingStore.getState().setFilterCategory('clothing');
      const filtered = usePackingStore.getState().getFilteredItems();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Shirt');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useChecklistStore, type GenerateChecklistParams } from './checklistStore';
import { db } from '../services/db';

describe('Checklist Store (Zustand + Dexie + Smart Recommendation Engine)', () => {
  beforeEach(async () => {
    await db.checklists.clear();
    useChecklistStore.setState({
      items: [],
      activeTripId: undefined,
      isLoading: false,
      error: null,
      categoryFilter: 'all',
      packedFilter: 'all',
      searchQuery: '',
      lastParams: undefined,
    });
  });

  const baseParams: GenerateChecklistParams = {
    destination: 'Interlaken, Switzerland',
    weather: 'cold',
    duration: 5,
    travelType: 'adventure',
  };

  describe('Smart Recommendation Generation', () => {
    it('generates essential items and persists to Dexie', async () => {
      const items = await useChecklistStore.getState().generateChecklist(baseParams);

      expect(items.length).toBeGreaterThan(10);
      expect(useChecklistStore.getState().items).toHaveLength(items.length);

      // Verify in Dexie
      const persisted = await db.checklists.toArray();
      expect(persisted).toHaveLength(items.length);

      // Verify essential documents and toiletries
      expect(items.some((i) => i.title.includes('Passport'))).toBe(true);
      expect(items.some((i) => i.title.includes('Toothbrush'))).toBe(true);
      expect(items.some((i) => i.title.includes('Power Bank'))).toBe(true);
    });

    it('recommends sunny-specific gear when weather is sunny', async () => {
      const items = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        weather: 'sunny',
      });

      const titles = items.map((i) => i.title);
      expect(titles.some((t) => t.includes('Sunglasses'))).toBe(true);
      expect(titles.some((t) => t.includes('Sunscreen'))).toBe(true);
      expect(titles.some((t) => t.includes('Sun Hat'))).toBe(true);
      expect(titles.some((t) => t.includes('Swimwear'))).toBe(true);

      // Should not contain heavy winter coat
      expect(titles.some((t) => t.includes('Winter Coat'))).toBe(false);
    });

    it('recommends cold-specific clothing when weather is cold', async () => {
      const items = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        weather: 'cold',
      });

      const titles = items.map((i) => i.title);
      expect(titles.some((t) => t.includes('Winter Coat') || t.includes('Parka'))).toBe(true);
      expect(titles.some((t) => t.includes('Thermal Base Layer'))).toBe(true);
      expect(titles.some((t) => t.includes('Gloves'))).toBe(true);
      expect(titles.some((t) => t.includes('Scarf'))).toBe(true);
    });

    it('recommends rainy-specific gear when weather is rainy', async () => {
      const items = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        weather: 'rainy',
      });

      const titles = items.map((i) => i.title);
      expect(titles.some((t) => t.includes('Rain Jacket'))).toBe(true);
      expect(titles.some((t) => t.includes('Umbrella'))).toBe(true);
      expect(titles.some((t) => t.includes('Waterproof Phone Pouch'))).toBe(true);
    });

    it('recommends snow-specific gear when weather is snow', async () => {
      const items = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        weather: 'snow',
      });

      const titles = items.map((i) => i.title);
      expect(titles.some((t) => t.includes('Snow Boots'))).toBe(true);
      expect(titles.some((t) => t.includes('Hand & Toe Warmers'))).toBe(true);
      expect(titles.some((t) => t.includes('Down Jacket'))).toBe(true);
    });

    it('adapts items for travel type: adventure vs business', async () => {
      // Adventure
      const adventureItems = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        travelType: 'adventure',
      });
      const adventureTitles = adventureItems.map((i) => i.title);
      expect(adventureTitles.some((t) => t.includes('Hiking Boots'))).toBe(true);
      expect(adventureTitles.some((t) => t.includes('Headlamp') || t.includes('Flashlight'))).toBe(true);
      expect(adventureTitles.some((t) => t.includes('Multi-tool'))).toBe(true);
      expect(adventureTitles.some((t) => t.includes('Business Suit'))).toBe(false);

      // Business
      const businessItems = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        travelType: 'business',
      });
      const businessTitles = businessItems.map((i) => i.title);
      expect(businessTitles.some((t) => t.includes('Business Suit') || t.includes('Blazer'))).toBe(true);
      expect(businessTitles.some((t) => t.includes('Presentation Adapter'))).toBe(true);
      expect(businessTitles.some((t) => t.includes('Business Cards'))).toBe(true);
    });

    it('scales clothing quantity with trip duration', async () => {
      const shortTripItems = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        duration: 3,
      });
      const underwearShort = shortTripItems.find((i) => i.title === 'Underwear');
      expect(underwearShort?.quantity).toBe(4); // 3 + 1

      const longTripItems = await useChecklistStore.getState().generateChecklist({
        ...baseParams,
        duration: 10,
      });
      const underwearLong = longTripItems.find((i) => i.title === 'Underwear');
      expect(underwearLong?.quantity).toBe(11); // 10 + 1
    });

    it('rejects generation when destination is empty', async () => {
      await expect(
        useChecklistStore.getState().generateChecklist({
          ...baseParams,
          destination: '   ',
        })
      ).rejects.toThrow('Destination is required');
    });
  });

  describe('Item Operations & Progress', () => {
    it('adds a custom item and persists it', async () => {
      const item = await useChecklistStore.getState().addItem({
        title: 'Noise-cancelling headphones',
        category: 'electronics',
        quantity: 1,
        isPacked: false,
      });

      expect(item.id).toBeDefined();
      expect(item.title).toBe('Noise-cancelling headphones');
      expect(useChecklistStore.getState().items).toHaveLength(1);

      const inDb = await db.checklists.get(item.id);
      expect(inDb?.title).toBe('Noise-cancelling headphones');
    });

    it('toggles item packed status and computes progress accurately', async () => {
      const item1 = await useChecklistStore.getState().addItem({
        title: 'Item 1',
        category: 'essentials',
        quantity: 1,
        isPacked: false,
      });
      const item2 = await useChecklistStore.getState().addItem({
        title: 'Item 2',
        category: 'clothing',
        quantity: 1,
        isPacked: false,
      });

      let progress = useChecklistStore.getState().getPackingProgress();
      expect(progress.total).toBe(2);
      expect(progress.packed).toBe(0);
      expect(progress.percentage).toBe(0);

      // Pack item 1
      await useChecklistStore.getState().toggleItem(item1.id);

      progress = useChecklistStore.getState().getPackingProgress();
      expect(progress.packed).toBe(1);
      expect(progress.percentage).toBe(50);

      // Pack item 2
      await useChecklistStore.getState().toggleItem(item2.id);
      progress = useChecklistStore.getState().getPackingProgress();
      expect(progress.packed).toBe(2);
      expect(progress.percentage).toBe(100);

      // Toggle item 1 back to unpacked
      await useChecklistStore.getState().toggleItem(item1.id);
      progress = useChecklistStore.getState().getPackingProgress();
      expect(progress.packed).toBe(1);
      expect(progress.percentage).toBe(50);
    });

    it('deletes an item from store and Dexie', async () => {
      const item = await useChecklistStore.getState().addItem({
        title: 'Item To Delete',
        category: 'custom',
        isPacked: false,
      });

      await useChecklistStore.getState().deleteItem(item.id);
      expect(useChecklistStore.getState().items).toHaveLength(0);

      const inDb = await db.checklists.get(item.id);
      expect(inDb).toBeUndefined();
    });

    it('loads items scoped by tripId', async () => {
      await useChecklistStore.getState().addItem({
        title: 'Trip A Item',
        category: 'essentials',
        tripId: 'trip-123',
        isPacked: false,
      });
      await useChecklistStore.getState().addItem({
        title: 'Trip B Item',
        category: 'essentials',
        tripId: 'trip-456',
        isPacked: false,
      });

      await useChecklistStore.getState().loadItems('trip-123');
      const loaded = useChecklistStore.getState().items;
      expect(loaded).toHaveLength(1);
      expect(loaded[0].title).toBe('Trip A Item');
    });
  });
});

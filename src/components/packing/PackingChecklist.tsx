import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Sun,
  CloudRain,
  Snowflake,
  Flame,
  CloudSun,
  Sparkles,
  RotateCcw,
  Tag,
  Luggage,
} from 'lucide-react';
import { usePackingStore } from '../../stores/packingStore';
import { useTripStore } from '../../stores/tripStore';
import type { WeatherType } from '../../utils/packingGenerator';
import type { ChecklistItem, Trip } from '../../types';

export const PackingChecklist: React.FC = () => {
  const {
    currentTripId,
    destination,
    weather,
    durationDays,
    travelType,
    filterCategory,
    isLoading,
    error,
    loadItems,
    generateChecklist,
    addItem,
    toggleItem,
    deleteItem,
    clearAll,
    setFilterCategory,
    setWeather,
    setDestination,
    setDurationDays,
    setTravelType,
    getFilteredItems,
    getPackedCount,
    getTotalCount,
    getProgressPercent,
  } = usePackingStore();

  const { trips, activeTripId } = useTripStore();

  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistItem['category']>('custom');
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  useEffect(() => {
    loadItems(activeTripId || undefined);
  }, [loadItems, activeTripId]);

  // If there's an active trip and store destination is empty, populate from active trip
  useEffect(() => {
    if (activeTripId) {
      const activeTrip = trips.find((t) => t.id === activeTripId);
      if (activeTrip && !destination) {
        setDestination(activeTrip.destination);
        setTravelType(activeTrip.travelType);
        if (activeTrip.startDate && activeTrip.endDate) {
          const start = new Date(activeTrip.startDate);
          const end = new Date(activeTrip.endDate);
          const days = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          setDurationDays(days);
        }
      }
    }
  }, [activeTripId, trips, destination, setDestination, setTravelType, setDurationDays]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await generateChecklist({
      destination: destination || 'My Destination',
      weather,
      durationDays: Math.max(1, durationDays || 5),
      travelType,
      tripId: currentTripId || activeTripId || undefined,
    });
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    await addItem({
      title: newItemTitle.trim(),
      category: newItemCategory,
      quantity: newItemQuantity,
      isPacked: false,
      suggestedBy: 'user',
      tripId: currentTripId || activeTripId || undefined,
    });

    setNewItemTitle('');
    setNewItemQuantity(1);
  };

  const handleTripSelect = (tripId: string) => {
    if (!tripId) {
      loadItems(undefined);
      return;
    }
    const selected = trips.find((t) => t.id === tripId);
    if (selected) {
      setDestination(selected.destination);
      setTravelType(selected.travelType);
      if (selected.startDate && selected.endDate) {
        const start = new Date(selected.startDate);
        const end = new Date(selected.endDate);
        const days = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        setDurationDays(days);
      }
      loadItems(tripId);
    }
  };

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Items' },
    { key: 'essentials', label: 'Essentials' },
    { key: 'clothing', label: 'Clothing' },
    { key: 'electronics', label: 'Electronics' },
    { key: 'documents', label: 'Documents' },
    { key: 'health', label: 'Health & Meds' },
    { key: 'toiletries', label: 'Toiletries' },
    { key: 'custom', label: 'Custom' },
  ];

  const weatherOptions: { value: WeatherType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { value: 'mild', label: 'Mild / Moderate', icon: CloudSun },
    { value: 'hot', label: 'Hot / Sunny', icon: Flame },
    { value: 'cold', label: 'Cold / Chilly', icon: Snowflake },
    { value: 'rainy', label: 'Rainy / Wet', icon: CloudRain },
    { value: 'sunny', label: 'Warm & Clear', icon: Sun },
    { value: 'snowy', label: 'Freezing / Snow', icon: Snowflake },
  ];

  const filteredItems = getFilteredItems();
  const packedCount = getPackedCount();
  const totalCount = getTotalCount();
  const progressPercent = getProgressPercent();

  return (
    <div className="space-y-6">
      {/* Header and Smart Setup Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
                <Luggage className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Smart Packing Checklist
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Dynamic packing list adapted to destination, forecasted weather, duration & style
            </p>
          </div>

          {/* Trip selector dropdown if trips exist */}
          {trips.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Link to Trip:</span>
              <select
                value={currentTripId || ''}
                onChange={(e) => handleTripSelect(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">General / Standalone</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.destination})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Input Parameters Form */}
        <form onSubmit={handleGenerate} className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Destination */}
          <div>
            <label htmlFor="pack-dest" className="block text-xs font-semibold text-slate-300 mb-1">
              Destination
            </label>
            <input
              id="pack-dest"
              type="text"
              placeholder="e.g. Kyoto, Japan or Rome"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Weather */}
          <div>
            <label htmlFor="pack-weather" className="block text-xs font-semibold text-slate-300 mb-1">
              Forecast Weather
            </label>
            <select
              id="pack-weather"
              value={weather}
              onChange={(e) => setWeather(e.target.value as WeatherType)}
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {weatherOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration in Days */}
          <div>
            <label htmlFor="pack-duration" className="block text-xs font-semibold text-slate-300 mb-1">
              Duration (Days)
            </label>
            <input
              id="pack-duration"
              type="number"
              min="1"
              max="90"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Travel Style */}
          <div>
            <label htmlFor="pack-style" className="block text-xs font-semibold text-slate-300 mb-1">
              Travel Style
            </label>
            <select
              id="pack-style"
              value={travelType}
              onChange={(e) => setTravelType(e.target.value as Trip['travelType'])}
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer capitalize"
            >
              <option value="leisure">Leisure</option>
              <option value="adventure">Adventure</option>
              <option value="business">Business</option>
              <option value="family">Family</option>
              <option value="backpacking">Backpacking</option>
              <option value="solo">Solo</option>
            </select>
          </div>

          {/* Generate Button */}
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{totalCount > 0 ? 'Re-Evaluate Checklist' : 'Generate Smart Checklist'}</span>
            </button>
          </div>
        </form>

        {/* Progress Tracker */}
        {totalCount > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
              <span className="font-semibold">Packing Progress</span>
              <span className="font-medium text-sky-400">
                {packedCount} / {totalCount} items packed ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm"
        >
          {error}
        </div>
      )}

      {/* Category Pills & Quick Add */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isSelected = filterCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setFilterCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all items from this packing checklist?')) {
                  clearAll(currentTripId || undefined);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset List</span>
            </button>
          )}
        </div>

        {/* Add Custom Item bar */}
        <form
          onSubmit={handleAddCustomItem}
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-2.5"
        >
          <input
            type="text"
            placeholder="Add custom item (e.g. Scuba diving mask, Kindle, Extra medication)..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            className="flex-1 w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as ChecklistItem['category'])}
              className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="custom">Custom</option>
              <option value="essentials">Essentials</option>
              <option value="clothing">Clothing</option>
              <option value="electronics">Electronics</option>
              <option value="documents">Documents</option>
              <option value="health">Health</option>
              <option value="toiletries">Toiletries</option>
            </select>

            <input
              type="number"
              min="1"
              max="99"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-slate-800/80 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
            />

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition shadow-md shadow-sky-500/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Items List */}
        {totalCount === 0 ? (
          <div className="p-12 border-2 border-dashed border-slate-800 rounded-3xl text-center bg-slate-900/40">
            <Luggage className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-200">No items on your packing list yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Set your destination, anticipated weather, and travel type above, then click "Generate Smart Checklist".
            </p>
            <button
              type="button"
              onClick={() => handleGenerate()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Items Now</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center border border-slate-800 rounded-2xl bg-slate-900/40 text-slate-400 text-sm">
            No items found in category "{filterCategory}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition cursor-pointer select-none ${
                  item.isPacked
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.id);
                    }}
                    aria-label={item.isPacked ? 'Mark unpacked' : 'Mark packed'}
                    className="shrink-0 text-slate-400 hover:text-sky-400 transition"
                  >
                    {item.isPacked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          item.isPacked ? 'line-through text-slate-400' : 'text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.quantity && item.quantity > 1 && (
                        <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px] font-semibold border border-slate-700">
                          {item.quantity}x
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 capitalize">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {item.category}
                      </span>

                      {item.suggestedBy && item.suggestedBy !== 'user' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 capitalize">
                          via {item.suggestedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  aria-label={`Delete ${item.title}`}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, DollarSign, Tag, AlertCircle } from 'lucide-react';
import { useTripStore, type TripFormData } from '../../stores/tripStore';
import type { Trip } from '../../types';

interface TripFormProps {
  isOpen: boolean;
  onClose: () => void;
  tripToEdit?: Trip | null;
  onSuccess?: (trip: Trip) => void;
}

const TRAVEL_TYPES: { value: Trip['travelType']; label: string }[] = [
  { value: 'solo', label: 'Solo' },
  { value: 'leisure', label: 'Leisure' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'family', label: 'Family' },
  { value: 'backpacking', label: 'Backpacking' },
  { value: 'business', label: 'Business' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'SGD'];

export const TripForm: React.FC<TripFormProps> = ({
  isOpen,
  onClose,
  tripToEdit,
  onSuccess,
}) => {
  const { addTrip, updateTrip } = useTripStore();

  const [formData, setFormData] = useState<TripFormData>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    travelType: 'leisure',
    status: 'planned',
    totalBudget: undefined,
    budgetCurrency: 'USD',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tripToEdit) {
      setFormData({
        title: tripToEdit.title,
        destination: tripToEdit.destination,
        startDate: tripToEdit.startDate,
        endDate: tripToEdit.endDate,
        travelType: tripToEdit.travelType,
        status: tripToEdit.status,
        totalBudget: tripToEdit.totalBudget,
        budgetCurrency: tripToEdit.budgetCurrency || 'USD',
        notes: tripToEdit.notes || '',
      });
    } else {
      setFormData({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        travelType: 'leisure',
        status: 'planned',
        totalBudget: undefined,
        budgetCurrency: 'USD',
        notes: '',
      });
    }
    setErrors({});
  }, [tripToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.destination.trim()) {
      newErrors.destination = 'Destination is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be on or after start date';
      }
    }

    if (
      formData.totalBudget !== undefined &&
      formData.totalBudget !== null &&
      Number(formData.totalBudget) < 0
    ) {
      newErrors.totalBudget = 'Budget cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let savedTrip: Trip;
      if (tripToEdit) {
        savedTrip = await updateTrip(tripToEdit.id, formData);
      } else {
        savedTrip = await addTrip(formData);
      }
      onSuccess?.(savedTrip);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save trip';
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 id="trip-form-title" className="text-xl sm:text-2xl font-bold text-white">
              {tripToEdit ? 'Edit Trip' : 'Plan a New Trip'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {tripToEdit
                ? 'Update your travel details and itinerary'
                : 'Set your destination, dates, and preferences'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errors.submit && (
          <div
            role="alert"
            className="mt-4 p-3 bg-red-950/80 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Trip Title */}
          <div>
            <label htmlFor="trip-title" className="block text-sm font-medium text-slate-200">
              Trip Title <span className="text-red-400">*</span>
            </label>
            <input
              id="trip-title"
              type="text"
              placeholder="e.g. Summer Vacation in Italy"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'trip-title-error' : undefined}
              className={`mt-1.5 w-full rounded-xl bg-slate-800/80 border px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                errors.title ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
              }`}
            />
            {errors.title && (
              <p id="trip-title-error" role="alert" className="mt-1 text-xs text-red-400">
                {errors.title}
              </p>
            )}
          </div>

          {/* Destination */}
          <div>
            <label htmlFor="trip-destination" className="block text-sm font-medium text-slate-200">
              Destination <span className="text-red-400">*</span>
            </label>
            <div className="relative mt-1.5">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="trip-destination"
                type="text"
                placeholder="e.g. Rome, Italy"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                aria-invalid={!!errors.destination}
                aria-describedby={errors.destination ? 'trip-destination-error' : undefined}
                className={`w-full rounded-xl bg-slate-800/80 border pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                  errors.destination ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                }`}
              />
            </div>
            {errors.destination && (
              <p id="trip-destination-error" role="alert" className="mt-1 text-xs text-red-400">
                {errors.destination}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trip-start-date" className="block text-sm font-medium text-slate-200">
                Start Date <span className="text-red-400">*</span>
              </label>
              <div className="relative mt-1.5">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="trip-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  aria-invalid={!!errors.startDate}
                  aria-describedby={errors.startDate ? 'trip-start-date-error' : undefined}
                  className={`w-full rounded-xl bg-slate-800/80 border pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition [color-scheme:dark] ${
                    errors.startDate ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.startDate && (
                <p id="trip-start-date-error" role="alert" className="mt-1 text-xs text-red-400">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="trip-end-date" className="block text-sm font-medium text-slate-200">
                End Date <span className="text-red-400">*</span>
              </label>
              <div className="relative mt-1.5">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="trip-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  aria-invalid={!!errors.endDate}
                  aria-describedby={errors.endDate ? 'trip-end-date-error' : undefined}
                  className={`w-full rounded-xl bg-slate-800/80 border pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition [color-scheme:dark] ${
                    errors.endDate ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.endDate && (
                <p id="trip-end-date-error" role="alert" className="mt-1 text-xs text-red-400">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Travel Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trip-travel-type" className="block text-sm font-medium text-slate-200">
                Travel Style <span className="text-red-400">*</span>
              </label>
              <div className="relative mt-1.5">
                <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="trip-travel-type"
                  value={formData.travelType}
                  onChange={(e) =>
                    setFormData({ ...formData, travelType: e.target.value as Trip['travelType'] })
                  }
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition appearance-none cursor-pointer"
                >
                  {TRAVEL_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="trip-status" className="block text-sm font-medium text-slate-200">
                Status
              </label>
              <select
                id="trip-status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as Trip['status'] })
                }
                className="mt-1.5 w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition appearance-none cursor-pointer"
              >
                <option value="planned" className="bg-slate-900 text-white">Planned</option>
                <option value="active" className="bg-slate-900 text-white">Active</option>
                <option value="completed" className="bg-slate-900 text-white">Completed</option>
                <option value="cancelled" className="bg-slate-900 text-white">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="trip-budget" className="block text-sm font-medium text-slate-200">
                Total Budget (Optional)
              </label>
              <div className="relative mt-1.5">
                <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="trip-budget"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 1500"
                  value={formData.totalBudget ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalBudget: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  aria-invalid={!!errors.totalBudget}
                  aria-describedby={errors.totalBudget ? 'trip-budget-error' : undefined}
                  className={`w-full rounded-xl bg-slate-800/80 border pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                    errors.totalBudget ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.totalBudget && (
                <p id="trip-budget-error" role="alert" className="mt-1 text-xs text-red-400">
                  {errors.totalBudget}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="trip-currency" className="block text-sm font-medium text-slate-200">
                Currency
              </label>
              <select
                id="trip-currency"
                value={formData.budgetCurrency}
                onChange={(e) => setFormData({ ...formData, budgetCurrency: e.target.value })}
                className="mt-1.5 w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition appearance-none cursor-pointer"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur} className="bg-slate-900 text-white">
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="trip-notes" className="block text-sm font-medium text-slate-200">
              Trip Notes (Optional)
            </label>
            <textarea
              id="trip-notes"
              rows={3}
              placeholder="Packing reminders, emergency contact info, flight details..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1.5 w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition font-medium text-sm shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : tripToEdit ? (
                'Save Changes'
              ) : (
                'Create Trip'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

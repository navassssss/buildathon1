import React, { useState } from 'react';
import { X, Clock, MapPin, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useTripStore, type ActivityFormData } from '../../stores/tripStore';
import type { Activity } from '../../types';

interface ActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  defaultDayIndex?: number;
  onSuccess?: (activity: Activity) => void;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  isOpen,
  onClose,
  tripId,
  defaultDayIndex = 1,
  onSuccess,
}) => {
  const { addActivity } = useTripStore();

  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    dayIndex: defaultDayIndex,
    time: '',
    location: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Activity title is required';
    }

    if (!formData.dayIndex || formData.dayIndex < 1) {
      newErrors.dayIndex = 'Day number must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const created = await addActivity(tripId, formData);
      onSuccess?.(created);
      onClose();
      // Reset form
      setFormData({
        title: '',
        dayIndex: defaultDayIndex,
        time: '',
        location: '',
        notes: '',
      });
      setErrors({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add activity';
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 id="activity-form-title" className="text-xl font-bold text-white">
              Add Schedule Activity
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Plan visits, tours, transit, or meals for this day
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="activity-title" className="block text-sm font-medium text-slate-200">
              Activity Title <span className="text-red-400">*</span>
            </label>
            <input
              id="activity-title"
              type="text"
              placeholder="e.g. Visit Colosseum, Sunset at Rialto"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'activity-title-error' : undefined}
              className={`mt-1 w-full rounded-xl bg-slate-800/80 border px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                errors.title ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
              }`}
            />
            {errors.title && (
              <p id="activity-title-error" role="alert" className="mt-1 text-xs text-red-400">
                {errors.title}
              </p>
            )}
          </div>

          {/* Day & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="activity-day" className="block text-sm font-medium text-slate-200">
                Day Number <span className="text-red-400">*</span>
              </label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="activity-day"
                  type="number"
                  min="1"
                  value={formData.dayIndex}
                  onChange={(e) =>
                    setFormData({ ...formData, dayIndex: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  aria-invalid={!!errors.dayIndex}
                  aria-describedby={errors.dayIndex ? 'activity-day-error' : undefined}
                  className={`w-full rounded-xl bg-slate-800/80 border pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                    errors.dayIndex ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.dayIndex && (
                <p id="activity-day-error" role="alert" className="mt-1 text-xs text-red-400">
                  {errors.dayIndex}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="activity-time" className="block text-sm font-medium text-slate-200">
                Time (Optional)
              </label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="activity-time"
                  type="time"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="activity-location" className="block text-sm font-medium text-slate-200">
              Location / Landmark (Optional)
            </label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="activity-location"
                type="text"
                placeholder="e.g. Piazza del Colosseo, 1, 00184 Roma"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="activity-notes" className="block text-sm font-medium text-slate-200">
              Notes or Booking Details (Optional)
            </label>
            <div className="relative mt-1">
              <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <textarea
                id="activity-notes"
                rows={2}
                placeholder="Ticket barcode, tour meeting point, dress code..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition font-medium text-sm shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Adding...' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

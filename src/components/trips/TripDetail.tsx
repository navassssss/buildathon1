import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Circle,
  Tag,
  DollarSign,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { useTripStore, type ActivityFormData } from '../../stores/tripStore';
import type { Trip } from '../../types';

interface TripDetailProps {
  tripId: string;
  onBack: () => void;
  onEditTrip: (trip: Trip) => void;
}

export const TripDetail: React.FC<TripDetailProps> = ({
  tripId,
  onBack,
  onEditTrip,
}) => {
  const { trips, toggleActivity, deleteActivity, addActivity, deleteTrip } = useTripStore();
  const trip = trips.find((t) => t.id === tripId);

  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  // Add Activity Form State
  const [activityForm, setActivityForm] = useState<ActivityFormData>({
    title: '',
    dayIndex: 1,
    time: '',
    location: '',
    notes: '',
  });
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});

  if (!trip) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Trip not found.</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 text-sky-400 hover:text-sky-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trips</span>
        </button>
      </div>
    );
  }

  // Calculate total days
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const diffDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Group activities by dayIndex
  const daysList = Array.from({ length: diffDays }, (_, i) => i + 1);
  const totalActivities = trip.activities.length;
  const completedActivities = trip.activities.filter((a) => a.completed).length;
  const completionPercentage =
    totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  const handleOpenAddActivity = (defaultDay: number = 1) => {
    setActivityForm({
      title: '',
      dayIndex: defaultDay,
      time: '',
      location: '',
      notes: '',
    });
    setActivityErrors({});
    setIsAddActivityOpen(true);
  };

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!activityForm.title.trim()) {
      errors.title = 'Activity title is required';
    }

    if (!activityForm.dayIndex || Number(activityForm.dayIndex) < 1) {
      errors.dayIndex = 'Day number must be at least 1';
    }

    if (Object.keys(errors).length > 0) {
      setActivityErrors(errors);
      return;
    }

    try {
      await addActivity(trip.id, activityForm);
      setIsAddActivityOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add activity';
      setActivityErrors({ submit: msg });
    }
  };

  const handleDeleteTrip = async () => {
    await deleteTrip(trip.id);
    onBack();
  };

  const filteredDays =
    selectedDayFilter === 'all'
      ? daysList
      : daysList.filter((d) => d === selectedDayFilter);

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          data-testid="back-to-trips-btn"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Trips</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEditTrip(trip)}
            data-testid="edit-trip-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeletingTrip(true)}
            data-testid="delete-trip-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-900/40 text-rose-400 hover:bg-rose-950/40 transition text-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Trip Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize bg-sky-500/10 text-sky-400 border border-sky-500/30">
                {trip.status}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-slate-300 capitalize bg-slate-800 border border-slate-700">
                <Tag className="w-3 h-3 text-slate-400" />
                {trip.travelType}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {trip.title}
            </h1>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-slate-300 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                {trip.destination}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                {trip.startDate} to {trip.endDate} ({diffDays} {diffDays === 1 ? 'day' : 'days'})
              </span>
              {trip.totalBudget !== undefined && trip.totalBudget !== null && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <DollarSign className="w-4 h-4 shrink-0" />
                    Budget: {trip.budgetCurrency} {trip.totalBudget.toLocaleString()}
                  </span>
                </>
              )}
            </div>
            {trip.notes && (
              <div className="mt-3 text-slate-400 text-sm bg-slate-800/40 border border-slate-800 rounded-xl p-3 flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>{trip.notes}</span>
              </div>
            )}
          </div>

          {/* Quick Progress Card */}
          <div className="lg:w-72 shrink-0 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <span>Itinerary Progress</span>
              <span className="text-sky-400">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {completedActivities} of {totalActivities} activities marked completed
            </p>
          </div>
        </div>
      </div>

      {/* Itinerary Schedule Header & Day Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-xl font-bold text-white">Day-by-Day Itinerary</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Organize activities, sightseeing, and time schedules for each day
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            handleOpenAddActivity(
              typeof selectedDayFilter === 'number' ? selectedDayFilter : 1
            )
          }
          data-testid="add-activity-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20 active:scale-98 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Activity</span>
        </button>
      </div>

      {/* Day Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedDayFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
            selectedDayFilter === 'all'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Days ({diffDays})
        </button>
        {daysList.map((dayNum) => {
          const count = trip.activities.filter((a) => a.dayIndex === dayNum).length;
          const isSelected = selectedDayFilter === dayNum;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => setSelectedDayFilter(dayNum)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>Day {dayNum}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Days & Activities List */}
      <div className="space-y-6">
        {filteredDays.map((dayNum) => {
          const dayActivities = trip.activities.filter((a) => a.dayIndex === dayNum);

          // Calculate date string for this day
          const dayDate = new Date(trip.startDate);
          dayDate.setDate(dayDate.getDate() + (dayNum - 1));
          const dateStr = dayDate.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={dayNum}
              data-testid={`day-section-${dayNum}`}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                    {dayNum}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Day {dayNum}</h3>
                    <p className="text-xs text-slate-400">{dateStr}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddActivity(dayNum)}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300 transition flex items-center gap-1 p-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Day {dayNum}</span>
                </button>
              </div>

              {dayActivities.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  <p>No activities scheduled for Day {dayNum} yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dayActivities.map((activity) => (
                    <div
                      key={activity.id}
                      data-testid={`activity-item-${activity.id}`}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition ${
                        activity.completed
                          ? 'bg-slate-900/40 border-slate-800/50 opacity-70'
                          : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Toggle completion checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleActivity(activity.id)}
                          data-testid={`toggle-activity-${activity.id}`}
                          aria-label={activity.completed ? 'Mark incomplete' : 'Mark complete'}
                          className="mt-0.5 text-slate-400 hover:text-sky-400 transition shrink-0"
                        >
                          {activity.completed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <p
                            className={`text-sm font-semibold text-white truncate ${
                              activity.completed ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {activity.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400">
                            {activity.time && (
                              <span className="flex items-center gap-1 text-sky-400">
                                <Clock className="w-3 h-3 shrink-0" />
                                {activity.time}
                              </span>
                            )}
                            {activity.location && (
                              <span className="flex items-center gap-1 text-slate-300">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate max-w-xs">{activity.location}</span>
                              </span>
                            )}
                          </div>

                          {activity.notes && (
                            <p className="text-xs text-slate-400 mt-1 italic">
                              {activity.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Delete activity */}
                      <button
                        type="button"
                        onClick={() => deleteActivity(activity.id)}
                        data-testid={`delete-activity-${activity.id}`}
                        aria-label={`Delete ${activity.title}`}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Activity Modal */}
      {isAddActivityOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-activity-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 id="add-activity-title" className="text-lg font-bold text-white">
                Schedule Activity
              </h3>
              <button
                type="button"
                onClick={() => setIsAddActivityOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activityErrors.submit && (
              <div
                role="alert"
                className="mt-4 p-3 bg-red-950/80 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-xs"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{activityErrors.submit}</span>
              </div>
            )}

            <form onSubmit={handleActivitySubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="activity-title"
                  className="block text-xs font-medium text-slate-300"
                >
                  Activity Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="activity-title"
                  type="text"
                  placeholder="e.g. Visit the Colosseum"
                  value={activityForm.title}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, title: e.target.value })
                  }
                  className={`mt-1.5 w-full rounded-xl bg-slate-800 border px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                    activityErrors.title ? 'border-red-500' : 'border-slate-700'
                  }`}
                />
                {activityErrors.title && (
                  <p role="alert" className="mt-1 text-xs text-red-400">
                    {activityErrors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="activity-day"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Day Number <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="activity-day"
                    value={activityForm.dayIndex}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, dayIndex: Number(e.target.value) })
                    }
                    className="mt-1.5 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    {daysList.map((d) => (
                      <option key={d} value={d} className="bg-slate-900 text-white">
                        Day {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="activity-time"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Time (Optional)
                  </label>
                  <input
                    id="activity-time"
                    type="time"
                    value={activityForm.time || ''}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, time: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="activity-location"
                  className="block text-xs font-medium text-slate-300"
                >
                  Location (Optional)
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="activity-location"
                    type="text"
                    placeholder="e.g. Piazza del Colosseo, 1, 00184 Roma"
                    value={activityForm.location || ''}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, location: e.target.value })
                    }
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="activity-notes"
                  className="block text-xs font-medium text-slate-300"
                >
                  Notes (Optional)
                </label>
                <textarea
                  id="activity-notes"
                  rows={2}
                  placeholder="Ticket reservation numbers, audio guide tips..."
                  value={activityForm.notes || ''}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, notes: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-activity-btn"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition text-xs font-medium shadow-md shadow-sky-500/20"
                >
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Trip Confirmation Modal */}
      {isDeletingTrip && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-trip-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
            <h3 id="delete-trip-dialog-title" className="text-lg font-bold text-white">
              Delete Trip
            </h3>
            <p className="text-sm text-slate-300 mt-2">
              Are you sure you want to delete <span className="font-semibold text-white">"{trip.title}"</span>? All activities will be lost.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeletingTrip(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                data-testid="confirm-delete-trip-btn"
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Compass,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  DollarSign,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { useTripStore, type TripStatusFilter } from '../../stores/tripStore';
import type { Trip } from '../../types';

interface TripListProps {
  onCreateTrip: () => void;
  onSelectTrip: (tripId: string) => void;
  onEditTrip: (trip: Trip) => void;
}

const STATUS_FILTERS: { value: TripStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Trips' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getStatusBadgeStyle(status: Trip['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'completed':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'planned':
    default:
      return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
  }
}

function calculateDuration(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isNaN(diffDays) ? 1 : diffDays;
}

export const TripList: React.FC<TripListProps> = ({
  onCreateTrip,
  onSelectTrip,
  onEditTrip,
}) => {
  const {
    trips,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    deleteTrip,
    getFilteredTrips,
  } = useTripStore();

  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const filteredTrips = getFilteredTrips();

  const handleDeleteConfirm = async () => {
    if (tripToDelete) {
      await deleteTrip(tripToDelete.id);
      setTripToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Smart Trip Planner
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Organize destinations, schedules, and activities offline-first
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateTrip}
          data-testid="create-trip-btn"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>New Trip</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/60 border border-slate-800 p-3 sm:p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by destination, title, or travel style..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === 'all'
                ? trips.length
                : trips.filter((t) => t.status === f.value).length;
            const isActive = statusFilter === f.value;

            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trips Content */}
      {trips.length === 0 ? (
        /* Empty State: No Trips at all */
        <div
          data-testid="empty-trips-state"
          className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-white">No trips planned yet</h3>
          <p className="text-slate-400 text-sm max-w-md mt-2">
            Start your travel journey by creating your first trip itinerary. Add destinations, dates, and activities.
          </p>
          <button
            type="button"
            onClick={onCreateTrip}
            data-testid="empty-state-create-btn"
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Trip</span>
          </button>
        </div>
      ) : filteredTrips.length === 0 ? (
        /* Filter matched nothing */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-slate-800 rounded-3xl">
          <p className="text-slate-300 font-medium">No trips match your current filter</p>
          <p className="text-slate-500 text-sm mt-1">Try resetting the status filter or search query</p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Grid of Trip Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTrips.map((trip) => {
            const completedActivities = trip.activities.filter((a) => a.completed).length;
            const totalActivities = trip.activities.length;
            const progressPercent =
              totalActivities > 0
                ? Math.round((completedActivities / totalActivities) * 100)
                : 0;
            const duration = calculateDuration(trip.startDate, trip.endDate);

            return (
              <div
                key={trip.id}
                data-testid={`trip-card-${trip.id}`}
                className="group relative flex flex-col justify-between bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition duration-200 hover:shadow-xl hover:shadow-slate-950/40"
              >
                <div>
                  {/* Status & Travel Style */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getStatusBadgeStyle(
                        trip.status
                      )}`}
                    >
                      {trip.status}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 capitalize bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                      <Tag className="w-3 h-3 text-slate-500" />
                      {trip.travelType}
                    </span>
                  </div>

                  {/* Title & Destination */}
                  <h3
                    onClick={() => onSelectTrip(trip.id)}
                    className="text-lg font-bold text-white group-hover:text-sky-400 transition cursor-pointer line-clamp-1"
                  >
                    {trip.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-slate-300 text-sm mt-1">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-medium truncate">{trip.destination}</span>
                  </div>

                  {/* Dates & Duration */}
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-3">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {trip.startDate} to {trip.endDate}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
                  </div>

                  {/* Budget if specified */}
                  {trip.totalBudget !== undefined && trip.totalBudget !== null && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2 font-medium">
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Budget: {trip.budgetCurrency} {trip.totalBudget.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Activities summary */}
                  <div className="mt-4 pt-3 border-t border-slate-800/70">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                        Activities ({completedActivities}/{totalActivities})
                      </span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSelectTrip(trip.id)}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition py-1"
                  >
                    View Itinerary →
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditTrip(trip)}
                      aria-label={`Edit ${trip.title}`}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTripToDelete(trip)}
                      aria-label={`Delete ${trip.title}`}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 id="delete-dialog-title" className="text-lg font-bold text-white">
                Delete Trip
              </h3>
            </div>
            <p className="text-sm text-slate-300 mt-3">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">"{tripToDelete.title}"</span>? All
              scheduled activities will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                data-testid="confirm-delete-trip-btn"
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg shadow-rose-600/20"
              >
                Delete Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

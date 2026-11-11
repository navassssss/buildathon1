import React from 'react';
import { Calendar, MapPin, Tag, DollarSign, CheckCircle2, Trash2, Edit3, ArrowRight } from 'lucide-react';
import type { Trip } from '../../types';

interface TripCardProps {
  trip: Trip;
  onSelect: (trip: Trip) => void;
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: string) => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Cancelled
          </span>
        );
      case 'planned':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            Planned
          </span>
        );
    }
  };

  const completedActivities = trip.activities?.filter((a) => a.completed).length || 0;
  const totalActivities = trip.activities?.length || 0;

  // Calculate duration in days
  let durationDays: number | null = null;
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${trip.title}"?`)) {
      onDelete(trip.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(trip);
  };

  return (
    <div
      onClick={() => onSelect(trip)}
      className="group relative bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/5 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getStatusBadge(trip.status)}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
              <Tag className="w-3 h-3 text-slate-400" />
              {trip.travelType}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={handleEdit}
              aria-label={`Edit ${trip.title}`}
              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label={`Delete ${trip.title}`}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Destination */}
        <div className="mt-3.5">
          <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition line-clamp-1">
            {trip.title}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-slate-300 mt-1">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="line-clamp-1">{trip.destination}</span>
          </div>
        </div>

        {/* Date and Duration */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {trip.startDate} to {trip.endDate}
          </span>
          {durationDays && (
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 text-[11px]">
              {durationDays} {durationDays === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>

        {/* Budget info if present */}
        {trip.totalBudget !== undefined && trip.totalBudget !== null && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>
              Budget: {trip.totalBudget.toLocaleString()} {trip.budgetCurrency || 'USD'}
            </span>
          </div>
        )}

        {/* Notes preview if present */}
        {trip.notes && (
          <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 italic">
            "{trip.notes}"
          </p>
        )}
      </div>

      {/* Footer Info: Activities progress and Open CTA */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {totalActivities === 0
              ? 'No activities yet'
              : `${completedActivities}/${totalActivities} done`}
          </span>
        </div>

        <div className="flex items-center gap-1 font-medium text-sky-400 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-transform">
          <span>Plan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

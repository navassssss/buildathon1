import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { TripList } from './TripList';
import { TripDetail } from './TripDetail';
import { TripForm } from './TripForm';
import type { Trip } from '../../types';

export const TripPlanner: React.FC = () => {
  const {
    trips,
    activeTripId,
    setActiveTrip,
    loadTrips,
    isLoading,
    error,
    clearError,
  } = useTripStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleCreateTrip = () => {
    setTripToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditTrip = (trip: Trip) => {
    setTripToEdit(trip);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTripToEdit(null);
  };

  const handleTripSuccess = (savedTrip: Trip) => {
    // If newly created or updated, we can also view it
    if (!activeTripId) {
      setActiveTrip(savedTrip.id);
    }
  };

  const activeTrip = trips.find((t) => t.id === activeTripId);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-6 p-4 bg-rose-950/80 border border-rose-800 rounded-2xl flex items-center justify-between text-rose-200 text-sm shadow-lg shadow-rose-950/50"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss error"
            className="p-1 text-rose-400 hover:text-white rounded-lg hover:bg-rose-900/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-3" />
          <p className="text-sm font-medium">Loading your travel plans...</p>
        </div>
      ) : activeTrip ? (
        <TripDetail
          tripId={activeTrip.id}
          onBack={() => setActiveTrip(null)}
          onEditTrip={handleEditTrip}
        />
      ) : (
        <TripList
          onCreateTrip={handleCreateTrip}
          onSelectTrip={(id) => setActiveTrip(id)}
          onEditTrip={handleEditTrip}
        />
      )}

      {/* Trip Form Modal */}
      <TripForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        tripToEdit={tripToEdit}
        onSuccess={handleTripSuccess}
      />
    </div>
  );
};

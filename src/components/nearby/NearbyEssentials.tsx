import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  Search,
  AlertCircle,
  Hospital,
  Pill,
  Shield,
  Banknote,
  UtensilsCrossed,
  Hotel,
  Building2,
  Loader2,
  Landmark,
  Locate,
} from 'lucide-react';
import { getCurrentLocation, checkLocationPermission, formatDistance } from '../../services/location';
import {
  findNearbyPlaces,
  findNearbyPlacesForCity,
  getLocalCities,
  searchPlaces,
  findEmergencyServices,
} from '../../services/nearbyPlaces';
import { SchematicMap, type MapPlace } from '../map/SchematicMap';
import type { NearbyPlace } from '../../types';

const categoryIcons: Record<NearbyPlace['category'], React.FC<{ className?: string }>> = {
  hospital: Hospital,
  pharmacy: Pill,
  police: Shield,
  atm: Banknote,
  restaurant: UtensilsCrossed,
  accommodation: Hotel,
  embassy: Building2,
  attraction: Landmark,
};

export const NearbyEssentials: React.FC = () => {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NearbyPlace['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [selectedCity, setSelectedCity] = useState('london');
  const [locationSource, setLocationSource] = useState<string | null>(null);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const state = await checkLocationPermission();
    setPermissionState(state);
  };

  const handleGetLocation = async () => {
    setIsLoadingLocation(true);
    setError(null);

    try {
      const location = await getCurrentLocation();
      setCurrentLocation({ lat: location.latitude, lng: location.longitude });
      setPermissionState('granted');

      // Load nearby places
      const nearby = await findNearbyPlaces(location.latitude, location.longitude, {
        maxDistance: 5000,
        limit: 50,
      });
      setPlaces(nearby);
      setLocationSource('Device location (foreground only)');
    } catch (err: any) {
      if (err.code === 'PERMISSION_DENIED') {
        setError('Location access denied. Please enable location permissions to find nearby places.');
        setPermissionState('denied');
      } else if (err.code === 'POSITION_UNAVAILABLE') {
        setError('Unable to determine your location. Please try again.');
      } else {
        setError('Failed to get location. Please try again.');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleEmergencySearch = async () => {
    if (!currentLocation) {
      setError('Please enable location first to find emergency services.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const emergency = await findEmergencyServices(currentLocation.lat, currentLocation.lng);
      setPlaces(emergency);
      setSelectedCategory('all');
    } catch (err) {
      setError('Failed to load emergency services.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchPlaces(
        searchQuery,
        currentLocation?.lat,
        currentLocation?.lng
      );
      setPlaces(results);
      setSelectedCategory('all');
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCategoryFilter = (category: NearbyPlace['category'] | 'all') => {
    setSelectedCategory(category);
  };

  const handleFixtureCity = async () => {
    setIsLoadingLocation(true);
    setError(null);
    try {
      const city = getLocalCities().find((candidate) => candidate.code === selectedCity);
      if (!city) {
        setError('Choose one of the bundled fixture cities.');
        return;
      }
      const results = await findNearbyPlacesForCity(city.code, { maxDistance: 5000, limit: 50 });
      setCurrentLocation({ lat: city.coordinates.lat, lng: city.coordinates.lng });
      setPlaces(results);
      setSelectedCategory('all');
      setLocationSource(`${city.name} (bundled fixture centre)`);
    } catch {
      setError('Could not load the fixture city. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const filteredPlaces =
    selectedCategory === 'all'
      ? places
      : places.filter((place) => place.category === selectedCategory);

  const mapPlaces: MapPlace[] = filteredPlaces.map((place) => ({
    id: place.id,
    name: place.name,
    category: place.category,
    coordinates: place.coordinates,
    detail:
      place.distanceMeters > 0 ? formatDistance(place.distanceMeters) : place.address,
  }));

  const categories: { key: NearbyPlace['category'] | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'hospital', label: 'Hospitals' },
    { key: 'pharmacy', label: 'Pharmacies' },
    { key: 'police', label: 'Police' },
    { key: 'atm', label: 'ATMs' },
    { key: 'restaurant', label: 'Food' },
    { key: 'accommodation', label: 'Hotels' },
    { key: 'attraction', label: 'Attractions' },
    { key: 'embassy', label: 'Embassies' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Nearby Essentials</h1>
            <p className="text-sm text-slate-400">
              Find hospitals, pharmacies, ATMs, restaurants & more nearby
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Location Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleGetLocation}
            disabled={isLoadingLocation}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {isLoadingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span>
              {isLoadingLocation
                ? 'Getting Location...'
                : currentLocation
                ? 'Refresh Location'
                : 'Use My Location'}
            </span>
          </button>

          {currentLocation && (
            <button
              onClick={handleEmergencySearch}
              disabled={isSearching}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-medium text-sm transition shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              <span>Emergency Services</span>
            </button>
          )}

          {permissionState === 'denied' && (
            <div className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Location access denied. Enable in browser settings.</span>
            </div>
          )}
        </div>

        {/* Bundled fixture city (works without geolocation) */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="nearby-city" className="text-xs text-slate-400">
            Or explore a bundled fixture city:
          </label>
          <select
            id="nearby-city"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {getLocalCities().map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}, {city.country}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleFixtureCity}
            disabled={isLoadingLocation}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium transition disabled:opacity-50"
          >
            <Locate className="w-3.5 h-3.5" />
            Use fixture city
          </button>
          {locationSource && (
            <span role="status" className="text-xs text-emerald-300">
              {locationSource}
            </span>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places by name (e.g., St Thomas Hospital, Boots Pharmacy)..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* Category Filters */}
      {places.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat.key
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Local schematic map */}
      {filteredPlaces.length > 0 && (
        <SchematicMap
          places={mapPlaces}
          center={currentLocation}
          ariaLabel="Nearby essentials schematic map"
          emptyMessage="Enable location or choose a fixture city to plot nearby places."
          caption="Schematic positions from bundled local fixtures only — no map tiles or external services. Not turn-by-turn navigation."
        />
      )}

      {/* Places List */}
      {places.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-slate-800 rounded-3xl text-center bg-slate-900/40">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No places found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            {currentLocation
              ? 'No places found nearby. Try searching or adjusting filters.'
              : 'Enable location access to discover nearby essential services, or use the search above.'}
          </p>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="p-8 text-center border border-slate-800 rounded-2xl bg-slate-900/40 text-slate-400 text-sm">
          No places found in category "{categories.find((c) => c.key === selectedCategory)?.label}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaces.map((place) => {
            const Icon = categoryIcons[place.category];
            return (
              <div
                key={place.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 shrink-0">
                    <Icon className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{place.name}</h3>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      {place.category.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{place.address}</span>
                  </div>

                  {currentLocation && (
                    <div className="flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-sky-400 font-medium">
                        {formatDistance(place.distanceMeters)}
                      </span>
                    </div>
                  )}

                  {place.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <a
                        href={`tel:${place.phoneNumber}`}
                        className="text-sky-400 hover:text-sky-300 transition"
                      >
                        {place.phoneNumber}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className={place.open24Hours ? 'text-emerald-400' : 'text-slate-400'}>
                      {place.open24Hours ? 'Open 24 hours' : 'Limited hours'}
                    </span>
                  </div>

                  {place.notes && (
                    <p className="text-slate-400 text-[11px] italic mt-2 pt-2 border-t border-slate-800">
                      {place.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredPlaces.length > 0 && (
        <div className="text-center text-xs text-slate-400">
          Showing {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''}{' '}
          {selectedCategory !== 'all' && `in ${categories.find((c) => c.key === selectedCategory)?.label}`}
        </div>
      )}
    </div>
  );
};

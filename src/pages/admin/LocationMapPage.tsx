import { useState, useEffect, useMemo } from 'react';
import { MapPinIcon, ListBulletIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { locationApi } from '../../api/admin';
import type { Location } from '../../types';
import { LocationMap } from '../../components/maps';

// Location types for filtering
const LOCATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'country', label: 'Country' },
  { value: 'state', label: 'State' },
  { value: 'city', label: 'City' },
  { value: 'building', label: 'Building' },
  { value: 'floor', label: 'Floor' },
  { value: 'room', label: 'Room' },
];

// Color mapping for location types
const getTypeColor = (type?: string): string => {
  const colorMap: Record<string, string> = {
    country: 'bg-blue-500',
    state: 'bg-green-500',
    city: 'bg-amber-500',
    building: 'bg-red-500',
    floor: 'bg-purple-500',
    room: 'bg-pink-500',
  };
  return colorMap[type?.toLowerCase() || ''] || 'bg-gray-500';
};

export default function LocationMapPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [filterType, setFilterType] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await locationApi.list();
        if (response.success && response.data) {
          setLocations(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Filter locations
  const filteredLocations = useMemo(() => {
    let filtered = locations;

    // Filter by type
    if (filterType) {
      filtered = filtered.filter((loc) => loc.type?.toLowerCase() === filterType.toLowerCase());
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          loc.code?.toLowerCase().includes(query) ||
          loc.address?.toLowerCase().includes(query)
      );
    }

    // Only return locations with coordinates
    return filtered.filter((loc) => loc.latitude !== undefined && loc.longitude !== undefined);
  }, [locations, filterType, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const withCoords = locations.filter((loc) => loc.latitude !== undefined && loc.longitude !== undefined);
    const withoutCoords = locations.filter((loc) => loc.latitude === undefined || loc.longitude === undefined);
    return {
      total: locations.length,
      withCoords: withCoords.length,
      withoutCoords: withoutCoords.length,
    };
  }, [locations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MapPinIcon className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Location Map</h1>
          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {stats.withCoords} / {stats.total} mapped
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-md ${
              showSidebar
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            <ListBulletIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <FunnelIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search locations..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location list */}
            <div className="flex-1 overflow-y-auto">
              {filteredLocations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <MapPinIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No locations with coordinates found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedLocation?.id === location.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(location.type)}`} />
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {location.name}
                        </span>
                      </div>
                      {location.code && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-5">
                          Code: {location.code}
                        </p>
                      )}
                      {location.type && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize mt-0.5 ml-5">
                          {location.type}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stats footer */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredLocations.length} of {stats.total} locations
                {stats.withoutCoords > 0 && (
                  <span className="ml-1">
                    ({stats.withoutCoords} without coordinates)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
          {/* Selected location info card */}
          {selectedLocation && (
            <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getTypeColor(selectedLocation.type)}`} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedLocation.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 space-y-1 text-sm">
                {selectedLocation.code && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Code:</span> {selectedLocation.code}
                  </p>
                )}
                {selectedLocation.type && (
                  <p className="text-gray-600 dark:text-gray-400 capitalize">
                    <span className="font-medium">Type:</span> {selectedLocation.type}
                  </p>
                )}
                {selectedLocation.address && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Address:</span> {selectedLocation.address}
                  </p>
                )}
                <p className="text-gray-500 dark:text-gray-500 text-xs">
                  Coordinates: {selectedLocation.latitude?.toFixed(6)}, {selectedLocation.longitude?.toFixed(6)}
                </p>
              </div>
            </div>
          )}

          <LocationMap
            locations={filteredLocations}
            selectedId={selectedLocation?.id}
            onSelect={setSelectedLocation}
            height="100%"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">Legend:</span>
        {LOCATION_TYPES.filter((t) => t.value).map((type) => (
          <div key={type.value} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${getTypeColor(type.value)}`} />
            <span>{type.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

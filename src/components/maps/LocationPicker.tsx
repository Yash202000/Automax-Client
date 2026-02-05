import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with webpack/vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  height = '300px',
  className = '',
}: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Default center (world center or provided coordinates)
  const defaultLat = latitude ?? 0;
  const defaultLng = longitude ?? 0;
  const defaultZoom = latitude && longitude ? 15 : 2;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([defaultLat, defaultLng], defaultZoom);
    mapRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add marker if coordinates exist
    if (latitude !== undefined && longitude !== undefined) {
      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationChange(pos.lat, pos.lng);
      });
    }

    // Handle map click to place/move marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }

      onLocationChange(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update marker position when props change
  useEffect(() => {
    if (!mapRef.current) return;

    if (latitude !== undefined && longitude !== undefined) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(mapRef.current);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }
    }
  }, [latitude, longitude, onLocationChange]);

  // Search for address using Nominatim (free geocoding service)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !mapRef.current) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'AutomaxWebApp/1.0',
          },
        }
      );

      if (!response.ok) {
        console.error('Location search failed:', response.status, response.statusText);
        throw new Error('Search failed');
      }

      const results = await response.json();

      if (results.length === 0) {
        setSearchError('No results found');
        return;
      }

      const { lat, lon } = results[0];
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      // Update map view
      mapRef.current.setView([latitude, longitude], 15);

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(mapRef.current);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }

      onLocationChange(latitude, longitude);
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onLocationChange]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={className}>
      {/* Search bar */}
      <div className="mb-2 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for an address..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md
            hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchError && (
        <p className="mb-2 text-sm text-red-500">{searchError}</p>
      )}

      {/* Map container */}
      <div
        ref={containerRef}
        className="rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ height, width: '100%' }}
      />

      {/* Current coordinates display */}
      {latitude !== undefined && longitude !== undefined && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">Coordinates:</span>{' '}
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}

      {/* Instructions */}
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Click on the map to set location, or drag the marker to adjust.
      </p>
    </div>
  );
}

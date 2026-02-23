import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import { MapPin, Loader2, Navigation, X } from 'lucide-react';
import { Button } from './Button';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon - using local images
const defaultIcon = new Icon({
  iconUrl: '/images/leaflet/marker-icon.png',
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  shadowUrl: '/images/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

interface LocationPickerProps {
  value?: LocationData;
  onChange: (location: LocationData | undefined) => void;
  required?: boolean;
  error?: string;
  label?: string;
}

interface NominatimResponse {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

// Component to recenter map when location changes
function MapCenterUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);

  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<LocationData>> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data: NominatimResponse = await response.json();

    return {
      address: data.display_name,
      city: data.address.city || data.address.town || data.address.village,
      state: data.address.state,
      country: data.address.country,
      postal_code: data.address.postcode,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {};
  }
}

export function LocationPicker({ value, onChange, required, error, label }: LocationPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [geoError, setGeoError] = useState<string>('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(
    value?.latitude && value?.longitude ? [value.latitude, value.longitude] : null
  );

  // Default center (can be customized)
  const defaultCenter: [number, number] = [25.276987, 55.296249]; // Dubai as default

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        const addressData = await reverseGeocode(latitude, longitude);

        const locationData: LocationData = {
          latitude,
          longitude,
          ...addressData,
        };

        onChange(locationData);
        setMapCenter([latitude, longitude]);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out');
            break;
          default:
            setGeoError('Failed to get location');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onChange]);

  const handleMapClick = useCallback(async (latlng: LatLng) => {
    setIsLoading(true);

    const addressData = await reverseGeocode(latlng.lat, latlng.lng);

    const locationData: LocationData = {
      latitude: latlng.lat,
      longitude: latlng.lng,
      ...addressData,
    };

    onChange(locationData);
    setMapCenter([latlng.lat, latlng.lng]);
    setIsLoading(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined);
    setMapCenter(null);
  }, [onChange]);

  const reverseAndSetLatLong = async () => {
    if (value?.latitude && value.longitude) {
      setIsLoading(true);

      const addressData = await reverseGeocode(value?.latitude, value?.longitude);

      const locationData: LocationData = {
        latitude: value.latitude,
        longitude: value.longitude,
        ...addressData,
      };

      onChange(locationData);
      setMapCenter([value.latitude, value.longitude]);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (value?.latitude && value.longitude) {
      reverseAndSetLatLong()
    }
  }, [value?.latitude, value?.longitude])

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={isLoading}
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        >
          {isLoading ? 'Getting location...' : 'Get Current Location'}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            leftIcon={<X className="w-4 h-4" />}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Map */}
      <div className="relative h-64 rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={mapCenter || defaultCenter}
          zoom={mapCenter ? 15 : 10}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <MapCenterUpdater center={mapCenter} />

          {value?.latitude && value?.longitude && (
            <Marker
              position={[value.latitude, value.longitude]}
              icon={defaultIcon}
            />
          )}
        </MapContainer>

        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Click on the map to select a location, or use the "Get Current Location" button
      </p>

      {/* Location Details */}
      {value && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {value?.latitude}, {value?.longitude}
              </p>
              {value.address && (
                <p className="text-sm text-gray-600 mt-1 break-words">{value.address}</p>
              )}
            </div>
          </div>

          {(value.city || value.state || value.country) && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
              {value.city && (
                <div>
                  <span className="font-medium">City:</span> {value.city}
                </div>
              )}
              {value.state && (
                <div>
                  <span className="font-medium">State:</span> {value.state}
                </div>
              )}
              {value.country && (
                <div>
                  <span className="font-medium">Country:</span> {value.country}
                </div>
              )}
              {value.postal_code && (
                <div>
                  <span className="font-medium">Postal Code:</span> {value.postal_code}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {(error || geoError) && (
        <p className="text-sm text-red-500">{error || geoError}</p>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { publicUrl } from "../../utils/publicUrl";
import { useTranslation } from "react-i18next";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { LatLng, Icon } from "leaflet";
import {
  MapPin,
  Loader2,
  Navigation,
  X,
  Search,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./Button";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon - using local images
const defaultIcon = new Icon({
  iconUrl: publicUrl("images/leaflet/marker-icon.png"),
  iconRetinaUrl: publicUrl("images/leaflet/marker-icon-2x.png"),
  shadowUrl: publicUrl("images/leaflet/marker-shadow.png"),
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
  // eslint-disable-next-line no-unused-vars
  onChange: (_location: LocationData | undefined) => void;
  required?: boolean;
  error?: string;
  label?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface NominatimResponse {
  display_name: string;
  lat: string;
  lon: string;
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
function MapClickHandler({
  onLocationSelect,
}: {
  // eslint-disable-next-line no-unused-vars
  onLocationSelect: (_latlng: LatLng) => void;
}) {
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

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<Partial<LocationData>> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
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
    // eslint-disable-next-line no-console
    console.error("Reverse geocoding error:", error);
    return {};
  }
}

export function LocationPicker({
  value,
  onChange,
  required,
  error,
  label,
  isExpanded = false,
  onToggleExpand,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResponse[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(
    value?.latitude && value?.longitude
      ? [value.latitude, value.longitude]
      : null,
  );

  const searchRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchTimeout = useRef<any>(null);

  // Default center
  const defaultCenter: [number, number] = [25.276987, 55.296249]; // Dubai as default

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
        {
          headers: {
            "Accept-Language": "en",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);

    if (query.length >= 3) {
      searchTimeout.current = setTimeout(() => {
        handleSearch(query);
      }, 500);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = useCallback(
    (suggestion: NominatimResponse) => {
      const lat = parseFloat(suggestion.lat);
      const lon = parseFloat(suggestion.lon);

      const locationData: LocationData = {
        latitude: lat,
        longitude: lon,
        address: suggestion.display_name,
        city:
          suggestion.address.city ||
          suggestion.address.town ||
          suggestion.address.village,
        state: suggestion.address.state,
        country: suggestion.address.country,
        postal_code: suggestion.address.postcode,
      };

      onChange(locationData);
      setMapCenter([lat, lon]);
      setSearchQuery(suggestion.display_name);
      setShowSuggestions(false);
    },
    [onChange],
  );

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t("locationPicker.geolocationNotSupported"));
      return;
    }

    setIsLoading(true);
    setGeoError("");

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
            setGeoError(t("locationPicker.permissionDenied"));
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError(t("locationPicker.locationUnavailable"));
            break;
          case error.TIMEOUT:
            setGeoError(t("locationPicker.locationTimeout"));
            break;
          default:
            setGeoError(t("locationPicker.locationFailed"));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [onChange, t]);

  const handleMapClick = useCallback(
    async (latlng: LatLng) => {
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
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
    setMapCenter(null);
  }, [onChange]);

  const reverseAndSetLatLong = async () => {
    if (value?.latitude && value.longitude) {
      setIsLoading(true);

      const addressData = await reverseGeocode(
        value?.latitude,
        value?.longitude,
      );

      const locationData: LocationData = {
        latitude: value.latitude,
        longitude: value.longitude,
        ...addressData,
      };

      onChange(locationData);
      setMapCenter([value.latitude, value.longitude]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (value?.latitude && value.longitude) {
      reverseAndSetLatLong();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.latitude, value?.longitude]);

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={isLoading}
          className="h-8 px-2 text-xs sm:h-9 sm:px-4 sm:text-sm"
          leftIcon={
            isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )
          }
        >
          {isLoading ? "Getting location..." : "Get Current Location"}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 text-xs sm:h-9 sm:px-4 sm:text-sm"
            leftIcon={<X className="w-4 h-4" />}
          >
            {t("locationPicker.clear")}
          </Button>
        )}
      </div>

      {/* Map */}
      <div
        className={`relative ${isExpanded ? "h-[500px]" : "h-64"} rounded-lg overflow-hidden border border-gray-200 group transition-all duration-300`}
      >
        <MapContainer
          center={mapCenter || defaultCenter}
          zoom={mapCenter ? 15 : 10}
          className="h-full w-full z-0"
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <MapCenterUpdater center={mapCenter} />
          <ZoomControl position={"bottomleft"} />

          {value?.latitude && value?.longitude && (
            <Marker
              position={[value.latitude, value.longitude]}
              icon={defaultIcon}
            />
          )}
        </MapContainer>

        {/* Search Overlay */}
        <div className="absolute top-3 left-3 right-3 z-1" ref={searchRef}>
          <div className="relative shadow-lg max-w-md mx-auto">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={onSearchChange}
              onFocus={() =>
                searchQuery.length >= 3 && setShowSuggestions(true)
              }
              className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              placeholder={t("locationPicker.searchAddress")}
            />
            {isSearching && (
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </span>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-11 mt-1 w-full max-w-md left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-50 last:border-0 transition-colors"
                >
                  <p className="font-medium text-gray-900 truncate">
                    {suggestion.display_name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expand Button Overlay */}
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="absolute bottom-3 right-3 z-[1000] p-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md hover:bg-white transition-all text-gray-600 hover:text-blue-600"
            title={
              isExpanded
                ? t("locationPicker.collapseMap")
                : t("locationPicker.expandMap")
            }
          >
            {isExpanded ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-[1001] flex items-center justify-center">
            <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {t("locationPicker.updating")}
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 font-medium italic">
        * {t("locationPicker.clickMapHint")}
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
                <p className="text-sm text-gray-600 mt-1 break-words">
                  {value.address}
                </p>
              )}
            </div>
          </div>

          {(value.city || value.state || value.country) && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
              {value.city && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.city")}:
                  </span>{" "}
                  {value.city}
                </div>
              )}
              {value.state && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.state")}:
                  </span>{" "}
                  {value.state}
                </div>
              )}
              {value.country && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.country")}:
                  </span>{" "}
                  {value.country}
                </div>
              )}
              {value.postal_code && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.postalCode")}:
                  </span>{" "}
                  {value.postal_code}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {(error || geoError) && (
        <div className="flex items-center gap-2 p-2 px-3 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error || geoError}</span>
        </div>
      )}
    </div>
  );
}

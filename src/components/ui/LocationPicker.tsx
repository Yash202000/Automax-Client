import React, { useState, useEffect, useCallback, useRef } from "react";
import { publicUrl } from "../../utils/publicUrl";
import BaseMapLayer from "../maps/BaseMapLayer";
import GoogleBaseMap from "../maps/google/GoogleBaseMap";
import MapFallbackNotice from "../maps/MapFallbackNotice";
import MapSwitch from "../maps/MapSwitch";
import { useMapProvider } from "../../utils/mapProvider";
import {
  reverseGeocodeGoogle,
  searchGooglePlaces,
  type GeoAddress,
  type PlaceSuggestion,
} from "../../utils/googleGeo";
import {
  AdvancedMarker,
  ControlPosition,
  useMap as useGoogleMap,
} from "@vis.gl/react-google-maps";
import { useTranslation } from "react-i18next";
import { integrationApi } from "@/api/integration";
import { toast } from "sonner";

import {
  MapContainer,
  Marker,
  useMapEvents,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { Icon } from "leaflet";
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

// window.APP_CONFIG is set by docker-entrypoint.sh at container start;
// import.meta.env.VITE_ENABLE_GIS only applies to local dev / build-time.
const ENABLE_GIS =
  window.APP_CONFIG?.ENABLE_GIS ?? import.meta.env.VITE_ENABLE_GIS;

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
  district?: string;
  gis?: {
    plan_no: string;
    street_fullname: string;
    district_name: string;
    municipality_name: string;
    isInsideBoundary: boolean;
  };
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
    county?: string;
    state_district?: string;
    district?: string;
    province?: string;
  };
}

// Component to handle map clicks
function MapClickHandler({
  onLocationSelect,
}: {
  // eslint-disable-next-line no-unused-vars
  onLocationSelect: (_latlng: { lat: number; lng: number }) => void;
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

// Same as MapCenterUpdater, for the native Google map.
function GoogleMapCenterUpdater({
  center,
}: {
  center: [number, number] | null;
}) {
  const map = useGoogleMap();

  useEffect(() => {
    if (map && center) {
      map.panTo({ lat: center[0], lng: center[1] });
      map.setZoom(15);
    }
  }, [center, map]);

  return null;
}

async function reverseGeocode(
  lat: number,
  lng: number,
  useGoogle = false,
): Promise<Partial<LocationData>> {
  try {
    let base: GeoAddress;
    if (useGoogle) {
      base = await reverseGeocodeGoogle(lat, lng);
    } else {
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
      base = {
        address: data.display_name,
        city: data.address.city || data.address.town || data.address.village,
        state: data.address.state || data.address.province,
        country: data.address.country,
        postal_code: data.address.postcode,
        district:
          data.address.district ||
          data.address.county ||
          data.address.state_district ||
          data.address.suburb,
      };
    }
    let gisData = undefined;
    if (ENABLE_GIS === "true") {
      gisData = await integrationApi.gisLocation({ lat, lng });
      if (!gisData?.data?.isInsideBoundary) {
        toast.error("Location is outside the boundary");
      }
    }

    const gisAddress = `${gisData?.data?.plan_no}, ${gisData?.data?.street_fullname}, ${gisData?.data?.municipality_name}, ${gisData?.data?.district_name}`;

    return {
      ...base,
      address:
        ENABLE_GIS === "true" && gisData?.data?.isInsideBoundary
          ? gisAddress
          : base.address,
      gis: gisData ? gisData.data : undefined,
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
  const { provider } = useMapProvider();
  const isGoogle = provider === "google";
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(
    value?.latitude && value?.longitude
      ? [value.latitude, value.longitude]
      : null,
  );
  const [GISData, setGISData] = useState<any>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        if (isGoogle) {
          setSuggestions(await searchGooglePlaces(query));
          setShowSuggestions(true);
          return;
        }

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
          {
            headers: {
              "Accept-Language": "en",
            },
          },
        );

        if (response.ok) {
          const data: NominatimResponse[] = await response.json();
          setSuggestions(
            data.map((result) => ({
              label: result.display_name,
              resolve: async () => ({
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                address: result.display_name,
                city:
                  result.address.city ||
                  result.address.town ||
                  result.address.village,
                state: result.address.state || result.address.province,
                country: result.address.country,
                postal_code: result.address.postcode,
                district:
                  result.address.district ||
                  result.address.county ||
                  result.address.state_district ||
                  result.address.suburb,
              }),
            })),
          );
          setShowSuggestions(true);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [isGoogle],
  );

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
    async (suggestion: PlaceSuggestion) => {
      let locationData: LocationData;
      try {
        locationData = await suggestion.resolve();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Place lookup error:", err);
        return;
      }

      onChange(locationData);
      setMapCenter([locationData.latitude, locationData.longitude]);
      setSearchQuery(suggestion.label);
      setShowSuggestions(false);

      // Restore focus to input to avoid browser scroll-to-top on suggestion button unmount
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
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
        const addressData = await reverseGeocode(latitude, longitude, isGoogle);

        const locationData: LocationData = {
          latitude,
          longitude,
          ...addressData,
        };
        setGISData(locationData.gis);
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
  }, [onChange, t, isGoogle]);

  const handleMapClick = useCallback(
    async (latlng: { lat: number; lng: number }) => {
      setIsLoading(true);
      const addressData = await reverseGeocode(
        latlng.lat,
        latlng.lng,
        isGoogle,
      );

      const locationData: LocationData = {
        latitude: latlng.lat,
        longitude: latlng.lng,
        ...addressData,
      };
      setGISData(locationData.gis);
      onChange(locationData);
      setMapCenter([latlng.lat, latlng.lng]);
      setIsLoading(false);
    },
    [onChange, isGoogle],
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
        isGoogle,
      );

      const locationData: LocationData = {
        latitude: value.latitude,
        longitude: value.longitude,
        ...addressData,
      };

      setGISData(locationData.gis);
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
        <label className="block text-sm font-medium text-foreground">
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
          {isLoading
            ? t("locationPicker.gettingLocation")
            : t("locationPicker.getCurrentLocation")}
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
        className={`relative ${isExpanded ? "h-[500px]" : "h-64"} rounded-lg overflow-hidden border group transition-all duration-300`}
        style={{
          border:
            !GISData?.isInsideBoundary &&
            GISData !== null &&
            ENABLE_GIS === "true"
              ? "2px solid red"
              : "",
        }}
      >
        {/* Controls are positioned clear of the search box (top) and the
            expand button (bottom right). */}
        <MapSwitch
          google={
            <GoogleBaseMap
              defaultCenter={{
                lat: (mapCenter || defaultCenter)[0],
                lng: (mapCenter || defaultCenter)[1],
              }}
              defaultZoom={mapCenter ? 15 : 10}
              controls
              zoomControlOptions={{ position: ControlPosition.RIGHT_CENTER }}
              streetViewControlOptions={{ position: ControlPosition.RIGHT_TOP }}
              mapTypeControlOptions={{ position: ControlPosition.BOTTOM_LEFT }}
              onClick={(e) => {
                const latLng = e.detail.latLng;
                if (latLng)
                  handleMapClick({ lat: latLng.lat, lng: latLng.lng });
              }}
            >
              <GoogleMapCenterUpdater center={mapCenter} />
              {value?.latitude && value?.longitude && (
                <AdvancedMarker
                  position={{ lat: value.latitude, lng: value.longitude }}
                />
              )}
            </GoogleBaseMap>
          }
          osm={
            <>
              <MapContainer
                center={mapCenter || defaultCenter}
                zoom={mapCenter ? 15 : 10}
                className={"h-full w-full z-0"}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <BaseMapLayer />
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
              <MapFallbackNotice className="bottom-3 start-14" />
            </>
          }
        />

        {/* Search Overlay */}
        <div className="absolute top-3 left-3 right-3 z-1" ref={searchRef}>
          <div className="relative shadow-lg max-w-md mx-auto">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={onSearchChange}
              onFocus={() =>
                searchQuery.length >= 3 && setShowSuggestions(true)
              }
              className="block w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-foreground"
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
                    {suggestion.label}
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

          {(value.city || value.state || value.country) &&
            ENABLE_GIS === "false" && (
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
          {ENABLE_GIS === "true" && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
              {GISData?.district_name && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.district")}:
                  </span>{" "}
                  {GISData?.district_name}
                </div>
              )}
              {GISData?.municipality_name && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.municipality")}:
                  </span>{" "}
                  {GISData?.municipality_name}
                </div>
              )}
              {GISData?.street_fullname && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.street")}:
                  </span>{" "}
                  {GISData?.street_fullname}
                </div>
              )}
              {GISData?.plan_no && (
                <div>
                  <span className="font-medium">
                    {t("locationPicker.planNo")}:
                  </span>{" "}
                  {GISData?.plan_no}
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

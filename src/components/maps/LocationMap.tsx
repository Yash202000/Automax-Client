import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../../types';

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

interface LocationMapProps {
  locations: Location[];
  selectedId?: string;
  onSelect?: (location: Location) => void;
  height?: string;
  className?: string;
  center?: [number, number];
  zoom?: number;
}

// Color mapping for location types
const getMarkerColor = (type?: string): string => {
  const colorMap: Record<string, string> = {
    country: '#3b82f6', // blue
    state: '#22c55e',   // green
    city: '#f59e0b',    // amber
    building: '#ef4444', // red
    floor: '#8b5cf6',   // purple
    room: '#ec4899',    // pink
  };
  return colorMap[type?.toLowerCase() || ''] || '#6b7280'; // gray default
};

const createColoredIcon = (color: string, isSelected: boolean = false): L.DivIcon => {
  const size = isSelected ? 32 : 24;
  const borderWidth = isSelected ? 3 : 2;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ${isSelected ? 'transform: scale(1.2);' : ''}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

export default function LocationMap({
  locations,
  selectedId,
  onSelect,
  height = '400px',
  className = '',
  center = [0, 0],
  zoom = 2,
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Filter locations that have coordinates
  const locationsWithCoords = locations.filter(
    (loc) => loc.latitude !== undefined && loc.longitude !== undefined
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current).setView(center, zoom);
    mapRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (locationsWithCoords.length === 0) return;

    const bounds = L.latLngBounds([]);

    locationsWithCoords.forEach((location) => {
      if (location.latitude === undefined || location.longitude === undefined) return;

      const isSelected = location.id === selectedId;
      const color = getMarkerColor(location.type);
      const icon = createColoredIcon(color, isSelected);

      const marker = L.marker([location.latitude, location.longitude], { icon })
        .addTo(mapRef.current!);

      // Create popup content
      const popupContent = `
        <div style="min-width: 150px;">
          <strong style="font-size: 14px;">${location.name}</strong>
          ${location.code ? `<br/><span style="color: #666; font-size: 12px;">Code: ${location.code}</span>` : ''}
          ${location.type ? `<br/><span style="color: #888; font-size: 11px; text-transform: capitalize;">${location.type}</span>` : ''}
          ${location.address ? `<br/><span style="color: #666; font-size: 11px;">${location.address}</span>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);

      // Handle click
      marker.on('click', () => {
        if (onSelect) {
          onSelect(location);
        }
      });

      markersRef.current.set(location.id, marker);
      bounds.extend([location.latitude, location.longitude]);
    });

    // Fit map to show all markers
    if (locationsWithCoords.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locations, locationsWithCoords, selectedId, onSelect]);

  // Update selected marker appearance
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const location = locationsWithCoords.find((loc) => loc.id === id);
      if (!location) return;

      const isSelected = id === selectedId;
      const color = getMarkerColor(location.type);
      const icon = createColoredIcon(color, isSelected);
      marker.setIcon(icon);

      // Center map on selected location
      if (isSelected && location.latitude && location.longitude && mapRef.current) {
        mapRef.current.panTo([location.latitude, location.longitude]);
        marker.openPopup();
      }
    });
  }, [selectedId, locationsWithCoords]);

  return (
    <div
      ref={containerRef}
      className={`rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      style={{ height, width: '100%' }}
    />
  );
}

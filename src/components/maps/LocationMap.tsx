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

const createColoredIcon = (color: string, isSelected: boolean = false, count: number = 1): L.DivIcon => {
  const size = isSelected ? 32 : 24;
  const borderWidth = isSelected ? 3 : 2;
  const isGroup = count > 1;

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
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size * 0.4}px;
        ${isSelected ? 'transform: scale(1.2);' : ''}
      ">
        ${isGroup ? count : ''}
      </div>
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

    // Group locations by exact coordinates
    const groups = new Map<string, Location[]>();
    locationsWithCoords.forEach((loc) => {
      const key = `${loc.latitude},${loc.longitude}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(loc);
    });

    const bounds = L.latLngBounds([]);

    groups.forEach((items, coords) => {
      const [lat, lng] = coords.split(',').map(Number);
      const isSelected = items.some((item) => item.id === selectedId);
      const count = items.length;

      // Use the first item's type for the marker color
      const color = getMarkerColor(items[0].type);
      const icon = createColoredIcon(color, isSelected, count);

      const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current!);

      // Create popup content
      const isGroup = count > 1;
      const popupContent = `
        <div style="min-width: 200px; max-height: 300px; overflow-y: auto; padding-right: 5px;">
          ${isGroup ? `<h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-weight: bold;">${count} Incidents</h4>` : ''}
          ${items.map((location, idx) => `
            <div style="margin-bottom: 12px; padding-bottom: 8px; ${idx < items.length - 1 ? 'border-bottom: 1px dashed #eee;' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <strong style="font-size: 14px; color: #1e293b; display: block;">${location.name}</strong>
                <span style="font-size: 10px; background: #f1f5f9; padding: 1px 4px; border-radius: 4px; color: #64748b;">${location.code}</span>
              </div>
              <p style="margin: 4px 0; font-size: 12px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${location.description || ''}</p>
              ${location.address ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${location.address}</div>` : ''}
              <div style="margin-top: 6px;">
                <a href="/incidents/${location.id}" style="color: #3b82f6; font-size: 12px; text-decoration: none; font-weight: 500;">View Detail →</a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      marker.bindPopup(popupContent);

      // Handle click
      marker.on('click', () => {
        if (onSelect && items.length === 1) {
          onSelect(items[0]);
        }
      });

      items.forEach((item) => {
        markersRef.current.set(item.id, marker);
      });
      bounds.extend([lat, lng]);
    });

    // Fit map to show all markers
    if (locationsWithCoords.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locationsWithCoords, selectedId, onSelect]);

  // Update selected marker appearance
  useEffect(() => {
    // This is handled in the main useEffect now to avoid complex re-mapping
    // But we still need to pan to selected markers if needed
    if (selectedId && markersRef.current.has(selectedId) && mapRef.current) {
      const marker = markersRef.current.get(selectedId)!;
      const latlng = marker.getLatLng();
      mapRef.current.panTo(latlng);
      marker.openPopup();
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className={`rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      style={{ height, width: '100%' }}
    />
  );
}

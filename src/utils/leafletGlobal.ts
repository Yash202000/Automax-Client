import L from "leaflet";

// Leaflet plugins such as leaflet.markercluster extend the global `L`, which
// doesn't exist under ES modules. Import this module BEFORE the plugin.
(window as unknown as { L: typeof L }).L = L;

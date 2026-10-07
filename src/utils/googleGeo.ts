// Google Places search + reverse geocoding for the location picker (used when a
// Google Maps API key is configured). Results are shaped like the Nominatim
// ones the picker already handles, so the rest of the form is unchanged.

export interface GeoAddress {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  district?: string;
}

export interface PlaceSuggestion {
  label: string;
  // Looks up the chosen place's coordinates and address details.
  resolve: () => Promise<GeoAddress & { latitude: number; longitude: number }>;
}

// Data is stored in English regardless of the UI language, like the Nominatim
// requests (Accept-Language: en) this replaces.
const DATA_LANGUAGE = "en";
const API_WAIT_MS = 15000;

// The Maps JavaScript API script is loaded by <GoogleMapsGate> in the map; wait
// for it, then import the requested library.
async function importLibrary<K extends "places" | "geocoding">(
  name: K,
): Promise<google.maps.ImportLibraryMap[K]> {
  const started = Date.now();
  while (!window.google?.maps?.importLibrary) {
    if (Date.now() - started > API_WAIT_MS) {
      throw new Error("Google Maps API is not available");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return google.maps.importLibrary(name) as Promise<
    google.maps.ImportLibraryMap[K]
  >;
}

interface AddressPart {
  long: string;
  types: string[];
}

function toAddress(parts: AddressPart[], formatted?: string): GeoAddress {
  const find = (...types: string[]) => {
    for (const type of types) {
      const part = parts.find((p) => p.types.includes(type));
      if (part) return part.long;
    }
    return undefined;
  };
  return {
    address: formatted,
    city: find("locality", "postal_town", "administrative_area_level_3"),
    state: find("administrative_area_level_1"),
    country: find("country"),
    postal_code: find("postal_code"),
    district: find(
      "sublocality_level_1",
      "sublocality",
      "neighborhood",
      "administrative_area_level_2",
    ),
  };
}

// One autocomplete "session" covers the typing plus the final place lookup,
// which is how Google bills it as a single request.
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;

export async function searchGooglePlaces(
  query: string,
): Promise<PlaceSuggestion[]> {
  const { AutocompleteSuggestion, AutocompleteSessionToken } =
    await importLibrary("places");
  if (!sessionToken) sessionToken = new AutocompleteSessionToken();

  const { suggestions } =
    await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      sessionToken,
      language: DATA_LANGUAGE,
    });

  return suggestions
    .filter((s) => s.placePrediction)
    .slice(0, 5)
    .map((s) => {
      const prediction = s.placePrediction!;
      return {
        label: prediction.text.text,
        resolve: async () => {
          const place = prediction.toPlace();
          await place.fetchFields({
            fields: ["location", "formattedAddress", "addressComponents"],
          });
          sessionToken = null; // selection ends the session
          const location = place.location!;
          return {
            latitude: location.lat(),
            longitude: location.lng(),
            ...toAddress(
              (place.addressComponents ?? []).map((c) => ({
                long: c.longText ?? "",
                types: c.types,
              })),
              place.formattedAddress ?? prediction.text.text,
            ),
          };
        },
      };
    });
}

export async function reverseGeocodeGoogle(
  lat: number,
  lng: number,
): Promise<GeoAddress> {
  const { Geocoder } = await importLibrary("geocoding");
  const { results } = await new Geocoder().geocode({
    location: { lat, lng },
    language: DATA_LANGUAGE,
  });
  const best = results[0];
  if (!best) throw new Error("No geocoding result");
  return toAddress(
    best.address_components.map((c) => ({ long: c.long_name, types: c.types })),
    best.formatted_address,
  );
}

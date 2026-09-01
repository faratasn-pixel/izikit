// GEOCODE-01 — best-effort city/country → lat/lon via OpenStreetMap's free
// Nominatim search API. No API key. Every failure mode (non-ok response,
// empty result set, thrown network error) resolves to `null` rather than
// throwing — callers treat geocoding as optional enrichment, never a hard
// dependency of the listing-detail response.
import 'server-only';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export async function geocodeCity(city: string, country: string): Promise<GeoPoint | null> {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(`${city}, ${country}`)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HabitatAfrikOffi/1.0' },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = rows[0];
    if (!first) return null;
    const lat = Number.parseFloat(first.lat);
    const lon = Number.parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

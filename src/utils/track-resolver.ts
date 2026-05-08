import { TRACK_SLUGS } from '../assets/data/TrackList';

export interface TrackLocation {
  center: [number, number];
  data: any;
  countryCode?: string;
}

/**
 * Smart Resolver: GitHub -> Nominatim Geocoder
 * Resolves a track name to its geographic location and racing line data.
 */
export async function resolveTrackLocation(trackName: string): Promise<TrackLocation | null> {
  const slug = TRACK_SLUGS[trackName];
  
  // 1. Try GitHub first for precise racing line
  if (slug) {
    try {
      const response = await fetch(`https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/${slug}.geojson`);
      if (response.ok) {
        const data = await response.json();
        if (data.features?.length > 0) {
          const geom = data.features[0].geometry;
          let center: [number, number] = [0, 0];
          
          if (geom.type === 'Polygon') {
            center = geom.coordinates[0][0];
          } else if (geom.type === 'LineString') {
            center = geom.coordinates[0];
          } else if (geom.type === 'MultiLineString') {
            center = geom.coordinates[0][0];
          }
          
          // Extract country code from slug (e.g., "it-1922" -> "it")
          const countryCode = slug.split('-')[0];
          
          return { center, data, countryCode };
        }
      }
    } catch (e) {
      console.warn(`[TrackResolver] GitHub fetch failed for ${slug}:`, e);
    }
  }

  // 2. Fallback: Geocode using Nominatim
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trackName)}`);
    const json = await response.json();
    if (json.length > 0) {
      const result = json[0];
      return { 
        center: [parseFloat(result.lon), parseFloat(result.lat)], 
        data: null,
        // Nominatim might provide country_code in the address part if we use reverse or more params
      };
    }
  } catch (e) {
    console.warn(`[TrackResolver] Geocoding failed for ${trackName}:`, e);
  }

  return null;
}

/**
 * Curated Region & Administrative Travel Destinations Registry
 *
 * Provides a small, explicit, documented fallback registry for major region-level,
 * island, and provincial travel destinations that geocoding providers (such as Open-Meteo)
 * typically omit from basic populated-place (city/town) index searches.
 *
 * Features standard GeoNames IDs, ISO country codes, administrative division names,
 * and standard geographic coordinates.
 */

import { GeocodingLocation } from "./types";

export const REGIONAL_DESTINATIONS: GeocodingLocation[] = [
  {
    id: 1267254,
    name: "Kerala",
    country: "India",
    countryCode: "IN",
    admin1: "Kerala",
    latitude: 10.8505,
    longitude: 76.2711,
    timezone: "Asia/Kolkata",
    population: 34630192,
    featureCode: "ADM1",
  },
  {
    id: 1271157,
    name: "Goa",
    country: "India",
    countryCode: "IN",
    admin1: "Goa",
    latitude: 15.2993,
    longitude: 74.1240,
    timezone: "Asia/Kolkata",
    population: 1458545,
    featureCode: "ADM1",
  },
  {
    id: 1650535,
    name: "Bali",
    country: "Indonesia",
    countryCode: "ID",
    admin1: "Bali",
    latitude: -8.4095,
    longitude: 115.1889,
    timezone: "Asia/Makassar",
    population: 4317404,
    featureCode: "ADM1",
  },
  {
    id: 5855797,
    name: "Hawaii",
    country: "United States",
    countryCode: "US",
    admin1: "Hawaii",
    latitude: 19.8968,
    longitude: -155.5828,
    timezone: "Pacific/Honolulu",
    population: 1455271,
    featureCode: "ADM1",
  },
  {
    id: 3165361,
    name: "Tuscany",
    country: "Italy",
    countryCode: "IT",
    admin1: "Tuscany",
    latitude: 43.7711,
    longitude: 11.2486,
    timezone: "Europe/Rome",
    population: 3729641,
    featureCode: "ADM1",
  },
  {
    id: 2523119,
    name: "Sicily",
    country: "Italy",
    countryCode: "IT",
    admin1: "Sicily",
    latitude: 37.5999,
    longitude: 14.0154,
    timezone: "Europe/Rome",
    population: 4999891,
    featureCode: "ADM1",
  },
  {
    id: 253394,
    name: "Santorini",
    country: "Greece",
    countryCode: "GR",
    admin1: "South Aegean",
    latitude: 36.3932,
    longitude: 25.4615,
    timezone: "Europe/Athens",
    population: 15550,
    featureCode: "ISL",
  },
  {
    id: 149812,
    name: "Zanzibar",
    country: "Tanzania",
    countryCode: "TZ",
    admin1: "Zanzibar",
    latitude: -6.1659,
    longitude: 39.2026,
    timezone: "Africa/Dar_es_Salaam",
    population: 1303569,
    featureCode: "ADM1",
  },
  {
    id: 1151254,
    name: "Phuket",
    country: "Thailand",
    countryCode: "TH",
    admin1: "Phuket",
    latitude: 7.9519,
    longitude: 98.3381,
    timezone: "Asia/Bangkok",
    population: 416582,
    featureCode: "ADM1",
  },
];

/**
 * Searches the regional destinations registry for entries matching the query and optional country filter.
 */
export function findRegionalDestinations(query: string, countryFilter?: string): GeocodingLocation[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const cFilter = countryFilter ? countryFilter.trim().toLowerCase() : "";

  return REGIONAL_DESTINATIONS.filter((region) => {
    const nameMatch = region.name.toLowerCase().includes(q) || q.includes(region.name.toLowerCase());
    if (!nameMatch) return false;

    if (cFilter) {
      const countryMatch =
        (region.country && region.country.toLowerCase().includes(cFilter)) ||
        (region.countryCode && region.countryCode.toLowerCase() === cFilter);
      if (!countryMatch) return false;
    }

    return true;
  });
}

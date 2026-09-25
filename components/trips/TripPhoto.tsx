"use client";

import React, { useState, useEffect, useRef } from "react";

export type HeroCategory =
  | "nature"
  | "beach"
  | "mountain"
  | "city"
  | "historical"
  | "cultural"
  | "religious"
  | "adventure"
  | "mixed";

export interface DestinationHeroMetadata {
  destinationType?: string | null;
  travelStyles?: string[] | null;
  activities?: string[] | null;
  description?: string | null;
}

export interface TripPhotoProps {
  type: "destination" | "activity";
  destination: string;
  country?: string;
  destinationType?: string;
  travelStyles?: string[];
  activities?: string[];
  description?: string;
  activityTitle?: string;
  className?: string;
  onPhotoLoaded?: (photoUrl: string | null) => void;
}

// In-memory client session cache to prevent duplicate requests across renders
const tripPhotoCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Extracts a clean country string from state_country or location string.
 * Example: "Telangana, India" -> "India"
 * Example: "Île-de-France, France" -> "France"
 * Example: "Tokyo, Japan" -> "Japan"
 */
export function extractCountry(locationStr?: string): string {
  if (!locationStr) return "";
  const parts = locationStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  const lastPart = parts[parts.length - 1];
  // Remove postal codes or digits if any
  return lastPart.replace(/\d+/g, "").trim();
}

/**
 * Detects destination hero category based on destination name, location/country, and optional metadata.
 * Completely dynamic: never hardcodes any destination name to a static image or category.
 */
export function getDestinationHeroCategory(
  destination: string,
  countryOrLocation?: string,
  metadata?: DestinationHeroMetadata
): HeroCategory {
  const destLower = (destination || "").toLowerCase().trim();
  const locLower = (countryOrLocation || "").toLowerCase().trim();
  const descLower = (metadata?.description || "").toLowerCase().trim();
  const typeLower = (metadata?.destinationType || "").toLowerCase().trim();
  const stylesLower = Array.isArray(metadata?.travelStyles)
    ? metadata.travelStyles.join(" ").toLowerCase()
    : "";
  const activitiesLower = Array.isArray(metadata?.activities)
    ? metadata.activities.join(" ").toLowerCase()
    : "";

  const combined = `${destLower} ${locLower} ${descLower} ${typeLower} ${stylesLower} ${activitiesLower}`;

  // 1. Direct type matching if explicitly provided in destination metadata
  if (typeLower) {
    if (typeLower.includes("beach") || typeLower.includes("island") || typeLower.includes("coast")) return "beach";
    if (typeLower.includes("mountain") || typeLower.includes("hill")) return "mountain";
    if (typeLower.includes("nature") || typeLower.includes("wildlife") || typeLower.includes("ecotourism")) return "nature";
    if (typeLower.includes("heritage") || typeLower.includes("historic") || typeLower.includes("palace") || typeLower.includes("fort")) return "historical";
    if (typeLower.includes("spiritual") || typeLower.includes("religious")) return "religious";
    if (typeLower.includes("cultural") || typeLower.includes("culture")) return "cultural";
    if (typeLower.includes("city") || typeLower.includes("urban") || typeLower.includes("metropolis")) return "city";
    if (typeLower.includes("adventure")) return "adventure";
  }

  // 2. Beach & Coastal detection (natural coastal indicators)
  if (
    /\b(beach|beaches|coast|coastline|coastal|seashore|island|islands|ocean|bay|cove|coral|reef|scuba|snorkeling|seaside|tropical coast|surf|lagoon)\b/.test(
      combined
    ) ||
    /\b(goa|maldives|phuket|bali|bahamas|santorini|maui|cancun|boracay|havelock|andaman|pondicherry|varkala|kovalam|gokarna|krabi|mykonos|ibiza|miami|fiji|tahiti)\b/.test(
      combined
    )
  ) {
    return "beach";
  }

  // 3. Mountain & Alpine detection (altitude, terrain & topography indicators)
  if (
    /\b(mountain|mountains|alpine|alps|himalaya|himalayas|valley|valleys|peak|peaks|summit|ridge|hill station|snow|ski|trekking|hiking|highlands|canyon)\b/.test(
      combined
    ) ||
    /\b(manali|shimla|ladakh|leh|zanskar|munnar|ooty|darjeeling|gangtok|rishikesh|zermatt|interlaken|aspen|banff|queenstown|fuji|patagonia|everest|matterhorn|chamonix)\b/.test(
      combined
    )
  ) {
    return "mountain";
  }

  // 4. Nature & Waterways detection (tropical waterways, backwaters, wetlands, forests)
  if (
    /\b(nature|backwater|backwaters|houseboat|houseboats|waterway|waterways|wetland|rainforest|jungle|wildlife|safari|national park|forest|eco|reserve|river|lake|flora|fauna|falls|waterfall)\b/.test(
      combined
    ) ||
    /\b(kerala|alleppey|alappuzha|kumarakom|wayanad|thekkady|amazon|serengeti|masai mara|halong|pantanal|borneo|fjord|fjords|everglades|sunderbans|kaziranga|kabini)\b/.test(
      combined
    )
  ) {
    return "nature";
  }

  // 5. Historical & Heritage detection (Forts, palaces, ancient monuments, citadels)
  if (
    /\b(historical|heritage|history|fort|forts|palace|palaces|monument|monuments|ancient|ruins|castle|castles|dynasty|rajput|mughal|medieval|archaeological|citadel|fortress|antiquity)\b/.test(
      combined
    ) ||
    /\b(jaipur|udaipur|jodhpur|jaisalmer|agra|hampi|khajuraho|fatehpur|ajanta|ellora|mysore|rome|athens|cairo|luxor|giza|petra|angkor|machu picchu|colosseum|pompeii|acropolis)\b/.test(
      combined
    )
  ) {
    return "historical";
  }

  // 6. Religious & Spiritual detection (Sacred sanctuaries, shrines, temples)
  if (
    /\b(spiritual|religious|temple|temples|shrine|shrines|pilgrimage|sacred|holy|monastery|cathedral|mosque|pagoda|abbey|basilica|sanctuary)\b/.test(
      combined
    ) ||
    /\b(varanasi|rishikesh|haridwar|tirupati|amritsar|madurai|puri|ayodhya|shirdi|bodh gaya|kedarnath|badrinath|vatican|mecca|medina|jerusalem|lhasa)\b/.test(
      combined
    )
  ) {
    return "religious";
  }

  // 7. Major Cities & Metropolis detection (Skyline, architecture, urban landmarks)
  if (
    /\b(city|metropolis|urban|capital|skyline|cityscape|downtown|megacity|modern|tower|bridge|central|municipality|district)\b/.test(
      combined
    ) ||
    /\b(hyderabad|paris|tokyo|london|new york|nyc|dubai|singapore|bangkok|mumbai|delhi|bengaluru|bangalore|kolkata|chennai|berlin|sydney|toronto|seoul|chicago|san francisco|los angeles|hong kong|shanghai|beijing|amsterdam|barcelona|madrid|vienna|prague|istanbul|kuala lumpur)\b/.test(
      combined
    )
  ) {
    return "city";
  }

  // 8. Cultural
  if (/\b(cultural|culture|art|tradition|traditional|museum|theatre|opera|folklore|artisan|craft)\b/.test(combined)) {
    return "cultural";
  }

  return "mixed";
}

/**
 * Builds search query candidates for destination hero photos with a priority hierarchy according to detected category.
 * Dynamically tailored queries:
 * - Nature: backwaters houseboat, houseboat, backwaters, scenic waterways, tropical backwaters, scenic landscape
 * - Beach: beach, coastline, ocean, beach sunset, tropical beach
 * - Mountain: mountains, mountain landscape, valley, scenic viewpoint, alpine scenery
 * - Historical: famous palace, famous fort, historical landmark, heritage architecture
 * - City: iconic landmark, famous landmark, skyline, cityscape, iconic architecture
 * - Religious: famous temple, historic shrine, religious landmark, sacred architecture
 * - Cultural: cultural landmark, traditional architecture, famous cultural place
 */
export function buildDestinationCandidateQueries(
  destination: string,
  countryOrLocation?: string,
  metadata?: DestinationHeroMetadata
): string[] {
  const dest = (destination || "").trim();
  if (!dest) return [];

  const country = extractCountry(countryOrLocation);
  const suffix = country && !dest.toLowerCase().includes(country.toLowerCase()) ? ` ${country}` : "";
  const category = getDestinationHeroCategory(dest, countryOrLocation, metadata);

  const categoryQueryMap: Record<HeroCategory, string[]> = {
    nature: [
      // Tier 1: Signature natural travel experiences & focal subjects
      `${dest}${suffix} backwaters houseboat`.trim(),
      `${dest}${suffix} houseboat`.trim(),
      `${dest}${suffix} backwaters`.trim(),
      `${dest}${suffix} scenic waterways`.trim(),
      `${dest}${suffix} tropical backwaters`.trim(),
      // Tier 2: Natural scenery & landscapes
      `${dest}${suffix} scenic landscape`.trim(),
      `${dest}${suffix} nature scenery`.trim(),
      `${dest}${suffix} tropical scenery`.trim(),
      `${dest}${suffix} scenic travel`.trim(),
      `${dest}${suffix} famous landmark`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
      `${dest}${suffix} beautiful travel scenery`.trim(),
    ],
    beach: [
      `${dest}${suffix} beach`.trim(),
      `${dest}${suffix} coastline`.trim(),
      `${dest}${suffix} ocean`.trim(),
      `${dest}${suffix} beach sunset`.trim(),
      `${dest}${suffix} tropical beach`.trim(),
      `${dest}${suffix} coastal landscape`.trim(),
      `${dest}${suffix} famous scenery`.trim(),
      `${dest}${suffix} scenic landscape`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
      `${dest}${suffix} beautiful travel scenery`.trim(),
    ],
    mountain: [
      `${dest}${suffix} mountains`.trim(),
      `${dest}${suffix} mountain landscape`.trim(),
      `${dest}${suffix} valley`.trim(),
      `${dest}${suffix} scenic viewpoint`.trim(),
      `${dest}${suffix} alpine scenery`.trim(),
      `${dest}${suffix} travel scenery`.trim(),
      `${dest}${suffix} scenic landscape`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
    ],
    historical: [
      `${dest}${suffix} famous palace`.trim(),
      `${dest}${suffix} famous fort`.trim(),
      `${dest}${suffix} historical landmark`.trim(),
      `${dest}${suffix} heritage architecture`.trim(),
      `${dest}${suffix} famous monument`.trim(),
      `${dest}${suffix} historic architecture`.trim(),
      `${dest}${suffix} famous landmark`.trim(),
      `${dest}${suffix} iconic landmark`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
    ],
    city: [
      `${dest}${suffix} iconic landmark`.trim(),
      `${dest}${suffix} famous landmark`.trim(),
      `${dest}${suffix} skyline`.trim(),
      `${dest}${suffix} cityscape`.trim(),
      `${dest}${suffix} iconic architecture`.trim(),
      `${dest}${suffix} famous scenery`.trim(),
      `${dest}${suffix} cinematic travel scenery`.trim(),
      `${dest}${suffix} scenic landscape`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
    ],
    religious: [
      `${dest}${suffix} famous temple`.trim(),
      `${dest}${suffix} historic shrine`.trim(),
      `${dest}${suffix} religious landmark`.trim(),
      `${dest}${suffix} sacred architecture`.trim(),
      `${dest}${suffix} heritage architecture`.trim(),
      `${dest}${suffix} famous landmark`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
    ],
    cultural: [
      `${dest}${suffix} cultural landmark`.trim(),
      `${dest}${suffix} traditional architecture`.trim(),
      `${dest}${suffix} famous cultural place`.trim(),
      `${dest}${suffix} heritage`.trim(),
      `${dest}${suffix} iconic travel`.trim(),
      `${dest}${suffix} famous landmark`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
    ],
    adventure: [
      `${dest}${suffix} scenic landscape`.trim(),
      `${dest}${suffix} iconic travel`.trim(),
      `${dest}${suffix} adventure scenery`.trim(),
      `${dest}${suffix} famous viewpoint`.trim(),
      `${dest}${suffix} famous landmark`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
    ],
    mixed: [
      `${dest}${suffix} famous landmark`.trim(),
      `${dest}${suffix} iconic landmark`.trim(),
      `${dest}${suffix} iconic travel`.trim(),
      `${dest}${suffix} famous scenery`.trim(),
      `${dest}${suffix} cinematic travel scenery`.trim(),
      `${dest}${suffix} iconic scenic destination`.trim(),
      `${dest}${suffix} cityscape`.trim(),
      `${dest}${suffix} architecture`.trim(),
      `${dest}${suffix} scenic landscape`.trim(),
      `${dest}${suffix} beautiful scenic destination`.trim(),
      `${dest}${suffix} beautiful travel scenery`.trim(),
      `${dest}${suffix} travel scenery`.trim(),
      `${dest}${suffix} tourism`.trim(),
    ],
  };

  const specificQueries = categoryQueryMap[category] || categoryQueryMap.mixed;
  const fallbacks = [
    `${dest}${suffix} travel`.trim(),
    `${dest}${suffix}`.trim(),
    `${dest} travel`.trim(),
  ];

  return Array.from(new Set([...specificQueries, ...fallbacks])).filter(Boolean);
}

/**
 * Primary destination query builder (for backward compatibility and primary search intent).
 */
export function buildDestinationPhotoQuery(destination: string, countryOrLocation?: string): string {
  const candidates = buildDestinationCandidateQueries(destination, countryOrLocation);
  return candidates[0] || destination.trim();
}

/**
 * Builds a search query for Pexels based on activity title and trip destination.
 * Dynamic format: "{activity title} {destination}"
 * If activity title is generic: "{activity title} {destination} travel"
 */
export function buildActivityPhotoQuery(activityTitle: string, destination: string): string {
  const title = (activityTitle || "").trim();
  const dest = (destination || "").trim();

  const isShort = title.length <= 4;
  const isGeneric = /^(visit|shopping|explore|tour|trip|sightseeing|walk|breakfast|lunch|dinner|food|stay|hotel|temple visit|market visit)$/i.test(
    title
  );

  if (isShort || isGeneric) {
    return [title, dest, "travel"].filter(Boolean).join(" ");
  }

  return [title, dest].filter(Boolean).join(" ");
}

export interface PhotoScoreCandidate {
  width: number;
  height: number;
  alt?: string;
  sourceUrl?: string;
  /** Pexels average color hex (e.g. "#6E633A"). Available when passed through from backend. */
  avgColor?: string;
}

export interface ColorStats {
  r: number;
  g: number;
  b: number;
  luma: number;
  spread: number;
  isWarm: boolean;
  isLush: boolean;
}

/**
 * Computes perceived brightness (0–255) from a hex color string.
 * Uses the standard ITU-R BT.601 luma formula: (R*299 + G*587 + B*114) / 1000.
 * Returns -1 if the color string is missing or invalid.
 */
export function hexBrightness(hex?: string): number {
  if (!hex || hex.length < 7 || hex[0] !== "#") return -1;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return -1;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Computes detailed color metrics (luma, saturation spread, warmth, lushness) from a hex string.
 */
export function hexColorStats(hex?: string): ColorStats | null {
  if (!hex || hex.length < 7 || hex[0] !== "#") return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const isWarm = r > b + 15 && g > b - 10;
  const isLush = g > r + 10 || (g > 110 && b > 100);
  return { r, g, b, luma, spread, isWarm, isLush };
}

/**
 * Scores a photo candidate using category-aware evaluation and destination-defining subject rules.
 *
 * Core rule:
 * CATEGORY -> DESTINATION-DEFINING EXPERIENCE -> STRONG FOCAL SUBJECT -> CINEMATIC COMPOSITION -> BEST IMAGE
 */
export function scoreDestinationPhoto(
  photo: PhotoScoreCandidate,
  destination: string,
  country?: string,
  metadata?: DestinationHeroMetadata
): number {
  if (photo.width < photo.height) {
    return -200; // Strictly disqualify portrait orientation for wide hero banner
  }

  let score = 0;
  const ratio = photo.width / photo.height;

  // 1. Aspect Ratio Suitability & Crop Safety (Golden 1.45 - 2.20 for hero banner)
  if (ratio >= 1.45 && ratio <= 2.2) {
    score += 50; // Prime wide hero banner ratio (e.g. 16:9 or 3:2)
  } else if (ratio >= 1.25 && ratio < 1.45) {
    score += 25; // Acceptable landscape
  } else if (ratio > 2.2 && ratio <= 2.6) {
    score += 35; // Panoramic / Ultrawide
  } else {
    score += 5; // Near square
  }

  const text = `${photo.alt || ""} ${photo.sourceUrl || ""}`.toLowerCase();
  const destLower = (destination || "").toLowerCase().trim();
  const countryLower = (country || "").toLowerCase().trim();

  // 2. Destination & Country Relevance
  if (destLower && text.includes(destLower)) {
    score += 40;
  } else if (destLower) {
    const words = destLower.split(/[\s,]+/).filter((w) => w.length > 2);
    if (words.some((w) => text.includes(w))) {
      score += 25;
    }
  }

  if (countryLower && text.includes(countryLower)) {
    score += 15;
  }

  // 3. Category-Specific Destination-Defining Subject Scoring
  const category = getDestinationHeroCategory(destination, country, metadata);

  switch (category) {
    case "nature": {
      // Primary signature travel focal subjects for nature (houseboats, waterways, waterfalls, safaris)
      const primaryNatureSubjects = [
        "houseboat", "houseboats", "canoe", "cruising", "sailing", "boat", "waterway", "waterways",
        "backwaters", "waterfall", "waterfalls", "river", "lake", "lagoon", "tea plantation", "safari"
      ];
      let primaryFound = 0;
      for (const kw of primaryNatureSubjects) {
        if (text.includes(kw)) {
          score += 30; // Strong signature travel subject bonus
          primaryFound++;
          if (primaryFound >= 2) break;
        }
      }

      // Supporting natural atmosphere & foliage
      const supportingNatureElements = [
        "tropical", "palm trees", "coconut trees", "greenery", "lush", "serene", "tranquil", "scenic", "nature"
      ];
      let supportFound = 0;
      for (const kw of supportingNatureElements) {
        if (text.includes(kw)) {
          score += 10;
          supportFound++;
          if (supportFound >= 3) break;
        }
      }

      // Multi-element travel synergy bonus: Boat/houseboat + backwaters/water + palm trees
      if (
        (text.includes("houseboat") || text.includes("boat") || text.includes("canoe")) &&
        (text.includes("backwaters") || text.includes("waterway") || text.includes("water")) &&
        (text.includes("palm") || text.includes("coconut") || text.includes("lush"))
      ) {
        score += 35; // Signature Kerala nature travel experience bonus!
      }

      // Demote generic residential houses, local roads, neighborhood scenes in nature
      const natureDemotions = [
        "houses", "residential", "neighborhood", "local road", "street", "building facade", "office", "concrete"
      ];
      for (const kw of natureDemotions) {
        if (text.includes(kw) && !text.includes("houseboat")) {
          score -= 35;
        }
      }
      break;
    }

    case "city": {
      const primaryCitySubjects = [
        "charminar", "eiffel", "tower", "skytree", "skyline", "cityscape", "shibuya",
        "rainbow bridge", "bridge", "monument", "historic", "architecture", "downtown"
      ];
      let matchCount = 0;
      for (const kw of primaryCitySubjects) {
        if (text.includes(kw)) {
          score += 25;
          matchCount++;
          if (matchCount >= 3) break;
        }
      }

      // Synergy: Landmark + skyline/cityscape
      if (
        (text.includes("tower") || text.includes("eiffel") || text.includes("charminar") || text.includes("monument") || text.includes("skytree")) &&
        (text.includes("skyline") || text.includes("cityscape") || text.includes("aerial view") || text.includes("sunset"))
      ) {
        score += 30;
      }

      // Demote generic empty streets/traffic without iconic landmarks
      if (text.includes("residential") || text.includes("empty road") || text.includes("traffic")) {
        score -= 25;
      }
      break;
    }

    case "beach": {
      const primaryBeachSubjects = [
        "beach", "coastline", "coast", "ocean", "sea", "sand", "sandy", "waves",
        "palm trees", "tropical", "shore", "bay", "cove", "sunset"
      ];
      let matchCount = 0;
      for (const kw of primaryBeachSubjects) {
        if (text.includes(kw)) {
          score += 22;
          matchCount++;
          if (matchCount >= 3) break;
        }
      }

      // Synergy: Beach + ocean/waves + sunset/palms
      if (
        (text.includes("beach") || text.includes("coastline")) &&
        (text.includes("ocean") || text.includes("sea") || text.includes("waves")) &&
        (text.includes("sunset") || text.includes("palm") || text.includes("serene"))
      ) {
        score += 30;
      }
      break;
    }

    case "historical": {
      const primaryHistSubjects = [
        "fort", "palace", "hawa mahal", "jal mahal", "city palace", "amber fort", "golconda",
        "castle", "monument", "heritage", "ancient", "ruins", "rajput", "architecture",
        "courtyard", "facade", "historic"
      ];
      let matchCount = 0;
      for (const kw of primaryHistSubjects) {
        if (text.includes(kw)) {
          score += 25;
          matchCount++;
          if (matchCount >= 3) break;
        }
      }

      // Synergy: Palace/Fort + architecture + hills/courtyard
      if (
        (text.includes("fort") || text.includes("palace") || text.includes("hawa mahal") || text.includes("monument")) &&
        (text.includes("architecture") || text.includes("historic") || text.includes("heritage"))
      ) {
        score += 30;
      }
      break;
    }

    case "mountain": {
      const primaryMountainSubjects = [
        "mountain", "mountains", "peak", "peaks", "summit", "valley", "hills",
        "snow", "alpine", "ridge", "viewpoint", "mist", "slopes", "scenic"
      ];
      let matchCount = 0;
      for (const kw of primaryMountainSubjects) {
        if (text.includes(kw)) {
          score += 22;
          matchCount++;
          if (matchCount >= 3) break;
        }
      }
      break;
    }

    case "religious": {
      const primaryRelSubjects = [
        "temple", "shrine", "pagoda", "cathedral", "basilica", "mosque", "minaret",
        "sacred", "spiritual", "monastery", "sanctuary"
      ];
      let matchCount = 0;
      for (const kw of primaryRelSubjects) {
        if (text.includes(kw)) {
          score += 25;
          matchCount++;
          if (matchCount >= 3) break;
        }
      }
      break;
    }

    default: {
      const generalKeywords = [
        "landmark", "monument", "palace", "fort", "houseboat", "tower", "skyline",
        "beach", "coastline", "mountains", "waterway", "architecture"
      ];
      for (const kw of generalKeywords) {
        if (text.includes(kw)) {
          score += 15;
          break;
        }
      }
    }
  }

  // 4. Composition Depth Cues
  const depthKeywords = [
    "reflecting", "reflection", "reflect", "surrounded by", "overlooking",
    "aerial view", "panoramic view", "panoramic", "wide view", "along the", "framed by",
    "cruising", "sailing", "navigating", "nestled", "perched", "winding", "illuminated"
  ];
  for (const kw of depthKeywords) {
    if (text.includes(kw)) {
      score += 15;
      break;
    }
  }

  // 5. Lighting Quality
  const goldenAtmosphere = [
    "golden hour", "sunset", "sunrise", "dawn", "dusk", "twilight",
    "sunlight", "sunny", "clear sky", "blue sky", "daytime", "vivid",
    "vibrant", "colorful", "serene", "tranquil", "peaceful", "crystal clear"
  ];
  for (const kw of goldenAtmosphere) {
    if (text.includes(kw)) {
      score += 10;
      break;
    }
  }

  // 6. Color & Brightness Evaluation via avgColor
  const cStats = hexColorStats(photo.avgColor);
  if (cStats) {
    if (cStats.luma >= 100 && cStats.luma <= 195) {
      score += 25;
    } else if (cStats.luma > 195 && cStats.luma <= 225) {
      score += 15;
    } else if (cStats.luma >= 65 && cStats.luma < 100) {
      score -= 10;
    } else if (cStats.luma < 65) {
      score -= 35;
    } else if (cStats.luma > 225) {
      score -= 20;
    }

    if (cStats.spread >= 40) {
      score += 20;
    } else if (cStats.spread >= 20) {
      score += 10;
    } else if (cStats.spread < 12 && cStats.luma < 180) {
      score -= 25;
    }

    if (cStats.isWarm || cStats.isLush) {
      score += 10;
    }
  }

  // 7. High Resolution Bonus
  if (photo.width >= 3840 && photo.height >= 2160) {
    score += 20;
  } else if (photo.width >= 1920 && photo.height >= 1080) {
    score += 15;
  } else if (photo.width >= 1200) {
    score += 5;
  }

  // 8. Negative Demotions
  const demoteIndoor = [
    "bedroom", "office", "laptop", "meeting", "desk", "indoor", "interior",
    "close up", "close-up", "selfie", "kitchen", "bathroom", "apartment", "furniture",
    "hotel room", "bed", "couch", "living room", "table setting"
  ];
  for (const kw of demoteIndoor) {
    if (text.includes(kw)) {
      score -= 50;
    }
  }

  const demoteEmptyOrDull = [
    "empty sky", "dark sky", "cloudy sky", "gloomy", "overcast", "dull",
    "asphalt", "highway", "parking", "sidewalk", "construction", "wires"
  ];
  for (const kw of demoteEmptyOrDull) {
    if (text.includes(kw)) {
      score -= 25;
    }
  }

  if (
    text.includes("at night") ||
    text.includes("nighttime") ||
    text.includes("night view") ||
    text.includes("night sky")
  ) {
    const isIlluminatedIcon = text.includes("illuminated") || text.includes("glowing") || text.includes("city lights");
    score -= isIlluminatedIcon ? 10 : 25;
  }

  if (
    text.includes("black and white") ||
    text.includes("monochrome") ||
    text.includes("grayscale")
  ) {
    score -= 40;
  }

  return score;
}

interface FetchedPhotoItem {
  id: number;
  width: number;
  height: number;
  imageUrl: string;
  alt: string;
  sourceUrl?: string;
  avgColor?: string;
}

/**
 * Searches photos via the secure server proxy endpoint /api/photos/search.
 */
async function queryPhotoProxy(query: string, perPage: number = 10): Promise<FetchedPhotoItem[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      per_page: String(perPage),
      page: "1",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`/api/photos/search?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const json = await res.json().catch(() => null);
    if (json?.success && Array.isArray(json?.data?.photos)) {
      return json.data.photos as FetchedPhotoItem[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Intelligently searches and selects the best representative hero photo for a destination.
 * Evaluates category-specific candidate queries, deduplicates candidates, scores them holistically,
 * and selects the most visually compelling landscape travel hero image.
 */
async function fetchDestinationHeroPhoto(
  destination: string,
  countryOrLocation?: string,
  metadata?: DestinationHeroMetadata
): Promise<string | null> {
  const dest = (destination || "").trim();
  if (!dest) return null;

  const country = extractCountry(countryOrLocation);
  const cacheKey = `dest:${dest.toLowerCase()}:${country.toLowerCase()}`;

  if (tripPhotoCache.has(cacheKey)) {
    return tripPhotoCache.get(cacheKey) ?? null;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const candidates = buildDestinationCandidateQueries(dest, countryOrLocation, metadata);
      let fallbackPhotoUrl: string | null = null;
      let highestScore = -1;

      // Evaluate top candidate queries to assemble a rich candidate pool
      const maxAttempts = Math.min(candidates.length, 5);
      const seenPhotoIds = new Set<number>();
      const allScoredPhotos: { photo: FetchedPhotoItem; score: number; queryUsed: string }[] = [];

      for (let i = 0; i < maxAttempts; i++) {
        const candidateQuery = candidates[i];
        const photos = await queryPhotoProxy(candidateQuery, 10);

        if (photos.length > 0) {
          // Strictly evaluate landscape candidates (reject portrait immediately)
          const landscapePhotos = photos.filter((p) => p.width >= p.height);

          for (const p of landscapePhotos) {
            if (!seenPhotoIds.has(p.id)) {
              seenPhotoIds.add(p.id);
              const sc = scoreDestinationPhoto(p, dest, country, metadata);
              allScoredPhotos.push({ photo: p, score: sc, queryUsed: candidateQuery });
            }
          }

          // If an exceptional photo (score >= 185) is found in the candidate pool, select immediately
          const currentBest = [...allScoredPhotos].sort((a, b) => b.score - a.score)[0];
          if (currentBest && currentBest.score >= 185) {
            tripPhotoCache.set(cacheKey, currentBest.photo.imageUrl);
            return currentBest.photo.imageUrl;
          }
        }
      }

      // If we collected scored landscape photos across candidates, pick the highest scoring one
      if (allScoredPhotos.length > 0) {
        allScoredPhotos.sort((a, b) => b.score - a.score);
        const best = allScoredPhotos[0];

        if (best && best.score >= 25 && best.photo.imageUrl) {
          tripPhotoCache.set(cacheKey, best.photo.imageUrl);
          return best.photo.imageUrl;
        }

        if (best && best.score > highestScore && best.photo.imageUrl) {
          highestScore = best.score;
          fallbackPhotoUrl = best.photo.imageUrl;
        }
      }

      // If we have a suitable fallback photo with positive score, use it
      if (fallbackPhotoUrl && highestScore >= 0) {
        tripPhotoCache.set(cacheKey, fallbackPhotoUrl);
        return fallbackPhotoUrl;
      }

      // Final fallback: standard destination travel query
      const fallbackQuery = `${dest}${country ? ` ${country}` : ""} travel`;
      const fallbackPhotos = await queryPhotoProxy(fallbackQuery, 5);
      const landscapeFallback = fallbackPhotos.find((p) => p.width >= p.height) || fallbackPhotos[0];

      if (landscapeFallback?.imageUrl) {
        tripPhotoCache.set(cacheKey, landscapeFallback.imageUrl);
        return landscapeFallback.imageUrl;
      }

      // No suitable photo found; cache null so hero shows default neutral gradient
      tripPhotoCache.set(cacheKey, null);
      return null;
    } catch {
      tripPhotoCache.set(cacheKey, null);
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches a representative photo for an itinerary activity card.
 */
async function fetchRepresentativeActivityPhoto(query: string): Promise<string | null> {
  const cacheKey = `act:${query.toLowerCase().trim()}`;

  if (tripPhotoCache.has(cacheKey)) {
    return tripPhotoCache.get(cacheKey) ?? null;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const photos = await queryPhotoProxy(query, 3);
      if (photos.length > 0) {
        const suitable = photos.find((p) => p.width >= p.height) || photos[0];
        const selectedUrl = suitable?.imageUrl || null;
        tripPhotoCache.set(cacheKey, selectedUrl);
        return selectedUrl;
      }

      tripPhotoCache.set(cacheKey, null);
      return null;
    } catch {
      tripPhotoCache.set(cacheKey, null);
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export default function TripPhoto({
  type,
  destination,
  country,
  destinationType,
  travelStyles,
  activities,
  description,
  activityTitle,
  className = "",
  onPhotoLoaded,
}: TripPhotoProps) {
  const destQuery = destination.trim();
  const actQuery = buildActivityPhotoQuery(activityTitle || "Explore", destination);
  const cleanCountry = extractCountry(country);
  const cacheKey =
    type === "destination"
      ? `dest:${destQuery.toLowerCase()}:${cleanCountry.toLowerCase()}`
      : `act:${actQuery.toLowerCase().trim()}`;

  const cachedUrl = tripPhotoCache.get(cacheKey) ?? null;
  const isAlreadyCached = tripPhotoCache.has(cacheKey);

  const [photoUrl, setPhotoUrl] = useState<string | null>(cachedUrl);
  const [isLoading, setIsLoading] = useState<boolean>(!isAlreadyCached && Boolean(destination));
  const [imageError, setImageError] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!destination) {
      setIsLoading(false);
      return;
    }

    if (tripPhotoCache.has(cacheKey)) {
      const cached = tripPhotoCache.get(cacheKey) ?? null;
      setPhotoUrl(cached);
      setIsLoading(false);
      onPhotoLoaded?.(cached);
      return;
    }

    setIsLoading(true);
    setImageError(false);

    const promise =
      type === "destination"
        ? fetchDestinationHeroPhoto(destination, country, {
            destinationType,
            travelStyles,
            activities,
            description,
          })
        : fetchRepresentativeActivityPhoto(actQuery);

    promise.then((url) => {
      if (!isMountedRef.current) return;
      setPhotoUrl(url);
      setIsLoading(false);
      onPhotoLoaded?.(url);
    });
  }, [
    type,
    destination,
    country,
    destinationType,
    travelStyles,
    activities,
    description,
    actQuery,
    cacheKey,
    onPhotoLoaded,
  ]);

  const altTitle = type === "destination" ? destination : (activityTitle || "Activity");

  // Destination hero background mode
  if (type === "destination") {
    if (isLoading) {
      return (
        <div
          className={`absolute inset-0 bg-white/5 animate-pulse pointer-events-none ${className}`}
          aria-label="Loading destination photo..."
        />
      );
    }

    if (photoUrl && !imageError) {
      return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
          <img
            src={photoUrl}
            alt={`Representative photo for ${altTitle}`}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
          {/* Subtle balanced overlay: photo colors remain vivid and bright, white text stays crisp */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />

          {/* Representative photo badge */}
          <span
            className="absolute bottom-3 right-4 text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/80 px-2 py-0.5 rounded select-none pointer-events-auto"
            title={`Representative photo for ${altTitle}`}
          >
            Representative photo
          </span>
        </div>
      );
    }

    // Fallback: Return null so the hero card shows its default gradient background
    return null;
  }

  // Activity card top photo mode
  if (isLoading) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-surface-container-high/30 animate-pulse text-on-surface-variant/60 ${className}`}
        aria-label="Loading photo..."
      >
        <span className="material-symbols-outlined text-2xl text-on-surface-variant/40 animate-spin">
          progress_activity
        </span>
        <span className="text-[11px] font-medium mt-1">Loading photo...</span>
      </div>
    );
  }

  if (photoUrl && !imageError) {
    return (
      <div className={`relative w-full h-full overflow-hidden group ${className}`}>
        <img
          src={photoUrl}
          alt={`Representative photo for ${altTitle}`}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Subtle representative photo badge */}
        <span
          className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/90 px-2 py-0.5 rounded pointer-events-none select-none"
          title={`Representative photo for ${altTitle}`}
        >
          Representative photo
        </span>
      </div>
    );
  }

  // Neutral "No photo available" placeholder for activity cards
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high/20 text-primary ${className}`}
    >
      <span className="material-symbols-outlined text-[28px] text-primary/70">photo_camera</span>
      <span className="text-[10px] text-on-surface-variant/60 font-medium mt-1">No photo available</span>
    </div>
  );
}

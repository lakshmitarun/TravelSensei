/**
 * Destination-Aware Attraction Strategy & Diversity Ranking Module
 *
 * Classifies destination archetypes from available metadata, defines curated Geoapify category groups,
 * and performs multi-candidate deduplication and diversity-aware ranking.
 */

import type { AttractionItem, AttractionDestinationCategory } from "./types";

export interface AttractionMetadataContext {
  destinationType?: string;
  travelStyles?: string[] | string;
  activities?: string[] | string;
  description?: string;
}

/**
 * Normalizes an attraction name for deduplication.
 */
export function normalizeAttractionName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Determines the destination archetype category based on available metadata.
 */
export function getAttractionSearchStrategy(
  destinationName?: string,
  stateCountry?: string,
  metadata?: AttractionMetadataContext
): AttractionDestinationCategory {
  const destLower = (destinationName || "").toLowerCase().trim();
  const locLower = (stateCountry || "").toLowerCase().trim();
  const descLower = (metadata?.description || "").toLowerCase().trim();
  const typeLower = (metadata?.destinationType || "").toLowerCase().trim();
  const stylesLower = Array.isArray(metadata?.travelStyles)
    ? metadata.travelStyles.join(" ").toLowerCase()
    : typeof metadata?.travelStyles === "string"
    ? metadata.travelStyles.toLowerCase()
    : "";
  const activitiesLower = Array.isArray(metadata?.activities)
    ? metadata.activities.join(" ").toLowerCase()
    : typeof metadata?.activities === "string"
    ? metadata.activities.toLowerCase()
    : "";

  const combined = `${destLower} ${locLower} ${descLower} ${typeLower} ${stylesLower} ${activitiesLower}`;

  // 1. Explicit destinationType matching
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

  // 2. Keyword matching across combined destination context
  if (
    /\b(beach|beaches|coast|coastline|coastal|seashore|island|islands|ocean|bay|cove|coral|scuba|snorkeling|goa|maldives|phuket|bali|bahamas|santorini|maui|cancun|boracay|havelock|andaman|pondicherry|varkala|kovalam|gokarna|krabi|mykonos|ibiza|miami|fiji|tahiti)\b/.test(
      combined
    )
  ) {
    return "beach";
  }

  if (
    /\b(mountain|mountains|alpine|alps|himalaya|himalayas|valley|valleys|peak|peaks|summit|ridge|hill station|snow|ski|trekking|hiking|manali|shimla|ladakh|leh|zanskar|munnar|ooty|darjeeling|gangtok|rishikesh|zermatt|interlaken|aspen|banff|queenstown|fuji|patagonia|everest|matterhorn|chamonix)\b/.test(
      combined
    )
  ) {
    return "mountain";
  }

  if (
    /\b(nature|natural|backwaters|backwater|waterfall|waterfalls|lake|lakes|river|rivers|jungle|rainforest|forest|wildlife|safari|national park|sanctuary|wetland|wetlands|ecotourism|lagoon|kerala|alleppey|alappuzha|kumarakom|wayanad|thekkady|periyar|coorg|kaziranga|sunderbans|serengeti|masai mara|galapagos|amazon|bali)\b/.test(
      combined
    )
  ) {
    return "nature";
  }

  if (
    /\b(historic|historical|heritage|palace|palaces|fort|forts|castle|castles|ruin|ruins|ancient|monument|monuments|archaeological|unesco|jaipur|agra|udaipur|jodhpur|hampi|mysore|khajuraho|rome|athens|cairo|luxor|petra|machu picchu|angkor|florence|prague|vienna)\b/.test(
      combined
    )
  ) {
    return "historical";
  }

  if (
    /\b(temple|temples|mosque|mosques|church|churches|shrine|shrines|pilgrimage|sacred|spiritual|holy|religious|varanasi|tirupati|amritsar|madurai|puri|haridwar|rishikesh|mecca|medina|vatican|jerusalem|bodh gaya|lumbini|kyoto)\b/.test(
      combined
    )
  ) {
    return "religious";
  }

  if (
    /\b(culture|cultural|museum|museums|art|theatre|opera|folklore|tradition|traditional)\b/.test(
      combined
    )
  ) {
    return "cultural";
  }

  if (
    /\b(adventure|trek|rafting|kayaking|scuba|diving|climbing|paragliding|bungee|caving|expedition|safari)\b/.test(
      combined
    )
  ) {
    return "adventure";
  }

  if (
    /\b(city|metropolis|urban|skyline|downtown|financial|shopping|hyderabad|paris|tokyo|london|new york|singapore|dubai|bangkok|berlin|sydney|chicago|toronto|barcelona|milan|hong kong|seoul|mumbai|bengaluru|delhi)\b/.test(
      combined
    )
  ) {
    return "city";
  }

  return "mixed";
}

/**
 * Returns prioritized Geoapify category groups tailored to a destination archetype.
 * Uses only verified official Geoapify Places categories.
 */
export function getCategoryGroupsForStrategy(
  category: AttractionDestinationCategory
): string[][] {
  switch (category) {
    case "nature":
      return [
        ["natural", "natural.water", "natural.forest"],
        ["tourism.attraction.viewpoint", "leisure.park.nature_reserve"],
        ["beach", "leisure.park"],
        ["tourism.sights.castle", "tourism.sights.place_of_worship", "entertainment.museum", "tourism.attraction"],
      ];

    case "beach":
      return [
        ["beach", "natural.water"],
        ["tourism.attraction.viewpoint", "man_made.lighthouse", "tourism.attraction"],
        ["tourism.sights.castle", "tourism.sights.ruines", "tourism.sights"],
        ["leisure.park", "leisure.park.nature_reserve"],
      ];

    case "mountain":
      return [
        ["natural.mountain", "natural.forest", "natural"],
        ["tourism.attraction.viewpoint", "leisure.park.nature_reserve"],
        ["tourism.attraction", "tourism.sights", "tourism.sights.place_of_worship"],
        ["leisure.park", "natural.water"],
      ];

    case "historical":
      return [
        ["tourism.sights.castle", "tourism.sights.ruines", "tourism.sights.archaeological_site"],
        ["tourism.sights", "tourism.attraction"],
        ["entertainment.museum", "tourism.sights.place_of_worship"],
        ["tourism.attraction.viewpoint", "leisure.park.garden"],
      ];

    case "religious":
    case "cultural":
      return [
        ["tourism.sights.place_of_worship", "tourism.sights.place_of_worship.temple", "tourism.sights.monastery"],
        ["entertainment.culture", "entertainment.museum", "tourism.sights"],
        ["tourism.sights.castle", "tourism.sights.ruines", "tourism.attraction"],
        ["tourism.attraction.viewpoint", "leisure.park"],
      ];

    case "adventure":
      return [
        ["natural.mountain", "natural.forest", "natural"],
        ["tourism.attraction.viewpoint", "leisure.park.nature_reserve"],
        ["natural.water", "beach"],
        ["tourism.attraction", "tourism.sights"],
      ];

    case "city":
      return [
        ["tourism.sights", "tourism.attraction"],
        ["entertainment.museum", "entertainment.culture"],
        ["tourism.attraction.viewpoint", "tourism.sights.castle", "tourism.sights.ruines"],
        ["leisure.park", "leisure.park.garden", "tourism.sights.place_of_worship"],
      ];

    case "mixed":
    default:
      return [
        ["tourism.sights", "tourism.attraction"],
        ["tourism.attraction.viewpoint", "natural", "leisure.park.nature_reserve"],
        ["entertainment.museum", "tourism.sights.castle", "tourism.sights.place_of_worship"],
        ["leisure.park", "beach", "natural.water"],
      ];
  }
}

export type CategoryBucket =
  | "beach"
  | "water"
  | "mountain"
  | "nature"
  | "viewpoint"
  | "heritage"
  | "religious"
  | "culture"
  | "park"
  | "sights";

/**
 * Maps categories to a high-level diversity bucket.
 */
export function getPrimaryCategoryBucket(categories: string[] = []): CategoryBucket {
  const catStr = categories.join(" ").toLowerCase();
  if (catStr.includes("beach")) return "beach";
  if (catStr.includes("natural.water") || catStr.includes("waterway")) return "water";
  if (catStr.includes("natural.mountain") || catStr.includes("cliff")) return "mountain";
  if (catStr.includes("natural") || catStr.includes("forest") || catStr.includes("nature_reserve")) return "nature";
  if (catStr.includes("viewpoint")) return "viewpoint";
  if (catStr.includes("castle") || catStr.includes("ruines") || catStr.includes("archaeological")) return "heritage";
  if (catStr.includes("place_of_worship") || catStr.includes("temple") || catStr.includes("monastery") || catStr.includes("shrine")) return "religious";
  if (catStr.includes("museum") || catStr.includes("culture")) return "culture";
  if (catStr.includes("park") || catStr.includes("garden")) return "park";
  return "sights";
}

/**
 * Checks if two coordinate pairs are within approximately 50 meters of each other.
 */
function areCoordinatesVeryClose(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): boolean {
  const dLat = Math.abs(lat1 - lat2);
  const dLon = Math.abs(lon1 - lon2);
  return dLat < 0.0005 && dLon < 0.0005;
}

/**
 * Merges candidate items from multiple category queries, deduplicates by place_id,
 * normalized name, and coordinates, and performs a diversity-aware ranking.
 */
export function deduplicateAndRankAttractions(
  candidateGroups: AttractionItem[][],
  destinationCategory: AttractionDestinationCategory,
  maxResults: number = 20
): AttractionItem[] {
  const seenPlaceIds = new Set<string>();
  const seenNames = new Set<string>();
  const uniqueCandidates: AttractionItem[] = [];

  // 1. Flatten and deduplicate candidates
  for (const group of candidateGroups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      if (!item || !item.name || typeof item.name !== "string") continue;
      const rawName = item.name.trim();
      if (!rawName || rawName.toLowerCase() === "unnamed" || rawName.toLowerCase() === "unnamed attraction") continue;

      const normName = normalizeAttractionName(rawName);
      if (normName.length < 2) continue;

      // Check Place ID
      if (item.place_id && seenPlaceIds.has(item.place_id)) {
        continue;
      }

      // Check Normalized Name
      if (seenNames.has(normName)) {
        continue;
      }

      // Check Coordinate Proximity against already accepted candidates
      const isNearbyDuplicate = uniqueCandidates.some((existing) =>
        areCoordinatesVeryClose(existing.latitude, existing.longitude, item.latitude, item.longitude) &&
        (existing.name.toLowerCase().includes(normName) || normName.includes(existing.name.toLowerCase()))
      );
      if (isNearbyDuplicate) {
        continue;
      }

      if (item.place_id) seenPlaceIds.add(item.place_id);
      seenNames.add(normName);
      uniqueCandidates.push(item);
    }
  }

  // 2. Score Candidates based on destination archetype, category richness, and distance
  interface ScoredCandidate {
    item: AttractionItem;
    score: number;
    primaryCat: CategoryBucket;
  }

  const scored: ScoredCandidate[] = uniqueCandidates.map((item) => {
    let score = 100;
    const cats = item.categories || [];
    const catStr = cats.join(" ").toLowerCase();
    const nameLower = (item.name || "").toLowerCase();

    // Distance factor (closer is moderately preferred, up to 25 pts)
    if (typeof item.distance === "number" && isFinite(item.distance)) {
      score -= Math.min(25, (item.distance / 25000) * 25);
    }

    // Category relevance scoring based on destination archetype
    if (destinationCategory === "nature") {
      if (catStr.includes("natural.water") || catStr.includes("beach") || nameLower.includes("lake") || nameLower.includes("backwater") || nameLower.includes("kayal")) score += 40;
      if (catStr.includes("viewpoint") || catStr.includes("nature_reserve")) score += 35;
      if (catStr.includes("natural.mountain") || catStr.includes("natural.forest")) score += 30;
      if (catStr.includes("castle") || catStr.includes("museum") || catStr.includes("place_of_worship")) score += 20;
    } else if (destinationCategory === "beach") {
      if (catStr.includes("beach") || catStr.includes("natural.water")) score += 45;
      if (catStr.includes("viewpoint") || catStr.includes("lighthouse")) score += 35;
      if (catStr.includes("castle") || catStr.includes("sights")) score += 20;
    } else if (destinationCategory === "historical") {
      if (catStr.includes("castle") || catStr.includes("ruines") || catStr.includes("archaeological")) score += 45;
      if (catStr.includes("sights") || catStr.includes("monument")) score += 35;
      if (catStr.includes("museum") || catStr.includes("place_of_worship")) score += 30;
      if (catStr.includes("viewpoint")) score += 20;
    } else if (destinationCategory === "city") {
      if (catStr.includes("tourism.sights") || catStr.includes("tourism.attraction")) score += 35;
      if (catStr.includes("museum") || catStr.includes("culture")) score += 30;
      if (catStr.includes("viewpoint") || catStr.includes("castle")) score += 30;
      if (catStr.includes("park.garden")) score += 20;
    } else if (destinationCategory === "mountain") {
      if (catStr.includes("natural.mountain") || catStr.includes("viewpoint")) score += 45;
      if (catStr.includes("natural.forest") || catStr.includes("nature_reserve")) score += 35;
      if (catStr.includes("natural.water")) score += 30;
    } else if (destinationCategory === "religious" || destinationCategory === "cultural") {
      if (catStr.includes("place_of_worship") || catStr.includes("temple") || catStr.includes("monastery")) score += 45;
      if (catStr.includes("museum") || catStr.includes("culture")) score += 35;
      if (catStr.includes("castle") || catStr.includes("sights")) score += 30;
      if (catStr.includes("viewpoint")) score += 20;
    } else if (destinationCategory === "adventure") {
      if (catStr.includes("mountain") || catStr.includes("viewpoint") || catStr.includes("cliff")) score += 45;
      if (catStr.includes("nature_reserve") || catStr.includes("forest")) score += 35;
      if (catStr.includes("natural.water") || catStr.includes("beach")) score += 30;
    } else {
      // Mixed
      if (catStr.includes("viewpoint") || catStr.includes("castle") || catStr.includes("museum")) score += 30;
      if (catStr.includes("natural") || catStr.includes("beach") || catStr.includes("sights")) score += 25;
    }

    // Penalty for non-attraction utility / infrastructural labels
    if (
      /\b(ground|playground|vegetation|junction|court|bus stand|bus stop|toilet|parking|depot|petrol pump|fuel station)\b/i.test(
        nameLower
      )
    ) {
      score -= 45;
    }

    // Moderate penalty for bare street/road names lacking attraction keywords
    const isBareStreetName =
      /^(road|street|marg|lane|avenue|cross|highway|bypass|nh \d+|sh \d+)\b/i.test(nameLower) ||
      /\b(road|marg|street|lane|highway|bypass)\b$/i.test(nameLower);
    const hasAttractionKeyword = /\b(beach|view|viewpoint|fort|palace|temple|museum|lake|waterfall|garden|park|memorial|monument|statue)\b/i.test(
      nameLower
    );
    if (isBareStreetName && !hasAttractionKeyword) {
      score -= 30;
    }

    return {
      item,
      score,
      primaryCat: getPrimaryCategoryBucket(cats),
    };
  });

  // Sort by calculated score descending
  scored.sort((a, b) => b.score - a.score);

  // 3. Diversity Interleaving Pass:
  // Prevents a single category bucket from appearing more than 2 times consecutively when diverse alternatives exist.
  const finalResults: AttractionItem[] = [];
  const remaining = [...scored];
  const categoryUsageCount = new Map<CategoryBucket, number>();

  while (remaining.length > 0 && finalResults.length < maxResults) {
    const lastItemBucket =
      finalResults.length > 0
        ? getPrimaryCategoryBucket(finalResults[finalResults.length - 1].categories)
        : null;
    const secondLastItemBucket =
      finalResults.length > 1
        ? getPrimaryCategoryBucket(finalResults[finalResults.length - 2].categories)
        : null;

    let pickIndex = 0;

    // If the last 2 selected items belong to the same category bucket, find the next candidate with a different bucket
    if (lastItemBucket && secondLastItemBucket && lastItemBucket === secondLastItemBucket) {
      const alternateIdx = remaining.findIndex((r) => r.primaryCat !== lastItemBucket);
      if (alternateIdx !== -1) {
        pickIndex = alternateIdx;
      }
    }

    const selected = remaining.splice(pickIndex, 1)[0];
    finalResults.push(selected.item);
    categoryUsageCount.set(
      selected.primaryCat,
      (categoryUsageCount.get(selected.primaryCat) || 0) + 1
    );
  }

  return finalResults;
}

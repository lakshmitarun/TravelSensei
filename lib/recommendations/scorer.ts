import type { Destination, RecommendationPreferences, ScoredDestination } from "./types";

/**
 * Keyword association map for travel style matching.
 */
const STYLE_KEYWORDS: Record<string, string[]> = {
  culture: ["historic", "temple", "temples", "traditional", "heritage", "culture", "ancient", "museum", "history", "monument", "spiritual"],
  history: ["historic", "history", "heritage", "ancient", "traditional", "temple", "temples", "monument", "castle", "palace", "fort"],
  art: ["art", "lights", "museum", "gallery", "culture", "architecture", "monument", "exhibition", "opera"],
  nature: ["garden", "gardens", "nature", "mountain", "mountains", "scenic", "park", "forest", "lake", "river", "beach", "wildlife"],
  adventure: ["mountain", "hiking", "trekking", "outdoors", "trail", "explore", "wild", "safari", "nature", "water sports", "rafting"],
  relaxation: ["garden", "gardens", "peaceful", "scenic", "beach", "spa", "resort", "relax", "quiet", "retreat", "coastal"],
  beach: ["beach", "coastal", "island", "sea", "ocean", "sand", "water sports", "swimming", "sun"],
  city: ["city", "lights", "metropolis", "urban", "downtown", "shopping", "nightlife", "art", "streets"],
  solo: ["historic", "city", "lights", "garden", "gardens", "temple", "art", "culture", "walkable", "safe", "backpacking"],
  luxury: ["resort", "palace", "lights", "art", "exclusive", "gourmet", "fine", "city", "heritage", "fine dining"],
  backpacking: ["hostel", "trail", "historic", "nature", "walkable", "temple", "temples", "market", "explore", "mountain", "budget"],
};

/**
 * Maps travel styles to compatible destination types.
 */
const STYLE_TO_DEST_TYPES: Record<string, string[]> = {
  culture: ["heritage", "spiritual", "city"],
  history: ["heritage", "spiritual", "city"],
  art: ["city", "heritage"],
  nature: ["nature", "mountain", "wildlife", "beach"],
  adventure: ["mountain", "nature", "wildlife", "beach"],
  relaxation: ["beach", "island", "countryside", "nature"],
  beach: ["beach", "island"],
  city: ["city", "heritage"],
  luxury: ["city", "heritage", "beach"],
  backpacking: ["mountain", "heritage", "nature", "beach"],
};

/**
 * Normalizes input text by trimming, lowercasing, and removing punctuation.
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

/**
 * Determines budget tier from a numeric amount.
 */
function getBudgetTier(amount: number): "budget" | "moderate" | "premium" {
  if (amount < 30000) return "budget";
  if (amount <= 70000) return "moderate";
  return "premium";
}

/**
 * Scores a single destination based on structured attributes and user preferences.
 */
export function scoreDestination(
  destination: Destination,
  preferences: RecommendationPreferences
): ScoredDestination {
  const reasons: string[] = [];
  let styleScore = 0;
  let budgetScore = 0;
  let typeScore = 0;
  let activityScore = 0;
  let durationScore = 0;
  let seasonScore = 0;

  const destText = `${normalizeText(destination.name)} ${normalizeText(destination.state_country)} ${normalizeText(destination.description)}`;
  const requestedStyle = preferences.travel_style ? normalizeText(preferences.travel_style).trim() : null;

  // 1. Travel Style Evaluation (Up to 30 points)
  if (requestedStyle) {
    const destStyles = (destination.travel_styles || []).map((s) => normalizeText(s).trim());

    if (destStyles.includes(requestedStyle)) {
      styleScore = 30;
      reasons.push(`Direct match for your preferred '${preferences.travel_style}' travel style`);
    } else {
      // Check keyword & related styles
      const directKeywords = STYLE_KEYWORDS[requestedStyle] || [requestedStyle];
      const matchedKeywordsSet = new Set<string>();

      for (const kw of directKeywords) {
        const isPluralDuplicate = kw.endsWith("s") && matchedKeywordsSet.has(kw.slice(0, -1));
        if (!isPluralDuplicate) {
          if (destStyles.some((s) => s.includes(kw)) || destText.includes(kw)) {
            matchedKeywordsSet.add(kw);
          }
        }
      }

      const matchedKeywords = Array.from(matchedKeywordsSet);
      if (matchedKeywords.length >= 2) {
        styleScore = 24;
        reasons.push(
          `Strong alignment with '${preferences.travel_style}' style (highlights: ${matchedKeywords.slice(0, 2).join(", ")})`
        );
      } else if (matchedKeywords.length === 1) {
        styleScore = 18;
        reasons.push(
          `Relevant match for '${preferences.travel_style}' style (highlight: ${matchedKeywords[0]})`
        );
      } else {
        styleScore = 8;
        reasons.push(`Exploratory destination based on global popularity`);
      }
    }
  } else {
    styleScore = 12;
    reasons.push("General style baseline (no specific travel style selected)");
  }

  // 2. Budget Compatibility Evaluation (Up to 25 points)
  const budget = preferences.budget;
  const destBudgetLevel = destination.budget_level ? normalizeText(destination.budget_level).trim() : null;

  if (typeof budget === "number" && budget > 0) {
    const userTier = getBudgetTier(budget);

    if (destBudgetLevel) {
      if (destBudgetLevel === userTier) {
        budgetScore = 25;
        reasons.push(`Budget tier '${destination.budget_level}' perfectly aligns with your planned budget of ${budget}`);
      } else if (
        (userTier === "moderate" && (destBudgetLevel === "budget" || destBudgetLevel === "premium")) ||
        (userTier === "premium" && destBudgetLevel === "moderate") ||
        (userTier === "budget" && destBudgetLevel === "moderate")
      ) {
        budgetScore = 18;
        reasons.push(`Budget tier '${destination.budget_level}' is accessible within your ${budget} budget range`);
      } else {
        budgetScore = 10;
        reasons.push(`Budget tier '${destination.budget_level}' differs from your planned allocation`);
      }
    } else {
      if (budget >= 70000) {
        budgetScore = 22;
        reasons.push(`Budget of ${budget} fits premium accommodations and activities`);
      } else if (budget >= 30000) {
        budgetScore = 18;
        reasons.push(`Budget of ${budget} is well-suited for moderate travel`);
      } else {
        budgetScore = 14;
        reasons.push(`Budget of ${budget} is accessible with budget planning`);
      }
    }
  } else {
    budgetScore = 12;
    reasons.push("Standard budget allocation (no specific budget constraint provided)");
  }

  // 3. Destination Type Alignment (Up to 15 points)
  const destType = destination.destination_type ? normalizeText(destination.destination_type).trim() : null;

  if (destType && requestedStyle) {
    const compatibleTypes = STYLE_TO_DEST_TYPES[requestedStyle] || [];
    if (compatibleTypes.includes(destType)) {
      typeScore = 15;
      reasons.push(`Destination type '${destination.destination_type}' ideally complements your ${preferences.travel_style} interest`);
    } else {
      typeScore = 8;
    }
  } else if (destType) {
    typeScore = 10;
  } else {
    typeScore = 6;
  }

  // 4. Activities Match (Up to 15 points)
  const destActivities = destination.activities || [];
  if (destActivities.length > 0 && requestedStyle) {
    const keywords = STYLE_KEYWORDS[requestedStyle] || [requestedStyle];
    const matchedActs = destActivities.filter((act) => {
      const normAct = normalizeText(act);
      return keywords.some((kw) => normAct.includes(kw));
    });

    if (matchedActs.length >= 2) {
      activityScore = 15;
      reasons.push(`Featured activities match your style: ${matchedActs.slice(0, 2).join(", ")}`);
    } else if (matchedActs.length === 1) {
      activityScore = 11;
      reasons.push(`Includes relevant activity: ${matchedActs[0]}`);
    } else {
      activityScore = 6;
    }
  } else if (destActivities.length > 0) {
    activityScore = 8;
  } else {
    activityScore = 5;
  }

  // 5. Ideal Duration Compatibility (Up to 10 points)
  const requestedDuration = preferences.duration;
  const idealDuration = destination.ideal_duration;

  if (typeof requestedDuration === "number" && requestedDuration > 0 && typeof idealDuration === "number" && idealDuration > 0) {
    const diff = Math.abs(requestedDuration - idealDuration);
    if (diff === 0) {
      durationScore = 10;
      reasons.push(`Ideal duration of ${idealDuration} days perfectly matches your ${requestedDuration}-day itinerary`);
    } else if (diff <= 1) {
      durationScore = 8;
      reasons.push(`Ideal duration of ${idealDuration} days fits your ${requestedDuration}-day trip plan well`);
    } else if (diff <= 2) {
      durationScore = 5;
      reasons.push(`Recommended duration is ${idealDuration} days for a ${requestedDuration}-day visit`);
    } else {
      durationScore = 2;
    }
  }

  // 6. Best Season Match (Up to 5 points)
  const requestedSeason = preferences.season ? normalizeText(preferences.season).trim() : null;
  const destSeasons = (destination.best_season || []).map((s) => normalizeText(s).trim());

  if (requestedSeason && destSeasons.length > 0) {
    if (destSeasons.includes(requestedSeason) || destSeasons.includes("all year") || destSeasons.includes("all_year")) {
      seasonScore = 5;
      reasons.push(`Optimal travel season: ${preferences.season} is among the best times to visit`);
    } else {
      seasonScore = 1;
      reasons.push(`Off-peak travel period during ${preferences.season}`);
    }
  }

  // Compute total normalized score (0 - 100)
  const totalScore = Math.min(
    100,
    Math.max(0, Math.round(styleScore + budgetScore + typeScore + activityScore + durationScore + seasonScore))
  );

  return {
    destination: {
      id: destination.id,
      name: destination.name,
      state_country: destination.state_country,
      description: destination.description,
      latitude: Number(destination.latitude),
      longitude: Number(destination.longitude),
      travel_styles: destination.travel_styles || [],
      budget_level: destination.budget_level || null,
      destination_type: destination.destination_type || null,
      ideal_duration: destination.ideal_duration || null,
      activities: destination.activities || [],
      best_season: destination.best_season || [],
    },
    score: totalScore,
    reasons,
    match_details: {
      style_score: styleScore,
      budget_score: budgetScore,
      type_score: typeScore,
      activity_score: activityScore,
      duration_score: durationScore,
      season_score: seasonScore,
    },
  };
}

/**
 * Generates ranked recommendations sorted descending by score.
 * Ties are broken deterministically by destination name ascending.
 */
export function generateRecommendations(
  destinations: Destination[],
  preferences: RecommendationPreferences
): ScoredDestination[] {
  if (!destinations || destinations.length === 0) {
    return [];
  }

  const scored = destinations.map((dest) => scoreDestination(dest, preferences));

  return scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.destination.name.localeCompare(b.destination.name);
  });
}

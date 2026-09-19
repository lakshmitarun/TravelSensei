export type BudgetLevel = "budget" | "moderate" | "premium";
export type DestinationType =
  | "city"
  | "beach"
  | "mountain"
  | "heritage"
  | "nature"
  | "wildlife"
  | "spiritual"
  | "island"
  | "desert"
  | "countryside"
  | string;

export interface Destination {
  id: string;
  name: string;
  state_country: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  travel_styles?: string[] | null;
  budget_level?: BudgetLevel | string | null;
  destination_type?: DestinationType | null;
  ideal_duration?: number | null;
  activities?: string[] | null;
  best_season?: string[] | null;
  created_at?: string;
}

export interface RecommendationPreferences {
  travel_style?: string | null;
  budget?: number | null;
  duration?: number | null;
  season?: string | null;
}

export interface ScoredDestination {
  destination: {
    id: string;
    name: string;
    state_country: string | null;
    description: string | null;
    latitude: number;
    longitude: number;
    travel_styles?: string[] | null;
    budget_level?: string | null;
    destination_type?: string | null;
    ideal_duration?: number | null;
    activities?: string[] | null;
    best_season?: string[] | null;
  };
  score: number;
  reasons: string[];
  match_details?: {
    style_score: number;
    budget_score: number;
    type_score: number;
    activity_score: number;
    duration_score: number;
    season_score: number;
  };
}

export interface RecommendationResult {
  success: boolean;
  recommendations: ScoredDestination[];
  meta?: {
    total: number;
    applied_preferences: {
      travel_style: string | null;
      budget: number | null;
      duration?: number | null;
      season?: string | null;
    };
    source: "saved_preferences" | "request_input" | "hybrid";
  };
}

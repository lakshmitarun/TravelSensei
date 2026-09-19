import { Destination, RecommendationPreferences, ScoredDestination } from "@/lib/recommendations";

export interface TravelPlanActivity {
  time: string; // e.g., "Morning", "Afternoon", "Evening"
  activity: string;
  description: string;
}

export interface TravelPlanDay {
  day: number;
  title: string;
  activities: TravelPlanActivity[];
}

export interface TravelPlanDestinationInfo {
  name: string;
  state_country: string;
}

export interface StructuredTravelPlan {
  destination: TravelPlanDestinationInfo;
  summary: string;
  days: TravelPlanDay[];
  budget_notes: string[];
  travel_tips: string[];
}

export interface TravelPlanRequest {
  destination_id: string;
  travel_date: string;
  duration?: number;
  budget?: number;
  travel_style?: string;
  season?: string;
}

export interface PersistedTripInfo {
  id: string;
  destination_id: string;
  travel_date: string;
  budget: number;
  travel_style: string;
  status: string;
  created_at?: string;
}

export interface TravelPlanResponse {
  success: boolean;
  trip?: PersistedTripInfo;
  recommendation: {
    score: number;
    reasons: string[];
  };
  travel_plan: StructuredTravelPlan;
  itinerary_ids?: string[];
}

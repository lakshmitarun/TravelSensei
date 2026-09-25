"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { EventItem, EventsApiResponse } from "@/lib/events/types";
import { Destination } from "@/lib/recommendations/types";
import { ItineraryItem } from "@/components/trips/ItineraryDay";
import EventResults from "./EventResults";
import EventDetailModal from "./EventDetailModal";

export interface EventSearchProps {
  destinationName?: string;
  stateCountry?: string;
  destination?: Destination;
  itineraries?: ItineraryItem[];
  travelDate?: string;
  className?: string;
}

export interface EventCategoryOption {
  id: string;
  label: string;
  icon: string;
}

export const EVENT_CATEGORIES: EventCategoryOption[] = [
  { id: "all", label: "All Events", icon: "confirmation_number" },
  { id: "concerts", label: "Concerts & Music", icon: "music_note" },
  { id: "festivals", label: "Festivals", icon: "festival" },
  { id: "sports", label: "Sports", icon: "sports_soccer" },
  { id: "theatre", label: "Theatre & Shows", icon: "theater_comedy" },
  { id: "nightlife", label: "Nightlife & Parties", icon: "nightlife" },
  { id: "art_galleries", label: "Art & Galleries", icon: "palette" },
  { id: "other", label: "Other Activities", icon: "event" },
];

/**
 * Curated map of major regional destinations to their primary candidate event cities (4–6 cities).
 */
export const REGIONAL_CITIES_REGISTRY: Record<string, { cities: string[]; defaultCountry?: string }> = {
  kerala: {
    cities: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
    defaultCountry: "India",
  },
  goa: {
    cities: ["Panaji", "Margao", "Vasco da Gama", "Calangute"],
    defaultCountry: "India",
  },
  rajasthan: {
    cities: ["Jaipur", "Udaipur", "Jodhpur", "Jaisalmer"],
    defaultCountry: "India",
  },
  "himachal pradesh": {
    cities: ["Shimla", "Manali", "Dharamshala", "Kullu"],
    defaultCountry: "India",
  },
  himachal: {
    cities: ["Shimla", "Manali", "Dharamshala", "Kullu"],
    defaultCountry: "India",
  },
  kashmir: {
    cities: ["Srinagar", "Jammu", "Gulmarg", "Pahalgam"],
    defaultCountry: "India",
  },
  "jammu and kashmir": {
    cities: ["Srinagar", "Jammu", "Gulmarg", "Pahalgam"],
    defaultCountry: "India",
  },
  uttarakhand: {
    cities: ["Dehradun", "Rishikesh", "Haridwar", "Nainital"],
    defaultCountry: "India",
  },
  bali: {
    cities: ["Denpasar", "Kuta", "Ubud", "Seminyak"],
    defaultCountry: "Indonesia",
  },
  hawaii: {
    cities: ["Honolulu", "Kahului", "Hilo", "Kailua"],
    defaultCountry: "United States",
  },
  tuscany: {
    cities: ["Florence", "Siena", "Pisa", "Lucca"],
    defaultCountry: "Italy",
  },
  sicily: {
    cities: ["Palermo", "Catania", "Syracuse", "Taormina"],
    defaultCountry: "Italy",
  },
  santorini: {
    cities: ["Thira", "Oia", "Kamari"],
    defaultCountry: "Greece",
  },
  phuket: {
    cities: ["Phuket", "Patong", "Karon"],
    defaultCountry: "Thailand",
  },
  zanzibar: {
    cities: ["Zanzibar", "Stone Town", "Nungwi"],
    defaultCountry: "Tanzania",
  },
};

export interface DestinationResolution {
  isRegional: boolean;
  queryCities: string[];
  country?: string;
  destinationDisplayName: string;
}

/**
 * Resolves destination query parameters:
 * - City destinations (e.g. Hyderabad, Paris, Tokyo) -> single direct city query
 * - Regional destinations (e.g. Kerala, Goa) -> multiple relevant candidate cities queried in parallel
 */
export function resolveDestinationForEvents(
  destinationName?: string,
  stateCountry?: string,
  destination?: Destination,
  itineraries?: ItineraryItem[]
): DestinationResolution {
  const rawDest = (destination?.name || destinationName || "").trim();
  const rawStateCountry = (destination?.state_country || stateCountry || "").trim();
  const desc = (destination?.description || "").trim();

  let baseName = rawDest;
  let country = "";

  if (rawDest.includes(",")) {
    const parts = rawDest.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 1) baseName = parts[0];
    if (parts.length >= 2) country = parts[parts.length - 1];
  }

  if (rawStateCountry) {
    const scParts = rawStateCountry.split(",").map((p) => p.trim()).filter(Boolean);
    if (scParts.length > 0) {
      const lastPart = scParts[scParts.length - 1];
      if (!country || lastPart.toLowerCase() !== baseName.toLowerCase()) {
        country = lastPart;
      }
    }
  }

  const lowerName = baseName.toLowerCase();
  const matchedRegion = REGIONAL_CITIES_REGISTRY[lowerName];

  if (matchedRegion) {
    const candidateCities = [...matchedRegion.cities];

    // Check if itineraries mention additional specific cities in this region
    if (Array.isArray(itineraries) && itineraries.length > 0) {
      const itinText = itineraries
        .map((i) => {
          const title = i.schedule_data?.title || "";
          const acts = Array.isArray(i.schedule_data?.activities)
            ? i.schedule_data.activities.map((a) => `${a.activity || ""} ${a.description || ""}`).join(" ")
            : "";
          return `${title} ${acts}`;
        })
        .join(" ");

      if (lowerName === "kerala") {
        if (/\b(alleppey|alappuzha)\b/i.test(itinText) && !candidateCities.includes("Alappuzha")) {
          candidateCities.push("Alappuzha");
        }
        if (/\b(munnar)\b/i.test(itinText) && !candidateCities.includes("Munnar")) {
          candidateCities.push("Munnar");
        }
      }
    }

    return {
      isRegional: true,
      queryCities: candidateCities.slice(0, 6),
      country: country || matchedRegion.defaultCountry || undefined,
      destinationDisplayName: baseName,
    };
  }

  // Single direct city destination (e.g. Hyderabad, Paris, Tokyo, Mumbai, Delhi)
  return {
    isRegional: false,
    queryCities: [baseName],
    country: country || undefined,
    destinationDisplayName: baseName,
  };
}

/**
 * Deduplicates and sorts events chronologically by ascending start date.
 */
export function processAndSortEvents(events: EventItem[]): EventItem[] {
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const deduplicated: EventItem[] = [];

  for (const event of events) {
    if (event.id && event.id.trim()) {
      const cleanId = event.id.trim();
      if (seenIds.has(cleanId)) continue;
      seenIds.add(cleanId);
    }

    const titleNorm = (event.title || "").toLowerCase().trim();
    const dateNorm = (event.startDate || "").trim();
    const cityNorm = (event.city || "").toLowerCase().trim();
    const signature = `${titleNorm}|${dateNorm}|${cityNorm}`;

    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);

    deduplicated.push(event);
  }

  // Sort chronologically by upcoming startDate (nearest first)
  return deduplicated.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;

    const timeA = new Date(a.startDate).getTime();
    const timeB = new Date(b.startDate).getTime();

    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;

    return timeA - timeB;
  });
}

export default function EventSearch({
  destinationName,
  stateCountry,
  destination,
  itineraries,
  travelDate,
  className = "",
}: EventSearchProps) {
  const resolution = useMemo(
    () => resolveDestinationForEvents(destinationName, stateCountry, destination, itineraries),
    [destinationName, stateCountry, destination, itineraries]
  );

  const { isRegional, queryCities, country, destinationDisplayName } = resolution;

  // Default category is strictly 'all'
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch events for destination (either single direct city or parallel regional queries)
  const fetchDestinationEvents = useCallback(
    async (
      cities: string[],
      targetCountry?: string,
      categoryFilter?: string,
      signal?: AbortSignal
    ) => {
      if (!cities || cities.length === 0 || !cities[0]?.trim()) {
        setEvents([]);
        setHasSearched(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const fetchPromises = cities.map(async (city) => {
          const params = new URLSearchParams();
          params.set("city", city.trim());
          if (targetCountry && targetCountry.trim()) {
            params.set("country", targetCountry.trim());
          }
          if (categoryFilter && categoryFilter !== "all") {
            params.set("category", categoryFilter.trim());
          }
          params.set("limit", "24");

          const res = await fetch(`/api/events?${params.toString()}`, { signal });
          if (!res.ok) {
            if (res.status === 401) {
              throw new Error("AUTH_REQUIRED");
            }
            return [];
          }

          const json: EventsApiResponse = await res.json().catch(() => ({ success: false }));
          if (json.success && json.data && Array.isArray(json.data.events)) {
            return json.data.events;
          }
          return [];
        });

        const results = await Promise.allSettled(fetchPromises);
        const collected: EventItem[] = [];
        let hadAuthError = false;

        for (const result of results) {
          if (result.status === "fulfilled") {
            collected.push(...result.value);
          } else if (result.reason?.message === "AUTH_REQUIRED") {
            hadAuthError = true;
          }
        }

        if (hadAuthError && collected.length === 0) {
          setEvents([]);
          setHasSearched(true);
          setError("Please sign in to discover destination events.");
          return;
        }

        const processed = processAndSortEvents(collected);
        setEvents(processed);
        setHasSearched(true);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setEvents([]);
        setHasSearched(true);
        setError("Network error loading events. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-search whenever queryCities, country, or selectedCategory changes
  useEffect(() => {
    if (!queryCities || queryCities.length === 0) {
      setEvents([]);
      setHasSearched(true);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchDestinationEvents(queryCities, country, selectedCategory, controller.signal);

    return () => {
      controller.abort();
    };
  }, [queryCities, country, selectedCategory, fetchDestinationEvents]);

  const handleRetry = () => {
    if (queryCities && queryCities.length > 0) {
      fetchDestinationEvents(queryCities, country, selectedCategory);
    }
  };

  const handleSelectEvent = (event: EventItem) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // Missing destination fallback
  if (!destinationDisplayName) {
    return (
      <div
        id="events-no-destination-state"
        className={`p-8 sm:p-12 rounded-3xl bg-surface-container-low border border-surface-container-high/60 text-center flex flex-col items-center gap-3 ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px]">location_off</span>
        </div>
        <h4 className="text-base font-bold text-on-surface">
          Events aren&apos;t available for this destination yet.
        </h4>
        <p className="text-xs text-on-surface-variant max-w-sm">
          Please verify your trip destination has a valid location specified to explore local events.
        </p>
      </div>
    );
  }

  return (
    <section
      id="events-search-section"
      aria-label="Upcoming Events and Activities"
      className={`flex flex-col gap-6 ${className}`}
    >
      {/* Section Header with Destination Name */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[24px]">
            confirmation_number
          </span>
          <h3 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
            Upcoming Events in {destinationDisplayName}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Find concerts, festivals, sports, theatre, and cultural happenings around your destination.
        </p>
      </div>

      {/* Category Filter Pills (Clean, no search input) */}
      <div
        id="events-category-bar"
        className="p-3 sm:p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex items-center shadow-xs"
      >
        <div
          id="events-category-pills"
          role="radiogroup"
          aria-label="Filter events by category"
          className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none w-full"
        >
          {EVENT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                id={`btn-event-category-${cat.id}`}
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/60"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Container */}
      <EventResults
        events={events}
        destinationName={destinationDisplayName}
        isLoading={isLoading}
        error={error}
        hasSearched={hasSearched}
        onRetry={handleRetry}
        onSelectEvent={handleSelectEvent}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </section>
  );
}

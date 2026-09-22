"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Destination } from "@/lib/recommendations/types";
import { TripItem } from "./TripCard";
import ItineraryDay, { ItineraryItem } from "./ItineraryDay";
import { FlightSearchWidget, FlightResultsList } from "@/components/flights";
import { FlightSearchRequest, FlightSearchResponseData } from "@/lib/flights/types";
import { TrainSearchForm, TrainResultsList, TrainSearchFormValues } from "@/components/trains";
import { TrainSearchData } from "@/lib/trains/types";
import { MultiLegResultsList } from "@/components/routing";
import { RoutingSearchData } from "@/lib/routing/types";
import { HotelSearchWidget, HotelResultsList } from "@/components/hotels";
import { HotelSearchParams, HotelSearchResult } from "@/lib/hotels/types";
import { RouteMapContainer } from "@/components/maps";
import { WeatherCard } from "@/components/weather";
import { CurrencyConverter } from "@/components/currency";
import { RestaurantSearch } from "@/components/restaurants";
import { MapCoordinate, RouteProfile } from "@/lib/maps/types";
import { GeocodingLocation } from "@/lib/geocoding/types";
import { format, parseISO, addDays } from "date-fns";

interface TripDetailsProps {
  trip: TripItem;
  itineraries: ItineraryItem[];
  destination?: Destination;
  originCoordinates?: MapCoordinate;
  onDeleteTrip?: () => void;
  isDeleting?: boolean;
}

function getDestinationCurrency(dest?: Destination): string {
  const loc = (dest?.state_country || "").toLowerCase();
  if (loc.includes("japan")) return "JPY";
  if (
    loc.includes("france") ||
    loc.includes("germany") ||
    loc.includes("italy") ||
    loc.includes("spain") ||
    loc.includes("europe")
  ) {
    return "EUR";
  }
  if (loc.includes("uk") || loc.includes("united kingdom") || loc.includes("london")) return "GBP";
  if (loc.includes("australia")) return "AUD";
  if (loc.includes("canada")) return "CAD";
  if (loc.includes("singapore")) return "SGD";
  if (loc.includes("thailand")) return "THB";
  return "INR";
}

export default function TripDetails({
  trip,
  itineraries,
  destination,
  originCoordinates: _initialOriginCoordinates,
  onDeleteTrip,
  isDeleting,
}: TripDetailsProps) {
  const destName = destination?.name || "Destination";
  const destLocation = destination?.state_country || "Verified Location";

  let formattedDate = trip.travel_date;
  try {
    if (trip.travel_date) {
      formattedDate = format(parseISO(trip.travel_date), "dd MMMM yyyy");
    }
  } catch {
    formattedDate = trip.travel_date;
  }

  // Ensure itineraries are sorted by day_number ascending
  const sortedItineraries = [...itineraries].sort((a, b) => a.day_number - b.day_number);

  // Compute departure and return date suggestions
  const departureDateSuggestion = trip.travel_date || "";
  let returnDateSuggestion = "";
  try {
    if (trip.travel_date && sortedItineraries.length > 0) {
      const departureParsed = parseISO(trip.travel_date);
      const returnParsed = addDays(departureParsed, sortedItineraries.length);
      returnDateSuggestion = format(returnParsed, "yyyy-MM-dd");
    }
  } catch {
    returnDateSuggestion = "";
  }

  // Single active transportation state: "flights" | "trains" | "hotels" | "route" | "currency" | "restaurants" | null (default null)
  // type ActiveTransport = "flights" | "trains" | null;
  // type ActiveTransport = "flights" | "trains" | "hotels" | null;
  // type ActiveTransport = "flights" | "trains" | "hotels" | "route" | null;
  // type ActiveTransport = "flights" | "trains" | "hotels" | "route" | "currency" | null;
  type ActiveTransport = "flights" | "trains" | "hotels" | "route" | "currency" | "restaurants" | null;
  const [activeTransport, setActiveTransport] = useState<ActiveTransport>(null);

  // Sync with URL hash for incoming deep linking (#trip-flights / #trip-trains / #trip-hotels / #trip-route / #trip-currency / #trip-restaurants)
  // Consumes and removes the hash so the address bar stays clean without hash during normal usage.
  useEffect(() => {
    const handleHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (hash === "#trip-flights") {
        setActiveTransport("flights");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const el = document.getElementById("trip-transport");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (hash === "#trip-trains") {
        setActiveTransport("trains");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const el = document.getElementById("trip-transport");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (hash === "#trip-hotels") {
        setActiveTransport("hotels");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const el = document.getElementById("trip-transport");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (hash === "#trip-route") {
        setActiveTransport("route");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const el = document.getElementById("trip-transport");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (hash === "#trip-currency") {
        setActiveTransport("currency");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const el = document.getElementById("trip-transport");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (hash === "#trip-restaurants") {
        setActiveTransport("restaurants");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const el = document.getElementById("trip-transport");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Route Planner: Explicit state separation
  // 1. searchQuery: User typing in the input (text only, NOT coordinates, NOT automatically selected origin)
  const [originQuery, setOriginQuery] = useState<string>("");
  // 2. selectedOrigin: Complete Open-Meteo GeocodingLocation when user explicitly selects a result
  const [selectedLocation, setSelectedLocation] = useState<GeocodingLocation | null>(null);
  const selectedOrigin = selectedLocation;
  // 3. originCoordinates: Derived strictly from selectedOrigin (never inferred from search text)
  const originCoordinates: MapCoordinate | null = selectedOrigin
    ? {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      }
    : null;
  // 4. geocodingSuggestions: Array of GeocodingLocation returned from /api/geocoding/search
  const [suggestions, setSuggestions] = useState<GeocodingLocation[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const [selectedProfile, setSelectedProfile] = useState<RouteProfile>("driving-car");
  // 5. routeResult: Direction calculation state from /api/maps/directions
  const [hasCalculatedRoute, setHasCalculatedRoute] = useState<boolean>(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const originInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced Open-Meteo Geocoding Autocomplete
  useEffect(() => {
    if (selectedLocation && originQuery.trim() === selectedLocation.name) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingOrigin(false);
      return;
    }

    const trimmed = originQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingOrigin(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    setIsSearchingOrigin(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/geocoding/search?q=${encodeURIComponent(trimmed)}&count=5&language=en`,
          { signal: controller.signal }
        );
        const json = await res.json().catch(() => ({}));

        if (res.ok && json.success && Array.isArray(json.data?.results)) {
          setSuggestions(json.data.results);
          setShowSuggestions(true);
          setHighlightedIndex(-1);
          setHasSearched(true);
        } else {
          setSuggestions([]);
          setSearchError(json.message || "Unable to search locations. Please try again.");
          setShowSuggestions(true);
          setHasSearched(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setSuggestions([]);
        setSearchError("Unable to search locations. Please try again.");
        setShowSuggestions(true);
        setHasSearched(true);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [originQuery, selectedLocation]);

  const handleSelectLocation = (loc: GeocodingLocation) => {
    setSelectedLocation(loc);
    setOriginQuery(loc.name);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    setSearchError(null);
    setHasCalculatedRoute(false);
    setRouteError(null);
  };

  const handleClearOrigin = () => {
    setOriginQuery("");
    setSelectedLocation(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setSearchError(null);
    setHasSearched(false);
    setHasCalculatedRoute(false);
    setRouteError(null);
    originInputRef.current?.focus();
  };

  const handleChangeOrigin = () => {
    setSelectedLocation(null);
    setOriginQuery("");
    setHasCalculatedRoute(false);
    setRouteError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setTimeout(() => {
      originInputRef.current?.focus();
    }, 50);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        e.preventDefault();
        setShowSuggestions(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectLocation(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const isCalculateRouteEnabled =
    Boolean(selectedLocation) &&
    typeof selectedLocation?.latitude === "number" &&
    isFinite(selectedLocation.latitude) &&
    typeof selectedLocation?.longitude === "number" &&
    isFinite(selectedLocation.longitude) &&
    typeof destination?.latitude === "number" &&
    isFinite(destination.latitude) &&
    typeof destination?.longitude === "number" &&
    isFinite(destination.longitude) &&
    !isCalculatingRoute;

  const handleCalculateRoute = async () => {
    if (!isCalculateRouteEnabled || !selectedLocation || destination?.latitude === undefined || destination?.longitude === undefined) {
      return;
    }

    setIsCalculatingRoute(true);
    setRouteError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("originLat", String(selectedLocation.latitude));
      queryParams.set("originLng", String(selectedLocation.longitude));
      queryParams.set("destinationLat", String(destination.latitude));
      queryParams.set("destinationLng", String(destination.longitude));
      queryParams.set("profile", selectedProfile);

      const res = await fetch(`/api/maps/directions?${queryParams.toString()}`);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        setHasCalculatedRoute(true);
      } else {
        setRouteError(json.message || "Failed to calculate route directions.");
      }
    } catch {
      setRouteError("Network error calculating route directions. Please check your connection.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  function formatLocationSubtitle(loc: GeocodingLocation): string {
    const parts: string[] = [];
    if (loc.admin1 && loc.admin1 !== loc.name) parts.push(loc.admin1);
    if (loc.country) parts.push(loc.country);
    else if (loc.countryCode) parts.push(loc.countryCode);
    return parts.join(", ");
  }

  // Flight search states
  const [flightData, setFlightData] = useState<FlightSearchResponseData | null>(null);
  const [isSearchingFlights, setIsSearchingFlights] = useState<boolean>(false);
  const [flightError, setFlightError] = useState<string | null>(null);

  const handleFlightSearch = async (params: FlightSearchRequest) => {
    setIsSearchingFlights(true);
    setFlightError(null);

    try {
      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        setFlightData(json.data);
      } else {
        setFlightData(null);
        if (res.status === 401) {
          setFlightError("Please sign in to search live flights.");
        } else {
          setFlightError(json.message || "Failed to search flights. Please try again.");
        }
      }
    } catch {
      setFlightData(null);
      setFlightError("Network error while searching flights. Please check your connection.");
    } finally {
      setIsSearchingFlights(false);
    }
  };

  // Train search states
  const [trainData, setTrainData] = useState<TrainSearchData | null>(null);
  const [isSearchingTrains, setIsSearchingTrains] = useState<boolean>(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [lastTrainSearchParams, setLastTrainSearchParams] = useState<TrainSearchFormValues | null>(null);

  // Connecting multi-leg route states
  const [connectingRouteData, setConnectingRouteData] = useState<RoutingSearchData | null>(null);
  const [isSearchingConnecting, setIsSearchingConnecting] = useState<boolean>(false);
  const [connectingError, setConnectingError] = useState<string | null>(null);

  const handleTrainSearch = async (values: TrainSearchFormValues) => {
    setIsSearchingTrains(true);
    setTrainError(null);
    setLastTrainSearchParams(values);
    setConnectingRouteData(null);
    setConnectingError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("from", values.fromStation.code);
      queryParams.set("to", values.toStation.code);
      if (values.journeyDate) queryParams.set("date", values.journeyDate);
      if (values.type) queryParams.set("type", values.type);
      if (values.category) queryParams.set("category", values.category);
      if (typeof values.byCity === "boolean") queryParams.set("byCity", values.byCity ? "true" : "false");
      if (typeof values.live === "boolean") queryParams.set("live", values.live ? "true" : "false");

      const res = await fetch(`/api/trains/between?${queryParams.toString()}`);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        setTrainData(json.data);
      } else {
        setTrainData(null);
        if (res.status === 401) {
          setTrainError("Please sign in to search trains.");
        } else {
          setTrainError(json.message || "Failed to search trains. Please try again.");
        }
      }
    } catch {
      setTrainData(null);
      setTrainError("Network error while searching trains. Please check your connection.");
    } finally {
      setIsSearchingTrains(false);
    }
  };

  const handleFindConnectingTrainRoutes = async () => {
    if (!lastTrainSearchParams) return;
    setIsSearchingConnecting(true);
    setConnectingError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("origin", lastTrainSearchParams.fromStation.code);
      queryParams.set("destination", lastTrainSearchParams.toStation.code);
      queryParams.set("date", lastTrainSearchParams.journeyDate);
      queryParams.set("mode", "trains");
      if (lastTrainSearchParams.byCity) queryParams.set("byCity", "true");

      const res = await fetch(`/api/routing/search?${queryParams.toString()}`);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        setConnectingRouteData(json.data);
      } else {
        setConnectingRouteData(null);
        if (res.status === 401) {
          setConnectingError("Please sign in to find connecting routes.");
        } else {
          setConnectingError(json.message || "No connecting routes found.");
        }
      }
    } catch {
      setConnectingRouteData(null);
      setConnectingError("Network error searching connecting routes. Please try again.");
    } finally {
      setIsSearchingConnecting(false);
    }
  };

  // Hotel search states
  const [hotelData, setHotelData] = useState<HotelSearchResult | null>(null);
  const [isSearchingHotels, setIsSearchingHotels] = useState<boolean>(false);
  const [hotelError, setHotelError] = useState<string | null>(null);
  const [lastHotelSearchParams, setLastHotelSearchParams] = useState<HotelSearchParams | null>(null);

  const handleHotelSearch = async (params: HotelSearchParams) => {
    setIsSearchingHotels(true);
    setHotelError(null);
    setLastHotelSearchParams(params);

    try {
      const queryParams = new URLSearchParams();
      if (params.destination) queryParams.set("destination", params.destination);
      if (params.city) queryParams.set("city", params.city);
      if (params.countryCode) queryParams.set("countryCode", params.countryCode);
      if (params.checkin) queryParams.set("checkin", params.checkin);
      if (params.checkout) queryParams.set("checkout", params.checkout);
      if (params.adults) queryParams.set("adults", String(params.adults));
      if (params.children !== undefined) queryParams.set("children", String(params.children));
      if (params.rooms) queryParams.set("rooms", String(params.rooms));
      if (params.currency) queryParams.set("currency", params.currency);

      const res = await fetch(`/api/hotels/search?${queryParams.toString()}`);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        setHotelData(json.data);
      } else {
        setHotelData(null);
        if (res.status === 401) {
          setHotelError("Please sign in to search live hotels.");
        } else {
          setHotelError(json.message || "Failed to search hotels. Please try again.");
        }
      }
    } catch {
      setHotelData(null);
      setHotelError("Network error while searching hotels. Please check your connection.");
    } finally {
      setIsSearchingHotels(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/my-trips"
          className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to My Trips</span>
        </Link>

        <div className="flex items-center gap-3">
          {onDeleteTrip && (
            <button
              type="button"
              onClick={onDeleteTrip}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Delete Trip"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>Delete Trip</span>
            </button>
          )}

          <Link
            href="/#planner"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <span>Plan Another Trip</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* 1. HERO TRIP HEADER CARD */}
      <div className="bg-gradient-to-br from-primary via-primary-container to-teal-800 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {trip.status || "Planned Trip"}
            </span>

            <span className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-semibold capitalize">
              {trip.travel_style || "Personalized Style"}
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {destName}
            </h1>
            <p className="text-white/85 text-sm sm:text-base flex items-center gap-1.5 pt-1.5">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              {destLocation}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Travel Date
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block">
                {formattedDate}
              </span>
            </div>

            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Planned Duration
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block">
                {sortedItineraries.length} {sortedItineraries.length === 1 ? "Day" : "Days"}
              </span>
            </div>

            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Target Budget
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block">
                ₹{trip.budget ? trip.budget.toLocaleString("en-IN") : "0"}
              </span>
            </div>

            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Itinerary Status
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block capitalize">
                {trip.status || "Ready"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DESTINATION WEATHER & FORECAST SECTION */}
      <WeatherCard
        latitude={destination?.latitude}
        longitude={destination?.longitude}
        locationName={destName}
      />

      {/* 3. LIVE TRANSPORTATION, ROUTE & CURRENCY SELECTOR SECTION */}
      <div className="relative flex flex-col gap-6" id="trip-transport">
        {/* Deep linking anchor hooks for #trip-flights, #trip-trains, #trip-hotels, #trip-route, #trip-currency, and #trip-restaurants */}
        <div id="trip-flights" className="absolute -top-24 pointer-events-none" aria-hidden="true" />
        <div id="trip-trains" className="absolute -top-24 pointer-events-none" aria-hidden="true" />
        <div id="trip-hotels" className="absolute -top-24 pointer-events-none" aria-hidden="true" />
        <div id="trip-route" className="absolute -top-24 pointer-events-none" aria-hidden="true" />
        <div id="trip-currency" className="absolute -top-24 pointer-events-none" aria-hidden="true" />
        <div id="trip-restaurants" className="absolute -top-24 pointer-events-none" aria-hidden="true" />

        {/* Full-width Transportation & Accommodation Selector Toolbar */}
        <div
          id="trip-transport-selector"
          className="w-full p-1.5 sm:p-2 bg-surface-container-low rounded-2xl sm:rounded-3xl border border-surface-container-high/60 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-1.5 sm:gap-2 h-auto min-h-0 whitespace-nowrap"
          aria-label="Travel & Stay selector"
        >
          <button
            type="button"
            id="btn-find-flights"
            aria-expanded={activeTransport === "flights"}
            aria-controls="flight-search-panel"
            onClick={() => {
              setActiveTransport((prev) => (prev === "flights" ? null : "flights"));
            }}
            className={`flex-1 min-w-[120px] lg:min-w-0 px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTransport === "flights"
                ? "bg-primary text-white shadow-md"
                : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">flight</span>
            <span>Find Flights</span>
          </button>

          <button
            type="button"
            id="btn-find-trains"
            aria-expanded={activeTransport === "trains"}
            aria-controls="train-search-panel"
            onClick={() => {
              setActiveTransport((prev) => (prev === "trains" ? null : "trains"));
            }}
            className={`flex-1 min-w-[120px] lg:min-w-0 px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTransport === "trains"
                ? "bg-primary text-white shadow-md"
                : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">train</span>
            <span>Find Trains</span>
          </button>

          <button
            type="button"
            id="btn-find-hotels"
            aria-expanded={activeTransport === "hotels"}
            aria-controls="hotel-search-panel"
            onClick={() => {
              setActiveTransport((prev) => (prev === "hotels" ? null : "hotels"));
            }}
            className={`flex-1 min-w-[120px] lg:min-w-0 px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTransport === "hotels"
                ? "bg-primary text-white shadow-md"
                : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">hotel</span>
            <span>Find Hotels</span>
          </button>

          <button
            type="button"
            id="btn-find-route"
            aria-expanded={activeTransport === "route"}
            aria-controls="route-planner-panel"
            onClick={() => {
              setActiveTransport((prev) => (prev === "route" ? null : "route"));
            }}
            className={`flex-1 min-w-[120px] lg:min-w-0 px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTransport === "route"
                ? "bg-primary text-white shadow-md"
                : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">explore</span>
            <span>Route Planner</span>
          </button>

          <button
            type="button"
            id="btn-find-currency"
            aria-expanded={activeTransport === "currency"}
            aria-controls="currency-converter-panel"
            onClick={() => {
              setActiveTransport((prev) => (prev === "currency" ? null : "currency"));
            }}
            className={`flex-1 min-w-[120px] lg:min-w-0 px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTransport === "currency"
                ? "bg-primary text-white shadow-md"
                : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">currency_exchange</span>
            <span>Currency Converter</span>
          </button>

          <button
            type="button"
            id="btn-find-restaurants"
            aria-expanded={activeTransport === "restaurants"}
            aria-controls="restaurant-search-panel"
            onClick={() => {
              setActiveTransport((prev) => (prev === "restaurants" ? null : "restaurants"));
            }}
            className={`flex-1 min-w-[120px] lg:min-w-0 px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTransport === "restaurants"
                ? "bg-primary text-white shadow-md"
                : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">lunch_dining</span>
            <span>Nearby Restaurants</span>
          </button>
        </div>

        {/* Flight Search Panel */}
        {activeTransport === "flights" && (
          <div id="flight-search-panel" className="flex flex-col gap-6 animate-in fade-in duration-200">
            <FlightSearchWidget
              initialDepartureDate={departureDateSuggestion}
              initialReturnDate={returnDateSuggestion}
              onSearch={handleFlightSearch}
              isLoading={isSearchingFlights}
            />

            <FlightResultsList
              data={flightData}
              isLoading={isSearchingFlights}
              error={flightError}
              onRetry={() => {
                if (flightData) {
                  handleFlightSearch({
                    origin: flightData.origin,
                    destination: flightData.destination,
                    departure_date: flightData.departureDate,
                    return_date: flightData.returnDate,
                  });
                }
              }}
            />
          </div>
        )}

        {/* Train Search Panel */}
        {activeTransport === "trains" && (
          <div id="train-search-panel" className="flex flex-col gap-6 animate-in fade-in duration-200">
            <TrainSearchForm
              initialDepartureDate={trip.travel_date || undefined}
              onSearch={handleTrainSearch}
              isLoading={isSearchingTrains}
            />

            <TrainResultsList
              data={trainData}
              isLoading={isSearchingTrains}
              error={trainError}
              onRetry={() => {
                if (lastTrainSearchParams) {
                  handleTrainSearch(lastTrainSearchParams);
                }
              }}
              onFindConnectingRoutes={handleFindConnectingTrainRoutes}
              isSearchingConnecting={isSearchingConnecting}
            />

            {/* Connecting Routes Section */}
            {(connectingRouteData || isSearchingConnecting || connectingError) && (
              <div className="pt-4 border-t border-surface-container-high/60 flex flex-col gap-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">alt_route</span>
                  <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                    Connecting Routes via Interchange Hubs
                  </h3>
                </div>
                <MultiLegResultsList
                  data={connectingRouteData}
                  isLoading={isSearchingConnecting}
                  error={connectingError}
                  onRetry={handleFindConnectingTrainRoutes}
                />
              </div>
            )}
          </div>
        )}

        {/* Hotel Search Panel */}
        {activeTransport === "hotels" && (
          <div id="hotel-search-panel" className="flex flex-col gap-6 animate-in fade-in duration-200">
            <HotelSearchWidget
              initialDestination={destination?.name || (destName !== "Destination" ? destName : "")}
              initialCheckinDate={departureDateSuggestion}
              initialCheckoutDate={returnDateSuggestion}
              onSearch={handleHotelSearch}
              isLoading={isSearchingHotels}
            />

            <HotelResultsList
              data={hotelData}
              isLoading={isSearchingHotels}
              error={hotelError}
              onRetry={() => {
                if (lastHotelSearchParams) {
                  handleHotelSearch(lastHotelSearchParams);
                }
              }}
            />
          </div>
        )}

        {/* Route Planner Panel */}
        {activeTransport === "route" && (
          <div id="route-planner-panel" className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div id="trip-route-planner" className="flex flex-col gap-4">
              {hasCalculatedRoute && selectedLocation && destination?.latitude !== undefined && destination?.longitude !== undefined ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-low rounded-2xl border border-surface-container-high/60 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                      <span className="text-primary font-bold">{selectedLocation.name}</span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{destName}</span>
                    </div>
                    <button
                      type="button"
                      id="btn-change-origin"
                      onClick={handleChangeOrigin}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Change Origin</span>
                    </button>
                  </div>

                  <RouteMapContainer
                    origin={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
                    destination={{ latitude: destination.latitude, longitude: destination.longitude }}
                    originLabel={selectedLocation.name}
                    destinationLabel={destName}
                    initialProfile={selectedProfile}
                  />
                </div>
              ) : (
                <div className="bg-surface-container-low rounded-3xl p-6 sm:p-7 border border-surface-container-high/60 shadow-xs flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">explore</span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-headline-sm text-base sm:text-lg font-extrabold text-on-surface">
                        Route Planner
                      </h3>
                      {destination?.latitude !== undefined && destination?.longitude !== undefined ? (
                        <p className="text-xs text-on-surface-variant">
                          Destination coordinates verified: {destName} ({destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)})
                        </p>
                      ) : (
                        <p className="text-xs text-on-surface-variant">
                          Destination: {destName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Origin Search / Autocomplete Control */}
                  <div id="origin-selector" className="flex flex-col gap-3 relative">
                    <label htmlFor="origin-city-input" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
                      <span>Select Origin</span>
                    </label>

                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                        search
                      </span>
                      <input
                        id="origin-city-input"
                        ref={originInputRef}
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={showSuggestions}
                        aria-controls="origin-suggestions-list"
                        aria-activedescendant={highlightedIndex >= 0 ? `origin-option-${highlightedIndex}` : undefined}
                        value={originQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOriginQuery(val);
                          if (selectedLocation && val !== selectedLocation.name) {
                            setSelectedLocation(null);
                            setHasCalculatedRoute(false);
                          }
                        }}
                        onKeyDown={handleInputKeyDown}
                        onFocus={() => {
                          if (suggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        placeholder="Search origin city..."
                        className="w-full pl-11 pr-24 py-3 bg-surface-container-lowest border border-surface-container-high rounded-2xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-xs"
                      />

                      <div className="absolute right-3 flex items-center gap-1.5">
                        {isSearchingOrigin && (
                          <div
                            id="origin-loading-spinner"
                            className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-1"
                            title="Searching locations..."
                          />
                        )}
                        {originQuery && (
                          <button
                            type="button"
                            id="btn-clear-origin"
                            onClick={handleClearOrigin}
                            className="px-2.5 py-1 text-xs font-bold text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high/40 transition-colors cursor-pointer"
                            title="Clear origin"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Autocomplete Suggestions Dropdown */}
                    {showSuggestions && (
                      <div
                        id="origin-suggestions-list"
                        role="listbox"
                        aria-label="Origin location suggestions"
                        className="absolute top-full left-0 right-0 mt-1 z-30 bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                      >
                        {isSearchingOrigin && (
                          <div className="p-3 text-xs text-on-surface-variant flex items-center gap-2">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <span>Searching locations...</span>
                          </div>
                        )}

                        {!isSearchingOrigin && searchError && (
                          <div className="p-3 text-xs text-rose-600 bg-rose-50/50 flex items-center justify-between gap-2">
                            <span>{searchError}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setOriginQuery((prev) => prev);
                              }}
                              className="font-bold underline cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {!isSearchingOrigin && !searchError && suggestions.length === 0 && hasSearched && (
                          <div className="p-3 text-xs text-on-surface-variant">
                            No locations found for &apos;{originQuery.trim()}&apos;.
                          </div>
                        )}

                        {suggestions.length > 0 && (
                          <ul className="max-h-60 overflow-y-auto divide-y divide-surface-container-high/40">
                            {suggestions.map((loc, idx) => {
                              const isSelected = highlightedIndex === idx;
                              const subtitle = formatLocationSubtitle(loc);
                              return (
                                <li
                                  key={`${loc.latitude}-${loc.longitude}-${idx}`}
                                  id={`origin-option-${idx}`}
                                  role="option"
                                  aria-selected={isSelected}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectLocation(loc);
                                  }}
                                  onMouseEnter={() => setHighlightedIndex(idx)}
                                  className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-surface-container text-on-surface"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                                      location_city
                                    </span>
                                    <div className="flex flex-col">
                                      <span className="text-xs sm:text-sm font-bold">{loc.name}</span>
                                      {subtitle && (
                                        <span className="text-[11px] text-on-surface-variant font-medium">
                                          {subtitle}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono text-on-surface-variant opacity-70">
                                    {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[15px] text-primary">info</span>
                      <span>Search will resolve locations using Open-Meteo.</span>
                    </div>
                  </div>

                  {/* Selected Origin Summary & Explicit Calculate Route CTA */}
                  {destination?.latitude !== undefined && destination?.longitude !== undefined && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 flex flex-col gap-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {/* Origin Card */}
                        {selectedLocation ? (
                          <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-surface-container-low border border-primary/30">
                            <div className="flex items-start gap-2.5">
                              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">trip_origin</span>
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Selected Origin</span>
                                  <span className="text-emerald-600 material-symbols-outlined text-[15px]" title="Location verified">
                                    check_circle
                                  </span>
                                </div>
                                <span className="font-bold text-on-surface block text-sm">
                                  {selectedLocation.name}
                                </span>
                                {formatLocationSubtitle(selectedLocation) && (
                                  <span className="text-xs text-on-surface-variant block font-medium">
                                    {formatLocationSubtitle(selectedLocation)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-on-surface-variant text-[11px] font-mono shrink-0">
                              {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container border border-dashed border-surface-container-high text-on-surface-variant">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                            <span>Type and select an origin city above</span>
                          </div>
                        )}

                        {/* Destination Card */}
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-surface-container-low border border-emerald-600/30">
                          <span className="material-symbols-outlined text-emerald-700 dark:text-emerald-400 text-[20px] shrink-0 mt-0.5">
                            pin_drop
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Destination</span>
                              <span className="text-emerald-600 material-symbols-outlined text-[15px]" title="Trip destination">
                                check_circle
                              </span>
                            </div>
                            <span className="font-bold text-on-surface block text-sm truncate">
                              {destName}
                            </span>
                            {destLocation && (
                              <span className="text-xs text-on-surface-variant block font-medium">
                                {destLocation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Route Profile Selector & Calculate CTA Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-surface-container-high/40">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-on-surface-variant">Profile:</span>
                          <div className="inline-flex p-1 rounded-xl bg-surface-container-low border border-surface-container-high/60 gap-1">
                            {(
                              [
                                { id: "driving-car", label: "Driving", icon: "directions_car" },
                                { id: "cycling-regular", label: "Cycling", icon: "directions_bike" },
                                { id: "foot-walking", label: "Walking", icon: "directions_walk" },
                              ] as const
                            ).map((prof) => (
                              <button
                                key={prof.id}
                                type="button"
                                onClick={() => setSelectedProfile(prof.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                  selectedProfile === prof.id
                                    ? "bg-primary text-white shadow-xs"
                                    : "text-on-surface-variant hover:text-on-surface"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[15px]">{prof.icon}</span>
                                <span>{prof.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          id="btn-calculate-route"
                          disabled={!isCalculateRouteEnabled}
                          onClick={handleCalculateRoute}
                          className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 ${
                            isCalculateRouteEnabled
                              ? "bg-primary hover:bg-primary-container hover:shadow-md cursor-pointer"
                              : "bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed opacity-60"
                          }`}
                          title={!isCalculateRouteEnabled ? "Select a valid origin from suggestions to calculate route" : undefined}
                        >
                          {isCalculatingRoute ? (
                            <>
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>Calculating route...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]">directions</span>
                              <span>Calculate Route</span>
                            </>
                          )}
                        </button>
                      </div>

                      {routeError && (
                        <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200/80 flex items-center justify-between gap-2">
                          <span>{routeError}</span>
                          <button
                            type="button"
                            onClick={handleCalculateRoute}
                            className="font-bold underline cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Currency Converter Panel */}
        {activeTransport === "currency" && (
          <div id="currency-converter-panel" className="flex flex-col gap-6 animate-in fade-in duration-200">
            <CurrencyConverter
              initialAmount={trip.budget && trip.budget > 0 ? trip.budget : 100}
              initialFrom="USD"
              initialTo={getDestinationCurrency(destination)}
            />
          </div>
        )}

        {/* Nearby Restaurants Panel */}
        {activeTransport === "restaurants" && (
          <div id="restaurant-search-panel-container" className="flex flex-col gap-6 animate-in fade-in duration-200">
            <RestaurantSearch
              latitude={destination?.latitude}
              longitude={destination?.longitude}
              locationName={destName}
            />
          </div>
        )}
      </div>

      {/* 4. ITINERARY DAYS TIMELINE */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[26px]">calendar_today</span>
            <h2 className="font-headline-md text-2xl sm:text-3xl font-extrabold text-on-surface">
              Your Itinerary
            </h2>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            Sequential day timeline
          </span>
        </div>

        {sortedItineraries.length > 0 ? (
          <div className="flex flex-col gap-6">
            {sortedItineraries.map((itinerary) => (
              <ItineraryDay key={itinerary.id || itinerary.day_number} itinerary={itinerary} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-3xl p-10 text-center shadow-md border border-surface-container-high/50 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]">event_busy</span>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">
              No itinerary days recorded yet
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
              This trip was created without daily itinerary details. You can generate a full AI itinerary using the planner.
            </p>
            <Link
              href="/#planner"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md transition-all mt-2"
            >
              Generate Itinerary
            </Link>
          </div>
        )}
      </div>

      {/* 4. FOOTER NAVIGATION */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-surface-container-low rounded-2xl border border-surface-container-high/50">
        <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
          <span>Verified saved trip from your TravelSensei account.</span>
        </span>

        <div className="flex items-center gap-3">
          <Link
            href="/my-trips"
            className="px-4 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest hover:bg-surface-container text-xs font-bold text-on-surface transition-colors"
          >
            All Trips
          </Link>
          <Link
            href="/#planner"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm transition-all"
          >
            Plan Another Trip
          </Link>
        </div>
      </div>
    </div>
  );
}

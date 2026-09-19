"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TravelSenseiLogo from "@/components/TravelSenseiLogo";
import { TripDetails, TripItem, ItineraryItem } from "@/components/trips";
import { Destination } from "@/lib/recommendations/types";
import { Button } from "@/components/ui/button";

export default function TripDetailPage() {
  const params = useParams();
  const tripId = typeof params?.tripId === "string" ? params.tripId : "";

  const [trip, setTrip] = useState<TripItem | null>(null);
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [destination, setDestination] = useState<Destination | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setErrorStatus(400);
      setErrorMessage("Invalid trip identifier.");
      setIsLoading(false);
      return;
    }

    async function fetchTripData() {
      setIsLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        // 1. Check user authentication
        const authRes = await fetch("/api/auth/me");
        if (authRes.status === 401) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // 2. Fetch specific trip and its itineraries
        const [tripRes, itinRes, destsRes] = await Promise.all([
          fetch(`/api/trips?id=${encodeURIComponent(tripId)}`),
          fetch(`/api/itineraries?trip_id=${encodeURIComponent(tripId)}`),
          fetch("/api/destinations"),
        ]);

        if (tripRes.status === 401 || itinRes.status === 401) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (tripRes.status === 403 || itinRes.status === 403) {
          setErrorStatus(403);
          setErrorMessage("You do not have permission to view this travel plan.");
          setIsLoading(false);
          return;
        }

        if (tripRes.status === 404 || itinRes.status === 404) {
          setErrorStatus(404);
          setErrorMessage("The requested trip was not found.");
          setIsLoading(false);
          return;
        }

        const tripData = await tripRes.json();
        const itinData = await itinRes.json();
        const destsData = await destsRes.json();

        const foundTrip = Array.isArray(tripData.trips) && tripData.trips.length > 0 ? tripData.trips[0] : null;

        if (!foundTrip) {
          setErrorStatus(404);
          setErrorMessage("The requested trip was not found or does not belong to your account.");
          setIsLoading(false);
          return;
        }

        setTrip(foundTrip);

        if (itinRes.ok && itinData.success && Array.isArray(itinData.itineraries)) {
          setItineraries(itinData.itineraries);
        }

        if (destsRes.ok && destsData.success && Array.isArray(destsData.destinations)) {
          const matchedDest = destsData.destinations.find((d: Destination) => d.id === foundTrip.destination_id);
          setDestination(matchedDest);
        }
      } catch (err: unknown) {
        setErrorStatus(500);
        setErrorMessage("Network error while loading trip details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTripData();
  }, [tripId]);

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* 1. TOP NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-[1440px] mx-auto px-6 sm:px-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="cursor-pointer">
              <TravelSenseiLogo className="h-10" />
            </Link>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="text-on-surface-variant hover:text-on-surface px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors"
            >
              Home
            </Link>
            <Link
              href="/my-trips"
              className="text-on-surface-variant hover:text-on-surface px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors"
            >
              My Trips
            </Link>
            <Link
              href="/#planner"
              className="bg-primary hover:bg-primary-container text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ml-2"
            >
              <span>+ Plan Trip</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* 2. MAIN CONTENT */}
      <main className="w-full pt-28 pb-20 flex-1 max-w-[1440px] mx-auto px-6 sm:px-12 flex flex-col gap-8">
        {/* Loading State */}
        {isLoading ? (
          <div className="w-full py-24 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <p className="text-sm text-on-surface-variant font-medium">Loading itinerary details...</p>
          </div>
        ) : isAuthenticated === false ? (
          /* Unauthenticated State */
          <div className="w-full max-w-xl mx-auto my-12 bg-surface-container-lowest rounded-3xl p-8 sm:p-12 shadow-xl border border-surface-container-high/60 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">lock</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="font-headline-md text-2xl font-extrabold text-on-surface">
                Sign In Required
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
                Please sign in to view this trip itinerary.
              </p>
            </div>
            <Link
              href="/#login"
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-white text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              Sign In to Account
            </Link>
          </div>
        ) : errorStatus ? (
          /* Error / 404 / 403 State */
          <div className="w-full max-w-xl mx-auto my-12 bg-surface-container-lowest rounded-3xl p-8 sm:p-12 shadow-xl border border-surface-container-high/60 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">error</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="font-headline-md text-2xl font-extrabold text-on-surface">
                {errorStatus === 403 ? "Access Denied" : errorStatus === 404 ? "Trip Not Found" : "Unable to Load Trip"}
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
                {errorMessage}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/my-trips"
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-white text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Return to My Trips
              </Link>
              <Link
                href="/"
                className="px-5 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        ) : trip ? (
          /* Verified Trip Details */
          <TripDetails trip={trip} itineraries={itineraries} destination={destination} />
        ) : null}
      </main>
    </div>
  );
}

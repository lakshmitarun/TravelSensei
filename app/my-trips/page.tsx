"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TravelSenseiLogo from "@/components/TravelSenseiLogo";
import { TripCard, TripItem } from "@/components/trips";
import { Destination } from "@/lib/recommendations/types";
import { Button } from "@/components/ui/button";
import AccountMenu from "@/components/auth/AccountMenu";

export default function MyTripsPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [destinationsMap, setDestinationsMap] = useState<Record<string, Destination>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name?: string | null } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // 1. Check authentication status
        const authRes = await fetch("/api/auth/me");
        if (authRes.status === 401) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        if (!authRes.ok) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        const authData = await authRes.json();
        setIsAuthenticated(true);
        setCurrentUser(authData?.user || null);

        // 2. Fetch user's trips and public destination catalog in parallel
        const [tripsRes, destsRes] = await Promise.all([
          fetch("/api/trips"),
          fetch("/api/destinations"),
        ]);

        const [tripsData, destsData] = await Promise.all([
          tripsRes.json(),
          destsRes.json(),
        ]);

        if (destsRes.ok && destsData.success && Array.isArray(destsData.destinations)) {
          const map: Record<string, Destination> = {};
          for (const d of destsData.destinations) {
            map[d.id] = d;
          }
          setDestinationsMap(map);
        }

        if (tripsRes.ok && tripsData.success && Array.isArray(tripsData.trips)) {
          setTrips(tripsData.trips);
        } else {
          setErrorMessage(tripsData.message || "Failed to load your trips.");
        }
      } catch (err: unknown) {
        setErrorMessage("Network error while loading trips. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

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
            <span className="bg-primary-container text-white px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm">
              My Trips
            </span>
            <Link
              href="/#planner"
              className="bg-primary hover:bg-primary-container text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ml-2"
            >
              <span>+ Plan Trip</span>
            </Link>
            {isAuthenticated && (
              <AccountMenu
                user={currentUser}
                onLogoutSuccess={() => {
                  window.location.href = "/";
                }}
                className="ml-1"
              />
            )}
          </nav>
        </div>
      </header>

      {/* 2. MAIN CONTENT */}
      <main className="w-full pt-28 pb-20 flex-1 max-w-[1440px] mx-auto px-6 sm:px-12 flex flex-col gap-8">
        {/* Loading State */}
        {isLoading ? (
          <div className="w-full py-24 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <p className="text-sm text-on-surface-variant font-medium">Loading your saved trips...</p>
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
                Please sign in to view and manage your saved trips, generated itineraries, and personalized travel plans.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-white text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Sign In to TravelSensei
              </Link>
              <Link
                href="/"
                className="px-5 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold transition-colors"
              >
                Return Home
              </Link>
            </div>
          </div>
        ) : errorMessage ? (
          /* Error State */
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4 text-rose-900 text-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-rose-600 text-2xl">error</span>
              <span>{errorMessage}</span>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-xs border-rose-300 hover:bg-rose-100"
            >
              Retry
            </Button>
          </div>
        ) : trips.length === 0 ? (
          /* Empty State */
          <div className="w-full max-w-2xl mx-auto my-12 bg-surface-container-lowest rounded-3xl p-8 sm:p-14 shadow-xl border border-surface-container-high/60 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[42px]">luggage</span>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-headline-md text-2xl sm:text-3xl font-extrabold text-on-surface">
                No trips yet
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-md leading-relaxed">
                You haven&apos;t created any travel plans yet. Build your first personalized AI trip around your favorite destination, style, and budget.
              </p>
            </div>
            <Link
              href="/#planner"
              className="px-7 py-3.5 rounded-2xl bg-primary hover:bg-primary-container text-white text-sm font-extrabold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Plan a Trip</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          /* Trips Grid */
          <div className="flex flex-col gap-8">
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-surface-container-high/40 pb-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Travel Plans
                </span>
                <h1 className="font-headline-lg text-3xl sm:text-4xl font-extrabold text-on-surface">
                  My Saved Trips
                </h1>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Manage your upcoming adventures and generated day-by-day itineraries.
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant border border-surface-container-high/60 w-fit">
                {trips.length} {trips.length === 1 ? "Trip Saved" : "Trips Saved"}
              </span>
            </div>

            {/* Grid of Trip Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  destination={destinationsMap[trip.destination_id]}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

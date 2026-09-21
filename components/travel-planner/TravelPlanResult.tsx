"use client";

import React from "react";
import Link from "next/link";
import { TravelPlanResponse } from "@/lib/ai/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TravelPlanResultProps {
  data: TravelPlanResponse;
  onReset: () => void;
}

export default function TravelPlanResult({ data, onReset }: TravelPlanResultProps) {
  const { trip, recommendation, travel_plan } = data;
  const score = recommendation?.score ?? 85;

  // Determine score color badge
  const getScoreColor = (val: number) => {
    if (val >= 80) return "bg-emerald-500 text-white";
    if (val >= 60) return "bg-teal-600 text-white";
    return "bg-amber-500 text-white";
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500" id="trip-result">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-br from-primary via-primary-container to-teal-800 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Trip Saved Successfully
              </span>
              {trip?.id && (
                <span className="text-[11px] text-white/70 font-mono">
                  Ref: {trip.id.slice(0, 8)}...
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {travel_plan.destination.name}
            </h2>
            <p className="text-white/85 text-sm sm:text-base flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              {travel_plan.destination.state_country || "Verified Destination"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {trip?.id && (
              <>
                <Link
                  href={`/my-trips/${trip.id}#trip-flights`}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl px-5 py-2.5 transition-all flex items-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">flight</span>
                  <span>Find Flights</span>
                </Link>
                <Link
                  href={`/my-trips/${trip.id}#trip-trains`}
                  className="bg-primary hover:bg-primary-container text-white font-bold text-sm rounded-xl px-5 py-2.5 transition-all flex items-center gap-2 shadow-md border border-white/20"
                >
                  <span className="material-symbols-outlined text-[18px]">train</span>
                  <span>Find Trains</span>
                </Link>
              </>
            )}
            <Link
              href="/my-trips"
              className="bg-white hover:bg-white/90 text-primary font-bold text-sm rounded-xl px-5 py-2.5 transition-all flex items-center gap-2 shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">luggage</span>
              <span>Go to My Trips</span>
            </Link>
            <Button
              onClick={onReset}
              variant="outline"
              className="bg-white/15 hover:bg-white/25 border-white/30 text-white backdrop-blur-md font-semibold text-sm rounded-xl px-5 py-2.5 transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Plan Another Trip
            </Button>
          </div>
        </div>

        {/* Quick Details Bar */}
        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm text-white/90">
          <div>
            <span className="text-white/60 block text-[11px] uppercase tracking-wider font-semibold">Travel Date</span>
            <span className="font-bold text-white text-sm">{trip?.travel_date || "Upcoming"}</span>
          </div>
          <div>
            <span className="text-white/60 block text-[11px] uppercase tracking-wider font-semibold">Duration</span>
            <span className="font-bold text-white text-sm">{travel_plan.days.length} Days</span>
          </div>
          <div>
            <span className="text-white/60 block text-[11px] uppercase tracking-wider font-semibold">Target Budget</span>
            <span className="font-bold text-white text-sm">
              {trip?.budget ? `₹${trip.budget.toLocaleString("en-IN")}` : "Flexible"}
            </span>
          </div>
          <div>
            <span className="text-white/60 block text-[11px] uppercase tracking-wider font-semibold">Style</span>
            <span className="font-bold text-white text-sm capitalize">{trip?.travel_style || "Personalized"}</span>
          </div>
        </div>
      </div>

      {/* 2. RECOMMENDATION SCORE & AI SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recommendation Score Card */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-6 shadow-md border border-surface-container-high/60 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Match Engine Score
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${getScoreColor(score)} shadow-xs`}>
              {score} / 100
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="font-headline-sm text-lg font-bold text-on-surface">Why It Fits Your Travel Style</h4>
            <p className="text-xs text-on-surface-variant">
              Deterministic compatibility calculated across travel style, budget tier, pace, and season.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {recommendation?.reasons && recommendation.reasons.length > 0 ? (
              recommendation.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-on-surface bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high/40">
                  <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span>{reason}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant italic">Strong overall match for your selected criteria.</p>
            )}
          </div>
        </div>

        {/* AI Trip Overview Summary */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 shadow-md border border-surface-container-high/60 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">Trip Overview</h3>
          </div>
          <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
            {travel_plan.summary}
          </p>
          <div className="pt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
            <span className="px-3 py-1 rounded-lg bg-surface-container-low border border-surface-container-high/40 flex items-center gap-1">
              🗓️ {travel_plan.days.length} Day Schedule
            </span>
            <span className="px-3 py-1 rounded-lg bg-surface-container-low border border-surface-container-high/40 flex items-center gap-1">
              💡 {travel_plan.travel_tips.length} Local Tips
            </span>
            <span className="px-3 py-1 rounded-lg bg-surface-container-low border border-surface-container-high/40 flex items-center gap-1">
              💰 Budget Notes Included
            </span>
          </div>
        </div>
      </div>

      {/* 3. DAY-BY-DAY ITINERARY TIMELINE */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">calendar_today</span>
            <h3 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
              Day-by-Day Itinerary
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            Sequential day timeline
          </span>
        </div>

        <div className="flex flex-col gap-6">
          {travel_plan.days.map((dayItem) => (
            <div
              key={dayItem.day}
              className="bg-surface-container-lowest rounded-2xl p-6 shadow-md border border-surface-container-high/60 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-lg"
            >
              {/* Day Header Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-container-high/40">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                    D{dayItem.day}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                      Day {dayItem.day}
                    </span>
                    <h4 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                      {dayItem.title}
                    </h4>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant font-medium">
                  {dayItem.activities?.length || 0} Scheduled Activities
                </span>
              </div>

              {/* Day Activities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {dayItem.activities && dayItem.activities.length > 0 ? (
                  dayItem.activities.map((act, actIdx) => (
                    <div
                      key={actIdx}
                      className="bg-surface-container-low/70 rounded-xl p-4 flex flex-col gap-2 border border-surface-container-high/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide">
                          {act.time || "Activity"}
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-on-surface">
                        {act.activity}
                      </h5>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-on-surface-variant italic">Free exploration time.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. BUDGET NOTES & TRAVEL TIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget Notes */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-md border border-surface-container-high/60 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <span className="material-symbols-outlined text-[20px]">payments</span>
            <h4>Budget &amp; Cost Insights</h4>
          </div>
          <div className="flex flex-col gap-2.5 pt-1">
            {travel_plan.budget_notes && travel_plan.budget_notes.length > 0 ? (
              travel_plan.budget_notes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-on-surface-variant leading-relaxed">
                  <span className="text-primary font-bold">•</span>
                  <span>{note}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant">Standard regional costs apply.</p>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant/70 italic pt-2 border-t border-surface-container-high/40">
            * AI-generated planning estimations. Actual prices may fluctuate by season and booking dates.
          </p>
        </div>

        {/* Travel Tips */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-md border border-surface-container-high/60 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <span className="material-symbols-outlined text-[20px]">lightbulb</span>
            <h4>Local Travel Tips &amp; Etiquette</h4>
          </div>
          <div className="flex flex-col gap-2.5 pt-1">
            {travel_plan.travel_tips && travel_plan.travel_tips.length > 0 ? (
              travel_plan.travel_tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-on-surface-variant leading-relaxed">
                  <span className="text-primary font-bold">✓</span>
                  <span>{tip}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant">Follow local guidelines and respectful travel practices.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. BOTTOM ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-surface-container-low rounded-2xl border border-surface-container-high/50">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
          <span>This plan is stored in your account database under Ref #{trip?.id ? trip.id.slice(0, 8) : "SAVED"}.</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/my-trips"
            className="bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm px-5 py-2.5 rounded-xl border border-surface-container-high/60 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">luggage</span>
            <span>Go to My Trips</span>
          </Link>
          <Button
            onClick={onReset}
            className="bg-primary hover:bg-primary-container text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <span>Plan Another Trip</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

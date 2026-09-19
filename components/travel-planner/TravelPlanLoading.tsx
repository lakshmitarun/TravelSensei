"use client";

import React, { useEffect, useState } from "react";

const LOADING_STEPS = [
  "Analyzing destination highlights & seasonal weather...",
  "Calculating personalized recommendation compatibility...",
  "Crafting day-by-day tailored itinerary with Groq AI...",
  "Formatting local tips, activities, and budget observations...",
];

interface TravelPlanLoadingProps {
  destinationName?: string;
}

export default function TravelPlanLoading({ destinationName }: TravelPlanLoadingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-surface-container-lowest/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/60 flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Animated Orb & Spinner */}
      <div className="relative flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary via-primary-container to-secondary-container animate-spin blur-md opacity-40"></div>
        <div className="absolute w-20 h-20 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-inner">
          <span className="text-3xl animate-bounce">✨</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h3 className="font-headline-md text-xl sm:text-2xl font-extrabold text-on-surface">
          Designing your personalized trip{destinationName ? ` to ${destinationName}` : ""}...
        </h3>
        <p className="font-body-md text-sm text-on-surface-variant transition-all duration-300 min-h-[40px] flex items-center justify-center font-medium">
          {LOADING_STEPS[currentStepIndex]}
        </p>
      </div>

      {/* Progress Pills */}
      <div className="flex items-center gap-2 pt-2">
        {LOADING_STEPS.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === currentStepIndex
                ? "w-8 bg-primary"
                : idx < currentStepIndex
                ? "w-3 bg-primary/40"
                : "w-3 bg-surface-container-high"
            }`}
          />
        ))}
      </div>

      <div className="text-xs text-on-surface-variant/80 bg-surface-container-low px-4 py-2 rounded-full border border-surface-container-high/40">
        ⚡ Powered by deterministic ranking &amp; Groq LLaMA 3.3
      </div>
    </div>
  );
}

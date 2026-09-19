"use client";

import React, { useState, useEffect } from "react";
import { Destination } from "@/lib/recommendations/types";
import { TravelPlanResponse } from "@/lib/ai/types";
import TravelPlannerForm, { PlannerFormData } from "./TravelPlannerForm";
import TravelPlanLoading from "./TravelPlanLoading";
import TravelPlanResult from "./TravelPlanResult";

export default function TravelPlanner() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState<boolean>(true);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<TravelPlanResponse | null>(null);
  const [currentDestinationName, setCurrentDestinationName] = useState<string>("");

  // 1. Fetch available destinations and verify authentication status
  useEffect(() => {
    async function init() {
      // Check auth status
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.status === 401) {
          setIsAuthenticated(false);
        } else if (meRes.ok) {
          setIsAuthenticated(true);
        }
      } catch {
        // network issue, keep default
      }

      // Fetch public destination catalog
      try {
        setIsLoadingDestinations(true);
        const res = await fetch("/api/destinations");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.destinations)) {
          setDestinations(data.destinations);
          setDestinationsError(null);
        } else {
          setDestinationsError(data.message || "Failed to load destinations.");
        }
      } catch (err: unknown) {
        setDestinationsError("Unable to reach destinations service.");
      } finally {
        setIsLoadingDestinations(false);
      }
    }

    init();
  }, []);

  // 2. Handle Travel Plan Generation Submission
  const handleGeneratePlan = async (formData: PlannerFormData) => {
    setIsGenerating(true);
    setApiError(null);
    setPlanResult(null);

    const targetDest = destinations.find((d) => d.id === formData.destination_id);
    if (targetDest) {
      setCurrentDestinationName(targetDest.name);
    }

    try {
      const response = await fetch("/api/ai/travel-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setApiError("Please sign in to your TravelSensei account to generate and save a trip.");
        } else if (response.status === 400) {
          setApiError(data.message || "Please check your trip details and try again.");
        } else if (response.status === 404) {
          setApiError("The selected destination could not be found.");
        } else if (response.status === 502 || response.status === 503) {
          setApiError("AI travel planning service is temporarily unavailable. Please try again.");
        } else {
          setApiError(data.message || "Something went wrong while creating your trip.");
        }
        return;
      }

      setPlanResult(data as TravelPlanResponse);

      // Smooth scroll to results
      setTimeout(() => {
        const resultElement = document.getElementById("trip-result");
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err: unknown) {
      setApiError("Failed to connect to the travel planning service. Please check your network connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPlanResult(null);
    setApiError(null);
    setTimeout(() => {
      const plannerElement = document.getElementById("planner");
      if (plannerElement) {
        plannerElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  return (
    <div className="w-full flex flex-col gap-4" id="planner-container">
      {isGenerating ? (
        <TravelPlanLoading destinationName={currentDestinationName} />
      ) : planResult ? (
        <TravelPlanResult data={planResult} onReset={handleReset} />
      ) : (
        <TravelPlannerForm
          destinations={destinations}
          isLoadingDestinations={isLoadingDestinations}
          destinationsError={destinationsError}
          isAuthenticated={isAuthenticated}
          isGenerating={isGenerating}
          apiError={apiError}
          onSubmit={handleGeneratePlan}
        />
      )}
    </div>
  );
}

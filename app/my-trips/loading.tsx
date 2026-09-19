import React from "react";

export default function MyTripsLoading() {
  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-12 flex flex-col gap-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-3">
          <div className="h-4 w-28 bg-surface-container-high rounded-full"></div>
          <div className="h-10 w-64 bg-surface-container-high rounded-2xl"></div>
          <div className="h-4 w-96 bg-surface-container-high rounded-full"></div>
        </div>

        {/* Trips Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-sm border border-surface-container-high/50 flex flex-col gap-6 h-72 justify-between"
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-20 bg-surface-container-high rounded-full"></div>
                  <div className="h-6 w-24 bg-surface-container-high rounded-full"></div>
                </div>
                <div className="h-8 w-44 bg-surface-container-high rounded-xl"></div>
                <div className="h-4 w-32 bg-surface-container-high rounded-full"></div>
              </div>
              <div className="h-10 w-full bg-surface-container-high rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

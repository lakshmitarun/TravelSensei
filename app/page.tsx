"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TravelSenseiLogo from "@/components/TravelSenseiLogo";
import { TravelPlanner } from "@/components/travel-planner";

export default function Home() {
  const [activeNav, setActiveNav] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* HEADER NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-b border-surface-container-high/40 shadow-xs">
        <div className="h-[72px] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between">
          {/* LEFT: Brand Logo */}
          <Link href="/" className="inline-flex items-center hover:opacity-95 transition-opacity">
            <TravelSenseiLogo className="h-9 sm:h-9.5" />
          </Link>

          {/* CENTER: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {[
              { id: "home", label: "Home", href: "#" },
              { id: "my-trips", label: "My Trips", href: "/my-trips" },
              { id: "explore", label: "Explore", href: "#destinations" },
              { id: "how-it-works", label: "How It Works", href: "#how-it-works" },
              { id: "features", label: "Features", href: "#suite" },
              { id: "community", label: "Community", href: "#reviews" },
            ].map((item) => {
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setActiveNav(item.id)}
                  className={`transition-colors duration-200 text-[15px] font-medium py-1 relative ${
                    isActive
                      ? "text-primary font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-primary rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-3">
            <a
              className="h-[46px] px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-[15px] shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              href="#planner"
            >
              <span>Start Planning</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </a>
            <Link
              href="/my-trips"
              className="w-[42px] h-[42px] rounded-full bg-surface-container hover:bg-primary/10 text-primary border border-surface-container-high flex items-center justify-center cursor-pointer transition-colors"
              title="My Trips & Account"
            >
              <span className="material-symbols-outlined text-[20px]">
                person
              </span>
            </Link>
            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-[42px] h-[42px] rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-surface-container-high/40 bg-surface/98 backdrop-blur-2xl px-6 py-4 flex flex-col gap-2 shadow-lg">
            {[
              { id: "home", label: "Home", href: "#" },
              { id: "my-trips", label: "My Trips", href: "/my-trips" },
              { id: "explore", label: "Explore", href: "#destinations" },
              { id: "how-it-works", label: "How It Works", href: "#how-it-works" },
              { id: "features", label: "Features", href: "#suite" },
              { id: "community", label: "Community", href: "#reviews" },
            ].map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => {
                  setActiveNav(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeNav === item.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="w-full pt-[72px] flex-1 bg-surface">
        <div className="flex flex-col w-full">
          {/* 1. HERO SECTION */}
          <section className="relative w-full overflow-hidden -mt-[72px] pt-24 pb-20 lg:pb-32 bg-surface">
            {/* Full Bleed Atmospheric Backdrop */}
            <div className="absolute inset-0 z-0">
              <img
                alt="Kauai coastline with verdant tropical mountains meeting turquoise ocean waters under sunset"
                className="w-full h-full object-cover object-center brightness-[0.88] saturate-[1.1]"
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-on-background/85 via-on-background/60 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/30"></div>
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pt-12 lg:pt-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
                {/* Left Column: Vision & Primary Actions */}
                <div className="lg:col-span-6 flex flex-col items-start gap-space-md text-white">



                  <h1 className="font-display-lg-mobile lg:font-display-lg text-display-lg-mobile lg:text-display-lg text-white font-extrabold tracking-tight leading-[1.08]">
                    Travel Smarter.
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-fixed via-primary-fixed-dim to-secondary-fixed">
                      Travel Your Way.
                    </span>
                  </h1>
                  <p className="font-body-lg text-body-lg text-white/85 max-w-xl">
                    Discover destinations, build personalized itineraries, and plan your entire trip around your interests, dates, and budget — powered by state-of-the-art travel AI.
                  </p>
                  <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                    <a
                      className="px-space-lg py-3.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-space-xs"
                      href="#planner"
                    >
                      <span>Plan My Trip</span>
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    </a>
                    <a
                      className="px-space-lg py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-label-lg text-label-lg transition-all flex items-center gap-space-xs"
                      href="#destinations"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        explore
                      </span>
                      <span>Explore Places</span>
                    </a>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-space-lg flex items-center gap-space-xl text-white/90">
                    <div className="flex items-center gap-space-sm">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-on-primary shadow-md">
                          AS
                        </div>
                        <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-xs font-bold text-on-tertiary shadow-md">
                          RM
                        </div>
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-on-secondary shadow-md">
                          PK
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg leading-tight font-bold text-white">
                          100,000+
                        </span>
                        <span className="font-body-sm text-body-sm text-white/70">
                          Trips Planned
                        </span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/20"></div>
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-amber-400 fill-current text-[20px]">
                        star
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg leading-tight font-bold text-white">
                          4.9 / 5.0
                        </span>
                        <span className="font-body-sm text-body-sm text-white/70">
                          Traveler Rating
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Trip Planner Card */}
                <div className="lg:col-span-6 w-full mt-space-lg lg:mt-0" id="planner">
                  <TravelPlanner />
                </div>
              </div>
            </div>
          </section>

          {/* 2. VALUE PROPOSITION STRIP */}
          <section className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin -mt-8 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {/* Card 1 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md hover:shadow-xl transition-shadow flex flex-col gap-space-sm border border-surface-container-high/40">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">tune</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Personalized Picks</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Algorithms calibrated around your individual pace, dietary needs, culinary curiosities, and cultural interests.
                </p>
              </div>
              {/* Card 2 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md hover:shadow-xl transition-shadow flex flex-col gap-space-sm border border-surface-container-high/40">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Budget-Aware Planning</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Intelligent real-time cost estimation covering transits, lodging, entry tickets, and dining with zero hidden surprises.
                </p>
              </div>
              {/* Card 3 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md hover:shadow-xl transition-shadow flex flex-col gap-space-sm border border-surface-container-high/40">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">route</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Smart Day Schedules</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Optimized sequencing that groups nearby attractions, reduces transit exhaustion, and ensures venues are open.
                </p>
              </div>
              {/* Card 4 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md hover:shadow-xl transition-shadow flex flex-col gap-space-sm border border-surface-container-high/40">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">radar</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Real-Time Radar</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Live crowd meters, seasonal weather alerts, ticket availability reminders, and instant rerouting buffers.
                </p>
              </div>
            </div>
          </section>

          {/* 3. HOW IT WORKS */}
          <section className="w-full py-24 bg-surface" id="how-it-works">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col gap-space-xl">
              <div className="flex flex-col items-center text-center gap-space-xs max-w-2xl mx-auto">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                  Effortless Logistics
                </span>
                <h2 className="font-headline-xl-mobile lg:font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface font-bold">
                  Your trip. Simplified.
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Four automated steps to transform a loose destination dream into a fully optimized, minute-by-minute holiday schedule.
                </p>
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter pt-space-md">
                <div className="hidden lg:block absolute top-[44px] left-[10%] right-[10%] h-0.5 bg-surface-container-highest z-0"></div>

                <div className="relative z-10 flex flex-col items-center text-center gap-space-sm bg-surface-container-lowest lg:bg-transparent p-space-md lg:p-0 rounded-2xl shadow-sm lg:shadow-none border border-surface-container-high/30 lg:border-none">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center font-headline-md text-headline-md font-bold shadow-md ring-4 ring-surface">
                    01
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface pt-2">Tell Us About It</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                    Enter your destination, dates, budget ceiling, and travel companions or general mood.
                  </p>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center gap-space-sm bg-surface-container-lowest lg:bg-transparent p-space-md lg:p-0 rounded-2xl shadow-sm lg:shadow-none border border-surface-container-high/30 lg:border-none">
                  <div className="w-16 h-16 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-headline-md text-headline-md font-bold shadow-md ring-4 ring-surface">
                    02
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface pt-2">Personalized Picks</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                    TravelSensei cross-checks 10,000+ local venues, hidden spots, and verified reviews to pick matches.
                  </p>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center gap-space-sm bg-surface-container-lowest lg:bg-transparent p-space-md lg:p-0 rounded-2xl shadow-sm lg:shadow-none border border-surface-container-high/30 lg:border-none">
                  <div className="w-16 h-16 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-headline-md text-headline-md font-bold shadow-md ring-4 ring-surface">
                    03
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface pt-2">Generate Schedule</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                    AI arranges an intelligent, low-fatigue agenda factoring in local transit, opening times, and meal breaks.
                  </p>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center gap-space-sm bg-surface-container-lowest lg:bg-transparent p-space-md lg:p-0 rounded-2xl shadow-sm lg:shadow-none border border-surface-container-high/30 lg:border-none">
                  <div className="w-16 h-16 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-headline-md text-headline-md font-bold shadow-md ring-4 ring-surface">
                    04
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface pt-2">Plan With Confidence</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                    Access clear interactive maps, weather forecasts, booking links, and transparent cost estimates.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. PERSONALIZED RECOMMENDATIONS SECTION */}
          <section className="w-full py-20 bg-surface-container-low" id="recommendations">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                <div className="lg:col-span-5 flex flex-col gap-space-md">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                    Curated Just For You
                  </span>
                  <h2 className="font-headline-xl-mobile lg:font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface font-bold leading-tight">
                    Not just recommendations.
                    <br />
                    Recommendations made for you.
                  </h2>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    Generic top-10 lists result in crowded tourist traps and wasted travel time. TravelSensei’s neural planner computes your tastes, historical travel habits, and energy profile to select locations that genuinely resonate.
                  </p>
                  <div className="space-y-3 pt-space-xs">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">
                        verified
                      </span>
                      <div>
                        <h4 className="font-headline-sm text-headline-sm text-on-surface">Vibe & Tempo Alignment</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Prefer slow morning coffees over sunrise hikes? Your daily rhythm dictates our sequencing.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">
                        verified
                      </span>
                      <div>
                        <h4 className="font-headline-sm text-headline-sm text-on-surface">Culinary Sensitivity</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Filters across vegetarian, halal, vegan, and authentic street-food stalls with top sanitation ranks.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-surface-container-lowest rounded-2xl p-space-lg lg:p-space-xl shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
                    <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-3 h-3 rounded-full bg-primary animate-ping"></div>
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          Live Simulation: Kyoto, Japan • 5 Days
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">bolt</span> 98% Match Score
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <button className="px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm">
                        All Picks
                      </button>
                      <button className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high">
                        History (2)
                      </button>
                      <button className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high">
                        Food (1)
                      </button>
                      <button className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high">
                        Culture (1)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                      <div className="bg-surface-container-low rounded-xl p-space-md flex gap-space-sm items-start hover:shadow-md transition-shadow">
                        <img
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          alt="Charminar monument in Hyderabad"
                          src="https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=300&q=80"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">Charminar</h4>
                            <span className="flex items-center text-xs font-bold text-on-surface">
                              <span className="text-amber-500 mr-0.5">★</span>4.8
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-primary">Historic Monument</span>
                          <p className="text-[12px] text-on-surface-variant line-clamp-1 pt-1">
                            Morning light photography & Laad Bazaar walk.
                          </p>
                        </div>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-space-md flex gap-space-sm items-start hover:shadow-md transition-shadow">
                        <img
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          alt="Golconda Fort ruins in Hyderabad"
                          src="https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=300&q=80"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">Golconda Fort</h4>
                            <span className="flex items-center text-xs font-bold text-on-surface">
                              <span className="text-amber-500 mr-0.5">★</span>4.7
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-primary">Acoustic Marvel</span>
                          <p className="text-[12px] text-on-surface-variant line-clamp-1 pt-1">
                            Sunset view point & sound light show.
                          </p>
                        </div>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-space-md flex gap-space-sm items-start hover:shadow-md transition-shadow">
                        <img
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          alt="Chowmahalla Palace hall"
                          src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=300&q=80"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">Chowmahalla Palace</h4>
                            <span className="flex items-center text-xs font-bold text-on-surface">
                              <span className="text-amber-500 mr-0.5">★</span>4.9
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-primary">Nizam Heritage</span>
                          <p className="text-[12px] text-on-surface-variant line-clamp-1 pt-1">
                            Royal courtyards & vintage car collection.
                          </p>
                        </div>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-space-md flex gap-space-sm items-start hover:shadow-md transition-shadow">
                        <img
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          alt="Authentic Dum Biryani and tea"
                          src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">Old City Food Trail</h4>
                            <span className="flex items-center text-xs font-bold text-on-surface">
                              <span className="text-amber-500 mr-0.5">★</span>4.9
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-secondary">Culinary Journey</span>
                          <p className="text-[12px] text-on-surface-variant line-clamp-1 pt-1">
                            Dum Biryani at Shadab & Irani Chai at Nimrah.
                          </p>
                        </div>
                      </div>
                    </div>


                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. AI ITINERARY SPLIT SECTION */}
          <section className="w-full py-24 bg-surface">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                <div className="lg:col-span-7 order-2 lg:order-1">
                  <div className="bg-surface-container-lowest rounded-2xl p-space-lg lg:p-space-xl shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
                    <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm">
                      <div className="flex items-center gap-space-xs">
                        <span className="px-2.5 py-1 rounded-md bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                          DAY 01
                        </span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Old City Heritage & Flavors
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-primary">
                            directions_walk
                          </span>{" "}
                          4.2 km total
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-primary">
                            battery_charging_full
                          </span>{" "}
                          Low Fatigue
                        </span>
                      </div>
                    </div>

                    <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                      <div className="relative flex items-start gap-space-md">
                        <div className="absolute -left-[30px] w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-[12px] shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">restaurant</span>
                        </div>
                        <div className="flex-1 bg-surface-container-low p-space-sm rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-primary tracking-wider uppercase">09:00 AM • Breakfast</span>
                            <h5 className="font-label-lg text-label-lg text-on-surface">Minerva Coffee House</h5>
                            <p className="text-xs text-on-surface-variant">Crisp ghee dosa & classic South Indian filter coffee</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 bg-surface rounded text-on-surface">₹250 pp</span>
                        </div>
                      </div>

                      <div className="relative flex items-start gap-space-md">
                        <div className="absolute -left-[30px] w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-[12px] shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                        </div>
                        <div className="flex-1 bg-surface-container-low p-space-sm rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-primary tracking-wider uppercase">10:00 AM • Sightseeing</span>
                            <h5 className="font-label-lg text-label-lg text-on-surface">Charminar & Laad Bazaar</h5>
                            <p className="text-xs text-on-surface-variant">Heritage exploration and lac bangles craftsmanship</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 bg-surface rounded text-on-surface">₹40 ticket</span>
                        </div>
                      </div>

                      <div className="relative flex items-start gap-space-md">
                        <div className="absolute -left-[30px] w-6 h-6 rounded-full bg-secondary-container text-white flex items-center justify-center text-[12px] shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">lunch_dining</span>
                        </div>
                        <div className="flex-1 bg-surface-container-low p-space-sm rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-secondary tracking-wider uppercase">12:30 PM • Famous Lunch</span>
                            <h5 className="font-label-lg text-label-lg text-on-surface">Hotel Shadab</h5>
                            <p className="text-xs text-on-surface-variant">Authentic Mutton Dum Biryani with mirchi ka salan</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 bg-surface rounded text-on-surface">₹450 pp</span>
                        </div>
                      </div>

                      <div className="relative flex items-start gap-space-md">
                        <div className="absolute -left-[30px] w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-[12px] shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">museum</span>
                        </div>
                        <div className="flex-1 bg-surface-container-low p-space-sm rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-primary tracking-wider uppercase">02:00 PM • Royal Architecture</span>
                            <h5 className="font-label-lg text-label-lg text-on-surface">Chowmahalla Palace</h5>
                            <p className="text-xs text-on-surface-variant">Courtyard fountains, crystal chandeliers & Rolls Royce</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 bg-surface rounded text-on-surface">₹100 ticket</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-space-md order-1 lg:order-2">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                    Smart Schedules
                  </span>
                  <h2 className="font-headline-xl-mobile lg:font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface font-bold leading-tight">
                    An itinerary that actually fits your trip.
                  </h2>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    No more rushing across town during peak rush hours or discovering closed gates. TravelSensei groups points of interest sequentially along physical traffic corridors, inserting realistic 30-minute buffers so you never feel stressed.
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        check_circle
                      </span>
                      <span className="font-body-md text-body-md">
                        Dynamic opening/closing hours verification
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        check_circle
                      </span>
                      <span className="font-body-md text-body-md">
                        Predictive pedestrian walking fatigue index
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        check_circle
                      </span>
                      <span className="font-body-md text-body-md">
                        Automatic wet-weather backup suggestions
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. SMART BUDGET SECTION */}
          <section className="w-full py-20 bg-surface-container-low">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col gap-space-xl">
              <div className="flex flex-col items-center text-center gap-space-xs max-w-2xl mx-auto">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                  Financial Clarity
                </span>
                <h2 className="font-headline-xl-mobile lg:font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface font-bold">
                  Know what your trip could really cost.
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Complete, itemized expense forecasting tailored to your travel preference and destination economics.
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-space-lg lg:p-space-xl shadow-xl flex flex-col gap-space-lg border border-surface-container-high/40">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md p-space-md bg-surface-container-low rounded-xl items-center">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                      Target Budget
                    </span>
                    <span className="font-headline-xl text-headline-xl font-extrabold text-on-surface">
                      ₹30,000
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Set ceiling for 5-Day getaway
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-primary uppercase font-bold">
                      Estimated Cost
                    </span>
                    <span className="font-headline-xl text-headline-xl font-extrabold text-primary">
                      ₹23,400
                    </span>
                    <span className="text-xs text-primary font-medium">
                      All transit, stay & dining included
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold">
                      Contingency Buffer
                    </span>
                    <span className="font-headline-xl text-headline-xl font-extrabold text-tertiary">
                      ₹6,600
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Surplus reserve for souvenirs & emergencies
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                    <span>Budget Allocation: 78.0% Used</span>
                    <span className="text-primary font-bold">Safe Spending Zone</span>
                  </div>
                  <div className="w-full h-4 bg-surface-container rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: "36%" }} title="Transport: 36%"></div>
                    <div className="h-full bg-tertiary" style={{ width: "30%" }} title="Stay: 30%"></div>
                    <div className="h-full bg-secondary-container" style={{ width: "17%" }} title="Food: 17%"></div>
                    <div className="h-full bg-primary-container" style={{ width: "9%" }} title="Activities: 9%"></div>
                    <div className="h-full bg-outline-variant" style={{ width: "8%" }} title="Contingency: 8%"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md pt-space-xs">
                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-primary">
                      <span className="w-3 h-3 rounded-full bg-primary"></span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Transport</span>
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₹8,500</span>
                    <span className="text-xs text-on-surface-variant">Flights & App Cabs</span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-tertiary">
                      <span className="w-3 h-3 rounded-full bg-tertiary"></span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Stay</span>
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₹7,000</span>
                    <span className="text-xs text-on-surface-variant">3-Star Boutique Hotel</span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-secondary-container">
                      <span className="w-3 h-3 rounded-full bg-secondary-container"></span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Food & Dining</span>
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₹4,000</span>
                    <span className="text-xs text-on-surface-variant">Authentic Heritage Eats</span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-primary-container">
                      <span className="w-3 h-3 rounded-full bg-primary-container"></span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Activities</span>
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₹2,000</span>
                    <span className="text-xs text-on-surface-variant">Monument Entry & Boat</span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-outline">
                      <span className="w-3 h-3 rounded-full bg-outline"></span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Buffer</span>
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₹2,000</span>
                    <span className="text-xs text-on-surface-variant">Snacks & Gratuities</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 7. EXPLORE DESTINATIONS GRID */}
          <section className="w-full py-24 bg-surface" id="destinations">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col gap-space-xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs max-w-xl">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                    Popular Getaways
                  </span>
                  <h2 className="font-headline-xl-mobile lg:font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface font-bold">
                    Find your next adventure.
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Explore curated blueprints across India’s most iconic escapes. Each comes preloaded with smart routes and live local estimates.
                  </p>
                </div>
                <a
                  className="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary hover:text-primary-container font-semibold transition-colors"
                  href="#"
                >
                  <span>View All 120+ Locations</span>
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {/* Hyderabad */}
                <div className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-surface-container-high/40">
                  <div className="relative h-60 w-full overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt="Hyderabad Charminar"
                      src="https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=600&q=80"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm flex items-center gap-1">
                      <span className="text-amber-400">★</span> 4.9
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Heritage</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Food Trail</span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col gap-space-sm flex-1 justify-between">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Hyderabad</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
                        The City of Pearls. Grand Nizam palaces, centuries-old ramparts, bustling bazaars, and world-legendary Biryani trails.
                      </p>
                    </div>
                    <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
                      <span className="text-xs font-medium text-on-surface-variant">From ₹12,000 / person</span>
                      <button
                        className="text-primary hover:text-primary-container font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span>Explore Itineraries</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Goa */}
                <div className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-surface-container-high/40">
                  <div className="relative h-60 w-full overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt="Goa beach landscape"
                      src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm flex items-center gap-1">
                      <span className="text-amber-400">★</span> 4.8
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Coastal</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Cafes</span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col gap-space-sm flex-1 justify-between">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Goa</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
                        Sun, sand, tranquil coastal coves, pastel Portuguese quarters, seaside sunset shacks, and vibrant flea markets.
                      </p>
                    </div>
                    <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
                      <span className="text-xs font-medium text-on-surface-variant">From ₹15,000 / person</span>
                      <button
                        className="text-primary hover:text-primary-container font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span>Explore Itineraries</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Jaipur */}
                <div className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-surface-container-high/40">
                  <div className="relative h-60 w-full overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt="Jaipur Hawa Mahal"
                      src="https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm flex items-center gap-1">
                      <span className="text-amber-400">★</span> 4.9
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Royal</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Forts</span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col gap-space-sm flex-1 justify-between">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Jaipur</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
                        The Royal Pink City. Majestic hill forts, palatial courtyards, handloom textile workshops, and royal Rajputana dining.
                      </p>
                    </div>
                    <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
                      <span className="text-xs font-medium text-on-surface-variant">From ₹14,000 / person</span>
                      <button
                        className="text-primary hover:text-primary-container font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span>Explore Itineraries</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Manali */}
                <div className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-surface-container-high/40">
                  <div className="relative h-60 w-full overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt="Manali Himalayas"
                      src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm flex items-center gap-1">
                      <span className="text-amber-400">★</span> 4.8
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Alpine</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Snow</span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col gap-space-sm flex-1 justify-between">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Manali</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
                        Towering Himalayan snow peaks, Solang Valley adventure circuits, cedar forests, and cozy mountain cafe retreats.
                      </p>
                    </div>
                    <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
                      <span className="text-xs font-medium text-on-surface-variant">From ₹12,000 / person</span>
                      <button
                        className="text-primary hover:text-primary-container font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span>Explore Itineraries</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kerala */}
                <div className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-surface-container-high/40">
                  <div className="relative h-60 w-full overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt="Kerala Backwaters"
                      src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm flex items-center gap-1">
                      <span className="text-amber-400">★</span> 4.9
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Backwaters</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Ayurveda</span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col gap-space-sm flex-1 justify-between">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Kerala</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
                        God’s Own Country. Serene backwater houseboats, rolling mist-clad tea plantations of Munnar, and Ayurvedic sanctuaries.
                      </p>
                    </div>
                    <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
                      <span className="text-xs font-medium text-on-surface-variant">From ₹18,000 / person</span>
                      <button
                        className="text-primary hover:text-primary-container font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span>Explore Itineraries</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Varanasi */}
                <div className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-surface-container-high/40">
                  <div className="relative h-60 w-full overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt="Varanasi Ghats"
                      src="https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm flex items-center gap-1">
                      <span className="text-amber-400">★</span> 4.9
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Spiritual</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold">Ghats</span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col gap-space-sm flex-1 justify-between">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Varanasi</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
                        Timeless spiritual river ghats, labyrinthine ancient alleys, dawn wooden boat rides, and twilight Ganga Aarti chants.
                      </p>
                    </div>
                    <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
                      <span className="text-xs font-medium text-on-surface-variant">From ₹9,500 / person</span>
                      <button
                        className="text-primary hover:text-primary-container font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span>Explore Itineraries</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. ALL-IN-ONE TRAVEL SUITE */}
          <section className="w-full py-20 bg-surface-container-low" id="suite">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col gap-space-xl">
              <div className="flex flex-col items-center text-center gap-space-xs max-w-2xl mx-auto">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                  Full Travel Stack
                </span>
                <h2 className="font-headline-xl-mobile lg:font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface font-bold">
                  Everything you need. One travel assistant.
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Connect every piece of your journey into a cohesive command center without tab jumping.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-md">
                <div className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-2 hover:bg-surface-container-lowest/80 transition-colors shadow-sm border border-surface-container-high/30">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">flight</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Flights</span>
                  <span className="text-[11px] text-on-surface-variant">Live fares & tracker</span>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-2 hover:bg-surface-container-lowest/80 transition-colors shadow-sm border border-surface-container-high/30">
                  <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">train</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Trains</span>
                  <span className="text-[11px] text-on-surface-variant">PNR & berth status</span>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-2 hover:bg-surface-container-lowest/80 transition-colors shadow-sm border border-surface-container-high/30">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container/15 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">directions_bus</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Buses</span>
                  <span className="text-[11px] text-on-surface-variant">Inter-city routes</span>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-2 hover:bg-surface-container-lowest/80 transition-colors shadow-sm border border-surface-container-high/30">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">hotel</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Hotels</span>
                  <span className="text-[11px] text-on-surface-variant">Boutique & luxury</span>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-2 hover:bg-surface-container-lowest/80 transition-colors shadow-sm border border-surface-container-high/30">
                  <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">map</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Maps & GPS</span>
                  <span className="text-[11px] text-on-surface-variant">Offline route sync</span>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-2 hover:bg-surface-container-lowest/80 transition-colors shadow-sm border border-surface-container-high/30">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">sunny</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Weather Radar</span>
                  <span className="text-[11px] text-on-surface-variant">Hourly forecasts</span>
                </div>
              </div>
            </div>
          </section>

          {/* 9. COMMUNITY & TESTIMONIALS */}
          <section className="w-full py-24 bg-surface" id="reviews">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col gap-space-xl">
              <div className="flex flex-col items-center text-center gap-space-xs max-w-2xl mx-auto">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                  Traveler Stories
                </span>
                <h2 className="font-headline-xl-mobile lg:font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface font-bold">
                  Travel experiences from real travelers.
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  See how fellow globetrotters eliminated the headache of spreadsheet planning.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md flex flex-col justify-between gap-space-md border border-surface-container-high/40">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex text-amber-500">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant italic">
                      "TravelSensei kept me strictly within my ₹18k student budget for Manali. The transit schedules between Solang Valley and Old Manali cafes were remarkably spot-on!"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-space-sm border-t border-surface-container">
                    <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed font-bold flex items-center justify-center">
                      AS
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">Ananya Sharma</span>
                      <span className="text-xs text-on-surface-variant">Solo Backpacker • Manali Trip</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md flex flex-col justify-between gap-space-md border border-surface-container-high/40">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex text-amber-500">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant italic">
                      "The day-by-day timetable accounted for travel times between Alleppey houseboats and Munnar tea gardens. Zero frantic driving. Best couple vacation we have ever had."
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-space-sm border-t border-surface-container">
                    <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold flex items-center justify-center">
                      RP
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">Rahul & Priya</span>
                      <span className="text-xs text-on-surface-variant">Couple Getaway • Kerala</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md flex flex-col justify-between gap-space-md border border-surface-container-high/40">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex text-amber-500">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant italic">
                      "Planning for kids and elderly parents usually requires endless compromises. TravelSensei paced our Jaipur tour with midday rests so nobody burned out."
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-space-sm border-t border-surface-container">
                    <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold flex items-center justify-center">
                      VM
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">Vikram Mehta</span>
                      <span className="text-xs text-on-surface-variant">Family of 4 • Jaipur Forts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 10. FINAL CTA BANNER */}
          <section className="w-full pb-20 bg-surface">
            <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-emerald-900 p-space-xl lg:p-20 text-white shadow-2xl flex flex-col items-center text-center gap-space-md border border-white/10">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none"></div>
                <span className="relative z-10 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                  Ready in 30 Seconds
                </span>
                <h2 className="relative z-10 font-display-lg-mobile lg:font-display-lg text-display-lg-mobile lg:text-display-lg font-extrabold tracking-tight max-w-2xl leading-[1.1]">
                  Your next adventure starts here.
                </h2>
                <p className="relative z-10 font-body-lg text-body-lg text-white/90 max-w-xl">
                  Tell TravelSensei where you want to go. We'll help you figure out the rest in under 30 seconds.
                </p>
                <div className="relative z-10 pt-space-sm">
                  <a
                    className="px-space-xl py-4 rounded-xl bg-white hover:bg-surface-bright text-primary font-headline-sm text-headline-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-space-xs"
                    href="#planner"
                  >
                    <span>Start Planning — It's Free</span>
                    <span className="material-symbols-outlined text-[20px]">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-low mt-space-xl border-t border-surface-container-high/40">
        <div className="max-w-[1440px] mx-auto px-margin py-space-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-gutter mb-space-xl">
            <div className="lg:col-span-2 flex flex-col gap-space-md">
              <div className="flex items-center gap-space-sm">
                <TravelSenseiLogo className="h-9" />
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                Your AI Travel Companion. Seamless multi-city journeys, bespoke local curation, and predictive itinerary logistics at your fingertips.
              </p>
            </div>
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-lg text-label-lg text-on-surface">Product</span>
              <nav className="flex flex-col gap-space-xs">
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  AI Trip Architect
                </a>
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  Smart Route Optimizer
                </a>
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  Flight & Hotel Sync
                </a>
              </nav>
            </div>
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-lg text-label-lg text-on-surface">Company</span>
              <nav className="flex flex-col gap-space-xs">
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  About Us
                </a>
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  Careers
                </a>
              </nav>
            </div>
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-lg text-label-lg text-on-surface">Resources</span>
              <nav className="flex flex-col gap-space-xs">
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  Travel Guides
                </a>
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  Help Center
                </a>
              </nav>
            </div>
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-lg text-label-lg text-on-surface">Legal</span>
              <nav className="flex flex-col gap-space-xs">
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  Privacy Policy
                </a>
                <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                  Terms of Service
                </a>
              </nav>
            </div>
          </div>
          <div className="pt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md text-on-surface-variant border-t border-surface-container">
            <p className="font-body-sm text-body-sm">© 2026 TravelSensei Inc. All rights reserved.</p>
            <div className="flex items-center gap-space-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Designed for Modern Explorers
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


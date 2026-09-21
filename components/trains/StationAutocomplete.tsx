"use client";

import React, { useState, useEffect, useRef } from "react";
import { TrainStation } from "@/lib/trains/types";

interface StationAutocompleteProps {
  id?: string;
  label: string;
  placeholder?: string;
  value: TrainStation | null;
  onChange: (station: TrainStation | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  className?: string;
}

export default function StationAutocomplete({
  id,
  label,
  placeholder = "Search station (e.g. New Delhi, NDLS, Mumbai)...",
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  className = "",
}: StationAutocompleteProps) {
  const [query, setQuery] = useState<string>(
    value ? `${value.name} (${value.code})` : ""
  );
  const [suggestions, setSuggestions] = useState<TrainStation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize input text with external value prop
  useEffect(() => {
    if (value) {
      setQuery(`${value.city ? `${value.city} - ` : ""}${value.name} (${value.code})`);
    } else if (!isOpen) {
      setQuery("");
    }
  }, [value, isOpen]);

  // Handle outside clicks to close dropdown and reset unselected text
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (value) {
          setQuery(`${value.city ? `${value.city} - ` : ""}${value.name} (${value.code})`);
        } else {
          setQuery("");
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Debounced station search fetch
  const fetchStations = (searchTerm: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trains/stations?q=${encodeURIComponent(trimmed)}&limit=10`);
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success && Array.isArray(data.data)) {
          // Double-protect against any inactive stations client-side
          const activeOnly = data.data.filter((s: TrainStation) => s.isActive !== false);
          setSuggestions(activeOnly);
          setHighlightedIndex(-1);
        } else {
          setSuggestions([]);
          if (res.status === 401) {
            setFetchError("Please sign in to search stations.");
          } else {
            setFetchError(data.message || "Failed to search stations.");
          }
        }
      } catch {
        setSuggestions([]);
        setFetchError("Network error searching stations.");
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (value) {
      onChange(null);
    }

    fetchStations(val);
  };

  const handleSelectStation = (station: TrainStation) => {
    onChange(station);
    setQuery(`${station.city ? `${station.city} - ` : ""}${station.name} (${station.code})`);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && query.trim().length >= 2) {
        setIsOpen(true);
        fetchStations(query);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectStation(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const listboxId = id ? `${id}-listbox` : "station-autocomplete-listbox";

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between"
      >
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {value && (
          <span className="text-[11px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
            {value.code}
          </span>
        )}
      </label>

      <div className="relative flex items-center">
        <span className="absolute left-3.5 material-symbols-outlined text-[18px] text-on-surface-variant pointer-events-none">
          train
        </span>

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
              fetchStations(query);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none bg-surface-container-lowest text-on-surface ${
            error || fetchError
              ? "border-rose-500 ring-1 ring-rose-500"
              : isOpen
              ? "border-primary ring-2 ring-primary/20 shadow-sm"
              : "border-surface-container-high hover:border-outline"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-surface-container" : ""}`}
        />

        {isLoading ? (
          <span className="absolute right-3.5 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            disabled={disabled}
            className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1 rounded-full transition-colors cursor-pointer"
            title="Clear station"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        ) : null}
      </div>

      {(error || fetchError) && (
        <p className="text-[11px] text-rose-600 font-medium">{error || fetchError}</p>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl z-50 py-1.5 flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {isLoading && suggestions.length === 0 ? (
            <div className="py-4 px-4 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
              <span>Searching railway stations...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((station, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = value?.code === station.code;

              return (
                <button
                  key={`${station.code}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectStation(station)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3.5 py-2.5 text-left flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isHighlighted
                      ? "bg-surface-container"
                      : isSelected
                      ? "bg-primary/10"
                      : "hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                        {station.name}
                      </span>
                      {(station.code === "NDLS" ||
                        station.code === "NZM" ||
                        station.code === "DLI" ||
                        station.code === "SC" ||
                        station.code === "HYB" ||
                        station.code === "KCG" ||
                        station.code === "CSMT" ||
                        station.code === "MMCT" ||
                        /\b(central|terminus)\b/i.test(station.name)) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Major Terminal
                        </span>
                      )}
                      {(station.code !== "NDLS" &&
                        station.code !== "NZM" &&
                        station.code !== "DLI" &&
                        station.code !== "SC" &&
                        station.code !== "HYB" &&
                        station.code !== "KCG" &&
                        !/\b(central|terminus)\b/i.test(station.name) &&
                        /\b(jn|junction)\b/i.test(station.name)) && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                          Junction
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-on-surface-variant truncate">
                      {[station.city, station.state].filter(Boolean).join(", ") || "Indian Railways Station"}
                    </span>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-md bg-surface-container-high text-on-surface font-mono text-xs font-bold">
                    {station.code}
                  </span>
                </button>
              );
            })
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="py-4 px-4 text-center text-xs text-on-surface-variant">
              No railway stations found matching &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="py-3 px-4 text-center text-xs text-on-surface-variant">
              Type at least 2 letters to search railway stations...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

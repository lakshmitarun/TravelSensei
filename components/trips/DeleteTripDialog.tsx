"use client";

import React, { useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";

interface DeleteTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  destinationName?: string;
  destinationLocation?: string | null;
  travelDate?: string;
  isDeleting: boolean;
  errorMessage?: string | null;
}

export default function DeleteTripDialog({
  isOpen,
  onClose,
  onConfirm,
  destinationName = "this trip",
  destinationLocation,
  travelDate,
  isDeleting,
  errorMessage,
}: DeleteTripDialogProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    },
    [isDeleting, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  let formattedDate: string | null = null;
  if (travelDate) {
    try {
      formattedDate = format(parseISO(travelDate), "dd MMM yyyy");
    } catch {
      formattedDate = travelDate;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-trip-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-surface-container-high/80 flex flex-col gap-5 relative animate-in zoom-in-95 duration-200">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[28px]">delete_forever</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3
              id="delete-trip-dialog-title"
              className="font-headline-sm text-xl font-extrabold text-on-surface"
            >
              Delete this trip?
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              This action cannot be undone. Your trip to{" "}
              <strong className="text-on-surface font-semibold">{destinationName}</strong>{" "}
              and its entire daily itinerary will be permanently removed.
            </p>
          </div>
        </div>

        {/* Trip Meta Summary Card */}
        {(destinationLocation || formattedDate) && (
          <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            {destinationLocation && (
              <span className="flex items-center gap-1 text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-primary text-[15px]">location_on</span>
                {destinationLocation}
              </span>
            )}
            {formattedDate && (
              <span className="flex items-center gap-1 text-on-surface font-semibold">
                <span className="material-symbols-outlined text-primary text-[15px]">calendar_month</span>
                {formattedDate}
              </span>
            )}
          </div>
        )}

        {/* Error Feedback if any */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-base">error</span>
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container hover:bg-surface-container-high text-on-surface text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>Delete Trip</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

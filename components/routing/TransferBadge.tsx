"use client";

import React from "react";
import { JourneyTransfer } from "@/lib/routing/types";
import { formatMinutesToDuration } from "@/lib/routing/validator";

interface TransferBadgeProps {
  transfer: JourneyTransfer;
  className?: string;
}

export default function TransferBadge({ transfer, className = "" }: TransferBadgeProps) {
  const waitFormatted = formatMinutesToDuration(transfer.waitingMinutes);

  return (
    <div
      className={`flex items-center gap-3 py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs ${className}`}
    >
      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[18px]">transfer_within_a_station</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-1.5 font-bold text-on-surface">
          <span>Change at</span>
          <span className="text-primary font-extrabold">{transfer.location.name}</span>
          <span className="font-mono text-[11px] text-primary px-1.5 py-0.2 rounded bg-primary/10">
            {transfer.location.code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
            ⏱ {waitFormatted} Layover
          </span>
        </div>
      </div>
    </div>
  );
}

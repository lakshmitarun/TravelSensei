"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-surface-container-lowest font-sans rounded-2xl w-fit", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        month_caption: "relative flex items-center justify-center pt-1 pb-2 font-bold text-on-surface min-h-[36px]",
        caption_label: "text-sm font-bold text-on-surface text-center",
        nav: "absolute top-1 left-0 right-0 flex items-center justify-between px-1 pointer-events-none",
        button_previous: cn(
          "h-7 w-7 bg-surface-container hover:bg-surface-container-high rounded-lg p-0 opacity-75 hover:opacity-100 transition-opacity flex items-center justify-center text-on-surface pointer-events-auto cursor-pointer"
        ),
        button_next: cn(
          "h-7 w-7 bg-surface-container hover:bg-surface-container-high rounded-lg p-0 opacity-75 hover:opacity-100 transition-opacity flex items-center justify-center text-on-surface pointer-events-auto cursor-pointer"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mb-1",
        weekday: "text-on-surface-variant rounded-md w-8 font-semibold text-[0.8rem] text-center flex items-center justify-center",
        week: "flex w-full mt-1 justify-between",
        day: cn(
          "h-8 w-8 p-0 font-medium rounded-lg text-on-surface flex items-center justify-center text-center"
        ),
        day_button: cn(
          "h-8 w-8 p-0 font-medium rounded-lg transition-colors hover:bg-surface-container-high text-on-surface flex items-center justify-center text-center cursor-pointer"
        ),
        selected:
          "[&_button]:bg-primary [&_button]:text-on-primary [&_button]:font-bold [&_button]:shadow-xs",
        today: "[&_button]:bg-surface-container [&_button]:text-primary [&_button]:font-bold [&_button]:border [&_button]:border-primary/40",
        outside:
          "text-on-surface-variant/40 opacity-40",
        disabled: "text-on-surface-variant/30 opacity-30 cursor-not-allowed hover:bg-transparent pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

import { JourneySegment, JourneyTransfer } from "./types";

export const MIN_TRANSFER_MINUTES = 60;   // 1 hour minimum safe transfer
export const MAX_TRANSFER_MINUTES = 720;  // 12 hours maximum reasonable layover

/**
 * Parses "HH:MM" 24-hour time string to minutes from midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(mins)) return 0;
  return hours * 60 + mins;
}

/**
 * Formats minute count into readable "Xh Ym" string.
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  waitingMinutes: number;
  departureDayOffset: number;
  reason?: string;
}

/**
 * Validates whether segment2 can be safely boarded after segment1 arrives at an interchange hub.
 * Handles same-day and next-day/overnight train departures.
 */
export function validateConnection(
  segment1: JourneySegment,
  segment2: JourneySegment,
  minBufferMinutes: number = MIN_TRANSFER_MINUTES,
  maxBufferMinutes: number = MAX_TRANSFER_MINUTES
): ConnectionValidationResult {
  const arrivalMinutesOfDay = parseTimeToMinutes(segment1.arrivalTime);
  const departureMinutesOfDay = parseTimeToMinutes(segment2.departureTime);

  // Case A: Same day departure
  if (departureMinutesOfDay >= arrivalMinutesOfDay) {
    const wait = departureMinutesOfDay - arrivalMinutesOfDay;
    if (wait < minBufferMinutes) {
      return {
        isValid: false,
        waitingMinutes: wait,
        departureDayOffset: 0,
        reason: `Insufficient transfer time (${wait}m < ${minBufferMinutes}m required buffer)`,
      };
    }
    if (wait > maxBufferMinutes) {
      return {
        isValid: false,
        waitingMinutes: wait,
        departureDayOffset: 0,
        reason: `Layover too long (${wait}m > ${maxBufferMinutes}m maximum)`,
      };
    }
    return {
      isValid: true,
      waitingMinutes: wait,
      departureDayOffset: 0,
    };
  }

  // Case B: Next day / overnight departure (e.g. arrives 22:30, leaves 04:00 next day)
  const overnightWait = 1440 - arrivalMinutesOfDay + departureMinutesOfDay;
  if (overnightWait < minBufferMinutes) {
    return {
      isValid: false,
      waitingMinutes: overnightWait,
      departureDayOffset: 1,
      reason: `Insufficient transfer time (${overnightWait}m < ${minBufferMinutes}m required buffer)`,
    };
  }
  if (overnightWait > maxBufferMinutes) {
    return {
      isValid: false,
      waitingMinutes: overnightWait,
      departureDayOffset: 1,
      reason: `Overnight layover too long (${overnightWait}m > ${maxBufferMinutes}m maximum)`,
    };
  }

  return {
    isValid: true,
    waitingMinutes: overnightWait,
    departureDayOffset: 1,
  };
}

/**
 * Creates a JourneyTransfer object between two validated segments.
 */
export function buildTransfer(
  segment1: JourneySegment,
  segment2: JourneySegment,
  waitingMinutes: number
): JourneyTransfer {
  const isSame =
    segment1.destination.code.toUpperCase() === segment2.origin.code.toUpperCase();

  return {
    location: segment1.destination,
    waitingMinutes,
    arrivingSegmentId: segment1.id,
    departingSegmentId: segment2.id,
    isSameStation: isSame,
    notes: isSame
      ? `Platform interchange at ${segment1.destination.name}`
      : `Station transfer between ${segment1.destination.code} and ${segment2.origin.code}`,
  };
}

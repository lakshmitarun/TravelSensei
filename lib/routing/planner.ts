import {
  JourneyRoute,
  JourneySegment,
  JourneyStationOrPort,
  RoutingSearchParams,
  RoutingSearchData,
} from "./types";
import { getCandidateTrainHubs, hubToStation } from "./hubs";
import {
  validateConnection,
  buildTransfer,
  parseTimeToMinutes,
} from "./validator";
import { searchTrains } from "@/lib/trains/railradar";
import { searchFlights } from "@/lib/flights/ignav";
import { TrainResult } from "@/lib/trains/types";
import { FlightItinerary, FlightSegment } from "@/lib/flights/types";

// In-memory query cache for segment queries (lasts for the lifetime of node server runtime)
const segmentCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const item = segmentCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    segmentCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache<T>(key: string, data: T): void {
  segmentCache.set(key, { data, timestamp: Date.now() });
}

function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 0;
  let total = 0;
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  const minsMatch = durationStr.match(/(\d+)\s*m/i);

  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) total += parseInt(minsMatch[1], 10);

  if (!hoursMatch && !minsMatch && durationStr.includes(":")) {
    const [h, m] = durationStr.split(":");
    total = parseInt(h, 10) * 60 + parseInt(m, 10);
  }

  return total;
}

export function trainToJourneySegment(train: TrainResult, legIndex: number): JourneySegment {
  return {
    id: `seg_train_${train.trainNumber}_${train.departure.stationCode}_${train.arrival.stationCode}_${legIndex}`,
    mode: "train",
    operator: "Indian Railways",
    identifier: train.trainNumber,
    title: train.trainName,
    type: train.trainType,
    origin: {
      code: train.departure.stationCode,
      name: train.departure.stationName,
    },
    destination: {
      code: train.arrival.stationCode,
      name: train.arrival.stationName,
    },
    departureTime: train.departure.time,
    arrivalTime: train.arrival.time,
    departureDay: train.departure.day,
    arrivalDay: train.arrival.day,
    durationMinutes: parseDurationToMinutes(train.duration),
    distanceKm: train.distanceKm,
    haltsCount: train.totalHaltsBetween,
    runDays: train.runDays,
    live: train.live,
  };
}

export function directTrainToRoute(train: TrainResult): JourneyRoute {
  const seg = trainToJourneySegment(train, 1);
  return {
    id: `route_direct_train_${train.trainNumber}_${seg.origin.code}_${seg.destination.code}`,
    isDirect: true,
    numberOfTransfers: 0,
    transportModes: ["train"],
    origin: seg.origin,
    destination: seg.destination,
    departureTime: seg.departureTime,
    arrivalTime: seg.arrivalTime,
    departureDay: seg.departureDay,
    arrivalDay: seg.arrivalDay,
    totalDurationMinutes: seg.durationMinutes,
    totalWaitingMinutes: 0,
    segments: [seg],
    transfers: [],
  };
}

export function flightItineraryToRoute(itinerary: FlightItinerary): JourneyRoute {
  const leg = itinerary.outbound;
  const segments: JourneySegment[] = (leg.segments || []).map((seg: FlightSegment, idx: number) => {
    return {
      id: `seg_flt_${seg.flightNumber || idx}_${seg.departureAirport}_${seg.arrivalAirport}_${idx + 1}`,
      mode: "flight",
      operator: seg.operatingCarrierName || seg.marketingCarrierCode || "Airline",
      identifier: `${seg.marketingCarrierCode || ""}${seg.flightNumber || ""}`.trim() || `FLT-${idx + 1}`,
      title: `${seg.operatingCarrierName || "Flight"} ${seg.flightNumber || ""}`.trim(),
      type: seg.aircraft || "Aircraft",
      origin: {
        code: seg.departureAirport,
        name: seg.departureAirport,
      },
      destination: {
        code: seg.arrivalAirport,
        name: seg.arrivalAirport,
      },
      departureTime: seg.departureTimeLocal || "",
      arrivalTime: seg.arrivalTimeLocal || "",
      departureDay: 1,
      arrivalDay: 1,
      durationMinutes: seg.durationMinutes || 0,
    };
  });

  const transfers = [];
  let totalWaiting = 0;

  for (let i = 0; i < segments.length - 1; i++) {
    const s1 = segments[i];
    const s2 = segments[i + 1];
    const t1 = parseTimeToMinutes(s1.arrivalTime);
    const t2 = parseTimeToMinutes(s2.departureTime);
    const wait = t2 >= t1 ? t2 - t1 : 1440 - t1 + t2;
    totalWaiting += wait;

    transfers.push(buildTransfer(s1, s2, wait));
  }

  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  return {
    id: `route_flt_${itinerary.id}`,
    isDirect: segments.length === 1,
    numberOfTransfers: transfers.length,
    transportModes: ["flight"],
    origin: firstSeg ? firstSeg.origin : { code: leg.origin, name: leg.origin },
    destination: lastSeg ? lastSeg.destination : { code: leg.destination, name: leg.destination },
    departureTime: firstSeg?.departureTime || leg.departureTime || "",
    arrivalTime: lastSeg?.arrivalTime || leg.arrivalTime || "",
    departureDay: 1,
    arrivalDay: 1,
    totalDurationMinutes: (leg.durationMinutes || 0) + totalWaiting,
    totalWaitingMinutes: totalWaiting,
    segments,
    transfers,
  };
}

/**
 * Searches and constructs connecting train journeys through strategic interchange junctions.
 */
export async function planConnectingTrainRoutes(
  originCode: string,
  destinationCode: string,
  date: string,
  byCity: boolean = false
): Promise<JourneyRoute[]> {
  const hubs = getCandidateTrainHubs(originCode, destinationCode, 2);
  const connectingRoutes: JourneyRoute[] = [];

  for (const hub of hubs) {
    try {
      // 1. Query Leg 1 (Origin -> Hub)
      const leg1CacheKey = `train_${originCode}_${hub.code}_${date}_${byCity}`;
      let leg1Trains = getCached<TrainResult[]>(leg1CacheKey);
      if (!leg1Trains) {
        const res = await searchTrains({ from: originCode, to: hub.code, date, byCity });
        leg1Trains = res.trains || [];
        setCache(leg1CacheKey, leg1Trains);
      }

      // 2. Query Leg 2 (Hub -> Destination)
      const leg2CacheKey = `train_${hub.code}_${destinationCode}_${date}_${byCity}`;
      let leg2Trains = getCached<TrainResult[]>(leg2CacheKey);
      if (!leg2Trains) {
        const res = await searchTrains({ from: hub.code, to: destinationCode, date, byCity });
        leg2Trains = res.trains || [];
        setCache(leg2CacheKey, leg2Trains);
      }

      // 3. Connect valid pairs
      for (const t1 of leg1Trains) {
        const s1 = trainToJourneySegment(t1, 1);

        for (const t2 of leg2Trains) {
          const s2 = trainToJourneySegment(t2, 2);

          const validation = validateConnection(s1, s2);
          if (validation.isValid) {
            const transfer = buildTransfer(s1, s2, validation.waitingMinutes);
            const totalDuration = s1.durationMinutes + validation.waitingMinutes + s2.durationMinutes;

            connectingRoutes.push({
              id: `route_conn_train_${t1.trainNumber}_${t2.trainNumber}_${hub.code}`,
              isDirect: false,
              numberOfTransfers: 1,
              transportModes: ["train"],
              origin: s1.origin,
              destination: s2.destination,
              departureTime: s1.departureTime,
              arrivalTime: s2.arrivalTime,
              departureDay: s1.departureDay,
              arrivalDay: s2.arrivalDay + validation.departureDayOffset,
              totalDurationMinutes: totalDuration,
              totalWaitingMinutes: validation.waitingMinutes,
              segments: [s1, s2],
              transfers: [transfer],
            });
          }
        }
      }
    } catch {
      // Graceful degradation if a single hub lookup encounters an issue
      continue;
    }
  }

  // Sort by shortest total duration and return top 5
  return connectingRoutes
    .sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)
    .slice(0, 5);
}

/**
 * Top-level smart routing orchestrator.
 */
export async function planJourneyRoutes(
  params: RoutingSearchParams
): Promise<RoutingSearchData> {
  const originCode = params.origin.toUpperCase().trim();
  const destCode = params.destination.toUpperCase().trim();
  const date = params.date.trim();
  const mode = params.mode || "trains";
  const byCity = params.byCity ?? false;

  const directRoutes: JourneyRoute[] = [];
  let connectingRoutes: JourneyRoute[] = [];

  let originStation: JourneyStationOrPort = { code: originCode, name: originCode };
  let destStation: JourneyStationOrPort = { code: destCode, name: destCode };

  // A. Train Search
  if (mode === "trains" || mode === "all") {
    try {
      const trainRes = await searchTrains({
        from: originCode,
        to: destCode,
        date,
        byCity,
      });

      if (trainRes.from) originStation = trainRes.from;
      if (trainRes.to) destStation = trainRes.to;

      if (trainRes.trains && trainRes.trains.length > 0) {
        for (const t of trainRes.trains) {
          directRoutes.push(directTrainToRoute(t));
        }
      }

      // If direct train routes are absent or few, find smart connections
      if (directRoutes.length === 0 || params.maxTransfers !== 0) {
        const connections = await planConnectingTrainRoutes(originCode, destCode, date, byCity);
        connectingRoutes.push(...connections);
      }
    } catch (err) {
      console.warn("Direct train query failed or not found:", err instanceof Error ? err.message : String(err));
    }
  }

  // B. Flight Search
  if (mode === "flights" || (mode === "all" && directRoutes.length === 0)) {
    try {
      const flightRes = await searchFlights({
        origin: originCode,
        destination: destCode,
        departure_date: date,
      });

      if (flightRes.itineraries && flightRes.itineraries.length > 0) {
        for (const it of flightRes.itineraries) {
          const r = flightItineraryToRoute(it);
          if (r.isDirect) {
            directRoutes.push(r);
          } else {
            connectingRoutes.push(r);
          }
        }
      }
    } catch {
      // Ignore flight search errors in multi-modal fallback
    }
  }

  return {
    origin: originStation,
    destination: destStation,
    date,
    directRoutes: directRoutes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes),
    connectingRoutes: connectingRoutes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes),
  };
}

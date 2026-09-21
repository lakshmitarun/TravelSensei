import { JourneyStationOrPort } from "./types";

export interface TransportHub {
  code: string;
  name: string;
  city: string;
  state: string;
  type: "train" | "flight" | "both";
  zone?: string; // e.g. "Central", "North", "South", "East", "West"
}

// Major, verified Indian Railway interchange junctions
export const MAJOR_TRAIN_HUBS: TransportHub[] = [
  { code: "NGP", name: "Nagpur Junction", city: "Nagpur", state: "Maharashtra", type: "train", zone: "Central" },
  { code: "ET", name: "Itarsi Junction", city: "Itarsi", state: "Madhya Pradesh", type: "train", zone: "Central" },
  { code: "BPL", name: "Bhopal Junction", city: "Bhopal", state: "Madhya Pradesh", type: "train", zone: "Central" },
  { code: "VGLJ", name: "V Lakshmibai Jhansi", city: "Jhansi", state: "Uttar Pradesh", type: "train", zone: "North-Central" },
  { code: "CNB", name: "Kanpur Central", city: "Kanpur", state: "Uttar Pradesh", type: "train", zone: "North-Central" },
  { code: "PRYJ", name: "Prayagraj Junction", city: "Prayagraj", state: "Uttar Pradesh", type: "train", zone: "North-Central" },
  { code: "DDU", name: "Pt Deen Dayal Upadhyaya", city: "Mughalsarai", state: "Uttar Pradesh", type: "train", zone: "East-Central" },
  { code: "BZA", name: "Vijayawada Junction", city: "Vijayawada", state: "Andhra Pradesh", type: "train", zone: "South-Central" },
  { code: "BRC", name: "Vadodara Junction", city: "Vadodara", state: "Gujarat", type: "train", zone: "Western" },
  { code: "RTM", name: "Ratlam Junction", city: "Ratlam", state: "Madhya Pradesh", type: "train", zone: "Western" },
  { code: "PUNE", name: "Pune Junction", city: "Pune", state: "Maharashtra", type: "train", zone: "Central" },
  { code: "GTL", name: "Guntakal Junction", city: "Guntakal", state: "Andhra Pradesh", type: "train", zone: "South-Central" },
  { code: "NDLS", name: "New Delhi", city: "Delhi", state: "Delhi", type: "train", zone: "Northern" },
  { code: "MMCT", name: "Mumbai Central", city: "Mumbai", state: "Maharashtra", type: "train", zone: "Western" },
];

// Major domestic flight transit hubs
export const MAJOR_FLIGHT_HUBS: TransportHub[] = [
  { code: "DEL", name: "Indira Gandhi International Airport", city: "Delhi", state: "Delhi", type: "flight", zone: "North" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", state: "Maharashtra", type: "flight", zone: "West" },
  { code: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", state: "Karnataka", type: "flight", zone: "South" },
  { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", state: "Telangana", type: "flight", zone: "South" },
  { code: "CCU", name: "Netaji Subhash Chandra Bose Airport", city: "Kolkata", state: "West Bengal", type: "flight", zone: "East" },
  { code: "MAA", name: "Chennai International Airport", city: "Chennai", state: "Tamil Nadu", type: "flight", zone: "South" },
];

/**
 * Returns candidate intermediate train interchange hubs between origin and destination.
 * Filters out origin and destination, and caps to the top most strategic hubs to respect API limits.
 */
export function getCandidateTrainHubs(
  originCode: string,
  destinationCode: string,
  maxHubs: number = 2
): TransportHub[] {
  const cleanOrigin = originCode.toUpperCase().trim();
  const cleanDest = destinationCode.toUpperCase().trim();

  // Filter out the stations themselves
  const eligible = MAJOR_TRAIN_HUBS.filter(
    (h) => h.code !== cleanOrigin && h.code !== cleanDest
  );

  // Strategic prioritization based on central crossroads
  // Nagpur (NGP), Itarsi (ET), Bhopal (BPL), and Kanpur (CNB) are premier national interchange points
  const priorityOrder = ["NGP", "BPL", "ET", "CNB", "VGLJ", "BZA", "PRYJ", "BRC"];

  const sorted = [...eligible].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.code);
    const bIndex = priorityOrder.indexOf(b.code);
    const aScore = aIndex === -1 ? 99 : aIndex;
    const bScore = bIndex === -1 ? 99 : bIndex;
    return aScore - bScore;
  });

  return sorted.slice(0, Math.max(1, maxHubs));
}

/**
 * Converts a TransportHub into a normalized JourneyStationOrPort
 */
export function hubToStation(hub: TransportHub): JourneyStationOrPort {
  return {
    code: hub.code,
    name: hub.name,
    city: hub.city,
    state: hub.state,
  };
}

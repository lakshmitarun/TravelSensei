import dynamic from "next/dynamic";

export { default as RouteMapContainer } from "./RouteMapContainer";
export { default as RouteSummary, formatDistance, formatDuration } from "./RouteSummary";
export { default as RouteSteps } from "./RouteSteps";
export const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });
export type { RouteMapProps } from "./RouteMap";
export type { RouteMapContainerProps } from "./RouteMapContainer";

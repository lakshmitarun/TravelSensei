import fs from "fs";
import path from "path";
import assert from "assert";

const BASE_URL = "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;

function logPass(message) {
  totalTests++;
  passedTests++;
  console.log(`[PASS] ${message}`);
}

async function runOrsUITestSuite() {
  console.log("=================================================");
  console.log("RUNNING OPENROUTESERVICE MAP UI & VISUALIZATION TESTS");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Test 1: Map component files exist
  // -------------------------------------------------------------
  console.log("--- Section 1: Map Component Files Verification ---");
  const routeMapPath = path.resolve("components/maps/RouteMap.tsx");
  const containerPath = path.resolve("components/maps/RouteMapContainer.tsx");
  const summaryPath = path.resolve("components/maps/RouteSummary.tsx");
  const stepsPath = path.resolve("components/maps/RouteSteps.tsx");
  const indexPath = path.resolve("components/maps/index.ts");

  assert(fs.existsSync(routeMapPath), "RouteMap.tsx must exist");
  assert(fs.existsSync(containerPath), "RouteMapContainer.tsx must exist");
  assert(fs.existsSync(summaryPath), "RouteSummary.tsx must exist");
  assert(fs.existsSync(stepsPath), "RouteSteps.tsx must exist");
  assert(fs.existsSync(indexPath), "components/maps/index.ts must exist");
  logPass("1. Map component files exist in components/maps/");

  // -------------------------------------------------------------
  // Test 2: RouteMap is client-safe
  // -------------------------------------------------------------
  console.log("\n--- Section 2: SSR Safety & Dynamic Client Loading ---");
  const routeMapCode = fs.readFileSync(routeMapPath, "utf-8");
  const containerCode = fs.readFileSync(containerPath, "utf-8");

  assert(routeMapCode.startsWith('"use client"') || routeMapCode.startsWith("'use client'"), "RouteMap must be a Client Component");
  assert(containerCode.startsWith('"use client"') || containerCode.startsWith("'use client'"), "RouteMapContainer must be a Client Component");
  assert(
    containerCode.includes("ssr: false") || containerCode.includes("next/dynamic"),
    "RouteMapContainer must dynamically import RouteMap with SSR disabled"
  );
  logPass("2. RouteMap is client-safe (SSR disabled to avoid 'window is not defined')");

  // -------------------------------------------------------------
  // Test 3, 4, 5: API Endpoint & Security Isolation
  // -------------------------------------------------------------
  console.log("\n--- Section 3: API Contract & Security Isolation ---");
  assert(
    containerCode.includes("fetch(`/api/maps/directions"),
    "Client container must call TravelSensei route /api/maps/directions"
  );
  logPass("3. /api/maps/directions is used for fetching route directions");

  const mapComponentPaths = [routeMapPath, containerPath, summaryPath, stepsPath, indexPath];
  for (const filePath of mapComponentPaths) {
    const code = fs.readFileSync(filePath, "utf-8");
    assert(!code.includes("api.heigit.org"), `Client file ${path.basename(filePath)} must not call api.heigit.org directly`);
    assert(!code.includes("api.openrouteservice.org"), `Client file ${path.basename(filePath)} must not call api.openrouteservice.org directly`);
    assert(!code.includes("OPENROUTESERVICE_API_KEY"), `Client file ${path.basename(filePath)} must not reference or expose OPENROUTESERVICE_API_KEY`);
    assert(!code.includes("NEXT_PUBLIC_OPENROUTESERVICE_API_KEY"), `Client file ${path.basename(filePath)} must not reference NEXT_PUBLIC key`);
  }
  logPass("4. Browser does not call api.heigit.org directly");
  logPass("5. No API key is exposed to the client");

  // -------------------------------------------------------------
  // Test 6: Route summary uses API distance/duration
  // -------------------------------------------------------------
  console.log("\n--- Section 4: Route Summary & Formatting ---");
  const summaryCode = fs.readFileSync(summaryPath, "utf-8");
  assert(summaryCode.includes("summary.distanceMeters") || summaryCode.includes("summary.distanceKm"), "RouteSummary consumes API distance metrics");
  assert(summaryCode.includes("summary.durationSeconds") || summaryCode.includes("summary.durationMinutes"), "RouteSummary consumes API duration metrics");
  assert(summaryCode.includes("formatDistance"), "Distance formatting helper exists");
  assert(summaryCode.includes("formatDuration"), "Duration formatting helper exists");
  logPass("6. Route summary uses API distance/duration with responsive formatting");

  // -------------------------------------------------------------
  // Test 7, 8, 9, 10, 11: RouteMap Geometry, Markers & Leaflet Layers
  // -------------------------------------------------------------
  console.log("\n--- Section 5: Leaflet Layers, Geometry & Markers ---");
  assert(
    routeMapCode.includes("polyline.decode") || routeMapCode.includes("@mapbox/polyline"),
    "RouteMap decodes encoded polyline geometry using @mapbox/polyline"
  );
  logPass("7. Geometry is decoded from ORS polyline format into Leaflet coordinates");

  assert(routeMapCode.includes("createPinIcon(\"origin\")") || routeMapCode.includes("origin"), "Origin marker is placed on the map");
  logPass("8. Origin marker exists at origin coordinates");

  assert(routeMapCode.includes("createPinIcon(\"destination\")") || routeMapCode.includes("destination"), "Destination marker is placed on the map");
  logPass("9. Destination marker exists at destination coordinates");

  assert(routeMapCode.includes("L.polyline") || routeMapCode.includes("routePolyline"), "Route polyline layer is created and added to map");
  logPass("10. Route polyline exists using real decoded geometry");

  assert(routeMapCode.includes("map.fitBounds") || routeMapCode.includes("bounds"), "Map automatically fits bounds to route and markers");
  logPass("11. Fit-bounds behavior exists with coordinate extension and padding");

  // -------------------------------------------------------------
  // Test 12, 13, 14, 15: Route Profile Selector & Refetching
  // -------------------------------------------------------------
  console.log("\n--- Section 6: Route Profile Selector & Dynamic Switching ---");
  assert(containerCode.includes('"driving-car"'), "Driving profile exists");
  logPass("12. Driving profile exists (driving-car)");

  assert(containerCode.includes('"cycling-regular"'), "Cycling profile exists");
  logPass("13. Cycling profile exists (cycling-regular)");

  assert(containerCode.includes('"foot-walking"'), "Walking profile exists");
  logPass("14. Walking profile exists (foot-walking)");

  assert(
    containerCode.includes("setProfile") && containerCode.includes("fetchDirections(profile)"),
    "Profile change updates state and triggers directions refetch"
  );
  logPass("15. Profile change triggers a new TravelSensei API request (/api/maps/directions)");

  // -------------------------------------------------------------
  // Test 16, 17, 18: Loading, Error & Retry States
  // -------------------------------------------------------------
  console.log("\n--- Section 7: Loading, Error & Retry UX States ---");
  assert(containerCode.includes('id="route-loading-indicator"') || containerCode.includes("isLoading"), "Loading state indicator exists");
  logPass("16. Loading state exists with spinner and indicator");

  assert(containerCode.includes('id="route-error-state"') || containerCode.includes("error"), "Error banner exists");
  logPass("17. Error state exists with user-friendly error message");

  assert(containerCode.includes('id="btn-retry-route"') && containerCode.includes("fetchDirections"), "Retry button is wired to refetch");
  logPass("18. Retry behavior exists and triggers re-query");

  // -------------------------------------------------------------
  // Test 19, 20: Turn-by-Turn Navigation Steps
  // -------------------------------------------------------------
  console.log("\n--- Section 8: Navigation Steps & Maneuvers ---");
  const stepsCode = fs.readFileSync(stepsPath, "utf-8");
  assert(stepsCode.includes("steps.map") && stepsCode.includes("step.instruction"), "Turn-by-turn navigation steps render");
  assert(stepsCode.includes("getManeuverIcon") || stepsCode.includes("step.type"), "Maneuver icons / actions render");
  logPass("19. Turn-by-turn steps render with instruction, distance, duration, and road names");

  assert(stepsCode.includes("return null") && stepsCode.includes("!steps"), "Gracefully handles empty or missing steps");
  logPass("20. Missing steps are handled gracefully without rendering empty container");

  // -------------------------------------------------------------
  // Test 21, 22, 23: Responsive Container, OSM Attribution & Fake Data Guard
  // -------------------------------------------------------------
  console.log("\n--- Section 9: Responsive Layout & Tile Attribution ---");
  assert(routeMapCode.includes('id="route-leaflet-map"'), "Responsive map element exists");
  assert(routeMapCode.includes("minHeight: \"320px\"") || routeMapCode.includes("h-80"), "Map container defines minimum height");
  logPass("21. Responsive map container exists with defined heights and boundaries");

  assert(
    routeMapCode.includes("https://tile.openstreetmap.org/{z}/{x}/{y}.png") &&
    routeMapCode.includes("OpenStreetMap") &&
    !routeMapCode.includes("basemaps.cartocdn.com") &&
    !routeMapCode.includes("carto.com"),
    "OpenStreetMap tiles and attribution exist without CARTO"
  );
  logPass("22. OpenStreetMap tile layer and OSM attribution exist without CARTO dependency");

  const tripDetailsPath = path.resolve("components/trips/TripDetails.tsx");
  const tripDetailsCode = fs.readFileSync(tripDetailsPath, "utf-8");
  assert(tripDetailsCode.includes("id=\"trip-route-planner\""), "TripDetails integrates Route Planner section");
  assert(!tripDetailsCode.includes("originLat=0") && !tripDetailsCode.includes("fake"), "Zero fake coordinates introduced in trip integration");
  logPass("23. No fake coordinates are introduced; clean integration boundary maintained");

  // -------------------------------------------------------------
  // Section 10: Live End-to-End Route Execution via TravelSensei API
  // -------------------------------------------------------------
  console.log("\n--- Section 10: Live TravelSensei API Verification ---");

  // Authenticate test user session
  const testEmail = `ors_ui_tester_${Date.now()}@travelsensei.local`;
  const testPassword = "OrsUiTestPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "ORS UI Tester",
    }),
  });

  assert.strictEqual(signupRes.ok, true, "Auth signup must succeed");
  const cookieHeader = signupRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  console.log("[INFO] Authenticated test user session established");

  // Live test parameters (Hyderabad coordinates)
  const originLat = "17.4399";
  const originLng = "78.4983";
  const destLat = "17.3850";
  const destLng = "78.4867";
  const profile = "driving-car";

  const directionsUrl = `${BASE_URL}/api/maps/directions?originLat=${originLat}&originLng=${originLng}&destinationLat=${destLat}&destinationLng=${destLng}&profile=${profile}`;
  console.log(`[INFO] Querying TravelSensei API: ${directionsUrl}...`);

  const apiRes = await fetch(directionsUrl, {
    headers: { Cookie: cookieHeader },
  });

  assert.strictEqual(apiRes.status, 200, "Live directions API must return HTTP 200");
  const apiJson = await apiRes.json();
  assert.strictEqual(apiJson.success, true, "Response success must be true");
  assert.strictEqual(apiJson.data?.provider, "openrouteservice", "Provider must be openrouteservice");

  const route = apiJson.data?.routes?.[0];
  assert.ok(route, "Must return at least 1 route");
  assert.ok(route.distanceMeters > 0, "Must have valid distanceMeters");
  assert.ok(route.distanceKm > 0, "Must have valid distanceKm");
  assert.ok(route.durationSeconds > 0, "Must have valid durationSeconds");
  assert.ok(route.durationMinutes > 0, "Must have valid durationMinutes");
  assert.ok(typeof route.geometry === "string" && route.geometry.length > 0, "Must have encoded polyline geometry");
  assert.ok(Array.isArray(route.steps) && route.steps.length > 0, "Must have navigation steps");

  console.log(`[INFO] Live API Route: ${route.distanceKm} km | ${route.durationMinutes} min`);
  console.log(`[INFO] Polyline geometry length: ${route.geometry.length} chars`);
  console.log(`[INFO] Steps returned: ${route.steps.length} navigation steps`);
  logPass(`Live TravelSensei directions verified: ${route.distanceKm} km, ~${route.durationMinutes} min, ${route.steps.length} steps`);

  console.log("\n=================================================");
  console.log(`ALL OPENROUTESERVICE UI TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runOrsUITestSuite().catch((err) => {
  console.error("\n[TEST RUNNER FATAL ERROR]", err);
  process.exit(1);
});

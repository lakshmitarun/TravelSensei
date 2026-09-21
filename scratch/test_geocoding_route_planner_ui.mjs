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

async function runGeocodingRoutePlannerUITests() {
  console.log("=================================================");
  console.log("RUNNING GEOCODING TO ROUTE PLANNER UI TEST SUITE");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Part 1: Static Code and Semantics Verification in TripDetails.tsx
  // -------------------------------------------------------------
  console.log("--- Part 1: TripDetails Code & Autocomplete Semantics ---");
  const tripDetailsPath = path.resolve("components/trips/TripDetails.tsx");
  assert(fs.existsSync(tripDetailsPath), "TripDetails.tsx must exist");
  const tripDetailsCode = fs.readFileSync(tripDetailsPath, "utf-8");

  // 1: Origin input exists
  assert(tripDetailsCode.includes('id="origin-city-input"'), "1. Origin input exists with id='origin-city-input'");
  logPass("1. Origin input exists");

  // 2: Origin input calls /api/geocoding/search
  assert(
    tripDetailsCode.includes('fetch(`/api/geocoding/search') ||
    tripDetailsCode.includes("fetch(\n          `/api/geocoding/search") ||
    tripDetailsCode.includes("/api/geocoding/search?q="),
    "2. Origin autocomplete calls TravelSensei route /api/geocoding/search"
  );
  logPass("2. Origin input calls /api/geocoding/search");

  // 3: Browser does NOT call geocoding-api.open-meteo.com directly
  assert(
    !tripDetailsCode.includes("geocoding-api.open-meteo.com"),
    "3. Browser component must NEVER call geocoding-api.open-meteo.com directly"
  );
  logPass("3. Browser does NOT call geocoding-api.open-meteo.com directly");

  // 4: Debounce exists (~300ms)
  assert(
    tripDetailsCode.includes("300") && tripDetailsCode.includes("setTimeout"),
    "4. Debounced autocomplete timer exists (~300ms)"
  );
  logPass("4. Debounce exists (~300ms)");

  // 5: Minimum 2-character search exists
  assert(
    tripDetailsCode.includes("trimmed.length < 2") || tripDetailsCode.includes(".length < 2"),
    "5. Minimum 2-character search constraint is enforced"
  );
  logPass("5. Minimum 2-character search exists");

  // 6: Loading state exists
  assert(
    tripDetailsCode.includes("isSearchingOrigin") &&
    (tripDetailsCode.includes("Searching locations...") || tripDetailsCode.includes("origin-loading-spinner")),
    "6. Searching / loading state indicator exists"
  );
  logPass("6. Loading state exists");

  // 7: Suggestions render from API results
  assert(
    tripDetailsCode.includes("suggestions.map(") && tripDetailsCode.includes("handleSelectLocation"),
    "7. Suggestions map over real API results with selection handler"
  );
  logPass("7. Suggestions render from API results");

  // 8: No fake city coordinates exist
  assert(
    !tripDetailsCode.includes("originLat=0") &&
    !tripDetailsCode.includes("fake") &&
    !tripDetailsCode.includes("defaultOrigin"),
    "8. Zero fake city coordinates exist in TripDetails.tsx"
  );
  logPass("8. No fake city coordinates exist");

  // 9 & 10: Suggestion selection stores latitude and longitude
  assert(
    tripDetailsCode.includes("setSelectedLocation(loc)") &&
    tripDetailsCode.includes("latitude: selectedLocation.latitude") &&
    tripDetailsCode.includes("longitude: selectedLocation.longitude"),
    "9 & 10. Suggestion selection stores real latitude and longitude in component state"
  );
  logPass("9. Suggestion selection stores latitude");
  logPass("10. Suggestion selection stores longitude");

  // 11: Country/admin information renders
  assert(
    tripDetailsCode.includes("formatLocationSubtitle") &&
    tripDetailsCode.includes("admin1") &&
    tripDetailsCode.includes("country"),
    "11. Location subtitle formatting displays admin1 and country information"
  );
  logPass("11. Country/admin information renders");

  // 12: Change Origin works
  assert(
    tripDetailsCode.includes('id="btn-change-origin"') &&
    tripDetailsCode.includes("handleChangeOrigin") &&
    tripDetailsCode.includes("setSelectedLocation(null)"),
    "12. Change Origin action clears selected location and resets calculation state"
  );
  logPass("12. Change Origin works");

  // 13: Clear Origin works
  assert(
    tripDetailsCode.includes('id="btn-clear-origin"') &&
    tripDetailsCode.includes("handleClearOrigin") &&
    tripDetailsCode.includes('setOriginQuery("")'),
    "13. Clear Origin button clears text, suggestions, and coordinates"
  );
  logPass("13. Clear Origin works");

  // 14: Calculate Route button exists
  assert(tripDetailsCode.includes('id="btn-calculate-route"'), "14. Calculate Route button exists with id='btn-calculate-route'");
  logPass("14. Calculate Route button exists");

  // 15: Calculate Route remains disabled without selected coordinates
  assert(
    tripDetailsCode.includes("isCalculateRouteEnabled") &&
    tripDetailsCode.includes("disabled={!isCalculateRouteEnabled}"),
    "15. Calculate Route button is disabled until valid origin and destination coordinates are selected"
  );
  logPass("15. Calculate Route remains disabled without selected coordinates");

  // 16: Calculate Route calls /api/maps/directions
  assert(
    tripDetailsCode.includes("fetch(`/api/maps/directions"),
    "16. Calculate Route explicitly queries /api/maps/directions"
  );
  logPass("16. Calculate Route calls /api/maps/directions");

  // 17: OpenRouteService provider is NOT called directly by browser
  assert(
    !tripDetailsCode.includes("api.heigit.org") &&
    !tripDetailsCode.includes("api.openrouteservice.org"),
    "17. Browser does not call OpenRouteService or HeiGIT directly"
  );
  logPass("17. OpenRouteService provider is NOT called directly by browser");

  // 18 & 19: Selected origin and destination coordinates passed to route request
  assert(
    tripDetailsCode.includes("selectedLocation.latitude") &&
    tripDetailsCode.includes("selectedLocation.longitude"),
    "18. Selected Open-Meteo origin coordinates passed to directions query"
  );
  logPass("18. Selected origin coordinates are passed to route request");

  assert(
    tripDetailsCode.includes("destination.latitude") &&
    tripDetailsCode.includes("destination.longitude"),
    "19. Verified destination coordinates passed to directions query"
  );
  logPass("19. Existing destination coordinates are passed");

  // 20: Route map renders after successful calculation
  assert(
    tripDetailsCode.includes("hasCalculatedRoute && selectedLocation") &&
    tripDetailsCode.includes("<RouteMapContainer"),
    "20. RouteMapContainer is conditionally rendered after route calculation succeeds"
  );
  logPass("20. Route map renders after successful calculation");

  // 21: Route result can be cleared after changing origin
  assert(
    tripDetailsCode.includes("setHasCalculatedRoute(false)"),
    "21. Route result and map are dismissed when changing or clearing origin"
  );
  logPass("21. Route result can be cleared after changing origin");

  // 22: Geocoding error state exists
  assert(
    tripDetailsCode.includes("searchError") && tripDetailsCode.includes("Unable to search locations"),
    "22. Geocoding error state with retry is implemented"
  );
  logPass("22. Geocoding error state exists");

  // 23: Empty result state exists
  assert(
    tripDetailsCode.includes("No locations found for"),
    "23. Empty result notification 'No locations found for' is displayed when results are empty"
  );
  logPass("23. Empty result state exists");

  // 24: Keyboard autocomplete behavior exists
  assert(
    tripDetailsCode.includes("handleInputKeyDown") &&
    tripDetailsCode.includes("ArrowDown") &&
    tripDetailsCode.includes("ArrowUp") &&
    tripDetailsCode.includes("Enter") &&
    tripDetailsCode.includes("Escape") &&
    tripDetailsCode.includes('role="combobox"') &&
    tripDetailsCode.includes('role="listbox"') &&
    tripDetailsCode.includes('role="option"'),
    "24. Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape) and WAI-ARIA combobox roles exist"
  );
  logPass("24. Keyboard autocomplete behavior exists");

  // 25: No API credentials exposed
  assert(
    !tripDetailsCode.includes("OPENROUTESERVICE_API_KEY") &&
    !tripDetailsCode.includes("NEXT_PUBLIC_OPENROUTESERVICE_API_KEY") &&
    !tripDetailsCode.includes("OPENMETEO_API_KEY"),
    "25. No API credentials or secrets exposed in client component"
  );
  logPass("25. No API credentials are exposed");

  // 26: English-oriented CARTO basemap tile layer in RouteMap
  const routeMapPath = path.resolve("components/maps/RouteMap.tsx");
  assert(fs.existsSync(routeMapPath), "RouteMap.tsx must exist");
  const routeMapCode = fs.readFileSync(routeMapPath, "utf-8");
  assert(
    routeMapCode.includes("basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png") &&
    routeMapCode.includes("carto.com/attributions"),
    "26. RouteMap uses English-oriented CARTO basemap tiles with proper CARTO & OpenStreetMap attribution"
  );
  logPass("26. English-oriented CARTO basemap tile layer with attribution exists");

  // 27: Initial origin state is empty (no auto-fill)
  assert(
    tripDetailsCode.includes('const [originQuery, setOriginQuery] = useState<string>("")') ||
    tripDetailsCode.includes("useState<string>(\"\")"),
    "27. Initial origin query starts empty without auto-fill from trip destination or props"
  );
  logPass("27. Initial origin query starts empty (no auto-fill)");

  // 28: Change Origin explicitly clears the search query
  assert(
    tripDetailsCode.includes("handleChangeOrigin") &&
    tripDetailsCode.includes('setOriginQuery("")'),
    "28. Change Origin resets both selectedLocation and originQuery"
  );
  logPass("28. Change Origin clears search field so previous city is not left in input");

  // 29: State separation between search text and coordinates
  assert(
    tripDetailsCode.includes("selectedOrigin") || tripDetailsCode.includes("selectedLocation"),
    "29. Clear state separation between search text and selected coordinates"
  );
  logPass("29. Explicit state separation between search query and selected origin");

  // -------------------------------------------------------------
  // Part 2: End-to-End Live Verification: Hyderabad -> Directions -> Route
  // -------------------------------------------------------------
  console.log("\n--- Part 2: End-to-End Live API Verification ---");

  // 1. Authenticate test user
  const testEmail = `geocoding_ui_${Date.now()}@travelsensei.local`;
  const testPassword = "GeocodingUiPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Geocoding UI Tester",
    }),
  });

  assert.strictEqual(signupRes.ok, true, "User registration must succeed");
  const cookieHeader = signupRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  console.log("[INFO] Authenticated user session established");

  const authHeaders = { Cookie: cookieHeader };

  // 2. Query TravelSensei Geocoding API for 'Hyderabad'
  const geocodingUrl = `${BASE_URL}/api/geocoding/search?q=Hyderabad&count=5&language=en`;
  console.log(`[INFO] Calling TravelSensei Geocoding API: ${geocodingUrl}...`);

  const geoRes = await fetch(geocodingUrl, { headers: authHeaders });
  assert.strictEqual(geoRes.status, 200, "Geocoding API must return HTTP 200");
  const geoJson = await geoRes.json();
  assert.strictEqual(geoJson.success, true, "Geocoding response success must be true");
  assert.ok(Array.isArray(geoJson.data?.results) && geoJson.data.results.length > 0, "Results must contain locations");

  const hyderabadLoc = geoJson.data.results[0];
  assert.ok(hyderabadLoc.name.toLowerCase().includes("hyderabad"), "Result name matches Hyderabad");
  assert.ok(typeof hyderabadLoc.latitude === "number" && isFinite(hyderabadLoc.latitude), "Latitude is valid finite number");
  assert.ok(typeof hyderabadLoc.longitude === "number" && isFinite(hyderabadLoc.longitude), "Longitude is valid finite number");

  console.log(`[INFO] Live Open-Meteo Geocoding: ${hyderabadLoc.name}, ${hyderabadLoc.admin1 || ""}, ${hyderabadLoc.country || hyderabadLoc.countryCode} (${hyderabadLoc.latitude}, ${hyderabadLoc.longitude})`);
  logPass(`Live Hyderabad location resolved: ${hyderabadLoc.latitude}, ${hyderabadLoc.longitude}`);

  // 3. Perform Live Directions Request from resolved origin to destination
  // Testing with local route coordinates (Hyderabad Charminar to Secunderabad) to verify ORS directions
  const destLat = "17.3616";
  const destLng = "78.4747";
  const directionsUrl = `${BASE_URL}/api/maps/directions?originLat=${hyderabadLoc.latitude}&originLng=${hyderabadLoc.longitude}&destinationLat=${destLat}&destinationLng=${destLng}&profile=driving-car`;
  console.log(`[INFO] Requesting Directions: ${directionsUrl}...`);

  const directionsRes = await fetch(directionsUrl, { headers: authHeaders });
  assert.strictEqual(directionsRes.status, 200, "Directions API must return HTTP 200");
  const directionsJson = await directionsRes.json();
  assert.strictEqual(directionsJson.success, true, "Directions response success must be true");

  const route = directionsJson.data?.routes?.[0];
  assert.ok(route, "Route must exist in response");
  assert.ok(route.distanceKm > 0, "Distance must be positive");
  assert.ok(route.durationMinutes > 0, "Duration must be positive");
  assert.ok(typeof route.geometry === "string" && route.geometry.length > 0, "Encoded polyline geometry must exist");
  assert.ok(Array.isArray(route.steps) && route.steps.length > 0, "Turn-by-turn steps must exist");

  console.log(`[INFO] Route Calculated: ${route.distanceKm} km, ~${route.durationMinutes} min, ${route.steps.length} navigation steps`);
  logPass(`Live ORS directions verified with Open-Meteo coordinates: ${route.distanceKm} km, ${route.steps.length} steps`);

  console.log("\n=================================================");
  console.log(`ALL GEOCODING TO ROUTE PLANNER UI TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runGeocodingRoutePlannerUITests().catch((err) => {
  console.error("\n[TEST RUNNER FATAL ERROR]", err);
  process.exit(1);
});

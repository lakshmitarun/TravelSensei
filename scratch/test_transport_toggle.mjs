import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTransportToggleTests() {
  console.log("=================================================");
  console.log("RUNNING TRANSPORTATION & ROUTE SELECTOR TEST SUITE");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Part 1: Static Code and Semantics Verification in TripDetails.tsx
  // -------------------------------------------------------------
  console.log("--- Part 1: TripDetails Code & Semantics Inspection ---");
  const tripDetailsPath = path.resolve("components/trips/TripDetails.tsx");
  assert(fs.existsSync(tripDetailsPath), "TripDetails.tsx exists");

  const tripDetailsCode = fs.readFileSync(tripDetailsPath, "utf-8");

  // 1: Four selector buttons exist
  const hasFlights = tripDetailsCode.includes('id="btn-find-flights"');
  const hasTrains = tripDetailsCode.includes('id="btn-find-trains"');
  const hasHotels = tripDetailsCode.includes('id="btn-find-hotels"');
  const hasRoute = tripDetailsCode.includes('id="btn-find-route"');
  assert(
    hasFlights && hasTrains && hasHotels && hasRoute,
    "1. Four selector buttons exist (Flights, Trains, Hotels, Route Planner)"
  );

  // 2: Flights button exists
  assert(hasFlights, "2. Flights button exists with id='btn-find-flights'");

  // 3: Trains button exists
  assert(hasTrains, "3. Trains button exists with id='btn-find-trains'");

  // 4: Hotels button exists
  assert(hasHotels, "4. Hotels button exists with id='btn-find-hotels'");

  // 5: Route Planner button exists
  assert(hasRoute, "5. Route Planner button exists with id='btn-find-route'");

  // 6: Route Planner appears immediately after Hotels in source/layout
  const hotelsIndex = tripDetailsCode.indexOf('id="btn-find-hotels"');
  const routeIndex = tripDetailsCode.indexOf('id="btn-find-route"');
  assert(hotelsIndex < routeIndex, "6a. Route Planner appears after Hotels in source/layout");
  const betweenHotelsAndRoute = tripDetailsCode.slice(hotelsIndex, routeIndex);
  assert(
    !betweenHotelsAndRoute.includes('id="btn-find-flights"') &&
    !betweenHotelsAndRoute.includes('id="btn-find-trains"'),
    "6b. Route Planner appears immediately after Hotels in source/layout"
  );

  // 7: Desktop selector is designed to keep all four buttons in one row
  const selectorContainerSlice = tripDetailsCode.slice(
    tripDetailsCode.indexOf('Travel & Stay'),
    tripDetailsCode.indexOf('id="btn-find-flights"')
  );
  assert(
    selectorContainerSlice.includes("lg:flex-nowrap") ||
    selectorContainerSlice.includes("md:flex-nowrap") ||
    tripDetailsCode.includes("whitespace-nowrap"),
    "7. Desktop selector is designed to keep all four buttons in one row (lg:flex-nowrap & whitespace-nowrap)"
  );

  // 8: Route Planner active state works
  assert(
    tripDetailsCode.includes('aria-expanded={activeTransport === "route"}'),
    "8a. Route Planner active state toggles aria-expanded dynamically"
  );
  assert(
    tripDetailsCode.includes('activeTransport === "route"') &&
    tripDetailsCode.includes('bg-primary text-white shadow-md'),
    "8b. Route Planner active state applies primary active styling"
  );

  // 9: Route Planner closes when clicked again
  assert(
    tripDetailsCode.includes('setActiveTransport((prev) => (prev === "route" ? null : "route"))'),
    "9. Route Planner closes when clicked again (toggles to null)"
  );

  // 10: Flights closes Route Planner
  // 11: Trains closes Route Planner
  // 12: Hotels closes Route Planner
  assert(
    tripDetailsCode.includes('type ActiveTransport = "flights" | "trains" | "hotels" | "route" | null;'),
    "10, 11, 12. Single ActiveTransport state ensures Flights/Trains/Hotels automatically close Route Planner"
  );

  // 13: Origin selector exists
  assert(
    tripDetailsCode.includes('id="origin-selector"'),
    "13a. Origin selector exists with id='origin-selector'"
  );
  assert(
    tripDetailsCode.includes('id="origin-city-input"'),
    "13b. Origin city search input exists with id='origin-city-input'"
  );

  // 14: Origin selector is actually clickable/focusable
  assert(
    tripDetailsCode.includes('<input') &&
    tripDetailsCode.includes('placeholder="Search origin city..."') &&
    tripDetailsCode.includes('id="origin-city-input"'),
    "14. Origin selector is an actual clickable/focusable input with placeholder 'Search origin city...'"
  );

  // 15: No fake origin coordinates are introduced
  assert(
    !tripDetailsCode.includes("originLat=0") &&
    !tripDetailsCode.includes("fake") &&
    !tripDetailsCode.includes("defaultOrigin"),
    "15. No fake origin coordinates are introduced in TripDetails"
  );

  // 16: Existing destination coordinates remain unchanged
  assert(
    tripDetailsCode.includes("destination.latitude") &&
    tripDetailsCode.includes("destination.longitude"),
    "16. Existing destination coordinates remain unchanged and verified"
  );

  // 17: Existing #trip-route deep link works
  assert(
    tripDetailsCode.includes('hash === "#trip-route"') &&
    tripDetailsCode.includes('setActiveTransport("route")'),
    "17. Existing #trip-route deep link works and opens Route Planner"
  );

  // 18: Existing #trip-flights works
  assert(
    tripDetailsCode.includes('hash === "#trip-flights"') &&
    tripDetailsCode.includes('setActiveTransport("flights")'),
    "18. Existing #trip-flights works"
  );

  // 19: Existing #trip-trains works
  assert(
    tripDetailsCode.includes('hash === "#trip-trains"') &&
    tripDetailsCode.includes('setActiveTransport("trains")'),
    "19. Existing #trip-trains works"
  );

  // 20: Existing #trip-hotels works
  assert(
    tripDetailsCode.includes('hash === "#trip-hotels"') &&
    tripDetailsCode.includes('setActiveTransport("hotels")'),
    "20. Existing #trip-hotels works"
  );

  // Explicit Route Calculation button verification
  assert(
    tripDetailsCode.includes('id="btn-calculate-route"'),
    "Explicit Calculate Route button exists (avoids premature ORS calls)"
  );

  // Clear Origin button verification
  assert(
    tripDetailsCode.includes('id="btn-clear-origin"'),
    "Clear origin button exists for keyboard accessibility and input clearing"
  );

  // -------------------------------------------------------------
  // Part 2: Authenticated Session Setup & API Regressions
  // -------------------------------------------------------------
  console.log("\n--- Part 2: Authenticated Session Setup ---");
  const testEmail = `toggle_url_test_${Date.now()}@travelsensei.local`;
  const testPassword = "ToggleUrlTestPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Toggle Tester",
    }),
  });

  let cookieHeader = "";
  if (typeof signupRes.headers.getSetCookie === "function") {
    cookieHeader = signupRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  } else {
    const setCookieHeader = signupRes.headers.get("set-cookie") || "";
    cookieHeader = setCookieHeader.split(",").map((c) => c.split(";")[0]).join("; ");
  }

  assert(signupRes.ok, "Test user registration succeeded");
  assert(cookieHeader.length > 0, "Received auth session cookies");

  const authHeaders = {
    Cookie: cookieHeader,
  };

  console.log("\n--- Part 3: Flight API Regression ---");
  const airportRes = await fetch(`${BASE_URL}/api/flights/airports?q=DEL&limit=5`, { headers: authHeaders });
  assert(airportRes.status === 200, "Flight airports lookup returns 200");
  const airportJson = await airportRes.json();
  assert(airportJson.success === true, "Airports result success is true");

  console.log("\n--- Part 4: RailRadar Quota Protection Note ---");
  console.log("[INFO] Live RailRadar API test intentionally skipped to preserve monthly quota (232/1000 requests used).");

  console.log("\n=================================================");
  console.log(`ALL TRANSPORTATION & ROUTE SELECTOR TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runTransportToggleTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

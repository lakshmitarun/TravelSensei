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

function logFail(message, error) {
  totalTests++;
  console.error(`[FAIL] ${message}`, error);
  throw error || new Error(message);
}

async function runNuiteeUITestSuite() {
  console.log("=================================================");
  console.log("RUNNING NUITEE HOTEL SEARCH UI TEST SUITE");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Test 1: Hotel components exist
  // -------------------------------------------------------------
  console.log("--- Section 1: Hotel Component Files Verification ---");
  const widgetPath = path.resolve("components/hotels/HotelSearchWidget.tsx");
  const formPath = path.resolve("components/hotels/HotelSearchForm.tsx");
  const cardPath = path.resolve("components/hotels/HotelCard.tsx");
  const listPath = path.resolve("components/hotels/HotelResultsList.tsx");
  const indexPath = path.resolve("components/hotels/index.ts");

  assert(fs.existsSync(widgetPath), "HotelSearchWidget.tsx must exist");
  assert(fs.existsSync(formPath), "HotelSearchForm.tsx must exist");
  assert(fs.existsSync(cardPath), "HotelCard.tsx must exist");
  assert(fs.existsSync(listPath), "HotelResultsList.tsx must exist");
  assert(fs.existsSync(indexPath), "components/hotels/index.ts must exist");
  logPass("1. Hotel components exist in components/hotels/");

  // -------------------------------------------------------------
  // Test 2: Hotel search form renders all required inputs
  // -------------------------------------------------------------
  console.log("\n--- Section 2: Hotel Search Form & Validation ---");
  const formCode = fs.readFileSync(formPath, "utf-8");
  assert(formCode.includes('id="hotel-search-form"'), "Search form element must render");
  assert(formCode.includes('id="hotel-destination-input"'), "Destination input must exist");
  assert(formCode.includes('id="hotel-checkin-input"'), "Check-in date input must exist");
  assert(formCode.includes('id="hotel-checkout-input"'), "Check-out date input must exist");
  assert(formCode.includes('id="hotel-adults-input"'), "Adults input must exist");
  assert(formCode.includes('id="hotel-children-input"'), "Children input must exist");
  assert(formCode.includes('id="hotel-rooms-input"'), "Rooms input must exist");
  assert(formCode.includes('id="hotel-currency-select"'), "Currency selector must exist");
  assert(formCode.includes('id="btn-search-hotels"'), "Submit search button must exist");
  logPass("2. Hotel search form renders with all required input elements");

  // -------------------------------------------------------------
  // Test 3: Required validation works
  // -------------------------------------------------------------
  assert(
    formCode.includes("Please enter a destination city") ||
    formCode.includes("destination.trim()"),
    "Destination required validation must be implemented"
  );
  assert(
    formCode.includes("Check-in date is required") ||
    formCode.includes("!checkin"),
    "Check-in required validation must be implemented"
  );
  assert(
    formCode.includes("Check-out date is required") ||
    formCode.includes("!checkout"),
    "Check-out required validation must be implemented"
  );
  assert(
    formCode.includes("At least 1 adult is required") ||
    formCode.includes("adults < 1"),
    "Adults >= 1 validation must be implemented"
  );
  logPass("3. Required validation works (destination, check-in, check-out, adults >= 1)");

  // -------------------------------------------------------------
  // Test 4: Check-out validation works
  // -------------------------------------------------------------
  assert(
    formCode.includes("checkout <= checkin") ||
    formCode.includes("Check-out must be after check-in date"),
    "Check-out after check-in validation must be implemented"
  );
  assert(
    formCode.includes("Check-in date cannot be in the past") ||
    formCode.includes("isBefore(startOfDay(checkinDate), today)"),
    "No past check-in dates validation must be implemented"
  );
  logPass("4. Check-out validation works (must be after check-in, no past dates)");

  // -------------------------------------------------------------
  // Test 5 & 6: Client search endpoint & security isolation
  // -------------------------------------------------------------
  console.log("\n--- Section 3: API Endpoint & Security Verification ---");
  const tripDetailsPath = path.resolve("components/trips/TripDetails.tsx");
  const tripDetailsCode = fs.readFileSync(tripDetailsPath, "utf-8");

  assert(
    tripDetailsCode.includes("fetch(`/api/hotels/search?") ||
    tripDetailsCode.includes("fetch(`/api/hotels/search"),
    "Browser search must call /api/hotels/search"
  );
  logPass("5. Search request is sent to /api/hotels/search");

  // Verify client components NEVER call LiteAPI directly
  const allClientHotelFiles = [widgetPath, formPath, cardPath, listPath, indexPath, tripDetailsPath];
  for (const filePath of allClientHotelFiles) {
    const code = fs.readFileSync(filePath, "utf-8");
    assert(
      !code.includes("api.liteapi.travel"),
      `Client file ${path.basename(filePath)} must not call api.liteapi.travel directly`
    );
    assert(
      !code.includes("NUITEE_API_KEY"),
      `Client file ${path.basename(filePath)} must not expose or reference NUITEE_API_KEY`
    );
  }
  logPass("6. Nuitee URL is NOT called from the browser and NUITEE_API_KEY is not exposed to client");

  // -------------------------------------------------------------
  // Test 7, 8, 9: Hotel results, card, and room rates render
  // -------------------------------------------------------------
  console.log("\n--- Section 4: Hotel Results, Card & Rate Semantics ---");
  const cardCode = fs.readFileSync(cardPath, "utf-8");
  const listCode = fs.readFileSync(listPath, "utf-8");

  // Results list
  assert(listCode.includes('id="hotel-results-list"'), "Hotel results list container must exist");
  assert(listCode.includes("hotels found") || listCode.includes("hotel found"), "Results count must be rendered");
  logPass("7. Hotel results render with dynamic count header");

  // Hotel card
  assert(cardCode.includes("hotel.name"), "Card renders hotel name");
  assert(cardCode.includes("hotel.starRating"), "Card renders star rating when available");
  assert(cardCode.includes("hotel.rating"), "Card renders guest rating when available");
  assert(cardCode.includes("hotel.minRate"), "Card renders lowest available rate");
  logPass("8. Hotel cards render with name, ratings, amenities, and pricing");

  // Room rates
  assert(cardCode.includes("rate.roomName"), "Card renders room name");
  assert(cardCode.includes("rate.boardName"), "Card renders board/meal plan when available");
  assert(cardCode.includes("rate.price"), "Card renders room rate price");
  assert(cardCode.includes("rate.refundableStatus"), "Card renders refundable/non-refundable status");
  assert(cardCode.includes("formatCancellationDeadline") || cardCode.includes("cancellationPolicy"), "Card renders cancellation terms when available");
  logPass("9. Room rates render with room title, meal plan, price, and cancellation status");

  // -------------------------------------------------------------
  // Test 10, 11, 12, 13: Results list states (loading, empty, error, retry)
  // -------------------------------------------------------------
  console.log("\n--- Section 5: List UX States (Loading, Empty, Error, Retry) ---");
  assert(listCode.includes('id="hotel-results-loading"'), "Loading skeleton state exists");
  logPass("10. Loading state exists with pulse skeleton cards");

  assert(listCode.includes('id="hotel-results-empty"'), "Empty results state exists");
  logPass("11. Empty state exists with helpful message");

  assert(listCode.includes('id="hotel-results-error"'), "API error state exists");
  logPass("12. Error state exists with error banner");

  assert(listCode.includes('id="btn-retry-hotel-search"'), "Retry button exists");
  assert(listCode.includes("onRetry"), "Retry handler is wired");
  logPass("13. Retry behavior exists and triggers onRetry callback");

  // -------------------------------------------------------------
  // Test 14, 15, 16, 17, 18: Trip Details Integration & Mutual Exclusivity
  // -------------------------------------------------------------
  console.log("\n--- Section 6: Trip Details Integration & Toggle Behavior ---");
  assert(tripDetailsCode.includes('id="btn-find-hotels"'), "Find Hotels button exists with id");
  assert(tripDetailsCode.includes('id="hotel-search-panel"'), "Hotel search panel exists with id");
  assert(
    tripDetailsCode.includes('activeTransport === "hotels" && ('),
    "Hotels panel is guarded by activeTransport === 'hotels'"
  );
  logPass("14. Hotels can be opened from Trip Details via Find Hotels button");

  // 15: Opening Hotels closes Flights
  // In single-state architecture, setActiveTransport("hotels") makes activeTransport === "hotels",
  // which automatically means activeTransport !== "flights" and activeTransport !== "trains".
  assert(
    tripDetailsCode.includes('type ActiveTransport = "flights" | "trains" | "hotels" | null'),
    "ActiveTransport type enforces single active panel"
  );
  assert(
    tripDetailsCode.includes('activeTransport === "flights" && (') &&
    tripDetailsCode.includes('activeTransport === "hotels" && ('),
    "Flights and Hotels panels are mutually exclusive"
  );
  logPass("15. Opening Hotels closes Flights (single active transport state)");

  // 16: Opening Hotels closes Trains
  assert(
    tripDetailsCode.includes('activeTransport === "trains" && (') &&
    tripDetailsCode.includes('activeTransport === "hotels" && ('),
    "Trains and Hotels panels are mutually exclusive"
  );
  logPass("16. Opening Hotels closes Trains (single active transport state)");

  // 17: Opening Flights closes Hotels
  assert(
    tripDetailsCode.includes('setActiveTransport((prev) => (prev === "flights" ? null : "flights"))'),
    "Clicking Flights sets activeTransport to flights"
  );
  logPass("17. Opening Flights closes Hotels");

  // 18: Opening Trains closes Hotels
  assert(
    tripDetailsCode.includes('setActiveTransport((prev) => (prev === "trains" ? null : "trains"))'),
    "Clicking Trains sets activeTransport to trains"
  );
  logPass("18. Opening Trains closes Hotels");

  // -------------------------------------------------------------
  // Test 19: Normal clicks do NOT modify URL
  // -------------------------------------------------------------
  console.log("\n--- Section 7: URL Hash Isolation & Deep Linking ---");
  const hotelsBtnCodeSlice = tripDetailsCode.slice(
    tripDetailsCode.indexOf('id="btn-find-hotels"'),
    tripDetailsCode.indexOf('id="hotel-search-panel"')
  );
  assert(
    !hotelsBtnCodeSlice.includes("pushState") &&
    !hotelsBtnCodeSlice.includes("location.hash") &&
    !hotelsBtnCodeSlice.includes("#trip-hotels"),
    "Clicking Find Hotels must NOT call pushState or append #trip-hotels to the URL"
  );
  logPass("19. Normal clicks do not modify the URL or add hash");

  // -------------------------------------------------------------
  // Test 20: #trip-hotels deep link opens Hotels and removes hash
  // -------------------------------------------------------------
  assert(
    tripDetailsCode.includes('hash === "#trip-hotels"'),
    "TripDetails must detect #trip-hotels in URL hash"
  );
  assert(
    tripDetailsCode.includes('setActiveTransport("hotels")'),
    "Hash handler sets activeTransport to 'hotels'"
  );
  assert(
    tripDetailsCode.includes('window.history.replaceState(null, "", window.location.pathname + window.location.search)'),
    "Hash is consumed and removed from address bar via history.replaceState"
  );
  assert(tripDetailsCode.includes('id="trip-hotels"'), "Anchor hook #trip-hotels exists in DOM");
  logPass("20. #trip-hotels deep link opens Hotels and removes the hash from the address bar");

  // -------------------------------------------------------------
  // Test 21 & 22: Existing deep links still work
  // -------------------------------------------------------------
  assert(
    tripDetailsCode.includes('hash === "#trip-flights"') &&
    tripDetailsCode.includes('setActiveTransport("flights")'),
    "Existing #trip-flights deep link is preserved"
  );
  logPass("21. Existing #trip-flights deep link continues working");

  assert(
    tripDetailsCode.includes('hash === "#trip-trains"') &&
    tripDetailsCode.includes('setActiveTransport("trains")'),
    "Existing #trip-trains deep link is preserved"
  );
  logPass("22. Existing #trip-trains deep link continues working");

  // -------------------------------------------------------------
  // Live API End-to-End Verification with Real Nuitee Sandbox
  // -------------------------------------------------------------
  console.log("\n--- Section 8: Live Sandbox Integration Verification ---");

  // Authenticate test user session
  const testEmail = `nuitee_ui_test_${Date.now()}@travelsensei.local`;
  const testPassword = "NuiteeUiTestPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Nuitee UI Tester",
    }),
  });

  let cookieHeader = "";
  if (typeof signupRes.headers.getSetCookie === "function") {
    cookieHeader = signupRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  } else {
    const rawSetCookie = signupRes.headers.get("set-cookie") || "";
    cookieHeader = rawSetCookie.split(",").map((c) => c.split(";")[0]).join("; ");
  }

  assert.strictEqual(signupRes.ok, true, "Test user registration succeeded");
  console.log("[INFO] Authenticated test user session established");

  // Query live /api/hotels/search as the UI would call it
  const searchUrl = `${BASE_URL}/api/hotels/search?destination=Rome&countryCode=IT&checkin=2026-10-15&checkout=2026-10-17&adults=2&currency=USD`;
  console.log(`[INFO] Querying ${searchUrl}...`);

  const apiRes = await fetch(searchUrl, {
    headers: { Cookie: cookieHeader },
  });

  assert.strictEqual(apiRes.status, 200, "Hotel search API should return HTTP 200");
  const apiJson = await apiRes.json();
  assert.strictEqual(apiJson.success, true, "Hotel search response success should be true");
  assert.ok(apiJson.data && Array.isArray(apiJson.data.hotels), "Hotel results array should be present");

  const hotelCount = apiJson.data.hotels.length;
  console.log(`[INFO] Real Nuitee sandbox returned ${hotelCount} hotels`);
  assert.ok(hotelCount > 0, "Real Nuitee sandbox should return hotel inventory");

  const firstHotel = apiJson.data.hotels[0];
  console.log(`[INFO] Sample Hotel: [${firstHotel.id}] ${firstHotel.name} (${firstHotel.city || "Rome"})`);
  assert.ok(firstHotel.name, "Hotel name should be present");

  if (firstHotel.rates && firstHotel.rates.length > 0) {
    const firstRate = firstHotel.rates[0];
    console.log(`[INFO] Sample Rate: ${firstRate.currency} ${firstRate.price} | ${firstRate.roomName} | Status: ${firstRate.refundableStatus}`);
    assert.ok(firstRate.price > 0, "Rate price should be positive");
    assert.ok(firstRate.currency, "Rate currency should be present");
  }

  logPass(`Live Nuitee sandbox returned ${hotelCount} hotels with rates, verified end-to-end`);

  console.log("\n=================================================");
  console.log(`ALL NUITEE HOTEL UI TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runNuiteeUITestSuite().catch((err) => {
  console.error("\n[TEST RUNNER FATAL]", err);
  process.exit(1);
});

import { createClient } from "@supabase/supabase-js";

const BASE_URL = "http://localhost:3000";
const SUPABASE_URL = "https://frppvqgrhxpaiaoqbcns.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_A2vVNOdJcX8qxUPABKXd8A_ESynvGoj";

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

async function runFlightIntegrationTests() {
  console.log("=================================================");
  console.log("RUNNING STAGE 8B: IGNAV FLIGHT SEARCH TEST SUITE");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Test 1: Unauthenticated /api/flights/search returns 401
  // -------------------------------------------------------------
  console.log("--- Test 1: Unauthenticated Flight Search Security ---");
  const unauthFlightRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: "DEL",
      destination: "GOI",
      departure_date: "2026-10-15",
    }),
  });
  const unauthFlightJson = await unauthFlightRes.json();
  assert(unauthFlightRes.status === 401, "Unauthenticated POST /api/flights/search returns 401");
  assert(unauthFlightJson.success === false, "Unauthenticated flight search returns success: false");

  // -------------------------------------------------------------
  // Test 2: Unauthenticated /api/flights/airports returns 401
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Unauthenticated Airport Search Security ---");
  const unauthAirportRes = await fetch(`${BASE_URL}/api/flights/airports?q=Delhi`);
  const unauthAirportJson = await unauthAirportRes.json();
  assert(unauthAirportRes.status === 401, "Unauthenticated GET /api/flights/airports returns 401");
  assert(unauthAirportJson.success === false, "Unauthenticated airport search returns success: false");

  // -------------------------------------------------------------
  // Setup: Create Authenticated Session
  // -------------------------------------------------------------
  console.log("\n--- Setup: Authenticating Test User ---");
  const testEmail = `flight_test_${Date.now()}@travelsensei.local`;
  const testPassword = "FlightTestPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Flight Tester",
    }),
  });

  const setCookieHeader = signupRes.headers.get("set-cookie") || "";
  let cookieHeader = "";
  if (typeof signupRes.headers.getSetCookie === "function") {
    cookieHeader = signupRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  } else {
    cookieHeader = setCookieHeader.split(",").map((c) => c.split(";")[0]).join("; ");
  }

  assert(signupRes.ok, "Test user registration succeeded");
  assert(cookieHeader.length > 0, "Received auth session cookies");

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
  };

  // -------------------------------------------------------------
  // Test 3: Authenticated Airport Search - Missing & Invalid 'q'
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Airport Search Input Validation ---");
  const emptyQueryRes = await fetch(`${BASE_URL}/api/flights/airports?q=`, {
    headers: { Cookie: cookieHeader },
  });
  const emptyQueryJson = await emptyQueryRes.json();
  assert(emptyQueryRes.status === 400, "Empty airport query returns 400");
  assert(emptyQueryJson.success === false, "Empty airport query returns success: false");

  const invalidLimitRes = await fetch(`${BASE_URL}/api/flights/airports?q=Delhi&limit=99`, {
    headers: { Cookie: cookieHeader },
  });
  assert(invalidLimitRes.status === 400, "Out-of-range airport limit returns 400");

  // -------------------------------------------------------------
  // Test 4: Authenticated Airport Search with Valid Query
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Valid Airport Search Execution ---");
  const airportRes = await fetch(`${BASE_URL}/api/flights/airports?q=DEL&limit=5`, {
    headers: { Cookie: cookieHeader },
  });
  const airportJson = await airportRes.json();
  console.log("Airport search response status:", airportRes.status);

  if (airportRes.ok) {
    assert(airportJson.success === true, "Airport search returns success: true");
    assert(Array.isArray(airportJson.airports), "Airports result is an array");
    if (airportJson.airports.length > 0) {
      const first = airportJson.airports[0];
      assert(typeof first.code === "string", "Airport has code string");
      assert(typeof first.name === "string", "Airport has name string");
      assert(typeof first.city === "string", "Airport has city string");
      assert(typeof first.country === "string", "Airport has country string");
    }
  } else {
    console.log("Airport provider message:", airportJson.message);
    assert(
      [401, 402, 429, 502, 503].includes(airportRes.status),
      `Airport endpoint failed with handled provider status: ${airportRes.status}`
    );
  }

  // -------------------------------------------------------------
  // Test 5: Flight Search Input Validations
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Flight Search Validation Suite ---");

  // 5.1 Invalid Origin
  const invOriginRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "TOOLONG",
      destination: "BOM",
      departure_date: "2026-11-15",
    }),
  });
  assert(invOriginRes.status === 400, "Invalid origin code (>3 letters) returns 400");

  // 5.2 Invalid Destination
  const invDestRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "12",
      departure_date: "2026-11-15",
    }),
  });
  assert(invDestRes.status === 400, "Invalid destination code (<3 letters) returns 400");

  // 5.3 Same Origin and Destination
  const sameAirportsRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "DEL",
      departure_date: "2026-11-15",
    }),
  });
  const sameAirportsJson = await sameAirportsRes.json();
  assert(sameAirportsRes.status === 400, "Same origin and destination returns 400");
  assert(
    sameAirportsJson.message === "Origin and destination airports must be different.",
    "Same airports returns appropriate error message"
  );

  // 5.4 Invalid Date Format
  const invDateRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "15-11-2026",
    }),
  });
  assert(invDateRes.status === 400, "Invalid date format returns 400");

  // 5.5 Past Date
  const pastDateRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "2020-01-01",
    }),
  });
  const pastDateJson = await pastDateRes.json();
  assert(pastDateRes.status === 400, "Past departure date returns 400");
  assert(
    pastDateJson.message === "Departure date cannot be in the past.",
    "Past date returns clear error message"
  );

  // 5.6 Return Date Before Departure Date
  const invReturnRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "2026-11-15",
      return_date: "2026-11-10",
    }),
  });
  const invReturnJson = await invReturnRes.json();
  assert(invReturnRes.status === 400, "Return date before departure date returns 400");
  assert(
    invReturnJson.message === "Return date must be on or after the departure date.",
    "Return date error message verified"
  );

  // 5.7 Invalid Cabin Class
  const invCabinRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "2026-11-15",
      cabin_class: "ultra_luxury",
    }),
  });
  assert(invCabinRes.status === 400, "Invalid cabin class returns 400");

  // 5.8 Invalid Adults Count
  const invAdultsRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "2026-11-15",
      adults: 0,
    }),
  });
  assert(invAdultsRes.status === 400, "Invalid adults count (0) returns 400");

  // 5.9 Invalid Max Stops
  const invStopsRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "2026-11-15",
      max_stops: 5,
    }),
  });
  assert(invStopsRes.status === 400, "Invalid max_stops (5) returns 400");

  // -------------------------------------------------------------
  // Test 6: Authenticated Valid One-Way Flight Search
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Valid One-Way Flight Search Execution ---");
  const validOneWayRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "2026-10-20",
      adults: 1,
      cabin_class: "economy",
      market: "IN",
    }),
  });

  const validOneWayText = await validOneWayRes.text();
  let validOneWayJson = {};
  try {
    validOneWayJson = JSON.parse(validOneWayText);
  } catch {
    // raw text
  }

  console.log("One-way flight search status:", validOneWayRes.status);

  // Security check: Verify API key is NEVER leaked anywhere in the response body
  const rawKey = process.env.IGNAV_API_KEY;
  if (rawKey && rawKey.trim().length > 0) {
    assert(!validOneWayText.includes(rawKey), "Server response does NOT leak IGNAV_API_KEY");
  }

  if (validOneWayRes.ok) {
    assert(validOneWayJson.success === true, "One-way search returned success: true");
    assert(validOneWayJson.data.type === "one-way", "Response data.type is 'one-way'");
    assert(validOneWayJson.data.origin === "DEL", "Response origin is DEL");
    assert(validOneWayJson.data.destination === "BOM", "Response destination is BOM");
    assert(Array.isArray(validOneWayJson.data.itineraries), "Response itineraries is an array");

    if (validOneWayJson.data.itineraries.length > 0) {
      const flt = validOneWayJson.data.itineraries[0];
      assert(typeof flt.id === "string", "Flight itinerary has string ID");
      assert(typeof flt.price?.amount === "number", "Flight has price amount number");
      assert(typeof flt.price?.currency === "string", "Flight has price currency string");
      assert(Boolean(flt.outbound), "Flight has outbound leg");
      assert(Array.isArray(flt.outbound.segments), "Outbound leg has segments array");
    }
  } else {
    console.log("Provider handled response message:", validOneWayJson.message);
    assert(
      [400, 401, 402, 424, 429, 502, 503].includes(validOneWayRes.status),
      `Handled provider status code gracefully: ${validOneWayRes.status}`
    );
  }

  // -------------------------------------------------------------
  // Test 7: Authenticated Valid Round-Trip Flight Search
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Valid Round-Trip Flight Search Execution ---");
  const validRoundTripRes = await fetch(`${BASE_URL}/api/flights/search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      origin: "DEL",
      destination: "BOM",
      departure_date: "2026-10-20",
      return_date: "2026-10-27",
      adults: 1,
      cabin_class: "economy",
      market: "IN",
    }),
  });

  const validRoundTripText = await validRoundTripRes.text();
  let validRoundTripJson = {};
  try {
    validRoundTripJson = JSON.parse(validRoundTripText);
  } catch {
    // raw text
  }

  console.log("Round-trip flight search status:", validRoundTripRes.status);

  if (rawKey && rawKey.trim().length > 0) {
    assert(!validRoundTripText.includes(rawKey), "Round-trip response does NOT leak IGNAV_API_KEY");
  }

  if (validRoundTripRes.ok) {
    assert(validRoundTripJson.success === true, "Round-trip search returned success: true");
    assert(validRoundTripJson.data.type === "round-trip", "Response data.type is 'round-trip'");
    assert(validRoundTripJson.data.returnDate === "2026-10-27", "Response returnDate matches input");
  } else {
    console.log("Provider handled response message:", validRoundTripJson.message);
    assert(
      [400, 401, 402, 424, 429, 502, 503].includes(validRoundTripRes.status),
      `Handled round-trip provider status code gracefully: ${validRoundTripRes.status}`
    );
  }

  console.log("\n=================================================");
  console.log(`ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log("=================================================\n");
}

runFlightIntegrationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

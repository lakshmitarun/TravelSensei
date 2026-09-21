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

async function runRailRadarUITests() {
  console.log("=================================================");
  console.log("RUNNING STAGE 9D: RAILRADAR TRAIN SEARCH UI TESTS");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Part 1: Component Files & Export Verification
  // -------------------------------------------------------------
  console.log("--- Part 1: Component Files Verification ---");
  const stationAutocompletePath = path.resolve("components/trains/StationAutocomplete.tsx");
  const trainSearchFormPath = path.resolve("components/trains/TrainSearchForm.tsx");
  const trainCardPath = path.resolve("components/trains/TrainCard.tsx");
  const trainResultsListPath = path.resolve("components/trains/TrainResultsList.tsx");
  const trainsIndexPath = path.resolve("components/trains/index.ts");

  assert(fs.existsSync(stationAutocompletePath), "StationAutocomplete.tsx component exists");
  assert(fs.existsSync(trainSearchFormPath), "TrainSearchForm.tsx component exists");
  assert(fs.existsSync(trainCardPath), "TrainCard.tsx component exists");
  assert(fs.existsSync(trainResultsListPath), "TrainResultsList.tsx component exists");
  assert(fs.existsSync(trainsIndexPath), "components/trains/index.ts exists");

  // Verify component contents
  const stationAutocompleteCode = fs.readFileSync(stationAutocompletePath, "utf-8");
  assert(stationAutocompleteCode.includes("/api/trains/stations"), "StationAutocomplete queries /api/trains/stations");
  assert(stationAutocompleteCode.includes("role=\"combobox\""), "StationAutocomplete has accessible combobox ARIA role");
  assert(stationAutocompleteCode.includes("debounceTimerRef"), "StationAutocomplete implements debounced queries");

  const trainSearchFormCode = fs.readFileSync(trainSearchFormPath, "utf-8");
  assert(trainSearchFormCode.includes("StationAutocomplete"), "TrainSearchForm embeds StationAutocomplete");
  assert(trainSearchFormCode.includes("handleSwapStations"), "TrainSearchForm includes swap stations capability");
  assert(trainSearchFormCode.includes("journeyDate"), "TrainSearchForm manages journeyDate");

  const trainCardCode = fs.readFileSync(trainCardPath, "utf-8");
  assert(trainCardCode.includes("trainNumber"), "TrainCard displays trainNumber");
  assert(trainCardCode.includes("duration"), "TrainCard displays duration");
  assert(trainCardCode.includes("totalHaltsBetween"), "TrainCard displays halts");
  assert(trainCardCode.includes("runDays"), "TrainCard displays runDays");

  const trainResultsListCode = fs.readFileSync(trainResultsListPath, "utf-8");
  assert(trainResultsListCode.includes("TrainCard"), "TrainResultsList renders TrainCard components");
  assert(trainResultsListCode.includes("sortBy"), "TrainResultsList provides sort controls");
  assert(trainResultsListCode.includes("animate-pulse"), "TrainResultsList provides loading skeletons");

  // -------------------------------------------------------------
  // Part 2: TripDetails and TravelPlanResult Integration Check
  // -------------------------------------------------------------
  console.log("\n--- Part 2: Container Integrations Verification ---");
  const tripDetailsCode = fs.readFileSync(path.resolve("components/trips/TripDetails.tsx"), "utf-8");
  assert(tripDetailsCode.includes("id=\"trip-trains\""), "TripDetails contains #trip-trains section anchor");
  assert(tripDetailsCode.includes("TrainSearchForm"), "TripDetails renders TrainSearchForm");
  assert(tripDetailsCode.includes("TrainResultsList"), "TripDetails renders TrainResultsList");
  assert(tripDetailsCode.includes("Find Trains"), "TripDetails includes 'Find Trains' heading");

  const travelPlanResultCode = fs.readFileSync(path.resolve("components/travel-planner/TravelPlanResult.tsx"), "utf-8");
  assert(travelPlanResultCode.includes("#trip-trains"), "TravelPlanResult links to #trip-trains");
  assert(travelPlanResultCode.includes("Find Trains"), "TravelPlanResult has 'Find Trains' action button");

  // -------------------------------------------------------------
  // Setup: Authenticate Test Session
  // -------------------------------------------------------------
  console.log("\n--- Setup: Authenticating Test User ---");
  const testEmail = `train_ui_test_${Date.now()}@travelsensei.local`;
  const testPassword = "TrainUiTestPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Train UI Tester",
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

  // -------------------------------------------------------------
  // Test 1 & 2: Station search endpoint reachable & normalized shape
  // -------------------------------------------------------------
  console.log("\n--- Test 1 & 2: Station Search Reachability & Normalization ---");
  const stationRes = await fetch(`${BASE_URL}/api/trains/stations?q=Delhi&limit=5`, { headers: authHeaders });
  const stationJson = await stationRes.json();
  assert(stationRes.status === 200, "GET /api/trains/stations?q=Delhi returns 200");
  assert(stationJson.success === true, "Station response success is true");
  assert(Array.isArray(stationJson.data), "Station response data is an array");
  if (stationJson.data.length > 0) {
    const s = stationJson.data[0];
    assert(typeof s.code === "string" && s.code.length > 0, "Station has string code");
    assert(typeof s.name === "string" && s.name.length > 0, "Station has string name");
  }

  // -------------------------------------------------------------
  // Test 3 & 4: Train search endpoint reachable & normalized trains
  // -------------------------------------------------------------
  console.log("\n--- Test 3 & 4: Train Search Reachability & Normalization ---");
  const trainRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&date=2026-10-15`, { headers: authHeaders });
  const trainJson = await trainRes.json();
  assert(trainRes.status === 200, "GET /api/trains/between returns 200");
  assert(trainJson.success === true, "Train search success is true");
  assert(typeof trainJson.data === "object" && trainJson.data !== null, "Train data is an object");
  assert(Array.isArray(trainJson.data.trains), "Train search trains is an array");
  assert(trainJson.data.from.code === "NDLS", "From station code matches NDLS");
  assert(trainJson.data.to.code === "MMCT", "To station code matches MMCT");

  if (trainJson.data.trains.length > 0) {
    const t = trainJson.data.trains[0];
    assert(typeof t.trainNumber === "string", "Train has string trainNumber");
    assert(typeof t.trainName === "string", "Train has string trainName");
    assert(typeof t.departure === "object" && typeof t.departure.time === "string", "Train has departure time");
    assert(typeof t.arrival === "object" && typeof t.arrival.time === "string", "Train has arrival time");
    assert(typeof t.duration === "string", "Train has duration string");
  }

  // -------------------------------------------------------------
  // Test 5: Invalid station selection rejected by UI/API flow
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Invalid Station Code Validation ---");
  const invalidFromRes = await fetch(`${BASE_URL}/api/trains/between?from=1&to=MMCT`, { headers: authHeaders });
  assert(invalidFromRes.status === 400, "Invalid station code returns 400");
  const invalidFromJson = await invalidFromRes.json();
  assert(invalidFromJson.success === false, "Invalid station code returns success: false");

  // -------------------------------------------------------------
  // Test 6: Same origin/destination rejected
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Same Origin / Destination Validation ---");
  const sameRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=NDLS`, { headers: authHeaders });
  assert(sameRes.status === 400, "Same from and to stations returns 400");
  const sameJson = await sameRes.json();
  assert(sameJson.message === "Origin and destination stations must be different.", "Correct same station message");

  // -------------------------------------------------------------
  // Test 7: Past date rejected
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Past Date Validation ---");
  const pastRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&date=2020-01-01`, { headers: authHeaders });
  assert(pastRes.status === 400, "Past date returns 400");
  const pastJson = await pastRes.json();
  assert(pastJson.message === "Journey date cannot be in the past.", "Correct past date message");

  // -------------------------------------------------------------
  // Test 8: Existing flight functionality remains operational
  // -------------------------------------------------------------
  console.log("\n--- Test 8: Existing Flight API Regression ---");
  const airportRes = await fetch(`${BASE_URL}/api/flights/airports?q=Delhi&limit=5`, { headers: authHeaders });
  assert(airportRes.status === 200, "GET /api/flights/airports returns 200");
  const airportJson = await airportRes.json();
  assert(airportJson.success === true, "Airports lookup success: true");
  assert(Array.isArray(airportJson.airports), "Airports returned as array");

  // -------------------------------------------------------------
  // Test 9: Existing destination/planner flow remains operational
  // -------------------------------------------------------------
  console.log("\n--- Test 9: Existing Destinations & Planner Regression ---");
  const destRes = await fetch(`${BASE_URL}/api/destinations`);
  assert(destRes.status === 200, "GET /api/destinations returns 200");
  const destJson = await destRes.json();
  assert(Array.isArray(destJson.destinations) || Array.isArray(destJson), "Destinations catalog operational");

  console.log("\n=================================================");
  console.log(`ALL UI/API INTEGRATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runRailRadarUITests().catch((err) => {
  console.error("UI Test execution failed:", err);
  process.exit(1);
});

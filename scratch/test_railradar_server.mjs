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

async function runRailRadarServerTests() {
  console.log("=================================================");
  console.log("RUNNING STAGE 9C: RAILRADAR TRAIN SERVER TESTS");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Test 1: Unauthenticated station search -> 401
  // -------------------------------------------------------------
  console.log("--- Test 1: Unauthenticated Station Search Security ---");
  const unauthStationRes = await fetch(`${BASE_URL}/api/trains/stations?q=Delhi`);
  const unauthStationJson = await unauthStationRes.json();
  assert(unauthStationRes.status === 401, "Unauthenticated GET /api/trains/stations returns 401");
  assert(unauthStationJson.success === false, "Unauthenticated station response has success: false");
  assert(unauthStationJson.message === "Authentication required", "Correct authentication required message");

  // -------------------------------------------------------------
  // Test 2: Unauthenticated train search -> 401
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Unauthenticated Train Search Security ---");
  const unauthTrainRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&date=2026-10-15`);
  const unauthTrainJson = await unauthTrainRes.json();
  assert(unauthTrainRes.status === 401, "Unauthenticated GET /api/trains/between returns 401");
  assert(unauthTrainJson.success === false, "Unauthenticated train search returns success: false");
  assert(unauthTrainJson.message === "Authentication required", "Correct authentication required message");

  // -------------------------------------------------------------
  // Setup: Authenticate Test User
  // -------------------------------------------------------------
  console.log("\n--- Setup: Authenticating Test User ---");
  const testEmail = `train_test_${Date.now()}@travelsensei.local`;
  const testPassword = "TrainTestPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Train Tester",
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
  // Test 3: Empty station query -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Empty Station Search Query Validation ---");
  const emptyQueryRes = await fetch(`${BASE_URL}/api/trains/stations?q=`, { headers: authHeaders });
  const emptyQueryJson = await emptyQueryRes.json();
  assert(emptyQueryRes.status === 400, "Empty station query returns 400");
  assert(emptyQueryJson.success === false, "Empty station query returns success: false");

  const whitespaceQueryRes = await fetch(`${BASE_URL}/api/trains/stations?q=%20%20`, { headers: authHeaders });
  assert(whitespaceQueryRes.status === 400, "Whitespace-only station query returns 400");

  // -------------------------------------------------------------
  // Test 4: Invalid station search limit -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Invalid Station Limit Validation ---");
  const invalidLimitRes = await fetch(`${BASE_URL}/api/trains/stations?q=Delhi&limit=999`, { headers: authHeaders });
  const invalidLimitJson = await invalidLimitRes.json();
  assert(invalidLimitRes.status === 400, "Out-of-range station limit (999) returns 400");
  assert(invalidLimitJson.success === false, "Returns success: false");

  const negativeLimitRes = await fetch(`${BASE_URL}/api/trains/stations?q=Delhi&limit=-5`, { headers: authHeaders });
  assert(negativeLimitRes.status === 400, "Negative station limit returns 400");

  const nonNumLimitRes = await fetch(`${BASE_URL}/api/trains/stations?q=Delhi&limit=abc`, { headers: authHeaders });
  assert(nonNumLimitRes.status === 400, "Non-numeric station limit returns 400");

  // -------------------------------------------------------------
  // Test 5: Valid station search & Response structure (Tests 5 & 13)
  // -------------------------------------------------------------
  console.log("\n--- Test 5 & 13: Valid Station Search & Normalization ---");
  const validStationRes = await fetch(`${BASE_URL}/api/trains/stations?q=Delhi&limit=5`, { headers: authHeaders });
  const validStationJson = await validStationRes.json();

  if (validStationRes.status === 503 || validStationRes.status === 429 || validStationRes.status === 401) {
    console.warn(`[PROVIDER ADVISORY] Station lookup returned provider status ${validStationRes.status}: ${validStationJson.message}`);
    assert(typeof validStationJson.message === "string", "Safe error message returned by provider handler");
  } else {
    assert(validStationRes.status === 200, "Valid GET /api/trains/stations returns 200");
    assert(validStationJson.success === true, "Valid station lookup returns success: true");
    assert(Array.isArray(validStationJson.data), "Normalized station data is an array");
    if (validStationJson.data.length > 0) {
      const firstStation = validStationJson.data[0];
      assert(typeof firstStation.code === "string" && firstStation.code.length > 0, "Station item has valid code");
      assert(typeof firstStation.name === "string" && firstStation.name.length > 0, "Station item has valid name");
    }
  }

  // -------------------------------------------------------------
  // Test 6: Invalid from code -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Invalid From Code Validation ---");
  const invalidFromRes = await fetch(`${BASE_URL}/api/trains/between?from=1&to=MMCT`, { headers: authHeaders });
  const invalidFromJson = await invalidFromRes.json();
  assert(invalidFromRes.status === 400, "Single character or numeric from code returns 400");
  assert(invalidFromJson.success === false, "Invalid from code returns success: false");

  const toolongFromRes = await fetch(`${BASE_URL}/api/trains/between?from=LONGSTATIONCODE&to=MMCT`, { headers: authHeaders });
  assert(toolongFromRes.status === 400, "Overly long from code returns 400");

  // -------------------------------------------------------------
  // Test 7: Invalid to code -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Invalid To Code Validation ---");
  const invalidToRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=X`, { headers: authHeaders });
  const invalidToJson = await invalidToRes.json();
  assert(invalidToRes.status === 400, "Invalid single-character to code returns 400");
  assert(invalidToJson.success === false, "Invalid to code returns success: false");

  // -------------------------------------------------------------
  // Test 8: Same from/to -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 8: Identical From and To Validation ---");
  const sameFromToRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=NDLS`, { headers: authHeaders });
  const sameFromToJson = await sameFromToRes.json();
  assert(sameFromToRes.status === 400, "Same from and to code returns 400");
  assert(sameFromToJson.success === false, "Same from/to returns success: false");
  assert(sameFromToJson.message === "Origin and destination stations must be different.", "Correct identical station message");

  // -------------------------------------------------------------
  // Test 9: Invalid date -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 9: Invalid Date Format Validation ---");
  const invalidDateRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&date=not-a-date`, { headers: authHeaders });
  const invalidDateJson = await invalidDateRes.json();
  assert(invalidDateRes.status === 400, "Invalid date format returns 400");
  assert(invalidDateJson.success === false, "Invalid date returns success: false");

  const invalidMonthRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&date=2026-19-99`, { headers: authHeaders });
  assert(invalidMonthRes.status === 400, "Invalid calendar date (month 19) returns 400");

  // -------------------------------------------------------------
  // Test 10: Past date -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 10: Past Date Validation ---");
  const pastDateRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&date=2020-01-01`, { headers: authHeaders });
  const pastDateJson = await pastDateRes.json();
  assert(pastDateRes.status === 400, "Past journey date returns 400");
  assert(pastDateJson.success === false, "Past date returns success: false");
  assert(pastDateJson.message === "Journey date cannot be in the past.", "Correct past date message");

  // -------------------------------------------------------------
  // Test 11: Invalid boolean parameter -> 400
  // -------------------------------------------------------------
  console.log("\n--- Test 11: Invalid Boolean Parameters Validation ---");
  const invalidByCityRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&byCity=maybe`, { headers: authHeaders });
  assert(invalidByCityRes.status === 400, "Invalid byCity parameter ('maybe') returns 400");

  const invalidLiveRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&live=yes`, { headers: authHeaders });
  assert(invalidLiveRes.status === 400, "Invalid live parameter ('yes') returns 400");

  // -------------------------------------------------------------
  // Test 12 & 14: Valid train search & Normalized train response shape
  // -------------------------------------------------------------
  console.log("\n--- Test 12 & 14: Valid Train Search & Normalization ---");
  const validTrainRes = await fetch(`${BASE_URL}/api/trains/between?from=NDLS&to=MMCT&date=2026-10-15&byCity=true`, { headers: authHeaders });
  const validTrainJson = await validTrainRes.json();

  if (validTrainRes.status === 503 || validTrainRes.status === 429 || validTrainRes.status === 401) {
    console.warn(`[PROVIDER ADVISORY] Train search returned provider status ${validTrainRes.status}: ${validTrainJson.message}`);
    assert(typeof validTrainJson.message === "string", "Safe error message returned by provider handler");
  } else {
    assert(validTrainRes.status === 200, "Valid GET /api/trains/between returns 200");
    assert(validTrainJson.success === true, "Valid train search returns success: true");
    assert(typeof validTrainJson.data === "object" && validTrainJson.data !== null, "Response has data object");
    assert(validTrainJson.data.from.code === "NDLS", "Normalized data has correct from code");
    assert(validTrainJson.data.to.code === "MMCT", "Normalized data has correct to code");
    assert(Array.isArray(validTrainJson.data.trains), "trains field is an array");
    assert(typeof validTrainJson.data.count === "number", "count field is numeric");

    if (validTrainJson.data.trains.length > 0) {
      const train = validTrainJson.data.trains[0];
      assert(typeof train.trainNumber === "string" && train.trainNumber.length > 0, "trainNumber exists");
      assert(typeof train.trainName === "string" && train.trainName.length > 0, "trainName exists");
      assert(Array.isArray(train.runDays), "runDays is an array");
      assert(typeof train.departure === "object" && train.departure !== null, "departure object exists");
      assert(typeof train.departure.stationCode === "string", "departure.stationCode exists");
      assert(typeof train.departure.time === "string", "departure.time exists");
      assert(typeof train.arrival === "object" && train.arrival !== null, "arrival object exists");
      assert(typeof train.arrival.stationCode === "string", "arrival.stationCode exists");
      assert(typeof train.arrival.time === "string", "arrival.time exists");
      assert(typeof train.distanceKm === "number", "distanceKm is a number");
      assert(typeof train.duration === "string", "duration is a string");
      assert(typeof train.totalHaltsBetween === "number", "totalHaltsBetween is a number");
    }
  }

  // -------------------------------------------------------------
  // Test 15: API key is NEVER present in response
  // -------------------------------------------------------------
  console.log("\n--- Test 15: Credential Isolation & Leak Verification ---");
  const stationRawStr = JSON.stringify(validStationJson);
  const trainRawStr = JSON.stringify(validTrainJson);

  assert(!stationRawStr.includes("rr_live_"), "Station response does not contain 'rr_live_' key pattern");
  assert(!stationRawStr.includes("rr_test_"), "Station response does not contain 'rr_test_' key pattern");
  assert(!trainRawStr.includes("rr_live_"), "Train response does not contain 'rr_live_' key pattern");
  assert(!trainRawStr.includes("rr_test_"), "Train response does not contain 'rr_test_' key pattern");
  assert(!trainRawStr.toLowerCase().includes("authorization"), "Train response does not contain Authorization header");
  assert(!stationRawStr.toLowerCase().includes("authorization"), "Station response does not contain Authorization header");

  console.log("\n=================================================");
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runRailRadarServerTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

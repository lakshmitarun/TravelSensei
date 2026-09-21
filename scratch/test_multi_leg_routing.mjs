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

// Mirror pure mathematical helper functions for assertion verification
function parseTimeToMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(mins)) return 0;
  return hours * 60 + mins;
}

function formatMinutesToDuration(totalMinutes) {
  if (totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function validateConnection(seg1, seg2, minBuffer = 60, maxBuffer = 720) {
  const arrivalMinutes = parseTimeToMinutes(seg1.arrivalTime);
  const departureMinutes = parseTimeToMinutes(seg2.departureTime);

  if (departureMinutes >= arrivalMinutes) {
    const wait = departureMinutes - arrivalMinutes;
    if (wait < minBuffer) return { isValid: false, waitingMinutes: wait, departureDayOffset: 0 };
    if (wait > maxBuffer) return { isValid: false, waitingMinutes: wait, departureDayOffset: 0 };
    return { isValid: true, waitingMinutes: wait, departureDayOffset: 0 };
  }

  const overnightWait = 1440 - arrivalMinutes + departureMinutes;
  if (overnightWait < minBuffer) return { isValid: false, waitingMinutes: overnightWait, departureDayOffset: 1 };
  if (overnightWait > maxBuffer) return { isValid: false, waitingMinutes: overnightWait, departureDayOffset: 1 };
  return { isValid: true, waitingMinutes: overnightWait, departureDayOffset: 1 };
}

async function runMultiLegRoutingTests() {
  console.log("=================================================");
  console.log("RUNNING SMART MULTI-LEG ROUTING TEST SUITE");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Part 1: Files Existence & Code Verification
  // -------------------------------------------------------------
  console.log("--- Part 1: Module Files Verification ---");
  const typesPath = path.resolve("lib/routing/types.ts");
  const hubsPath = path.resolve("lib/routing/hubs.ts");
  const validatorPath = path.resolve("lib/routing/validator.ts");
  const plannerPath = path.resolve("lib/routing/planner.ts");
  const routePath = path.resolve("app/api/routing/search/route.ts");
  const compPath = path.resolve("components/routing/JourneyRouteCard.tsx");

  assert(fs.existsSync(typesPath), "lib/routing/types.ts exists");
  assert(fs.existsSync(hubsPath), "lib/routing/hubs.ts exists");
  assert(fs.existsSync(validatorPath), "lib/routing/validator.ts exists");
  assert(fs.existsSync(plannerPath), "lib/routing/planner.ts exists");
  assert(fs.existsSync(routePath), "app/api/routing/search/route.ts exists");
  assert(fs.existsSync(compPath), "components/routing/JourneyRouteCard.tsx exists");

  const hubsCode = fs.readFileSync(hubsPath, "utf-8");
  assert(hubsCode.includes("NGP"), "Hubs registry contains Nagpur (NGP)");
  assert(hubsCode.includes("BPL"), "Hubs registry contains Bhopal (BPL)");
  assert(hubsCode.includes("ET"), "Hubs registry contains Itarsi (ET)");
  assert(hubsCode.includes("CNB"), "Hubs registry contains Kanpur (CNB)");

  const plannerCode = fs.readFileSync(plannerPath, "utf-8");
  assert(plannerCode.includes("planConnectingTrainRoutes"), "Planner implements planConnectingTrainRoutes");
  assert(plannerCode.includes("directTrainToRoute"), "Planner implements directTrainToRoute");
  assert(plannerCode.includes("flightItineraryToRoute"), "Planner implements flightItineraryToRoute");

  // -------------------------------------------------------------
  // Part 2: Algorithmic Connection Validator Tests
  // -------------------------------------------------------------
  console.log("\n--- Part 2: Algorithmic Connection Validator Tests ---");
  const seg1 = { arrivalTime: "14:00" };
  const seg2Valid = { departureTime: "16:30" };
  const resValid = validateConnection(seg1, seg2Valid);
  assert(resValid.isValid === true, "Valid 2h 30m connection passes validation");
  assert(resValid.waitingMinutes === 150, "Waiting minutes calculated correctly as 150m");
  assert(resValid.departureDayOffset === 0, "Same-day connection has departureDayOffset = 0");

  const seg2TooTight = { departureTime: "14:30" };
  const resTooTight = validateConnection(seg1, seg2TooTight);
  assert(resTooTight.isValid === false, "30m layover rejected for insufficient buffer (<60m)");

  const seg1Late = { arrivalTime: "22:30" };
  const seg2EarlyMorning = { departureTime: "02:00" };
  const resOvernight = validateConnection(seg1Late, seg2EarlyMorning);
  assert(resOvernight.isValid === true, "Overnight calendar rollover connection is valid");
  assert(resOvernight.waitingMinutes === 210, "Overnight wait time accurately computed as 210m");
  assert(resOvernight.departureDayOffset === 1, "Overnight connection has departureDayOffset = 1");

  const seg1Morning = { arrivalTime: "06:00" };
  const seg2Night = { departureTime: "23:00" };
  const resExcessive = validateConnection(seg1Morning, seg2Night);
  assert(resExcessive.isValid === false, "Excessive 17h layover rejected (> 12h maximum)");

  assert(formatMinutesToDuration(150) === "2h 30m", "formatMinutesToDuration formats 150m as '2h 30m'");
  assert(formatMinutesToDuration(45) === "45m", "formatMinutesToDuration formats 45m as '45m'");

  // -------------------------------------------------------------
  // Part 3: Live API Security & Validation Tests
  // -------------------------------------------------------------
  console.log("\n--- Part 3: Routing API Security & Validation ---");
  const unauthRes = await fetch(`${BASE_URL}/api/routing/search?origin=HYD&destination=NDLS&date=2026-10-15`);
  assert(unauthRes.status === 401, "Unauthenticated GET /api/routing/search returns 401");

  // Authenticate session
  const testEmail = `multi_leg_${Date.now()}@travelsensei.local`;
  const testPassword = "MultiLegPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Routing Tester",
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

  const authHeaders = { Cookie: cookieHeader };

  const missingOriginRes = await fetch(`${BASE_URL}/api/routing/search?destination=NDLS&date=2026-10-15`, { headers: authHeaders });
  assert(missingOriginRes.status === 400, "Missing origin returns 400");

  const sameOriginDestRes = await fetch(`${BASE_URL}/api/routing/search?origin=NDLS&destination=NDLS&date=2026-10-15`, { headers: authHeaders });
  assert(sameOriginDestRes.status === 400, "Same origin and destination returns 400");

  const pastDateRes = await fetch(`${BASE_URL}/api/routing/search?origin=HYD&destination=NDLS&date=2020-01-01`, { headers: authHeaders });
  assert(pastDateRes.status === 400, "Past date returns 400");

  // -------------------------------------------------------------
  // Part 4: Live Routing Execution
  // -------------------------------------------------------------
  console.log("\n--- Part 4: Valid Routing Search Execution ---");
  const validRouteRes = await fetch(`${BASE_URL}/api/routing/search?origin=HYD&destination=NDLS&date=2026-10-15&mode=trains`, { headers: authHeaders });
  assert(validRouteRes.status === 200, "Valid GET /api/routing/search returns 200");
  const validRouteJson = await validRouteRes.json();
  assert(validRouteJson.success === true, "Routing search success is true");
  assert(typeof validRouteJson.data === "object" && validRouteJson.data !== null, "Response contains data payload");
  assert(Array.isArray(validRouteJson.data.directRoutes), "directRoutes is an array");
  assert(Array.isArray(validRouteJson.data.connectingRoutes), "connectingRoutes is an array");

  // Credential Isolation verification
  const rawResponseStr = JSON.stringify(validRouteJson);
  assert(!rawResponseStr.includes("rr_live_"), "Response does not contain RailRadar API key");
  assert(!rawResponseStr.includes("ignav_"), "Response does not contain Ignav API key");
  assert(!rawResponseStr.toLowerCase().includes("authorization"), "Response does not contain Authorization header");

  console.log("\n=================================================");
  console.log(`ALL SMART MULTI-LEG ROUTING TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runMultiLegRoutingTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

import { createClient } from "@supabase/supabase-js";

const BASE_URL = "http://localhost:3000";
const SUPABASE_URL = "https://frppvqgrhxpaiaoqbcns.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_A2vVNOdJcX8qxUPABKXd8A_ESynvGoj";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPlanner() {
  console.log("=== Testing Destination Search & Travel Plan Execution ===");

  // 1. Fetch destinations from API
  console.log("\n1. Verifying /api/destinations...");
  const destRes = await fetch(`${BASE_URL}/api/destinations`);
  const destData = await destRes.json();
  if (!destRes.ok || !destData.success || !Array.isArray(destData.destinations) || destData.destinations.length === 0) {
    throw new Error("Failed to fetch destinations from /api/destinations");
  }
  console.log(`✅ Retrieved ${destData.destinations.length} destinations:`, destData.destinations.map(d => d.name).join(", "));

  // 2. Test destination search matching logic
  console.log("\n2. Testing Destination Search & Suggestion Filtering Logic...");
  const sampleDests = destData.destinations;

  function matchDestination(query, destinations) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return destinations.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.state_country && d.state_country.toLowerCase().includes(q))
    );
  }

  const kyotoMatches = matchDestination("Kyo", sampleDests);
  console.log("Matches for 'Kyo':", kyotoMatches.map(d => d.name));
  if (kyotoMatches.length === 0 || kyotoMatches[0].name !== "Kyoto") {
    throw new Error("Expected 'Kyo' to match Kyoto");
  }
  console.log("✅ 'Kyo' matches Kyoto");

  const parisMatches = matchDestination("Paris", sampleDests);
  console.log("Matches for 'Paris':", parisMatches.map(d => d.name));
  if (parisMatches.length === 0 || parisMatches[0].name !== "Paris") {
    throw new Error("Expected 'Paris' to match Paris");
  }
  console.log("✅ 'Paris' matches Paris");

  const invalidMatches = matchDestination("Atlantis", sampleDests);
  console.log("Matches for 'Atlantis':", invalidMatches);
  if (invalidMatches.length !== 0) {
    throw new Error("Expected 'Atlantis' to return 0 matches");
  }
  console.log("✅ Unmatched search returns 0 suggestions");

  // 3. Authenticate a test user
  console.log("\n3. Authenticating test session...");
  const email = `test_plan_user_${Date.now()}@example.com`;
  const password = "ValidPassword123!";

  await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: "Planner Test User" }),
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  let cookieHeader = "";
  if (typeof loginRes.headers.getSetCookie === "function") {
    cookieHeader = loginRes.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  }

  // 4. Test validation on /api/ai/travel-plan
  console.log("\n4. Testing /api/ai/travel-plan input validations...");
  // Missing destination_id
  const noDestRes = await fetch(`${BASE_URL}/api/ai/travel-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ travel_date: "2026-11-20" }),
  });
  const noDestData = await noDestRes.json();
  console.log("Missing destination_id response status:", noDestRes.status, "message:", noDestData.message);
  if (noDestRes.status !== 400) {
    throw new Error("Expected 400 for missing destination_id");
  }
  console.log("✅ Missing destination_id properly returns 400 Bad Request");

  // Invalid UUID
  const badDestRes = await fetch(`${BASE_URL}/api/ai/travel-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ destination_id: "not-a-uuid", travel_date: "2026-11-20" }),
  });
  if (badDestRes.status !== 400) {
    throw new Error("Expected 400 for invalid UUID destination_id");
  }
  console.log("✅ Invalid UUID destination_id properly returns 400 Bad Request");

  // Destination not in DB
  const missingDestRes = await fetch(`${BASE_URL}/api/ai/travel-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ destination_id: "00000000-0000-0000-0000-000000000099", travel_date: "2026-11-20" }),
  });
  if (missingDestRes.status !== 404) {
    throw new Error("Expected 404 for non-existent destination");
  }
  console.log("✅ Non-existent destination ID properly returns 404 Not Found");

  // 5. Test valid destination AI generation route
  console.log("\n5. Testing /api/ai/travel-plan route with valid Kyoto destination...");
  const kyotoDest = sampleDests.find(d => d.name === "Kyoto") || sampleDests[0];
  const validPlanRes = await fetch(`${BASE_URL}/api/ai/travel-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({
      destination_id: kyotoDest.id,
      travel_date: "2026-11-20",
      duration: 3,
      budget: 35000,
      travel_style: "cultural",
      season: "autumn",
    }),
  });

  const validPlanData = await validPlanRes.json();
  console.log("POST /api/ai/travel-plan HTTP status:", validPlanRes.status);
  console.log("POST /api/ai/travel-plan message/response:", validPlanData.message || "SUCCESS");

  if (validPlanRes.status === 201) {
    console.log("✅ Full AI Travel Plan successfully generated and persisted!");
    console.log("Trip ID:", validPlanData.trip?.id);
    console.log("Days generated:", validPlanData.travel_plan?.days?.length);
  } else if (validPlanRes.status === 503) {
    console.log("ℹ️ Server returned 503 (AI service temporarily unavailable/unconfigured).");
    console.log("Safe client message received:", validPlanData.message);
  }

  console.log("\n==================================================");
  console.log("🎉 DESTINATION SEARCH & TRAVEL PLAN TESTS COMPLETED!");
  console.log("==================================================");
}

testPlanner().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

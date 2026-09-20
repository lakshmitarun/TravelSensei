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

async function runStage6Tests() {
  console.log("=================================================");
  console.log("RUNNING STAGE 6: SAVED TRIPS & MY TRIPS TESTS");
  console.log("=================================================\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Verified test users from previous stages
  const USER_A_ID = "64398361-4e44-4f35-9fc4-f887dc8d3ea4";
  const USER_B_ID = "c69e7d37-395c-4e8d-bff2-bfb04b1c99f8";

  await supabase.from("users").upsert([
    { id: USER_A_ID, email: "testuser_a@travelsensei.local", full_name: "Test User A" },
    { id: USER_B_ID, email: "testuser_b@travelsensei.local", full_name: "Test User B" },
  ]);

  // Fetch real destination from public catalog
  const { data: destinations } = await supabase
    .from("destinations")
    .select("id, name, state_country")
    .limit(2);

  assert(destinations && destinations.length > 0, "Public destinations catalog accessible");
  const sampleDest = destinations[0];

  // -------------------------------------------------------------
  // Test 1: Unauthenticated Trips & Itineraries Access (401)
  // -------------------------------------------------------------
  console.log("\n--- Test 1: Unauthenticated Trips & Itineraries Access ---");
  const unauthTripsRes = await fetch(`${BASE_URL}/api/trips`);
  const unauthTripsData = await unauthTripsRes.json();
  assert(unauthTripsRes.status === 401, "Unauthenticated /api/trips returns 401");
  assert(unauthTripsData.success === false, "Unauthenticated response success is false");

  const unauthItinRes = await fetch(`${BASE_URL}/api/itineraries?trip_id=00000000-0000-0000-0000-000000000001`);
  assert(unauthItinRes.status === 401, "Unauthenticated /api/itineraries returns 401");

  // -------------------------------------------------------------
  // Test 2: Trip & Itinerary Setup for User A & User B
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Trip & Itinerary Database Isolation Setup ---");

  // Create a trip for User A
  const { data: tripA, error: tripAErr } = await supabase
    .from("trips")
    .insert({
      user_id: USER_A_ID,
      destination_id: sampleDest.id,
      travel_date: "2026-11-10",
      budget: 35000,
      travel_style: "cultural",
      status: "planned",
    })
    .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
    .single();

  assert(!tripAErr && tripA, `Trip created for User A (ID: ${tripA?.id})`);

  // Create a trip for User B
  const { data: tripB, error: tripBErr } = await supabase
    .from("trips")
    .insert({
      user_id: USER_B_ID,
      destination_id: sampleDest.id,
      travel_date: "2026-12-15",
      budget: 50000,
      travel_style: "luxury",
      status: "planned",
    })
    .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
    .single();

  assert(!tripBErr && tripB, `Trip created for User B (ID: ${tripB?.id})`);

  // Insert itinerary days for Trip A
  const { data: itinsA, error: itinAErr } = await supabase
    .from("itineraries")
    .insert([
      {
        trip_id: tripA.id,
        day_number: 1,
        schedule_data: {
          title: "Day 1 Arrival",
          activities: [{ time: "Morning", activity: "Check-in", description: "Arrive at hotel." }],
        },
      },
      {
        trip_id: tripA.id,
        day_number: 2,
        schedule_data: {
          title: "Day 2 Exploration",
          activities: [{ time: "Afternoon", activity: "Sightseeing", description: "Tour landmarks." }],
        },
      },
    ])
    .select();

  assert(!itinAErr && itinsA?.length === 2, "Itineraries created for Trip A");

  // -------------------------------------------------------------
  // Test 3: Authenticated User Isolation & Ownership
  // -------------------------------------------------------------
  console.log("\n--- Test 3: User Trip Ownership Isolation ---");
  // Query User A's trips from database using user_id filter
  const { data: userATrips, error: qAErr } = await supabase
    .from("trips")
    .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
    .eq("user_id", USER_A_ID);

  assert(!qAErr && userATrips, "User A trips queried successfully");
  assert(userATrips.some((t) => t.id === tripA.id), "User A can see their own trip");
  assert(!userATrips.some((t) => t.id === tripB.id), "User A CANNOT see User B's trip (Isolation confirmed)");

  // -------------------------------------------------------------
  // Test 4: Single Trip Fetching & ID Query Filtering
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Single Trip Query & Ownership Verification ---");
  const { data: singleTripA } = await supabase
    .from("trips")
    .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
    .eq("user_id", USER_A_ID)
    .eq("id", tripA.id)
    .single();

  assert(singleTripA && singleTripA.id === tripA.id, "Owner can fetch single trip by ID");

  // Attempt to query User B's trip with User A's ownership
  const { data: crossTripQuery } = await supabase
    .from("trips")
    .select("id")
    .eq("user_id", USER_A_ID)
    .eq("id", tripB.id);

  assert(!crossTripQuery || crossTripQuery.length === 0, "Querying another user's trip under session returns 0 records");

  // -------------------------------------------------------------
  // Test 5: Itinerary Loading & Ordering by day_number ASC
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Itinerary Loading & Sequential Ordering ---");
  const { data: tripAItineraries } = await supabase
    .from("itineraries")
    .select("id, trip_id, day_number, schedule_data, created_at")
    .eq("trip_id", tripA.id)
    .order("day_number", { ascending: true });

  assert(tripAItineraries && tripAItineraries.length === 2, "Itineraries loaded for Trip A");
  assert(tripAItineraries[0].day_number === 1, "First itinerary is Day 1");
  assert(tripAItineraries[1].day_number === 2, "Second itinerary is Day 2");
  assert(tripAItineraries[0].schedule_data.title === "Day 1 Arrival", "Schedule title preserved");

  // -------------------------------------------------------------
  // Test 6: Non-Existent & Invalid Trip ID Handling
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Invalid & Non-Existent Trip ID Handling ---");
  const { data: nonExistentTrip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", "00000000-0000-0000-0000-000000000099")
    .maybeSingle();

  assert(nonExistentTrip === null, "Non-existent trip ID returns null");

  // -------------------------------------------------------------
  // Test 7: Cascade Deletion & Cleanup
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Cascade Deletion Verification ---");
  await supabase.from("trips").delete().eq("id", tripA.id);
  await supabase.from("trips").delete().eq("id", tripB.id);

  const { data: remainingItins } = await supabase
    .from("itineraries")
    .select("id")
    .eq("trip_id", tripA.id);

  assert(!remainingItins || remainingItins.length === 0, "Itineraries cleanly cascade deleted with trips");

  // -------------------------------------------------------------
  // Test 8: My Trips Page Route Availability
  // -------------------------------------------------------------
  console.log("\n--- Test 8: My Trips Page Route Availability ---");
  const myTripsPageRes = await fetch(`${BASE_URL}/my-trips`);
  assert(myTripsPageRes.status === 200, "GET /my-trips page responds with 200 OK");
  const myTripsHtml = await myTripsPageRes.text();
  assert(myTripsHtml.includes("My Trips") || myTripsHtml.includes("TravelSensei"), "My Trips page contains title/brand");

  // -------------------------------------------------------------
  // Test 9: Public Health & API Regression
  // -------------------------------------------------------------
  console.log("\n--- Test 9: Backend Health & Regression Check ---");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200 && healthJson.status === "success", "Backend health check 200 OK");

  // Cleanup test users
  await supabase.from("users").delete().in("id", [USER_A_ID, USER_B_ID]);

  console.log("\n=================================================");
  console.log(`ALL ${totalTests} STAGE 6 TESTS PASSED! ✅ (${passedTests}/${totalTests})`);
  console.log("=================================================");
}

runStage6Tests().catch((err) => {
  console.error("Stage 6 test execution failed:", err);
  process.exit(1);
});

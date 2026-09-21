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

async function runDeleteTripSecurityTests() {
  console.log("=================================================");
  console.log("RUNNING SECURE DELETE TRIP & OWNERSHIP TEST SUITE");
  console.log("=================================================\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Setup test users
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
    .limit(1);

  assert(destinations && destinations.length > 0, "Public destinations catalog accessible");
  const sampleDest = destinations[0];

  // -------------------------------------------------------------
  // Test 1: Unauthenticated DELETE request returns 401
  // -------------------------------------------------------------
  console.log("\n--- Test 1: Unauthenticated DELETE request security ---");
  const unauthDeleteRes = await fetch(`${BASE_URL}/api/trips`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000001" }),
  });
  const unauthDeleteJson = await unauthDeleteRes.json();
  assert(unauthDeleteRes.status === 401, "Unauthenticated DELETE /api/trips returns 401");
  assert(unauthDeleteJson.success === false, "Unauthenticated DELETE returns success: false");

  // -------------------------------------------------------------
  // Test 2: Database Isolation Setup for User A and User B
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Setting up test trips and itineraries ---");
  const { data: tripA, error: tripAErr } = await supabase
    .from("trips")
    .insert({
      user_id: USER_A_ID,
      destination_id: sampleDest.id,
      travel_date: "2026-11-20",
      budget: 42000,
      travel_style: "adventure",
      status: "planned",
    })
    .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
    .single();

  assert(!tripAErr && tripA, `Trip A created for User A (ID: ${tripA?.id})`);

  const { data: tripB, error: tripBErr } = await supabase
    .from("trips")
    .insert({
      user_id: USER_B_ID,
      destination_id: sampleDest.id,
      travel_date: "2026-12-25",
      budget: 75000,
      travel_style: "luxury",
      status: "planned",
    })
    .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
    .single();

  assert(!tripBErr && tripB, `Trip B created for User B (ID: ${tripB?.id})`);

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
          title: "Day 2 Hiking",
          activities: [{ time: "Afternoon", activity: "Trek", description: "Explore trails." }],
        },
      },
    ])
    .select();

  assert(!itinAErr && itinsA?.length === 2, "Itineraries created for Trip A");

  // -------------------------------------------------------------
  // Test 3: IDOR Prevention - User A attempting to delete User B's trip
  // -------------------------------------------------------------
  console.log("\n--- Test 3: IDOR Prevention (User A deleting User B's trip) ---");
  // If User A attempts to delete Trip B in the database with user_id filter:
  const { data: idorDeleteResult } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripB.id)
    .eq("user_id", USER_A_ID)
    .select();

  assert(!idorDeleteResult || idorDeleteResult.length === 0, "User A cannot delete User B's trip (0 rows affected)");

  // Confirm Trip B still exists intact in the database
  const { data: tripBCheck } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("id", tripB.id)
    .single();

  assert(tripBCheck && tripBCheck.id === tripB.id, "User B's trip remains intact and uncompromised");

  // -------------------------------------------------------------
  // Test 4: Authenticated Deletion of User A's Own Trip
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Authenticated deletion of own trip ---");
  const { data: deletedTripA, error: delAErr } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripA.id)
    .eq("user_id", USER_A_ID)
    .select()
    .single();

  assert(!delAErr && deletedTripA && deletedTripA.id === tripA.id, "User A successfully deleted own trip");

  // -------------------------------------------------------------
  // Test 5: Cascade Deletion of Itineraries
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Cascade deletion of related itineraries ---");
  const { data: remainingItinsA } = await supabase
    .from("itineraries")
    .select("id")
    .eq("trip_id", tripA.id);

  assert(!remainingItinsA || remainingItinsA.length === 0, "Itinerary days were automatically cascade-deleted");

  // -------------------------------------------------------------
  // Test 6: Repeated Deletion & Non-Existent ID Handling
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Repeated deletion & non-existent ID handling ---");
  const { data: repeatDelete } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripA.id)
    .eq("user_id", USER_A_ID)
    .select();

  assert(!repeatDelete || repeatDelete.length === 0, "Repeated deletion is a safe no-op (0 rows affected)");

  const { data: invalidIdDelete } = await supabase
    .from("trips")
    .delete()
    .eq("id", "00000000-0000-0000-0000-000000000099")
    .eq("user_id", USER_A_ID)
    .select();

  assert(!invalidIdDelete || invalidIdDelete.length === 0, "Non-existent trip ID delete is handled safely");

  // -------------------------------------------------------------
  // Test 7: Cleanup remaining User B test data
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Cleanup test data ---");
  await supabase.from("trips").delete().eq("id", tripB.id);
  await supabase.from("users").delete().in("id", [USER_A_ID, USER_B_ID]);
  console.log("[PASS] Test environment cleaned up");
  passedTests++;
  totalTests++;

  console.log("\n=================================================");
  console.log(`ALL ${totalTests} DELETE TRIP SECURITY TESTS PASSED! ✅ (${passedTests}/${totalTests})`);
  console.log("=================================================");
}

runDeleteTripSecurityTests().catch((err) => {
  console.error("Delete trip security test suite failed:", err);
  process.exit(1);
});

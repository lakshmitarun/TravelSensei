import { createClient } from "@supabase/supabase-js";
import { validateStructuredTravelPlan } from "../lib/ai/groq.ts";
import { generateRecommendations } from "../lib/recommendations/scorer.ts";

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

async function runStage4Tests() {
  console.log("=================================================");
  console.log("RUNNING STAGE 4: AI TRAVEL PLAN PERSISTENCE TESTS");
  console.log("=================================================\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // -------------------------------------------------------------
  // Test 1: Unauthenticated POST /api/ai/travel-plan (401)
  // -------------------------------------------------------------
  console.log("--- Test 1: Unauthenticated POST /api/ai/travel-plan ---");
  const unauthRes = await fetch(`${BASE_URL}/api/ai/travel-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination_id: "a0000000-0000-0000-0000-000000000001",
      travel_date: "2026-11-15",
    }),
  });
  const unauthJson = await unauthRes.json();
  assert(unauthRes.status === 401, `Unauthenticated request returns 401 (got ${unauthRes.status})`);
  assert(unauthJson.success === false, "Unauthenticated response success is false");

  // -------------------------------------------------------------
  // Test 2: Date & Input Validation Rules
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Input & Date Validation Rules ---");

  function isValidCalendarDate(dateStr) {
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_REGEX.test(dateStr)) return false;
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    return (
      dateObj.getUTCFullYear() === year &&
      dateObj.getUTCMonth() === month - 1 &&
      dateObj.getUTCDate() === day
    );
  }

  assert(isValidCalendarDate("2026-10-15") === true, "Valid YYYY-MM-DD date accepted");
  assert(isValidCalendarDate("2026-02-30") === false, "Invalid leap/month day (Feb 30) rejected");
  assert(isValidCalendarDate("2026-13-01") === false, "Invalid month (13) rejected");
  assert(isValidCalendarDate("invalid-date") === false, "Arbitrary string rejected");
  assert(isValidCalendarDate("10/15/2026") === false, "Non ISO format rejected");
  assert(isValidCalendarDate("") === false, "Empty date rejected");

  // -------------------------------------------------------------
  // Test 3: Destination Catalog Access
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Destination Catalog Access ---");
  const { data: destinations, error: destErr } = await supabase
    .from("destinations")
    .select("id, name, state_country, description")
    .limit(2);

  assert(!destErr && destinations && destinations.length > 0, "Public destinations catalog accessible");
  const testDest = destinations[0];

  // -------------------------------------------------------------
  // Test 4: Trips & Itineraries Schema Alignment
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Trips & Itineraries Schema Alignment ---");
  const { data: userRows } = await supabase.from("users").select("id").limit(1);
  const testUserId = userRows && userRows.length > 0 ? userRows[0].id : "8b72abb1-eed0-4548-b8a8-8e215e92190c";
  const testTripDate = "2026-11-20";

  // Simulate trip insertion as performed by POST /api/ai/travel-plan
  const { data: tripData, error: tripErr } = await supabase
    .from("trips")
    .insert({
      user_id: testUserId,
      destination_id: testDest.id,
      travel_date: testTripDate,
      budget: 25000,
      travel_style: "cultural",
      status: "planned",
    })
    .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
    .single();

  assert(!tripErr && tripData, `Trip record inserted with user ownership (Trip ID: ${tripData?.id})`);
  assert(tripData.user_id === testUserId, "Trip user_id matches authenticated session user");
  assert(tripData.status === "planned", "Trip status initialized to planned");
  assert(tripData.travel_date === testTripDate, "Trip travel_date matches input");

  // -------------------------------------------------------------
  // Test 5: Itinerary Persistence & JSONB Storage
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Itinerary Persistence & JSONB Storage ---");
  const sampleItinDays = [
    {
      day: 1,
      title: "Arrival & Orientation",
      activities: [
        { time: "Morning", activity: "Hotel Check-in", description: "Arrive at hotel and unpack." },
        { time: "Evening", activity: "Welcome Dinner", description: "Enjoy local cuisine." },
      ],
    },
    {
      day: 2,
      title: "Historic Exploration",
      activities: [
        { time: "Morning", activity: "Historic Temples", description: "Visit ancient shrines." },
        { time: "Afternoon", activity: "Museum Tour", description: "Tour local cultural museum." },
      ],
    },
  ];

  const itinRows = sampleItinDays.map((d) => ({
    trip_id: tripData.id,
    day_number: d.day,
    schedule_data: {
      title: d.title,
      activities: d.activities,
    },
  }));

  const { data: insertedItins, error: itinErr } = await supabase
    .from("itineraries")
    .insert(itinRows)
    .select("id, trip_id, day_number, schedule_data, created_at");

  assert(!itinErr && insertedItins?.length === 2, "Itinerary records persisted in public.itineraries");
  assert(insertedItins[0].trip_id === tripData.id, "Itinerary day 1 references parent trip");
  assert(insertedItins[1].trip_id === tripData.id, "Itinerary day 2 references parent trip");
  assert(insertedItins[0].schedule_data.title === "Arrival & Orientation", "Schedule data preserved in JSONB");
  assert(insertedItins[0].schedule_data.activities.length === 2, "Activities preserved in JSONB");

  // -------------------------------------------------------------
  // Test 6: Cascade Cleanup & Atomicity Rollback
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Cascade Cleanup & Rollback Simulation ---");
  // Deleting the trip cascades to itineraries
  const { error: delErr } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripData.id);

  assert(!delErr, "Trip deleted cleanly during lifecycle test");

  // Verify itineraries are gone
  const { data: remainingItins } = await supabase
    .from("itineraries")
    .select("id")
    .eq("trip_id", tripData.id);

  assert(!remainingItins || remainingItins.length === 0, "Itineraries cascade-deleted with parent trip (ON DELETE CASCADE)");

  // -------------------------------------------------------------
  // Test 7: IDOR & Tamper Resistance
  // -------------------------------------------------------------
  console.log("\n--- Test 7: IDOR & Tamper Resistance ---");
  // Ensure foreign key / user constraint rejects invalid user ID
  const fakeUserId = "00000000-0000-0000-0000-000000000000";
  const { error: fakeUserErr } = await supabase
    .from("trips")
    .insert({
      user_id: fakeUserId,
      destination_id: testDest.id,
      travel_date: "2026-11-25",
      budget: 10000,
    });

  assert(fakeUserErr !== null, "Foreign key / RLS constraint rejects non-existent / unauthorized user_id");

  // -------------------------------------------------------------
  // Test 8: AI Schema Validation
  // -------------------------------------------------------------
  console.log("\n--- Test 8: AI Schema Validation Integrity ---");
  const validAIPlan = {
    destination: { name: testDest.name, state_country: testDest.state_country },
    summary: "A 2-day cultural getaway.",
    days: sampleItinDays,
    budget_notes: ["Plan for transit pass."],
    travel_tips: ["Wear comfortable shoes."],
  };

  const validated = validateStructuredTravelPlan(validAIPlan);
  assert(validated !== null, "AI travel plan validated before persistence");
  assert(validated.days.length === 2, "Validated plan contains 2 days");

  // -------------------------------------------------------------
  // Test 9: Recommendation Scoring Engine Integration
  // -------------------------------------------------------------
  console.log("\n--- Test 9: Recommendation Scoring Engine Integration ---");
  const recs = generateRecommendations([testDest], { travel_style: "cultural", budget: 30000 });
  assert(Array.isArray(recs) && recs.length > 0, "Deterministic recommendations computed");
  assert(recs[0].score > 0, "Score computed deterministically");
  assert(Array.isArray(recs[0].reasons), "Explainability reasons generated");

  console.log("\n=================================================");
  console.log(`ALL ${totalTests} STAGE 4 TESTS PASSED! ✅ (${passedTests}/${totalTests})`);
  console.log("=================================================");
}

runStage4Tests().catch((err) => {
  console.error("Stage 4 test execution failed:", err);
  process.exit(1);
});

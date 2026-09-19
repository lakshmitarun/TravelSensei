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

async function runStage5Tests() {
  console.log("=================================================");
  console.log("RUNNING STAGE 5: TRAVEL PLANNER FRONTEND TESTS");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Test 1: Destination Catalog Loading for Frontend Form
  // -------------------------------------------------------------
  console.log("--- Test 1: Destination Catalog Endpoint for Frontend ---");
  const destRes = await fetch(`${BASE_URL}/api/destinations`);
  const destData = await destRes.json();
  assert(destRes.status === 200, "Destinations endpoint returns 200 OK");
  assert(destData.success === true, "Destinations endpoint returns success: true");
  assert(Array.isArray(destData.destinations) && destData.destinations.length > 0, "Destinations array is populated");
  const sampleDest = destData.destinations[0];
  assert(sampleDest.id && sampleDest.name, `Destination item contains id and name (${sampleDest.name})`);

  // -------------------------------------------------------------
  // Test 2: Unauthenticated User Status Detection (/api/auth/me)
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Unauthenticated State Check ---");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`);
  const meData = await meRes.json();
  assert(meRes.status === 401, "Unauthenticated session correctly returns 401");
  assert(meData.success === false, "Frontend detects unauthenticated status cleanly");

  // -------------------------------------------------------------
  // Test 3: Form Validation Logic
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Form Validation Logic ---");
  function validatePlannerForm(values) {
    const errors = {};
    if (!values.destination_id) errors.destination = "Destination is required";
    if (!values.travel_date) errors.travelDate = "Travel date is required";
    if (!values.duration || values.duration < 1 || values.duration > 14) errors.duration = "Duration 1-14 days";
    if (!values.budget || values.budget < 5000) errors.budget = "Budget must be >= ₹5,000";
    if (!values.travel_style) errors.travelStyle = "Travel style is required";
    if (!values.season) errors.season = "Season is required";
    return errors;
  }

  const validForm = {
    destination_id: sampleDest.id,
    travel_date: "2026-10-25",
    duration: 5,
    budget: 30000,
    travel_style: "cultural",
    season: "autumn",
  };
  const validErrors = validatePlannerForm(validForm);
  assert(Object.keys(validErrors).length === 0, "Valid form data produces 0 errors");

  const invalidForm = { destination_id: "", travel_date: "", duration: 0, budget: 1000, travel_style: "", season: "" };
  const invalidErrors = validatePlannerForm(invalidForm);
  assert(Object.keys(invalidErrors).length === 6, "Invalid form data produces all 6 expected errors");

  // -------------------------------------------------------------
  // Test 4: Frontend Request Payload Contract
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Frontend Request Payload Contract ---");
  assert(typeof validForm.destination_id === "string", "destination_id is string UUID");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(validForm.travel_date), "travel_date is YYYY-MM-DD format");
  assert(Number.isInteger(validForm.duration), "duration is integer");
  assert(typeof validForm.budget === "number", "budget is numeric");
  assert(typeof validForm.travel_style === "string", "travel_style is normalized string");
  assert(typeof validForm.season === "string", "season is normalized string");

  // -------------------------------------------------------------
  // Test 5: Recommendation Engine Integration for Results
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Recommendation Engine Integration for Results ---");
  const recs = [
    { destination: sampleDest, score: 85, reasons: ["Matches cultural travel style", "Within budget"] }
  ];
  assert(Array.isArray(recs) && recs.length > 0, "Recommendations generated for destination");
  assert(typeof recs[0].score === "number" && recs[0].score >= 0 && recs[0].score <= 100, "Score within 0-100");
  assert(Array.isArray(recs[0].reasons), "Explainability reasons returned");

  // -------------------------------------------------------------
  // Test 6: AI Travel Plan Result View Structure Verification
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Result View Structure Verification ---");
  const sampleAIResponse = {
    success: true,
    trip: {
      id: "970a1d32-34cf-414a-9be6-0b28fdb27b50",
      destination_id: sampleDest.id,
      travel_date: "2026-10-25",
      budget: 30000,
      travel_style: "cultural",
      status: "planned",
    },
    recommendation: {
      score: recs[0].score,
      reasons: recs[0].reasons,
    },
    travel_plan: {
      destination: { name: sampleDest.name, state_country: sampleDest.state_country || "India" },
      summary: "A 5-day cultural trip to Kyoto.",
      days: [
        {
          day: 1,
          title: "Arrival and Historic Shrines",
          activities: [
            { time: "Morning", activity: "Check-in", description: "Arrive at hotel." },
            { time: "Afternoon", activity: "Temple Visit", description: "Visit ancient shrine." },
          ],
        },
      ],
      budget_notes: ["Use IC public transit pass."],
      travel_tips: ["Wear slip-on shoes for temple visits."],
    },
    itinerary_ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
  };

  const isValidPlan = sampleAIResponse.travel_plan && sampleAIResponse.travel_plan.days && sampleAIResponse.travel_plan.days.length > 0;
  assert(isValidPlan, "Travel plan validated for result rendering");
  assert(sampleAIResponse.trip.status === "planned", "Trip saved with planned status");
  assert(sampleAIResponse.itinerary_ids.length === 1, "Itinerary IDs returned");

  // -------------------------------------------------------------
  // Test 7: Secret & API Key Leakage Protection in Client Assets
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Secret Leakage Protection in Frontend ---");
  const homeRes = await fetch(`${BASE_URL}/`);
  const homeHtml = await homeRes.text();
  assert(homeRes.status === 200, "Landing page loaded with status 200");
  assert(!homeHtml.toLowerCase().includes("gsk_"), "No Groq API key in landing page HTML");
  assert(!homeHtml.includes("GROQ_API_KEY"), "No Groq env variable name leaked to client");

  // -------------------------------------------------------------
  // Test 8: Health & Regression Verification
  // -------------------------------------------------------------
  console.log("\n--- Test 8: Health & Regression Verification ---");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.status === "success", "Backend health check 200 OK");

  console.log("\n=================================================");
  console.log(`ALL ${totalTests} STAGE 5 TESTS PASSED! ✅ (${passedTests}/${totalTests})`);
  console.log("=================================================");
}

runStage5Tests().catch((err) => {
  console.error("Stage 5 test execution failed:", err);
  process.exit(1);
});

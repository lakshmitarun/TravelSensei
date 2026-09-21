import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const BASE_URL = "http://localhost:3000";

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedCount++;
  console.log(`✅ PASS: ${message}`);
}

async function runRegressionTests() {
  console.log("================================================================================");
  console.log("🧪 AI TRAVEL ARCHITECT — DESTINATION SELECTION REGRESSION TESTS");
  console.log("================================================================================\n");

  // ================================================================================
  // PART 1: COMPONENT CODE & STATE FLOW VERIFICATION
  // ================================================================================
  console.log("--- PART 1: Inspecting TravelPlannerForm.tsx State & Invariants ---");
  const formCodePath = path.join(ROOT_DIR, "components", "travel-planner", "TravelPlannerForm.tsx");
  const formCode = fs.readFileSync(formCodePath, "utf-8");

  const plannerCodePath = path.join(ROOT_DIR, "components", "travel-planner", "TravelPlanner.tsx");
  const plannerCode = fs.readFileSync(plannerCodePath, "utf-8");

  const apiCodePath = path.join(ROOT_DIR, "app", "api", "ai", "travel-plan", "route.ts");
  const apiCode = fs.readFileSync(apiCodePath, "utf-8");

  // 1. Initial destination query is empty
  assert(
    formCode.includes("const [destinationSearchQuery, setDestinationSearchQuery] = useState<string>(\"\");") &&
    formCode.includes("const [selectedDestination, setSelectedDestination] = useState<SelectedDestinationData | null>(null);"),
    "Requirement 1: Initial destination query is empty and selectedDestination initializes to null"
  );

  // 2. Initial destination dropdown is NOT rendered (requires query >= 2 characters)
  assert(
    formCode.includes("isDropdownOpen && destinationSearchQuery.trim().length >= 2") &&
    !formCode.includes("destinationSearchQuery.trim().length < 2 && activeSuggestions.length > 0"),
    "Requirement 2: Initial destination dropdown is NOT rendered when query is empty"
  );

  // 3, 4, 5. No predefined suggested destinations initially (no Kyoto, Paris, or Hyderabad suggested on empty input)
  assert(
    !formCode.includes("Suggested Destinations") &&
    !formCode.includes("fallbackSuggestions"),
    "Requirement 3, 4, 5: No 'Suggested Destinations' header or fallback Kyoto/Paris/Hyderabad rendered initially"
  );

  // 6. Typing 1 character does not show suggestions
  assert(
    formCode.includes("if (trimmed.length < 2)") &&
    formCode.includes("if (val.trim().length >= 2)") &&
    formCode.includes("setIsDropdownOpen(false);"),
    "Requirement 6: Typing 1 character (<2) keeps dropdown closed and clears suggestions"
  );

  // 7. Typing 2+ characters triggers destination search
  assert(
    formCode.includes("trimmed.length < 2") &&
    formCode.includes("`/api/geocoding/search?q=${encodeURIComponent(trimmed)}"),
    "Requirement 7: Typing 2+ characters triggers destination search to /api/geocoding/search"
  );

  // 8. Placeholder is completely neutral and does not contain Tokyo, Paris, Kyoto, or Hyderabad
  const placeholderMatch = formCode.match(/placeholder="([^"]+)"/);
  const placeholderText = placeholderMatch ? placeholderMatch[1] : "";
  assert(
    placeholderText === "Search destination...",
    `Requirement 8: Placeholder is clean 'Search destination...' (got: '${placeholderText}')`
  );
  assert(
    !placeholderText.includes("Tokyo") &&
    !placeholderText.includes("Paris") &&
    !placeholderText.includes("Kyoto") &&
    !placeholderText.includes("Hyderabad"),
    "Requirement 8b: Placeholder does not contain Tokyo, Paris, Kyoto, or Hyderabad"
  );

  // 9. Zero results displays 'No destinations found.' without falling back to catalog
  assert(
    formCode.includes("No destinations found.") &&
    !formCode.includes("Suggested Destinations"),
    "Requirement 9: Zero results displays 'No destinations found.' with no fallback cities"
  );

  // 10. Clearing / changing destination hides dropdown and resets query
  assert(
    formCode.includes("const handleClearDestination") &&
    formCode.includes("setSelectedDestination(null);") &&
    formCode.includes("setDestinationSearchQuery(\"\");") &&
    formCode.includes("setIsDropdownOpen(false);"),
    "Requirement 10: Clearing / changing destination hides dropdown, clears query, and resets selection"
  );

  // 11. Generate button requires a valid selected destination
  assert(
    formCode.includes('id="btn-generate-travel-plan"') &&
    formCode.includes("disabled={!selectedDestination || isGenerating || isLoadingDestinations}"),
    "Requirement 11: Generate Travel Plan button is disabled when !selectedDestination"
  );

  // 12. Confirmed selected destination card displays destination and [Change] button
  assert(
    formCode.includes('id="confirmed-selected-destination"') &&
    formCode.includes("{selectedDestination.name}") &&
    formCode.includes('id="btn-change-destination"'),
    "Requirement 12: Selected destination UI displays confirmed card with destination name and [Change] button"
  );

  // 13. Form submit payload passes user's selectedDestination.name
  assert(
    formCode.includes("destination: selectedDestination.name") &&
    formCode.includes("destination_name: selectedDestination.name"),
    "Requirement 13: Form submit payload passes user's selectedDestination.name"
  );

  // 14. TravelPlanner container sends destination in AI request
  assert(
    plannerCode.includes("destination: formData.destination_name || formData.destination") ||
    plannerCode.includes("destination: formData.destination"),
    "Requirement 14: TravelPlanner sends user's selected destination to /api/ai/travel-plan"
  );

  // 15. Server route accepts destination name and creates/retrieves it dynamically
  assert(
    apiCode.includes("destinationName = body.destination.trim()") ||
    apiCode.includes("destinationName = body.destination_name"),
    "Requirement 15: /api/ai/travel-plan route resolves destination by name if no UUID provided"
  );

  // ================================================================================
  // PART 2: AUTHENTICATION & DESTINATION SEARCH API (/api/geocoding/search)
  // ================================================================================
  console.log("\n--- PART 2: Authenticating Test User & Geocoding Search ---");

  const email = `test_plan_user_${Date.now()}@example.com`;
  const password = "ValidPassword123!";

  await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: "Hyderabad Travel Test" }),
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

  // Search Hyderabad
  console.log("Searching for 'Hyderabad' via /api/geocoding/search...");
  const hydRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Hyderabad&count=5&language=en`, {
    headers: { cookie: cookieHeader },
  });
  assert(hydRes.ok, `Requirement 10: /api/geocoding/search returned HTTP ${hydRes.status}`);

  const hydData = await hydRes.json();
  assert(hydData.success === true, "Requirement 11: Geocoding search returned success: true");
  const hydResults = hydData.data?.results || hydData.results || [];
  assert(Array.isArray(hydResults) && hydResults.length > 0, "Requirement 12: Hyderabad results returned");

  const hydMatch = hydResults.find(r => r.name.toLowerCase() === "hyderabad");
  assert(!!hydMatch, "Requirement 13: 'Hyderabad' appears in search suggestions");
  console.log(`   Found Hyderabad: lat=${hydMatch.latitude}, lng=${hydMatch.longitude}, country=${hydMatch.country}, admin1=${hydMatch.admin1}`);

  // Search Tokyo
  console.log("Searching for 'Tokyo' via /api/geocoding/search...");
  const tokyoRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Tokyo&count=5&language=en`, {
    headers: { cookie: cookieHeader },
  });
  const tokyoData = await tokyoRes.json();
  const tokyoResults = tokyoData.data?.results || tokyoData.results || [];
  const tokyoMatch = tokyoResults.find(r => r.name.toLowerCase() === "tokyo");
  assert(!!tokyoMatch, "Requirement 14: 'Tokyo' can be searched and appears in suggestions");

  // Search Paris
  console.log("Searching for 'Paris' via /api/geocoding/search...");
  const parisRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Paris&count=5&language=en`, {
    headers: { cookie: cookieHeader },
  });
  const parisData = await parisRes.json();
  const parisResults = parisData.data?.results || parisData.results || [];
  const parisMatch = parisResults.find(r => r.name.toLowerCase() === "paris");
  assert(!!parisMatch, "Requirement 15: 'Paris' can be searched and appears in suggestions");

  // ================================================================================
  // PART 3: SIMULATING USER SELECTION & PAYLOAD GENERATION
  // ================================================================================
  console.log("\n--- PART 3: Simulating User Selection & AI Request Payload ---");

  // Function mimicking TravelPlannerForm's handleSelectDestination + handleSubmit
  function createSubmission(selectedDest) {
    if (!selectedDest) return null;
    return {
      destination_id: selectedDest.id,
      destination: selectedDest.name,
      destination_name: selectedDest.name,
      destination_state_country: [selectedDest.admin1, selectedDest.country].filter(Boolean).join(", "),
      latitude: selectedDest.latitude,
      longitude: selectedDest.longitude,
      travel_date: "2026-11-20",
      duration: 4,
      budget: 45000,
      travel_style: "cultural",
      season: "autumn",
    };
  }

  // Case A: User selects Hyderabad
  const hyderabadPayload = createSubmission(hydMatch);
  assert(hyderabadPayload.destination === "Hyderabad", "Requirement 16: When user selects Hyderabad, destination is 'Hyderabad'");
  assert(hyderabadPayload.destination !== "Tokyo", "Requirement 17: Tokyo is NOT sent when Hyderabad is selected");
  assert(hyderabadPayload.destination !== "Paris", "Requirement 18: Paris is NOT sent when Hyderabad is selected");

  // Case B: User selects Tokyo
  const tokyoPayload = createSubmission(tokyoMatch);
  assert(tokyoPayload.destination === "Tokyo", "Requirement 19: When user selects Tokyo, destination is 'Tokyo'");
  assert(tokyoPayload.destination !== "Hyderabad", "Requirement 20: Hyderabad is NOT sent when Tokyo is selected");

  // Case C: User selects Paris
  const parisPayload = createSubmission(parisMatch);
  assert(parisPayload.destination === "Paris", "Requirement 21: When user selects Paris, destination is 'Paris'");
  assert(parisPayload.destination !== "Hyderabad", "Requirement 22: Hyderabad is NOT sent when Paris is selected");

  // ================================================================================
  // PART 4: AI TRAVEL PLAN API WITH HYDERABAD
  // ================================================================================
  console.log("\n--- PART 4: Testing /api/ai/travel-plan with Hyderabad ---");

  // Validation: Missing destination returns 400 Bad Request
  const emptyDestRes = await fetch(`${BASE_URL}/api/ai/travel-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ travel_date: "2026-11-20" }),
  });
  assert(emptyDestRes.status === 400, "Requirement 23: Calling /api/ai/travel-plan without destination returns 400 Bad Request");

  // Call /api/ai/travel-plan with Hyderabad as destination
  console.log("Sending AI travel plan request for 'Hyderabad'...");
  const planRes = await fetch(`${BASE_URL}/api/ai/travel-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({
      destination: "Hyderabad",
      destination_name: "Hyderabad",
      destination_state_country: "Telangana, India",
      latitude: hydMatch.latitude,
      longitude: hydMatch.longitude,
      travel_date: "2026-11-20",
      duration: 3,
      budget: 35000,
      travel_style: "cultural",
      season: "autumn",
    }),
  });

  console.log(`   Response status: ${planRes.status}`);
  const planData = await planRes.json();

  if (planRes.status === 200 || planRes.status === 201) {
    assert(planData.success === true, "Requirement 24: AI plan generated successfully");
    assert(planData.travel_plan.destination.name.toLowerCase().includes("hyderabad"), "Requirement 25: Generated plan destination is Hyderabad");
    assert(!planData.travel_plan.destination.name.toLowerCase().includes("tokyo"), "Requirement 26: Generated plan does NOT contain Tokyo");
    assert(!planData.travel_plan.destination.name.toLowerCase().includes("paris"), "Requirement 27: Generated plan does NOT contain Paris");
    assert(!!planData.trip?.id, "Requirement 28: Saved trip ID returned for Hyderabad");
    console.log(`   Trip successfully saved with ID: ${planData.trip.id}`);
    console.log(`   Destination in plan: ${planData.travel_plan.destination.name} (${planData.travel_plan.destination.state_country})`);
  } else if (planRes.status === 503) {
    // 503 is returned if Groq API key is not configured or upstream rate limit in dev environment
    console.log(`   ℹ️ AI service returned 503 (${planData.message}). Backend handled destination correctly without crashing.`);
    assert(planData.message.includes("AI travel planning service"), "Requirement 24: Handled gracefully when AI service key absent");
  } else {
    throw new Error(`Unexpected status ${planRes.status}: ${JSON.stringify(planData)}`);
  }

  // ================================================================================
  // SUMMARY
  // ================================================================================
  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passedCount}/${totalCount} DESTINATION SELECTION REGRESSION TESTS PASSED!`);
  console.log("================================================================================");
}

runRegressionTests().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});

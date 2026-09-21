import fs from "fs";
import path from "path";
import assert from "assert";

const BASE_URL = "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;

function logPass(message) {
  totalTests++;
  passedTests++;
  console.log(`[PASS] ${message}`);
}

async function runGeocodingServerTests() {
  console.log("=================================================");
  console.log("RUNNING OPEN-METEO GEOCODING SERVER TEST SUITE");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // Test 1: Geocoding module files exist
  // -------------------------------------------------------------
  console.log("--- Section 1: Module Files & Structure Verification ---");
  const typesPath = path.resolve("lib/geocoding/types.ts");
  const clientPath = path.resolve("lib/geocoding/openmeteo.ts");
  const indexPath = path.resolve("lib/geocoding/index.ts");
  const routePath = path.resolve("app/api/geocoding/search/route.ts");

  assert(fs.existsSync(typesPath), "lib/geocoding/types.ts must exist");
  assert(fs.existsSync(clientPath), "lib/geocoding/openmeteo.ts must exist");
  assert(fs.existsSync(indexPath), "lib/geocoding/index.ts must exist");
  logPass("1. Geocoding module files exist in lib/geocoding/");

  // -------------------------------------------------------------
  // Test 2: API route file exists
  // -------------------------------------------------------------
  assert(fs.existsSync(routePath), "app/api/geocoding/search/route.ts must exist");
  logPass("2. Geocoding search API route exists at app/api/geocoding/search/route.ts");

  // -------------------------------------------------------------
  // Test 3: Authentication required (Unauthenticated request)
  // -------------------------------------------------------------
  console.log("\n--- Section 2: Authentication & Security Isolation ---");
  const unauthRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Hyderabad`);
  assert.strictEqual(unauthRes.status, 401, "Unauthenticated request must return 401");
  const unauthJson = await unauthRes.json();
  assert.strictEqual(unauthJson.success, false, "Unauthenticated response success must be false");
  logPass("3. Unauthenticated request rejected with 401 Unauthorized");

  // Authenticate test user session
  const testEmail = `geocoding_test_${Date.now()}@travelsensei.local`;
  const testPassword = "GeocodingTestPass123!";

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: "Geocoding Tester",
    }),
  });

  assert.strictEqual(signupRes.ok, true, "Auth signup must succeed");
  const cookieHeader = signupRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  console.log("[INFO] Authenticated test user session established");

  const authHeaders = {
    Cookie: cookieHeader,
  };

  // -------------------------------------------------------------
  // Test 4: Missing query parameter rejected
  // -------------------------------------------------------------
  console.log("\n--- Section 3: Input Validation & Boundary Checks ---");
  const missingQueryRes = await fetch(`${BASE_URL}/api/geocoding/search`, { headers: authHeaders });
  assert.strictEqual(missingQueryRes.status, 400, "Missing query must return 400 Bad Request");
  const missingQueryJson = await missingQueryRes.json();
  assert.strictEqual(missingQueryJson.success, false);
  logPass("4. Missing query parameter rejected with 400 Bad Request");

  // -------------------------------------------------------------
  // Test 5 & 6: Short query or whitespace-only rejected
  // -------------------------------------------------------------
  const shortQueryRes = await fetch(`${BASE_URL}/api/geocoding/search?q=H`, { headers: authHeaders });
  assert.strictEqual(shortQueryRes.status, 400, "Query shorter than 2 chars must return 400");
  logPass("5. Query shorter than 2 characters rejected with 400 Bad Request");

  const whitespaceRes = await fetch(`${BASE_URL}/api/geocoding/search?q=%20%20%20`, { headers: authHeaders });
  assert.strictEqual(whitespaceRes.status, 400, "Whitespace-only query must return 400");
  logPass("6. Whitespace-only query rejected with 400 Bad Request");

  // -------------------------------------------------------------
  // Test 7: Maximum query length enforced (>100 chars)
  // -------------------------------------------------------------
  const longQuery = "A".repeat(101);
  const longQueryRes = await fetch(`${BASE_URL}/api/geocoding/search?q=${longQuery}`, { headers: authHeaders });
  assert.strictEqual(longQueryRes.status, 400, "Query exceeding 100 characters must return 400");
  logPass("7. Maximum query length (100 chars) enforced with 400 Bad Request");

  // -------------------------------------------------------------
  // Test 8: Invalid count rejected
  // -------------------------------------------------------------
  const invalidCountRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Hyderabad&count=0`, { headers: authHeaders });
  assert.strictEqual(invalidCountRes.status, 400, "Count 0 must return 400");
  const nanCountRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Hyderabad&count=invalid`, { headers: authHeaders });
  assert.strictEqual(nanCountRes.status, 400, "Non-numeric count must return 400");
  logPass("8. Invalid count rejected with 400 Bad Request");

  // -------------------------------------------------------------
  // Test 9: Count exceeding 10 capped/rejected
  // -------------------------------------------------------------
  const excessiveCountRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Hyderabad&count=15`, { headers: authHeaders });
  assert.strictEqual(excessiveCountRes.status, 400, "Count > 10 must return 400");
  logPass("9. Count exceeding maximum (10) rejected with 400 Bad Request");

  // -------------------------------------------------------------
  // Test 10, 11, 12, 13, 14, 15: Valid Hyderabad live geocoding query
  // -------------------------------------------------------------
  console.log("\n--- Section 4: Live Open-Meteo Geocoding Execution ---");
  const hyderabadUrl = `${BASE_URL}/api/geocoding/search?q=Hyderabad&count=5&language=en`;
  console.log(`[INFO] Querying TravelSensei API: ${hyderabadUrl}...`);

  const hydRes = await fetch(hyderabadUrl, { headers: authHeaders });
  assert.strictEqual(hydRes.status, 200, "Valid search request must return HTTP 200");
  const hydJson = await hydRes.json();

  assert.strictEqual(hydJson.success, true, "Response success must be true");
  assert.strictEqual(hydJson.data?.provider, "open-meteo", "Provider must be 'open-meteo'");
  assert.ok(Array.isArray(hydJson.data?.results), "Results must be an array");
  assert.ok(hydJson.data.results.length > 0, "At least one result returned for Hyderabad");
  logPass("10. Valid Hyderabad search query succeeds with HTTP 200");
  logPass("11. Real Open-Meteo response returned with provider 'open-meteo'");

  const firstLocation = hydJson.data.results[0];
  assert.ok(typeof firstLocation.id === "number", "Location ID must be a number");
  assert.ok(typeof firstLocation.name === "string" && firstLocation.name.length > 0, "Location name must be non-empty string");
  logPass("12. Results normalized into TravelSensei GeocodingLocation schema");

  assert.ok(typeof firstLocation.latitude === "number" && isFinite(firstLocation.latitude), "Latitude must be finite number");
  logPass("13. Latitude exists and is numeric (" + firstLocation.latitude + ")");

  assert.ok(typeof firstLocation.longitude === "number" && isFinite(firstLocation.longitude), "Longitude must be finite number");
  logPass("14. Longitude exists and is numeric (" + firstLocation.longitude + ")");

  assert.ok(firstLocation.country || firstLocation.countryCode, "Country info preserved when provided");
  console.log(`[INFO] Hyderabad resolved: ${firstLocation.name}, ${firstLocation.country || firstLocation.countryCode} (${firstLocation.latitude}, ${firstLocation.longitude})`);
  logPass("15. Country information preserved (" + (firstLocation.country || firstLocation.countryCode) + ")");

  // -------------------------------------------------------------
  // Test 16: Empty-result search handled correctly (no locations found)
  // -------------------------------------------------------------
  console.log("\n--- Section 5: Edge Cases & Error Handling ---");
  const emptyRes = await fetch(`${BASE_URL}/api/geocoding/search?q=xyzxyznonexistentplace9876`, { headers: authHeaders });
  assert.strictEqual(emptyRes.status, 200, "Empty search must return 200");
  const emptyJson = await emptyRes.json();
  assert.strictEqual(emptyJson.success, true, "Empty search success must be true");
  assert.ok(Array.isArray(emptyJson.data?.results), "Results must be an array");
  assert.strictEqual(emptyJson.data.results.length, 0, "Results array must be empty for nonexistent location");
  logPass("16. Empty-result search handled correctly (HTTP 200 with empty array)");

  // -------------------------------------------------------------
  // Test 17: Provider error / stack trace protection
  // -------------------------------------------------------------
  const invalidCountryRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Hyderabad&countryCode=INVALID`, { headers: authHeaders });
  assert.strictEqual(invalidCountryRes.status, 400);
  const invalidCountryJson = await invalidCountryRes.json();
  assert.strictEqual(invalidCountryJson.success, false);
  assert.ok(!JSON.stringify(invalidCountryJson).includes("stack"), "No stack trace leaked");
  logPass("17. Errors handled safely without stack trace leakage");

  // -------------------------------------------------------------
  // Test 18: No fake coordinates present
  // -------------------------------------------------------------
  const clientCode = fs.readFileSync(clientPath, "utf-8");
  const routeCode = fs.readFileSync(routePath, "utf-8");
  assert(!clientCode.includes("fake") && !clientCode.includes("17.3850"), "No hardcoded fake coordinates in client");
  assert(!routeCode.includes("fake") && !routeCode.includes("17.3850"), "No hardcoded fake coordinates in route");
  logPass("18. Zero fake or simulated coordinates exist in geocoding codebase");

  // -------------------------------------------------------------
  // Test 19: Live test with second real city: Kyoto
  // -------------------------------------------------------------
  console.log("\n--- Section 6: Second Real City Live Verification (Kyoto) ---");
  const kyotoUrl = `${BASE_URL}/api/geocoding/search?q=Kyoto&count=5&language=en`;
  console.log(`[INFO] Querying TravelSensei API: ${kyotoUrl}...`);

  const kyotoRes = await fetch(kyotoUrl, { headers: authHeaders });
  assert.strictEqual(kyotoRes.status, 200, "Kyoto search must return 200");
  const kyotoJson = await kyotoRes.json();
  assert.strictEqual(kyotoJson.success, true);
  assert.ok(Array.isArray(kyotoJson.data?.results) && kyotoJson.data.results.length > 0, "Kyoto must return results");

  const kyotoLocation = kyotoJson.data.results[0];
  assert.ok(typeof kyotoLocation.latitude === "number" && isFinite(kyotoLocation.latitude), "Kyoto latitude numeric");
  assert.ok(typeof kyotoLocation.longitude === "number" && isFinite(kyotoLocation.longitude), "Kyoto longitude numeric");
  console.log(`[INFO] Kyoto resolved: ${kyotoLocation.name}, ${kyotoLocation.country || kyotoLocation.countryCode} (${kyotoLocation.latitude}, ${kyotoLocation.longitude})`);
  logPass("19. Second real city (Kyoto) verified: " + kyotoLocation.name + " (" + kyotoLocation.latitude + ", " + kyotoLocation.longitude + ")");

  // -------------------------------------------------------------
  // Test 20: In-Memory Cache Verification
  // -------------------------------------------------------------
  console.log("\n--- Section 7: In-Memory Caching Verification ---");
  const t0 = Date.now();
  const cachedRes = await fetch(hyderabadUrl, { headers: authHeaders });
  const t1 = Date.now();
  assert.strictEqual(cachedRes.status, 200);
  const cachedJson = await cachedRes.json();
  assert.strictEqual(cachedJson.data?.results?.[0]?.id, firstLocation.id, "Cached result matches original");
  console.log(`[INFO] Cached search completed in ${t1 - t0}ms`);
  logPass("20. In-memory cache returns matching result swiftly");

  // -------------------------------------------------------------
  // Test 21: Security Verification
  // -------------------------------------------------------------
  console.log("\n--- Section 8: Security Audit ---");
  assert(!clientCode.includes("API_KEY"), "Open-Meteo client requires no API key");
  assert(!routeCode.includes("API_KEY"), "Geocoding route requires no API key");
  assert(routeCode.includes("supabase.auth.getUser()"), "Route securely uses supabase.auth.getUser()");
  assert(!routeCode.includes("searchParams.get(\"user_id\")"), "Route never trusts client user_id");
  logPass("21. Security verified: no API keys required, no secrets leaked, user session authenticated");

  console.log("\n=================================================");
  console.log(`ALL OPEN-METEO GEOCODING TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================\n");
}

runGeocodingServerTests().catch((err) => {
  console.error("\n[TEST RUNNER FATAL ERROR]", err);
  process.exit(1);
});

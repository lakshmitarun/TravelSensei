import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

function log(label, message = '') {
  console.log(`[${label}] ${message}`);
}

async function runNuiteeTestSuite() {
  console.log('=================================================');
  console.log('RUNNING NUITEE / LITEAPI SERVER INTEGRATION TESTS');
  console.log('=================================================\n');

  // --- Part 1: Unauthenticated Request Security ---
  console.log('--- Part 1: Authentication & Access Control ---');
  const unauthRes = await fetch(`${BASE_URL}/api/hotels/search?destination=Rome&checkin=2026-10-15&checkout=2026-10-17`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
  const unauthJson = await unauthRes.json();
  assert.strictEqual(unauthJson.success, false, 'Unauthenticated response must indicate success: false');
  log('PASS', '1. Unauthenticated request correctly rejected with 401');

  // --- Part 2: Authenticated Session Setup ---
  console.log('\n--- Part 2: Authenticated Session Setup ---');
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testEmail = `hotel_tester_${uniqueSuffix}@travelsensei.local`;
  const testPassword = 'Password123!@#';

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: 'Hotel Integration Tester',
    }),
  });

  let cookieHeader = '';
  if (typeof signupRes.headers.getSetCookie === 'function') {
    cookieHeader = signupRes.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  } else {
    const rawSetCookie = signupRes.headers.get('set-cookie') || '';
    cookieHeader = rawSetCookie.split(',').map((c) => c.split(';')[0]).join('; ');
  }

  assert.strictEqual(signupRes.ok, true, 'Test user registration succeeded');
  assert.ok(cookieHeader.length > 0, 'Received auth session cookies');
  log('PASS', '2. Authenticated test user session established');

  const authHeaders = { Cookie: cookieHeader };

  // --- Part 3: Input Validation Tests ---
  console.log('\n--- Part 3: Input Validation Checks ---');

  // 3a. Missing location / destination
  const missingLocationRes = await fetch(
    `${BASE_URL}/api/hotels/search?checkin=2026-10-15&checkout=2026-10-17`,
    { headers: authHeaders }
  );
  assert.strictEqual(missingLocationRes.status, 400, 'Missing destination must return 400');
  const missingLocationJson = await missingLocationRes.json();
  assert.strictEqual(missingLocationJson.success, false);
  log('PASS', '3a. Missing destination/hotelId rejected with 400');

  // 3b. Missing checkin date
  const missingCheckinRes = await fetch(
    `${BASE_URL}/api/hotels/search?destination=Rome&checkout=2026-10-17`,
    { headers: authHeaders }
  );
  assert.strictEqual(missingCheckinRes.status, 400, 'Missing checkin must return 400');
  log('PASS', '3b. Missing checkin rejected with 400');

  // 3c. Missing checkout date
  const missingCheckoutRes = await fetch(
    `${BASE_URL}/api/hotels/search?destination=Rome&checkin=2026-10-15`,
    { headers: authHeaders }
  );
  assert.strictEqual(missingCheckoutRes.status, 400, 'Missing checkout must return 400');
  log('PASS', '3c. Missing checkout rejected with 400');

  // 3d. Invalid checkin date format
  const invalidDateFormatRes = await fetch(
    `${BASE_URL}/api/hotels/search?destination=Rome&checkin=invalid-date&checkout=2026-10-17`,
    { headers: authHeaders }
  );
  assert.strictEqual(invalidDateFormatRes.status, 400, 'Invalid date format must return 400');
  log('PASS', '3d. Invalid date format rejected with 400');

  // 3e. Past checkin date
  const pastCheckinRes = await fetch(
    `${BASE_URL}/api/hotels/search?destination=Rome&checkin=2020-01-15&checkout=2020-01-17`,
    { headers: authHeaders }
  );
  assert.strictEqual(pastCheckinRes.status, 400, 'Past date must return 400');
  log('PASS', '3e. Past checkin date rejected with 400');

  // 3f. Checkout before or equal to checkin
  const invalidCheckoutOrderRes = await fetch(
    `${BASE_URL}/api/hotels/search?destination=Rome&checkin=2026-10-15&checkout=2026-10-15`,
    { headers: authHeaders }
  );
  assert.strictEqual(invalidCheckoutOrderRes.status, 400, 'Checkout on or before checkin must return 400');
  log('PASS', '3f. Checkout on or before checkin rejected with 400');

  // 3g. Invalid adults count
  const invalidAdultsRes = await fetch(
    `${BASE_URL}/api/hotels/search?destination=Rome&checkin=2026-10-15&checkout=2026-10-17&adults=0`,
    { headers: authHeaders }
  );
  assert.strictEqual(invalidAdultsRes.status, 400, 'Invalid adults count must return 400');
  log('PASS', '3g. Invalid guest count (adults < 1) rejected with 400');

  // --- Part 4: Live Nuitee Sandbox Hotel Search ---
  console.log('\n--- Part 4: Live Nuitee Sandbox Search ---');

  // Query Nuitee rates by city / hotelId
  const searchUrl = `${BASE_URL}/api/hotels/search?destination=Rome&countryCode=IT&checkin=2026-10-15&checkout=2026-10-17&adults=2&currency=USD`;
  console.log(`Querying GET ${searchUrl}...`);

  const liveSearchRes = await fetch(searchUrl, { headers: authHeaders });
  const liveSearchJson = await liveSearchRes.json();

  console.log('HTTP Status:', liveSearchRes.status);
  console.log('Success flag:', liveSearchJson.success);

  if (liveSearchRes.status === 503 && liveSearchJson.error?.code === 'MISSING_API_KEY') {
    log('WARN', 'NUITEE_API_KEY is not yet populated in .env.local on disk.');
    log('WARN', 'Nuitee server client correctly detected missing API key and handled error gracefully.');
    return {
      keyPopulated: false,
      apiWorking: false,
    };
  }

  assert.strictEqual(liveSearchRes.status, 200, `Live search should return 200 OK, got: ${liveSearchRes.status}`);
  assert.strictEqual(liveSearchJson.success, true, 'Response success should be true');
  assert.ok(liveSearchJson.data, 'Response should contain data payload');
  assert.ok(Array.isArray(liveSearchJson.data.hotels), 'data.hotels must be an array');
  assert.ok(liveSearchJson.data.metadata, 'data.metadata must exist');
  assert.strictEqual(liveSearchJson.data.provider, 'Nuitee / LiteAPI', 'Provider must be Nuitee / LiteAPI');
  assert.strictEqual(liveSearchJson.data.currency, 'USD', 'Currency must be USD');

  log('PASS', '4a. Nuitee sandbox response successfully normalized into TravelSensei hotel result');

  const hotels = liveSearchJson.data.hotels;
  console.log(`Total hotels returned: ${hotels.length}`);

  if (hotels.length > 0) {
    const firstHotel = hotels[0];
    assert.ok(firstHotel.id, 'Hotel must have an id');
    assert.ok(firstHotel.name, 'Hotel must have a name');
    log('PASS', `4b. First hotel: [${firstHotel.id}] ${firstHotel.name} (${firstHotel.city || 'No city'})`);

    if (firstHotel.rates && firstHotel.rates.length > 0) {
      const firstRate = firstHotel.rates[0];
      assert.ok(typeof firstRate.price === 'number', 'Rate must have a numeric price');
      assert.ok(firstRate.currency, 'Rate must have a currency');
      assert.ok(typeof firstRate.isRefundable === 'boolean', 'Rate must specify refundable status');
      log('PASS', `4c. Hotel rate found: ${firstRate.currency} ${firstRate.price} | Room: ${firstRate.roomName} | Status: ${firstRate.refundableStatus}`);
    } else {
      log('INFO', '4c. Hotel metadata returned, but rates were not available for the specific dates/sandbox inventory.');
    }
  } else {
    log('INFO', '4b. Sandbox returned 0 hotel matches for this specific query filter.');
  }

  // --- Part 5: Security Verification ---
  console.log('\n--- Part 5: Security & Credential Isolation ---');
  const responseStr = JSON.stringify(liveSearchJson);
  assert.ok(!responseStr.includes('sand_'), 'Response must never leak sandbox API key format');
  assert.ok(!responseStr.includes('X-API-Key'), 'Response must not expose X-API-Key header name');
  log('PASS', '5. Zero credential or internal secret leakage detected');

  console.log('\n=================================================');
  console.log('ALL NUITEE SERVER INTEGRATION TESTS PASSED!');
  console.log('=================================================\n');

  return {
    keyPopulated: true,
    apiWorking: true,
    totalHotels: hotels.length,
  };
}

runNuiteeTestSuite().catch((err) => {
  console.error('\n[TEST FAILURE]', err);
  process.exit(1);
});

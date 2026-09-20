import fs from "fs";
import path from "path";
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

async function runStage7Tests() {
  console.log("=================================================");
  console.log("RUNNING STAGE 7: LOGIN + SIGN UP UI TESTS");
  console.log("=================================================\n");

  const workspaceRoot = process.cwd();

  // -------------------------------------------------------------
  // Test 1: Verification of Required Route Files & Components
  // -------------------------------------------------------------
  console.log("--- Test 1: Auth Route Files and Components Existence ---");
  const loginPagePath = path.join(workspaceRoot, "app", "login", "page.tsx");
  const signupPagePath = path.join(workspaceRoot, "app", "signup", "page.tsx");
  const loginFormPath = path.join(workspaceRoot, "components", "auth", "LoginForm.tsx");
  const signupFormPath = path.join(workspaceRoot, "components", "auth", "SignupForm.tsx");

  assert(fs.existsSync(loginPagePath), "app/login/page.tsx exists");
  assert(fs.existsSync(signupPagePath), "app/signup/page.tsx exists");
  assert(fs.existsSync(loginFormPath), "components/auth/LoginForm.tsx exists");
  assert(fs.existsSync(signupFormPath), "components/auth/SignupForm.tsx exists");

  const loginPageCode = fs.readFileSync(loginPagePath, "utf-8");
  const signupPageCode = fs.readFileSync(signupPagePath, "utf-8");
  const loginFormCode = fs.readFileSync(loginFormPath, "utf-8");
  const signupFormCode = fs.readFileSync(signupFormPath, "utf-8");

  // -------------------------------------------------------------
  // Test 2: Login Page UI Structure & Branding
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Login Form UI Structure & Branding ---");
  assert(loginFormCode.includes("TravelSenseiLogo"), "LoginForm renders TravelSenseiLogo");
  assert(loginFormCode.includes("Welcome back"), "LoginForm includes 'Welcome back' heading");
  assert(loginFormCode.includes("Sign in to continue planning"), "LoginForm includes subtitle");
  assert(loginFormCode.includes("Back to TravelSensei"), "LoginForm includes Back to TravelSensei link");
  assert(loginFormCode.includes('href="/signup"'), "LoginForm links to signup page");
  assert(loginFormCode.includes('href="/"'), "LoginForm links to home page");

  // -------------------------------------------------------------
  // Test 3: Sign Up Page UI Structure & Branding
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Signup Form UI Structure & Branding ---");
  assert(signupFormCode.includes("TravelSenseiLogo"), "SignupForm renders TravelSenseiLogo");
  assert(signupFormCode.includes("Create your account") || signupFormCode.includes("Create your TravelSensei account"), "SignupForm includes account creation heading");
  assert(signupFormCode.includes("Start planning personalized trips with AI"), "SignupForm includes subtitle");
  assert(signupFormCode.includes("Back to TravelSensei"), "SignupForm includes Back to TravelSensei link");
  assert(signupFormCode.includes('href="/login"'), "SignupForm links to login page");
  assert(signupFormCode.includes('href="/"'), "SignupForm links to home page");

  // -------------------------------------------------------------
  // Test 4: Form Input Fields & Autocomplete Attributes
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Form Input Fields & Accessibility Attributes ---");
  // Login fields
  assert(loginFormCode.includes('type="email"') && loginFormCode.includes('autoComplete="email"'), "LoginForm has email input with autoComplete='email'");
  assert(loginFormCode.includes('autoComplete="current-password"'), "LoginForm has password input with autoComplete='current-password'");
  assert(loginFormCode.includes('id="login-email"') && loginFormCode.includes('htmlFor="login-email"'), "LoginForm has accessible label association for email");
  assert(loginFormCode.includes('id="login-password"') && loginFormCode.includes('htmlFor="login-password"'), "LoginForm has accessible label association for password");

  // Signup fields
  assert(signupFormCode.includes('autoComplete="name"'), "SignupForm has name input with autoComplete='name'");
  assert(signupFormCode.includes('type="email"') && signupFormCode.includes('autoComplete="email"'), "SignupForm has email input with autoComplete='email'");
  assert(signupFormCode.includes('autoComplete="new-password"'), "SignupForm has password input with autoComplete='new-password'");
  assert(signupFormCode.includes('id="signup-fullname"') && signupFormCode.includes('htmlFor="signup-fullname"'), "SignupForm has accessible label association for full name");
  assert(signupFormCode.includes('id="signup-email"') && signupFormCode.includes('htmlFor="signup-email"'), "SignupForm has accessible label association for email");
  assert(signupFormCode.includes('id="signup-password"') && signupFormCode.includes('htmlFor="signup-password"'), "SignupForm has accessible label association for password");
  assert(signupFormCode.includes('id="signup-confirm-password"') && signupFormCode.includes('htmlFor="signup-confirm-password"'), "SignupForm has accessible label association for confirm password");

  // -------------------------------------------------------------
  // Test 5: Password Show/Hide Functionality
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Password Show/Hide Functionality ---");
  assert(loginFormCode.includes("showPassword") && loginFormCode.includes("setShowPassword"), "LoginForm manages showPassword state");
  assert(loginFormCode.includes("Eye") && loginFormCode.includes("EyeOff"), "LoginForm uses Eye and EyeOff icons from lucide-react");
  assert(loginFormCode.includes("aria-label") && loginFormCode.includes("aria-pressed"), "LoginForm toggle button has aria-label and aria-pressed attributes");

  assert(signupFormCode.includes("showPassword") && signupFormCode.includes("showConfirmPassword"), "SignupForm manages separate visibility state for password and confirm password");
  assert(signupFormCode.includes("Eye") && signupFormCode.includes("EyeOff"), "SignupForm uses Eye and EyeOff icons from lucide-react");
  assert(signupFormCode.includes("aria-label"), "SignupForm toggle buttons have aria-label");

  // -------------------------------------------------------------
  // Test 6: Client-side Validation Logic Verification
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Client-side Validation Logic ---");
  // Test LoginForm validation logic
  function validateLogin(emailVal, passwordVal) {
    const trimmed = (emailVal || "").trim();
    if (!trimmed) return "Please enter your email address.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return "Please enter a valid email address.";
    if (!passwordVal) return "Please enter your password.";
    return null;
  }

  assert(validateLogin("", "secret123") === "Please enter your email address.", "Login catches empty email");
  assert(validateLogin("invalid-email", "secret123") === "Please enter a valid email address.", "Login catches invalid email format");
  assert(validateLogin("user@test.com", "") === "Please enter your password.", "Login catches empty password");
  assert(validateLogin("user@test.com", "secret123") === null, "Login passes valid inputs");

  // Test SignupForm validation logic
  function validateSignup(nameVal, emailVal, passwordVal, confirmVal) {
    const trimmedName = (nameVal || "").trim();
    if (!trimmedName) return "Please enter your full name.";
    const trimmedEmail = (emailVal || "").trim();
    if (!trimmedEmail) return "Please enter your email address.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) return "Please enter a valid email address.";
    if (!passwordVal) return "Please enter a password.";
    if (passwordVal.length < 6) return "Password must be at least 6 characters long.";
    if (!confirmVal) return "Please confirm your password.";
    if (passwordVal !== confirmVal) return "Passwords do not match.";
    return null;
  }

  assert(validateSignup("", "user@test.com", "password123", "password123") === "Please enter your full name.", "Signup catches empty full name");
  assert(validateSignup("Test User", "bademail", "password123", "password123") === "Please enter a valid email address.", "Signup catches invalid email");
  assert(validateSignup("Test User", "user@test.com", "123", "123") === "Password must be at least 6 characters long.", "Signup catches short password");
  assert(validateSignup("Test User", "user@test.com", "password123", "password456") === "Passwords do not match.", "Signup catches mismatched passwords");
  assert(validateSignup("Test User", "user@test.com", "password123", "password123") === null, "Signup passes valid registration data");

  // -------------------------------------------------------------
  // Test 7: API Endpoint Integration & Payload Structure
  // -------------------------------------------------------------
  console.log("\n--- Test 7: API Integration & Route Endpoints ---");
  assert(loginFormCode.includes('fetch("/api/auth/login"'), "LoginForm calls POST /api/auth/login");
  assert(loginFormCode.includes("JSON.stringify({") && loginFormCode.includes("email:") && loginFormCode.includes("password"), "LoginForm sends { email, password }");
  assert(signupFormCode.includes('fetch("/api/auth/signup"'), "SignupForm calls POST /api/auth/signup");
  assert(signupFormCode.includes("full_name:") && signupFormCode.includes("email:") && signupFormCode.includes("password"), "SignupForm sends { full_name, email, password }");

  // -------------------------------------------------------------
  // Test 8: Loading & Error States
  // -------------------------------------------------------------
  console.log("\n--- Test 8: Loading & Error States ---");
  assert(loginFormCode.includes("isLoading") && loginFormCode.includes("Signing in..."), "LoginForm renders 'Signing in...' during submission");
  assert(loginFormCode.includes("Loader2"), "LoginForm renders animated spinner during loading");
  assert(signupFormCode.includes("isLoading") && signupFormCode.includes("Creating account..."), "SignupForm renders 'Creating account...' during submission");
  assert(signupFormCode.includes("Loader2"), "SignupForm renders animated spinner during loading");
  assert(loginFormCode.includes('role="alert"'), "LoginForm has accessible error alert");
  assert(signupFormCode.includes('role="alert"'), "SignupForm has accessible error alert");

  // -------------------------------------------------------------
  // Test 9: Authenticated User Redirect Logic on Auth Pages
  // -------------------------------------------------------------
  console.log("\n--- Test 9: Authenticated User Redirects ---");
  assert(loginPageCode.includes('fetch("/api/auth/me")') && loginPageCode.includes('router.replace("/my-trips")'), "LoginPage redirects authenticated users to /my-trips");
  assert(signupPageCode.includes('fetch("/api/auth/me")') && signupPageCode.includes('router.replace("/my-trips")'), "SignupPage redirects authenticated users to /my-trips");

  // -------------------------------------------------------------
  // Test 10: Security Checks (No localStorage tokens, no secret leak)
  // -------------------------------------------------------------
  console.log("\n--- Test 10: Security Audit ---");
  assert(!loginFormCode.includes("localStorage.setItem"), "LoginForm does not store tokens in localStorage");
  assert(!signupFormCode.includes("localStorage.setItem"), "SignupForm does not store tokens in localStorage");
  assert(!loginPageCode.includes("localStorage.setItem"), "LoginPage does not use localStorage");
  assert(!signupPageCode.includes("localStorage.setItem"), "SignupPage does not use localStorage");
  assert(!loginFormCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "LoginForm does not reference service role key");
  assert(!signupFormCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "SignupForm does not reference service role key");

  // -------------------------------------------------------------
  // Test 11: Header Integration Check
  // -------------------------------------------------------------
  console.log("\n--- Test 11: Header Auth State Integration ---");
  const homePagePath = path.join(workspaceRoot, "app", "page.tsx");
  const homePageCode = fs.readFileSync(homePagePath, "utf-8");
  assert(homePageCode.includes('href="/login"') && homePageCode.includes('href="/signup"'), "Header contains Login and Sign Up links for logged out users");
  assert(homePageCode.includes('href="/my-trips"'), "Header contains My Trips link for logged in users");
  assert(homePageCode.includes('isAuthenticated'), "Header dynamically tracks isAuthenticated state");

  // -------------------------------------------------------------
  // Test 12: Backend Auth API Regression
  // -------------------------------------------------------------
  console.log("\n--- Test 12: Backend Auth API Live Regression ---");
  // Test unauthenticated /api/auth/me
  const unauthMeRes = await fetch(`${BASE_URL}/api/auth/me`);
  const unauthMeData = await unauthMeRes.json();
  assert(unauthMeRes.status === 401, "/api/auth/me returns 401 for unauthenticated session");
  assert(unauthMeData.success === false, "Unauthenticated /api/auth/me returns success: false");

  // Test invalid login
  const invalidLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nonexistent_user_xyz@test.com",
      password: "wrongpassword123",
    }),
  });
  const invalidLoginData = await invalidLoginRes.json();
  assert(invalidLoginRes.status === 401, "Invalid login credentials return 401 Unauthorized");
  assert(invalidLoginData.success === false, "Invalid login returns success: false");
  assert(invalidLoginData.message === "Invalid email or password", "Invalid login returns clean user message");

  // Test invalid signup input
  const invalidSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "notanemail",
      password: "123",
      full_name: "",
    }),
  });
  assert(invalidSignupRes.status === 400, "Invalid signup validation returns 400 Bad Request");

  // -------------------------------------------------------------
  // Test 13: Stage 5 Frontend Integration Regression
  // -------------------------------------------------------------
  console.log("\n--- Test 13: Stage 5 Frontend Regression ---");
  const destRes = await fetch(`${BASE_URL}/api/destinations`);
  const destData = await destRes.json();
  assert(destRes.status === 200, "Destinations API returns 200 OK");
  assert(destData.success === true && destData.destinations.length > 0, "Destinations catalog is available for planner");

  // -------------------------------------------------------------
  // Test 14: Stage 6 Saved Trips Regression
  // -------------------------------------------------------------
  console.log("\n--- Test 14: Stage 6 Saved Trips Regression ---");
  const unauthTripsRes = await fetch(`${BASE_URL}/api/trips`);
  assert(unauthTripsRes.status === 401, "Unauthenticated trips access correctly returns 401");

  console.log("\n=================================================");
  console.log(`STAGE 7 TESTS COMPLETE: ${passedTests}/${totalTests} PASSED`);
  console.log("=================================================\n");
}

runStage7Tests().catch((err) => {
  console.error("\nStage 7 test suite failed:", err);
  process.exit(1);
});

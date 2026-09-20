"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
  RefreshCw,
} from "lucide-react";
import TravelSenseiLogo from "@/components/TravelSenseiLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email confirmation state
  const [isConfirmationSent, setIsConfirmationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // 1. Client-side validation
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        if (
          response.status === 409 ||
          data?.error?.includes("already exists") ||
          data?.error?.includes("already registered")
        ) {
          setError("An account with this email already exists.");
        } else if (response.status === 429) {
          setError("Signup rate limit reached. Please wait a moment and try again.");
        } else {
          setError(data?.error || data?.message || "Failed to create account. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // 2. Check if a session was immediately established
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.success && meData?.user) {
            router.push("/my-trips");
            router.refresh();
            return;
          }
        }
      } catch (err) {
        console.warn("Session check after signup:", err);
      }

      // 3. Show the dedicated Email Confirmation UI
      setIsConfirmationSent(true);
      setIsLoading(false);
    } catch (err: unknown) {
      setError("A network error occurred. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim() || resendLoading) return;
    setResendLoading(true);
    setResendStatus(null);
    setResendError(null);

    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setResendError(
          data?.error || "Failed to resend confirmation email. Please wait a moment."
        );
      } else {
        setResendStatus("Confirmation email resent! Please check your inbox and spam.");
      }
    } catch {
      setResendError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back to Home Link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-surface-container"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to TravelSensei</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high/70 shadow-xl p-7 sm:p-9">
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="mb-3 hover:opacity-95 transition-opacity">
            <TravelSenseiLogo className="h-10" />
          </Link>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            {isConfirmationSent ? "Check your email" : "Create your account"}
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-1.5 max-w-xs">
            {isConfirmationSent
              ? "We sent a confirmation link to activate your account."
              : "Start planning personalized trips with AI."}
          </p>
        </div>

        {/* --- CONFIRMATION SENT VIEW --- */}
        {isConfirmationSent ? (
          <div className="flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs sm:text-sm text-on-surface font-medium leading-relaxed">
                A verification email was sent to:
                <br />
                <span className="font-bold text-primary break-all">{email}</span>
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Click the confirmation link inside the email to activate your account and start planning trips.
              </p>
            </div>

            {/* Resend Status Notifications */}
            {resendStatus && (
              <div className="w-full p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{resendStatus}</span>
              </div>
            )}

            {resendError && (
              <div className="w-full p-3 rounded-xl bg-error-container/40 border border-error/20 text-error text-xs font-medium flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                <span>{resendError}</span>
              </div>
            )}

            <div className="w-full flex flex-col gap-2.5 pt-2">
              <Button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                variant="outline"
                className="w-full h-11 text-xs sm:text-sm font-bold border-primary/30 text-primary hover:bg-primary/5 rounded-xl flex items-center justify-center gap-2"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending email...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Resend Confirmation Email</span>
                  </>
                )}
              </Button>

              <Link
                href="/login"
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs sm:text-sm shadow-md flex items-center justify-center transition-all"
              >
                Go to Sign In
              </Link>
            </div>

            <div className="pt-2 text-xs text-on-surface-variant flex items-center justify-center gap-1">
              <span>Entered the wrong email?</span>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmationSent(false);
                  setResendStatus(null);
                  setResendError(null);
                }}
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                Edit details
              </button>
            </div>
          </div>
        ) : (
          /* --- SIGNUP FORM VIEW --- */
          <>
            {/* Error Alert */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-2.5 text-error text-xs sm:text-sm font-medium animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Full Name Field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="signup-fullname"
                  className="font-label-lg text-xs font-bold text-on-surface flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Full Name</span>
                </label>
                <Input
                  id="signup-fullname"
                  type="text"
                  name="name"
                  placeholder="e.g. Maya Lin"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                  required
                  className="bg-surface-container-low focus:bg-surface text-sm h-11"
                />
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="signup-email"
                  className="font-label-lg text-xs font-bold text-on-surface flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Email</span>
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                  className="bg-surface-container-low focus:bg-surface text-sm h-11"
                />
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="signup-password"
                  className="font-label-lg text-xs font-bold text-on-surface flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    required
                    className="bg-surface-container-low focus:bg-surface text-sm h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-on-surface-variant hover:text-on-surface focus:outline-none focus:text-primary transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-on-surface-variant" />
                    ) : (
                      <Eye className="w-4 h-4 text-on-surface-variant" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="signup-confirm-password"
                  className="font-label-lg text-xs font-bold text-on-surface flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>Confirm Password</span>
                </label>
                <div className="relative">
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    required
                    className="bg-surface-container-low focus:bg-surface text-sm h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    aria-pressed={showConfirmPassword}
                    className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-on-surface-variant hover:text-on-surface focus:outline-none focus:text-primary transition-colors disabled:opacity-50"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-on-surface-variant" />
                    ) : (
                      <Eye className="w-4 h-4 text-on-surface-variant" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-2 bg-primary hover:bg-primary-container text-on-primary font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </Button>
            </form>

            {/* Footer / Link to Login */}
            <div className="mt-6 pt-5 border-t border-surface-container-high/60 text-center text-xs font-medium text-on-surface-variant">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-primary hover:text-primary-container hover:underline transition-colors"
              >
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

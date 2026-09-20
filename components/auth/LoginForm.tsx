"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import TravelSenseiLogo from "@/components/TravelSenseiLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams?.get("error") === "verification_failed") {
      setError(
        "Email verification link was invalid or expired. Please sign in or request a new confirmation email."
      );
      setShowResendOption(true);
    } else if (searchParams?.get("confirmed") === "true") {
      setBannerNotice("Email verified successfully! You can now sign in to your account.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setShowResendOption(false);
    setResendSuccess(null);

    // Client-side validation
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
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        const errorMsg =
          data?.message ||
          data?.error ||
          (response.status === 401
            ? "Invalid email or password."
            : "Sign in failed. Please check your credentials and try again.");

        setError(errorMsg);

        if (
          errorMsg.toLowerCase().includes("email not confirmed") ||
          data?.emailNotConfirmed
        ) {
          setShowResendOption(true);
        }

        setIsLoading(false);
        return;
      }

      // Verify session via /api/auth/me
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          console.warn("Session confirmation returned status:", meRes.status);
        }
      } catch (err) {
        console.warn("Failed session confirmation check:", err);
      }

      // Redirect to /my-trips on success
      router.push("/my-trips");
      router.refresh();
    } catch (err: unknown) {
      setError("A network error occurred. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = email.trim();
    if (!targetEmail || resendLoading) return;
    setResendLoading(true);
    setResendSuccess(null);

    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.error || "Failed to resend confirmation email.");
      } else {
        setResendSuccess("Confirmation email sent! Please check your inbox and spam folder.");
      }
    } catch {
      setError("Network error. Please try again.");
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
        <div className="flex flex-col items-center text-center mb-7">
          <Link href="/" className="mb-4 hover:opacity-95 transition-opacity">
            <TravelSenseiLogo className="h-10" />
          </Link>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Welcome back
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-1.5 max-w-xs">
            Sign in to continue planning your next journey.
          </p>
        </div>

        {/* Notice Banner */}
        {bannerNotice && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs sm:text-sm font-semibold animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{bannerNotice}</span>
          </div>
        )}

        {/* Resend Confirmation Success */}
        {resendSuccess && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs sm:text-sm font-semibold animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{resendSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex flex-col gap-2 text-error text-xs sm:text-sm font-medium animate-in fade-in duration-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>

            {showResendOption && email && (
              <Button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                variant="outline"
                className="mt-1 w-full h-8 text-xs font-bold border-error/30 text-error hover:bg-error/10 rounded-lg flex items-center justify-center gap-1.5"
              >
                {resendLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Resend confirmation email to {email}</span>
              </Button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5" noValidate>
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="font-label-lg text-xs font-bold text-on-surface flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>Email</span>
            </label>
            <Input
              id="login-email"
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
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="font-label-lg text-xs font-bold text-on-surface flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>Password</span>
              </label>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 bg-primary hover:bg-primary-container text-on-primary font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </Button>
        </form>

        {/* Footer / Link to Signup */}
        <div className="mt-6 pt-5 border-t border-surface-container-high/60 text-center text-xs font-medium text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-bold text-primary hover:text-primary-container hover:underline transition-colors"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

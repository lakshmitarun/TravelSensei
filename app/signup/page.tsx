"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.user) {
            router.replace("/my-trips");
            return;
          }
        }
      } catch (err) {
        // Unauthenticated or network error, show signup form
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle travel-themed background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/5 via-primary-fixed/5 to-transparent pointer-events-none blur-3xl -z-10" />
      <div className="absolute -bottom-24 left-10 w-96 h-96 bg-primary-container/5 rounded-full pointer-events-none blur-3xl -z-10" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <SignupForm />
      </div>
    </div>
  );
}

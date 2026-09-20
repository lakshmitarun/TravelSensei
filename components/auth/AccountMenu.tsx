"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Compass, Loader2, User } from "lucide-react";

export interface AccountMenuProps {
  user: {
    id: string;
    email: string;
    full_name?: string | null;
  } | null;
  onLogoutSuccess?: () => void;
  className?: string;
}

export default function AccountMenu({
  user,
  onLogoutSuccess,
  className = "",
}: AccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        setIsOpen(false);
        if (onLogoutSuccess) {
          onLogoutSuccess();
        }
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {/* Trigger Button (Profile Icon) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-[42px] h-[42px] rounded-full bg-surface-container hover:bg-primary/10 text-primary border border-surface-container-high flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        title="My Trips & Account"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <span className="material-symbols-outlined text-[20px]">person</span>
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-lowest border border-surface-container-high/70 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-surface-container-high/60 flex flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Signed in as
            </span>
            {user?.full_name && (
              <span className="text-sm font-bold text-on-surface truncate">
                {user.full_name}
              </span>
            )}
            <span className="text-xs text-on-surface-variant truncate">
              {user?.email || "User Account"}
            </span>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/my-trips"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-primary transition-colors"
            >
              <Compass className="w-4 h-4 text-primary" />
              <span>My Trips</span>
            </Link>
          </div>

          {/* Divider & Logout Action */}
          <div className="pt-1 border-t border-surface-container-high/60">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-error hover:bg-error-container/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

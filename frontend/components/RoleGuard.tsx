"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getToken, getUser, StoredUser } from "../utils/api";
import BrandLoader from "./BrandLoader";

export interface RoleGuardProps {
  allowedRoles: Array<"DOCTOR" | "PHARMACIST" | "MASTER_ADMIN">;
  children: React.ReactNode;
}

export function getDefaultRouteForRole(role?: string): string {
  switch (role) {
    case "MASTER_ADMIN":
      return "/admin";
    case "PHARMACIST":
      return "/inventory";
    case "DOCTOR":
    default:
      return "/prescription";
  }
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    // Wait until router is ready
    if (!router.isReady) return;

    const token = getToken();
    const currentUser = getUser();

    // 1. If unauthenticated, redirect to login
    if (!token || !currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);

    // 2. Check if user's role is allowed on this route
    if (!allowedRoles.includes(currentUser.role)) {
      // Redirect user to their designated default interface
      const targetRoute = getDefaultRouteForRole(currentUser.role);
      router.replace(targetRoute);
      return;
    }

    // 3. User is authenticated & authorized
    setAuthorized(true);
  }, [router, router.isReady, allowedRoles]);

  if (!authorized) {
    return (
      <BrandLoader
        role={user?.role || "DOCTOR"}
        message="Verifying account permissions… Please wait."
      />
    );
  }

  return <>{children}</>;
}

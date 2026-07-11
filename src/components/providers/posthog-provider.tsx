"use client";

import { useEffect, Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const isClient = typeof window !== "undefined";
const isTestEnv = process.env.NODE_ENV === "test";
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

const shouldInitialize = isClient && !isTestEnv && !!posthogKey && !!posthogHost;

if (shouldInitialize) {
  posthog.init(posthogKey!, {
    api_host: posthogHost,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    capture_exceptions: true,
  });
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (shouldInitialize) {
      let url = window.origin + (pathname || "");
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}

/**
 * Syncs the authenticated NextAuth session user into PostHog via identify().
 * Must be rendered inside both AuthProvider and CSPostHogProvider.
 */
function PostHogIdentitySyncInternal() {
  const { data: session, status } = useSession();
  const lastPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.id) return;

    const signedInKey = `signed-in-tracked-${session.user.id}`;
    try {
      if (!sessionStorage.getItem(signedInKey)) {
        const provider = (session.user as unknown as Record<string, unknown>).provider || "credentials";
        posthog.capture("user_signed_in", { method: provider });
        sessionStorage.setItem(signedInKey, "true");
      }
    } catch (e) {
      console.error("Failed to access sessionStorage or track sign-in:", e);
    }

    const extendedUser = session.user as unknown as Record<string, unknown>;
    const payload = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      tier: typeof extendedUser.tier === "string" ? extendedUser.tier : undefined,
      role: typeof extendedUser.role === "string" ? extendedUser.role : undefined,
    };

    const payloadKey = JSON.stringify(payload);
    if (lastPayloadRef.current === payloadKey) return;

    const personProps: Record<string, string | undefined> = {};
    if (payload.email) personProps.email = payload.email;
    if (payload.name) personProps.name = payload.name;
    if (payload.tier) personProps.tier = payload.tier;
    if (payload.role) personProps.role = payload.role;

    posthog.identify(payload.id, personProps as unknown as Record<string, unknown>);
    lastPayloadRef.current = payloadKey;
  }, [session, status]);

  return null;
}

export function PostHogIdentitySync() {
  return (
    <Suspense fallback={null}>
      <PostHogIdentitySyncInternal />
    </Suspense>
  );
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  );
}

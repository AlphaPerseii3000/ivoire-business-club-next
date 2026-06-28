"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

type IdentityPayload = {
  id: string;
  email?: string | null;
  name?: string | null;
  tier?: string;
  role?: string;
};

function payloadEquals(a: IdentityPayload | null, b: IdentityPayload | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const idsMatch = a.id === b.id;
  const emailsMatch = a.email === b.email;
  const namesMatch = a.name === b.name;
  const tiersMatch = a.tier === b.tier;
  const rolesMatch = a.role === b.role;
  return idsMatch && emailsMatch && namesMatch && tiersMatch && rolesMatch;
}

function buildPostHogProperties(payload: IdentityPayload): Record<string, string | null> {
  const props: Record<string, string | null> = {};
  if (payload.email) props.email = payload.email;
  if (payload.name) props.name = payload.name;
  if (payload.tier) props.tier = payload.tier;
  if (payload.role) props.role = payload.role;
  return props;
}

/**
 * Listens to NextAuth session changes and identifies the user in PostHog
 * once the session becomes authenticated. Idempotent: does not re-call
 * identify unless user identity properties change.
 */
export function usePostHogIdentify() {
  const { data: session, status } = useSession();
  const lastIdentified = useRef<IdentityPayload | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    const user = session?.user;
    if (!user?.id) return;

    const extendedUser = user as unknown as Record<string, unknown>;
    const tier = typeof extendedUser.tier === "string" ? extendedUser.tier : undefined;
    const role = typeof extendedUser.role === "string" ? extendedUser.role : undefined;
    const payload: IdentityPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      tier,
      role,
    };

    if (payloadEquals(lastIdentified.current, payload)) return;

    const properties = buildPostHogProperties(payload);

    // PostHog's identify signature accepts Properties (Record<string, Property>) where
    // Property is `any`. Casting through unknown avoids strict null assignment errors.
    posthog.identify(payload.id, properties as unknown as Record<string, unknown>);

    lastIdentified.current = payload;
  }, [session, status]);
}

export default usePostHogIdentify;

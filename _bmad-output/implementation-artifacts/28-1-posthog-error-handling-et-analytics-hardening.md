---
baseline_commit: b61d72e31cd96bd12e8a2be00c0c91fd5bf07082
---

# Story 28.1: PostHog Error Handling & Analytics Hardening

Status: review

## Story

As a developer,
I want PostHog errors to be safely handled and pageview/sign-in tracking to be hardened,
so that the application remains fully available and analytics metrics are accurate even if PostHog has network or configuration issues.

## Acceptance Criteria

1. **PostHog Resilience (No-Crash Guarantees)**
   - Given an API endpoint or page that calls `posthogServer.capture`
   - When PostHog experiences network issues (timeout, DNS failure, connection refused)
   - Then the operation must succeed (e.g., database writes are preserved, the API returns a success status 200/201, or the page renders successfully)
   - And the error is logged using `console.error` but never propagated to crash the request

2. **Deduplication of Bank Transfer Page Views**
   - Given the `/pricing/virement` page
   - When the user refreshes the page multiple times
   - Then the `bank_transfer_page_viewed` and `bank_transfer_instructions_viewed` events are captured exactly once per browser session
   - And the tracking must be performed client-side to avoid server-side render duplication

3. **Google OAuth Sign-in Tracking**
   - Given a user who signs in via Google OAuth
   - When the OAuth callback succeeds and the session is established
   - Then the event `user_signed_in` is captured client-side with the property `method: "google"` exactly once per sign-in session

4. **Clean Server Shutdown Handling**
   - Given the Next.js server in production
   - When the server receives a termination signal (`SIGTERM` or `SIGINT`)
   - Then any queued PostHog events in memory are flushed and the connection is closed before the process exits

5. **Singleton Hot Reloading in Dev**
   - Given the application running in development mode (`process.env.NODE_ENV !== "production"`)
   - When a PostHog environment variable (e.g., key or host) is changed
   - Then the server-side PostHog singleton client re-initializes on the next call without requiring a manual server restart

6. **Build & Test Verification**
   - Given the complete implementation
   - When `npm run build` is executed, the build passes without errors
   - When `npx vitest run` is executed, all tests pass without regressions

## Tasks / Subtasks

- [x] **Task 1: Implement Safe Proxy Wrapper & Dev Reloading in posthog-server.ts** (AC: 1, 4, 5)
  - [x] Wrap the `posthogServer` export in a Proxy that intercepts all method calls (e.g., `capture`, `identify`, `alias`, `close`, `flush`).
  - [x] Implement a dynamic getter `getActivePostHogClient()` inside the Proxy that checks if environment variables (`NEXT_PUBLIC_POSTHOG_KEY` or `NEXT_PUBLIC_POSTHOG_HOST`) changed during development and re-initializes the client if needed.
  - [x] Add try/catch blocks around all intercepted method executions. Catch synchronous errors and append `.catch()` handlers to any returned Promises to avoid unhandled rejections. Log errors using `console.error`.
  - [x] Register `process.once("SIGTERM")` and `process.once("SIGINT")` event listeners to call `flush()` and `close()` on the active client before exiting.

- [x] **Task 2: Harden Authentication callbacks to track OAuth Provider** (AC: 3)
  - [x] Update [auth.config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.config.ts) to capture and store the provider name (`account.provider`) into the JWT token inside the `jwt` callback, and expose it in the session user object in the `session` callback.
  - [x] Update [auth.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.ts) to also expose `provider` on `session.user` inside the `session` callback.

- [x] **Task 3: Client-Side Google OAuth Event Capture in posthog-provider.tsx** (AC: 3)
  - [x] In [posthog-provider.tsx](file:///d:/Code/ivoire-business-club-next/src/components/providers/posthog-provider.tsx), check the session provider name inside `PostHogIdentitySyncInternal`.
  - [x] If `status === "authenticated"` and `session.user` contains a provider (e.g. `"google"`), capture `user_signed_in` with the property `{ method: provider }`.
  - [x] Guard this capture with a `sessionStorage` key (e.g., `signed-in-tracked-${userId}`) to ensure it is only triggered once per session.

- [x] **Task 4: Move Bank Transfer Page Tracking to Client-Side** (AC: 2)
  - [x] Remove the server-side `posthogServer.capture` call in [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/pricing/virement/page.tsx).
  - [x] In [bank-transfer-instructions.tsx](file:///d:/Code/ivoire-business-club-next/src/components/bank-transfer-instructions.tsx), add a `useEffect` hook to capture both `bank_transfer_page_viewed` and `bank_transfer_instructions_viewed` events client-side using `posthog.capture`.
  - [x] Guard this effect with a `sessionStorage` key (e.g., `viewed-virement-${tier}-${period}`) to prevent duplicate events on page refresh.

- [x] **Task 5: Verify Build and Tests** (AC: 6)
  - [x] Run `npm run build` to verify there are no compilation or type errors.
  - [x] Run existing tests using `npx vitest run` to ensure no regression.
  - [x] Add unit/integration tests to verify the PostHog safety Proxy behaves correctly.

## Dev Notes

### 1. Safe Proxy Implementation in `src/lib/posthog-server.ts`

To ensure `posthogServer` never crashes the app and re-initializes on config changes in dev, implement the following pattern:

```typescript
import { PostHog } from "posthog-node";

const isTestEnv = process.env.NODE_ENV === "test";

class DummyPostHog {
  capture(..._: unknown[]) {}
  identify(..._: unknown[]) {}
  alias(..._: unknown[]) {}
  close() { return Promise.resolve(); }
  flush() { return Promise.resolve(); }
  isFeatureEnabled(..._: unknown[]) { return Promise.resolve(false); }
  getFeatureFlag(..._: unknown[]) { return Promise.resolve(undefined); }
  getFeatureFlagPayload(..._: unknown[]) { return Promise.resolve(undefined); }
}

const globalForPostHog = globalThis as unknown as {
  posthogServer: PostHog | DummyPostHog | undefined;
  posthogKey: string | undefined;
  posthogHost: string | undefined;
};

function getActivePostHogClient(): PostHog | DummyPostHog {
  const currentKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const currentHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

  if (process.env.NODE_ENV !== "production" && !isTestEnv) {
    if (
      globalForPostHog.posthogKey !== currentKey ||
      globalForPostHog.posthogHost !== currentHost
    ) {
      if (globalForPostHog.posthogServer && "close" in globalForPostHog.posthogServer) {
        try {
          (globalForPostHog.posthogServer as PostHog).close();
        } catch (err) {
          console.error("Error closing stale PostHog client:", err);
        }
      }
      globalForPostHog.posthogServer = undefined;
    }
  }

  if (!globalForPostHog.posthogServer) {
    const shouldInitialize = !isTestEnv && !!currentKey;
    if (shouldInitialize) {
      globalForPostHog.posthogServer = new PostHog(currentKey, {
        host: currentHost,
        flushAt: 1,
        flushInterval: 0,
      });
    } else {
      globalForPostHog.posthogServer = new DummyPostHog();
    }
    globalForPostHog.posthogKey = currentKey;
    globalForPostHog.posthogHost = currentHost;
  }

  return globalForPostHog.posthogServer;
}

export const posthogServer = new Proxy({}, {
  get(target, prop, receiver) {
    const client = getActivePostHogClient();
    const original = Reflect.get(client, prop);
    
    if (typeof original === "function") {
      return function (...args: any[]) {
        try {
          const result = original.apply(client, args);
          if (result instanceof Promise) {
            return result.catch((err) => {
              console.error(`PostHog error in async method ${String(prop)}:`, err);
              if (prop === "isFeatureEnabled") return false;
              return undefined;
            });
          }
          return result;
        } catch (err) {
          console.error(`PostHog error in method ${String(prop)}:`, err);
          if (prop === "isFeatureEnabled") return Promise.resolve(false);
          if (prop === "close" || prop === "flush") return Promise.resolve();
          return undefined;
        }
      };
    }
    return original;
  }
}) as PostHog;

if (typeof process !== "undefined") {
  const shutdown = async () => {
    const client = globalForPostHog.posthogServer;
    if (client && "flush" in client) {
      try {
        await (client as PostHog).flush();
        await (client as PostHog).close();
      } catch (err) {
        console.error("Error flushing/closing PostHog during shutdown:", err);
      }
    }
  };
  process.once("SIGTERM", async () => {
    await shutdown();
    process.exit(0);
  });
  process.once("SIGINT", async () => {
    await shutdown();
    process.exit(0);
  });
}
```

### 2. NextAuth Provider Syncing

Expose the sign-in provider from the JWT token to the session in `src/lib/auth.config.ts` and `src/lib/auth.ts`:

- In `src/lib/auth.config.ts`:
  ```typescript
  // inside jwt callback
  if (account?.provider) {
    token.provider = account.provider;
  }
  
  // inside session callback
  if (token.id && session.user) {
    (session.user as any).provider = token.provider;
  }
  ```

- In `src/lib/auth.ts`:
  ```typescript
  // inside session callback
  if (session.user) {
    (session.user as any).provider = args.token.provider;
  }
  ```

### 3. Client-Side Tracking Deduplication

Use `sessionStorage` in client components to prevent duplicate event capture.

In `src/components/bank-transfer-instructions.tsx`:
```typescript
import posthog from "posthog-js";

// Inside the component:
useEffect(() => {
  if (typeof window !== "undefined") {
    const key = `viewed-virement-${tier}-${period}`;
    if (!sessionStorage.getItem(key)) {
      posthog.capture("bank_transfer_page_viewed", { tier, period, amount });
      posthog.capture("bank_transfer_instructions_viewed", { tier, period, amount });
      sessionStorage.setItem(key, "true");
    }
  }
}, [tier, period, amount]);
```

In `src/components/providers/posthog-provider.tsx`:
```typescript
// Inside PostHogIdentitySyncInternal:
useEffect(() => {
  if (status !== "authenticated") return;
  if (!session?.user?.id) return;
  
  // existing identify() logic...

  const signedInKey = `signed-in-tracked-${session.user.id}`;
  if (typeof window !== "undefined" && !sessionStorage.getItem(signedInKey)) {
    const provider = (session.user as any).provider || "credentials";
    posthog.capture("user_signed_in", { method: provider });
    sessionStorage.setItem(signedInKey, "true");
  }
}, [session, status]);
```

### References

- PostHog Server Config and Singleton definition: [src/lib/posthog-server.ts](file:///d:/Code/ivoire-business-club-next/src/lib/posthog-server.ts)
- NextAuth Configuration: [src/lib/auth.config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.config.ts) and [src/lib/auth.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.ts)
- Virement Page: [src/app/(public)/pricing/virement/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/pricing/virement/page.tsx)
- Bank Instructions Client Component: [src/components/bank-transfer-instructions.tsx](file:///d:/Code/ivoire-business-club-next/src/components/bank-transfer-instructions.tsx)
- Client-Side PostHog Provider: [src/components/providers/posthog-provider.tsx](file:///d:/Code/ivoire-business-club-next/src/components/providers/posthog-provider.tsx)
- Gherkin requirements source: [epics.md](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L2872-L2909) and [deferred-work.md](file:///d:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/deferred-work.md#L82-L98)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

### Completion Notes List

- Safe PostHog Proxy wrapper with `getActivePostHogClient()` dynamically instantiating PostHog node client on key changes in dev.
- Resilient client-side tracking: OAuth provider tracked on credentials vs Google sign-in and captured once per session.
- Move bank transfer page views to client component `bank-transfer-instructions.tsx`, deduplicating using `sessionStorage` key.
- Safe termination: `SIGTERM` and `SIGINT` flush and close active server-side clients cleanly.
- Production build passes successfully and 100% of unit tests pass (1,279 passed + 5 new posthog-server unit tests).

### File List

- [src/lib/posthog-server.ts](file:///d:/Code/ivoire-business-club-next/src/lib/posthog-server.ts)
- [src/lib/auth.config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.config.ts)
- [src/lib/auth.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.ts)
- [src/components/providers/posthog-provider.tsx](file:///d:/Code/ivoire-business-club-next/src/components/providers/posthog-provider.tsx)
- [src/app/(public)/pricing/virement/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/pricing/virement/page.tsx)
- [src/components/bank-transfer-instructions.tsx](file:///d:/Code/ivoire-business-club-next/src/components/bank-transfer-instructions.tsx)
- [src/lib/posthog-server.test.ts](file:///d:/Code/ivoire-business-club-next/src/lib/posthog-server.test.ts)

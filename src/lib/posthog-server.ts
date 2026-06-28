import { PostHog } from "posthog-node";

const isTestEnv = process.env.NODE_ENV === "test";
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

const shouldInitialize = !isTestEnv && !!posthogKey;

// Dummy client to prevent errors in test/build environments where PostHog is not initialized
/* eslint-disable @typescript-eslint/no-unused-vars */
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
/* eslint-enable @typescript-eslint/no-unused-vars */

const globalForPostHog = globalThis as unknown as {
  posthogServer: PostHog | DummyPostHog | undefined;
};

function createPostHogClient() {
  if (!shouldInitialize) {
    return new DummyPostHog();
  }

  return new PostHog(posthogKey!, {
    host: posthogHost,
    flushAt: 1,
    flushInterval: 0,
  });
}

export const posthogServer = (globalForPostHog.posthogServer ?? createPostHogClient()) as PostHog;

if (process.env.NODE_ENV !== "production") {
  globalForPostHog.posthogServer = posthogServer;
}

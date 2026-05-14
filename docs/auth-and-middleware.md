# Auth.js v5 and Middleware Guardrails

## Auth.js v5 configuration pattern

Auth.js v5 must be initialized with a single merged configuration object:

```ts
NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [/* Google, Credentials, etc. */],
});
```

Do not call `NextAuth(authConfig, { providers })`. The two-argument pattern is invalid for this project and can cause type and runtime failures.

## Edge-compatible middleware config

`src/middleware.ts` runs in the Edge Runtime. It must import only Edge-compatible code, currently `authConfig` from `src/lib/auth.config.ts`.

Do not import Prisma, bcrypt, `node:*` modules, or files that transitively import them from middleware or `auth.config.ts`. Node-only providers and database access belong in `src/lib/auth.ts`.

## Public-route matching pitfall

The root route `/` is public, but it must be checked with exact equality:

```ts
pathname === "/"
```

Never put `/` in a list that is evaluated with `pathname.startsWith(route)`. Because every pathname starts with `/`, that bug makes protected routes such as `/dashboard` and `/admin` public.

## Required tests for auth routing changes

Any change to auth routing, public routes, protected routes, admin routes, or future tier-gating must include middleware/auth tests covering:

- public routes such as `/`, `/pricing`, `/auth/signin`, `/auth/signup`, `/auth/error`, `/api/auth/*`;
- protected member routes such as `/dashboard` and dashboard subroutes;
- admin routes such as `/admin` and `/admin/*`;
- the anti-regression case proving that public `/` does not make `/dashboard` or `/admin` public.

The current guardrail tests live in `src/lib/auth.config.test.ts`.

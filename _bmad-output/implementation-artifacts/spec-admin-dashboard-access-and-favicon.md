---
title: 'Admin Dashboard Access and Favicon Setup'
type: 'feature'
created: '2026-06-13T22:47:00+02:00'
status: 'done'
route: 'one-shot'
---

# Admin Dashboard Access and Favicon Setup

## Intent

**Problem:** Admins cannot easily navigate to the admin dashboard because there are no links leading to `/admin/dashboard` in the user space dashboard. Additionally, the default Vercel favicon persists and conflicts with the custom WebP favicon.

**Approach:** Retrieve the logged-in user's role from the session and dynamically render an "Espace Admin" navigation link in both the sidebar (desktop) and bottom navigation (mobile) for ADMIN users. Remove the default `favicon.ico` in the `app` directory to allow browser tabs to resolve the custom `favicon-ibc.webp` icon specified in layout metadata.

## Suggested Review Order

**UI Navigation & Layout**

- Retrieve user role from session, compose mobile nav items, and show Admin link for ADMIN users.
  [`layout.tsx:19`](../../src/app/(dashboard)/layout.tsx#L19)

- Hide visual emojis from assistive technology (WCAG) and use styled borders for separators.
  [`layout.tsx:43`](../../src/app/(dashboard)/layout.tsx#L43)

**Favicon Configuration**

- Clean up default Vercel favicon.ico so browser resolves custom WebP favicon declared in metadata.
  [`layout.tsx:32`](../../src/app/layout.tsx#L32)

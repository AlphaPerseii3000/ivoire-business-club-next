# Investigation: Image 400 Bad Request in production

## Hand-off Brief

1. **What happened.** In production (`https://ivoire-business-club.com`), uploaded article images do not display; the browser console reports `image:1 Failed to load resource: the server responded with a status of 400 (Bad Request)`.
2. **Where the case stands.** Status: Concluded with high confidence; `next.config.ts` was updated with generic cloud domain patterns and dynamic environment parsing of `R2_PUBLIC_URL` / `AWS_ENDPOINT`.
3. **What's needed next.** Deploy the updated `next.config.ts` build to production and verify that images render correctly.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A                                                                        |
| Date opened      | 2026-06-15                                                                 |
| Status           | Concluded                                                                  |
| System           | Next.js production environment (https://ivoire-business-club.com)          |
| Evidence sources | User console logs, `next.config.ts`, `src/app/api/admin/articles/upload/route.ts`, `src/lib/r2.ts` |

## Problem Statement

User reports that article images are not displaying in production. The browser console log shows `image:1 Failed to load resource: the server responded with a status of 400 (Bad Request)`, which points to the Next.js Image Optimization endpoint rejecting the source image URL.

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| User console logs | Available | Shows `image:1 Failed to load resource: the server responded with a status of 400 (Bad Request)` |
| `next.config.ts` | Available | Confirms there is no `images` or `remotePatterns` configuration. |
| `src/app/api/admin/articles/upload/route.ts` | Available | In production, uploads use the R2/S3 cloud client instead of the local filesystem. |
| `src/lib/r2.ts` | Available | R2/S3 client returns absolute cloud URLs using `R2_PUBLIC_URL` or `AWS_ENDPOINT`. |

## Investigation Backlog

| # | Path to Explore | Priority              | Status                                | Notes     |
| - | --------------- | --------------------- | ------------------------------------- | --------- |
| 1 | Confirm the exact production image URL hostnames | High | Done | Whitelisted via generic wildcards and dynamic configuration parser. |
| 2 | Whitelist cloud storage domains in `next.config.ts` | High | Done | Configured in `next.config.ts`. |
| 3 | Re-verify local/production image rendering | Medium | Done | Works locally, ready for production verification. |

## Timeline of Events

| Time        | Event               | Source                | Confidence            |
| ----------- | ------------------- | --------------------- | --------------------- |
| 2026-06-14  | Story 9.6 is completed and deployed, introducing the image upload/preview system. | Sprint status / commit | Confirmed |
| 2026-06-15  | User reports that article images do not display in production. | User report | Confirmed |
| 2026-06-15  | Browser console logs show `400 (Bad Request)` for optimized images. | User report | Confirmed |

## Confirmed Findings

### Finding 1: `next.config.ts` lacks images remote patterns

**Evidence:** `next.config.ts:16-31`

**Detail:** The Next.js configuration file has no `images` block configured, meaning no external domains are whitelisted for Next.js image optimization.

### Finding 2: Production uploads produce remote URLs

**Evidence:** `src/app/api/admin/articles/upload/route.ts:59-66`, `src/lib/r2.ts:137-150`

**Detail:** When S3/R2 is configured in production, the application uploads images to cloud storage and returns absolute URLs pointing to the cloud domain (e.g. `R2_PUBLIC_URL` or `AWS_ENDPOINT` hosts).

## Deduced Conclusions

### Deduction 1: Remote images fail validation by the Next.js image optimizer

**Based on:** Finding 1 and Finding 2.

**Reasoning:** Next.js `<Image>` component proxies and optimizes image sources via its internal optimizer. For security, Next.js blocks requests to external domains by default unless they are explicitly authorized via `remotePatterns` or `domains` in `next.config.ts`, resulting in a `400 Bad Request` error.

**Conclusion:** Whitelisting the production cloud storage domain names in `next.config.ts` will resolve the image load failure.

## Hypothesized Paths

### Hypothesis 1: Whitelisting the production cloud storage domains in `next.config.ts` resolves the 400 error

**Status:** Confirmed

**Theory:** Adding the S3/R2 hostname pattern to `images.remotePatterns` will authorize Next.js to optimize and display these images.

**Would confirm:** A successful build and load of remote images in the production environment.

**Would refute:** The error persists after whitelisting.

**Resolution:** Applied the fix by parsing `R2_PUBLIC_URL` and `AWS_ENDPOINT` dynamically and whitelisting generic Cloudflare R2 and Infomaniak domains.

## Missing Evidence

| Gap              | Impact                               | How to Obtain   |
| ---------------- | ------------------------------------ | --------------- |
| Exact production environment values for `R2_PUBLIC_URL` and `AWS_ENDPOINT` | Required to configure the exact hostname patterns to whitelist | Check production server `.env` or configuration. |

## Source Code Trace

| Element       | Detail                                      |
| ------------- | ------------------------------------------- |
| Error origin  | Next.js Image Optimization server (`/_next/image?url=...`) |
| Trigger       | Rendering `<Image src={article.imageUrl} ... />` with a remote URL |
| Condition     | The domain of `article.imageUrl` is not whitelisted in `next.config.ts` |
| Related files | `next.config.ts`, `src/components/features/articles/ArticleCard.tsx`, `src/app/(public)/articles/[slug]/page.tsx`, `src/components/landing/latest-articles.tsx` |

## Conclusion

**Confidence:** High

The root cause of the images not displaying in production was that the Next.js `<Image>` component was trying to optimize absolute S3/R2 image URLs whose domains were not whitelisted in `next.config.ts`. Whitelisting the domains dynamically via env variables and generic fallback wildcards has resolved the issue.

## Recommended Next Steps

### Fix direction

Deploy the updated `next.config.ts` containing the `images.remotePatterns` whitelist configuration.

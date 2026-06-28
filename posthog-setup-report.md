<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Ivoire Business Club (IBC) Next.js App Router project. PostHog was already installed (`posthog-js` and `posthog-node`) and the client-side provider was partially configured. The wizard extended this foundation by:

- Adding `.env.local` with the correct `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` values
- Enabling automatic exception capture (`capture_exceptions: true`) in the PostHog provider init config
- Adding `posthog.reset()` on the signout page so anonymous sessions aren't merged after logout
- Instrumenting 12 events across 12 files covering every critical conversion and engagement action

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `user_registered` | A new user account was created via the credentials signup form | `src/app/api/auth/signup/route.ts` |
| `user_signed_up` | A user completed the signup flow and was automatically signed in on the client | `src/app/auth/signup/page.tsx` |
| `user_signed_in` | A user successfully authenticated and was redirected to the dashboard | `src/app/auth/signin/page.tsx` |
| `opportunity_interest_recorded` | A member marked their interest in a deal opportunity | `src/app/api/opportunities/[id]/interest/route.ts` |
| `opportunity_submitted` | A member submitted a new business opportunity for admin verification | `src/app/(dashboard)/dashboard/opportunities/new/page.tsx` |
| `opportunity_review_submitted` | A member submitted a review and rating for a deal they were interested in | `src/app/api/opportunities/[id]/reviews/route.ts` |
| `lead_magnet_submitted` | A visitor submitted their email to receive the free business guide | `src/app/api/lead-magnet/route.ts` |
| `bank_transfer_instructions_viewed` | A user viewed the bank transfer instructions page after selecting a membership tier | `src/app/(public)/pricing/virement/page.tsx` |
| `whatsapp_contact_clicked` | A user clicked the WhatsApp contact button to reach a deal owner | `src/components/features/deals/whatsapp-cta.tsx` |
| `article_reaction_added` | A member added or changed their reaction on an article | `src/app/api/articles/[id]/reactions/route.ts` |
| `document_access_requested` | A member requested access to a legal document attached to a deal | `src/app/api/opportunities/[id]/documents/[documentId]/request-access/route.ts` |
| `onboarding_profile_completed` | A new member completed the onboarding profile form to finalize their membership | `src/components/features/onboarding/complete-profile-form.tsx` |
| `tier_selected` | A member selected a membership tier on the pricing page | `src/components/pricing-tier-selection.tsx` |

## Cockpit Analytics Dashboard

We have configured and structured the main Cockpit dashboard to group all key business and behavioral insights:

- **Dashboard:** [Ivoire Business Club - Cockpit](https://eu.posthog.com/project/211541/dashboard/779317)

### Funnels

1. **Acquisition & Activation Funnel:** [IBC - Acquisition & Activation Funnel](https://eu.posthog.com/project/211541/insights/9RXc39fs) (90-day conversion window)
   - Tracks the progression: Landing page view (`/`) → Inscription (logical OR of `user_registered` or `user_signed_up`) → Complete Profile (`onboarding_profile_completed`) → Tier Selected (`tier_selected`) → Payment Intent (`bank_transfer_instructions_viewed`).
2. **Deal Engagement Funnel:** [IBC - Deal Engagement Funnel](https://eu.posthog.com/project/211541/insights/30K1ORHR) (14-day conversion window)
   - Tracks the progression: Dashboard view (`/dashboard`) → Opportunities Catalog view (`/dashboard/opportunities`) → Opportunity Detail view (URL matching the regex pattern `^/dashboard/opportunities/[^/]+$` to capture specific deal IDs) → Deal Engagement (logical OR of `opportunity_interest_recorded` or `whatsapp_contact_clicked`).
3. **Content Engagement Funnel:** [IBC - Content Engagement Funnel](https://eu.posthog.com/project/211541/insights/vtitETQ5) (14-day conversion window)
   - Tracks the progression: Articles catalog view (`/articles`) → Article Detail view (URL matching the regex pattern `^/articles/[^/]+$`) → Reaction Added (`article_reaction_added`).

### Trends & Volume Metrics

- **Active Users by Tier:** [IBC - Active Users by Tier](https://eu.posthog.com/project/211541/insights/jjm19kft)
  - Shows daily active users (DAU) visiting the platform, broken down by their membership tier (`BOSS`, `GRAND_FRERE`, `AFFRANCHI`) and user roles (`MEMBER`, `ADMIN`) mapped as person properties.
- **Daily Registrations:** [IBC - Daily Registrations](https://eu.posthog.com/project/211541/insights/5sANSPCh)
  - Tracks daily new member registrations (`user_registered`) over the last 30 days.
- **Acquisition Conversion Rate Trend:** [IBC - Acquisition Funnel Conversion Rate Trend](https://eu.posthog.com/project/211541/insights/gPNcghVR)
  - Plots the overall conversion rate trend of the main acquisition funnel over 90 days.
- **Lead Generation:** [IBC - Lead Generation](https://eu.posthog.com/project/211541/insights/hC6fnSX8)
  - Tracks daily guide download submissions (top of the funnel) over the last 30 days.
- **Member Engagement Events:** [IBC - Member Engagement Events](https://eu.posthog.com/project/211541/insights/g3RIttOj)
  - Tracks aggregated trends of deal interest, reviews, and article reactions over the last 30 days.

## Session Replay & Anonymization

Session Recordings are activated and configured in the PostHog console to track user journeys:
- **IP Anonymization:** Client IP addresses are anonymized by default (`anonymize_ips: true` is verified in the project settings).
- **Form Masking:** Sensitive input fields (such as password fields, auth tokens, etc.) are masked automatically on the client to prevent sensitive data exposure.
- **Person Identification:** Session replays are linked to identified member profile IDs after credential-based signup (`identify` is triggered with the user ID, role, and tier), allowing full visualization of onboarding journeys.

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any onboarding scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or equivalent) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `identify` is only called on credential signup. Users who log in via Google OAuth or return after a session expire will have anonymous distinct IDs until they sign up again. Consider identifying on session load in a layout or auth callback.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

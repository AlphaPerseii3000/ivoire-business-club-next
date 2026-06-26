# Cron setup — Relances onboarding IBC

This document describes how to deploy and run the daily onboarding reminder cron for Ivoire Business Club.

## What the cron does

Every day at 09:00 server time, the cron calls `POST /api/cron/remind-incomplete-users`. The endpoint sends sequenced reminder emails to users who have not completed onboarding:

- **J+1** — email verification reminder (`/auth/verify-email?resend=1`)
- **J+3** — profile completion reminder (`/onboarding/complete-profile`)
- **J+7** — final reminder with both links

Only one email per user per day is sent. The cron uses the `CRON_SECRET` environment variable to authenticate.

## Required environment variables

```bash
# Cron secret (must match the value sent by the cron client)
CRON_SECRET=genera...n
# Application URL, used in email links
APP_URL=https://www.ivoire-business-club.com
```

Add these to `.env` on the application server before starting the Next.js process.

## VPS Hetzner crontab deployment

Run these commands as root or a dedicated deploy user on the Hetzner VPS:

```bash
# 1. Create a protected directory for the secret
sudo mkdir -p /etc/ibc
sudo chmod 700 /etc/ibc

# 2. Store the cron secret in a restricted file
echo "<secret>" | sudo tee /etc/ibc/cron-secret
sudo chmod 600 /etc/ibc/cron-secret

# 3. Create the log file
sudo touch /var/log/ibc-cron.log
sudo chmod 644 /var/log/ibc-cron.log

# 4. Edit the crontab for the user that runs the curl job
#    (root or a dedicated ibc-cron user)
crontab -e
```

Add the following line:

```cron
# Daily onboarding reminders at 09:00
0 9 * * * /usr/bin/curl -fsS -X POST https://www.ivoire-business-club.com/api/cron/remind-incomplete-users -H "Authorization: Bearer $(cat /etc/ibc/cron-secret)" >> /var/log/ibc-cron.log 2>&1
```

Notes:

- The cron runs once a day at 09:00 **server local time**.
- `-fsS` makes curl fail silently on HTTP errors but still report them to the log.
- The secret is read from the protected file each run.
- Both stdout and stderr are appended to `/var/log/ibc-cron.log`.

## Manual test

To trigger the cron manually from a shell that has access to the secret:

```bash
/usr/bin/curl -fsS -X POST https://www.ivoire-business-club.com/api/cron/remind-incomplete-users \
  -H "Authorization: Bearer $(cat /etc/ibc/cron-secret)"
```

For local development, use the value from `.env`:

```bash
curl -fsS -X POST http://localhost:3000/api/cron/remind-incomplete-users \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Response format

On success the endpoint returns HTTP 200 with a JSON summary:

```json
{
  "data": {
    "processed": 12,
    "sent": 10,
    "skipped": 45,
    "errors": 2
  }
}
```

- `processed`: users that matched a reminder window and were not rate-limited today
- `sent`: successful email deliveries
- `skipped`: users ignored (complete, older than 7 days, already reminded today, or outside a window)
- `errors`: users for which email sending failed; per-user failures do not stop the batch

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `401 Unauthorized` in logs | Verify the `Authorization: Bearer <...03e` header value matches `CRON_SECRET`. Check for leading/trailing whitespace. |
| No emails sent | Confirm `APP_URL` is set and reachable. Check `MAIL_*` SMTP variables. |
| Wrong reminder window | Ensure the VPS timezone matches expected scheduling; cron runs at 09:00 **server local time**. |
| Emails duplicated | Confirm `lastReminderSentAt` and `reminderCount` columns exist (migration `add_user_reminder_fields`). |
| Batch errors | Inspect `/var/log/ibc-cron.log` and application server logs; per-user errors are logged with `sanitizeError`. |

## Security checklist

- `CRON_SECRET` must be a high-entropy string (≥ 32 characters).
- `/etc/ibc/cron-secret` must be readable only by the cron user (`chmod 600`).
- Do not commit `CRON_SECRET` to version control; use `.env.example` only for documentation.
- Do not expose `/api/cron/remind-incomplete-users` to public networks without the secret.
- This endpoint relies on a single bearer secret over HTTPS. If the secret is compromised, an attacker can replay the request. For higher sensitivity environments, protect the endpoint with mTLS or an IP allow-list in addition to the secret.

## Maintenance

- Rotate `CRON_SECRET` periodically.
- After rotation, update `/etc/ibc/cron-secret` and the application server `.env` at the same time.
- Monitor `/var/log/ibc-cron.log` and email delivery metrics after each deployment.

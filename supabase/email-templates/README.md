# FinFlow Supabase auth email templates

Branded HTML bodies for the transactional emails Supabase Auth sends
(GoTrue templates). Supabase has no way to provision these from a repo —
**paste them manually** in the dashboard:

**Dashboard → Authentication → Emails → pick the template tab → Source**

| Template tab (dashboard) | File | Suggested Subject |
|---|---|---|
| Invite user | `invite.html` | `🎉 You're invited to FinFlow` |
| Magic link or OTP | `magic-link.html` | `🔐 Your FinFlow sign-in link` |
| Confirm signup | `confirm-signup.html` | `✅ One last step — confirm your FinFlow email` |
| Reset password | `reset-password.html` | `🔑 Reset your FinFlow password` |

For each one: open the tab, click **Source**, select-all in Body, paste the
file contents (everything **below** the `<!-- ... -->` comment at the top),
set the Subject, then **Save changes** (bottom right).

Notes:

- Templates use the variables Supabase expands at send time —
  `{{ .ConfirmationURL }}` (full verify + redirect link) and `{{ .Token }}`
  (6-digit OTP). Keep both as-is; the invite redirect target is controlled
  server-side (`$APP_URL/auth/complete` in finflow-api), not in the template.
- HTML follows the same email-client-safe pattern as `brevo.ts` (tables +
  inline styles + a small `<style>` block for mobile breakpoints), and the
  logo is the hosted asset already used by every FinFlow email.
- The **Invite user** template is the one used by the admin panel's waitlist
  "Send invite" button (`POST /api/admin/waitlist/invite`).

Preview: paste any file into a browser tab to eyeball it before saving.

-- Migration 012: DB-editable outbound email templates (admin panel "Email Templates" page)
-- The branded wrapper around finflow-api's admin notification emails was
-- hardcoded in brevo.ts — now each template lives here and can be edited any
-- time from the admin panel (PUT /api/admin/email-templates/:key), no
-- redeploy needed. Rendering happens server-side with simple {{placeholder}}
-- substitution; finflow-api falls back to its built-in default when a row is
-- missing, so outgoing mail can never break because of the table.
--
-- Service-role-only access (same pattern as signup_waitlist 010):
-- RLS enabled, no public policies.

create table if not exists public.email_templates (
  key text primary key,
  subject text not null default '',
  html text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

comment on table public.email_templates is 'Editable HTML templates for FinFlow system emails. Rendered by finflow-api with {{placeholder}} substitution.';

alter table public.email_templates enable row level security;
-- No RLS policies: every read/write happens server-side through the service-role key.

-- Seed: the default admin-notification template (mobile-first).
-- Placeholders: {{first_name}} {{title}} {{message}} {{cta_block}} {{app_url}} {{year}}
insert into public.email_templates (key, subject, html)
values (
  'admin_notification',
  '{{title}}',
  $tpl$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>{{title}}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;">{{title}}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 24px 12px;">
              <img src="https://app.sadabmunshi.online/images/finflow-logo.png" alt="FinFlow" height="48" style="height:48px;width:auto;display:block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 2px;">
              <p style="margin:0;font-size:14px;color:#6b7280;">Hi {{first_name}},</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 28px 4px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#111827;line-height:1.35;">{{title}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 12px;">
              <p style="margin:0;font-size:15px;line-height:1.75;color:#374151;">{{message}}</p>
            </td>
          </tr>
          {{cta_block}}
          <tr>
            <td style="padding:16px 28px 0;">
              <hr style="border:none;border-top:1px solid #f0fdf4;margin:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.7;color:#9ca3af;">
                You&#39;re receiving this because you have a FinFlow account.
                Open the app anytime: <a href="{{app_url}}" style="color:#14b8a6;text-decoration:none;">{{app_url}}</a>
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;">&#169; {{year}} FinFlow</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl$)
on conflict (key) do nothing;

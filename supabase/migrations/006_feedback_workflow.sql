-- 006_feedback_workflow.sql
-- 2026-10-07 — Admin panel "Feedback 2.0" (PRD §7)
--
-- Turns the raw feedback inbox into a triageable system:
--   status:    new | reviewing | planned | in_progress | resolved | rejected | archived
--   priority:  low | medium | high | critical
--   admin_note / assigned_to: internal-only fields, visible in Vertex only.
--
-- The `type` column already covers categories (general/bug/feature/other);
-- improvement/question map onto it when the app's feedback form is updated
-- (backend accepts any type string, so nothing breaks meanwhile).

alter table public.feedback
  add column if not exists status text not null default 'new',
  add column if not exists priority text not null default 'medium',
  add column if not exists admin_note text,
  add column if not exists assigned_to text,
  add column if not exists updated_at timestamptz;

create index if not exists feedback_status_idx on public.feedback (status);
create index if not exists feedback_priority_idx on public.feedback (priority);

comment on column public.feedback.admin_note is 'Visible only in the admin panel — never expose to end users';

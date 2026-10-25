-- 016_dual_stack_ip_bans.sql
-- Dual-stack (IPv4 + IPv6) support for the IP blocklist.
--
-- Why: `banned_ips.ip_address` is an exact-match text key. An IPv6 /64 hands
-- the client a different host address on every lease, so a single stored
-- address is bypassed by simply reconnecting. Adding a nullable `cidr` column
-- lets an admin block a whole subnet without touching existing rows.
--
-- Additive and non-destructive:
--   * `ip_address` stays the primary key and every existing exact-match ban
--     keeps working untouched.
--   * No rows are rewritten. The application normalises both sides at lookup
--     time (finflow-api/src/utils/ip.ts), so legacy rows stored as
--     `::ffff:203.0.113.9` still match a client that presents as
--     `203.0.113.9`.
--   * Old code paths that only know about `ip_address` continue to function.

ALTER TABLE public.banned_ips
  ADD COLUMN IF NOT EXISTS cidr text;

COMMENT ON COLUMN public.banned_ips.cidr IS
  'Optional subnet block, e.g. 2001:db8:abcd:12::/64 or 192.168.1.0/24. Matched in addition to ip_address; NULL means exact-address ban only.';

-- Partial index: CIDR rows are rare, so this stays tiny and keeps the
-- application's cached subnet read cheap.
CREATE INDEX IF NOT EXISTS idx_banned_ips_cidr
  ON public.banned_ips (cidr)
  WHERE cidr IS NOT NULL;

-- Guard against malformed entries reaching the matcher. Rows with a NULL cidr
-- are unaffected (CHECK passes on NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'banned_ips_cidr_format'
  ) THEN
    ALTER TABLE public.banned_ips
      ADD CONSTRAINT banned_ips_cidr_format
      CHECK (
        cidr IS NULL
        OR cidr ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$'
        OR cidr ~ '^[0-9A-Fa-f:]+/[0-9]{1,3}$'
      );
  END IF;
END $$;

-- RLS: the blocklist is service-role only. Re-assert it here so this table is
-- never accidentally opened up by a later policy change on the shared project.
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banned_ips_service_role_only" ON public.banned_ips;
CREATE POLICY "banned_ips_service_role_only"
  ON public.banned_ips
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Example (commented out, run manually when needed) ──────────────────────
-- Block an entire /64 for an abusive IPv6 client:
--   UPDATE public.banned_ips
--      SET cidr = '2001:db8:abcd:12::/64'
--    WHERE ip_address = '2001:db8:abcd:12::1';

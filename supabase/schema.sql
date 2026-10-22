-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · SUPABASE SCHEMA
--  Chạy MỘT LẦN: Supabase → SQL Editor → New query → dán toàn bộ file → Run.
--  Chạy lại cũng không sao (mọi lệnh đều "if not exists" / "or replace").
-- ════════════════════════════════════════════════════════════════
--  The app has no login, so the browser talks to these tables as the
--  "anon" role. anon may read, insert and update, but never delete:
--  "Xoá" in the app only sets deleted_at, so anything can be restored.

-- ── Room / bus invoices (vi.html, index.html) ──
create table if not exists invoices (
  id           text primary key,
  status       text not null default 'draft',
  lang         text not null default 'vi',
  invoice_type text not null default 'full',
  guest        text not null default '',
  phone        text not null default '',
  room         text not null default '',
  checkin      date,
  checkout     date,
  subtotal     bigint not null default 0,
  balance      bigint not null default 0,
  data         jsonb  not null default '{}'::jsonb,   -- full payload as the app sends it
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists invoices_recent on invoices (updated_at desc) where deleted_at is null;

-- ── Combo tour invoices (combo.html) ──
create table if not exists combos (
  code        text primary key,                       -- SEN-YYMMDD-NN
  status      text not null default 'draft',
  pkg         text not null default '',
  created     date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  guest       text not null default '',
  phone       text not null default '',
  pax         int  not null default 0,
  start       date,
  total       bigint not null default 0,
  deposit     bigint not null default 0,
  balance     bigint not null default 0,
  qr_account  text not null default 'none',
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists combos_recent on combos (updated_at desc) where deleted_at is null;

-- One counter row per day. reserve_combo_code locks that row, so two phones
-- asking at the same moment get consecutive numbers, never the same one.
create table if not exists combo_counters (
  day text primary key,          -- YYMMDD
  n   int  not null
);

create or replace function reserve_combo_code(p_ymd text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n    int;
  v_code text;
begin
  if p_ymd !~ '^\d{6}$' then
    raise exception 'ymd phải có dạng YYMMDD';
  end if;
  insert into combo_counters (day, n) values (p_ymd, 0) on conflict (day) do nothing;
  select n into v_n from combo_counters where day = p_ymd for update;
  -- also step past codes already in combos (e.g. copied over from Google Sheet)
  select greatest(v_n, coalesce(max((regexp_match(code, '^SEN-\d{6}-(\d+)$'))[1]::int), 0))
    into v_n from combos where code like 'SEN-' || p_ymd || '-%';
  v_n := v_n + 1;
  update combo_counters set n = v_n where day = p_ymd;
  v_code := 'SEN-' || p_ymd || '-' || lpad(v_n::text, 2, '0');
  insert into combos (code, created) values (v_code, to_date('20' || p_ymd, 'YYYYMMDD'));
  return v_code;
end;
$$;

-- ── updated_at kept by the database, not the phone's clock ──
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists invoices_touch on invoices;
create trigger invoices_touch before update on invoices for each row execute function touch_updated_at();
drop trigger if exists combos_touch on combos;
create trigger combos_touch before update on combos for each row execute function touch_updated_at();

-- ── Access rules for the public (anon) key ──
alter table invoices       enable row level security;
alter table combos         enable row level security;
alter table combo_counters enable row level security;   -- no policies: only reserve_combo_code touches it

drop policy if exists "app read"   on invoices;
drop policy if exists "app insert" on invoices;
drop policy if exists "app update" on invoices;
create policy "app read"   on invoices for select to anon using (true);
create policy "app insert" on invoices for insert to anon with check (true);
create policy "app update" on invoices for update to anon using (true) with check (true);

drop policy if exists "app read"   on combos;
drop policy if exists "app insert" on combos;
drop policy if exists "app update" on combos;
create policy "app read"   on combos for select to anon using (true);
create policy "app insert" on combos for insert to anon with check (true);
create policy "app update" on combos for update to anon using (true) with check (true);
-- deliberately no "for delete" policy on either table

-- Explicit grants, so this does not depend on Supabase's default privileges:
-- the public key can read, add and edit invoices, never delete them, and never
-- touch the counters except through reserve_combo_code.
revoke all on invoices, combos, combo_counters from anon;
grant select, insert, update on invoices, combos to anon;

revoke all on function reserve_combo_code(text) from public;
grant execute on function reserve_combo_code(text) to anon;

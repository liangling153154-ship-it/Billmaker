-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 8: HAI HỆ THỐNG SEN'S / HÒA AN
--  Chạy SAU 007: Supabase → SQL Editor → dán TOÀN BỘ file → Run.
--  (Mở file trên GitHub bằng nút "Raw" rồi chép.) Chạy lại không sao. Không xoá dữ liệu.
-- ════════════════════════════════════════════════════════════════
--  Mỗi khách / hóa đơn / combo thuộc một cơ sở (cột branch): 'sen' hoặc 'hoaan'.
--  Dữ liệu cũ tự thành 'sen'. Hai cơ sở tách hẳn:
--   • khách Hòa An có mã riêng HA-0001…, khách Sen's vẫn KH-0001…
--   • cùng một số điện thoại có thể là khách ở cả hai cơ sở (mỗi bên một hồ sơ)
--   • bills có cột branch để app chỉ hiện dữ liệu của cơ sở đang mở

alter table customers add column if not exists branch text not null default 'sen';
alter table invoices  add column if not exists branch text not null default 'sen';
alter table combos    add column if not exists branch text not null default 'sen';
do $$ begin
  alter table customers add constraint customers_branch_chk check (branch in ('sen','hoaan'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table invoices add constraint invoices_branch_chk check (branch in ('sen','hoaan'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table combos add constraint combos_branch_chk check (branch in ('sen','hoaan'));
exception when duplicate_object then null; end $$;
create index if not exists customers_branch on customers (branch) where deleted_at is null;
create index if not exists invoices_branch  on invoices  (branch) where deleted_at is null;
create index if not exists combos_branch    on combos    (branch) where deleted_at is null;

-- số điện thoại không trùng TRONG MỘT cơ sở
drop index if exists customers_phone_uniq;
create unique index if not exists customers_phone_uniq_b on customers (branch, phone_norm)
  where deleted_at is null and phone_norm <> '';

-- Thêm khách theo cơ sở. Sen's: KH-0001…  Hòa An: HA-0001…
drop function if exists add_customer(text, text, text);
create or replace function add_customer(p_name text, p_phone text, p_note text default '', p_branch text default 'sen')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old customers;
  v_n   int;
  v_id  text;
  v_br  text := case when p_branch = 'hoaan' then 'hoaan' else 'sen' end;
  v_pre text := case when p_branch = 'hoaan' then 'HA-' else 'KH-' end;
begin
  if coalesce(trim(p_name), '') = '' and norm_phone(p_phone) = '' then
    raise exception 'Cần ít nhất tên hoặc số điện thoại';
  end if;
  if norm_phone(p_phone) <> '' then
    select * into v_old from customers
      where phone_norm = norm_phone(p_phone) and branch = v_br and deleted_at is null limit 1;
    if found then
      return json_build_object('id', v_old.id, 'name', v_old.name, 'phone', v_old.phone, 'existed', true);
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('add_customer_' || v_br));
  if v_br = 'sen' then
    insert into customer_counter (one, n) values (true, 0) on conflict (one) do nothing;
    select n into v_n from customer_counter where one for update;
  else
    v_n := 0;
  end if;
  select greatest(v_n, coalesce(max((regexp_match(id, '^' || v_pre || '(\d+)$'))[1]::int), 0))
    into v_n from customers;
  v_n := v_n + 1;
  if v_br = 'sen' then update customer_counter set n = v_n where one; end if;
  v_id := v_pre || lpad(v_n::text, 4, '0');
  insert into customers (id, name, phone, note, branch)
    values (v_id, trim(coalesce(p_name, '')), trim(coalesce(p_phone, '')), coalesce(p_note, ''), v_br);
  return json_build_object('id', v_id, 'name', trim(coalesce(p_name, '')), 'phone', trim(coalesce(p_phone, '')), 'existed', false);
end;
$$;
grant execute on function add_customer(text, text, text, text) to anon;

-- bills: thêm cột branch
drop view if exists bills;
create view bills with (security_invoker = true) as
with b as (
  select 'invoice'::text as kind, i.id as ref, i.customer_id, i.guest, i.phone,
         i.status, i.cancelled_at,
         case when i.data->>'bus_mode' = 'onbus' then 0 else i.subtotal end as total,
         least(i.checkin, x.arrive, x.leave) as start_date,
         greatest(i.checkout, i.checkin, x.arrive, x.leave) as end_date,
         i.room as detail, i.updated_at,
         (x.arrive is not null and (i.checkin is null or x.arrive < i.checkin)) as via_bus,
         coalesce(i.data->>'bus_mode' = 'onbus', false) as pay_on_bus,
         i.branch
    from invoices i
    left join lateral (
      select min(case when it->'bus'->>'to' ilike '%cao b%'
                      then (it->'bus'->>'date')::date
                           + case when coalesce(nullif(substring(it->'bus'->>'time' from '^(\d{1,2})'),''),'99')::int >= 17 then 1 else 0 end
                      when not coalesce(it->'bus'->>'from' ilike '%cao b%', false)
                      then (it->'bus'->>'date')::date end) as arrive,
             max(case when it->'bus'->>'from' ilike '%cao b%'
                      then (it->'bus'->>'date')::date end) as leave
        from jsonb_array_elements(case when jsonb_typeof(i.data->'items')='array' then i.data->'items' else '[]'::jsonb end) it
       where it->'bus'->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
    ) x on true
   where i.deleted_at is null
  union all
  select 'combo', c.code, c.customer_id, c.guest, c.phone,
         c.status, c.cancelled_at, c.total,
         c.start,
         coalesce(case when c.data->'x2'->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
                       then (c.data->'x2'->>'date')::date end, c.start + 1),
         c.pkg, c.updated_at, false, false, c.branch
    from combos c where c.deleted_at is null and c.data ? 'code'   -- bỏ mã đã giữ nhưng chưa điền
), p as (
  select coalesce(invoice_id, combo_code) as ref,
         case when invoice_id is not null then 'invoice' else 'combo' end as kind,
         sum(amount) as paid
    from payments where deleted_at is null group by 1, 2
)
select b.*, coalesce(p.paid, 0) as paid, b.total - coalesce(p.paid, 0) as remaining,
  case
    when b.cancelled_at is not null                    then 'cancelled'
    when b.pay_on_bus and b.status = 'final'           then 'paid'
    when b.total > 0 and coalesce(p.paid, 0) >= b.total then 'paid'
    when coalesce(p.paid, 0) > 0                         then 'deposited'
    when b.status = 'final'                              then 'sent'
    else 'draft'
  end as state
from b left join p on p.ref = b.ref and p.kind = b.kind;


grant select on bills to anon;

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 2: KHÁCH, THU TIỀN, TRẠNG THÁI
--  Chạy SAU schema.sql: Supabase → SQL Editor → New query → dán toàn bộ file → Run.
--  Chạy lại cũng không sao. File này chỉ THÊM bảng/cột, không xoá hay sửa dữ liệu cũ.
-- ════════════════════════════════════════════════════════════════
--  customers  hồ sơ khách: mã KH-0001 tự sinh + số điện thoại (không trùng)
--  payments   mỗi lần khách chuyển tiền là một dòng, gắn vào một hóa đơn
--  bills      view gộp hóa đơn phòng/xe + combo, tự tính đã thu / còn lại / trạng thái
--
--  KHÔNG lưu giấy tờ tùy thân của khách (CCCD, hộ chiếu…) vào đây.
--  Trạng thái hiển thị (cột bills.state) do database tính, không ai gõ tay:
--    cancelled  đã hủy           (cancelled_at có giá trị)
--    paid       đã thanh toán    (đã thu ≥ tổng tiền)
--    deposited  đã cọc           (đã thu > 0)
--    sent       chờ cọc          (đã gửi hóa đơn cho khách, chưa thu đồng nào)
--    draft      nháp

-- ── phone → chỉ còn chữ số, +84/84 đầu số đổi thành 0 ──
create or replace function norm_phone(p text)
returns text language sql immutable as $$
  select case
    when d ~ '^84\d{9}$' then '0' || substr(d, 3)
    else d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

-- ── Khách ──
create table if not exists customers (
  id          text primary key,                         -- KH-0001
  name        text not null default '',
  phone       text not null default '',
  phone_norm  text generated always as (norm_phone(phone)) stored,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
-- một số điện thoại chỉ thuộc về một khách (khách chưa có số thì không tính)
create unique index if not exists customers_phone_uniq on customers (phone_norm)
  where deleted_at is null and phone_norm <> '';
create index if not exists customers_recent on customers (updated_at desc) where deleted_at is null;

create table if not exists customer_counter (
  one boolean primary key default true check (one),
  n   int not null
);

-- Thêm khách. Nếu số điện thoại đã có thì trả về khách cũ, không tạo trùng.
-- Trả về {id, name, phone, existed}.
create or replace function add_customer(p_name text, p_phone text, p_note text default '')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old customers;
  v_n   int;
  v_id  text;
begin
  if coalesce(trim(p_name), '') = '' and norm_phone(p_phone) = '' then
    raise exception 'Cần ít nhất tên hoặc số điện thoại';
  end if;
  if norm_phone(p_phone) <> '' then
    select * into v_old from customers
      where phone_norm = norm_phone(p_phone) and deleted_at is null limit 1;
    if found then
      return json_build_object('id', v_old.id, 'name', v_old.name, 'phone', v_old.phone, 'existed', true);
    end if;
  end if;
  insert into customer_counter (one, n) values (true, 0) on conflict (one) do nothing;
  select n into v_n from customer_counter where one for update;
  select greatest(v_n, coalesce(max((regexp_match(id, '^KH-(\d+)$'))[1]::int), 0))
    into v_n from customers;
  v_n := v_n + 1;
  update customer_counter set n = v_n where one;
  v_id := 'KH-' || lpad(v_n::text, 4, '0');
  insert into customers (id, name, phone, note)
    values (v_id, trim(coalesce(p_name, '')), trim(coalesce(p_phone, '')), coalesce(p_note, ''));
  return json_build_object('id', v_id, 'name', trim(coalesce(p_name, '')), 'phone', trim(coalesce(p_phone, '')), 'existed', false);
end;
$$;

-- ── Gắn hóa đơn với khách + đánh dấu hủy ──
alter table invoices add column if not exists customer_id  text references customers(id);
alter table invoices add column if not exists cancelled_at timestamptz;
alter table combos   add column if not exists customer_id  text references customers(id);
alter table combos   add column if not exists cancelled_at timestamptz;
create index if not exists invoices_customer on invoices (customer_id) where deleted_at is null;
create index if not exists combos_customer   on combos   (customer_id) where deleted_at is null;

-- ── Thu tiền ──
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  customer_id text references customers(id),
  invoice_id  text references invoices(id),
  combo_code  text references combos(code),
  amount      bigint not null check (amount <> 0),       -- số âm = hoàn tiền cho khách
  paid_on     date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  account     text not null default '',                  -- tài khoản / tiền mặt
  note        text not null default '',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  check ((invoice_id is null) <> (combo_code is null))   -- đúng một hóa đơn
);
create index if not exists payments_invoice on payments (invoice_id) where deleted_at is null;
create index if not exists payments_combo   on payments (combo_code) where deleted_at is null;

drop trigger if exists customers_touch on customers;
create trigger customers_touch before update on customers for each row execute function touch_updated_at();

-- ── Một danh sách chung cho mọi hóa đơn ──
create or replace view bills with (security_invoker = true) as
with b as (
  select 'invoice'::text as kind, i.id as ref, i.customer_id, i.guest, i.phone,
         i.status, i.cancelled_at, i.subtotal as total,
         i.checkin as start_date, i.room as detail, i.updated_at
    from invoices i where i.deleted_at is null
  union all
  select 'combo', c.code, c.customer_id, c.guest, c.phone,
         c.status, c.cancelled_at, c.total,
         c.start, c.pkg, c.updated_at
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
    when b.total > 0 and coalesce(p.paid, 0) >= b.total then 'paid'
    when coalesce(p.paid, 0) > 0                         then 'deposited'
    when b.status = 'final'                              then 'sent'
    else 'draft'
  end as state
from b left join p on p.ref = b.ref and p.kind = b.kind;

-- ── Quyền cho khóa công khai (anon): đọc, thêm, sửa — không bao giờ xoá ──
alter table customers        enable row level security;
alter table payments         enable row level security;
alter table customer_counter enable row level security;   -- chỉ add_customer chạm vào

drop policy if exists "app read"   on customers;
drop policy if exists "app insert" on customers;
drop policy if exists "app update" on customers;
create policy "app read"   on customers for select to anon using (true);
create policy "app insert" on customers for insert to anon with check (true);
create policy "app update" on customers for update to anon using (true) with check (true);

drop policy if exists "app read"   on payments;
drop policy if exists "app insert" on payments;
drop policy if exists "app update" on payments;
create policy "app read"   on payments for select to anon using (true);
create policy "app insert" on payments for insert to anon with check (true);
create policy "app update" on payments for update to anon using (true) with check (true);

revoke all on customers, payments, customer_counter from anon;
grant select, insert, update on customers, payments to anon;
grant select on bills to anon;

revoke all on function add_customer(text, text, text) from public;
grant execute on function add_customer(text, text, text) to anon;
grant execute on function norm_phone(text) to anon;

-- PostgREST đọc lại cấu trúc ngay, khỏi chờ
notify pgrst, 'reload schema';

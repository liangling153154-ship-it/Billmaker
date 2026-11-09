-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 7: VÉ XE "KHÁCH THANH TOÁN TRÊN XE"
--  Chạy SAU 006: Supabase → SQL Editor → dán TOÀN BỘ file → Run.
--  (Mở file trên GitHub bằng nút "Raw" rồi chép.) Chạy lại không sao. Không xoá hay sửa dữ liệu.
-- ════════════════════════════════════════════════════════════════
--  Hóa đơn vé xe đặt hộ chọn "Khách thanh toán trên xe": Sen's không thu tiền,
--  nên không tính là khoản phải thu. Khi đã gửi khách → coi như Hoàn thành,
--  không nằm trong "Chờ cọc" / "Còn phải thu". Cột mới bills.pay_on_bus.

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
         coalesce(i.data->>'bus_mode' = 'onbus', false) as pay_on_bus
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
         c.pkg, c.updated_at, false, false
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

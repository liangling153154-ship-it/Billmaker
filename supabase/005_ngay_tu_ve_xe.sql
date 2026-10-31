-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 5: NGÀY ĐẾN / ĐI LẤY TỪ VÉ XE
--  Chạy SAU 004: Supabase → SQL Editor → dán TOÀN BỘ file → Run.
--  (Mở file trên GitHub bằng nút "Raw" rồi chép, đừng chép từ trang xem thay đổi.)
--  Chạy lại không sao. Không xoá hay sửa dữ liệu.
-- ════════════════════════════════════════════════════════════════
--  Hóa đơn có vé xe (kể cả hóa đơn chỉ có vé xe) giờ có ngày đến / ngày đi:
--    ngày đến = ngày lên xe đi Cao Bằng (đêm khách đi xe); app ghi kèm chữ "bus"
--    ngày đi  = ngày xe RỜI Cao Bằng
--  Hóa đơn có cả phòng và vé xe: lấy ngày sớm nhất làm ngày đến, muộn nhất làm ngày đi.
--  Cột mới bills.via_bus = true khi ngày đến là ngày lên xe (không phải ngày nhận phòng).

drop view if exists bills;
create view bills with (security_invoker = true) as
with b as (
  select 'invoice'::text as kind, i.id as ref, i.customer_id, i.guest, i.phone,
         i.status, i.cancelled_at, i.subtotal as total,
         least(i.checkin, x.arrive, x.leave) as start_date,
         greatest(i.checkout, i.checkin, x.arrive, x.leave) as end_date,
         i.room as detail, i.updated_at,
         (x.arrive is not null and (i.checkin is null or x.arrive < i.checkin)) as via_bus
    from invoices i
    left join lateral (
      select min(case when it->'bus'->>'to' ilike '%cao b%'
                      then (it->'bus'->>'date')::date
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
         c.pkg, c.updated_at, false
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

grant select on bills to anon;

notify pgrst, 'reload schema';

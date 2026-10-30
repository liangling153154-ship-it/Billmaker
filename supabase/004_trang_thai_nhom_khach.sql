-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 4: TRẠNG THÁI + NHÓM KHÁCH
--  Chạy SAU 003_checklist.sql: Supabase → SQL Editor → dán TOÀN BỘ file → Run.
--  (Mở file trên GitHub bằng nút "Raw" rồi chép, đừng chép từ trang xem thay đổi.)
--  Chạy lại không sao. Không xoá hay sửa dữ liệu.
-- ════════════════════════════════════════════════════════════════
--  customers.segment   nhóm khách: combo · xe_may (chỉ thuê xe máy) · phong_xe (thuê phòng và xe máy)
--  bills.end_date      ngày khách đi: trả phòng (hóa đơn) / ngày xe về (combo)
--                      để app tính trạng thái khách: chưa chốt · đã cọc · đã cọc, sắp tới ·
--                      đang phục vụ · đã hoàn thành

alter table customers add column if not exists segment text not null default '';

drop view if exists bills;
create view bills with (security_invoker = true) as
with b as (
  select 'invoice'::text as kind, i.id as ref, i.customer_id, i.guest, i.phone,
         i.status, i.cancelled_at, i.subtotal as total,
         i.checkin as start_date, coalesce(i.checkout, i.checkin) as end_date,
         i.room as detail, i.updated_at
    from invoices i where i.deleted_at is null
  union all
  select 'combo', c.code, c.customer_id, c.guest, c.phone,
         c.status, c.cancelled_at, c.total,
         c.start,
         coalesce(case when c.data->'x2'->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
                       then (c.data->'x2'->>'date')::date end, c.start + 1),
         c.pkg, c.updated_at
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

-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 3: CHECKLIST CHUẨN BỊ CHO TỪNG KHÁCH
--  Chạy SAU 002_khach_thu_tien.sql: Supabase → SQL Editor → dán → Run. Chạy lại không sao.
-- ════════════════════════════════════════════════════════════════
--  customers.checklist giữ trạng thái checklist trong hồ sơ khách (khach.html):
--  vé xe đi/về, xe máy, giữ phòng tại Sen's, phòng ở điểm khác, nghỉ sớm khi tới.
--  Khóa công khai (anon) đã được sửa bảng customers nên không cần cấp thêm quyền.

alter table customers add column if not exists checklist jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

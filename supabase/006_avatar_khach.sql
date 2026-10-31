-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 6: ICON CON VẬT CHO KHÁCH
--  Chạy SAU 005: Supabase → SQL Editor → dán TOÀN BỘ file → Run.
--  (Mở file trên GitHub bằng nút "Raw" rồi chép, đừng chép từ trang xem thay đổi.)
--  Chạy lại không sao. Không xoá hay sửa dữ liệu.
-- ════════════════════════════════════════════════════════════════
--  customers.avatar   key con vật (ví dụ 'fox'), ảnh ở thư mục animals/ của app.
--                     App tự gán khi thêm khách và cho khách chưa có icon,
--                     không trùng giữa các khách chưa hoàn thành chuyến.

alter table customers add column if not exists avatar text;

notify pgrst, 'reload schema';

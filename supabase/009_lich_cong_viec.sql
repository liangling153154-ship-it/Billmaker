-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 9: LỊCH CÔNG VIỆC (TICK TRẠNG THÁI + VIỆC GHI TAY)
--  Chạy SAU 008: Supabase → SQL Editor → dán TOÀN BỘ file → Run.
--  (Mở file trên GitHub bằng nút "Raw" rồi chép.) Chạy lại không sao. Không xoá dữ liệu.
-- ════════════════════════════════════════════════════════════════
--  Bảng tasks giữ hai loại dòng cho trang lich.html:
--   • ref có giá trị  → trạng thái tick của một việc tự sinh từ hóa đơn / combo
--                       (ví dụ 'inv:<id>:bike:Honda Vision', 'combo:<mã>:x1')
--   • ref để trống    → việc ghi tay ("Đặt taxi sân bay cho nhóm 4 khách")
--  status: ''  chưa làm · 'doing' đang xử lý · 'done' hoàn thành
--  room:   mã phòng ('101', 'HA-201'…) hoặc '' = dòng "Công việc thêm"
--  Mỗi cơ sở (branch) tách riêng như các bảng khác.

create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  branch      text not null default 'sen',
  ref         text,
  day         date,
  room        text not null default '',
  title       text not null default '',
  status      text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
do $$ begin
  alter table tasks add constraint tasks_branch_chk check (branch in ('sen','hoaan'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table tasks add constraint tasks_status_chk check (status in ('','doing','done'));
exception when duplicate_object then null; end $$;

-- một việc tự sinh chỉ có một dòng trạng thái (việc ghi tay ref = null nên không bị chặn)
do $$ begin
  alter table tasks add constraint tasks_branch_ref_uniq unique (branch, ref);
exception when duplicate_object or duplicate_table then null; end $$;
create index if not exists tasks_day on tasks (branch, day) where deleted_at is null;

drop trigger if exists tasks_touch on tasks;
create trigger tasks_touch before update on tasks for each row execute function touch_updated_at();

-- ── Quyền cho khóa công khai (anon): đọc, thêm, sửa — không bao giờ xoá (xoá = đặt deleted_at) ──
alter table tasks enable row level security;
drop policy if exists "app read"   on tasks;
drop policy if exists "app insert" on tasks;
drop policy if exists "app update" on tasks;
create policy "app read"   on tasks for select to anon using (true);
create policy "app insert" on tasks for insert to anon with check (true);
create policy "app update" on tasks for update to anon using (true) with check (true);

revoke all on tasks from anon;
grant select, insert, update on tasks to anon;

notify pgrst, 'reload schema';

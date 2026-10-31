-- ════════════════════════════════════════════════════════════════
--  SEN'S HOMESTAY — BILLMAKER · BƯỚC 6: ICON CON VẬT CHO KHÁCH
--  Chạy SAU 005: Supabase → SQL Editor → dán TOÀN BỘ file → Run.
--  (Mở file trên GitHub bằng nút "Raw" rồi chép, đừng chép từ trang xem thay đổi.)
--  Chạy lại không sao. Không xoá hay sửa dữ liệu.
-- ════════════════════════════════════════════════════════════════
--  customers.avatar   key con vật (ví dụ 'fox'), ảnh ở thư mục animals/ của app.
--                     Gán ngẫu nhiên, Linh không cần chọn. App tự gán cho khách mới,
--                     không trùng giữa các khách chưa hoàn thành chuyến.
--  File này gán luôn con vật ngẫu nhiên cho mọi khách cũ chưa có (con chưa ai dùng trước).

alter table customers add column if not exists avatar text;

with k(key) as (select unnest(array['water-buffalo','cow','cat','dog','chicken','duck','goose','pig','goat','horse','monkey','bear','panda','tiger','lion','leopard','fox','wolf','rabbit','squirrel','hedgehog','kangaroo','koala','elephant','giraffe','deer','zebra','hippo','rhino','camel','owl','parrot','penguin','flamingo','eagle','peacock','sparrow','turtle','frog','dolphin','whale','octopus','crab','fish','jellyfish','bee','butterfly','ladybug','snail','ferret','otter','seal','badger','chameleon','dinosaur','unicorn','crocodile','polar-bear','sloth','coyote'])),
free as (select key, row_number() over (order by random()) as n
           from k where key not in (select avatar from customers where avatar is not null and deleted_at is null)),
nf as (select count(*) as c from free),
allk as (select key, row_number() over (order by random()) as n from k),
need as (select id, row_number() over (order by random()) as n from customers where avatar is null)
update customers c
   set avatar = coalesce((select f.key from free f where f.n = need.n),
                         (select a.key from allk a where a.n = 1 + (need.n - (select c from nf) - 1) % 60))
  from need
 where c.id = need.id;

notify pgrst, 'reload schema';

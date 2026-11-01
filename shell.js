// Khung chung cho máy tính: từ 1100px trở lên có thanh menu cố định bên trái, đánh dấu trang đang mở.
// Điện thoại không đổi gì (mobile first): thanh này ẩn, các trang vẫn dùng nút ☰ Menu như cũ.
(function () {
  const W = 232;
  const css = `
.sen-back{flex:none;width:38px;height:38px;border-radius:9px;border:1px solid currentColor;background:transparent;color:inherit;font:600 24px/1 system-ui,sans-serif;cursor:pointer;display:grid;place-items:center;padding:0 0 3px;opacity:.9}
.sen-back:focus-visible{outline:2px solid currentColor;outline-offset:2px}
#sen-side{display:none}
@media (min-width:1100px){
  body{padding-left:${W}px}
  #sen-side{display:flex;flex-direction:column;gap:2px;position:fixed;left:0;top:0;bottom:0;width:${W}px;z-index:400;
    background:#2b1d14;color:#f2e6db;padding:18px 12px;font-family:"Be Vietnam Pro",system-ui,sans-serif;overflow-y:auto}
  #sen-side .brand{display:flex;align-items:center;gap:10px;padding:4px 8px 16px;color:#fff;text-decoration:none}
  #sen-side .logo{width:36px;height:36px;border-radius:50%;background:#a9541f;display:grid;place-items:center;font:700 17px Lora,Georgia,serif}
  #sen-side .brand b{font:700 17px Lora,Georgia,serif}
  #sen-side h6{margin:14px 8px 4px;font:600 11px "Be Vietnam Pro",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#b39c89}
  #sen-side a.i{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;color:#f2e6db;text-decoration:none;font-size:14px;font-weight:500}
  #sen-side a.i:hover{background:#3e3027}
  #sen-side a.i[aria-current="page"]{background:#a9541f;color:#fff;font-weight:700}
  #sen-side a.i.en[aria-current="page"]{background:#1e2d40;color:#fff;box-shadow:inset 3px 0 0 #c9a84c}
  #sen-side a.add{display:block;margin:0 4px 6px;padding:11px 12px;border-radius:10px;background:#a9541f;color:#fff;text-decoration:none;font-weight:700;text-align:center}
  #sen-side a.add:hover{background:#7e3c14}
  #sen-side .sw{width:10px;height:10px;border-radius:3px;flex:none}
  #sen-side a.i:focus-visible{outline:2px solid #fff;outline-offset:1px}
  /* thanh nút cố định dưới đáy chừa chỗ cho menu trái */
  .action-bar,.bar{left:${W}px !important}
  /* đã có menu trái: ẩn nút ☰ Menu trên đầu trang */
  .top a[href="index.html"],.topbar a[href="index.html"]{display:none !important}
}`;
  const items = [
    ['Tổng quan', [['index.html', 'Trang chủ', '#c9b8a8']]],
    ['Hóa đơn nhanh', [['vi.html', 'Phòng & vé xe', '#a9541f'], ['en.html', 'Invoice (English)', '#c9a84c', 'en']]],
    ['Quản lý', [['khach.html', 'Khách hàng', '#c9b8a8'], ['khach.html#follow', 'Cần theo dõi', '#c9b8a8'],
      ['lich.html', 'Lịch công việc', '#c9b8a8'], ['lichsu.html', 'Lịch sử hóa đơn', '#c9b8a8']]]
  ];
  function current() {
    const page = (location.pathname.split('/').pop() || 'index.html');
    return page === 'khach.html' && location.hash === '#follow' ? 'khach.html#follow' : page;
  }
  function draw() {
    const cur = current();
    nav.innerHTML = '<a class="brand" href="index.html"><span class="logo" aria-hidden="true">S</span><b>Sen\'s Billmaker</b></a>' +
      '<a class="add" href="khach.html#new">＋ Thêm khách</a>' +
      items.map(([h, links]) => '<h6>' + h + '</h6>' + links.map(([href, label, color, cls]) =>
        `<a class="i ${cls || ''}" href="${href}"${href === cur ? ' aria-current="page"' : ''}><span class="sw" style="background:${color}" aria-hidden="true"></span>${label}</a>`).join('')).join('');
  }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const nav = document.createElement('nav'); nav.id = 'sen-side'; nav.setAttribute('aria-label', 'Menu chính');
  draw();
  document.body.prepend(nav);

  // nút Quay lại ở đầu mọi trang con (cả điện thoại lẫn máy tính)
  const page = location.pathname.split('/').pop() || 'index.html';
  const head = document.querySelector('.top, .topbar');
  if (page !== 'index.html' && head) {
    const back = document.createElement('button');
    back.type = 'button'; back.className = 'sen-back'; back.setAttribute('aria-label', 'Quay lại trang trước'); back.textContent = '‹';
    back.onclick = () => {
      const fromApp = document.referrer && new URL(document.referrer).origin === location.origin;
      if (fromApp && history.length > 1) history.back(); else location.href = 'index.html';
    };
    head.prepend(back);
  }
  window.addEventListener('hashchange', draw);

  // ── thông báo nổi: khi máy khác ghi dữ liệu mới (khách, hóa đơn, combo, thu tiền),
  //    một ô nhỏ sáng lên ở góc màn hình vài giây rồi tự biến mất ──
  const popCss = `
#sen-pops{position:fixed;top:14px;right:14px;z-index:700;display:flex;flex-direction:column;gap:8px;width:min(330px,calc(100vw - 28px));pointer-events:none}
@media (max-width:640px){#sen-pops{left:50%;right:auto;transform:translateX(-50%)}}
.sen-pop{pointer-events:auto;display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:12px;background:#fffaf0;color:#2b1d14;text-decoration:none;
  border:1px solid #f0c860;box-shadow:0 6px 20px #2b1d1430,0 0 0 0 #ffcf33;font:14px "Be Vietnam Pro",system-ui,sans-serif;
  animation:senIn .35s ease-out,senGlow 1.2s ease-in-out .35s 3;transition:opacity .5s,transform .5s}
.sen-pop.out{opacity:0;transform:translateY(-8px)}
.sen-pop .i{font-size:20px;flex:none}
.sen-pop b{display:block;font-weight:600}
.sen-pop span.m{display:block;font-size:12px;color:#7a6a5c}
@keyframes senIn{from{opacity:0;transform:translateY(-12px)}}
@keyframes senGlow{50%{box-shadow:0 6px 20px #2b1d1430,0 0 0 6px #ffcf3366}}
@media (prefers-reduced-motion:reduce){.sen-pop{animation:none}}`;
  const st2 = document.createElement('style'); st2.textContent = popCss; document.head.appendChild(st2);
  if (typeof sb !== 'function') return;
  const pops = document.createElement('div'); pops.id = 'sen-pops'; pops.setAttribute('role', 'status'); pops.setAttribute('aria-live', 'polite');
  document.body.appendChild(pops);

  const LS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  if (!LS('sen_seen')) LSset('sen_seen', new Date().toISOString());   // lần đầu: không báo dồn dữ liệu cũ
  const esc2 = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const money2 = n => Number(n).toLocaleString('vi-VN') + 'đ';
  const SHOW_MS = 5000;

  function pop(e) {
    const a = document.createElement('a'); a.className = 'sen-pop'; a.href = e.href;
    a.innerHTML = `<span class="i" aria-hidden="true">${e.i}</span><span><b>${esc2(e.title)}</b><span class="m">${esc2(e.meta)}</span></span>`;
    pops.appendChild(a);
    setTimeout(() => { a.classList.add('out'); setTimeout(() => a.remove(), 500); }, SHOW_MS);
  }
  async function poll() {
    const seen = LS('sen_seen'), mine = JSON.parse(LS('sen_mine') || '{}'), enc = encodeURIComponent, q = enc(seen);
    try {
      const [cs, inv, cb, pay] = await Promise.all([
        sb('customers?select=id,name,created_at&deleted_at=is.null&created_at=gt.' + q + '&order=created_at.desc&limit=10'),
        sb('invoices?select=id,guest,lang,invoice_type,created_at,updated_at&deleted_at=is.null&updated_at=gt.' + q + '&order=updated_at.desc&limit=10'),
        sb('combos?select=code,guest,updated_at&deleted_at=is.null&data->>code=not.is.null&updated_at=gt.' + q + '&order=updated_at.desc&limit=10'),
        sb('payments?select=customer_id,invoice_id,combo_code,amount,created_at&deleted_at=is.null&created_at=gt.' + q + '&order=created_at.desc&limit=10')]);
      const ids = [...new Set(pay.map(p => p.customer_id).filter(Boolean))], names = {};
      if (ids.length) (await sb('customers?select=id,name&id=in.(' + ids.map(enc).join(',') + ')')).forEach(c => names[c.id] = c.name);
      const all = [];
      cs.forEach(c => all.push({k: 'kh:' + c.id, t: c.created_at, i: '👤', title: 'Khách mới: ' + (c.name || c.id), meta: c.id, href: 'khach.html#' + enc(c.id)}));
      inv.forEach(v => all.push({k: 'inv:' + v.id, t: v.updated_at, i: '🧾',
        title: (new Date(v.updated_at) - new Date(v.created_at) < 120000 ? 'Hóa đơn mới: ' : 'Sửa hóa đơn: ') + (v.guest || '(chưa có tên)'),
        meta: v.lang === 'en' ? 'Invoice (English)' : v.invoice_type === 'bus' ? 'Vé xe' : 'Phòng & vé xe', href: (v.lang === 'en' ? 'en.html' : 'vi.html') + '?open=' + enc(v.id)}));
      cb.forEach(c => all.push({k: 'combo:' + c.code, t: c.updated_at, i: '🗺', title: 'Combo: ' + (c.guest || '(chưa có tên)'), meta: c.code, href: 'combo.html?open=' + enc(c.code)}));
      pay.forEach(p => all.push({k: 'pay:' + (p.invoice_id || p.combo_code) + ':' + p.amount, t: p.created_at, i: '💰',
        title: (p.amount < 0 ? 'Hoàn tiền ' : 'Thu tiền ') + money2(Math.abs(p.amount)) + (names[p.customer_id] ? ' · ' + names[p.customer_id] : ''),
        meta: p.customer_id || '', href: p.customer_id ? 'khach.html#' + enc(p.customer_id) : 'lichsu.html'}));
      if (!all.length) return;
      LSset('sen_seen', all.reduce((m, x) => x.t > m ? x.t : m, seen));
      // bỏ thay đổi do chính máy này vừa làm; mỗi hóa đơn/combo chỉ báo 1 lần
      const seenK = new Set(), fresh = all.filter(e => !(mine[e.k] && new Date(e.t).getTime() <= mine[e.k] + 120000))
        .sort((a, b) => a.t < b.t ? 1 : -1).filter(e => !seenK.has(e.k) && seenK.add(e.k));
      // hóa đơn đang được gõ sửa liên tục: mỗi mục báo tối đa 1 lần / 10 phút
      const popped = JSON.parse(LS('sen_popped') || '{}'), now = Date.now();
      for (const k in popped) if (now - popped[k] > 600000) delete popped[k];
      const show = fresh.filter(e => !popped[e.k]); show.forEach(e => popped[e.k] = now); LSset('sen_popped', JSON.stringify(popped));
      if (!show.length) return;
      fresh.length = 0; fresh.push(...show);
      fresh.slice(0, 3).reverse().forEach(pop);
      if (fresh.length > 3) pop({i: '🔔', title: 'Còn ' + (fresh.length - 3) + ' thay đổi khác', meta: 'Xem trong Lịch sử hóa đơn / Khách hàng', href: 'lichsu.html'});
    } catch (e) {}
  }
  poll(); setInterval(() => { if (!document.hidden) poll(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
})();

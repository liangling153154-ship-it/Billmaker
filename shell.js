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

  // ── chuông thông báo: sáng lên khi có dữ liệu mới do người khác ghi (khách, hóa đơn, combo, thu tiền) ──
  const bellCss = `
.sen-bell{flex:none;position:relative;width:38px;height:38px;border-radius:9px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;display:grid;place-feedItems:center;margin-left:auto;padding:0;opacity:.9}
.sen-bell svg{width:19px!important;height:19px!important;display:block;margin:0!important;position:static!important;flex:none}
.sen-bell{line-height:0;box-sizing:border-box;display:flex!important;align-items:center!important;justify-content:center!important}
.sen-bell .dot{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#ffcf33;color:#3a2a00;font:700 11px/18px system-ui,sans-serif;padding:0 4px;box-shadow:0 0 0 2px #fff,0 0 10px 3px #ffcf33;display:none}
.sen-bell.on .dot{display:block;animation:senGlow 1.6s ease-in-out infinite}
@keyframes senGlow{50%{box-shadow:0 0 0 2px #fff,0 0 2px 0 #ffcf33}}
@media (prefers-reduced-motion:reduce){.sen-bell.on .dot{animation:none}}
.sen-bell:focus-visible{outline:2px solid currentColor;outline-offset:2px}
#sen-feed{position:fixed;top:64px;right:12px;width:min(360px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#fffaf4;color:#2b1d14;border:1px solid #e5d9cc;border-radius:12px;box-shadow:0 12px 32px #2b1d1433;z-index:600;font:14px "Be Vietnam Pro",system-ui,sans-serif}
#sen-feed[hidden]{display:none}
#sen-feed .h{display:flex;justify-content:space-between;align-feedItems:center;padding:12px 14px;border-bottom:1px solid #e5d9cc;font-weight:700}
#sen-feed .h button{border:0;background:none;color:#a9541f;font:600 13px inherit;cursor:pointer}
#sen-feed a{display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid #f0e6da;color:inherit;text-decoration:none}
#sen-feed a:hover{background:#f6ece1}
#sen-feed a.new{background:#fff3cf}
#sen-feed .i{flex:none;font-size:18px;line-height:1.2}
#sen-feed .t{display:block;font-weight:600}
#sen-feed .m{display:block;font-size:12px;color:#7a6a5c}
#sen-feed .empty{padding:18px 14px;color:#7a6a5c}`;
  const st2 = document.createElement('style'); st2.textContent = bellCss; document.head.appendChild(st2);
  const top = document.querySelector('.top, .topbar') || document.querySelector('.wrap > header');
  if (!top || typeof sb !== 'function') return;
  const bell = document.createElement('button');
  bell.type = 'button'; bell.className = 'sen-bell'; bell.setAttribute('aria-label', 'Thông báo dữ liệu mới');
  bell.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg><span class="dot"></span>';
  top.appendChild(bell);
  const feed = document.createElement('div'); feed.id = 'sen-feed'; feed.hidden = true; document.body.appendChild(feed);

  const LS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  if (!LS('sen_seen')) LSset('sen_seen', new Date().toISOString());   // lần đầu: không báo dồn dữ liệu cũ
  const esc2 = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const money2 = n => Number(n).toLocaleString('vi-VN') + 'đ';
  const when = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()) + ' · ' + p(d.getDate()) + '/' + p(d.getMonth() + 1); };
  let feedItems = [];

  async function poll() {
    const since = new Date(Date.now() - 3 * 864e5).toISOString();   // danh sách gần đây (3 ngày)
    const seen = LS('sen_seen'), mine = JSON.parse(LS('sen_mine') || '{}');
    const enc = encodeURIComponent;
    try {
      const [cs, inv, cb, pay] = await Promise.all([
        sb('customers?select=id,name,created_at&deleted_at=is.null&created_at=gt.' + enc(since) + '&order=created_at.desc&limit=20'),
        sb('invoices?select=id,guest,lang,invoice_type,created_at,updated_at&deleted_at=is.null&updated_at=gt.' + enc(since) + '&order=updated_at.desc&limit=20'),
        sb('combos?select=code,guest,created,updated_at&deleted_at=is.null&data->>code=not.is.null&updated_at=gt.' + enc(since) + '&order=updated_at.desc&limit=20'),
        sb('payments?select=customer_id,invoice_id,combo_code,amount,created_at&deleted_at=is.null&created_at=gt.' + enc(since) + '&order=created_at.desc&limit=20')]);
      const ids = [...new Set(pay.map(p => p.customer_id).filter(Boolean))], names = {};
      if (ids.length) (await sb('customers?select=id,name&id=in.(' + ids.map(enc).join(',') + ')')).forEach(c => names[c.id] = c.name);
      const all = [];
      cs.forEach(c => all.push({k: 'kh:' + c.id, t: c.created_at, i: '👤', title: 'Khách mới: ' + (c.name || c.id), meta: c.id, href: 'khach.html#' + enc(c.id)}));
      inv.forEach(v => all.push({k: 'inv:' + v.id, t: v.updated_at, i: '🧾',
        title: (v.created_at === v.updated_at || new Date(v.updated_at) - new Date(v.created_at) < 120000 ? 'Hóa đơn mới: ' : 'Sửa hóa đơn: ') + (v.guest || '(chưa có tên)'),
        meta: (v.lang === 'en' ? 'Invoice (English)' : v.invoice_type === 'bus' ? 'Vé xe' : 'Phòng & vé xe'), href: (v.lang === 'en' ? 'en.html' : 'vi.html') + '?open=' + enc(v.id)}));
      cb.forEach(c => all.push({k: 'combo:' + c.code, t: c.updated_at, i: '🗺', title: 'Combo: ' + (c.guest || '(chưa có tên)'), meta: c.code, href: 'combo.html?open=' + enc(c.code)}));
      pay.forEach(p => all.push({k: 'pay:' + (p.invoice_id || p.combo_code) + ':' + p.amount, t: p.created_at, i: '💰',
        title: (p.amount < 0 ? 'Hoàn tiền ' : 'Thu tiền ') + money2(Math.abs(p.amount)) + (names[p.customer_id] ? ' · ' + names[p.customer_id] : ''),
        meta: p.customer_id || '', href: p.customer_id ? 'khach.html#' + enc(p.customer_id) : 'lichsu.html'}));
      // bỏ những thay đổi chính máy này vừa làm
      feedItems = all.filter(e => !(mine[e.k] && new Date(e.t).getTime() <= mine[e.k] + 120000))
        .sort((a, b) => a.t < b.t ? 1 : -1).slice(0, 25);
      feedItems.forEach(e => e.fresh = e.t > seen);
      const n = feedItems.filter(e => e.fresh).length;
      bell.classList.toggle('on', n > 0);
      bell.querySelector('.dot').textContent = n > 9 ? '9+' : n;
      bell.title = n ? n + ' thay đổi mới' : 'Không có gì mới';
      if (!feed.hidden) drawFeed();
    } catch (e) {}
  }
  function drawFeed() {
    feed.innerHTML = '<div class="h"><span>Dữ liệu mới</span><button type="button" id="sen-close">Đóng</button></div>' +
      (feedItems.length ? feedItems.map(e => `<a href="${esc2(e.href)}" class="${e.fresh ? 'new' : ''}"><span class="i" aria-hidden="true">${e.i}</span><span><span class="t">${esc2(e.title)}</span><span class="m">${esc2(e.meta)} · ${when(e.t)}</span></span></a>`).join('')
        : '<p class="empty">Chưa có thay đổi nào trong 3 ngày qua.</p>');
    feed.querySelector('#sen-close').onclick = () => { feed.hidden = true; };
  }
  bell.onclick = e => {
    e.stopPropagation();
    if (!feed.hidden) { feed.hidden = true; return; }
    drawFeed(); feed.hidden = false;
    const newest = feedItems.reduce((m, x) => x.t > m ? x.t : m, LS('sen_seen'));   // đã xem: tắt đèn, vẫn tô vàng mục mới cho tới lần mở sau
    LSset('sen_seen', newest); bell.classList.remove('on');
  };
  document.addEventListener('click', e => { if (!feed.hidden && !feed.contains(e.target)) feed.hidden = true; });
  poll(); setInterval(() => { if (!document.hidden) poll(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
})();

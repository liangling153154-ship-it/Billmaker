// Khung chung cho máy tính: từ 1100px trở lên có thanh menu cố định bên trái, đánh dấu trang đang mở.
// Điện thoại không đổi gì (mobile first): thanh này ẩn, các trang vẫn dùng nút ☰ Menu như cũ.
(function () {
  const W = 232;
  const css = `
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
  #sen-side .sw{width:10px;height:10px;border-radius:3px;flex:none}
  #sen-side a.i:focus-visible{outline:2px solid #fff;outline-offset:1px}
  /* thanh nút cố định dưới đáy chừa chỗ cho menu trái */
  .action-bar,.bar{left:${W}px !important}
  /* đã có menu trái: ẩn nút ☰ Menu trên đầu trang */
  .top a[href="index.html"],.topbar a[href="index.html"]{display:none !important}
}`;
  const items = [
    ['Tổng quan', [['index.html', 'Trang chủ', '#c9b8a8']]],
    ['Tạo hóa đơn', [['vi.html', 'Phòng & vé xe', '#a9541f'], ['combo.html', 'Combo tour', '#e0a26f'], ['en.html', 'Invoice (English)', '#c9a84c', 'en']]],
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
      items.map(([h, links]) => '<h6>' + h + '</h6>' + links.map(([href, label, color, cls]) =>
        `<a class="i ${cls || ''}" href="${href}"${href === cur ? ' aria-current="page"' : ''}><span class="sw" style="background:${color}" aria-hidden="true"></span>${label}</a>`).join('')).join('');
  }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const nav = document.createElement('nav'); nav.id = 'sen-side'; nav.setAttribute('aria-label', 'Menu chính');
  draw();
  document.body.prepend(nav);
  window.addEventListener('hashchange', draw);
})();

// Supabase connection shared by vi.html, index.html and combo.html.
// The publishable key is meant to be public: the database lets it read, add and
// edit invoices but never delete them (see supabase/schema.sql).
const SB_URL = 'https://hqomllgssmutrqtguedh.supabase.co';
const SB_KEY = 'sb_publishable_8kBE_O-ZZ425DpwaNA7fqA_HA1psZVW';

// sb('combos?select=code', {method, body, prefer}) → parsed JSON (or null).
// Network errors and 5xx are retried twice; 4xx (bad request, no permission) fail at once.
async function sb(path, {method = 'GET', body, prefer} = {}) {
  const headers = {apikey: SB_KEY, 'Content-Type': 'application/json'};
  if (prefer) headers.Prefer = prefer;
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/' + path,
        {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw Object.assign(new Error((data && data.message) || 'HTTP ' + r.status), {fatal: r.status < 500});
      if (method !== 'GET') senSaved(path, body, data, true);
      return data;
    } catch (e) {
      last = e;
      if (e.fatal) break;
      await new Promise(res => setTimeout(res, 600 * (i + 1)));
    }
  }
  if (method !== 'GET') senSaved(path, body, null, false);
  throw last;
}


// Ô nhỏ nháy sáng ~3 giây trên chính máy vừa nhập: báo dữ liệu đã ghi lên máy chủ (hoặc chưa ghi được).
function senSavedText(path, b, data) {
  b = b || {};
  if (/^rpc\/reserve_combo_code/.test(path)) return null;                       // chỉ giữ mã, chưa lưu gì
  if (/^customers/.test(path) && Object.keys(b).length === 1 && 'avatar' in b) return null;   // app tự gán icon
  if ('deleted_at' in b) return 'Đã xoá';
  if ('cancelled_at' in b) return b.cancelled_at ? 'Đã huỷ hóa đơn' : 'Đã khôi phục hóa đơn';
  if (/^rpc\/add_customer/.test(path)) return data && data.existed ? 'Khách đã có: ' + data.id : 'Đã thêm khách ' + ((data && data.id) || '');
  if (/^invoices/.test(path)) return 'customer_id' in b && Object.keys(b).length === 1 ? 'Đã gắn hóa đơn vào khách'
    : b.status === 'final' && Object.keys(b).length === 1 ? 'Đã đánh dấu đã gửi' : 'Đã lưu hóa đơn' + (b.guest ? ' · ' + b.guest : '');
  if (/^combos/.test(path)) return 'customer_id' in b && Object.keys(b).length === 1 ? 'Đã gắn combo vào khách'
    : b.status === 'final' && Object.keys(b).length === 1 ? 'Đã đánh dấu đã gửi' : 'Đã lưu combo' + (b.code ? ' · ' + b.code : '');
  if (/^payments/.test(path)) return (b.amount < 0 ? 'Đã ghi hoàn ' : 'Đã ghi thu ') + Math.abs(Number(b.amount) || 0).toLocaleString('vi-VN') + 'đ';
  if (/^customers/.test(path)) return 'checklist' in b ? 'Đã lưu checklist' : 'segment' in b ? 'Đã lưu nhóm khách' : 'Đã lưu hồ sơ khách';
  return 'Đã lưu';
}
let senPopEl = null, senPopT = null;
function senSaved(path, body, data, ok) {
  try {
    const text = ok ? senSavedText(path, body, data) : 'Chưa lưu được lên máy chủ, thử lại';
    if (!text || typeof document === 'undefined' || !document.body) return;
    if (!document.getElementById('sen-pop-css')) {
      const st = document.createElement('style'); st.id = 'sen-pop-css';
      st.textContent = `
#sen-pop{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:800;display:flex;align-items:center;gap:6px;max-width:calc(100vw - 32px);
  padding:6px 12px;border-radius:999px;font:600 12.5px/1.3 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;
  background:#fff8e1;color:#5a3a00;border:1px solid #f0c040;animation:senJump .3s ease-out,senBlink .5s ease-in-out .3s infinite}
#sen-pop.bad{background:#fdecea;color:#8a1c12;border-color:#e57368;animation:senJump .3s ease-out,senBlinkR .5s ease-in-out .3s infinite}
#sen-pop.out{opacity:0;transition:opacity .3s}
@keyframes senJump{0%{transform:translateX(-50%) translateY(-12px) scale(.8);opacity:0}70%{transform:translateX(-50%) translateY(4px) scale(1.04)}100%{transform:translateX(-50%)}}
@keyframes senBlink{50%{box-shadow:0 0 0 4px #ffd54f88,0 0 14px #ffd54f}}
@keyframes senBlinkR{50%{box-shadow:0 0 0 4px #ef9a9a88,0 0 14px #ef9a9a}}
@media (min-width:1100px){#sen-pop{left:auto;top:auto;right:24px;bottom:24px;transform:none}
  @keyframes senJump{0%{transform:translateY(12px) scale(.8);opacity:0}70%{transform:translateY(-4px) scale(1.04)}100%{transform:none}}}
@media (prefers-reduced-motion:reduce){#sen-pop,#sen-pop.bad{animation:none}}`;
      document.head.appendChild(st);
    }
    if (senPopEl) senPopEl.remove();
    clearTimeout(senPopT);
    senPopEl = document.createElement('div'); senPopEl.id = 'sen-pop';
    senPopEl.setAttribute('role', 'status'); senPopEl.setAttribute('aria-live', 'polite');
    if (!ok) senPopEl.className = 'bad';
    senPopEl.textContent = (ok ? '✓ ' : '⚠ ') + text;
    document.body.appendChild(senPopEl);
    const el = senPopEl;
    senPopT = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3000);
  } catch (e) {}
}

// Hóa đơn "sau cọc" (đầy đủ, có ô "tiền cọc đã nhận") gửi khách → tự ghi khoản cọc vào sổ thu
// nếu sổ thu của hóa đơn đó chưa đủ số cọc. Chỉ bù phần thiếu, không bao giờ ghi trùng.
async function senAutoDeposit({kind, ref, customer_id, deposit}){
  try{
    const dep=Math.round(Number(deposit)||0);
    if(!ref||!customer_id||dep<=0) return 0;
    const col=kind==='combo'?'combo_code':'invoice_id';
    const pays=await sb('payments?select=amount&deleted_at=is.null&'+col+'=eq.'+encodeURIComponent(ref));
    const got=pays.reduce((s,x)=>s+Math.max(0,Number(x.amount)||0),0);
    if(got>=dep) return 0;
    const d=new Date(), iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    await sb('payments',{method:'POST',prefer:'return=minimal',body:{customer_id,
      invoice_id:kind==='combo'?null:ref, combo_code:kind==='combo'?ref:null,
      amount:dep-got, paid_on:iso, account:'', note:'cọc (tự ghi từ hóa đơn)'}});
    return dep-got;
  }catch(e){ console.warn('[auto-deposit]',e); return 0; }
}

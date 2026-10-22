/**
 * ════════════════════════════════════════════════════════════════
 *  SEN'S HOMESTAY — BILLMAKER · GOOGLE SHEETS BACKEND
 * ════════════════════════════════════════════════════════════════
 *
 * HƯỚNG DẪN SETUP (làm 1 lần, mất ~5 phút):
 *
 *  1. Tạo Google Sheet trắng (sheets.new) → đặt tên gì cũng được
 *  2. Extensions → Apps Script
 *  3. Xoá hết code mẫu, paste TOÀN BỘ file này vào
 *  4. Save (Ctrl+S) → đặt tên project: "Billmaker Backend"
 *  5. Bấm Deploy → New deployment
 *     - Type: Web app
 *     - Execute as:  Me (your-email)
 *     - Who has access:  Anyone
 *     - Click "Deploy" → Authorize → Continue → Allow
 *  6. Copy "Web app URL" (kết thúc bằng /exec)
 *  7. Mở webapp BILLMAKER → tab "📋 Lịch sử" → paste URL vào ô Settings
 *
 *  HẾT. Mỗi lần update code chỉ cần Save → Deploy → Manage deployments
 *  → bấm bút chì (Edit) → Version: New → Deploy. URL không đổi.
 * ════════════════════════════════════════════════════════════════
 */

const HEADERS = [
  'id','status','lang','created_at','updated_at',
  'guest','room','checkin','checkout','nights',
  'items_json','deposit','note','qr_account','rate',
  'subtotal','balance','invoice_type','deposit_pct','qr_note','phone'
];
const SHEET_NAME = 'Invoices';

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0a3a5a').setFontColor('#fff');
    return sh;
  }
  const cur = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
  if (cur.length < HEADERS.length || HEADERS.some((h, i) => cur[i] !== h)) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0a3a5a').setFontColor('#fff');
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e.parameter || {}).action || 'list';
    if (action === 'list')   return json(listInvoices(parseInt(e.parameter.limit) || 100));
    if (action === 'get')    return json(getInvoice(e.parameter.id));
    if (action === 'ping')   return json({ok: true, ts: new Date().toISOString()});
    if (action === 'export') return json(listInvoices(10000));
    if (action === 'comboList') return json(comboList(parseInt(e.parameter.limit) || 50));
    if (action === 'comboGet')  return json(comboGet(e.parameter.code));
    return json({error: 'unknown action: ' + action});
  } catch (err) {
    return json({error: String(err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'save')     return json(saveInvoice(body.payload));
    if (body.action === 'delete')   return json(deleteInvoice(body.id));
    if (body.action === 'clearAll') return json(clearAll(body.confirm));
    if (body.action === 'comboReserve') return json(comboReserve(body.ymd));
    if (body.action === 'comboSave')    return json(comboSave(body.payload));
    return json({error: 'unknown action: ' + body.action});
  } catch (err) {
    return json({error: String(err.message || err)});
  }
}

function findRow(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const data = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function rowToObj(row) {
  const obj = {};
  HEADERS.forEach((h, i) => obj[h] = row[i]);
  if (obj.items_json) {
    try { obj.items = JSON.parse(obj.items_json); } catch (e) { obj.items = []; }
  } else {
    obj.items = [];
  }
  return obj;
}

function saveInvoice(p) {
  const sh = getSheet();
  const now = new Date().toISOString();
  const id = p.id || (Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  const row = [
    id,
    p.status || 'draft',
    p.lang || 'vi',
    p.created_at || now,
    now,
    p.guest || '',
    p.room || '',
    p.checkin || '',
    p.checkout || '',
    p.nights || 0,
    JSON.stringify(p.items || []),
    p.deposit || 0,
    p.note || '',
    p.qr_account || 'none',
    p.rate || 26323,
    p.subtotal || 0,
    p.balance || 0,
    p.invoice_type || 'full',
    p.deposit_pct || 0,
    p.qr_note || '',
    p.phone || '',
  ];
  const r = findRow(sh, id);
  if (r > 0) {
    sh.getRange(r, 1, 1, HEADERS.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
  return {ok: true, id: id, updated_at: now};
}

function listInvoices(limit) {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return {items: []};
  const data = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const items = data.map(rowToObj);
  items.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  return {items: items.slice(0, limit), total: items.length};
}

function getInvoice(id) {
  const sh = getSheet();
  const r = findRow(sh, id);
  if (r < 0) return {error: 'not found'};
  const row = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
  return {item: rowToObj(row)};
}

function deleteInvoice(id) {
  const sh = getSheet();
  const r = findRow(sh, id);
  if (r > 0) sh.deleteRow(r);
  return {ok: true, id: id};
}

function clearAll(confirmCode) {
  if (confirmCode !== 'XOA') return {error: 'Cần xác nhận: gửi confirm = "XOA"'};
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last >= 2) sh.deleteRows(2, last - 1);
  return {ok: true, cleared: last - 1};
}

/* ════════════════════════════════════════════════════════════════
 *  COMBO TOUR (combo.html) — tab riêng "Combo"
 *  Mã hóa đơn SEN-YYMMDD-NN: NN đếm theo ngày lập, chung cho mọi máy.
 * ════════════════════════════════════════════════════════════════ */
const COMBO_HEADERS = ['code','status','created','updated_at','guest','phone','pax','start','total','deposit','balance','qr_account','pkg','data_json'];
const COMBO_SHEET = 'Combo';

function getComboSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(COMBO_SHEET);
  if (!sh) {
    sh = ss.insertSheet(COMBO_SHEET);
    sh.getRange(1, 1, 1, COMBO_HEADERS.length).setValues([COMBO_HEADERS])
      .setFontWeight('bold').setBackground('#b8612a').setFontColor('#fff');
    sh.setFrozenRows(1);
  }
  return sh;
}
// a leading apostrophe keeps "2026-10-22" as text instead of a Sheets date
function comboText(v) { return v ? "'" + v : ''; }

function comboReserve(ymd) {
  if (!/^\d{6}$/.test(String(ymd))) return {error: 'ymd phải có dạng YYMMDD'};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getComboSheet();
    const prefix = 'SEN-' + ymd + '-';
    let max = 0;
    const last = sh.getLastRow();
    if (last >= 2) {
      sh.getRange(2, 1, last - 1, 1).getValues().forEach(r => {
        const c = String(r[0]);
        if (c.indexOf(prefix) === 0) max = Math.max(max, parseInt(c.slice(prefix.length), 10) || 0);
      });
    }
    const code = prefix + String(max + 1).padStart(2, '0');
    const now = new Date().toISOString();
    const created = '20' + ymd.slice(0, 2) + '-' + ymd.slice(2, 4) + '-' + ymd.slice(4, 6);
    // the placeholder row is what makes the number taken before the lock is released
    sh.appendRow([code, 'draft', comboText(created), now, '', '', 0, '', 0, 0, 0, 'none', '', '']);
    SpreadsheetApp.flush();
    return {ok: true, code: code};
  } finally {
    lock.releaseLock();
  }
}

function comboSave(p) {
  if (!p || !p.code) return {error: 'thiếu mã hóa đơn'};
  const sh = getComboSheet();
  const now = new Date().toISOString();
  const row = [p.code, p.status || 'draft', comboText(p.created), now, p.guest || '', p.phone || '',
    p.pax || 0, comboText(p.start), p.total || 0, p.deposit || 0, p.balance || 0, p.qr_account || 'none',
    p.pkg || '', JSON.stringify(p.data || {})];
  const r = findRow(sh, p.code);
  if (r > 0) sh.getRange(r, 1, 1, COMBO_HEADERS.length).setValues([row]);
  else sh.appendRow(row);
  return {ok: true, code: p.code, updated_at: now};
}

function comboRowToObj(row) {
  const o = {};
  COMBO_HEADERS.forEach((h, i) => o[h] = row[i]);
  try { o.data = o.data_json ? JSON.parse(o.data_json) : null; } catch (e) { o.data = null; }
  delete o.data_json;
  return o;
}

function comboList(limit) {
  const sh = getComboSheet();
  const last = sh.getLastRow();
  if (last < 2) return {items: []};
  const items = sh.getRange(2, 1, last - 1, COMBO_HEADERS.length).getValues().map(comboRowToObj);
  items.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  return {items: items.slice(0, limit), total: items.length};
}

function comboGet(code) {
  const sh = getComboSheet();
  const r = findRow(sh, code);
  if (r < 0) return {error: 'not found'};
  return {item: comboRowToObj(sh.getRange(r, 1, 1, COMBO_HEADERS.length).getValues()[0])};
}

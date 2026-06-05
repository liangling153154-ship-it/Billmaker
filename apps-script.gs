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
  'subtotal','balance'
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

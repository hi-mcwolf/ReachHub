/* 工具模块（PRD：触达工具模块 · 触达任务数据）
 * tools-task-data.html：触达任务数据（列表 / 筛选 / 汇总 / 单条编辑 / 批量设置 / 导入 / 导出）
 * export-center.html：导出中心
 * 任务与指标为演示数据，模拟「直接读取各来源数据库」；Parent / Palcode 与导出记录存 localStorage，跨页面保留。 */

/* ===================== 1. 演示数据 ===================== */
const TD_ME = 'marvin';
const TD_SOURCES = [
  { key: 'reach', label: '新触达', channel: 'SMS' },
  { key: 'oldsms', label: '旧 SMS 模块', channel: 'SMS' },
  { key: 'sop-viber', label: 'SOP', channel: 'Viber Biz' },
  { key: 'sop-msg', label: 'SOP', channel: 'Messenger Biz' },
];
const TD_CHANNELS = ['Viber Biz', 'Messenger Biz', 'SMS'];
const TD_DAY = 86400000;

function tdRand(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
function tdPad(n) { return String(n).padStart(2, '0'); }
function tdFmtTime(ts) { if (!ts) return '—'; const d = new Date(ts); return `${d.getFullYear()}-${tdPad(d.getMonth() + 1)}-${tdPad(d.getDate())} ${tdPad(d.getHours())}:${tdPad(d.getMinutes())}`; }
function tdFmtDate(ts) { const d = new Date(ts); return `${d.getFullYear()}-${tdPad(d.getMonth() + 1)}-${tdPad(d.getDate())}`; }
function tdYmd(ts) { const d = new Date(ts); return `${d.getFullYear()}${tdPad(d.getMonth() + 1)}${tdPad(d.getDate())}`; }

const TD_NAMES = {
  'SMS': ['30天未登录用户召回', '充值满赠提醒', '周末活动预告', 'VIP 生日祝福', '首充未完成提醒', 'Recall 7D inactive', '世界杯竞猜开奖通知'],
  'Viber Biz': ['低活跃用户召回', '新游上线推荐', '周末加码活动', 'Recall high value', 'VIP 专属回归礼'],
  'Messenger Biz': ['31-60天用户召回', '新客内容推送', '签到挑战提醒', 'Recall 15D inactive', '直播开播提醒'],
};
const TD_CREATORS = ['amy', 'bob', 'lily', 'ken', 'marvin', 'joy'];

function tdBuildTasks() {
  const now = Date.now();
  const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const list = [];
  const seq = {};
  const push = (src, i, daysAgo, hour, over = {}) => {
    const r = k => tdRand(`${src.key}-${i}-${k}`);
    const sendAt = startOfDay(now - daysAgo * TD_DAY) + hour * 3600000;
    const ymd = tdYmd(sendAt);
    seq[src.key + ymd] = (seq[src.key + ymd] || 0) + 1;
    const n = tdPad(seq[src.key + ymd]).padStart(3, '0');
    const prefix = { reach: 'T', oldsms: 'SMS-', 'sop-viber': 'VBM-', 'sop-msg': 'MBM-' }[src.key];
    const id = src.key === 'reach' ? `T${ymd}${n}` : `${prefix}${ymd}-${n}`;
    const names = TD_NAMES[src.channel];
    const total = Math.round((30000 + r('t') * 270000) / 1000) * 1000;
    const valid = Math.round(total * (0.72 + r('v') * 0.26));
    const dlr = Math.round(valid * (src.channel === 'Viber Biz' ? 0.5 + r('d') * 0.4 : 0.8 + r('d') * 0.17));
    const seen = src.channel === 'SMS' ? null : Math.round(dlr * (0.2 + r('s') * 0.18));
    const hasLink = src.channel !== 'SMS' || r('l') > 0.3;
    const click = hasLink ? Math.round(dlr * (0.01 + r('c') * 0.06)) : null;
    let creator = TD_CREATORS[Math.floor(r('cr') * TD_CREATORS.length)];
    if (src.key === 'oldsms' && r('raw') < 0.35) creator = 'sms_admin01'; // 对应不到 SSO 账号 → 原始账号名
    const updatedAt = src.key === 'oldsms' && r('u') < 0.4 ? null : Math.min(now, sendAt + (1 + r('ua') * 30) * 3600000);
    list.push(Object.assign({
      key: `${src.channel}|${id}`, source: src.key, sourceLabel: src.label, channel: src.channel,
      name: names[Math.floor(r('n') * names.length)], id, creator, sendAt,
      total, valid, dlr, seen, click, updatedAt,
    }, over));
  };
  /* 需求文档示例 4 条（ID 保留） */
  const fixed = [
    ['sop-msg', 'MBM-20261110-001', '31-60天用户召回', 120000, 90000, 82000, 26000, 5400, 'amy', 2, 10],
    ['sop-viber', 'VBM-20261110-003', '低活跃用户召回', 250000, 220000, 125000, 42000, 2600, 'bob', 2, 11],
    ['oldsms', 'SMS-20261110-002', '30天未登录用户召回', 100000, 95000, 76000, null, 1300, 'amy', 2, 13],
    ['sop-msg', 'MBM-20261111-004', '新客内容推送', 70000, 60000, 57000, 13500, 1700, 'marvin', 1, 9],
  ];
  fixed.forEach(([sk, id, name, total, valid, dlr, seen, click, creator, d, h]) => {
    const src = TD_SOURCES.find(s => s.key === sk);
    push(src, 'fx' + id, d, h, { id, key: `${src.channel}|${id}`, name, total, valid, dlr, seen, click, creator, updatedAt: Date.now() - 3 * 3600000 });
  });
  let i = 0;
  for (let d = 0; d < 75; d++) {
    TD_SOURCES.forEach(src => {
      const r = tdRand(`day-${d}-${src.key}`);
      const cnt = src.key === 'oldsms' ? (d > 20 ? 1 : 0) : (r < 0.35 ? 0 : r < 0.8 ? 1 : 2);
      for (let k = 0; k < cnt; k++) push(src, i++, d, 9 + Math.floor(tdRand(`h${i}`) * 10));
    });
  }
  return list.sort((a, b) => b.sendAt - a.sendAt);
}
const TD_TASKS = tdBuildTasks();
const TD_BY_KEY = Object.fromEntries(TD_TASKS.map(t => [t.key, t]));

/* ===================== 2. 策略标记 / 修改记录 / 导出记录（localStorage） ===================== */
const TD_LS_MARKS = 'rhToolMarks.v2', TD_LS_LOG = 'rhToolMarkLog.v2', TD_LS_EXP = 'rhToolExports.v1';
function tdLoad(k, def) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
function tdSave(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

function tdSeedMarks() {
  if (localStorage.getItem(TD_LS_MARKS)) return;
  const marks = {}, log = [];
  const parents = ['RECALL111', 'acc66', '召回活动A', 'NewUser_01', 'VIP生日', 'WC2026'];
  TD_TASKS.forEach((t, i) => {
    const r = tdRand('mk' + t.key);
    if (r < 0.45) {
      const p = parents[Math.floor(tdRand('p' + t.key) * parents.length)];
      const pc = r < 0.3 ? String(100000000000000 + Math.floor(tdRand('pc' + t.key) * 8e14)).slice(0, 15 + (i % 6)) : '';
      marks[t.key] = { parent: p, palcode: pc };
      log.push({ key: t.key, at: t.sendAt - 3600000, by: t.creator, src: t.source === 'reach' ? '新建任务' : '单条编辑', field: 'Parent', from: '', to: p });
      if (pc) log.push({ key: t.key, at: t.sendAt - 3500000, by: t.creator, src: t.source === 'reach' ? '新建任务' : '单条编辑', field: 'Palcode', from: '', to: pc });
    }
  });
  const fx = { 'Messenger Biz|MBM-20261110-001': 'RECALL111', 'Viber Biz|VBM-20261110-003': 'RECALL222', 'SMS|SMS-20261110-002': 'RECALL333' };
  Object.entries(fx).forEach(([k, p]) => { marks[k] = { parent: p, palcode: '123456789012345678' }; });
  delete marks['Messenger Biz|MBM-20261111-004'];
  tdSave(TD_LS_MARKS, marks); tdSave(TD_LS_LOG, log);
}
function tdMarks() { return tdLoad(TD_LS_MARKS, {}); }
function tdMark(key) { return tdMarks()[key] || { parent: '', palcode: '' }; }

/** 写入一批变更：changes = [{key, parent?, palcode?}]（undefined = 不修改，'' = 清空）；返回实际改动任务数 */
function tdApplyMarks(changes, src) {
  const marks = tdMarks(), log = tdLoad(TD_LS_LOG, []);
  const at = Date.now();
  let n = 0;
  changes.forEach(c => {
    const cur = marks[c.key] || { parent: '', palcode: '' };
    const next = { ...cur };
    let changed = false;
    ['parent', 'palcode'].forEach(f => {
      if (c[f] === undefined || c[f] === cur[f]) return;
      log.push({ key: c.key, at, by: TD_ME, src, field: f === 'parent' ? 'Parent' : 'Palcode', from: cur[f] || '', to: c[f] });
      next[f] = c[f]; changed = true;
    });
    if (changed) { n++; if (next.parent || next.palcode) marks[c.key] = next; else delete marks[c.key]; }
  });
  tdSave(TD_LS_MARKS, marks); tdSave(TD_LS_LOG, log);
  return n;
}

/* 字段规则（PRD 6.3.1） */
function tdNormParent(v) { return String(v ?? '').trim(); }
function tdNormPalcode(v) { return String(v ?? '').trim().replace(/^="?|"$/g, ''); }
/* Parent / Palcode：1–50 字符，中文、英文、数字、下划线、中划线；区分大小写，原样保存 */
const TD_CODE_RE = /^[\u4e00-\u9fa5A-Za-z0-9_-]{1,50}$/;
function tdParentErr(v) { return v && !TD_CODE_RE.test(v) ? 'Parent 只能包含中文、英文、数字、下划线、中划线，最多 50 个字符' : ''; }
function tdPalcodeErr(v) { return v && !TD_CODE_RE.test(v) ? 'Palcode 只能包含中文、英文、数字、下划线、中划线，最多 50 个字符' : ''; }

/* ===================== 3. 指标口径（PRD 6.2.3） ===================== */
const TD_RATES = [
  { k: 'validRate', l: '名单有效率', a: 'valid', b: 'total' },
  { k: 'dlrRate', l: '触达率', a: 'dlr', b: 'valid' },
  { k: 'seenRate', l: '查看率', a: 'seen', b: 'dlr' },
  { k: 'clickRate', l: '点击率', a: 'click', b: 'dlr' },
  { k: 'seenClickRate', l: '查看后点击率', a: 'click', b: 'seen' },
];
const TD_METRICS = [
  { k: 'total', l: '发送人数', x: '发送人数', tip: '上传或关联的原始名单人数' },
  { k: 'valid', l: '有效人数', x: '有效人数', tip: '经渠道校验后有效的人数' },
  { k: 'dlr', l: 'DLR', x: 'DLR成功触达人数', tip: '成功触达人数' },
  { k: 'seen', l: 'Seen', x: 'Seen查看人数', tip: '查看消息人数；SMS 无该指标' },
  { k: 'click', l: 'Click', x: 'Click点击人数', tip: '点击消息链接人数（去重）' },
];
function tdN(v) { return v == null ? '—' : Number(v).toLocaleString('en-US'); }
function tdPct(a, b) { return a == null || b == null || !b ? '—' : (a / b * 100).toFixed(2) + '%'; }
function tdSummary(rows) {
  const sum = k => { const vs = rows.map(r => r[k]).filter(v => v != null); return vs.length ? vs.reduce((s, v) => s + v, 0) : null; };
  const out = {};
  TD_METRICS.forEach(m => { out[m.k] = sum(m.k); });
  TD_RATES.forEach(r => {
    const both = rows.filter(x => x[r.a] != null && x[r.b] != null);
    out[r.k] = both.length ? tdPct(both.reduce((s, x) => s + x[r.a], 0), both.reduce((s, x) => s + x[r.b], 0)) : '—';
  });
  return out;
}

/* ===================== 4. 导出（PRD 6.4） ===================== */
const TD_EXPORT_COLS = ['渠道', '任务名称', '任务ID', '创建人', '发送时间', '发送人数', '有效人数', 'DLR成功触达人数', 'Seen查看人数', 'Click点击人数',
  '名单有效率', '触达率', '查看率', '点击率', '查看后点击率', 'Parent', 'Palcode', '数据更新时间'];
function tdExportRow(t) {
  const m = tdMark(t.key);
  const blank = v => v == null ? '' : v;
  const pct = (a, b) => { const p = tdPct(a, b); return p === '—' ? '' : p; };
  return [t.channel, t.name, t.id, t.creator, tdFmtTime(t.sendAt).replace(/-/g, '/'), blank(t.total), blank(t.valid), blank(t.dlr), blank(t.seen), blank(t.click),
    ...TD_RATES.map(r => pct(t[r.a], t[r.b])), m.parent, m.palcode ? `="${m.palcode}"` : '', t.updatedAt ? tdFmtTime(t.updatedAt).replace(/-/g, '/') : ''];
}
function tdCsv(rows) {
  const q = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n');
}
function tdExportJobs() {
  let jobs = tdLoad(TD_LS_EXP, null);
  if (!jobs) {
    const now = Date.now();
    const sample = TD_TASKS.slice(0, 40).map(t => t.key);
    jobs = [
      { id: 'E1', name: tdJobName(now - 3 * TD_DAY), fmt: 'xlsx', tool: '触达任务数据', by: TD_ME, keys: sample, count: sample.length, submitted: now - 3 * TD_DAY, ready: now - 3 * TD_DAY + 4000 },
      { id: 'E2', name: tdJobName(now - 9 * TD_DAY), fmt: 'csv', tool: '触达任务数据', by: TD_ME, keys: sample.slice(0, 12), count: 12, submitted: now - 9 * TD_DAY, ready: now - 9 * TD_DAY + 3000 },
      { id: 'E3', name: tdJobName(now - TD_DAY), fmt: 'xlsx', tool: '触达任务数据', by: TD_ME, keys: sample, count: null, submitted: now - TD_DAY, failed: '生成超时，请重新导出' },
    ];
    tdSave(TD_LS_EXP, jobs);
  }
  return jobs;
}
function tdJobName(ts) { const d = new Date(ts); return `触达任务数据_${tdYmd(ts)}${tdPad(d.getHours())}${tdPad(d.getMinutes())}${tdPad(d.getSeconds())}`; }
function tdJobStatus(j) {
  if (j.failed) return '失败';
  if (Date.now() < j.ready) return '生成中';
  if (Date.now() > j.ready + 7 * TD_DAY) return '已过期';
  return '已完成';
}
function tdSubmitExport(keys, fmt) {
  const jobs = tdExportJobs();
  const now = Date.now(), name = tdJobName(now);
  jobs.unshift({ id: 'E' + now, name, fmt, tool: '触达任务数据', by: TD_ME, keys, count: keys.length, submitted: now, ready: now + 4000 });
  tdSave(TD_LS_EXP, jobs);
}
function tdDownloadJob(j) {
  const rows = [TD_EXPORT_COLS].concat(j.keys.map(k => TD_BY_KEY[k]).filter(Boolean).map(tdExportRow));
  const blob = new Blob([tdCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${j.name}.csv`; // 原型统一下载 CSV；产品按所选格式（XLSX / CSV）生成
  document.body.appendChild(a); a.click(); a.remove();
  showToast(j.fmt === 'xlsx' ? '原型下载为 CSV（产品为 XLSX）' : '已下载');
}

/* ===================== 5. 触达任务数据页 ===================== */
const TD = { rows: [], page: 1, size: 20, sel: new Set(), filt: null, ms: {} };
const TD_SEL_MAX = 500;

function tdDefaultFilt() {
  const now = Date.now();
  return { ch: [], from: tdFmtDate(now - 29 * TD_DAY), to: tdFmtDate(now), creators: [], mine: false, names: '', ids: '', parents: [], palcode: '', unlinked: false };
}
function tdSplit(s, re) { return String(s || '').split(re).map(x => x.trim()).filter(Boolean); }

function tdReadFilt() {
  const v = id => document.getElementById(id).value;
  return {
    ch: TD.ms.ch.get(), from: v('tdFrom'), to: v('tdTo'), creators: TD.ms.creator.get(), mine: document.getElementById('tdMine').checked,
    names: v('tdNames'), ids: v('tdIds'), parents: TD.ms.parent.get(), palcode: v('tdPalcode').trim(), unlinked: document.getElementById('tdUnlinked').checked,
  };
}
function tdWriteFilt(f) {
  TD.ms.ch.set(f.ch); TD.ms.creator.set(f.creators); TD.ms.parent.set(f.parents);
  document.getElementById('tdFrom').value = f.from; document.getElementById('tdTo').value = f.to;
  document.getElementById('tdMine').checked = f.mine; document.getElementById('tdNames').value = f.names;
  document.getElementById('tdIds').value = f.ids; document.getElementById('tdPalcode').value = f.palcode;
  document.getElementById('tdUnlinked').checked = f.unlinked;
  tdSyncFiltLocks();
}
function tdSyncFiltLocks() {
  const mine = document.getElementById('tdMine').checked, un = document.getElementById('tdUnlinked').checked;
  TD.ms.creator.disable(mine);
  TD.ms.parent.disable(un); document.getElementById('tdPalcode').disabled = un;
}
function tdValidateFilt(f) {
  if (f.from && f.to && (new Date(f.to) - new Date(f.from)) / TD_DAY > 366) return '时间跨度不能超过 366 天';
  if (tdSplit(f.names, /[,，\n]/).length > 20) return '关键词最多 20 个';
  if (tdSplit(f.ids, /[\s,，]+/).length > 500) return '任务 ID 最多 500 个';
  return '';
}
function tdFilter(f) {
  const names = tdSplit(f.names, /[,，\n]/).map(s => s.toLowerCase());
  const ids = new Set(tdSplit(f.ids, /[\s,，]+/));
  const from = f.from ? new Date(f.from + 'T00:00:00').getTime() : -Infinity;
  const to = f.to ? new Date(f.to + 'T23:59:59').getTime() : Infinity;
  const marks = tdMarks();
  return TD_TASKS.filter(t => {
    const m = marks[t.key] || {};
    if (f.ch.length && !f.ch.includes(t.channel)) return false;
    if (t.sendAt < from || t.sendAt > to) return false;
    if (f.mine ? t.creator !== TD_ME : (f.creators.length && !f.creators.includes(t.creator))) return false;
    if (names.length && !names.some(k => t.name.toLowerCase().includes(k))) return false;
    if (ids.size && !ids.has(t.id)) return false;
    if (f.unlinked) return !m.parent && !m.palcode;
    if (f.parents.length && !f.parents.includes(m.parent)) return false;
    if (f.palcode && m.palcode !== f.palcode) return false;
    return true;
  });
}

function tdQuery(keepSel) {
  const f = tdReadFilt();
  const err = tdValidateFilt(f);
  if (err) { showToast(err); return; }
  TD.filt = f;
  TD.rows = tdFilter(f);
  if (!keepSel) { TD.sel.clear(); TD.page = 1; }
  const maxPage = Math.max(1, Math.ceil(TD.rows.length / TD.size));
  if (TD.page > maxPage) TD.page = maxPage;
  tdRender();
}
function tdRefreshParentOptions() {
  const ps = [...new Set(Object.values(tdMarks()).map(m => m.parent).filter(Boolean))].sort();
  TD.ms.parent.setOptions(ps.map(p => ({ v: p, l: p })));
}

function tdRender() {
  document.getElementById('tdExportTxt').textContent = `导出全部筛选结果（${TD.rows.length.toLocaleString('en-US')}）`;
  tdRenderSelBar();
  tdRenderTable();
  tdRenderPager();
  refreshIcons();
}
function tdRenderSummary() {
  const s = tdSummary(TD.rows);
  document.getElementById('tdSumTitle').textContent = `汇总（筛选结果 ${TD.rows.length.toLocaleString('en-US')} 个任务）`;
  document.getElementById('tdSum').innerHTML =
    `<div class="td-sum-row">${TD_METRICS.map(m => `<div class="td-sum-cell"><div class="td-sum-l">${m.l}</div><div class="td-sum-v">${tdN(s[m.k])}</div></div>`).join('')}</div>` +
    `<div class="td-sum-row">${TD_RATES.map(r => `<div class="td-sum-cell"><div class="td-sum-l">${r.l}</div><div class="td-sum-v sm">${s[r.k]}</div></div>`).join('')}</div>`;
}
function tdRenderSelBar() {
  const bar = document.getElementById('tdSelBar');
  const n = TD.sel.size;
  bar.hidden = !n;
  if (!n) return;
  const pageKeys = tdPageRows().map(t => t.key);
  const pageAll = pageKeys.length && pageKeys.every(k => TD.sel.has(k));
  const allSel = TD.rows.length && TD.rows.every(t => TD.sel.has(t.key));
  const scope = allSel ? `已选全部 ${TD.rows.length} 条筛选结果` : `已选 ${n} 个任务${pageAll && n === pageKeys.length ? '（当前页）' : ''}`;
  const allLink = allSel ? '' : TD.rows.length <= TD_SEL_MAX
    ? `<button class="link-btn" id="tdSelAll">选择全部 ${TD.rows.length} 条筛选结果 ›</button>`
    : `<button class="link-btn" id="tdSelAll" data-over="1">选择全部 ${TD.rows.length} 条筛选结果 ›</button>`;
  bar.innerHTML = `<span class="td-sel-n">${scope}</span>${allLink}
    <button class="btn btn-primary btn-sm" id="tdBatch">批量设置</button>
    <button class="btn btn-outline btn-sm" id="tdExportSel">导出所选</button>
    <button class="link-btn" id="tdSelClear">取消选择</button>`;
  bar.querySelector('#tdSelAll')?.addEventListener('click', e => {
    if (e.currentTarget.dataset.over) { showToast(`筛选结果超过 ${TD_SEL_MAX} 条，请缩小范围或使用导入`); return; }
    TD.rows.forEach(t => TD.sel.add(t.key)); tdRender();
  });
  bar.querySelector('#tdBatch').addEventListener('click', tdOpenBatch);
  bar.querySelector('#tdExportSel').addEventListener('click', () => tdOpenExport([...TD.sel]));
  bar.querySelector('#tdSelClear').addEventListener('click', () => { TD.sel.clear(); tdRender(); });
}
function tdPageRows() { return TD.rows.slice((TD.page - 1) * TD.size, TD.page * TD.size); }
function tdRenderTable() {
  const rows = tdPageRows();
  const marks = tdMarks();
  const pageAll = rows.length && rows.every(t => TD.sel.has(t.key));
  const th = m => `<th class="v2-num" title="${m.tip}">${m.l}</th>`;
  document.getElementById('tdTable').innerHTML = `<thead><tr>
      <th class="td-ck"><input type="checkbox" id="tdCkPage" ${pageAll ? 'checked' : ''}></th>
      <th>渠道</th><th>任务名称 / 任务 ID</th><th>创建人</th><th>发送时间</th>${TD_METRICS.map(th).join('')}
      <th>Parent</th><th>Palcode</th><th>数据更新时间</th><th>操作</th></tr></thead>
    <tbody>${rows.length ? rows.map(t => {
      const m = marks[t.key] || {};
      return `<tr data-key="${esc(t.key)}" class="${TD.sel.has(t.key) ? 'td-row-sel' : ''}">
        <td class="td-ck"><input type="checkbox" data-ck ${TD.sel.has(t.key) ? 'checked' : ''}></td>
        <td>${esc(t.channel)}${t.source === 'oldsms' ? '<div class="v2-hint">旧 SMS 模块</div>' : ''}</td>
        <td><div class="td-name" title="${esc(t.name)}">${esc(t.name)}</div><div class="v2-hint td-id">${esc(t.id)}</div></td>
        <td>${esc(t.creator)}</td>
        <td>${tdFmtTime(t.sendAt)}</td>
        ${TD_METRICS.map(x => `<td class="v2-num">${tdN(t[x.k])}</td>`).join('')}
        <td>${m.parent ? esc(m.parent) : '<span class="cell-muted">—</span>'}</td>
        <td>${m.palcode ? `<span class="td-pal" title="${esc(m.palcode)}">${esc(m.palcode)}</span>` : '<span class="cell-muted">—</span>'}</td>
        <td>${tdFmtTime(t.updatedAt)}</td>
        <td><button class="link-btn" data-edit>编辑</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="16" class="td-empty">没有符合条件的任务</td></tr>`}</tbody>`;
  const tbl = document.getElementById('tdTable');
  tbl.querySelector('#tdCkPage')?.addEventListener('change', e => {
    if (e.target.checked) {
      const add = rows.filter(t => !TD.sel.has(t.key));
      if (TD.sel.size + add.length > TD_SEL_MAX) { e.target.checked = false; showToast(`最多选择 ${TD_SEL_MAX} 个任务`); return; }
      add.forEach(t => TD.sel.add(t.key));
    } else rows.forEach(t => TD.sel.delete(t.key));
    tdRender();
  });
  tbl.querySelectorAll('[data-ck]').forEach(ck => ck.addEventListener('change', e => {
    const key = e.target.closest('tr').dataset.key;
    if (e.target.checked) {
      if (TD.sel.size >= TD_SEL_MAX) { e.target.checked = false; showToast(`最多选择 ${TD_SEL_MAX} 个任务`); return; }
      TD.sel.add(key);
    } else TD.sel.delete(key);
    tdRender();
  }));
  tbl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => tdOpenEdit(e.target.closest('tr').dataset.key)));
}
function tdRenderPager() {
  const total = TD.rows.length, pages = Math.max(1, Math.ceil(total / TD.size));
  const nums = [];
  for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - TD.page) <= 2) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
  document.getElementById('tdPager').innerHTML = `<span class="page-total">共 ${total} 条</span>
    <select class="select td-size" id="tdSize">${[20, 50, 100].map(s => `<option value="${s}" ${s === TD.size ? 'selected' : ''}>${s} 条/页</option>`).join('')}</select>
    <button class="page-btn" data-p="${TD.page - 1}" ${TD.page <= 1 ? 'disabled' : ''}>‹</button>
    ${nums.map(p => p === '…' ? '<span class="page-total">…</span>' : `<button class="page-btn${p === TD.page ? ' active' : ''}" data-p="${p}">${p}</button>`).join('')}
    <button class="page-btn" data-p="${TD.page + 1}" ${TD.page >= pages ? 'disabled' : ''}>›</button>`;
  document.querySelectorAll('#tdPager [data-p]').forEach(b => b.addEventListener('click', () => { TD.page = +b.dataset.p; tdRender(); }));
  document.getElementById('tdSize').addEventListener('change', e => { TD.size = +e.target.value; TD.page = 1; tdRender(); });
}

/* ---- 单条编辑（6.3.2） ---- */
function tdOpenEdit(key) {
  const t = TD_BY_KEY[key], m = tdMark(key);
  const log = tdLoad(TD_LS_LOG, []).filter(l => l.key === key).sort((a, b) => b.at - a.at);
  const body = document.getElementById('tdEditBody');
  body.innerHTML = `<div class="td-edit-head">${esc(t.channel)} · ${esc(t.name)} · <span class="td-id">${esc(t.id)}</span></div>
    <div class="td-form">
      <label class="td-f"><span class="field-label">Parent</span><input class="input" id="tdEParent" placeholder="请输入 Parent" value="${esc(m.parent)}"><span class="td-err" id="tdEParentErr"></span></label>
      <label class="td-f"><span class="field-label">Palcode</span><input class="input" id="tdEPalcode" placeholder="请输入 Palcode" value="${esc(m.palcode)}"><span class="td-err" id="tdEPalcodeErr"></span></label>
      <div class="v2-hint">两个字段都清空保存 = 该任务变为未关联</div>
    </div>
    <h4 class="card-title td-log-title">修改记录</h4>
    ${log.length ? `<table class="table stats-table td-log"><thead><tr><th>时间</th><th>操作人</th><th>来源</th><th>字段</th><th>修改前</th><th>修改后</th></tr></thead><tbody>
      ${log.map(l => `<tr><td>${tdFmtTime(l.at)}</td><td>${esc(l.by)}</td><td>${esc(l.src)}</td><td>${l.field}</td><td>${l.from ? esc(l.from) : '—'}</td><td>${l.to ? esc(l.to) : '—'}</td></tr>`).join('')}
    </tbody></table>` : '<div class="v2-hint">暂无修改记录</div>'}`;
  const save = document.getElementById('tdESave');
  const check = () => {
    const p = tdNormParent(document.getElementById('tdEParent').value), pc = tdNormPalcode(document.getElementById('tdEPalcode').value);
    save.disabled = p === m.parent && pc === m.palcode;
  };
  body.querySelectorAll('input').forEach(i => i.addEventListener('input', check));
  check();
  save.onclick = () => {
    const p = tdNormParent(document.getElementById('tdEParent').value), pc = tdNormPalcode(document.getElementById('tdEPalcode').value);
    const pe = tdParentErr(p), ce = tdPalcodeErr(pc);
    document.getElementById('tdEParentErr').textContent = pe; document.getElementById('tdEPalcodeErr').textContent = ce;
    if (pe || ce) return;
    tdApplyMarks([{ key, parent: p, palcode: pc }], '单条编辑');
    closeDrawer('tdEditDrawer'); showToast('已保存');
    tdRefreshParentOptions(); tdQuery(true);
  };
  const cancel = () => {
    const dirty = !save.disabled;
    if (!dirty) { closeDrawer('tdEditDrawer'); return; }
    v2Modal({ title: '放弃修改？', body: '<p>修改尚未保存，关闭后将丢失。</p>', okText: '放弃', danger: true, width: 400, onOk: () => closeDrawer('tdEditDrawer') });
  };
  document.querySelectorAll('#tdEditDrawer [data-cancel]').forEach(b => { b.onclick = cancel; });
  openDrawer('tdEditDrawer');
  refreshIcons();
}

/* ---- 批量设置（6.3.3） ---- */
function tdOpenBatch() {
  const keys = [...TD.sel];
  const fieldRow = (f, label, ph) => `<div class="td-batch-row" data-f="${f}">
      <span class="td-batch-l">${label}</span>
      <label><input type="radio" name="tdB_${f}" value="keep" checked> 不修改</label>
      <label><input type="radio" name="tdB_${f}" value="set"> 设为</label>
      <input class="input td-batch-in" data-in placeholder="${ph}" hidden>
      <label><input type="radio" name="tdB_${f}" value="clear"> 清空</label>
      <div class="td-err" data-err></div>
    </div>`;
  const root = v2Modal({
    title: `批量设置 Parent / Palcode（已选 ${keys.length} 个任务）`, width: 620, okText: '确定',
    body: `${fieldRow('parent', 'Parent', '请输入 Parent')}${fieldRow('palcode', 'Palcode', '请输入 Palcode')}
      <div class="v2-callout warn td-batch-warn" id="tdBWarn" hidden><i data-lucide="alert-triangle"></i><span></span></div>`,
    onOk: r => {
      const st = tdBatchState(r);
      let bad = false;
      ['parent', 'palcode'].forEach(f => {
        const row = r.querySelector(`[data-f="${f}"]`);
        const e = st[f].act === 'set' ? (!st[f].val ? `请输入 ${f === 'parent' ? 'Parent' : 'Palcode'}` : (f === 'parent' ? tdParentErr(st[f].val) : tdPalcodeErr(st[f].val))) : '';
        row.querySelector('[data-err]').textContent = e; if (e) bad = true;
      });
      if (bad) return false;
      const val = f => st[f].act === 'keep' ? undefined : st[f].act === 'clear' ? '' : st[f].val;
      const n = tdApplyMarks(keys.map(key => ({ key, parent: val('parent'), palcode: val('palcode') })), '批量设置');
      showToast(`已更新 ${n} 个任务`);
      tdRefreshParentOptions(); tdQuery(true);
    },
  });
  const okBtn = root.querySelector('[data-ok]');
  const sync = () => {
    const st = tdBatchState(root);
    root.querySelectorAll('.td-batch-row').forEach(row => { row.querySelector('[data-in]').hidden = st[row.dataset.f].act !== 'set'; });
    okBtn.disabled = st.parent.act === 'keep' && st.palcode.act === 'keep';
    const marks = tdMarks();
    const msgs = [];
    ['parent', 'palcode'].forEach(f => {
      const s = st[f]; if (s.act === 'keep') return;
      const target = s.act === 'clear' ? '' : s.val;
      const n = keys.filter(k => (marks[k] || {})[f] && (marks[k] || {})[f] !== target).length;
      if (n) msgs.push(`${n} 个任务已有 ${f === 'parent' ? 'Parent' : 'Palcode'}，将被${s.act === 'clear' ? '清空' : '覆盖'}`);
    });
    const w = root.querySelector('#tdBWarn');
    w.hidden = !msgs.length; w.querySelector('span').textContent = '其中 ' + msgs.join('；');
  };
  root.querySelectorAll('input').forEach(i => i.addEventListener('input', sync));
  root.querySelectorAll('input[type=radio]').forEach(i => i.addEventListener('change', sync));
  sync();
}
function tdBatchState(root) {
  const s = f => {
    const act = root.querySelector(`input[name="tdB_${f}"]:checked`).value;
    const raw = root.querySelector(`[data-f="${f}"] [data-in]`).value;
    return { act, val: f === 'parent' ? tdNormParent(raw) : tdNormPalcode(raw) };
  };
  return { parent: s('parent'), palcode: s('palcode') };
}

/* ---- 导出（6.4.2） ---- */
function tdOpenExport(keys, all) {
  if (!keys.length) { showToast('没有可导出的任务'); return; }
  if (keys.length > 100000) { showToast('导出任务超过 10 万条，请缩小筛选范围'); return; }
  v2Modal({
    title: '导出任务数据', width: 440, okText: '导出',
    body: `<p class="td-mb8">${!all ? `导出已选 <b>${keys.length}</b> 个任务` : `导出当前筛选结果全部 <b>${keys.length}</b> 个任务（不受分页限制）`}</p>
      <div class="radio-group"><label><input type="radio" name="tdFmt" value="xlsx" checked> XLSX</label><label><input type="radio" name="tdFmt" value="csv"> CSV</label></div>
      <p class="v2-hint td-mt8">文件可直接用于填写 Parent / Palcode 后导入。</p>`,
    onOk: r => {
      tdSubmitExport(keys, r.querySelector('input[name=tdFmt]:checked').value);
      tdToastLink('已提交导出，可在导出中心下载', '去导出中心', 'export-center.html');
    },
  });
}
function tdToastLink(msg, linkText, href) {
  showToast(msg);
  const el = document.querySelector('.toast');
  if (el) el.innerHTML = `${esc(msg)} <a href="${href}" class="td-toast-link">${linkText}</a>`;
}

/* ---- 导入（6.3.4） ---- */
function tdParseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  text = text.replace(/^\ufeff/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function tdAnalyzeImport(table) {
  const head = table[0].map(h => h.trim());
  const need = ['渠道', '任务ID', 'Parent', 'Palcode'];
  const miss = need.filter(n => !head.includes(n));
  if (miss.length) return { error: `文件缺少 ${miss.join('、')} 列，请使用导出的文件填写` };
  const body = table.slice(1);
  if (body.length > 5000) return { error: '最多 5000 行，请拆分文件' };
  const ix = Object.fromEntries(need.map(n => [n, head.indexOf(n)]));
  const marks = tdMarks();
  const keyCount = {};
  body.forEach(r => { const k = `${(r[ix['渠道']] || '').trim()}|${(r[ix['任务ID']] || '').trim()}`; keyCount[k] = (keyCount[k] || 0) + 1; });
  const items = body.map((r, i) => {
    const ch = (r[ix['渠道']] || '').trim(), id = (r[ix['任务ID']] || '').trim();
    const key = `${ch}|${id}`;
    const rawPc = (r[ix['Palcode']] || '').trim();
    const p = tdNormParent(r[ix['Parent']]), pc = tdNormPalcode(rawPc);
    const it = { line: i + 2, ch, id, key, parent: p, palcode: pc };
    const cur = marks[key] || { parent: '', palcode: '' };
    it.cur = cur;
    if (!TD_BY_KEY[key]) return { ...it, res: 'error', err: '任务不存在' };
    if (keyCount[key] > 1) return { ...it, res: 'error', err: '同一任务在文件中出现多次' };
    if (/e\+/i.test(rawPc) || /\.\d/.test(rawPc)) return { ...it, res: 'error', err: 'Palcode 被转为数值、精度丢失，请将单元格设为文本后重填' };
    const e = tdParentErr(p) || tdPalcodeErr(pc);
    if (e) return { ...it, res: 'error', err: e };
    const changed = ['parent', 'palcode'].filter(f => cur[f] !== it[f]);
    if (!changed.length) return { ...it, res: 'same' };
    const wasEmpty = !cur.parent && !cur.palcode, nowEmpty = !p && !pc;
    return { ...it, res: wasEmpty ? 'add' : nowEmpty ? 'clear' : 'mod' };
  });
  return { items };
}
const TD_RES = { add: '新增', mod: '修改', clear: '清空', same: '不变', error: '错误' };

function tdOpenImport() {
  let analysis = null, filt = 'all';
  const root = v2Modal({
    title: '导入 Parent / Palcode', width: 820, okText: '确认导入',
    body: `<ol class="td-steps"><li>先导出任务数据，在表格的 Parent、Palcode 列填写</li><li>上传填写好的文件（XLSX / CSV，最多 5000 行）</li></ol>
      <label class="td-drop" id="tdDrop"><input type="file" id="tdFile" accept=".csv,.xlsx" hidden><i data-lucide="upload"></i><span>点击或拖拽上传</span></label>
      <div class="td-demo-file"><button class="link-btn" id="tdDemoFile">使用示例文件演示</button><span class="v2-hint">（原型解析 CSV；示例文件按当前筛选结果生成，含各类结果）</span></div>
      <div id="tdImpPreview"></div>`,
    onOk: () => {
      if (!analysis || !analysis.items) return false;
      const ch = analysis.items.filter(i => ['add', 'mod', 'clear'].includes(i.res));
      const n = tdApplyMarks(ch.map(i => ({ key: i.key, parent: i.parent, palcode: i.palcode })), '导入');
      const errN = analysis.items.filter(i => i.res === 'error').length;
      showToast(`已导入 ${n} 条，跳过 ${errN} 条错误`);
      tdRefreshParentOptions(); tdQuery(true);
    },
  });
  const ok = root.querySelector('[data-ok]');
  ok.disabled = true;
  const draw = () => {
    const host = root.querySelector('#tdImpPreview');
    if (!analysis) { host.innerHTML = ''; return; }
    if (analysis.error) { host.innerHTML = `<div class="v2-callout danger td-mt8"><i data-lucide="x-circle"></i><span>${esc(analysis.error)}</span></div>`; ok.disabled = true; refreshIcons(); return; }
    const its = analysis.items;
    const cnt = k => its.filter(i => i.res === k).length;
    const changes = cnt('add') + cnt('mod') + cnt('clear');
    ok.disabled = !changes; ok.textContent = `确认导入 ${changes} 条变更`;
    const list = filt === 'all' ? its : its.filter(i => i.res === filt);
    const fv = (a, b) => a === b ? '<span class="cell-muted">不变</span>' : `${a ? esc(a) : '—'} → ${b ? esc(b) : '—'}`;
    host.innerHTML = `<div class="td-imp-sum"><span>预览：共 ${its.length} 行</span>
        ${['all', 'add', 'mod', 'clear', 'same', 'error'].map(k => `<button class="td-chip${filt === k ? ' on' : ''} ${k === 'error' && cnt('error') ? 'err' : ''}" data-rf="${k}">${k === 'all' ? '全部' : TD_RES[k]} ${k === 'all' ? its.length : cnt(k)}</button>`).join('')}
        ${cnt('error') ? '<button class="link-btn" id="tdErrDl">下载错误明细</button>' : ''}</div>
      <div class="table-scroll td-imp-scroll"><table class="table stats-table"><thead><tr><th>行号</th><th>渠道</th><th>任务 ID</th><th>结果</th><th>Parent 前 → 后</th><th>Palcode 前 → 后</th></tr></thead><tbody>
        ${list.map(i => `<tr><td>${i.line}</td><td>${esc(i.ch)}</td><td>${esc(i.id)}</td><td><span class="tag ${i.res === 'error' ? 'tag-danger' : i.res === 'same' ? 'tag-gray' : 'tag-info'}">${TD_RES[i.res]}</span></td>
          ${i.res === 'error' ? `<td colspan="2" class="td-err-cell">${esc(i.err)}</td>` : `<td>${fv(i.cur.parent, i.parent)}</td><td>${fv(i.cur.palcode, i.palcode)}</td>`}</tr>`).join('') || '<tr><td colspan="6" class="td-empty">无</td></tr>'}
      </tbody></table></div>`;
    host.querySelectorAll('[data-rf]').forEach(b => b.addEventListener('click', () => { filt = b.dataset.rf; draw(); }));
    host.querySelector('#tdErrDl')?.addEventListener('click', () => {
      const rows = [['原始行号', '渠道', '任务ID', '错误原因']].concat(its.filter(i => i.res === 'error').map(i => [i.line, i.ch, i.id, i.err]));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tdCsv(rows)], { type: 'text/csv' })); a.download = '导入错误明细.csv'; a.click();
    });
    refreshIcons();
  };
  const loadText = text => { filt = 'all'; const t = tdParseCsv(text); analysis = t.length ? tdAnalyzeImport(t) : { error: '文件为空' }; draw(); };
  const onFile = f => {
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) { analysis = { error: '仅支持 XLSX / CSV 文件' }; draw(); return; }
    if (/\.xlsx$/i.test(f.name)) { showToast('原型仅解析 CSV，可用「使用示例文件演示」'); return; }
    root.querySelector('#tdDrop span').textContent = f.name;
    const rd = new FileReader(); rd.onload = () => loadText(rd.result); rd.readAsText(f, 'utf-8');
  };
  root.querySelector('#tdFile').addEventListener('change', e => onFile(e.target.files[0]));
  const drop = root.querySelector('#tdDrop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); onFile(e.dataTransfer.files[0]); });
  root.querySelector('#tdDemoFile').addEventListener('click', () => {
    root.querySelector('#tdDrop span').textContent = '示例文件.csv';
    loadText(tdCsv(tdDemoImportRows()));
  });
}
/** 示例导入文件：取当前筛选结果前 14 条，覆盖 新增 / 修改 / 清空 / 不变 / 错误 各种情况 */
function tdDemoImportRows() {
  const src = (TD.rows.length ? TD.rows : TD_TASKS).slice(0, 14);
  const marks = tdMarks();
  const rows = src.map((t, i) => {
    const r = tdExportRow(t);
    const m = marks[t.key] || {};
    const pi = TD_EXPORT_COLS.indexOf('Parent'), ci = TD_EXPORT_COLS.indexOf('Palcode');
    const kind = i % 7;
    if (kind === 0 || kind === 1) { r[pi] = m.parent ? m.parent + '_V2' : 'RECALL888'; r[ci] = '="9876543210123456"'; }
    else if (kind === 2) { r[pi] = ''; r[ci] = ''; }
    else if (kind === 4) { r[ci] = '1.23457E+17'; }
    else if (kind === 5) { r[pi] = 'recall 999'; }
    return r;
  });
  /* 补 3 个未关联任务 → 新增 */
  TD_TASKS.filter(t => !marks[t.key] && !src.includes(t)).slice(0, 3).forEach(t => {
    const r = tdExportRow(t); r[TD_EXPORT_COLS.indexOf('Parent')] = 'NEWUSER_02'; r[TD_EXPORT_COLS.indexOf('Palcode')] = '="202611240000000001"'; rows.push(r);
  });
  rows.push(['SMS', '不存在的任务', 'SMS-20200101-999', '', '', '', '', '', '', '', '', '', '', '', '', 'RECALL111', '', '']);
  if (src[3]) rows.push(tdExportRow(src[3]));
  return [TD_EXPORT_COLS].concat(rows);
}

function tdInitPage() {
  tdSeedMarks();
  TD.ms.ch = faMultiSelect(document.getElementById('tdCh'), { options: TD_CHANNELS.map(c => ({ v: c, l: c })), placeholder: '全部渠道' });
  const creators = [...new Set(TD_TASKS.map(t => t.creator))].sort();
  TD.ms.creator = faMultiSelect(document.getElementById('tdCreator'), { options: creators.map(c => ({ v: c, l: c })), placeholder: '全部创建人' });
  TD.ms.parent = faMultiSelect(document.getElementById('tdParent'), { options: [], placeholder: '全部' });
  tdRefreshParentOptions();
  document.addEventListener('click', () => document.querySelectorAll('.ms.open').forEach(m => m.classList.remove('open')));
  document.getElementById('tdMine').addEventListener('change', tdSyncFiltLocks);
  document.getElementById('tdUnlinked').addEventListener('change', tdSyncFiltLocks);
  document.getElementById('tdQueryBtn').addEventListener('click', () => tdQuery(false));
  document.getElementById('tdResetBtn').addEventListener('click', () => { tdWriteFilt(tdDefaultFilt()); tdQuery(false); });
  document.getElementById('tdExportBtn').addEventListener('click', () => tdOpenExport(TD.rows.map(t => t.key), true));
  document.getElementById('tdImportBtn').addEventListener('click', tdOpenImport);
  ['tdNames', 'tdIds', 'tdPalcode'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && id !== 'tdNames') tdQuery(false); }));
  /* 支持 URL 参数快速定位：?name=召回&mine=1 */
  const f = tdDefaultFilt(), qs = new URLSearchParams(location.search);
  if (qs.get('name')) f.names = qs.get('name');
  if (qs.get('mine')) f.mine = true;
  tdWriteFilt(f);
  tdQuery(false);
}

/* ===================== 6. 导出中心 ===================== */
function ecRender() {
  const jobs = tdExportJobs().filter(j => j.by === TD_ME);
  const tagCls = { '生成中': 'tag-info', '已完成': 'tag-success', '失败': 'tag-danger', '已过期': 'tag-gray' };
  document.getElementById('ecTable').innerHTML = `<thead><tr><th>文件名</th><th>来源工具</th><th>格式</th><th class="v2-num">条数</th><th>状态</th><th>提交时间</th><th>过期时间</th><th>操作</th></tr></thead>
    <tbody>${jobs.map(j => {
      const st = tdJobStatus(j);
      return `<tr data-id="${j.id}"><td>${esc(j.name)}.${j.fmt}</td><td>${esc(j.tool)}</td><td>${j.fmt.toUpperCase()}</td>
        <td class="v2-num">${st === '已完成' || st === '已过期' ? tdN(j.count) : '-'}</td>
        <td><span class="tag ${tagCls[st]}" ${st === '失败' ? `title="${esc(j.failed)}"` : ''}>${st}</span>${st === '失败' ? `<div class="v2-hint">${esc(j.failed)}</div>` : ''}</td>
        <td>${tdFmtTime(j.submitted)}</td><td>${j.failed || st === '生成中' ? '-' : tdFmtTime(j.ready + 7 * TD_DAY)}</td>
        <td>${st === '已完成' ? '<button class="link-btn" data-dl>下载</button>' : ''}${st === '失败' || st === '已过期' ? '<button class="link-btn" data-redo>重新导出</button>' : ''}</td></tr>`;
    }).join('') || '<tr><td colspan="8" class="td-empty">暂无导出记录</td></tr>'}</tbody>`;
  const byId = id => tdExportJobs().find(j => j.id === id);
  document.querySelectorAll('#ecTable [data-dl]').forEach(b => b.addEventListener('click', e => tdDownloadJob(byId(e.target.closest('tr').dataset.id))));
  document.querySelectorAll('#ecTable [data-redo]').forEach(b => b.addEventListener('click', e => {
    const j = byId(e.target.closest('tr').dataset.id);
    tdSubmitExport(j.keys, j.fmt); showToast('已重新提交导出'); ecRender();
  }));
  if (jobs.some(j => tdJobStatus(j) === '生成中')) setTimeout(ecRender, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  renderSidebar('reach', 'reach-tools', page === 'export' ? 'tools-export' : 'tools-task-data');
  renderTopbar();
  if (page === 'export') ecRender(); else tdInitPage();
  bindDrawerClose();
  refreshIcons();
});

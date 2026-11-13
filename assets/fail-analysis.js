/* 失败原因分析组件（PRD 6.3.3；通道日报下钻 6.4.2 复用）
 * 统一分类 / 阶段 / 建议动作取 6.1.4 失败码映射表；原始码为演示数据。
 * 原子行格式：{ stage, cat, code, text, vendor, account, sender, channel, task, prefix, count } */

/* ---- 6.1.4 统一失败分类 → 阶段 / 建议动作 ---- */
const FA_CATS = [
  ['发送前拦截', '重复', '调整人群'], ['发送前拦截', '黑名单', '调整人群'], ['发送前拦截', 'DND', '调整人群'],
  ['发送前拦截', 'DNC', '调整人群'], ['发送前拦截', '频控', '调整人群或发送时间'], ['发送前拦截', '格式无效', '清洗名单'],
  ['发送前拦截', '退订', '调整人群'], ['发送前拦截', '敏感词', '修改内容'], ['发送前拦截', '无触达地址', '清洗名单'],
  ['提交失败', '账号鉴权或余额', '联系供应商 / 充值'], ['提交失败', '模板或签名无效', '检查供应商侧配置'],
  ['提交失败', '号段或目标不支持', '清洗名单'], ['提交失败', '内容被供应商拒绝', '修改内容'],
  ['提交失败', '供应商限流', '降低 TPS 或改时间'], ['提交失败', '供应商网关故障', '等待恢复，路由重试'],
  ['提交失败', '参数错误', '研发排查'],
  ['未送达', '号码或地址无效', '清洗名单'], ['未送达', '用户不可达', '换通道或稍后重试'],
  ['未送达', '用户拒收', '加入退订 / 屏蔽名单'], ['未送达', '运营商或平台拦截', '修改内容、检查发件信誉'],
  ['未送达', '终端或网络超时', '稍后重试'],
  ['过期无回执', '已过期', '检查队列与供应商回执'], ['过期无回执', '无回执', '检查队列与供应商回执'],
  ['待归类', '未分类', '待规则维护者归类'],
].map(([stage, cat, action]) => ({ stage, cat, action }));
function faCat(cat) { return FA_CATS.find(c => c.cat === cat) || { stage: '待归类', cat, action: '待规则维护者归类' }; }

const FA_STAGE_ORDER = ['发送前拦截', '提交失败', '未送达', '过期无回执', '待归类'];
const FA_NO_VENDOR = '—';

/* ---- 原始码（演示）：供应商 × 统一分类 → [原始码, 原文, 权重] ---- */
const FA_CODES = {
  Globe: {
    号码或地址无效: [['0x0B', 'Invalid destination', 7], ['G-1104', 'Number not in service', 3]],
    用户不可达: [['G-2105', 'Absent subscriber', 1]], 用户拒收: [['G-2201', 'Subscriber opted out', 1]],
    运营商或平台拦截: [['G-3301', 'Blocked by carrier filter', 1]], 终端或网络超时: [['G-2408', 'Handset memory full', 1]],
    账号鉴权或余额: [['G-401', 'Authentication failed', 1]], 模板或签名无效: [['G-0412', 'Sender ID not registered', 1]],
    号段或目标不支持: [['G-0415', 'Destination not supported', 1]], 内容被供应商拒绝: [['G-0451', 'Content rejected', 1]],
    供应商限流: [['G-429', 'Throttled', 1]], 供应商网关故障: [['G-503', 'Service unavailable', 1]],
  },
  Smart: {
    号码或地址无效: [['S-001', 'Unknown subscriber', 3], ['S-013', 'Invalid MSISDN', 1]],
    用户不可达: [['S-027', 'Subscriber absent', 1]], 用户拒收: [['S-033', 'Barred by user', 1]],
    运营商或平台拦截: [['S-451', 'Spam filter rejected', 1]], 终端或网络超时: [['S-058', 'Delivery timeout', 1]],
    账号鉴权或余额: [['S-401', 'Invalid credentials', 1]], 模板或签名无效: [['S-412', 'Mask not whitelisted', 1]],
    号段或目标不支持: [['S-415', 'Prefix not routable', 1]], 内容被供应商拒绝: [['S-452', 'Message content rejected', 1]],
    供应商限流: [['S-429', 'Too many requests', 1]], 供应商网关故障: [['S-500', 'Internal server error', 1]],
  },
  DLink: {
    号码或地址无效: [['D-11', 'Invalid number', 1]], 用户不可达: [['D-21', 'Phone off', 1]], 用户拒收: [['D-22', 'Blocked', 1]],
    运营商或平台拦截: [['D-31', 'Operator rejected', 1]], 终端或网络超时: [['D-41', 'Expired at SMSC', 1]],
    账号鉴权或余额: [['D-401', 'Balance insufficient', 1]], 模板或签名无效: [['D-412', 'Sender invalid', 1]],
    号段或目标不支持: [['D-415', 'Not supported', 1]], 内容被供应商拒绝: [['D-452', 'Keyword blocked', 1]],
    供应商限流: [['D-429', 'Throttled', 1]], 供应商网关故障: [['D-502', 'Bad gateway', 1]],
  },
  NXLink: {
    号码或地址无效: [['NX-01', 'UNDELIV: invalid number', 1]], 用户不可达: [['NX-05', 'UNDELIV: absent', 1]],
    用户拒收: [['NX-06', 'REJECTD: user barred', 1]], 运营商或平台拦截: [['NX-09', 'REJECTD: operator spam filter', 3], ['NX-10', 'REJECTD: sender blocked', 1]],
    终端或网络超时: [['NX-12', 'EXPIRED', 1]], 账号鉴权或余额: [['NX-401', 'No balance', 1]], 模板或签名无效: [['NX-412', 'Sender not approved', 1]],
    号段或目标不支持: [['NX-415', 'Route not found', 1]], 内容被供应商拒绝: [['NX-452', 'Content blocked', 1]],
    供应商限流: [['NX-429', 'Rate limit', 1]], 供应商网关故障: [['NX-504', 'Gateway timeout', 1]],
    未分类: [['NX-77', 'ERR_77', 2], ['NX-81', 'ERR_81 unknown', 1]],
  },
  OneSignal: {
    号码或地址无效: [['550 5.1.1', 'User unknown', 3], ['550 5.1.10', 'Recipient address rejected', 1]],
    用户不可达: [['452 4.2.2', 'Mailbox full', 1]], 用户拒收: [['complaint', 'Marked as spam', 1]],
    运营商或平台拦截: [['554 5.7.1', 'Message rejected: spam policy', 1]], 终端或网络超时: [['421 4.4.2', 'Connection timed out', 1]],
    账号鉴权或余额: [['401', 'Invalid API key', 1]], 内容被供应商拒绝: [['422', 'Content rejected', 1]],
    供应商限流: [['429', 'Rate limit exceeded', 1]], 供应商网关故障: [['503', 'Service unavailable', 1]],
  },
  'Engagement Lab': {
    号码或地址无效: [['NotRegistered', 'Device token not registered', 1]], 用户不可达: [['Unavailable', 'Device unavailable', 1]],
    用户拒收: [['OptedOut', 'Notifications disabled', 1]], 运营商或平台拦截: [['Blocked', 'Platform rejected', 1]],
    终端或网络超时: [['Timeout', 'Delivery timeout', 1]], 供应商网关故障: [['EL-500', 'Internal error', 1]],
    供应商限流: [['EL-429', 'Quota exceeded', 1]], 账号鉴权或余额: [['EL-401', 'Invalid app key', 1]],
  },
  Mocean: {
    号码或地址无效: [['M-2', 'Invalid number', 1]], 用户不可达: [['M-NV', 'Not a Viber user', 3], ['M-5', 'Device offline', 1]],
    用户拒收: [['M-BL', 'User blocked sender', 1]], 运营商或平台拦截: [['M-SP', 'Viber spam filter', 1]],
    终端或网络超时: [['M-EX', 'Expired', 1]], 供应商网关故障: [['M-500', 'Gateway error', 1]], 供应商限流: [['M-429', 'Throttled', 1]],
    账号鉴权或余额: [['M-401', 'Auth failed', 1]], 内容被供应商拒绝: [['M-452', 'Content rejected', 1]],
  },
};
const FA_PRE_CODES = { 重复: 'RH-DUP', 黑名单: 'RH-BLK', DND: 'RH-DND', DNC: 'RH-DNC', 频控: 'RH-FREQ', 格式无效: 'RH-FMT', 退订: 'RH-UNSUB', 敏感词: 'RH-WORD', 无触达地址: 'RH-NOADDR' };

/* 某供应商某分类的原始码列表（无配置时给通用码） */
function faCodes(vendor, cat) {
  if (FA_PRE_CODES[cat]) return [[FA_PRE_CODES[cat], `触达规则：${cat}`, 1]];
  if (cat === '无回执') return [['RH-NORCPT', '超过回执等待窗口仍无回执', 1]];
  if (cat === '已过期') return [['RH-EXP', '超过任务有效期', 1]];
  const v = FA_CODES[vendor] || {};
  if (v[cat]) return v[cat];
  if (cat === '未分类') return [[`${(vendor || 'X').slice(0, 2).toUpperCase()}-999`, 'Unknown error (unmapped)', 1]];
  return [[`${(vendor || 'X').slice(0, 2).toUpperCase()}-${cat.length}0`, cat, 1]];
}

/* ---- 小工具 ---- */
function faRand(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
/* 按权重把整数拆分（最大余数法，保证合计不变） */
function faSplit(total, weights) {
  const keys = Object.keys(weights); const sum = keys.reduce((a, k) => a + weights[k], 0) || 1;
  const raw = keys.map(k => total * weights[k] / sum); const out = {}; let used = 0;
  keys.forEach((k, i) => { out[k] = Math.floor(raw[i]); used += out[k]; });
  keys.map((k, i) => [k, raw[i] - Math.floor(raw[i])]).sort((a, b) => b[1] - a[1]).slice(0, total - used).forEach(([k]) => { out[k] += 1; });
  return out;
}
/* 把一组 (分类 → 数量) 展开为带原始码的原子行 */
function faExpand(base, catCounts) {
  const rows = [];
  Object.entries(catCounts).forEach(([cat, n]) => {
    if (!n) return;
    const codes = faCodes(base.vendor, cat);
    const parts = faSplit(n, Object.fromEntries(codes.map(c => [c[0], c[2]])));
    codes.forEach(([code, text]) => { if (parts[code]) rows.push({ ...base, stage: faCat(cat).stage, cat, code, text, count: parts[code] }); });
  });
  return rows;
}

/* ---- 多选下拉：faMultiSelect(host, { options:[{v,l,grp,sub}], placeholder, onChange }) ---- */
function faMultiSelect(host, { options = [], placeholder = '全部', onChange } = {}) {
  let opts = options; let val = [];
  host.classList.add('ms');
  host.innerHTML = `<button type="button" class="ms-btn"></button><div class="ms-panel"></div>`;
  const btn = host.querySelector('.ms-btn'); const panel = host.querySelector('.ms-panel');
  const label = () => {
    const ls = opts.filter(o => val.includes(o.v)).map(o => o.l);
    btn.textContent = ls.length ? (ls.length > 2 ? `${ls.slice(0, 2).join('、')} 等 ${ls.length} 项` : ls.join('、')) : placeholder;
    btn.title = ls.join('、');
  };
  const draw = () => {
    let lastGrp = null;
    panel.innerHTML = opts.length ? opts.map(o => {
      const g = o.grp && o.grp !== lastGrp ? `<div class="ms-grp">${esc(o.grp)}</div>` : ''; lastGrp = o.grp;
      return `${g}<label class="${o.sub ? 'ms-sub' : ''}"><input type="checkbox" value="${esc(o.v)}" ${val.includes(o.v) ? 'checked' : ''}>${esc(o.l)}</label>`;
    }).join('') : '<div class="ms-grp">无可选项</div>';
    label();
  };
  btn.addEventListener('click', e => { e.stopPropagation(); document.querySelectorAll('.ms.open').forEach(m => { if (m !== host) m.classList.remove('open'); }); host.classList.toggle('open'); });
  panel.addEventListener('click', e => e.stopPropagation());
  panel.addEventListener('change', e => {
    const v = e.target.value; val = e.target.checked ? val.concat(v) : val.filter(x => x !== v);
    label(); if (onChange) onChange(val.slice());
  });
  draw();
  return {
    get: () => val.slice(),
    set(v) { val = (v || []).filter(x => opts.some(o => o.v === x)); draw(); },
    setOptions(o) { opts = o; val = val.filter(x => opts.some(p => p.v === x)); draw(); },
    disable(d) { btn.disabled = !!d; },
  };
}
document.addEventListener('click', () => document.querySelectorAll('.ms.open').forEach(m => m.classList.remove('open')));

/* ---- SVG 折线图：series:[{name,color,points:[number|null]}], labels:[] ---- */
const FA_COLORS = ['#2E6BE6', '#2BA471', '#FF7D00', '#7B4FD6', '#E5484D', '#14A9C9', '#B8860B', '#86909C'];
function faLineChart({ series, labels, yFmt = v => v.toFixed(1) + '%', height = 240, width = 760 }) {
  const pad = { l: 46, r: 26, t: 10, b: 26 };
  const all = series.flatMap(s => s.points).filter(v => v != null);
  if (!all.length) return '<div class="v2-hint" style="padding:40px 0;text-align:center">无数据</div>';
  let lo = Math.min(...all); let hi = Math.max(...all);
  if (hi - lo < 1) { lo -= .5; hi += .5; }
  const span = hi - lo; lo -= span * .1; hi += span * .1;
  const W = width - pad.l - pad.r; const H = height - pad.t - pad.b; const n = labels.length;
  const x = i => pad.l + (n <= 1 ? W / 2 : i * W / (n - 1)); const y = v => pad.t + H - (v - lo) / (hi - lo) * H;
  const grid = [0, 1, 2, 3, 4].map(k => { const v = lo + (hi - lo) * k / 4; return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#F0F1F3"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${yFmt(v)}</text>`; }).join('');
  const step = Math.max(1, Math.ceil(n / 10));
  const xl = labels.map((l, i) => (i % step === 0 || i === n - 1 ? `<text x="${x(i)}" y="${height - 8}" text-anchor="middle">${esc(l)}</text>` : '')).join('');
  const lines = series.map((s, si) => {
    const c = s.color || FA_COLORS[si % FA_COLORS.length];
    const pts = s.points.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' ');
    const dots = n <= 31 ? s.points.map((v, i) => (v == null ? '' : `<circle cx="${x(i)}" cy="${y(v)}" r="2.5" fill="${c}"><title>${esc(s.name)} · ${esc(labels[i])}：${yFmt(v)}</title></circle>`)).join('') : '';
    return `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2"/>${dots}`;
  }).join('');
  const legend = series.length > 1 ? `<div class="cx-legend">${series.map((s, si) => `<span><i style="background:${s.color || FA_COLORS[si % FA_COLORS.length]}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<svg class="cx-chart" viewBox="0 0 ${width} ${height}" style="height:auto">${grid}${xl}${lines}</svg>${legend}`;
}

/* ---- 横向条：rows:[{label, value, text, cls, attrs}] ---- */
function faBarList(rows, max) {
  const m = max || Math.max(...rows.map(r => r.value), 1);
  return `<div class="cx-bars">${rows.map(r => `<div class="cx-bar ${r.cls || ''}" ${r.attrs || ''}><span class="lab" title="${esc(r.label)}">${esc(r.label)}</span>
    <span class="trk"><i style="width:${Math.max(0, r.value / m * 100).toFixed(1)}%"></i></span><span class="num">${r.text}</span></div>`).join('')}</div>`;
}

/* ---- 透视 ---- */
function faPivot(atoms, rowDim, colDim, maxCols = 8) {
  const colTot = {}; const rows = {}; let grand = 0;
  atoms.forEach(a => {
    const r = a[rowDim]; const c = a[colDim];
    colTot[c] = (colTot[c] || 0) + a.count; grand += a.count;
    const row = rows[r] || (rows[r] = { key: r, cells: {}, total: 0, codes: {}, cats: {} });
    row.cells[c] = (row.cells[c] || 0) + a.count; row.total += a.count;
    row.cats[a.cat] = (row.cats[a.cat] || 0) + a.count;
    const ck = `${a.vendor}|${a.code}`;
    const cd = row.codes[ck] || (row.codes[ck] = { code: a.code, text: a.text, stage: a.stage, cat: a.cat, vendor: a.vendor, count: 0 });
    cd.count += a.count;
  });
  let cols = Object.keys(colTot).sort((a, b) => colTot[b] - colTot[a]);
  let other = null;
  if (cols.length > maxCols) { other = cols.slice(maxCols - 1); cols = cols.slice(0, maxCols - 1).concat('__other'); }
  const list = Object.values(rows).map(r => {
    if (other) r.cells.__other = other.reduce((s, c) => s + (r.cells[c] || 0), 0);
    r.topCat = Object.entries(r.cats).sort((a, b) => b[1] - a[1])[0][0];
    r.codeList = Object.values(r.codes).sort((a, b) => b.count - a.count);
    return r;
  }).sort((a, b) => b.total - a.total);
  return { cols, other, rows: list, grand, colTot };
}

/* ---- 失败原因表渲染 ----
 * cfg: { rowDim, colDim, dimLabel(dim), label(dim, val), drill(filters) → href, emptyText } */
function faRenderTable(host, atoms, cfg) {
  const lab = (d, v) => (v === '__other' ? '其他' : cfg.label ? cfg.label(d, v) : v);
  if (!atoms.length || !atoms.some(a => a.count)) { host.innerHTML = `<div class="fa-empty"><i data-lucide="check-circle-2"></i>${cfg.emptyText || '无失败'}</div>`; return; }
  const p = faPivot(atoms.filter(a => a.count), cfg.rowDim, cfg.colDim);
  const colFilter = c => (c === '__other' ? { [cfg.colDim]: p.other.join(',') } : { [cfg.colDim]: c });
  const n = p.cols.length + 6;
  const head = `<tr><th style="width:28px"></th><th>${cfg.dimLabel(cfg.rowDim)} ＼ ${cfg.dimLabel(cfg.colDim)}</th>
    ${p.cols.map(c => `<th class="v2-num">${esc(lab(cfg.colDim, c))}</th>`).join('')}
    <th class="v2-num">合计</th><th class="v2-num">占比</th><th>建议动作</th></tr>`;
  const body = p.rows.map((r, i) => {
    const uncls = cfg.rowDim === 'cat' ? r.key === '未分类' : r.topCat === '未分类';
    const action = faCat(cfg.rowDim === 'cat' ? r.key : r.topCat).action;
    const cells = p.cols.map(c => {
      const v = r.cells[c] || 0;
      return `<td class="v2-num">${v ? `<a class="fa-cell" href="${cfg.drill({ [cfg.rowDim]: r.key, ...colFilter(c) })}">${fmtN(v)}</a>` : '<span class="v2-muted">0</span>'}</td>`;
    }).join('');
    const sub = `<tr class="fa-sub" data-sub="${i}" hidden><td></td><td colspan="${n - 1}">
      <table class="table fa-subtable"><thead><tr><th>原始码</th><th>原文</th><th>阶段</th><th>统一分类</th><th>供应商</th><th class="v2-num">数量</th><th class="v2-num">行内占比</th></tr></thead><tbody>
      ${r.codeList.map(c => `<tr><td><code>${esc(c.code)}</code></td><td>${esc(c.text)}</td><td>${c.stage}</td><td>${esc(c.cat)}</td><td>${esc(lab('vendor', c.vendor))}</td>
        <td class="v2-num"><a class="fa-cell" href="${cfg.drill({ [cfg.rowDim]: r.key, code: c.code, vendor: c.vendor })}">${fmtN(c.count)}</a></td><td class="v2-num">${pct(c.count, r.total)}</td></tr>`).join('')}
      </tbody></table></td></tr>`;
    return `<tr class="fa-row${uncls ? ' fa-uncls' : ''}" data-row="${i}">
      <td><button class="fa-exp" type="button" title="展开原始码与原文"><span class="fa-chev">▸</span></button></td>
      <td class="fa-rowlab">${esc(lab(cfg.rowDim, r.key))}${uncls ? ' <span class="tag tag-gray-outline">待规则维护者归类</span>' : ''}</td>
      ${cells}
      <td class="v2-num"><a class="fa-cell fa-strong" href="${cfg.drill({ [cfg.rowDim]: r.key })}">${fmtN(r.total)}</a></td>
      <td class="v2-num">${pct(r.total, p.grand)}</td>
      <td>${uncls ? '<span class="v2-muted">待规则维护者归类</span>' : esc(action)}</td></tr>${sub}`;
  }).join('');
  const foot = `<tr class="fa-total"><td></td><td>合计</td>${p.cols.map(c => `<td class="v2-num">${fmtN(p.cols.length && c === '__other' ? p.other.reduce((s, x) => s + p.colTot[x], 0) : p.colTot[c])}</td>`).join('')}
    <td class="v2-num">${fmtN(p.grand)}</td><td class="v2-num">100%</td><td></td></tr>`;
  host.innerHTML = `<div class="table-scroll fa-scroll"><table class="table stats-table fa-table"><thead>${head}</thead><tbody>${body}${foot}</tbody></table></div>`;
  host.querySelectorAll('.fa-row').forEach(tr => {
    tr.querySelector('.fa-exp').addEventListener('click', () => {
      const sub = host.querySelector(`[data-sub="${tr.dataset.row}"]`);
      sub.hidden = !sub.hidden; tr.classList.toggle('open', !sub.hidden);
    });
  });
  if (typeof refreshIcons === 'function') refreshIcons();
  return p;
}

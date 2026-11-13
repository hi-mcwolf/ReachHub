/* 月度 / 人员用量（PRD 6.2）：月度用量分摊表、人员用量表、报表订阅、额度设置（P1）
 * 口径见 PRD 4.4.6：归月按提交供应商时间（PH 时区）、剔除测试消息、重试只计最终提交、已拦截不计。
 * 全部为演示数据；产品线 / 账号 / 接入方复用 v2-data.js，缺的账号在本页 US_EXTRA_ACCOUNTS 补充。 */

/* ===================== 1. 常量与 mock 事实表 ===================== */
const US_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11']; // 上线月起至当月
const US_CUR = '2026-11';
const US_DEF = '2026-10';          // 默认 = 上月
const US_ASOF = '2026-11-10';      // T+1
const US_ASOF_DAY = 10, US_CUR_DAYS = 30;
const US_FB = '__fb', US_UNKNOWN = '__unknown', US_MANUAL = '__manual';
const US_MF = { '2026-07': .78, '2026-08': .86, '2026-09': .91, '2026-10': 1, '2026-11': .34 };
const US_FB_MF = { '2026-07': 14, '2026-08': 5, '2026-09': 2, '2026-10': 1, '2026-11': .3 };
const US_UNK = { '2026-07': 9000, '2026-08': 3200, '2026-09': 1100, '2026-10': 600 }; // 存量回填失败
const US_OLD_MF = { '2026-07': .8, '2026-08': .2 }; // 已下线产品线只有早期数据

const US_EXTRA_ACCOUNTS = [
  { id: 'BP-03', channel: 'SMS', vendor: 'NXLink', bl: 'BP', senders: ['BPGROWTH'] },
  { id: 'GP-mail', channel: '邮件', vendor: 'OneSignal', bl: 'GP', senders: ['news@gamezone.ph'] },
  { id: 'GP-push', channel: 'Push', vendor: 'Engagement Lab', bl: 'GP', senders: ['GP App'] },
  { id: 'BP-inbox', channel: '站内信', vendor: '站内信（自建）', bl: 'BP', senders: ['BP 站内信'] },
  { id: 'AP-push', channel: 'Push', vendor: 'Engagement Lab', bl: 'AP', senders: ['AP App'] },
  { id: 'AP-inbox', channel: '站内信', vendor: '站内信（自建）', bl: 'AP', senders: ['AP 站内信'] },
  { id: 'GP-inbox', channel: '站内信', vendor: '站内信（自建）', bl: 'GP', senders: ['GP 站内信'] },
];
const US_ALL_ACCOUNTS = V2_ACCOUNTS.concat(US_EXTRA_ACCOUNTS);
function usAcct(id) { return US_ALL_ACCOUNTS.find(a => a.id === id) || { vendor: '-' }; }

const US_ROUTES = { // [通道, 账号, 发送方标识, 10 月基准条数]
  'bp-growth': [['SMS', 'BP-01', 'BPGROWTH', 300000], ['SMS', 'BP-02', 'BPGROWTH', 170000], ['SMS', 'BP-03', 'BPGROWTH', 26000], ['SMS', 'OTP-BP', 'BPVERIFY', 60000],
    ['邮件', 'BP-mail', 'news@bingoplus.ph', 150000], ['Push', 'BP-push', 'BP App', 260000], ['站内信', 'BP-inbox', 'BP 站内信', 80000], ['Viber Biz', 'BP-im', 'BingoPlus Viber', 22000], ['Viber Bot', 'BP-vbot', 'BingoPlus Bot', 9000], ['Messenger Biz', 'BP-msg', 'BingoPlus Page', 7000], ['Messenger Bot', 'BP-msgbot', 'BingoPlus Page Bot', 6000]],
  'bp-poc': [['SMS', 'BP-01', 'BPPLATFORM', 160000], ['邮件', 'BP-mail', 'news@bingoplus.ph', 60000], ['Push', 'BP-push', 'BP App', 90000], ['站内信', 'BP-inbox', 'BP 站内信', 30000]],
  'bp-coc': [['SMS', 'BP-01', 'BPCONTENT', 70000], ['Push', 'BP-push', 'BP App', 30000], ['站内信', 'BP-inbox', 'BP 站内信', 15000]],
  'bp-vip': [['SMS', 'BP-02', 'BPVIP', 18000], ['Push', 'BP-push', 'BP App', 9000], ['Viber Biz', 'BP-im', 'BingoPlus Viber', 4000], ['WhatsApp', 'OTP-IM', 'BPVERIFY', 3000]],
  gamezone: [['SMS', 'GP-01', 'GAMEZONE', 120000], ['邮件', 'GP-mail', 'news@gamezone.ph', 40000], ['Push', 'GP-push', 'GP App', 60000], ['站内信', 'GP-inbox', 'GP 站内信', 25000]],
  arenaplus: [['SMS', 'AP-01', 'ARENAPLUS', 55000], ['Push', 'AP-push', 'AP App', 20000], ['站内信', 'AP-inbox', 'AP 站内信', 9000]],
  'arena-old': [['SMS', 'BP-01', 'BPPLATFORM', 15000]],
};
const US_PEOPLE = { // 手动任务创建人 / 星灵 operator
  'bp-growth': { manual: ['lily@', 'ken@'], xl: ['marvin@', 'ken@'] },
  'bp-poc': { manual: ['lily@', 'ann@'], xl: ['marvin@'] },
  'bp-coc': { manual: ['ann@'], xl: ['marvin@'] },
  'bp-vip': { manual: ['lily@'], xl: ['ken@'] },
  gamezone: { manual: ['rico@', 'joy@'], xl: [] },
  arenaplus: { manual: ['joy@'], xl: [] },
  'arena-old': { manual: ['ann@'], xl: [] },
};
/* 兜底归属：API 未带 / 带错 site id → 接入方默认产品线（报表单列） [接入方, 通道, 账号, Sender, 类别, 人员, 类型, 基准] */
const US_FB_ROUTES = [
  ['星灵', 'SMS', 'BP-01', 'BPGROWTH', '营销', 'marvin@', 'operator', 6500],
  ['星灵', 'Push', 'BP-push', 'BP App', '营销', 'marvin@', 'operator', 2000],
  ['用户中心', 'SMS', 'BP-02', 'BPGROWTH', '营销', '系统', '系统', 1800],
  ['用户中心', '站内信', 'BP-inbox', 'BP 站内信', '营销', '系统', '系统', 1500],
];

function usRand(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function usSlices(site, ch, acct) { // [类别, 来源, 接入方, 占比]
  if (acct === 'OTP-BP') return [['OTP', 'API', '用户中心', 1]];
  const bp = US_PEOPLE[site].xl.length > 0;
  const T = {
    SMS: bp ? [['营销', '手动', null, .55], ['营销', 'API', '星灵', .25], ['营销', '手动', null, .08], ['营销', 'API', '用户中心', .08], ['营销', 'API', site === 'bp-growth' ? '风控平台' : '用户中心', .04]]
      : [['营销', '手动', null, .8], ['营销', 'API', '用户中心', .2]],
    邮件: bp ? [['营销', '手动', null, .6], ['营销', 'API', '星灵', .4]] : [['营销', '手动', null, 1]],
    Push: bp ? [['营销', '手动', null, .4], ['营销', 'API', '星灵', .35], ['营销', 'API', '用户中心', .25]] : [['营销', '手动', null, .7], ['营销', 'API', '用户中心', .3]],
    站内信: [['营销', 'API', '用户中心', .7], ['营销', '手动', null, .3]],
    'Viber Biz': [['营销', '手动', null, .5], ['营销', 'API', '星灵', .5]],
    'Viber Bot': [['营销', '手动', null, .6], ['营销', 'API', '星灵', .4]],
    'Messenger Biz': [['营销', '手动', null, .6], ['营销', 'API', '星灵', .4]],
    'Messenger Bot': [['营销', '手动', null, .7], ['营销', 'API', '星灵', .3]],
    WhatsApp: [['OTP', 'API', '用户中心', 1]],
  };
  return T[ch];
}

function usPersons(site, src, app) { // [人员, 类型, 占比]；接入方未传 operator → 整体归「系统」
  if (src === '手动') { const m = US_PEOPLE[site].manual; return m.length > 1 ? [[m[0], '创建人', .6], [m[1], '创建人', .4]] : [[m[0], '创建人', 1]]; }
  if (app === '星灵') { const x = US_PEOPLE[site].xl; return x.length > 1 ? [[x[0], 'operator', .65], [x[1], 'operator', .35]] : [[x[0], 'operator', 1]]; }
  return [['系统', '系统', 1]];
}

/* 计费方式（6.1.3）：SMS、Viber Biz、Viber Bot、Messenger Biz、Messenger Bot、WhatsApp 按条；邮件 / Push 月包；站内信不计费。月包 / 不计费通道照常统计用量，用于按量分摊 */
const US_BILLING = { SMS: '按条', 'Viber Biz': '按条', 'Viber Bot': '按条', 'Messenger Biz': '按条', 'Messenger Bot': '按条', WhatsApp: '按条', 邮件: '月包', Push: '月包', 站内信: '不计费' };
function usPerMsg(ch) { return US_BILLING[ch] === '按条'; }

function usAddFact(out, f, raw) {
  const key = [f.m, f.site, f.ch, f.acct, f.sender, f.cat, f.app, f.person].join('|');
  const r = usRand(key);
  const cnt = Math.round(raw * (.9 + .2 * r));
  if (cnt <= 0) return;
  const seg = f.ch === 'SMS' ? ({ 营销: 1.18, 'OTP': 1 }[f.cat] + (r - .5) * .04) : 1;
  const misRate = f.ch === 'SMS' ? ({ 'bp-poc': .012, 'bp-coc': .004 }[f.site] || 0) : 0;
  out.push(Object.assign(f, {
    vendor: usAcct(f.acct).vendor, cnt, bill: usPerMsg(f.ch) ? Math.round(cnt * seg) : 0, mis: Math.round(cnt * misRate),
    tasks: f.ptype === '系统' ? 0 : Math.max(1, Math.round(cnt / (f.cat === '营销' ? 14000 : 5000))),
  }));
}

const US_FACTS = (() => {
  const out = [];
  US_MONTHS.forEach(m => {
    Object.entries(US_ROUTES).forEach(([site, routes]) => {
      const mf = site === 'arena-old' ? (US_OLD_MF[m] || 0) : US_MF[m];
      if (!mf) return;
      const bl = V2_PRODUCT_LINES.find(p => p.siteId === site).bl;
      routes.forEach(([ch, acct, sender, base]) => usSlices(site, ch, acct).forEach(([cat, src, app, w]) =>
        usPersons(site, src, app).forEach(([person, ptype, pw]) =>
          usAddFact(out, { m, site, bl, ch, acct, sender, cat, src, app, person, ptype }, base * mf * w * pw))));
    });
    /* 无兜底归属：未传 site id 的请求直接拒绝，不产生消息（Marvin 2026-11-13） */
    if (US_UNK[m]) usAddFact(out, { m, site: US_UNKNOWN, bl: '-', ch: 'SMS', acct: 'BP-01', sender: 'BPGROWTH', cat: '营销', src: '手动', app: null, person: '系统', ptype: '系统', legacy: true }, US_UNK[m]);
  });
  return out;
})();

/* ===================== 2. 通用工具 ===================== */
const US_DIMS = { bl: '业务线', site: '产品线', vendor: '供应商', acct: '账号', sender: '发送方标识', app: '接入方', ch: '通道', cat: '消息类别', src: '任务来源', none: '无' };
const US_ROW_DIMS = ['bl', 'site', 'vendor', 'acct', 'sender', 'app'];
const US_COL_DIMS = ['ch', 'vendor', 'cat', 'src', 'none'];
const US_METRICS = { cnt: '条数', bill: '计费条数', share: '分摊占比' };
const US_P_METRICS = { cnt: '条数', bill: '计费条数' };
const US_LARK = ['lily@', 'ken@', 'ann@', 'marvin@', 'rico@', 'joy@', 'amy@（财务）', 'finance 群', 'BP 运营群', 'GP 运营群', '触达管理员群'];
const US_PL_OWNER = { 'bp-growth': 'lily@', 'bp-poc': 'lily@', 'bp-coc': 'ann@', 'bp-vip': 'lily@', gamezone: 'rico@', arenaplus: 'joy@', 'arena-old': 'ann@' };

function usGlobal() { return hasPerm('queue'); } // 「统计查看（全局）」近似；运营只看本人数据权限内（BP）
function usScopeSites() { return V2_PRODUCT_LINES.filter(p => usGlobal() || p.bl === 'BP').map(p => p.siteId); }
function usIsSpecial(site) { return site === US_FB || site === US_UNKNOWN; }
function usInScope(f) { return f.site === US_UNKNOWN ? usGlobal() : f.site === US_FB || usScopeSites().includes(f.site); }
function usPlLabel(site, app) {
  if (site === US_FB) return app ? `兜底归属（${app}）` : '兜底归属';
  if (site === US_UNKNOWN) return '未知产品线';
  return plName(site);
}
function usSum(arr, k) { return arr.length ? arr.reduce((a, f) => a + f[k], 0) : null; }
function usFmt(v) { return v == null ? '-' : fmtN(v); }
/* 单元格取值：计费条数下纯月包 / 不计费单元格显示计费方式；分摊占比 = 条数 ÷ 同业务线同列条数 */
function usCell(sub, k, denom) {
  if (!sub.length) return '-';
  if (k === 'share') { const d = usSum(denom, 'cnt'); return d ? (usSum(sub, 'cnt') / d * 100).toFixed(1) + '%' : '-'; }
  if (k === 'bill' && sub.every(f => !usPerMsg(f.ch))) return `${usFmt(usSum(sub, 'cnt'))} <span class="tag tag-gray-outline" title="${US_BILLING[sub[0].ch]}通道不折算计费条数，显示用量条数">${US_BILLING[sub[0].ch]}</span>`;
  return usFmt(usSum(sub, k));
}
function usMoM(cur, prev) {
  if (cur == null || !prev) return '-';
  const d = (cur - prev) / prev * 100;
  return (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
}
function usPrevMonth(m) { const i = US_MONTHS.indexOf(m); return i > 0 ? US_MONTHS[i - 1] : null; }
function usAsOfText(m) { return m === US_CUR ? `数据截至 ${US_ASOF}` : `${m} 已月结（T+1 03:00 跑批）`; }
function usAllVendors() { return [...new Set(US_ALL_ACCOUNTS.map(a => a.vendor))]; }
function usVendorsOf(chs) { return [...new Set(US_ALL_ACCOUNTS.filter(a => !chs.length || chs.includes(a.channel)).map(a => a.vendor))]; }
function usMonthOpts(sel) { return US_MONTHS.slice().reverse().map(m => `<option value="${m}" ${m === sel ? 'selected' : ''}>${m}${m === US_CUR ? '（当月）' : ''}</option>`).join(''); }
function usOpts(list, sel, all = '全部') { return (all ? `<option value="">${all}</option>` : '') + list.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join(''); }

/* ---- 多选下拉 ---- */
const US_MSEL = {};
function usMsel(hostId, { search = false, grouped = false, onChange } = {}) {
  const host = document.getElementById(hostId);
  const st = { sel: new Set(), opts: [], q: '', onChange };
  host.innerHTML = `<div class="us-msel"><button type="button" class="us-msel-btn"><span>全部</span><i data-lucide="chevron-down"></i></button><div class="us-msel-pop"></div></div>`;
  const root = host.firstElementChild, btn = root.querySelector('.us-msel-btn'), pop = root.querySelector('.us-msel-pop');
  const label = () => {
    const ls = st.opts.filter(o => st.sel.has(o.v)).map(o => o.l);
    btn.firstElementChild.textContent = !ls.length ? '全部' : ls.length <= 2 ? ls.join('、') : `已选 ${ls.length} 项`;
  };
  const draw = () => {
    const vis = st.opts.filter(o => !st.q || o.l.toLowerCase().includes(st.q.toLowerCase()));
    const opt = o => `<label class="us-msel-opt${grouped && o.g ? ' sub' : ''}"><input type="checkbox" data-v="${esc(o.v)}" ${st.sel.has(o.v) ? 'checked' : ''}>${esc(o.l)}</label>`;
    let body = '';
    if (grouped) {
      const groups = [...new Set(vis.map(o => o.g || ''))];
      body = groups.map(g => {
        const os = vis.filter(o => (o.g || '') === g);
        const all = os.every(o => st.sel.has(o.v));
        return (g ? `<label class="us-msel-grp"><input type="checkbox" data-g="${esc(g)}" ${all ? 'checked' : ''}>${esc(g)}</label>` : '') + os.map(opt).join('');
      }).join('');
    } else body = vis.map(opt).join('');
    pop.innerHTML = (search ? `<input class="input" data-q placeholder="选择产品线" value="${esc(st.q)}">` : '') + (body || '<div class="v2-hint us-msel-opt">无匹配项</div>') +
      `<div class="us-msel-foot"><button type="button" class="link-btn" data-clear>清空</button><button type="button" class="link-btn" data-ok>确定</button></div>`;
  };
  const changed = () => { label(); draw(); if (st.onChange) st.onChange([...st.sel]); };
  btn.addEventListener('click', e => { e.stopPropagation(); const open = !root.classList.contains('open'); document.querySelectorAll('.us-msel.open').forEach(x => x.classList.remove('open')); if (open) { draw(); root.classList.add('open'); } });
  pop.addEventListener('click', e => e.stopPropagation());
  pop.addEventListener('input', e => { if (e.target.dataset.q !== undefined) { st.q = e.target.value; draw(); const q = pop.querySelector('[data-q]'); q.focus(); q.setSelectionRange(st.q.length, st.q.length); } });
  pop.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.v !== undefined) { t.checked ? st.sel.add(t.dataset.v) : st.sel.delete(t.dataset.v); }
    if (t.dataset.g !== undefined) st.opts.filter(o => o.g === t.dataset.g).forEach(o => t.checked ? st.sel.add(o.v) : st.sel.delete(o.v));
    changed();
  });
  pop.addEventListener('click', e => {
    if (e.target.dataset.clear !== undefined) { st.sel.clear(); changed(); }
    if (e.target.dataset.ok !== undefined) root.classList.remove('open');
  });
  const api = {
    setOptions(opts) { st.opts = opts; const ok = new Set(opts.map(o => o.v)); [...st.sel].forEach(v => { if (!ok.has(v)) st.sel.delete(v); }); label(); },
    get() { return [...st.sel]; },
    set(arr) { st.sel = new Set(arr); label(); },
  };
  US_MSEL[hostId] = api;
  return api;
}
document.addEventListener('click', () => document.querySelectorAll('.us-msel.open').forEach(x => x.classList.remove('open')));

/* ===================== 3. 月度用量分摊表（6.2.2） ===================== */
const U = { month: US_DEF, bl: '', sites: [], chs: [], vendors: [], cats: [], src: '', rowDim: 'site', colDim: 'ch', metric: 'bill', expanded: new Set(), expandAll: false };
let US_CELLREFS = [];

function uFacts(month, f = U) {
  return US_FACTS.filter(x => x.m === month && usInScope(x)
    && (x.site === US_UNKNOWN || !f.bl || x.bl === f.bl) // 兜底归属按接入方默认产品线所属业务线
    && (usIsSpecial(x.site) || !f.sites.length || f.sites.includes(x.site))
    && (!f.chs.length || f.chs.includes(x.ch))
    && (!f.vendors.length || f.vendors.includes(x.vendor))
    && (!f.cats.length || f.cats.includes(x.cat))
    && uSrcMatch(x, f.src));
}
function uSrcMatch(x, src) {
  if (!src) return true;
  if (src === '手动' || src === 'API') return x.src === src;
  return x.src === 'API' && x.app === src.slice(4);
}
function uKey(f, d) {
  if (d === 'bl') return usIsSpecial(f.site) ? f.site : f.bl;
  if (d === 'app') return f.app || US_MANUAL;
  return f[d];
}
function uMatch(f, path) { return path.every(([d, v]) => uKey(f, d) === v); }
function uNextDim(path) {
  const [d, v] = path[path.length - 1];
  if ((d === 'site' || d === 'bl') && v === US_FB) return 'app';
  if (d === 'bl' && v === US_UNKNOWN) return 'vendor';
  if (d === 'bl' && usBlNoPl(v)) return 'vendor'; /* 无下级产品线：不展开产品线 */
  const hasPl = path.some(p => p[0] === 'site' || p[0] === 'bl');
  return { bl: 'site', site: 'vendor', vendor: 'acct', acct: 'sender', sender: null, app: hasPl ? 'vendor' : 'site' }[d];
}
function uLabel(d, v, path) {
  if (v === US_FB) return '兜底归属';
  if (v === US_UNKNOWN) return '未知产品线';
  if (d === 'site' && usShowBl() && path.length === 1) { const p0 = V2_PRODUCT_LINES.find(x => x.siteId === v); if (p0 && usBlNoPl(p0.bl)) return '<span class="v2-muted" title="该业务线无下级产品线">-</span>'; }
  if (d === 'site') { const p = V2_PRODUCT_LINES.find(x => x.siteId === v); return esc(plName(v)) + (p && p.status === '已下线' ? ' <span class="tag tag-gray">已下线</span>' : ''); }
  if (d === 'app') return v === US_MANUAL ? '手动（无接入方）' : path.some(p => p[1] === US_FB) ? `兜底归属（${esc(v)}）` : esc(v);
  if (d === 'bl' && v !== US_UNKNOWN) return esc(usBlName(v));
  if (d === 'acct') return `${esc(v)} <span class="v2-muted">· ${esc(usAcct(v).vendor)}</span>`;
  return esc(v);
}
function uCols(facts) {
  const d = U.colDim;
  if (d === 'none') return [];
  if (d === 'ch') return U.chs.length ? V2_CHANNELS.filter(c => U.chs.includes(c)) : V2_CHANNELS;
  if (d === 'cat') return U.cats.length ? V2_MSG_CATEGORIES.filter(c => U.cats.includes(c)) : V2_MSG_CATEGORIES;
  if (d === 'src') return V2_TASK_SOURCES;
  const set = new Set(facts.map(f => f.vendor));
  return usAllVendors().filter(v => set.has(v));
}

function uReadFilters() {
  U.month = document.getElementById('uMonth').value;
  U.bl = document.getElementById('uBl').value;
  U.sites = US_MSEL.uSite.get(); U.chs = US_MSEL.uCh.get(); U.vendors = US_MSEL.uVendor.get(); U.cats = US_MSEL.uCat.get();
  U.src = document.getElementById('uSrc').value;
  U.rowDim = document.getElementById('uRowDim').value; U.colDim = document.getElementById('uColDim').value; U.metric = document.getElementById('uMetric').value;
}

function uSiteOptions() {
  return usScopeSites().filter(s => !U.bl || V2_PRODUCT_LINES.find(p => p.siteId === s).bl === U.bl)
    .map(s => { const p = V2_PRODUCT_LINES.find(x => x.siteId === s); return { v: s, l: p.name + (p.status === '已下线' ? '（已下线）' : '') }; });
}

function uInitFilters() {
  document.getElementById('uMonth').innerHTML = usMonthOpts(U.month);
  const bls = [...new Set(usScopeSites().map(s => V2_PRODUCT_LINES.find(p => p.siteId === s).bl))];
  document.getElementById('uBl').innerHTML = usOpts(bls.map(b => [b, b]), U.bl);
  usMsel('uSite', { search: true }).setOptions(uSiteOptions());
  usMsel('uCh', { onChange: chs => US_MSEL.uVendor.setOptions(usVendorsOf(chs).map(v => ({ v, l: v }))) }).setOptions(V2_CHANNELS.map(v => ({ v, l: v })));
  usMsel('uVendor').setOptions(usAllVendors().map(v => ({ v, l: v })));
  usMsel('uCat').setOptions(V2_MSG_CATEGORIES.map(v => ({ v, l: v })));
  document.getElementById('uSrc').innerHTML = `<option value="">全部</option><option value="手动">手动</option><option value="API">API（全部接入方）</option>
    <optgroup label="API → 接入方">${V2_APPS.map(a => `<option value="API:${esc(a.name)}">API → ${esc(a.name)}</option>`).join('')}</optgroup>`;
  document.getElementById('uRowDim').innerHTML = usOpts(US_ROW_DIMS.map(d => [d, US_DIMS[d]]), U.rowDim, '');
  document.getElementById('uColDim').innerHTML = usOpts(US_COL_DIMS.map(d => [d, US_DIMS[d]]), U.colDim, '');
  document.getElementById('uMetric').innerHTML = usOpts(Object.entries(US_METRICS), U.metric, '');

  document.getElementById('uBl').addEventListener('change', e => { U.bl = e.target.value; US_MSEL.uSite.setOptions(uSiteOptions()); });
  document.getElementById('uMonth').addEventListener('change', () => { uReadFilters(); uRender(); });
  ['uRowDim', 'uColDim', 'uMetric'].forEach(id => document.getElementById(id).addEventListener('change', () => {
    if (id === 'uRowDim') U.expanded.clear();
    uReadFilters(); uRender();
  }));
  document.getElementById('uQuery').addEventListener('click', () => { uReadFilters(); uRender(); showToast('已查询'); });
  document.getElementById('uReset').addEventListener('click', uReset);
  document.getElementById('uExport').addEventListener('click', uExport);
  document.getElementById('uExpandAll').addEventListener('click', () => { U.expandAll = true; uRender(); });
  document.getElementById('uCollapseAll').addEventListener('click', () => { U.expanded.clear(); uRender(); });
  document.getElementById('uTable').addEventListener('click', uTableClick);
}

function uReset() {
  Object.assign(U, { month: US_DEF, bl: '', src: '', rowDim: 'site', colDim: 'ch', metric: 'bill' });
  U.expanded.clear();
  ['uMonth', 'uBl', 'uSrc', 'uRowDim', 'uColDim', 'uMetric'].forEach(id => {
    document.getElementById(id).value = { uMonth: US_DEF, uRowDim: 'site', uColDim: 'ch', uMetric: 'bill' }[id] || '';
  });
  US_MSEL.uSite.setOptions(uSiteOptions());
  ['uSite', 'uCh', 'uVendor', 'uCat'].forEach(id => US_MSEL[id].set([]));
  US_MSEL.uVendor.setOptions(usAllVendors().map(v => ({ v, l: v })));
  uReadFilters(); uRender();
}

function uRenderKpis(facts, prev) {
  const cnt = usSum(facts, 'cnt') || 0, bill = usSum(facts, 'bill') || 0;
  const k = U.metric === 'share' ? 'cnt' : U.metric, cur = usSum(facts, k), pv = prev ? usSum(prev, k) : null;
  const pack = usSum(facts.filter(f => US_BILLING[f.ch] === '月包'), 'cnt') || 0;
  const fb = usSum(facts.filter(f => f.site === US_FB), 'cnt') || 0, mis = usSum(facts, 'mis') || 0;
  const fbR = cnt ? fb / cnt * 100 : 0, warn = fbR > 5;
  const card = (title, val, sub, cls = '') => `<div class="kpi-card ${cls}"><div class="kpi-title">${title}</div><div class="kpi-value">${val}</div><div class="us-kpi-sub ${cls}">${sub}</div></div>`;
  document.getElementById('uKpis').innerHTML =
    card('条数', fmtN(cnt), '当月已提交消息数') +
    card('计费条数 ' + tipIcon('仅按条计费通道：SMS、Viber Biz、Viber Bot、Messenger Biz、Messenger Bot、WhatsApp；邮件、Push 月包、站内信不计费，在表中显示用量条数并按条数占比分摊'), fmtN(bill), `按条计费通道 · 月包通道 ${fmtN(pack)} 条`) +
    card(`环比（${US_METRICS[k]}）`, usMoM(cur, pv), pv ? `上月 ${fmtN(pv)}` : '上月无数据') +
    card('归属不一致 ' + tipIcon('任务 site id 与非共用 Sender 关联产品线不一致的消息占比；仍按 site id 计'), cnt ? (mis / cnt * 100).toFixed(1) + '%' : '-', `${fmtN(mis)} 条`);
}

/* 行维度 = 产品线时，第 1 列显示业务线（同业务线只在首行显示，Marvin 2026-11-13） */
function usShowBl() { return U.rowDim === 'site'; }
const US_BL_ORDER = ['BP', 'AP', 'GP'];
/* 无下级产品线的业务线（ArenaPlus、GameZone：业务线即产品线） */
function usBlNoPl(code) { const b = V2_BUSINESS_LINES.find(x => x.code === code); return !!b && V2_PRODUCT_LINES.some(p => p.bl === code && p.name === b.name); }
function usBlName(code) { const b = V2_BUSINESS_LINES.find(x => x.code === code); return b ? b.name : (code && code !== '-' ? code : '-'); }
function uRowHtml(rowFacts, prevFacts, path, level, cols, hasNext, isLast, blCell) {
  const [d, v] = path[path.length - 1];
  const key = JSON.stringify(path), open = U.expanded.has(key);
  const k = U.metric, ref = US_CELLREFS.push({ path }) - 1;
  const rowBl = U.rowDim === 'bl' ? null : (rowFacts[0] || {}).bl;
  const den = c => U._facts.filter(f => (c == null || uKey(f, U.colDim) === c) && (!rowBl || f.bl === rowBl));
  const tog = hasNext ? `<button class="us-tog" data-tog="${esc(key)}" title="${open ? '收起' : '展开'}"><i data-lucide="${open ? 'chevron-down' : 'chevron-right'}"></i></button>` : '<span class="us-tog-ph"></span>';
  const branch = level ? `<span class="us-branch">${isLast ? '└' : '├'}</span>` : '';
  const cells = cols.map(c => {
    const sub = rowFacts.filter(f => uKey(f, U.colDim) === c);
    return `<td class="v2-num us-cell" data-ref="${ref}" data-col="${esc(c)}">${usCell(sub, k, den(c))}</td>`;
  }).join('');
  const total = k === 'share' ? null : usSum(rowFacts, k);
  const special = usIsSpecial(v) || path.some(p => p[1] === US_FB);
  const blTd = usShowBl() ? `<td class="us-bl">${blCell || ''}</td>` : '';
  return `<tr class="us-lv${level}${special ? ' us-special' : ''}${blCell ? ' us-bl-first' : ''}">${blTd}<td><span class="us-rl" style="padding-left:${level * 20}px">${branch}${tog}${uLabel(d, v, path)}</span></td>${cells}
    <td class="v2-num us-cell us-total" data-ref="${ref}" data-col="">${k === 'share' ? usCell(rowFacts, k, den(null)) : usCell(rowFacts, k)}</td><td class="v2-num">${level || k === 'share' ? '' : usMoM(total, prevFacts ? usSum(prevFacts, k) : null)}</td></tr>`;
}

function uRows(facts, prev, path, dim, level, cols) {
  const groups = new Map();
  facts.forEach(f => { const v = uKey(f, dim); if (!groups.has(v)) groups.set(v, []); groups.get(v).push(f); });
  if (level === 0 && (dim === 'site' || dim === 'bl')) {
    /* 无兜底归属行 */
  }
  const k = U.metric === 'share' ? 'cnt' : U.metric;
  const blOf = v => (groups.get(v)[0] || {}).bl;
  const blIdx = v => { const i = US_BL_ORDER.indexOf(blOf(v)); return i < 0 ? 99 : i; };
  const byBl = level === 0 && usShowBl();
  const keys = [...groups.keys()].sort((a, b) => (usIsSpecial(a) - usIsSpecial(b)) || (byBl ? blIdx(a) - blIdx(b) : 0) || (a === US_FB ? -1 : b === US_FB ? 1 : 0) || (usSum(groups.get(b), k) || 0) - (usSum(groups.get(a), k) || 0));
  return keys.map((v, i) => {
    const blCell = byBl && (i === 0 || blOf(keys[i - 1]) !== blOf(v)) ? `<b>${esc(usBlName(blOf(v)))}</b>` : '';
    const p = path.concat([[dim, v]]), rf = groups.get(v);
    const next = uNextDim(p), key = JSON.stringify(p);
    if (U.expandAll && next && rf.length) U.expanded.add(key);
    const pf = prev ? prev.filter(f => uMatch(f, p)) : null;
    let html = uRowHtml(rf, pf && pf.length ? pf : null, p, level, cols, !!next && rf.length > 0, i === keys.length - 1, blCell);
    if (next && U.expanded.has(key)) html += uRows(rf, null, p, next, level + 1, cols);
    return html;
  }).join('');
}

function uRender() {
  const facts = uFacts(U.month), pm = usPrevMonth(U.month), prev = pm ? uFacts(pm) : null;
  US_CELLREFS = [];
  U._facts = facts;
  uRenderKpis(facts, prev);
  const cols = uCols(facts), k = U.metric;
  const corner = U.colDim === 'none' ? US_DIMS[U.rowDim] : `${US_DIMS[U.rowDim]} ＼ ${US_DIMS[U.colDim]}`;
  const head = `<thead><tr>${usShowBl() ? '<th>业务线</th>' : ''}<th>${corner}</th>${cols.map(c => `<th class="v2-num">${esc(c)}</th>`).join('')}<th class="v2-num us-total">合计</th><th class="v2-num">环比</th></tr></thead>`;
  const body = uRows(facts, prev, [], U.rowDim, 0, cols);
  U.expandAll = false;
  const ref = US_CELLREFS.push({ path: [] }) - 1;
  const foot = `<tfoot><tr>${usShowBl() ? '<td></td>' : ''}<td>合计</td>${cols.map(c => `<td class="v2-num us-cell" data-ref="${ref}" data-col="${esc(c)}">${k === 'share' ? '-' : usCell(facts.filter(f => uKey(f, U.colDim) === c), k)}</td>`).join('')}
    <td class="v2-num us-cell us-total" data-ref="${ref}" data-col="">${k === 'share' ? '-' : usCell(facts, k)}</td><td class="v2-num">${k === 'share' ? '' : usMoM(usSum(facts, k), prev ? usSum(prev, k) : null)}</td></tr></tfoot>`;
  document.getElementById('uTable').innerHTML = head + `<tbody>${body}</tbody>` + foot;
  document.getElementById('uTableTitle').innerHTML = `月度用量分摊表 · ${U.month} · ${US_METRICS[k]} ${tipIcon('条数 = 当月已提交消息数；计费条数 = 按条计费通道（SMS、Viber、Messenger、WhatsApp）按供应商拆分规则折算，邮件 / Push 月包、站内信不计费，显示用量条数并标计费方式；分摊占比 = 条数 ÷ 同业务线同列条数，用于月包按量分摊')}`;
  document.getElementById('uAsOf').textContent = usAsOfText(U.month);
  refreshIcons();
}

function uTableClick(e) {
  const tog = e.target.closest('[data-tog]');
  if (tog) { const k = tog.dataset.tog; U.expanded.has(k) ? U.expanded.delete(k) : U.expanded.add(k); uRender(); return; }
  const cell = e.target.closest('.us-cell');
  if (!cell || cell.textContent.trim() === '-') { if (cell) showToast('该单元格无数据'); return; }
  uDrill(US_CELLREFS[+cell.dataset.ref].path, cell.dataset.col);
}

function uCondChips(path, col) {
  const c = [['月份', U.month]];
  path.forEach(([d, v]) => c.push([US_DIMS[d], d === 'site' ? plName(v) : uLabel(d, v, path).replace(/<[^>]+>/g, '')]));
  if (col) c.push([US_DIMS[U.colDim], col]);
  if (U.bl) c.push(['业务线', U.bl]);
  if (U.sites.length) c.push(['产品线', U.sites.map(plName).join('、')]);
  if (U.chs.length) c.push(['通道', U.chs.join('、')]);
  if (U.vendors.length) c.push(['供应商', U.vendors.join('、')]);
  if (U.cats.length) c.push(['消息类别', U.cats.join('、')]);
  if (U.src) c.push(['任务来源 / 接入方', U.src.replace(':', ' → ')]);
  return c;
}

function usSampleRows(facts, n, seed) {
  const tot = usSum(facts, 'cnt') || 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    let r = usRand(seed + i) * tot, f = facts[0];
    for (const x of facts) { r -= x.cnt; if (r <= 0) { f = x; break; } }
    out.push({ f, r: usRand(seed + 'r' + i) });
  }
  return out;
}

function uDrill(path, col) {
  const facts = uFacts(U.month).filter(f => uMatch(f, path) && (!col || uKey(f, U.colDim) === col));
  const chips = uCondChips(path, col);
  const states = [['已送达', 'tag-success'], ['已送达', 'tag-success'], ['已送达', 'tag-success'], ['未送达', 'tag-danger'], ['等待回执', 'tag-info']];
  const rows = usSampleRows(facts, 8, JSON.stringify(path) + col).map(({ f, r }, i) => {
    const day = String(1 + Math.floor(r * (U.month === US_CUR ? US_ASOF_DAY : 28))).padStart(2, '0');
    const st = states[Math.floor(r * states.length)];
    const task = f.ptype === '系统' ? '<span class="v2-muted">事件触发</span>' : `T${U.month.replace('-', '')}${day}${String(100 + Math.floor(r * 900)).slice(0, 3)}`;
    return `<tr><td>M${U.month.replace('-', '')}${String(Math.floor(r * 1e8)).padStart(8, '0')}${i}</td><td>${task}</td><td>${esc(usPlLabel(f.site, f.app))}</td><td>${f.ch}</td><td>${esc(f.vendor)}</td><td>${f.acct}</td><td>${esc(f.sender)}</td><td>${f.cat}</td>
      <td>${U.month}-${day} ${String(8 + Math.floor(r * 13)).padStart(2, '0')}:${String(Math.floor(r * 60)).padStart(2, '0')}</td><td class="v2-num">${f.ch === 'SMS' ? (r > .8 ? 2 : 1) : 1}</td><td><span class="tag ${st[1]}">${st[0]}</span></td></tr>`;
  }).join('');
  document.getElementById('usDrillTitle').textContent = '下钻 · 发送记录';
  document.getElementById('usDrillBody').innerHTML = `
    <div class="us-conds">${chips.map(([k, v]) => `<span class="tag tag-info">${esc(k)}：${esc(v)}</span>`).join('')}</div>
    <div class="v2-stat-strip us-mb12"><div class="s"><b>${fmtN(usSum(facts, 'cnt'))}</b><span>条数</span></div><div class="s"><b>${fmtN(usSum(facts, 'bill'))}</b><span>计费条数</span></div><div class="s"><b>${usAsOfText(U.month)}</b><span>数据时效</span></div></div>
    <div class="table-scroll"><table class="table stats-table"><thead><tr><th>消息 ID</th><th>任务 ID</th><th>产品线</th><th>通道</th><th>供应商</th><th>账号</th><th>发送方标识</th><th>消息类别</th><th>提交供应商时间</th><th class="v2-num">计费条数</th><th>消息状态</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="v2-hint us-foot-hint">共 ${fmtN(usSum(facts, 'cnt'))} 条，此处预览前 8 条；完整列表在发送记录中按上述条件查询</div>`;
  const qs = new URLSearchParams(chips.map(([k, v]) => [k, v])).toString();
  const link = document.getElementById('usDrillLink');
  link.textContent = '在发送记录中打开'; link.href = 'send-records.html?' + qs;
  refreshIcons(); openDrawer('usDrillDrawer');
}

function uExport() {
  const facts = uFacts(U.month);
  const viewRows = document.querySelectorAll('#uTable tbody tr').length + 1;
  const detail = new Set(facts.map(f => [f.site, f.app, f.ch, f.vendor, f.acct, f.sender, f.cat, f.src].join('|'))).size;
  v2Modal({
    title: '导出', okText: '导出', width: 600,
    body: `<div class="v2-form">
      <label class="req">导出内容</label><div>
        <label class="us-check"><input type="radio" name="uExpScope" value="view" checked>当前视图（${viewRows} 行）</label>
        <label class="us-check"><input type="radio" name="uExpScope" value="detail">明细级汇总（${fmtN(detail)} 行）</label></div>
      <div class="v2-hint">明细级汇总 = 产品线 × 通道 × 供应商 × 账号 × Sender × 消息类别 × 任务来源 × 接入方</div>
      <label class="req">格式</label><div><label class="us-check"><input type="radio" name="uExpFmt" value="CSV">CSV</label><label class="us-check"><input type="radio" name="uExpFmt" value="Excel" checked>Excel</label></div>
      <label>条件</label><div class="v2-hint">${esc(uCondChips([], '').map(([k, v]) => k + '：' + v).join('；'))}</div>
      <div class="v2-hint">超过 10 万行走异步导出，完成后通过 Lark 通知</div></div>`,
    onOk: root => {
      const scope = root.querySelector('[name=uExpScope]:checked').value;
      const rows = scope === 'view' ? viewRows : detail;
      showToast(rows > 100000 ? '超过 10 万行，已转异步导出，完成后 Lark 通知' : '已导出（原型）');
    },
  });
}

/* ===================== 4. 人员用量表（6.2.3） ===================== */
const P = { month: US_DEF, sites: [], chs: [], person: '', ptype: '', metric: 'bill', sortKey: 'bill', sortDir: -1 };
let US_PROWS = [];

function pPersonLabel(r) {
  if (r.ptype === 'operator') return `${esc(r.app)}·${esc(r.person)}`;
  if (r.ptype === '系统') return r.legacy ? '系统（旧模块）' : `系统（事件）<span class="us-sub">接入方：${esc(r.app || '-')}</span>`;
  return esc(r.person);
}
function pPlainPerson(r) { return pPersonLabel(r).replace(/<[^>]+>/g, ''); }
function pFacts(month) {
  return US_FACTS.filter(x => x.m === month && usInScope(x)
    && (usIsSpecial(x.site) || !P.sites.length || P.sites.includes(x.site))
    && (!P.chs.length || P.chs.includes(x.ch)));
}
function pGroup(facts) {
  const map = new Map();
  facts.forEach(f => {
    const app = f.ptype === '创建人' ? null : f.app;
    const site = f.site;
    const key = [site, f.person, f.ptype, app].join('|');
    if (!map.has(key)) map.set(key, { key, site, person: f.person, ptype: f.ptype, app, legacy: !!f.legacy, facts: [] });
    map.get(key).facts.push(f);
  });
  return [...map.values()];
}
function pBuildRows() {
  const prev = usPrevMonth(P.month);
  const prevMap = new Map(prev ? pGroup(pFacts(prev)).map(r => [r.key, usSum(r.facts, 'bill')]) : []);
  const q = P.person.trim().toLowerCase();
  return pGroup(pFacts(P.month)).map(r => {
    const byCh = {};
    V2_CHANNELS.forEach(c => { byCh[c] = usSum(r.facts.filter(f => f.ch === c), P.metric); });
    const bill = usSum(r.facts, 'bill'), pv = prevMap.get(r.key);
    return Object.assign(r, { byCh, bill, tasks: r.ptype === '系统' ? null : usSum(r.facts, 'tasks'), mom: pv ? (bill - pv) / pv : null, momTxt: usMoM(bill, pv), pl: usPlLabel(r.site, r.site === US_FB ? r.app : null) });
  }).filter(r => (!P.ptype || r.ptype === P.ptype) && (!q || pPlainPerson(r).toLowerCase().includes(q)));
}

function pRender() {
  const cols = P.chs.length ? V2_CHANNELS.filter(c => P.chs.includes(c)) : V2_CHANNELS;
  const rows = pBuildRows();
  const sk = P.sortKey, sd = P.sortDir;
  const val = r => sk === 'tasks' ? (r.tasks ?? -1) : sk === 'mom' ? (r.mom ?? -1e9) : sk === 'bill' ? r.bill : (r.byCh[sk] ?? -1);
  rows.sort((a, b) => (val(a) - val(b)) * sd);
  US_PROWS = rows;
  const th = (k, l) => `<th class="v2-num us-sort${sk === k ? ' on' : ''}" data-sort="${esc(k)}">${l}${sk === k ? (sd < 0 ? ' ↓' : ' ↑') : ''}</th>`;
  const head = `<thead><tr><th>产品线</th><th>人员</th><th>人员类型</th>${th('tasks', '任务数')}${cols.map(c => th(c, c)).join('')}${th('bill', '计费条数合计')}${th('mom', '环比')}</tr></thead>`;
  const body = rows.map((r, i) => `<tr><td>${esc(r.pl)}</td><td><button class="link-btn" data-prow="${i}">${pPersonLabel(r)}</button></td>
    <td>${r.ptype}</td><td class="v2-num">${r.tasks == null ? '-' : fmtN(r.tasks)}</td>${cols.map(c => `<td class="v2-num">${P.metric === 'bill' && !usPerMsg(c) && r.byCh[c] != null ? `${usFmt(usSum(r.facts.filter(f => f.ch === c), 'cnt'))} <span class="tag tag-gray-outline">${US_BILLING[c]}</span>` : usFmt(r.byCh[c])}</td>`).join('')}
    <td class="v2-num"><b>${fmtN(r.bill)}</b></td><td class="v2-num">${r.momTxt}</td></tr>`).join('') || `<tr><td colspan="${cols.length + 6}" class="v2-muted">暂无数据</td></tr>`;
  const all = rows.flatMap(r => r.facts);
  const foot = `<tfoot><tr><td><b>合计</b></td><td class="v2-muted">${rows.length} 行</td><td></td><td class="v2-num"><b>${fmtN(rows.reduce((a, r) => a + (r.tasks || 0), 0))}</b></td>
    ${cols.map(c => `<td class="v2-num"><b>${P.metric === 'bill' && !usPerMsg(c) ? `${usFmt(usSum(all.filter(f => f.ch === c), 'cnt'))} <span class="tag tag-gray-outline">${US_BILLING[c]}</span>` : usFmt(usSum(all.filter(f => f.ch === c), P.metric))}</b></td>`).join('')}<td class="v2-num"><b>${fmtN(usSum(all, 'bill') || 0)}</b></td><td></td></tr></tfoot>`;
  document.getElementById('pTable').innerHTML = head + `<tbody>${body}</tbody>` + foot;
  document.getElementById('pTableTitle').innerHTML = `人员用量表 · ${P.month} · 通道列为${US_P_METRICS[P.metric]} ${tipIcon('人员归属：手动任务 → 创建人；API 任务 → operator；无 operator → 系统（标注接入方）。任务数 = 当月有提交消息的任务数')}`;
  document.getElementById('pAsOf').textContent = usAsOfText(P.month);
  refreshIcons();
}

function pSiteOptions() {
  const opts = usScopeSites().map(s => { const p = V2_PRODUCT_LINES.find(x => x.siteId === s); return { v: s, l: p.name + (p.status === '已下线' ? '（已下线）' : ''), g: p.bl }; });
  return opts.sort((a, b) => a.g.localeCompare(b.g));
}
function pRead() {
  P.month = document.getElementById('pMonth').value;
  P.sites = US_MSEL.pSite.get(); P.chs = US_MSEL.pCh.get();
  P.person = document.getElementById('pPerson').value; P.ptype = document.getElementById('pType').value; P.metric = document.getElementById('pMetric').value;
}
function pInit() {
  document.getElementById('pMonth').innerHTML = usMonthOpts(P.month);
  usMsel('pSite', { grouped: true }).setOptions(pSiteOptions());
  usMsel('pCh').setOptions(V2_CHANNELS.map(v => ({ v, l: v })));
  document.getElementById('pType').innerHTML = usOpts([['创建人', '创建人'], ['operator', 'operator'], ['系统', '系统']], '');
  document.getElementById('pMetric').innerHTML = usOpts(Object.entries(US_P_METRICS), P.metric, '');
  document.getElementById('pMonth').addEventListener('change', () => { pRead(); pRender(); });
  document.getElementById('pMetric').addEventListener('change', () => { pRead(); pRender(); });
  document.getElementById('pQuery').addEventListener('click', () => { pRead(); pRender(); showToast('已查询'); });
  document.getElementById('pPerson').addEventListener('keydown', e => { if (e.key === 'Enter') { pRead(); pRender(); } });
  document.getElementById('pReset').addEventListener('click', () => {
    document.getElementById('pMonth').value = US_DEF; document.getElementById('pPerson').value = ''; document.getElementById('pType').value = ''; document.getElementById('pMetric').value = 'bill';
    US_MSEL.pSite.set([]); US_MSEL.pCh.set([]); P.sortKey = 'bill'; P.sortDir = -1; pRead(); pRender();
  });
  document.getElementById('pExport').addEventListener('click', () => showToast('已导出（原型）'));
  document.getElementById('pTable').addEventListener('click', e => {
    const s = e.target.closest('[data-sort]');
    if (s) { P.sortDir = P.sortKey === s.dataset.sort ? -P.sortDir : -1; P.sortKey = s.dataset.sort; pRender(); return; }
    const b = e.target.closest('[data-prow]');
    if (b) pDrill(US_PROWS[+b.dataset.prow]);
  });
}

const US_TASK_NAMES = { 营销: ['周末返利', '充值满赠限时活动', '沉默召回', '新游上线预热', 'VIP 专属回归礼', '每日签到挑战', '世界杯竞猜预热', '生日专属礼包'], 通知: ['开赛提醒', '账户变动通知', '维护公告', '提现到账通知'], 'OTP': ['登录验证码'] };
function pTasksOf(r) {
  const out = [];
  r.facts.forEach(f => {
    const n = f.tasks, seed = [f.m, f.site, f.ch, f.acct, f.cat, f.person].join('|');
    let left = f.cnt, leftB = f.bill;
    for (let i = 0; i < n; i++) {
      const rr = usRand(seed + i), last = i === n - 1;
      const c = last ? left : Math.round(f.cnt / n * (.7 + .6 * rr)), b = last ? leftB : Math.round(c * f.bill / f.cnt);
      left -= c; leftB -= b;
      const names = US_TASK_NAMES[f.cat];
      const day = String(1 + Math.floor(rr * (f.m === US_CUR ? US_ASOF_DAY : 28))).padStart(2, '0');
      out.push({ id: `T${f.m.replace('-', '')}${day}${String(Math.floor(usRand(seed + 'id' + i) * 900) + 100)}`, name: names[Math.floor(rr * names.length)], ch: f.ch, cat: f.cat, src: f.src + (f.app ? ' → ' + f.app : ''), cnt: c, bill: b });
    }
  });
  return out.sort((a, b) => b.bill - a.bill);
}
function pDrill(r) {
  const chips = [['月份', P.month], ['人员', pPlainPerson(r)], ['产品线', r.pl]].concat(P.chs.length ? [['通道', P.chs.join('、')]] : []);
  let table;
  if (r.ptype === '系统') {
    const g = new Map();
    r.facts.forEach(f => { const k = [f.ch, f.app || '旧模块', f.cat].join('|'); if (!g.has(k)) g.set(k, []); g.get(k).push(f); });
    table = `<div class="v2-callout us-mb12"><i data-lucide="info"></i><span>事件触发等无 operator 的消息归「系统」，不计任务数；按通道 × 接入方 × 消息类别汇总如下。</span></div>
      <table class="table stats-table"><thead><tr><th>通道</th><th>接入方</th><th>消息类别</th><th class="v2-num">条数</th><th class="v2-num">计费条数</th></tr></thead><tbody>${[...g.entries()].map(([k, fs]) => { const [ch, app, cat] = k.split('|'); return `<tr><td>${ch}</td><td>${esc(app)}</td><td>${cat}</td><td class="v2-num">${fmtN(usSum(fs, 'cnt'))}</td><td class="v2-num">${fmtN(usSum(fs, 'bill'))}</td></tr>`; }).join('')}</tbody></table>`;
  } else {
    const tasks = pTasksOf(r);
    table = `<table class="table stats-table"><thead><tr><th>任务 ID</th><th>任务名称</th><th>通道</th><th>消息类别</th><th>任务来源</th><th class="v2-num">条数</th><th class="v2-num">计费条数</th></tr></thead><tbody>${tasks.map(t => `<tr><td>${t.id}</td><td>${esc(t.name)}</td><td>${t.ch}</td><td>${t.cat}</td><td>${esc(t.src)}</td><td class="v2-num">${fmtN(t.cnt)}</td><td class="v2-num">${fmtN(t.bill)}</td></tr>`).join('')}</tbody></table>`;
  }
  document.getElementById('usDrillTitle').textContent = '下钻 · 任务列表';
  document.getElementById('usDrillBody').innerHTML = `<div class="us-conds">${chips.map(([k, v]) => `<span class="tag tag-info">${esc(k)}：${esc(v)}</span>`).join('')}</div>
    <div class="v2-stat-strip us-mb12"><div class="s"><b>${r.tasks == null ? '-' : fmtN(r.tasks)}</b><span>任务数</span></div><div class="s"><b>${fmtN(usSum(r.facts, 'cnt'))}</b><span>条数</span></div><div class="s"><b>${fmtN(r.bill)}</b><span>计费条数</span></div><div class="s"><b>${r.momTxt}</b><span>环比</span></div></div>
    <div class="table-scroll">${table}</div>`;
  const link = document.getElementById('usDrillLink');
  link.textContent = '在任务记录中打开';
  link.href = 'task-records.html?' + new URLSearchParams(chips).toString();
  refreshIcons(); openDrawer('usDrillDrawer');
}

/* ===================== 5. 报表订阅（6.2.4） ===================== */
const US_REPORTS = ['月度用量分摊表', '人员用量表'];
const US_SUBS = [
  { id: 1, name: '财务月报', reports: US_REPORTS.slice(), sites: V2_PRODUCT_LINES.map(p => p.siteId), recips: ['finance 群', 'amy@（财务）'], day: 1, time: '09:00', on: true, last: { at: '2026-11-01 09:00', ok: true } },
  { id: 2, name: 'BP 产品线月报', reports: ['人员用量表'], sites: V2_PRODUCT_LINES.filter(p => p.bl === 'BP').map(p => p.siteId), recips: ['BP 运营群', 'lily@'], day: 1, time: '10:00', on: true, last: { at: '2026-11-01 10:00', ok: false } },
  { id: 3, name: 'GP 预算月报', reports: US_REPORTS.slice(), sites: ['gamezone'], recips: ['rico@'], day: 3, time: '09:30', on: false, last: { at: '2026-10-03 09:30', ok: true } },
];

function sScopeText(sites) {
  const all = V2_PRODUCT_LINES.map(p => p.siteId);
  if (all.every(s => sites.includes(s))) return '全部';
  return V2_BUSINESS_LINES.map(b => {
    const pls = V2_PRODUCT_LINES.filter(p => p.bl === b.code);
    const sel = pls.filter(p => sites.includes(p.siteId));
    if (!sel.length) return '';
    return sel.length === pls.length ? `${b.name} 全部` : `${b.name}：${sel.map(p => p.name).join('、')}`;
  }).filter(Boolean).join('；');
}

function sRender() {
  const admin = hasPerm('admin');
  document.getElementById('sNew').hidden = !admin;
  const rows = US_SUBS.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${s.reports.map(r => `<span class="tag tag-info">${r}</span>`).join(' ')}</td><td>${esc(sScopeText(s.sites))}</td>
    <td>${s.recips.map(r => `<span class="us-chip">${esc(r)}</span>`).join(' ')}</td><td>每月 ${s.day} 日 ${s.time}（PH）</td>
    <td>${admin ? `<label class="v2-switch"><input type="checkbox" data-son="${s.id}" ${s.on ? 'checked' : ''}><span></span></label>` : ''} ${s.on ? '启用' : '停用'}</td>
    <td>${s.last ? `${s.last.at} ${s.last.ok ? '<span class="tag tag-success">成功</span>' : '<span class="tag tag-danger">失败</span> <span class="v2-hint">已重试 3 次，已通知管理员</span>'}` : '-'}</td>
    <td>${admin ? `<button class="link-btn" data-sedit="${s.id}">编辑</button> ` : ''}<button class="link-btn" data-shist="${s.id}">推送记录</button>${admin ? ` <button class="link-btn link-btn-danger" data-sdel="${s.id}">删除</button>` : ''}</td></tr>`).join('');
  document.getElementById('sTable').innerHTML = `<thead><tr><th>订阅名称</th><th>报表</th><th>范围</th><th>接收人</th><th>推送时间</th><th>状态</th><th>最近推送</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="v2-muted">暂无订阅</td></tr>'}</tbody>`;
  refreshIcons();
}

function usChipsField(root, sel, init) { // 接收人选择器（Lark 用户 / 群）
  const list = init.slice();
  const box = root.querySelector(sel);
  const draw = () => {
    box.innerHTML = list.map((r, i) => `<span class="us-chip">${esc(r)}<button type="button" data-rm="${i}">×</button></span>`).join('') +
      `<select class="select select-sm" data-add><option value="">选择 Lark 用户或群</option>${US_LARK.filter(x => !list.includes(x)).map(x => `<option>${esc(x)}</option>`).join('')}</select>`;
  };
  box.addEventListener('click', e => { if (e.target.dataset.rm !== undefined) { list.splice(+e.target.dataset.rm, 1); draw(); } });
  box.addEventListener('change', e => { if (e.target.dataset.add !== undefined && e.target.value) { list.push(e.target.value); draw(); } });
  draw();
  return { get: () => list.slice(), set: arr => { list.splice(0, list.length, ...arr); draw(); } };
}

function sForm(sub) {
  const s = sub || { name: '', reports: US_REPORTS.slice(), sites: usScopeSites(), recips: [], day: 1, time: '09:00', on: true };
  const scope = V2_BUSINESS_LINES.map(b => {
    const pls = V2_PRODUCT_LINES.filter(p => p.bl === b.code && usScopeSites().includes(p.siteId));
    if (!pls.length) return '';
    return `<div><label class="us-check bl"><input type="checkbox" data-sbl="${b.code}" ${pls.every(p => s.sites.includes(p.siteId)) ? 'checked' : ''}>${b.name} 全部</label>
      <div class="pls">${pls.map(p => `<label class="us-check"><input type="checkbox" data-ssite="${p.siteId}" data-bl="${b.code}" ${s.sites.includes(p.siteId) ? 'checked' : ''}>${esc(p.name)}</label>`).join('')}</div></div>`;
  }).join('');
  const root = v2Modal({
    title: sub ? '编辑订阅' : '新建订阅', okText: '保存', width: 640,
    body: `<div class="v2-form">
      <label class="req">订阅名称</label><input class="input" id="sfName" maxlength="50" placeholder="请输入" value="${esc(s.name)}"><div class="us-err" id="sfNameErr" hidden></div>
      <label class="req">报表</label><div>${US_REPORTS.map(r => `<label class="us-check"><input type="checkbox" data-srep="${r}" ${s.reports.includes(r) ? 'checked' : ''}>${r}</label>`).join('')}</div>
      <label class="req">范围</label><div class="us-scope">${scope}</div>
      <div class="v2-hint">业务线 → 产品线级联多选；受配置人数据权限约束</div>
      <label class="req">接收人</label><div class="us-chips" id="sfRecips"></div><div class="us-err" id="sfRecErr" hidden></div>
      <label class="req">推送时间</label><div class="us-inline">每月 <select class="select" id="sfDay">${[1, 2, 3, 4, 5].map(d => `<option value="${d}" ${d === s.day ? 'selected' : ''}>${d} 日</option>`).join('')}</select>
        <input class="input" type="time" id="sfTime" value="${s.time}"><span class="v2-hint">PH 时区</span></div>
      <label class="req">状态</label><div class="us-inline"><label class="v2-switch"><input type="checkbox" id="sfOn" ${s.on ? 'checked' : ''}><span></span></label><span id="sfOnTxt">${s.on ? '启用' : '停用'}</span></div>
      <div class="v2-hint">推送前按订阅范围生成上月 Excel（与页面同一口径），附报表页链接；文件保留 12 个月可重新下载</div></div>`,
    onOk: r => sSave(r, sub, recips),
  });
  const recips = usChipsField(root, '#sfRecips', s.recips);
  root.querySelector('#sfOn').addEventListener('change', e => { root.querySelector('#sfOnTxt').textContent = e.target.checked ? '启用' : '停用'; });
  root.querySelector('.us-scope').addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sbl) root.querySelectorAll(`[data-bl="${t.dataset.sbl}"]`).forEach(x => { x.checked = t.checked; });
    if (t.dataset.ssite) { const b = t.dataset.bl; root.querySelector(`[data-sbl="${b}"]`).checked = [...root.querySelectorAll(`[data-bl="${b}"]`)].every(x => x.checked); }
  });
}

function sSave(root, sub, recips) {
  const err = (id, msg) => { const e = root.querySelector(id); e.hidden = !msg; e.textContent = msg || ''; return !!msg; };
  const name = root.querySelector('#sfName').value.trim();
  const reports = [...root.querySelectorAll('[data-srep]:checked')].map(x => x.dataset.srep);
  const sites = [...root.querySelectorAll('[data-ssite]:checked')].map(x => x.dataset.ssite);
  const rs = recips.get();
  let bad = err('#sfNameErr', !name ? '请输入订阅名称' : US_SUBS.some(x => x.name === name && x !== sub) ? '订阅名称已存在' : '');
  bad = err('#sfRecErr', !rs.length ? '至少选择 1 个接收人' : '') || bad;
  if (!reports.length) { showToast('请至少选择 1 张报表'); bad = true; }
  if (!sites.length) { showToast('请选择范围'); bad = true; }
  if (bad) return false;
  const data = { name, reports, sites, recips: rs, day: +root.querySelector('#sfDay').value, time: root.querySelector('#sfTime').value || '09:00', on: root.querySelector('#sfOn').checked };
  if (sub) Object.assign(sub, data); else US_SUBS.push(Object.assign({ id: Date.now(), last: null }, data));
  sRender(); showToast(sub ? '订阅已更新' : '订阅已创建');
}

function sHistory(sub) {
  const months = [];
  for (let i = 0; i < 12; i++) { const d = new Date(2026, 9 - i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  const pushAt = m => { const d = new Date(+m.slice(0, 4), +m.slice(5) , sub.day); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${sub.time}`; };
  const rows = months.map((m, i) => {
    const failed = i === 0 && sub.last && !sub.last.ok;
    return `<tr><td>${m}</td><td>${pushAt(m)}</td><td>${failed ? '<span class="tag tag-danger">失败</span> <span class="v2-hint">重试 3 次仍失败，已通知管理员</span>' : '<span class="tag tag-success">成功</span>'}</td>
      <td>${sub.reports.map(r => `<button class="link-btn" data-dl="${r}_${m}.xlsx">${r}_${m}.xlsx</button>`).join('<br>')}</td></tr>`;
  }).join('');
  document.getElementById('usHistTitle').textContent = `推送记录 · ${sub.name}`;
  document.getElementById('usHistBody').innerHTML = `<div class="v2-hint us-mb12">文件保留 12 个月，可重新下载</div>
    <table class="table stats-table"><thead><tr><th>报表月份</th><th>推送时间</th><th>结果</th><th>文件</th></tr></thead><tbody>${rows}</tbody></table>`;
  openDrawer('usHistDrawer');
}

function sInit() {
  document.getElementById('sNew').addEventListener('click', () => sForm(null));
  document.getElementById('usHistBody').addEventListener('click', e => { if (e.target.dataset.dl) showToast(`已下载 ${e.target.dataset.dl}（原型）`); });
  document.getElementById('sTable').addEventListener('click', e => {
    const t = e.target, id = +(t.dataset.sedit || t.dataset.shist || t.dataset.sdel || 0);
    const sub = US_SUBS.find(x => x.id === id);
    if (!sub) return;
    if (t.dataset.sedit) sForm(sub);
    if (t.dataset.shist) sHistory(sub);
    if (t.dataset.sdel) v2Modal({ title: '删除订阅', danger: true, okText: '删除', body: `确定删除订阅「${esc(sub.name)}」？删除后不再推送，已生成的历史文件仍可在 12 个月内下载。`, onOk: () => { US_SUBS.splice(US_SUBS.indexOf(sub), 1); sRender(); showToast('已删除'); } });
  });
  document.getElementById('sTable').addEventListener('change', e => {
    const sub = US_SUBS.find(x => x.id === +e.target.dataset.son);
    if (!sub) return;
    sub.on = e.target.checked; sRender(); showToast(sub.on ? '已启用' : '已停用');
  });
}

/* ===================== 6. 预算额度提醒（6.2.5，P1） ===================== */
const US_THRESHOLDS = [50, 80, 90, 100, 120];
const US_QUOTA_MONTHS = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03'];
function qUsed(site, ch, metric) { return usSum(US_FACTS.filter(f => f.m === US_CUR && f.site === site && f.ch === ch), metric) || 0; }
const US_QUOTAS = [ // demo：按当月已用反推的演示额度（用于展示 102% / 84% 等状态）
  { site: 'bp-growth', ch: 'SMS', metric: 'bill', quota: 700000, eff: '2026-09', recips: ['lily@'], th: [80, 100] },
  { site: 'bp-poc', ch: 'SMS', metric: 'bill', demo: 1.02, eff: '2026-10', recips: ['lily@', 'ann@'], th: [80, 100] },
  { site: 'bp-growth', ch: 'Push', metric: 'cnt', demo: .46, eff: '2026-10', recips: ['ken@'], th: [80, 100] },
  { site: 'gamezone', ch: 'SMS', metric: 'bill', demo: .84, eff: '2026-11', recips: ['rico@'], th: [80, 90, 100] },
  { site: 'arenaplus', ch: 'SMS', metric: 'bill', quota: 150000, eff: '2026-12', recips: ['joy@'], th: [80, 100] },
].map((q, i) => Object.assign({ id: i + 1 }, q, { quota: q.quota || Math.round(qUsed(q.site, q.ch, q.metric) / q.demo / 1000) * 1000 }));

function qStat(q) {
  if (q.eff > US_CUR) return null;
  const used = qUsed(q.site, q.ch, q.metric), r = used / q.quota * 100;
  const proj = Math.round(used / US_ASOF_DAY * US_CUR_DAYS);
  return { used, r, proj, hit: q.th.filter(t => r >= t) };
}
function qRender() {
  const rows = US_QUOTAS.map(q => {
    const s = qStat(q);
    const use = s ? `<span class="us-use ${s.r >= 100 ? 'over' : s.r >= 80 ? 'mid' : ''}"><span class="v2-prog"><i style="width:${Math.min(100, s.r).toFixed(0)}%"></i></span><b>${s.r.toFixed(0)}%</b></span>` : '<span class="tag tag-gray">未生效</span>';
    return `<tr><td>${esc(plName(q.site))}</td><td>${q.ch}</td><td>${US_METRICS[q.metric]}</td><td class="v2-num">${fmtN(q.quota)}</td><td>${q.eff} 起</td>
      <td class="v2-num">${s ? fmtN(s.used) : '-'}</td><td>${use}${s && s.r >= 100 ? '<div><span class="tag tag-danger">超额（不拦截）</span></div>' : ''}</td>
      <td class="v2-num">${s ? fmtN(s.proj) + ` <span class="v2-pm">${(s.proj / q.quota * 100).toFixed(0)}%</span>` : '-'}</td>
      <td>${q.th.map(t => t + '%').join(' / ')}</td>
      <td>${s && s.hit.length ? s.hit.map(t => `<span class="tag ${t >= 100 ? 'tag-danger' : 'tag-warning'}">${t}% 已提醒</span>`).join(' ') : '-'}</td>
      <td>${q.recips.map(r => `<span class="us-chip">${esc(r)}</span>`).join(' ')}</td>
      <td><button class="link-btn" data-qedit="${q.id}">编辑</button> <button class="link-btn" data-qprev="${q.id}">提醒预览</button> <button class="link-btn link-btn-danger" data-qdel="${q.id}">删除</button></td></tr>`;
  }).join('');
  document.getElementById('qTable').innerHTML = `<thead><tr><th>产品线</th><th>通道</th><th>额度指标</th><th class="v2-num">月额度</th><th>生效月份</th><th class="v2-num">本月已用（截至 ${US_ASOF.slice(5)}）</th><th>使用率</th><th class="v2-num">预计月末用量</th><th>提醒阈值</th><th>本月提醒</th><th>提醒接收人</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="12" class="v2-muted">暂无额度</td></tr>'}</tbody>`;
  refreshIcons();
}

function qForm(q) {
  const d = q || { site: '', ch: '', metric: 'bill', quota: '', eff: '2026-12', recips: [], th: [80, 100] };
  const sites = usScopeSites().filter(s => V2_PRODUCT_LINES.find(p => p.siteId === s).status === '启用');
  const root = v2Modal({
    title: q ? '编辑额度' : '新建额度', okText: '保存', width: 620,
    body: `<div class="v2-form">
      <label class="req">产品线</label><select class="select" id="qfSite">${usOpts(sites.map(s => [s, plName(s)]), d.site, '请选择')}</select>
      <label class="req">通道</label><select class="select" id="qfCh">${usOpts(V2_CHANNELS.map(c => [c, c]), d.ch, '请选择')}</select>
      <div class="us-err" id="qfUniqErr" hidden></div>
      <label class="req">额度指标</label><div>${Object.entries(US_METRICS).map(([k, l]) => `<label class="us-check"><input type="radio" name="qfMetric" value="${k}" ${d.metric === k ? 'checked' : ''}>${l}</label>`).join('')}</div>
      <label class="req">月额度</label><input class="input" type="number" min="1" step="1" id="qfQuota" placeholder="请输入" value="${d.quota}"><div class="us-err" id="qfQuotaErr" hidden></div>
      <div class="v2-hint">按自然月</div>
      <label class="req">生效月份</label><select class="select" id="qfEff">${US_QUOTA_MONTHS.map(m => `<option ${m === d.eff ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <div class="v2-hint">长期有效直至修改</div>
      <label class="req">提醒接收人</label><div class="us-chips" id="qfRecips"></div><div class="us-err" id="qfRecErr" hidden></div>
      <label class="req">提醒阈值</label><div>${US_THRESHOLDS.map(t => `<label class="us-check"><input type="checkbox" data-qth="${t}" ${d.th.includes(t) ? 'checked' : ''}>${t}%</label>`).join('')}</div>
      <div class="v2-hint">每阈值每月提醒一次；超额不拦截任务提交</div></div>`,
    onOk: r => qSave(r, q, recips),
  });
  const recips = usChipsField(root, '#qfRecips', d.recips);
  root.querySelector('#qfSite').addEventListener('change', e => { if (!q && e.target.value) recips.set([US_PL_OWNER[e.target.value]]); }); // 默认产品线负责人
}

function qSave(root, q, recips) {
  const err = (id, msg) => { const e = root.querySelector(id); e.hidden = !msg; e.textContent = msg || ''; return !!msg; };
  const site = root.querySelector('#qfSite').value, ch = root.querySelector('#qfCh').value;
  const quota = Number(root.querySelector('#qfQuota').value);
  const th = [...root.querySelectorAll('[data-qth]:checked')].map(x => +x.dataset.qth);
  let bad = err('#qfUniqErr', !site || !ch ? '请选择产品线与通道' : US_QUOTAS.some(x => x !== q && x.site === site && x.ch === ch) ? '该产品线 × 通道已设置额度，请编辑原记录' : '');
  bad = err('#qfQuotaErr', !Number.isInteger(quota) || quota < 1 ? '请输入 ≥ 1 的整数' : '') || bad;
  bad = err('#qfRecErr', !recips.get().length ? '至少选择 1 个接收人' : '') || bad;
  if (!th.length) { showToast('请至少选择 1 个提醒阈值'); bad = true; }
  if (bad) return false;
  const data = { site, ch, metric: root.querySelector('[name=qfMetric]:checked').value, quota, eff: root.querySelector('#qfEff').value, recips: recips.get(), th };
  if (q) Object.assign(q, data); else US_QUOTAS.push(Object.assign({ id: Date.now() }, data));
  qRender(); showToast(q ? '额度已更新' : '额度已创建');
}

function qPreview(q) {
  const s = qStat(q) || { used: 0, r: 0, proj: 0 };
  const t = q.th.filter(x => s.r >= x).pop() || q.th[0];
  v2Modal({
    title: '提醒预览', okText: '知道了', hideCancel: true, width: 580,
    body: `<div class="v2-section-title">Lark 提醒（达 ${t}% 时推送一次）</div>
      <div class="us-lark"><b>【触达额度提醒】${esc(plName(q.site))} · ${q.ch}</b><br>
        本月已用 ${fmtN(s.used)} / 额度 ${fmtN(q.quota)}（${US_METRICS[q.metric]}，${s.r.toFixed(0)}%）<br>
        预计月末用量 ${fmtN(s.proj)}（按截至 ${US_ASOF} 线性外推）<br>
        超额不拦截任务提交。<button class="link-btn">查看月度用量</button></div>
      <div class="v2-section-title">新建任务表单顶部提示</div>
      <div class="v2-callout ${s.r >= 100 ? 'danger' : 'warn'}"><i data-lucide="alert-triangle"></i><span>本月 ${q.ch} 已用 ${s.r.toFixed(0)}%</span></div>
      <div class="v2-hint">仅展示，不拦截任务提交</div>`,
  });
}

function qInit() {
  document.getElementById('qNew').addEventListener('click', () => qForm(null));
  document.getElementById('qTable').addEventListener('click', e => {
    const t = e.target, id = +(t.dataset.qedit || t.dataset.qprev || t.dataset.qdel || 0);
    const q = US_QUOTAS.find(x => x.id === id);
    if (!q) return;
    if (t.dataset.qedit) qForm(q);
    if (t.dataset.qprev) qPreview(q);
    if (t.dataset.qdel) v2Modal({ title: '删除额度', danger: true, okText: '删除', body: `确定删除「${esc(plName(q.site))} · ${q.ch}」的月额度？删除后不再提醒。`, onOk: () => { US_QUOTAS.splice(US_QUOTAS.indexOf(q), 1); qRender(); showToast('已删除'); } });
  });
}

/* ===================== 7. Tabs 与初始化 ===================== */
const US_TAB_TITLES = { usage: '月度用量', people: '人员用量', subscribe: '报表订阅', quota: '额度设置' };
/* 报表订阅（附录 C.1 后续）、额度设置（已上线）本期不展示 */
function usAllowedTabs() { return ['usage', 'people']; }
function usShowTab(key) {
  if (!usAllowedTabs().includes(key)) key = 'usage';
  document.querySelectorAll('#usTabs [data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === key));
  document.querySelectorAll('[data-uspane]').forEach(p => { p.hidden = p.dataset.uspane !== key; });
  document.getElementById('usTitle').textContent = US_TAB_TITLES[key];
  if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key);
}
function usInitTabs() {
  document.querySelectorAll('#usTabs [data-perm]').forEach(t => { if (!hasPerm(t.dataset.perm)) t.remove(); });
  document.querySelectorAll('#usTabs [data-tab]').forEach(t => t.addEventListener('click', () => usShowTab(t.dataset.tab)));
  window.addEventListener('hashchange', () => usShowTab(location.hash.slice(1)));
  usShowTab(location.hash.slice(1) || 'usage');
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-stats', 'stats-usage');
  renderTopbar();
  document.getElementById('usScopeHint').textContent = usGlobal() ? '数据权限：统计查看（全局）' : '数据权限：本人数据权限内产品线（BP）';
  uInitFilters(); uRender();
  pInit(); pRender();
  sInit(); sRender();
  if (hasPerm('admin')) { qInit(); qRender(); }
  usInitTabs();
  refreshIcons();
  bindDrawerClose();
});

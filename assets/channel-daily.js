/* 通道 / 供应商日报（PRD 6.4.2）+ 基础告警（6.4.3，P1：告警记录 / 告警规则）
 * 数据为演示：按 账号 × 发送方标识 × 产品线 × 消息类别 生成每日 / 每小时事实，再按筛选与行维度汇总。
 * 口径：发送量 = 已提交；受理率 = 已提交 ÷（已提交 + 提交失败）；送达率 = 已送达 ÷ 已提交；回执率 =（已送达 + 未送达）÷ 已提交。 */

const CD_TODAY = '2026-07-13';
const CD_NOW_HOUR = 16;
/* 共享数据缺少的账号（演示）：NXLink 聚合短信账号、站内信 */
const CD_EXTRA_ACCOUNTS = [
  { id: 'AGG-01', channel: 'SMS', vendor: 'NXLink', bl: 'BP', senders: ['BPGROWTH', 'BPPLATFORM', 'BPCONTENT'] },
  { id: 'BP-inbox', channel: '站内信', vendor: '自建站内信', bl: 'BP', senders: ['BingoPlus 站内信', 'ArenaPlus 站内信'] },
];
const CD_ACCOUNTS = V2_ACCOUNTS.concat(CD_EXTRA_ACCOUNTS);
const CD_ACC_BASE = { 'BP-01': 88000, 'BP-02': 58000, 'GP-01': 21000, 'OTP-BP': 15000, 'AGG-01': 37000, 'BP-mail': 42000, 'BP-push': 30000, 'BP-im': 9000, 'BP-vbot': 3000, 'BP-msg': 4000, 'BP-msgbot': 2000, 'OTP-IM': 1500, 'BP-inbox': 50000 };
const CD_SENDER_SITE = {
  BPGROWTH: ['bp-growth'], BPPLATFORM: ['bp-poc'], BPCONTENT: ['bp-coc'], BPVIP: ['bp-vip'], GAMEZONE: ['gamezone'], ARENAPLUS: ['arenaplus'],
  BPVERIFY: ['bp-growth', 'bp-poc'], 'news@bingoplus.ph': ['bp-growth', 'bp-poc', 'bp-coc', 'bp-vip'],
  'BP App': ['bp-growth', 'bp-poc', 'bp-coc'], 'BingoPlus Viber': ['bp-growth'], 'BingoPlus 站内信': ['bp-growth'], 'ArenaPlus 站内信': ['bp-poc'],
};
/* 共用 Sender：发送方标识对应多个产品线，不计归属不一致 */
const CD_SHARED_SENDERS = ['BPVERIFY', 'BP App'];
/* 供应商质量画像（演示） */
const CD_Q = {
  Globe:  { acc: .994, del: .951, rec: .970, p50: 1.2, p95: 3.8, seg: 1.06, retry: 0, uncls: .003 },
  Smart:  { acc: .990, del: .948, rec: .969, p50: 1.5, p95: 4.6, seg: 1.05, retry: 0, uncls: .006 },
  DLink:  { acc: .992, del: .946, rec: .966, p50: 1.4, p95: 4.1, seg: 1.07, retry: 0, uncls: .004 },
  NXLink: { acc: .982, del: .920, rec: .951, p50: 3.1, p95: 9.7, seg: 1.23, retry: .10, uncls: .024 },
  OneSignal: { acc: .997, del: .962, rec: .985, p50: .4, p95: 2.1, seg: 1, retry: 0, uncls: .01 },
  'Engagement Lab': { acc: .999, del: .930, rec: null, p50: null, p95: null, seg: 1, retry: 0, uncls: .008 },
  Mocean: { acc: .985, del: .880, rec: .930, p50: .8, p95: 2.5, seg: 1, retry: 0, uncls: .03 },
  PTX: { acc: .987, del: .890, rec: .935, p50: .9, p95: 2.8, seg: 1, retry: 0, uncls: .02 },
  Viber: { acc: .995, del: .920, rec: .950, p50: .5, p95: 1.8, seg: 1, retry: 0, uncls: .01 },
  Infobip: { acc: .990, del: .900, rec: .940, p50: .7, p95: 2.2, seg: 1, retry: 0, uncls: .02 },
  Meta: { acc: .996, del: .930, rec: .955, p50: .4, p95: 1.5, seg: 1, retry: 0, uncls: .01 },
  自建站内信: { acc: 1, del: .999, rec: null, p50: null, p95: null, seg: 1, retry: 0, uncls: 0 },
};
const CD_SUBMIT_W = { 账号鉴权或余额: 1, 模板或签名无效: 1.5, 号段或目标不支持: 2, 内容被供应商拒绝: 2.5, 供应商限流: 2, 供应商网关故障: 1 };
const CD_UNDELIV_W = {
  SMS: { 号码或地址无效: 61, 用户不可达: 17, 运营商或平台拦截: 12, 用户拒收: 5, 终端或网络超时: 5 },
  NXLink: { 号码或地址无效: 28, 用户不可达: 14, 运营商或平台拦截: 38, 用户拒收: 6, 终端或网络超时: 14 },
  邮件: { 号码或地址无效: 52, 用户不可达: 18, 运营商或平台拦截: 22, 用户拒收: 8 },
  Push: { 号码或地址无效: 64, 用户不可达: 26, 用户拒收: 10 },
  'Viber Biz': { 用户不可达: 70, 号码或地址无效: 15, 用户拒收: 10, 运营商或平台拦截: 5 },
  'Viber Bot': { 用户不可达: 60, 用户拒收: 30, 号码或地址无效: 10 },
  'Messenger Biz': { 用户不可达: 55, 用户拒收: 30, 号码或地址无效: 15 },
  'Messenger Bot': { 用户不可达: 55, 用户拒收: 35, 号码或地址无效: 10 },
  WhatsApp: { 用户不可达: 65, 号码或地址无效: 25, 用户拒收: 10 },
  站内信: { 号码或地址无效: 100 },
};
const CD_HOUR_W = [1, .6, .4, .3, .3, .5, 1, 2, 3, 4, 5, 5, 5, 5, 5, 6, 7, 8, 9, 9, 8, 6, 4, 2];
const CD_HOUR_SUM = CD_HOUR_W.reduce((a, b) => a + b, 0);
const CD_DIMS = { vendor: '供应商', account: '账号', sender: '发送方标识', bl: '业务线', site: '产品线', cat: '消息类别' };
const CD_SENDER_LABEL = { SMS: 'Sender ID', 邮件: '发件人', Push: 'App', 'Viber Biz': '发送方标识', 'Viber Bot': '发送方标识', 'Messenger Biz': '发送方标识', 'Messenger Bot': '发送方标识', WhatsApp: '发送方标识', 站内信: '发送方标识' };
const CD_NO_RECEIPT = ['Push', '站内信'];
const CD_DEFAULT = { range: '7d', gran: 'day', channel: 'SMS', dim: 'vendor' };
const CD_ACC_CARD_MIN = 98; // 受理率低于此值标红（演示默认）

const CD = { sort: { key: 'sent', dir: -1 }, trendMetric: 'del', ms: {}, drill: null, tab: 'daily' };

/* ================= 事实生成 ================= */
function cdUnits() {
  if (CD._units) return CD._units;
  const units = [];
  CD_ACCOUNTS.forEach(acc => {
    const base = CD_ACC_BASE[acc.id] || 5000;
    const cats = acc.mode === 'otp' ? { 'OTP': 1 } : { 营销: 1 };
    acc.senders.forEach((sender, si) => {
      const sw = acc.senders.length === 1 ? 1 : (si === 0 ? .55 : .45 / (acc.senders.length - 1));
      const sites = CD_SENDER_SITE[sender] || ['bp-growth'];
      sites.forEach((site, pi) => {
        const pw = sites.length === 1 ? 1 : (pi === 0 ? .6 : .4 / (sites.length - 1));
        Object.entries(cats).forEach(([cat, cw]) => {
          const pl = V2_PRODUCT_LINES.find(p => p.siteId === site);
          units.push({ id: `${acc.id}|${sender}|${site}|${cat}`, channel: acc.channel, vendor: acc.vendor, account: acc.id, sender, site, bl: pl ? pl.bl : acc.bl, cat, base: base * sw * pw * cw, mismatch: 0 });
        });
      });
    });
  });
  /* 归属不一致示例：GameZone 任务走了 BPGROWTH（非共用 Sender） */
  units.push({ id: 'BP-01|BPGROWTH|gamezone|营销', channel: 'SMS', vendor: 'Globe', account: 'BP-01', sender: 'BPGROWTH', site: 'bp-coc', bl: 'BP', cat: '营销', base: 160, mismatch: 1 });
  CD._units = units;
  return units;
}
function cdDayMul(day) { const dow = new Date(day + 'T00:00:00').getDay(); return (dow === 0 || dow === 6 ? 1.15 : 1) * (0.92 + faRand('d' + day) * .16); }
function cdAnomaly(u, day, hour) {
  const a = { del: 0, acc: 0, carrier: 0 };
  if (u.vendor === 'NXLink' && day === CD_TODAY && (hour == null || hour >= 13)) { a.del = -.06; a.acc = -.035; a.carrier = 1; }
  if (u.vendor === 'Globe' && u.sender === 'BPPLATFORM' && day >= '2026-07-12') { a.del = -.045; a.carrier = 1; }
  return a;
}
/* 单元 × 时段的事实（vol = 已提交条数） */
function cdFact(u, day, hour) {
  const key = `${u.id}|${day}|${hour == null ? '' : hour}`;
  let share = 1;
  if (hour != null) share = CD_HOUR_W[hour] / CD_HOUR_SUM;
  else if (day === CD_TODAY) share = CD_HOUR_W.slice(0, CD_NOW_HOUR + 1).reduce((a, b) => a + b, 0) / CD_HOUR_SUM;
  const sent = Math.round(u.base * cdDayMul(day) * share * (0.9 + faRand(key) * .2));
  const q = CD_Q[u.vendor] || CD_Q.Globe; const an = cdAnomaly(u, day, hour); const n = (faRand(key + 'q') - .5) * .008;
  const acc = Math.min(1, q.acc + an.acc + n / 2);
  const del = Math.min(1, q.del + an.del + n);
  const submitFail = acc >= 1 ? 0 : Math.round(sent * (1 - acc) / acc);
  const delivered = Math.round(sent * del);
  const noRc = CD_NO_RECEIPT.includes(u.channel);
  const undelivered = noRc ? sent - delivered : Math.min(sent - delivered, Math.round(sent * Math.max(0, (q.rec + n / 2) - del)));
  const noReceipt = sent - delivered - undelivered;
  const uw = { ...(u.vendor === 'NXLink' ? CD_UNDELIV_W.NXLink : CD_UNDELIV_W[u.channel] || CD_UNDELIV_W.SMS) };
  if (an.carrier) uw.运营商或平台拦截 = (uw.运营商或平台拦截 || 0) * 3 + 20;
  const fails = submitFail + undelivered;
  uw.未分类 = Object.values(uw).reduce((a, b) => a + b, 0) * q.uncls / Math.max(.0001, 1 - q.uncls);
  const cats = { ...faSplit(submitFail, CD_SUBMIT_W) };
  Object.entries(faSplit(undelivered, uw)).forEach(([k, v]) => { cats[k] = (cats[k] || 0) + v; });
  return {
    u, day, hour, sent, billable: Math.round(sent * q.seg), retry: Math.round(sent * q.retry),
    submitFail, delivered, undelivered, noReceipt: noRc ? 0 : noReceipt, cats, fails,
    p50: q.p50 == null ? null : q.p50 * (1 + n * 20) * (an.del ? 1.6 : 1), p95: q.p95 == null ? null : q.p95 * (1 + n * 25) * (an.del ? 1.9 : 1),
    mismatch: u.mismatch ? sent : 0, checkFlag: u.channel === '邮件' ? .12 + n * 4 : null,
  };
}

/* ================= 时段 ================= */
function cdAddDays(d, n) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function cdRangeDays() {
  const r = document.getElementById('cdRange').value;
  if (r === 'custom') {
    const from = document.getElementById('cdFrom').value; const to = document.getElementById('cdTo').value;
    const days = []; for (let d = from; d <= to && days.length < 400; d = cdAddDays(d, 1)) days.push(d); return days;
  }
  const n = { today: 1, '7d': 7, '30d': 30 }[r];
  return Array.from({ length: n }, (_, i) => cdAddDays(CD_TODAY, i - n + 1));
}
function cdWeekKey(d) { const x = new Date(d + 'T00:00:00Z'); const dow = (x.getUTCDay() + 6) % 7; return cdAddDays(d, -dow); }
/* 返回 [{ key, label, facts:[] }] */
function cdPeriods(units) {
  const days = cdRangeDays(); const gran = document.getElementById('cdGran').value;
  if (gran === 'hour') {
    return days.flatMap(d => Array.from({ length: d === CD_TODAY ? CD_NOW_HOUR + 1 : 24 }, (_, h) => ({
      key: `${d} ${h}`, label: days.length === 1 ? `${String(h).padStart(2, '0')}:00` : `${d.slice(5)} ${String(h).padStart(2, '0')}`,
      facts: units.map(u => cdFact(u, d, h)),
    })));
  }
  const buckets = {};
  days.forEach(d => {
    const k = gran === 'week' ? cdWeekKey(d) : gran === 'month' ? d.slice(0, 7) : d;
    const lab = gran === 'week' ? `${k.slice(5)} 周` : gran === 'month' ? `${k.slice(0, 4)}-${k.slice(5, 7)}` : d.slice(5);
    (buckets[k] || (buckets[k] = { key: k, label: lab, facts: [] })).facts.push(...units.map(u => cdFact(u, d)));
  });
  return Object.values(buckets).sort((a, b) => (a.key < b.key ? -1 : 1));
}

/* ================= 汇总 ================= */
function cdAgg(facts) {
  const a = { sent: 0, billable: 0, retry: 0, submitFail: 0, delivered: 0, undelivered: 0, noReceipt: 0, fails: 0, mismatch: 0, cats: {}, p50w: 0, p95w: 0, pw: 0, chk: 0, chkw: 0 };
  facts.forEach(f => {
    a.sent += f.sent; a.billable += f.billable; a.retry += f.retry; a.submitFail += f.submitFail; a.delivered += f.delivered;
    a.undelivered += f.undelivered; a.noReceipt += f.noReceipt; a.mismatch += f.mismatch;
    Object.entries(f.cats).forEach(([k, v]) => { a.cats[k] = (a.cats[k] || 0) + v; });
    if (f.p50 != null) { a.p50w += f.p50 * f.sent; a.p95w += f.p95 * f.sent; a.pw += f.sent; }
    if (f.checkFlag != null) { a.chk += f.checkFlag * f.sent; a.chkw += f.sent; }
  });
  a.failTotal = Object.values(a.cats).reduce((s, v) => s + v, 0);
  a.acc = a.sent + a.submitFail ? a.sent / (a.sent + a.submitFail) * 100 : null;
  a.del = a.sent ? a.delivered / a.sent * 100 : null;
  a.rec = a.sent ? (a.delivered + a.undelivered) / a.sent * 100 : null;
  a.p50 = a.pw ? a.p50w / a.pw : null; a.p95 = a.pw ? a.p95w / a.pw : null;
  a.uncls = a.failTotal ? (a.cats.未分类 || 0) / a.failTotal * 100 : 0;
  a.check = a.chkw ? a.chk / a.chkw * 100 : null;
  a.retryShare = a.sent ? a.retry / a.sent * 100 : null;
  return a;
}
function cdP(v, d = 1) { return v == null ? '-' : v.toFixed(d) + '%'; }
function cdK(n) { return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(0) + 'k' : fmtN(n); }

/* ================= 筛选 ================= */
function cdChannel() { return document.getElementById('cdChannel').value; }
function cdFilteredUnits() {
  const ch = cdChannel(); const vs = CD.ms.vendor.get(); const as = CD.ms.account.get(); const bs = CD.ms.bl.get(); const cs = CD.ms.cat.get();
  return cdUnits().filter(u => u.channel === ch && (!vs.length || vs.includes(u.vendor)) && (!as.length || as.includes(u.account))
    && (!bs.length || bs.includes('bl:' + u.bl) || bs.includes('site:' + u.site)) && (!cs.length || cs.includes(u.cat)));
}
function cdRefreshCascade() {
  const ch = cdChannel(); const accs = CD_ACCOUNTS.filter(a => a.channel === ch);
  CD.ms.vendor.setOptions([...new Set(accs.map(a => a.vendor))].map(v => ({ v, l: v })));
  const vs = CD.ms.vendor.get();
  CD.ms.account.setOptions(accs.filter(a => !vs.length || vs.includes(a.vendor)).map(a => ({ v: a.id, l: `${a.vendor} → ${a.id}` })));
  const dimSel = document.getElementById('cdDim'); const cur = dimSel.value || CD_DEFAULT.dim;
  dimSel.innerHTML = Object.entries(CD_DIMS).map(([k, l]) => `<option value="${k}">${k === 'sender' ? `${l}（${CD_SENDER_LABEL[ch]}）` : l}</option>`).join('');
  dimSel.value = cur;
}
function cdGranGuard() {
  const days = cdRangeDays().length; const g = document.getElementById('cdGran');
  g.querySelector('option[value="hour"]').disabled = days > 7;
  if (days > 7 && g.value === 'hour') { g.value = 'day'; showToast('小时粒度仅时间范围 ≤ 7 天可选，已切换为日'); }
}
function cdDimLabel(dim) { return dim === 'sender' ? CD_SENDER_LABEL[cdChannel()] : CD_DIMS[dim]; }
function cdValLabel(dim, v) { return dim === 'site' ? plName(v) : v; }
function cdRangeText() {
  const r = document.getElementById('cdRange');
  return r.value === 'custom' ? `${document.getElementById('cdFrom').value} 至 ${document.getElementById('cdTo').value}` : r.options[r.selectedIndex].text;
}
function cdValidate() {
  if (document.getElementById('cdRange').value !== 'custom') return '';
  const a = document.getElementById('cdFrom').value; const b = document.getElementById('cdTo').value;
  if (!a || !b || a > b) return '开始日期不能晚于结束日期';
  if (b > CD_TODAY) return '结束日期不能晚于今天';
  if ((new Date(b) - new Date(a)) / 864e5 + 1 > 92) return '自定义时间范围不能超过 92 天';
  return '';
}

/* ================= 渲染：日报 ================= */
function cdQuery() {
  const err = cdValidate(); if (err) { showToast(err); return; }
  cdGranGuard();
  const units = cdFilteredUnits(); const periods = cdPeriods(units);
  CD.periods = periods; CD.facts = periods.flatMap(p => p.facts);
  const ch = cdChannel();
  document.getElementById('cdScopeText').innerHTML = `<b>${esc(ch)}</b> · ${esc(cdRangeText())} · ${esc(document.getElementById('cdGran').selectedOptions[0].text)}粒度`;
  cdRenderCards(cdAgg(CD.facts)); cdRenderTrend(); cdRenderDist(cdAgg(CD.facts)); cdRenderTable();
  refreshIcons();
}
function cdDelThreshold(ch) {
  const r = CD_RULES.find(x => x.enabled && x.metric === '送达率' && x.target.channel === ch);
  return r ? r.value : 90;
}
/* 计费方式：SMS、Viber Biz / Bot、Messenger Biz / Bot、WhatsApp 按条；邮件 / Push 月包；站内信不计费（6.1.3）。月包 / 不计费也显示用量 */
const CD_BILLING = { SMS: '按条', 'Viber Biz': '按条', 'Viber Bot': '按条', 'Messenger Biz': '按条', 'Messenger Bot': '按条', WhatsApp: '按条', 邮件: '月包', Push: '月包', 站内信: '不计费' };
function cdBillTxt(ch, v, sent) { return CD_BILLING[ch] === '按条' || !CD_BILLING[ch] ? fmtN(v) : `${fmtN(sent != null ? sent : v)} <span class="tag tag-gray-outline">${CD_BILLING[ch]}</span>`; }
function cdRenderCards(a) {
  const ch = cdChannel(); const noRc = CD_NO_RECEIPT.includes(ch); const delMin = cdDelThreshold(ch);
  const cards = [
    ['发送量', fmtN(a.sent), '', '已提交消息数'],
    ['计费条数', cdBillTxt(ch, a.billable, a.sent), '', '按条计费通道按供应商拆分规则折算；邮件 / Push 月包、站内信不计费，显示用量条数（用于按量分摊）'],
    ['受理率', cdP(a.acc), a.acc != null && a.acc < CD_ACC_CARD_MIN ? 'danger' : '', `已提交 ÷（已提交 + 提交失败）；低于 ${CD_ACC_CARD_MIN}% 标红`],
    ['送达率', cdP(a.del), a.del != null && a.del < delMin ? 'danger' : '', `已送达 ÷ 已提交；低于告警阈值 ${delMin}% 标红`],
    ['回执率', noRc ? '-' : cdP(a.rec), '', noRc ? '站内信 / Push 无运营商回执，回执率显示 -' : '（已送达 + 未送达）÷ 已提交'],
    ['回执 P95', noRc || a.p95 == null ? '-' : `${a.p95.toFixed(1)} 分`, '', '提交 → 回执时延的 P95'],
    ['重试占比', ch === 'SMS' ? cdP(a.retryShare) : '-', '', '短信经直连供应商提交失败后转聚合供应商的记为重试；非短信为 -'],
  ];
  document.getElementById('cdCards').innerHTML = cards.map(([t, v, cls, tip]) => `<div class="kpi-card${cls ? ' cd-card-bad' : ''}"><div class="kpi-title">${t}${tipIcon(tip)}</div><div class="kpi-value ${cls}">${v}</div></div>`).join('');
}
function cdGroup(facts, dim) {
  const g = {}; facts.forEach(f => { (g[f.u[dim]] || (g[f.u[dim]] = [])).push(f); }); return g;
}
function cdRenderTrend() {
  const ch = cdChannel(); const m = CD.trendMetric; const dim = document.getElementById('cdDim').value; const box = document.getElementById('cdTrend');
  if (m === 'rec' && CD_NO_RECEIPT.includes(ch)) { box.innerHTML = `<div class="fa-empty" style="color:var(--text-3)">${esc(ch)} 无运营商回执，回执率不适用</div>`; document.getElementById('cdTrendHint').textContent = ''; return; }
  const groups = cdGroup(CD.facts, dim);
  const top = Object.entries(groups).map(([k, fs]) => [k, fs.reduce((s, f) => s + f.sent, 0)]).sort((a, b) => b[1] - a[1]);
  const keep = top.slice(0, 8).map(x => x[0]);
  document.getElementById('cdTrendHint').textContent = `按${cdDimLabel(dim)}${top.length > 8 ? `，取发送量前 8（共 ${top.length}）` : ''}`;
  const series = keep.map(k => ({ name: cdValLabel(dim, k), points: CD.periods.map(p => cdAgg(p.facts.filter(f => f.u[dim] === k))[m]) }));
  box.innerHTML = faLineChart({ series, labels: CD.periods.map(p => p.label), height: 280, width: 600 });
}
function cdRenderDist(a) {
  const rows = Object.entries(a.cats).filter(([, v]) => v).sort((x, y) => y[1] - x[1]);
  const box = document.getElementById('cdDist');
  if (!rows.length) { box.innerHTML = '<div class="fa-empty">无失败</div>'; return; }
  box.innerHTML = `<div class="v2-hint" style="margin-bottom:8px">失败 ${fmtN(a.failTotal)} 条（提交失败 + 未送达，与告警失败率同口径）</div>` +
    faBarList(rows.slice(0, 9).map(([k, v]) => ({ label: k, value: v, text: `${fmtN(v)} · ${pct(v, a.failTotal)}`, cls: `click${k === '未分类' ? ' gray' : ''}`, attrs: `data-dist-cat="${esc(k)}" title="查看「${esc(k)}」的失败原因"` })));
  box.querySelectorAll('[data-dist-cat]').forEach(el => el.addEventListener('click', () => cdOpenDrill(null, null, el.dataset.distCat)));
}
function cdTopFails(a) {
  return Object.entries(a.cats).filter(([, v]) => v).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k} ${pct(v, a.failTotal, 0)}`).join(' · ') || '-';
}
function cdRenderTable() {
  const ch = cdChannel(); const dim = document.getElementById('cdDim').value; const noRc = CD_NO_RECEIPT.includes(ch); const isMail = ch === '邮件';
  const groups = cdGroup(CD.facts, dim);
  let rows = Object.entries(groups).map(([k, fs]) => ({ k, a: cdAgg(fs) }));
  const sk = CD.sort.key; const val = r => (sk === 'name' ? r.k : sk === 'p95' ? (r.a.p95 || 0) : sk === 'check' ? (r.a.check || 0) : (r.a[sk] ?? 0));
  rows.sort((x, y) => { const a = val(x); const b = val(y); return (a < b ? -1 : a > b ? 1 : 0) * CD.sort.dir; });
  if (dim === 'cat') rows.sort((x, y) => (y.k === 'OTP') - (x.k === 'OTP'));
  const th = (key, label, tip, num = true) => `<th class="${num ? 'v2-num ' : ''}cd-th" data-sort="${key}">${label}${tip ? tipIcon(tip) : ''}<span class="cd-arrow">${CD.sort.key === key ? (CD.sort.dir < 0 ? '↓' : '↑') : '↕'}</span></th>`;
  const head = `<thead><tr>${th('name', esc(cdDimLabel(dim)), '', false)}${th('sent', '发送量', '已提交消息数')}${th('billable', '计费条数', '4.4.6 计量口径')}
    <th class="v2-num">首发 / 重试${tipIcon('短信路由重试计入最终供应商的重试列；首发失败的供应商只计提交失败，不计发送量；非短信为 -')}</th>
    ${th('acc', '提交受理率', '已提交 ÷（已提交 + 提交失败）')}${th('del', '送达率', '已送达 ÷ 已提交；站内信 / Push 送达 = 写入成功 / 平台受理')}
    ${th('rec', '回执率', '（已送达 + 未送达）÷ 已提交；站内信 / Push 无回执语义显示 -')}${th('p95', '回执时延 P50 / P95', '提交 → 回执')}
    ${th('uncls', '未分类占比', '失败中未映射的占比；> 5% 标黄')}<th>TOP 失败分类</th>
    ${isMail ? th('check', '检测不通过率（邮件）', '当日发出任务中带强提醒 / 提醒的占比（见 6.9）') : ''}
    ${th('mismatch', '归属不一致', '任务 site id 与非共用 Sender 不一致的消息数')}<th>操作</th></tr></thead>`;
  const body = rows.map(({ k, a }) => `<tr${dim === 'cat' && k === 'OTP' ? ' class="v2-row-hi"' : ''}>
    <td><b>${esc(cdValLabel(dim, k))}</b>${dim === 'cat' && k === 'OTP' ? ' <span class="tag tag-primary">置顶</span>' : ''}</td>
    <td class="v2-num">${fmtN(a.sent)}</td><td class="v2-num">${cdBillTxt(ch, a.billable, a.sent)}</td>
    <td class="v2-num">${ch === 'SMS' ? `${cdK(a.sent - a.retry)} / ${cdK(a.retry)}` : '-'}</td>
    <td class="v2-num${a.acc != null && a.acc < CD_ACC_CARD_MIN ? ' text-danger' : ''}">${cdP(a.acc)}</td>
    <td class="v2-num${a.del != null && a.del < cdDelThreshold(ch) ? ' text-danger' : ''}"><b>${cdP(a.del)}</b></td>
    <td class="v2-num">${noRc ? '-' : cdP(a.rec)}</td>
    <td class="v2-num">${noRc || a.p50 == null ? '-' : `${a.p50.toFixed(1)} / ${a.p95.toFixed(1)} 分`}</td>
    <td class="v2-num">${a.uncls > 5 ? `<span class="cd-warn">${cdP(a.uncls)}</span>` : cdP(a.uncls)}</td>
    <td class="cd-top" title="${esc(cdTopFails(a))}">${esc(cdTopFails(a))}</td>
    ${isMail ? `<td class="v2-num">${cdP(a.check, 0)}</td>` : ''}
    <td class="v2-num">${a.mismatch ? `<span class="text-warning">${fmtN(a.mismatch)}</span>` : 0}</td>
    <td><button class="link-btn" data-drill="${esc(k)}">下钻</button></td></tr>`).join('');
  const t = document.getElementById('cdTable');
  t.innerHTML = head + `<tbody>${body || `<tr><td colspan="13" class="v2-muted" style="text-align:center;padding:32px">无数据</td></tr>`}</tbody>`;
  document.getElementById('cdTableHint').textContent = `${rows.length} 行 · 点列头切换升 / 降序${dim === 'cat' ? ' · OTP 行始终置顶' : ''}`;
  t.querySelectorAll('[data-sort]').forEach(h => h.addEventListener('click', e => {
    if (e.target.closest('.tip-icon')) return;
    const key = h.dataset.sort; CD.sort = { key, dir: CD.sort.key === key ? -CD.sort.dir : -1 }; cdRenderTable(); refreshIcons();
  }));
  t.querySelectorAll('[data-drill]').forEach(b => b.addEventListener('click', () => cdOpenDrill(dim, b.dataset.drill, null)));
}

/* ================= 下钻：失败原因分析（6.3.3 组件） ================= */
const CD_DRILL_DIMS = { cat: '统一分类', stage: '阶段', code: '原始码', vendor: '供应商', account: '账号', sender: '发送方标识', site: '产品线', msgcat: '消息类别' };
function cdDrillAtoms(dim, value) {
  const facts = CD.facts.filter(f => dim == null || f.u[dim] === value);
  const byUnit = {};
  facts.forEach(f => { const c = byUnit[f.u.id] || (byUnit[f.u.id] = { u: f.u, cats: {} }); Object.entries(f.cats).forEach(([k, v]) => { c.cats[k] = (c.cats[k] || 0) + v; }); });
  return Object.values(byUnit).flatMap(({ u, cats }) => faExpand({ vendor: u.vendor, account: u.account, sender: u.sender, channel: u.channel, site: u.site, msgcat: u.cat, task: '-', prefix: '-' }, cats));
}
function cdOpenDrill(dim, value, cat) {
  const defCol = dim === 'vendor' ? 'account' : dim === 'account' ? 'sender' : 'vendor';
  CD.drill = { dim, value, cat, rowDim: 'cat', colDim: defCol };
  const scope = dim ? `${cdDimLabel(dim)} = ${cdValLabel(dim, value)}` : `${cdChannel()} 全部`;
  document.getElementById('cdDrillTitle').textContent = `失败原因分析 · ${scope} · ${cdRangeText()}`;
  const q = new URLSearchParams({ channel: cdChannel(), range: document.getElementById('cdRange').value === 'custom' ? '30d' : document.getElementById('cdRange').value });
  document.getElementById('cdDrillToTa').href = `task-analysis.html?${q}`;
  cdRenderDrill(); openDrawer('cdDrill');
}
function cdRenderDrill() {
  const d = CD.drill; const all = cdDrillAtoms(d.dim, d.value);
  const atoms = d.cat ? all.filter(a => a.cat === d.cat) : all;
  const a = cdAgg(CD.facts.filter(f => d.dim == null || f.u[d.dim] === d.value));
  const sum = st => all.filter(x => x.stage === st).reduce((s, x) => s + x.count, 0);
  const opts = sel => Object.entries(CD_DRILL_DIMS).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${k === 'sender' ? CD_SENDER_LABEL[cdChannel()] : l}</option>`).join('');
  const body = document.getElementById('cdDrillBody');
  body.innerHTML = `<div class="v2-stat-strip">
      <div class="s"><b>${fmtN(a.sent)}</b><span>发送量</span></div><div class="s"><b>${cdP(a.del)}</b><span>送达率</span></div>
      <div class="s"><b>${fmtN(a.failTotal)}</b><span>失败合计</span></div><div class="s"><b>${fmtN(sum('提交失败'))}</b><span>提交失败</span></div>
      <div class="s"><b>${fmtN(sum('未送达'))}</b><span>未送达</span></div><div class="s"><b>${fmtN(a.noReceipt)}</b><span>无回执 / 待回执</span></div>
      <div class="s"><b>${cdP(a.uncls)}</b><span>未分类占比</span></div></div>
    <div class="v2-flex-between" style="margin:14px 0 8px"><div class="v2-flex">${d.cat ? `<span class="fa-filter-chip">统一分类：${esc(d.cat)}<button type="button" id="cdDrillCatX" title="清除">×</button></span>` : '<span class="v2-hint">失败 = 提交失败 + 未送达；发送前拦截不归属供应商，完整漏斗见任务分析</span>'}</div>
      <div class="v2-flex"><span class="filter-label">维度</span><select class="select select-sm" id="cdDrillRow">${opts(d.rowDim)}</select><span class="v2-muted">×</span><select class="select select-sm" id="cdDrillCol">${opts(d.colDim)}</select></div></div>
    <div id="cdDrillTable"></div>`;
  const ch = cdChannel();
  faRenderTable(document.getElementById('cdDrillTable'), atoms, {
    rowDim: d.rowDim, colDim: d.colDim, dimLabel: k => (k === 'sender' ? CD_SENDER_LABEL[ch] : CD_DRILL_DIMS[k]),
    label: (k, v) => (k === 'site' ? plName(v) : v), emptyText: '无失败',
    drill: f => `send-records.html?${new URLSearchParams({ channel: ch, range: cdRangeText(), ...(d.dim ? { [d.dim]: d.value } : {}), ...(d.cat ? { cat: d.cat } : {}), ...f })}`,
  });
  const x = document.getElementById('cdDrillCatX'); if (x) x.addEventListener('click', () => { d.cat = null; cdRenderDrill(); });
  ['cdDrillRow', 'cdDrillCol'].forEach(id => document.getElementById(id).addEventListener('change', () => {
    const r = document.getElementById('cdDrillRow').value; const c = document.getElementById('cdDrillCol').value;
    if (r === c) { showToast('行列维度不可相同'); cdRenderDrill(); return; }
    d.rowDim = r; d.colDim = c; cdRenderDrill();
  }));
  refreshIcons();
}

/* ================= 告警规则（6.4.3） ================= */
const CD_METRICS = {
  失败率: { units: ['%'], op: '>', tip: '失败率 =（提交失败 + 未送达）÷（已提交 + 提交失败）' },
  送达率: { units: ['%'], op: '<', tip: '已送达 ÷ 已提交' },
  '回执时延 P95': { units: ['分钟'], op: '>', tip: '提交 → 回执' },
  '队列积压（待发条数）': { units: ['条', '小时清空'], op: '>', tip: '来自调度器；可按待发条数或按当前 TPS 预计清空时长判定' },
  '排队时长 P95': { units: ['秒'], op: '>', tip: '来自调度器' },
  无回执占比: { units: ['%'], op: '>', tip: '无回执 ÷ 已提交' },
};
const CD_WINDOWS = ['近 5 分钟', '近 15 分钟', '近 1 小时', '当日'];
const CD_RECIPIENTS = ['值班群', '通道运维群', '触达产品群', 'marvin@', 'ken@', 'lily@', 'jay@'];
let CD_RULES = [
  { id: 1, name: 'SMS 失败率', target: { channel: 'SMS', vendors: [], accounts: [], cats: [] }, metric: '失败率', op: '>', value: 5, unit: '%', window: '近 1 小时', minSample: 200, recipients: ['值班群'], repeat: 30, enabled: true },
  { id: 2, name: '邮件送达率', target: { channel: '邮件', vendors: [], accounts: [], cats: [] }, metric: '送达率', op: '<', value: 90, unit: '%', window: '当日', minSample: 200, recipients: ['值班群'], repeat: 30, enabled: true },
  { id: 3, name: '回执 P95', target: { channel: 'SMS', vendors: [], accounts: [], cats: [] }, metric: '回执时延 P95', op: '>', value: 30, unit: '分钟', window: '近 1 小时', minSample: 200, recipients: ['值班群'], repeat: 30, enabled: true },
  { id: 4, name: '队列积压', target: { channel: 'SMS', vendors: [], accounts: [], cats: [] }, metric: '队列积压（待发条数）', op: '>', value: 2, unit: '小时清空', window: '实时', minSample: 1, recipients: ['值班群', '通道运维群'], repeat: 30, enabled: true },
  { id: 5, name: 'OTP 排队', target: { channel: '', vendors: [], accounts: [], cats: ['OTP'] }, metric: '排队时长 P95', op: '>', value: 30, unit: '秒', window: '近 5 分钟', minSample: 200, recipients: ['值班群'], repeat: 30, enabled: true },
];
function cdTargetText(t) {
  const p = [];
  if (t.channel) p.push(`通道=${t.channel}${!t.vendors.length && !t.accounts.length ? ' 全部供应商' : ''}`);
  if (t.vendors.length) p.push(`供应商=${t.vendors.join('、')}`);
  if (t.accounts.length) p.push(`账号=${t.accounts.join('、')}`);
  if (t.cats.length) p.push(`消息类别=${t.cats.join('、')}`);
  return p.join(' · ') || '-';
}
function cdCondText(r) { return `${r.op} ${r.value}${r.unit === '%' ? '%' : ' ' + r.unit}`; }
function cdRenderRules() {
  const t = document.getElementById('cdRuleTable');
  t.innerHTML = `<thead><tr><th>规则名称</th><th>监控对象</th><th>指标</th><th>条件</th><th>窗口</th><th class="v2-num">最小样本</th><th>接收人</th><th class="v2-num">补发间隔</th><th>状态</th><th>操作</th></tr></thead><tbody>
    ${CD_RULES.map(r => `<tr${r.enabled ? '' : ' class="cd-off"'}><td><b>${esc(r.name)}</b></td><td>${esc(cdTargetText(r.target))}</td><td>${esc(r.metric)}</td><td>${esc(cdCondText(r))}</td>
      <td>${esc(r.window)}</td><td class="v2-num">${fmtN(r.minSample)}</td><td>${esc(r.recipients.join('、'))}</td><td class="v2-num">${r.repeat} 分钟</td>
      <td><label class="v2-switch"><input type="checkbox" data-toggle="${r.id}" ${r.enabled ? 'checked' : ''}><span></span></label> <span class="cd-st">${r.enabled ? '启用' : '停用'}</span></td>
      <td><button class="link-btn" data-edit="${r.id}">编辑</button></td></tr>`).join('')}</tbody>`;
  t.querySelectorAll('[data-toggle]').forEach(cb => cb.addEventListener('change', () => {
    const r = CD_RULES.find(x => x.id === +cb.dataset.toggle); r.enabled = cb.checked;
    showToast(`规则「${r.name}」已${r.enabled ? '启用' : '停用'}`); cdRenderRules();
  }));
  t.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => cdRuleForm(CD_RULES.find(x => x.id === +b.dataset.edit))));
}
function cdChecks(name, opts, sel) { return opts.map(o => `<label class="cd-chk"><input type="checkbox" name="${name}" value="${esc(o.v)}" ${sel.includes(o.v) ? 'checked' : ''}>${esc(o.l)}</label>`).join(''); }
function cdRuleForm(rule) {
  const r = rule ? JSON.parse(JSON.stringify(rule)) : { name: '', target: { channel: 'SMS', vendors: [], accounts: [], cats: [] }, metric: '失败率', op: '>', value: '', unit: '%', window: '近 1 小时', minSample: 200, recipients: [], repeat: 30, enabled: true };
  const root = v2Modal({ title: rule ? '编辑告警规则' : '新建告警规则', okText: '保存', width: 680,
    body: `<div class="v2-form cd-rule-form">
      <label class="req">规则名称</label><input class="input" id="rfName" maxlength="50" placeholder="请输入" value="${esc(r.name)}">
      <label class="req">监控对象</label><div class="cd-target">
        <div class="v2-flex"><span class="cd-mini">通道</span><select class="select select-sm" id="rfChannel"><option value="">不限</option>${V2_CHANNELS.map(c => `<option ${c === r.target.channel ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="v2-flex cd-wrap"><span class="cd-mini">供应商</span><span id="rfVendors"></span></div>
        <div class="v2-flex cd-wrap"><span class="cd-mini">账号</span><span id="rfAccounts"></span></div>
        <div class="v2-flex cd-wrap"><span class="cd-mini">消息类别</span><span id="rfCats">${cdChecks('rfCat', V2_MSG_CATEGORIES.map(c => ({ v: c, l: c })), r.target.cats)}</span></div>
      </div>
      <div class="v2-hint">选择通道 / 供应商 / 账号 / 消息类别；对象内每个最小单元（账号）分别判定</div>
      <label class="req">指标</label><div class="v2-flex"><select class="select" id="rfMetric" style="width:220px">${Object.keys(CD_METRICS).map(m => `<option ${m === r.metric ? 'selected' : ''}>${m}</option>`).join('')}</select><span class="v2-hint" id="rfMetricTip"></span></div>
      <label class="req">条件</label><div class="v2-flex"><select class="select" id="rfOp" style="width:70px"><option ${r.op === '>' ? 'selected' : ''}>&gt;</option><option ${r.op === '<' ? 'selected' : ''}>&lt;</option></select>
        <input class="input" id="rfVal" type="number" min="0" step="any" style="width:120px" value="${esc(r.value)}"><span id="rfUnitBox"></span></div>
      <label class="req">窗口</label><select class="select" id="rfWin" style="width:160px"></select>
      <label class="req">最小样本</label><div class="v2-flex"><input class="input" id="rfMin" type="number" min="1" style="width:120px" value="${r.minSample}"><span class="v2-hint">窗口内消息数低于此值不判定</span></div>
      <label class="req">接收人</label><div class="cd-wrap" id="rfRecv">${cdChecks('rfRecv', CD_RECIPIENTS.map(x => ({ v: x, l: x })), r.recipients)}</div>
      <label class="req">补发间隔</label><div class="v2-flex"><input class="input" id="rfRepeat" type="number" min="5" max="240" style="width:120px" value="${r.repeat}"><span class="v2-hint">分钟，5–240；未恢复期间补发</span></div>
      <label class="req">状态</label><div class="v2-flex"><label class="v2-switch"><input type="checkbox" id="rfOn" ${r.enabled ? 'checked' : ''}><span></span></label><span class="v2-hint">启用</span></div>
    </div>`,
    onOk: rt => cdSaveRule(rt, rule) });
  const drawVendors = () => {
    const ch = root.querySelector('#rfChannel').value; const accs = CD_ACCOUNTS.filter(a => !ch || a.channel === ch);
    const keepV = [...root.querySelectorAll('[name="rfVendor"]:checked')].map(x => x.value).concat(r.target.vendors);
    root.querySelector('#rfVendors').innerHTML = cdChecks('rfVendor', [...new Set(accs.map(a => a.vendor))].map(v => ({ v, l: v })), keepV) || '<span class="v2-hint">-</span>';
    r.target.vendors = [];
    drawAccounts();
  };
  const drawAccounts = () => {
    const ch = root.querySelector('#rfChannel').value; const vs = [...root.querySelectorAll('[name="rfVendor"]:checked')].map(x => x.value);
    const keepA = [...root.querySelectorAll('[name="rfAccount"]:checked')].map(x => x.value).concat(r.target.accounts);
    root.querySelector('#rfAccounts').innerHTML = cdChecks('rfAccount', CD_ACCOUNTS.filter(a => (!ch || a.channel === ch) && (!vs.length || vs.includes(a.vendor))).map(a => ({ v: a.id, l: `${a.vendor} → ${a.id}` })), keepA) || '<span class="v2-hint">-</span>';
    r.target.accounts = [];
  };
  const drawMetric = () => {
    const m = root.querySelector('#rfMetric').value; const md = CD_METRICS[m];
    root.querySelector('#rfMetricTip').textContent = md.tip;
    root.querySelector('#rfUnitBox').innerHTML = md.units.length > 1 ? `<select class="select select-sm" id="rfUnit">${md.units.map(u => `<option ${u === r.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>` : `<span class="cd-mini">${md.units[0]}</span>`;
    const wins = m.startsWith('队列积压') ? ['实时'].concat(CD_WINDOWS) : CD_WINDOWS;
    root.querySelector('#rfWin').innerHTML = wins.map(w => `<option ${w === r.window ? 'selected' : ''}>${w}</option>`).join('');
  };
  root.querySelector('#rfChannel').addEventListener('change', drawVendors);
  root.querySelector('#rfVendors').addEventListener('change', drawAccounts);
  root.querySelector('#rfMetric').addEventListener('change', () => { const md = CD_METRICS[root.querySelector('#rfMetric').value]; root.querySelector('#rfOp').value = md.op; r.unit = md.units[0]; drawMetric(); });
  drawVendors(); drawMetric();
}
function cdSaveRule(root, rule) {
  const v = id => root.querySelector(id).value.trim();
  const checked = n => [...root.querySelectorAll(`[name="${n}"]:checked`)].map(x => x.value);
  const name = v('#rfName'); const m = v('#rfMetric');
  if (!name) { showToast('请输入规则名称'); return false; }
  if (name.length > 50) { showToast('规则名称不超过 50 字'); return false; }
  if (CD_RULES.some(x => x.name === name && (!rule || x.id !== rule.id))) { showToast('规则名称已存在，请换一个'); return false; }
  const target = { channel: v('#rfChannel'), vendors: checked('rfVendor'), accounts: checked('rfAccount'), cats: checked('rfCat') };
  if (!target.channel && !target.vendors.length && !target.accounts.length && !target.cats.length) { showToast('请选择监控对象'); return false; }
  const value = parseFloat(v('#rfVal')); if (Number.isNaN(value) || value < 0) { showToast('请输入条件数值'); return false; }
  const minSample = parseInt(v('#rfMin'), 10); if (!(minSample >= 1)) { showToast('最小样本需 ≥ 1'); return false; }
  const recipients = checked('rfRecv'); if (!recipients.length) { showToast('请至少选择 1 个接收人'); return false; }
  const repeat = parseInt(v('#rfRepeat'), 10); if (!(repeat >= 5 && repeat <= 240)) { showToast('补发间隔需在 5–240 分钟'); return false; }
  const unitSel = root.querySelector('#rfUnit');
  const data = { name, target, metric: m, op: v('#rfOp'), value, unit: unitSel ? unitSel.value : CD_METRICS[m].units[0], window: v('#rfWin'), minSample, recipients, repeat, enabled: root.querySelector('#rfOn').checked };
  if (rule) Object.assign(rule, data); else CD_RULES.push({ id: Math.max(...CD_RULES.map(x => x.id)) + 1, ...data });
  cdRenderRules(); cdRenderAlertRuleOptions(); showToast(rule ? '规则已保存' : '规则已创建');
  return true;
}

/* ================= 告警记录 ================= */
let CD_ALERTS = [
  { id: 1, time: '2026-07-13 14:05', rule: 'SMS 失败率', target: 'NXLink · AGG-01', q: { channel: 'SMS', vendor: 'NXLink', account: 'AGG-01' }, value: '8.3%', threshold: '5%', status: '处理中', handler: 'ken@', note: '供应商侧故障，已切部分流量', reminds: 4 },
  { id: 2, time: '2026-07-13 11:20', rule: 'OTP 排队', target: 'OTP · OTP-BP', q: { channel: 'SMS', account: 'OTP-BP' }, value: '42 秒', threshold: '30 秒', status: '已恢复', handler: '系统', note: '-', reminds: 0 },
  { id: 3, time: '2026-07-13 09:40', rule: '回执 P95', target: 'Smart · BP-02', q: { channel: 'SMS', vendor: 'Smart', account: 'BP-02' }, value: '34.6 分钟', threshold: '30 分钟', status: '未处理', handler: '', note: '', reminds: 2 },
  { id: 4, time: '2026-07-12 20:15', rule: '队列积压', target: 'Globe · BP-01', q: { channel: 'SMS', vendor: 'Globe', account: 'BP-01' }, value: '2.6 小时清空', threshold: '2 小时清空', status: '已恢复', handler: 'marvin@', note: '晚高峰营销集中，已错峰', reminds: 1 },
  { id: 5, time: '2026-07-12 18:00', rule: '邮件送达率', target: 'OneSignal · BP-mail', q: { channel: '邮件', vendor: 'OneSignal', account: 'BP-mail' }, value: '88.2%', threshold: '90%', status: '已恢复', handler: 'lily@', note: '退信率升高，已清洗名单', reminds: 0 },
  { id: 6, time: '2026-07-08 16:30', rule: 'SMS 失败率', target: 'Globe · BP-01', q: { channel: 'SMS', vendor: 'Globe', account: 'BP-01' }, value: '5.6%', threshold: '5%', status: '已恢复', handler: 'ken@', note: '运营商短时拦截', reminds: 0 },
  { id: 7, time: '2026-06-25 10:10', rule: 'SMS 失败率', target: 'DLink · GP-01', q: { channel: 'SMS', vendor: 'DLink', account: 'GP-01' }, value: '6.1%', threshold: '5%', status: '已恢复', handler: 'jay@', note: '余额不足，已充值', reminds: 1 },
];
const CD_ALERT_TAG = { 未处理: 'tag-danger', 处理中: 'tag-orange', 已恢复: 'tag-success' };
function cdRenderAlertRuleOptions() {
  const sel = document.getElementById('alRule'); const cur = sel.value;
  sel.innerHTML = `<option value="">全部</option>` + [...new Set(CD_RULES.map(r => r.name).concat(CD_ALERTS.map(a => a.rule)))].map(n => `<option>${esc(n)}</option>`).join('');
  sel.value = cur;
}
function cdRenderAlerts() {
  const range = document.getElementById('alRange').value; const rule = document.getElementById('alRule').value; const st = document.getElementById('alStatus').value;
  const from = { today: CD_TODAY, '7d': cdAddDays(CD_TODAY, -6), '30d': cdAddDays(CD_TODAY, -29) }[range];
  const list = CD_ALERTS.filter(a => a.time.slice(0, 10) >= from && (!rule || a.rule === rule) && (!st || a.status === st));
  const t = document.getElementById('cdAlertTable');
  t.innerHTML = `<thead><tr><th>触发时间</th><th>规则 / 对象</th><th class="v2-num">当前值 / 阈值</th><th>状态</th><th>处理人 / 备注</th><th class="v2-num">已补发</th><th>操作</th></tr></thead><tbody>
    ${list.map(a => `<tr${a.status === '未处理' ? ' class="v2-row-danger"' : ''}><td>${a.time}</td>
      <td><a href="#daily" class="fa-cell" data-goto="${a.id}" title="跳转通道日报（带条件）">${esc(a.rule)} / ${esc(a.target)}</a></td>
      <td class="v2-num"><b class="${a.status === '已恢复' ? '' : 'text-danger'}">${esc(a.value)}</b> / ${esc(a.threshold)}</td>
      <td><span class="tag ${CD_ALERT_TAG[a.status]}">${a.status}</span></td>
      <td>${a.handler ? esc(a.handler) : '<span class="v2-muted">-</span>'}${a.note && a.note !== '-' ? ` <span class="v2-muted">/ ${esc(a.note)}</span>` : ''}</td>
      <td class="v2-num">${a.reminds} 次</td>
      <td>${a.status === '未处理' ? `<button class="link-btn" data-handle="${a.id}">标记处理中</button>` : a.status === '处理中' ? `<button class="link-btn" data-handle="${a.id}">编辑备注</button>` : ''}
        <button class="link-btn" data-lark="${a.id}">Lark 消息</button></td></tr>`).join('') || '<tr><td colspan="7" class="v2-muted" style="text-align:center;padding:32px">暂无告警</td></tr>'}</tbody>`;
  t.querySelectorAll('[data-handle]').forEach(b => b.addEventListener('click', () => cdHandleAlert(CD_ALERTS.find(x => x.id === +b.dataset.handle))));
  t.querySelectorAll('[data-lark]').forEach(b => b.addEventListener('click', () => cdLarkPreview(CD_ALERTS.find(x => x.id === +b.dataset.lark))));
  t.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); cdGotoDaily(CD_ALERTS.find(x => x.id === +b.dataset.goto)); }));
}
function cdHandleAlert(a) {
  v2Modal({ title: a.status === '未处理' ? '标记处理中' : '编辑备注', okText: '保存', width: 520,
    body: `<div class="v2-form"><label>告警</label><div>${esc(a.rule)} / ${esc(a.target)}（${esc(a.value)} / ${esc(a.threshold)}）</div>
      <label>处理人</label><div>marvin@（当前用户）</div>
      <label class="req">备注</label><textarea class="textarea" id="cdNote" maxlength="200" placeholder="如：供应商侧故障，已联系">${esc(a.note === '-' ? '' : a.note)}</textarea></div>
      <div class="v2-hint">「已恢复」由系统在指标回到阈值内持续一个窗口后自动置</div>`,
    onOk: root => {
      const note = root.querySelector('#cdNote').value.trim(); if (!note) { showToast('请填写备注'); return false; }
      a.status = '处理中'; a.handler = 'marvin@'; a.note = note; cdRenderAlerts(); showToast('已标记处理中'); return true;
    } });
}
function cdLarkPreview(a) {
  v2Modal({ title: 'Lark 告警消息', okText: '知道了', hideCancel: true, width: 460,
    body: `<div class="cd-lark"><div class="cd-lark-head">【触达告警】${esc(a.rule)}</div>
      <div class="cd-lark-body"><div>对象：${esc(a.target)}</div><div>当前值：<b class="text-danger">${esc(a.value)}</b>　阈值：${esc(a.threshold)}</div>
      <div>触发时间：${a.time}</div><div>未恢复期间按规则补发间隔提醒</div>
      <a class="fa-cell" href="#daily">查看通道日报 →</a></div></div>`,
  });
}
function cdGotoDaily(a) {
  cdShowTab('daily');
  document.getElementById('cdChannel').value = a.q.channel; cdRefreshCascade();
  CD.ms.vendor.set(a.q.vendor ? [a.q.vendor] : []); cdRefreshCascade();
  CD.ms.account.set(a.q.account ? [a.q.account] : []);
  document.getElementById('cdRange').value = a.time.slice(0, 10) === CD_TODAY ? 'today' : '7d';
  document.getElementById('cdDates').hidden = true;
  document.getElementById('cdGran').value = a.time.slice(0, 10) === CD_TODAY ? 'hour' : 'day';
  document.getElementById('cdDim').value = 'account';
  cdQuery(); showToast(`已按告警对象筛选：${a.target}`);
}

/* ================= Tabs（hash：#daily / #alerts / #alert-rules） ================= */
/* 告警记录 / 告警规则移到后续（附录 C.2），本期只有日报 */
function cdCanTab(tab) { return tab === 'daily'; }
function cdShowTab(tab, fromHash) {
  if (!cdCanTab(tab)) {
    tab = 'daily';
  }
  CD.tab = tab;
  document.querySelectorAll('#cdTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('[data-cdpane]').forEach(p => { p.hidden = p.dataset.cdpane !== tab; });
  if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  if (tab === 'alerts') cdRenderAlerts();
  if (tab === 'alert-rules') cdRenderRules();
  refreshIcons();
}
function cdTabFromHash() { const h = location.hash.replace('#', ''); return ['daily', 'alerts', 'alert-rules'].includes(h) ? h : 'daily'; }

/* ================= 初始化 ================= */
function cdReset() {
  document.getElementById('cdRange').value = CD_DEFAULT.range; document.getElementById('cdDates').hidden = true;
  document.getElementById('cdGran').value = CD_DEFAULT.gran; document.getElementById('cdChannel').value = CD_DEFAULT.channel;
  Object.values(CD.ms).forEach(m => m.set([])); cdRefreshCascade(); document.getElementById('cdDim').value = CD_DEFAULT.dim;
  CD.sort = { key: 'sent', dir: -1 }; cdQuery();
}
function cdInit() {
  if (!hasPerm('admin')) document.getElementById('cdRulesTab').remove();
  document.getElementById('cdChannel').innerHTML = V2_CHANNELS.map(c => `<option ${c === CD_DEFAULT.channel ? 'selected' : ''}>${c}</option>`).join('');
  CD.ms.vendor = faMultiSelect(document.getElementById('cdVendor'), { onChange: () => cdRefreshCascade() });
  CD.ms.account = faMultiSelect(document.getElementById('cdAccount'));
  CD.ms.bl = faMultiSelect(document.getElementById('cdBl'), { options: V2_BUSINESS_LINES.flatMap(b => [{ v: 'bl:' + b.code, l: `${b.code}（全部产品线）`, grp: `业务线 ${b.code}` }]
    .concat(V2_PRODUCT_LINES.filter(p => p.bl === b.code && p.status === '启用').map(p => ({ v: 'site:' + p.siteId, l: p.name, grp: `业务线 ${b.code}`, sub: true })))) });
  CD.ms.cat = faMultiSelect(document.getElementById('cdCat'), { options: V2_MSG_CATEGORIES.map(c => ({ v: c, l: c })) });
  cdRefreshCascade();
  document.getElementById('cdChannel').addEventListener('change', () => { CD.ms.vendor.set([]); CD.ms.account.set([]); cdRefreshCascade(); cdQuery(); });
  document.getElementById('cdRange').addEventListener('change', e => { document.getElementById('cdDates').hidden = e.target.value !== 'custom'; cdGranGuard(); if (e.target.value !== 'custom') cdQuery(); });
  ['cdFrom', 'cdTo'].forEach(id => document.getElementById(id).addEventListener('change', () => { cdGranGuard(); cdQuery(); }));
  document.getElementById('cdGran').addEventListener('change', () => cdQuery());
  document.getElementById('cdDim').addEventListener('change', () => cdQuery());
  document.getElementById('cdQuery').addEventListener('click', cdQuery);
  document.getElementById('cdReset').addEventListener('click', cdReset);
  document.getElementById('cdExport').addEventListener('click', () => showToast('已导出（原型）'));
  document.getElementById('cdDrillExport').addEventListener('click', () => showToast('已导出（原型）'));
  document.querySelectorAll('#cdTrendMetric .seg-btn').forEach(b => b.addEventListener('click', () => {
    CD.trendMetric = b.dataset.m; document.querySelectorAll('#cdTrendMetric .seg-btn').forEach(x => x.classList.toggle('active', x === b)); cdRenderTrend();
  }));
  document.querySelectorAll('#cdTabs .tab').forEach(t => t.addEventListener('click', () => cdShowTab(t.dataset.tab)));
  window.addEventListener('hashchange', () => { if (cdTabFromHash() !== CD.tab) cdShowTab(cdTabFromHash(), true); });
  document.getElementById('alQuery').addEventListener('click', cdRenderAlerts);
  document.getElementById('alReset').addEventListener('click', () => { document.getElementById('alRange').value = '7d'; document.getElementById('alRule').value = ''; document.getElementById('alStatus').value = ''; cdRenderAlerts(); });
  document.getElementById('cdNewRule').addEventListener('click', () => cdRuleForm(null));
  cdRenderAlertRuleOptions();
  cdQuery();
  cdShowTab(cdTabFromHash(), true);
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-stats', 'stats-channel'); renderTopbar();
  cdInit();
  refreshIcons(); bindDrawerClose();
});

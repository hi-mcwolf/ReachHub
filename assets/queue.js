/* 队列管理：通道态势 / 队列详情 / 调度审计日志 / 调度参数（PRD 6.5、6.11 节点 9–12、流程 2）
 * 依赖 common.js + v2-data.js；任务、账号复用 V2_TASKS / V2_ACCOUNTS；页面私有变量以 Q / QUEUE_ 开头 */

/* ---------- 页面私有 mock（演示数据） ---------- */
const QUEUE_TODAY = '2026-07-13';
const QUEUE_ME = 'marvin@';
const QUEUE_START_CLOCK = 16 * 3600 + 39 * 60; // 演示时钟 16:39:00
/* 近 1 分钟吞吐基准 / 有效吞吐（min(TPS, 近 15 分钟提交速率)）/ OTP P95；供应商账号无日上限 */
const QUEUE_LIVE = {
  'BP-01':  { thr: 49, eff: 49 },
  'BP-02':  { thr: 12, eff: 12 },
  'BP-04':  { thr: 0,  eff: 40 },
  'GP-01':  { thr: 38, eff: 40 },
  'OTP-BP': { thr: 3,  eff: 50, p95: '0.8s' },
  'BP-mail': { thr: 210, eff: 210 },
  'BP-push': { thr: 0, eff: 0 },
  'BP-im':  { thr: 0, eff: 20 },
};
/* P1 消息有效期：最晚发出时间（任务表单字段，6.5.8） */
const QUEUE_EXPIRE = { T20260713007: '18:10' };
/* 演示视角的「队列管理」业务线范围（6.11.2：通道管理员按所辖业务线） */
const QUEUE_BL_SCOPE = { channel: ['BP'], admin: null };
const QUEUE_ACTIONS = ['排序', '插队', '取消插队', '切换供应商', '切回', '占位设置', '占位取消', '计划占位设置', '计划占位取消', '占位生效', '终止'];
const QUEUE_STATUS_TAG = {
  正常: 'tag-success', 拥堵: 'tag-danger', /* 队列状态只有两种（Marvin 2026-11-12）；停用账号不列出 */
};

/* ---------- 运行态 ---------- */
const QS = {
  now: QUEUE_START_CLOCK,
  thr: {},            // 当前显示吞吐（10 秒抖动）
  cfg: {},            // 账号调度参数 { sched, yieldPct, bufferSec }
  rr: {},             // 业务线份额轮转 { on, weights{siteId:n} }
  audit: [],
  filters: { channel: '', vendors: [], bl: '', statuses: [] },
  auditF: { range: '7d', from: '', to: '', queue: '', action: '', op: '', task: '' },
  rrBl: 'BP',
  dragId: null,
  timer: null,
};

function qHmToSec(hm) { const [h, m] = hm.split(':').map(Number); return h * 3600 + m * 60; }
function qClock(sec, withSec) {
  const s = Math.round(sec); const h = Math.floor(s / 3600) % 24; const m = Math.floor(s % 3600 / 60); const ss = s % 60;
  const p = n => String(n).padStart(2, '0');
  return withSec ? `${p(h)}:${p(m)}:${p(ss)}` : `${p(h)}:${p(m)}`;
}
function qDur(sec) {
  if (sec == null || !isFinite(sec)) return '-';
  const s = Math.round(sec); const h = Math.floor(s / 3600); const m = Math.floor(s % 3600 / 60); const r = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return r && m < 10 ? `${m}m ${r}s` : `${m}m`;
  return `${r}s`;
}
function qShortId(id) { return 'T…' + id.replace(/-SW$/, '').slice(-3); }
function qAcct(id) { return V2_ACCOUNTS.find(a => a.id === id); }
function qQueueName(a) { return `${a.channel} · ${a.vendor} · ${a.id}`; }
function qScope() { return QUEUE_BL_SCOPE[demoRole()] || null; }
function qInScope(bl) { const s = qScope(); return !s || s.includes(bl); }

/* ---------- 初始化 ---------- */
function qInit() {
  V2_ACCOUNTS.forEach(a => {
    QS.thr[a.id] = (QUEUE_LIVE[a.id] || {}).thr || 0;
    QS.cfg[a.id] = { sched: a.mode === 'tasklevel', yieldPct: 0, bufferSec: 5 };
  });
  V2_BUSINESS_LINES.forEach(b => {
    const weights = {};
    V2_PRODUCT_LINES.filter(p => p.bl === b.code && p.status === '启用').forEach(p => { weights[p.siteId] = 1; });
    QS.rr[b.code] = { on: false, weights };
  });
  V2_TASKS.forEach(t => {
    if (!['sending', 'queued', 'pending'].includes(t.status)) return;
    const ready = /^\d{1,2}:\d{2}$/.test(t.sched) ? qHmToSec(t.sched) : 0;
    t.qReady = ready; t.qSeq = ready; t.qPrio = '普通'; t.qHighAt = null;
    if (t.reserve) t.qReserve = true;
  });
  const at = (d, hms) => `${d} ${hms}`;
  QS.audit = [
    { time: at(QUEUE_TODAY, '15:20:11'), op: QUEUE_ME, action: '占位设置', queue: 'BP-01', task: 'T20260713009', change: '到点占位 关 → 开（计划 18:00）', affected: '', reason: '开赛前必须发出' },
    { time: at(QUEUE_TODAY, '10:02:45'), op: QUEUE_ME, action: '参数变更', queue: 'BP-01', task: '', change: '缓冲深度 4 秒 → 5 秒', affected: '', reason: '' },
    { time: at('2026-07-12', '10:00:00'), op: '系统（占位）', action: '占位生效', queue: 'GP-01', task: 'T20260712003', change: '位置 2 → 1；优先级 普通 → 高', affected: '', reason: '' },
    { time: at('2026-07-11', '19:42:10'), op: QUEUE_ME, action: '终止', queue: 'BP-01', task: 'T20260711008', change: '发送中 → 已终止', affected: '', reason: '活动提前结束' },
    { time: at('2026-07-10', '09:00:00'), op: 'jay@', action: '调度开关', queue: 'BP-02', task: '', change: '任务级调度 关 → 开', affected: '', reason: '二期切换' },
    { time: at('2026-06-20', '11:15:00'), op: 'jay@', action: '插队', queue: 'BP-01', task: 'T20260711008', change: '位置 3 → 1；优先级 普通 → 高', affected: 'T20260710004', reason: '' },
  ];
}

function qMode(a) {
  if (a.mode === 'otp') return 'otp';
  if (a.channel !== 'SMS') return 'legacy';
  return QS.cfg[a.id].sched ? 'tasklevel' : 'legacy';
}
function qQueueTasks(acctId) { return V2_TASKS.filter(t => t.account === acctId && (t.status === 'sending' || t.status === 'queued')); }
function qReservations(acctId) {
  return V2_TASKS.filter(t => t.account === acctId && t.qReserve && t.status === 'pending')
    .sort((a, b) => qHmToSec(a.sched) - qHmToSec(b.sched));
}
function qOrder(list) {
  return list.slice().sort((a, b) => {
    const ha = a.qPrio === '高' ? 0 : 1; const hb = b.qPrio === '高' ? 0 : 1;
    if (ha !== hb) return ha - hb;
    return ha === 0 ? a.qHighAt - b.qHighAt : a.qSeq - b.qSeq;
  });
}

/* ---------- 调度推算（6.5.2 分配规则的简化模拟；ETA 按剩余 ÷ 有效吞吐） ---------- */
function qAlloc(order, rem, acct) {
  const T = (QUEUE_LIVE[acct.id] || {}).eff || 0;
  const act = order.filter(t => rem[t.id] > 0.5);
  const highs = act.filter(t => t.qPrio === '高');
  const normals = act.filter(t => t.qPrio !== '高');
  const rate = {};
  let left = T;
  if (highs.length) {
    const r = normals.length ? QS.cfg[acct.id].yieldPct / 100 : 0;
    rate[highs[0].id] = T * (1 - r);
    left = T * r;
  }
  if (normals.length && left > 0) {
    const rr = QS.rr[acct.bl];
    if (rr && rr.on) {
      const heads = [];
      normals.forEach(t => { if (!heads.some(h => h.site === t.site)) heads.push(t); });
      const w = t => rr.weights[t.site] || 1;
      const sum = heads.reduce((s, t) => s + w(t), 0);
      heads.forEach(t => { rate[t.id] = left * w(t) / sum; });
    } else {
      rate[normals[0].id] = left;
    }
  }
  return rate;
}

function qSimulate(acct, list) {
  const order = qOrder(list);
  const rem = {}; const res = {};
  order.forEach(t => {
    rem[t.id] = t.remaining;
    res[t.id] = { start: t.status === 'sending' ? 'started' : null, finish: null, expired: 0 };
  });
  const firstRate = qAlloc(order, rem, acct);
  let t = QS.now;
  for (let guard = 0; guard < 200; guard++) {
    const rate = qAlloc(order, rem, acct);
    const live = Object.keys(rate).filter(id => rate[id] > 0);
    if (!live.length) break;
    live.forEach(id => { if (res[id].start == null) res[id].start = t; });
    let dt = Infinity;
    live.forEach(id => { dt = Math.min(dt, rem[id] / rate[id]); });
    order.forEach(x => {
      const ex = QUEUE_EXPIRE[x.id];
      if (ex && rem[x.id] > 0.5 && qHmToSec(ex) > t) dt = Math.min(dt, qHmToSec(ex) - t);
    });
    t += dt;
    live.forEach(id => { rem[id] = Math.max(0, rem[id] - rate[id] * dt); });
    order.forEach(x => {
      const ex = QUEUE_EXPIRE[x.id];
      if (ex && rem[x.id] > 0.5 && qHmToSec(ex) <= t + 1e-6) { res[x.id].expired = Math.round(rem[x.id]); rem[x.id] = 0; res[x.id].finish = t; return; }
      if (rem[x.id] <= 0.5 && res[x.id].finish == null) { rem[x.id] = 0; res[x.id].finish = t; }
    });
  }
  const T = (QUEUE_LIVE[acct.id] || {}).eff || 0;
  const share = {};
  order.forEach(x => { share[x.id] = T && firstRate[x.id] ? firstRate[x.id] / T : 0; });
  return { order, res, share, rate: firstRate };
}

/* 把「操作前 / 操作后」两次推算的预计完成做对比 */
function qCompare(acct, mutate) {
  const before = qSimulate(acct, qQueueTasks(acct.id));
  const clones = qQueueTasks(acct.id).map(t => ({ ...t }));
  const after = qSimulate(acct, mutate(clones) || clones);
  const rows = [];
  before.order.forEach(t => {
    const b = before.res[t.id]; const a = after.res[t.id];
    if (!a) return;
    const bf = b.finish == null ? null : Math.round(b.finish / 60); const af = a.finish == null ? null : Math.round(a.finish / 60);
    if (bf !== af || b.expired !== a.expired) rows.push({ t, b, a });
  });
  return { before, after, rows };
}

function qFinishText(r) { return r && r.finish != null ? qClock(r.finish) : '-'; }
function qAffectedTable(rows) {
  if (!rows.length) return '<div class="v2-hint">无其他任务的预计完成受影响。</div>';
  return `<table class="table stats-table q-modal-table"><thead><tr><th>任务</th><th>产品线</th><th>预计完成（前 → 后）</th></tr></thead><tbody>
    ${rows.map(({ t, b, a }) => {
      const later = (a.finish || 0) > (b.finish || 0);
      const exp = b.expired !== a.expired ? `<span class="q-expire">过期（未发出）${fmtN(b.expired)} → ${fmtN(a.expired)}</span>` : '';
      return `<tr><td>${qShortId(t.id)} ${esc(t.name)}</td><td>${plName(t.site)}</td>
        <td>${qFinishText(b)}<span class="q-arrow">→</span><span class="${later ? 'q-later' : 'q-earlier'}">${qFinishText(a)}</span>${exp}</td></tr>`;
    }).join('')}</tbody></table>`;
}
function qReasonField(required) {
  return `<div class="v2-form" style="grid-template-columns:90px minmax(0,1fr)">
    <label class="${required ? 'req' : ''}">原因 / 备注</label>
    <div><textarea class="textarea" id="qReason" maxlength="200" placeholder="${required ? '请填写终止原因（必填，≤ 200 字）' : '选填，≤ 200 字'}" style="min-height:64px"></textarea></div>
  </div>`;
}
function qReadReason(root) { const el = root.querySelector('#qReason'); return el ? el.value.trim() : ''; }

function qAddAudit(entry) {
  QS.audit.unshift({ time: `${QUEUE_TODAY} ${qClock(qNowExact(), true)}`, op: QUEUE_ME, affected: '', reason: '', task: '', ...entry });
}
function qLaterIds(rows) { return rows.filter(r => (r.a.finish || 0) > (r.b.finish || 0) || r.a.expired > r.b.expired).map(r => r.t.id).join(', '); }

/* 操作后：拿到额度的待发送（已入队）任务转为发送中 */
function qPromote(acct) {
  const sim = qSimulate(acct, qQueueTasks(acct.id));
  sim.order.forEach(t => { if (t.status === 'queued' && sim.rate[t.id] > 0) t.status = 'sending'; });
}

/* ---------- 10 秒自动刷新（演示：时钟前进、吞吐轻微抖动、发送中剩余递减） ---------- */
function qTick() {
  QS.now += 10;
  QS.tickAt = Date.now();
  V2_ACCOUNTS.forEach(a => {
    const base = (QUEUE_LIVE[a.id] || {}).thr || 0;
    if (!base) { QS.thr[a.id] = 0; return; }
    const j = Math.round((Math.random() * 3 - 2) * Math.max(1, base * 0.02));
    QS.thr[a.id] = Math.max(0, a.tps ? Math.min(a.tps, base + j) : base + j);
    const mode = qMode(a);
    const list = qQueueTasks(a.id);
    if (mode === 'tasklevel') {
      const sim = qSimulate(a, list);
      list.forEach(t => {
        const r = sim.rate[t.id] || 0;
        if (r > 0) { t.status = 'sending'; t.remaining = Math.max(0, Math.round(t.remaining - r * 10)); }
        if (t.remaining === 0) t.status = 'done';
      });
    } else if (mode === 'legacy' && list.length) {
      let budget = QS.thr[a.id] * 10;
      list.forEach(t => { const d = Math.min(t.remaining, budget); t.remaining -= d; budget -= d; if (!t.remaining) t.status = 'done'; });
    }
  });
  if (QS.dragId || document.querySelector('#v2ModalRoot .v2-modal')) { qRenderClock(); return; }
  qRoute(true);
}
function qNowExact() { return QS.now + Math.floor((Date.now() - QS.tickAt) / 1000); }
function qRenderClock() { document.getElementById('qClock').textContent = `数据时间 ${QUEUE_TODAY} ${qClock(QS.now, true)}`; }

/* ---------- 账号行指标 ---------- */
function qAcctStats(a) {
  const live = QUEUE_LIVE[a.id] || {};
  const mode = qMode(a);
  const list = qQueueTasks(a.id);
  const depth = mode === 'otp' ? 0 : list.reduce((s, t) => s + t.remaining, 0);
  const thr = QS.thr[a.id];
  const util = a.tps ? thr / a.tps : null;
  const eff = live.eff || 0;
  let drainSec = depth && eff ? depth / eff : null;
  let drain = drainSec == null ? '-' : qDur(drainSec);
  if (mode === 'legacy' && depth) { const r = thr || eff; drainSec = r ? depth / r : null; drain = drainSec == null ? '-' : '≈ ' + qDur(drainSec); }
  let status = '正常', reason = '';
  if (util != null && util > 0.9 && mode !== 'otp') { status = '拥堵'; reason = '利用率 > 90%'; }
  else if (drainSec != null && drainSec > 7200) { status = '拥堵'; reason = '预计清空 > 2 小时'; }
  const counts = {
    sending: list.filter(t => t.status === 'sending').length,
    queued: list.filter(t => t.status === 'queued').length,
    reserve: qReservations(a.id).length,
  };
  const buffer = mode === 'tasklevel' ? Math.round(Math.min(thr, a.tps || thr) * QS.cfg[a.id].bufferSec) : null;
  return { mode, depth, thr, util, drain, status, reason, counts, buffer, p95: live.p95 };
}
function qUtilHtml(u) {
  if (u == null) return '-';
  const cls = u > 0.9 ? 'hot' : u > 0.7 ? 'mid' : '';
  return `<span class="v2-util ${cls}"><span class="track"><i style="width:${Math.min(100, u * 100).toFixed(0)}%"></i></span>${Math.round(u * 100)}%</span>`;
}
function qStatusTag(s, reason) { return `<span class="tag ${QUEUE_STATUS_TAG[s] || 'tag-gray'}">${s}</span>${reason ? `<div class="v2-hint">${reason}</div>` : ''}`; }

/* ---------- 多选下拉 ---------- */
function qMultiHtml(key, label, options, selected) {
  const txt = selected.length ? selected.join('、') : '全部';
  return `<div class="filter-item"><span class="filter-label">${label}</span>
    <div class="q-ms" data-ms="${key}"><button class="select q-ms-btn" type="button" data-ms-btn>${esc(txt)}</button>
      <div class="q-ms-panel" hidden>${options.map(o => `<label><input type="checkbox" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div>
    </div></div>`;
}
function qBindMulti(root, onChange) {
  root.querySelectorAll('[data-ms]').forEach(ms => {
    const panel = ms.querySelector('.q-ms-panel');
    ms.querySelector('[data-ms-btn]').addEventListener('click', e => { e.stopPropagation(); panel.hidden = !panel.hidden; });
    panel.addEventListener('click', e => e.stopPropagation());
    panel.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => {
      const vals = [...panel.querySelectorAll('input:checked')].map(x => x.value);
      onChange(ms.dataset.ms, vals);
    }));
  });
}
document.addEventListener('click', () => document.querySelectorAll('.q-ms-panel').forEach(p => { p.hidden = true; }));

/* ================= 通道态势（6.5.3） ================= */
function qRenderBoard() {
  const host = document.getElementById('paneBoard');
  const f = QS.filters;
  const scopeBls = V2_BUSINESS_LINES.map(b => b.code).filter(qInScope);
  const vendorOpts = [...new Set(V2_ACCOUNTS.filter(a => !f.channel || a.channel === f.channel).map(a => a.vendor))];
  f.vendors = f.vendors.filter(v => vendorOpts.includes(v));
  const openMs = host.querySelector('.q-ms-panel:not([hidden])');
  const openKey = openMs ? openMs.closest('[data-ms]').dataset.ms : null;
  const rows = V2_ACCOUNTS.filter(a => qInScope(a.bl) && a.status !== '停用').map(a => ({ a, s: qAcctStats(a) })).filter(({ a, s }) =>
    (!f.channel || a.channel === f.channel) && (!f.vendors.length || f.vendors.includes(a.vendor)) &&
    (!f.bl || a.bl === f.bl) && (!f.statuses.length || f.statuses.includes(s.status)));
  const scope = qScope();
  host.innerHTML = `
    <section class="card filter-card">
      <div class="filter-row">
        <div class="filter-item"><span class="filter-label">通道</span>
          <select class="select" id="qfChannel"><option value="">全部</option>${V2_CHANNELS.map(c => `<option ${c === f.channel ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        ${qMultiHtml('vendors', '供应商', vendorOpts, f.vendors)}
        <div class="filter-item"><span class="filter-label">业务线</span>
          <select class="select" id="qfBl"><option value="">全部</option>${scopeBls.map(b => `<option ${b === f.bl ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        ${qMultiHtml('statuses', '状态', Object.keys(QUEUE_STATUS_TAG), f.statuses)}
        <div class="filter-actions"><button class="btn btn-outline" id="qfReset">重置</button></div>
      </div>
    </section>
    <section class="card table-card">
      <div class="table-card-head v2-flex-between">
        <h4 class="card-title">通道态势 ${scope ? `<span class="q-sub">权限范围：${scope.join('、')} 业务线</span>` : ''}</h4>
        <div class="q-toolbar" style="margin-bottom:12px"><span class="v2-live">自动刷新 10 秒</span>
          <button class="btn btn-outline btn-sm" id="qRefresh"><i data-lucide="refresh-cw"></i>手动刷新</button></div>
      </div>
      <div class="table-scroll">
        <table class="table stats-table q-table">
          <thead><tr><th>通道</th><th>供应商</th><th>账号</th><th>业务线</th><th>状态 ${tipIcon('只分正常 / 拥堵。拥堵 = 预计清空 > 2 小时，或利用率 > 90% 持续 15 分钟；原因显示在状态下方')}</th>
            <th class="v2-num">吞吐 / 上限（条/秒）${tipIcon('近 1 分钟实际提交速率 / 供应商档案 TPS 上限')}</th><th>利用率</th>
            <th class="v2-num">队列深度 ${tipIcon('该队列全部任务待发送表剩余之和（不含缓冲）')}</th>
            <th>预计清空 ${tipIcon('队列深度 ÷ 有效吞吐')}</th><th>发送中 / 待发送 / 占位</th><th>操作</th></tr></thead>
          <tbody>${rows.length ? rows.map(({ a, s }) => {
            const cls = s.status === '拥堵' ? 'v2-row-danger' : '';
            const cnt = s.mode === 'otp' ? `OTP 独立 · 排队 P95 ${s.p95}` : s.mode === 'legacy' ? '-' : `${s.counts.sending} / ${s.counts.queued} / ${s.counts.reserve}`;
            const opLabel = s.mode === 'tasklevel' ? '查看队列' : '查看';
            return `<tr class="${cls}"><td>${a.channel}</td><td>${a.vendor}</td>
              <td><a class="link-btn" href="#queue/${a.id}">${a.id}</a></td><td>${a.bl}</td><td>${qStatusTag(s.status, s.reason)}</td>
              <td class="v2-num">${fmtN(s.thr)} / ${a.tps ? fmtN(a.tps) : '-'}</td><td>${qUtilHtml(s.util)}</td>
              <td class="v2-num">${fmtN(s.depth)}</td><td>${s.drain}</td><td class="q-wrap">${cnt}</td>
              <td><a class="link-btn" href="#queue/${a.id}">${opLabel}</a></td></tr>`;
          }).join('') : '<tr><td colspan="11" class="q-empty">暂无符合条件的队列</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;
  host.querySelector('#qfChannel').addEventListener('change', e => { f.channel = e.target.value; qRenderBoard(); refreshIcons(); });
  host.querySelector('#qfBl').addEventListener('change', e => { f.bl = e.target.value; qRenderBoard(); refreshIcons(); });
  host.querySelector('#qfReset').addEventListener('click', () => { QS.filters = { channel: '', vendors: [], bl: '', statuses: [] }; qRenderBoard(); refreshIcons(); });
  host.querySelector('#qRefresh').addEventListener('click', () => { qRenderBoard(); qRenderClock(); refreshIcons(); showToast('已刷新'); });
  qBindMulti(host, (key, vals) => { f[key] = vals; qRenderBoard(); refreshIcons(); const p = host.querySelector(`[data-ms="${key}"] .q-ms-panel`); if (p) p.hidden = false; });
  if (openKey) { const p = host.querySelector(`[data-ms="${openKey}"] .q-ms-panel`); if (p) p.hidden = false; }
}

/* ================= 队列详情（6.5.4） ================= */
function qRenderDetail(acctId) {
  const host = document.getElementById('paneDetail');
  const a = qAcct(acctId);
  const s = qAcctStats(a);
  const head = `
    <section class="card">
      <div class="q-head">
        <div class="v2-flex-between">
          <div class="q-crumb"><a href="#board">通道态势</a><span class="sep">›</span>${qQueueName(a)}（${a.bl}）</div>
          <div class="q-toolbar"><span class="v2-live">自动刷新 10 秒</span>
            <button class="btn btn-outline btn-sm" id="qRefresh"><i data-lucide="refresh-cw"></i>手动刷新</button>
            <a class="btn btn-outline btn-sm" href="#board"><i data-lucide="arrow-left"></i>返回</a></div>
        </div>
        <div class="v2-stat-strip">
          <div class="s"><span>状态</span><b>${qStatusTag(s.status, s.reason)}</b></div>
          <div class="s"><span>吞吐 / 上限</span><b>${fmtN(s.thr)} / ${a.tps ? fmtN(a.tps) : '-'} 条/秒</b></div>
          <div class="s"><span>${s.mode === 'tasklevel' ? '队列深度' : '消息队列深度'}</span><b>${fmtN(s.depth)}</b></div>
          <div class="s"><span>预计清空</span><b>${s.drain}</b></div>
          ${s.mode === 'tasklevel' ? `<div class="s"><span>缓冲</span><b>${fmtN(s.buffer)} 条</b></div>` : ''}
          ${s.mode === 'otp' ? `<div class="s"><span>OTP 排队 P95（近 5 分钟）</span><b>${s.p95}</b></div>` : ''}
        </div>
      </div>
    </section>`;
  if (s.mode !== 'tasklevel') {
    const why = s.mode === 'otp' ? 'OTP 账号独立，不参与任务级调度，仅做态势监控。' : '该账号未接入任务级调度，沿用任务启动全量入队，仅展示消息队列深度。';
    host.innerHTML = head + `<section class="card"><div class="v2-callout"><i data-lucide="info"></i><div>${why}</div></div></section>`;
    qBindDetailCommon(host, acctId);
    return;
  }
  const sim = qSimulate(a, qQueueTasks(a.id));
  const resv = qReservations(a.id);
  const tps = a.tps || 1;
  const conflictIds = new Set();
  resv.forEach((x, i) => resv.forEach((y, j) => { if (i !== j && Math.abs(qHmToSec(x.sched) - qHmToSec(y.sched)) <= 1800) conflictIds.add(x.id); }));
  const hasNormalQueued = sim.order.some(t => t.qPrio !== '高');
  host.innerHTML = head + `
    <section class="card table-card">
      <div class="table-card-head v2-flex-between"><h4 class="card-title">发送中 / 待发送 <span class="q-sub">按调度顺序，可拖动待发送任务</span></h4>
        ${typeof qsToolbarHtml === 'function' ? qsToolbarHtml(a) : ''}</div>
      <div class="table-scroll">
        <table class="table stats-table q-table">
          <thead><tr>${typeof qsHeadCell === 'function' ? qsHeadCell(a) : ''}<th>位置</th><th>任务</th><th>产品线</th><th>来源 / 创建人</th><th>任务状态</th><th>优先级</th>
            <th class="v2-num">份额 ${tipIcon('发送中任务近 1 分钟实际获得额度占比')}</th><th class="v2-num">剩余 / 目标</th><th>计划时间</th><th>预计开始</th><th>预计完成</th><th>操作</th></tr></thead>
          <tbody id="qTaskBody">${sim.order.length ? sim.order.map((t, i) => qTaskRow(t, i, sim)).join('') : '<tr><td colspan="13" class="q-empty">队列为空</td></tr>'}</tbody>
        </table>
      </div>
      ${hasNormalQueued && sim.order.some(t => t.qPrio === '高') ? '<div class="v2-hint" style="margin-top:8px">高优任务按插队 / 占位生效时间先后排列，不可在高优任务之间拖动排序。</div>' : ''}
    </section>
    <section class="card table-card">
      <div class="table-card-head"><h4 class="card-title">占位预约 <span class="q-sub">到点自动插队</span></h4></div>
      ${conflictIds.size ? '<div class="v2-callout warn" style="margin-bottom:12px"><i data-lucide="alert-triangle"></i><div>同一时段（±30 分钟）存在多个占位，按计划时间、创建时间先后生效。</div></div>' : ''}
      <table class="table stats-table">
        <thead><tr><th>任务</th><th>产品线</th><th>计划时间</th><th class="v2-num">目标</th><th>预计占用 ${tipIcon('目标量 ÷ 账号 TPS 上限')}</th><th>审批状态</th><th>操作</th></tr></thead>
        <tbody>${resv.length ? resv.map(t => `<tr class="${conflictIds.has(t.id) ? 'q-resv-conflict' : ''}">
            <td><a class="link-btn" data-detail="${t.id}">${qShortId(t.id)} ${esc(t.name)}</a></td><td>${plName(t.site)}</td><td>${t.sched}</td>
            <td class="v2-num">${fmtN(t.target)}</td><td>${qDur(t.target / tps)}</td><td>${v2Tag(V2_APPROVAL_STATUS, t.approval)}</td>
            <td><a class="link-btn link-btn-danger" data-unreserve="${t.id}">取消占位</a></td></tr>`).join('')
          : '<tr><td colspan="7" class="q-empty">暂无占位预约</td></tr>'}</tbody>
      </table>
    </section>
    ${typeof qpSectionHtml === 'function' ? qpSectionHtml(a) : ''}`;
  qBindDetailCommon(host, acctId);
  host.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => qJump(a, b.dataset.jump)));
  host.querySelectorAll('[data-unjump]').forEach(b => b.addEventListener('click', () => qUnjump(a, b.dataset.unjump)));
  host.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => qTerminate(a, b.dataset.stop)));
  host.querySelectorAll('[data-unreserve]').forEach(b => b.addEventListener('click', () => qUnreserve(a, b.dataset.unreserve)));
  if (typeof qpBind === 'function') qpBind(host, a);
  if (typeof qsBind === 'function') qsBind(host, a);
  qBindDrag(host, a);
}
function qBindDetailCommon(host, acctId) {
  host.querySelector('#qRefresh').addEventListener('click', () => { qRenderDetail(acctId); qRenderClock(); refreshIcons(); showToast('已刷新'); });
  host.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => qOpenTask(b.dataset.detail)));
}

function qTaskRow(t, i, sim) {
  const r = sim.res[t.id];
  const hi = t.qPrio === '高';
  const draggable = !hi && t.status === 'queued';
  const share = t.status === 'sending' ? Math.round((sim.share[t.id] || 0) * 100) + '%' : '-';
  const src = t.source === 'API' ? `API · ${t.app} · ${t.operator}` : `手动 · ${t.creator}`;
  const start = r.start === 'started' ? '已开始' : r.start != null ? qClock(r.start) : '-';
  const ex = QUEUE_EXPIRE[t.id];
  let exHtml = '';
  if (ex) exHtml = r.expired ? `<span class="q-expire">最晚发出 ${ex}</span><span class="q-expire">预计 ${fmtN(r.expired)} 条过期</span>` : `<span class="q-expire ok">最晚发出 ${ex}</span>`;
  const rowCls = hi ? 'v2-row-hi' : r.expired ? 'v2-row-warn' : '';
  const ops = [];
  if (!hi && i > 0) ops.push(`<a class="link-btn" data-jump="${t.id}">插队</a>`);
  if (hi) ops.push(`<a class="link-btn" data-unjump="${t.id}">取消插队</a>`);
  if (typeof qsRowOps === 'function') ops.push(...qsRowOps(t));
  ops.push(`<a class="link-btn link-btn-danger" data-stop="${t.id}">终止</a>`);
  ops.push(`<a class="link-btn" data-detail="${t.id}">详情</a>`);
  return `<tr class="${rowCls}" data-row="${t.id}" data-prio="${hi ? 'hi' : 'n'}" ${draggable ? 'draggable="true"' : ''}>
    ${typeof qsRowCell === 'function' ? qsRowCell(t) : ''}<td><span class="q-pos">${draggable ? '<span class="v2-drag" title="拖动排序">⋮⋮</span>' : '<span class="q-nodrag"></span>'}${i + 1}</span></td>
    <td class="q-wrap q-name"><a class="link-btn" data-detail="${t.id}" title="${t.id}">${qShortId(t.id)} ${esc(t.name)}</a></td>
    <td>${plName(t.site)}</td><td class="q-wrap q-src">${esc(src)}</td><td>${v2Tag(V2_TASK_STATUS, t.status)}</td>
    <td>${hi ? '<span class="v2-prio-high">高</span>' : '普通'}</td>
    <td class="v2-num">${share}</td>
    <td class="v2-num">${fmtN(Math.round(t.remaining))} / ${fmtN(t.target)}</td>
    <td>${/^\d/.test(t.sched) ? t.sched : '立即'}</td><td>${start}</td>
    <td class="q-wrap">${qFinishText(r)}${exHtml}</td>
    <td><div class="q-ops">${ops.join('')}</div></td></tr>`;
}

/* ---------- 拖动排序（原生 HTML5 drag） ---------- */
function qBindDrag(host, a) {
  const body = host.querySelector('#qTaskBody');
  if (!body) return;
  const clear = () => body.querySelectorAll('.v2-drop-target, .q-drop-after, .v2-dragging').forEach(r => r.classList.remove('v2-drop-target', 'q-drop-after', 'v2-dragging'));
  let drop = null; // { id, after }
  body.querySelectorAll('tr[draggable="true"]').forEach(tr => {
    tr.addEventListener('dragstart', e => { QS.dragId = tr.dataset.row; tr.classList.add('v2-dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', tr.dataset.row); });
    tr.addEventListener('dragend', () => { clear(); QS.dragId = null; });
  });
  body.querySelectorAll('tr[data-row]').forEach(tr => {
    tr.addEventListener('dragover', e => {
      if (!QS.dragId || tr.dataset.prio === 'hi') return;
      e.preventDefault();
      const rect = tr.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      body.querySelectorAll('.v2-drop-target, .q-drop-after').forEach(r => r.classList.remove('v2-drop-target', 'q-drop-after'));
      tr.classList.add(after ? 'q-drop-after' : 'v2-drop-target');
      drop = { id: tr.dataset.row, after };
    });
    tr.addEventListener('drop', e => {
      e.preventDefault();
      const id = QS.dragId; const d = drop;
      clear(); QS.dragId = null;
      if (id && d) qReorder(a, id, d.id, d.after);
    });
  });
}

function qReorder(a, id, targetId, after) {
  const order = qOrder(qQueueTasks(a.id));
  const normals = order.filter(t => t.qPrio !== '高');
  const moving = normals.find(t => t.id === id);
  const rest = normals.filter(t => t.id !== id);
  let idx = rest.findIndex(t => t.id === targetId);
  if (idx < 0) return;
  if (after) idx += 1;
  const prev = rest[idx - 1]; const next = rest[idx];
  const newSeq = prev && next ? (prev.qSeq + next.qSeq) / 2 : prev ? prev.qSeq + 1 : next.qSeq - 1;
  const fromPos = order.indexOf(moving) + 1;
  const highCount = order.length - normals.length;
  const toPos = highCount + idx + 1;
  if (fromPos === toPos) return;
  const cmp = qCompare(a, list => { list.find(t => t.id === id).qSeq = newSeq; return list; });
  const others = cmp.rows.filter(r => r.t.id !== id);
  const self = cmp.rows.find(r => r.t.id === id);
  v2Modal({
    title: '确认调整排队顺序',
    width: 620,
    body: `<div>将 <b>${qShortId(id)} ${esc(moving.name)}</b> 从位置 ${fromPos} 移到位置 ${toPos}${self ? `，其预计完成 ${qFinishText(self.b)} → ${qFinishText(self.a)}` : ''}。</div>
      <div class="v2-section-title" style="margin:4px 0 0;font-size:13px">受影响任务</div>${qAffectedTable(others)}${qReasonField(false)}`,
    okText: '确认调整',
    onOk: root => {
      const reason = qReadReason(root);
      moving.qSeq = newSeq;
      qPromote(a);
      qAddAudit({ action: '排序', queue: a.id, task: id, change: `位置 ${fromPos} → ${toPos}`, affected: qLaterIds(others), reason });
      showToast('排队顺序已调整，ETA 已重算');
      qRoute(true);
    },
  });
}

function qJump(a, id) {
  const order = qOrder(qQueueTasks(a.id));
  const t = order.find(x => x.id === id);
  const fromPos = order.indexOf(t) + 1;
  const highs = order.filter(x => x.qPrio === '高').length;
  const minSeq = Math.min(...order.map(x => x.qSeq));
  const cmp = qCompare(a, list => { const c = list.find(x => x.id === id); c.qPrio = '高'; c.qHighAt = QS.now; c.qSeq = minSeq - 1; return list; });
  const yieldRows = cmp.rows.filter(r => r.t.id !== id);
  const yp = QS.cfg[a.id].yieldPct;
  v2Modal({
    title: '确认插队',
    width: 620,
    body: `<div><b>${qShortId(id)} ${esc(t.name)}</b> 将升为高优先级并置于${highs ? `高优任务之后（位置 ${highs + 1}）` : '队首'}，下一秒起优先拿额度；让行任务不中断，份额 ${yp}%（让行保留比例）。</div>
      <div class="v2-section-title" style="margin:4px 0 0;font-size:13px">让行任务</div>${qAffectedTable(yieldRows)}${qReasonField(false)}`,
    okText: '确认插队',
    onOk: root => {
      const reason = qReadReason(root);
      t.qPrio = '高'; t.qHighAt = QS.now; t.qSeq = minSeq - 1;
      qPromote(a);
      const toPos = qOrder(qQueueTasks(a.id)).indexOf(t) + 1;
      qAddAudit({ action: '插队', queue: a.id, task: id, change: `位置 ${fromPos} → ${toPos}；优先级 普通 → 高`, affected: qLaterIds(yieldRows), reason });
      showToast('已插队，ETA 已重算');
      qRoute(true);
    },
  });
}

function qUnjump(a, id) {
  const order = qOrder(qQueueTasks(a.id));
  const t = order.find(x => x.id === id);
  const fromPos = order.indexOf(t) + 1;
  const cmp = qCompare(a, list => { const c = list.find(x => x.id === id); c.qPrio = '普通'; c.qHighAt = null; c.qSeq = c.qReady; return list; });
  const rows = cmp.rows.filter(r => r.t.id !== id);
  const self = cmp.rows.find(r => r.t.id === id);
  v2Modal({
    title: '确认取消插队',
    width: 620,
    body: `<div><b>${qShortId(id)} ${esc(t.name)}</b> 将恢复普通优先级，按原就绪时间（${qClock(t.qReady)}）回位${self ? `；其预计完成 ${qFinishText(self.b)} → ${qFinishText(self.a)}` : ''}。</div>
      <div class="v2-section-title" style="margin:4px 0 0;font-size:13px">受影响任务</div>${qAffectedTable(rows)}${qReasonField(false)}`,
    okText: '确认取消插队',
    onOk: root => {
      const reason = qReadReason(root);
      t.qPrio = '普通'; t.qHighAt = null; t.qSeq = t.qReady;
      qPromote(a);
      const toPos = qOrder(qQueueTasks(a.id)).indexOf(t) + 1;
      qAddAudit({ action: '取消插队', queue: a.id, task: id, change: `位置 ${fromPos} → ${toPos}；优先级 高 → 普通`, affected: qLaterIds(rows), reason });
      showToast('已取消插队，ETA 已重算');
      qRoute(true);
    },
  });
}

function qTerminate(a, id) {
  const t = v2Task(id);
  const cmp = qCompare(a, list => list.filter(x => x.id !== id));
  const rows = cmp.rows.filter(r => r.t.id !== id);
  v2Modal({
    title: '确认终止任务',
    danger: true,
    width: 620,
    body: `<div class="v2-callout danger"><i data-lucide="alert-octagon"></i><div>终止 <b>${qShortId(id)} ${esc(t.name)}</b>：立即停止注入，待发送表中未注入的 <b>${fmtN(Math.round(t.remaining))}</b> 条消息置为已取消；缓冲内消息照常提交。任务状态同步为已终止，不可恢复。</div></div>
      <div class="v2-section-title" style="margin:4px 0 0;font-size:13px">受影响任务</div>${qAffectedTable(rows)}${qReasonField(true)}`,
    okText: '确认终止',
    onOk: root => {
      const reason = qReadReason(root);
      if (!reason) { showToast('请填写终止原因'); root.querySelector('#qReason').focus(); return false; }
      const prev = V2_TASK_STATUS[t.status].label;
      t.status = 'stopped'; t.stopReason = '人工终止：' + reason; t.remaining = 0;
      qPromote(a);
      qAddAudit({ action: '终止', queue: a.id, task: id, change: `${prev} → 已终止`, affected: '', reason });
      showToast('任务已终止，待发消息已取消');
      qRoute(true);
    },
  });
}

function qUnreserve(a, id) {
  const t = v2Task(id);
  v2Modal({
    title: '确认取消占位',
    width: 520,
    body: `<div>取消 <b>${qShortId(id)} ${esc(t.name)}</b> 的到点占位：${t.sched} 到点后不再自动插队，任务本身不受影响，按普通优先级排队。</div>${qReasonField(false)}`,
    okText: '确认取消占位',
    onOk: root => {
      const reason = qReadReason(root);
      t.qReserve = false; t.reserve = false;
      qAddAudit({ action: '占位取消', queue: a.id, task: id, change: `到点占位 开 → 关（计划 ${t.sched}）`, affected: '', reason });
      showToast('已取消占位');
      qRoute(true);
    },
  });
}

/* ---------- 任务详情抽屉（只读） ---------- */
function qOpenTask(id) {
  const t = v2Task(id);
  if (!t) return;
  const a = qAcct(t.account);
  let start = t.estStart || '-'; let finish = t.estFinish || '-'; let expired = 0;
  if (a && qMode(a) === 'tasklevel' && (t.status === 'sending' || t.status === 'queued')) {
    const sim = qSimulate(a, qQueueTasks(a.id));
    const r = sim.res[id];
    if (r) { start = r.start === 'started' ? '已开始' : r.start != null ? qClock(r.start) : '-'; finish = qFinishText(r); expired = r.expired; }
  }
  if (t.status === 'stopped' || t.status === 'done') { start = '-'; finish = '-'; }
  const item = (k, v) => `<div class="desc-item"><span class="desc-label">${k}</span><span>${v}</span></div>`;
  document.getElementById('qDrawerBody').innerHTML = `<section class="card"><div class="desc-list">
    ${item('任务 ID', t.id)}${item('任务名称', esc(t.name))}${item('产品线', plName(t.site))}
    ${item('通道 / 账号', a ? qQueueName(a) : t.channel)}${item('消息类别', t.category)}
    ${item('来源 / 创建人', t.source === 'API' ? `API · ${t.app} · ${t.operator}` : `手动 · ${t.creator}`)}
    ${item('任务状态', v2Tag(V2_TASK_STATUS, t.status))}${item('审批状态', v2Tag(V2_APPROVAL_STATUS, t.approval))}
    ${item('计划时间', /^\d/.test(t.sched) ? t.sched : '立即')}${item('剩余 / 目标', `${fmtN(Math.round(t.remaining))} / ${fmtN(t.target)}`)}
    ${item('预计开始 / 预计完成', `${start} / ${finish}`)}
    ${item('最晚发出时间 <span class="tag tag-gray-outline">P1</span>', QUEUE_EXPIRE[id] ? `${QUEUE_TODAY} ${QUEUE_EXPIRE[id]}${expired ? `<span class="q-expire">按当前顺序预计 ${fmtN(expired)} 条过期（未发出）</span>` : ''}` : '-')}
    ${t.qReserve ? item('到点占位', `开（计划 ${t.sched}）`) : ''}
    ${t.planId ? item('上游计划 ID', `星灵 · ${esc(t.planId)}`) : ''}
    ${t.stopReason ? item('终止原因', esc(t.stopReason)) : ''}
  </div></section>`;
  openDrawer('qTaskDrawer');
  refreshIcons();
}

/* ================= 调度审计日志（6.5.6） ================= */
function qAuditRows() {
  const f = QS.auditF;
  const day = s => s.slice(0, 10);
  const today = new Date(QUEUE_TODAY + 'T00:00:00');
  const ago = n => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  let from = ago(6); let to = QUEUE_TODAY;
  if (f.range === 'today') from = QUEUE_TODAY;
  if (f.range === '30d') from = ago(29);
  if (f.range === 'custom') { from = f.from || '0000'; to = f.to || '9999'; }
  const kw = f.task.trim().toLowerCase();
  return QS.audit.filter(r => day(r.time) >= from && day(r.time) <= to &&
    (!f.queue || r.queue === f.queue) && (!f.action || r.action === f.action) && (!f.op || r.op === f.op) &&
    (!kw || (r.task && (r.task.toLowerCase().includes(kw) || ((v2Task(r.task) || {}).name || '').toLowerCase().includes(kw)))) &&
    qInScope((qAcct(r.queue) || {}).bl));
}
function qRenderAudit() {
  const host = document.getElementById('paneAudit');
  const f = QS.auditF;
  const ops = [...new Set(QS.audit.map(r => r.op))];
  const accts = V2_ACCOUNTS.filter(a => qInScope(a.bl));
  host.innerHTML = `
    <section class="card filter-card">
      <div class="filter-row">
        <div class="filter-item"><span class="filter-label">时间范围</span>
          <div class="seg-group" id="qaRange">${[['today', '今天'], ['7d', '最近 7 天'], ['30d', '最近 30 天'], ['custom', '自定义']].map(([k, l]) => `<button class="seg-btn ${f.range === k ? 'active' : ''}" data-range="${k}">${l}</button>`).join('')}</div>
          <span id="qaCustom" ${f.range === 'custom' ? '' : 'hidden'} class="v2-flex"><input type="date" class="input" id="qaFrom" value="${f.from}" style="width:140px"> 至 <input type="date" class="input" id="qaTo" value="${f.to}" style="width:140px"></span>
        </div>
        <div class="filter-item"><span class="filter-label">队列</span>
          <select class="select" id="qaQueue"><option value="">全部</option>${accts.map(a => `<option value="${a.id}" ${f.queue === a.id ? 'selected' : ''}>${qQueueName(a)}</option>`).join('')}</select></div>
        <div class="filter-item"><span class="filter-label">动作</span>
          <select class="select" id="qaAction"><option value="">全部</option>${QUEUE_ACTIONS.map(x => `<option ${f.action === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="filter-item"><span class="filter-label">操作人</span>
          <select class="select" id="qaOp"><option value="">全部</option>${ops.map(x => `<option ${f.op === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="filter-item"><span class="filter-label">任务</span>
          <input class="input" id="qaTask" placeholder="任务 ID 或名称" value="${esc(f.task)}" style="width:180px"></div>
      </div>
    </section>
    <section class="card table-card">
      <div class="table-card-head v2-flex-between">
        <h4 class="card-title">调度审计日志 <span class="q-sub">日志保留 12 个月，不可删改</span></h4>
        <button class="btn btn-outline btn-sm" id="qaExport" style="margin-bottom:12px"><i data-lucide="download"></i>导出</button>
      </div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>队列</th><th>任务</th><th>变更</th><th>影响任务</th><th>原因 / 备注</th></tr></thead>
        <tbody id="qaBody"></tbody></table></div>
    </section>`;
  qRenderAuditBody();
  host.querySelectorAll('#qaRange [data-range]').forEach(b => b.addEventListener('click', () => {
    f.range = b.dataset.range;
    host.querySelectorAll('#qaRange .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    host.querySelector('#qaCustom').hidden = f.range !== 'custom';
    qRenderAuditBody();
  }));
  const onDate = () => {
    const from = host.querySelector('#qaFrom').value; const to = host.querySelector('#qaTo').value;
    if (from && to && (new Date(to) - new Date(from)) / 86400000 > 92) { showToast('时间范围不能超过 92 天'); return; }
    if (from && to && to < from) { showToast('结束日期不能早于开始日期'); return; }
    f.from = from; f.to = to; qRenderAuditBody();
  };
  host.querySelector('#qaFrom').addEventListener('change', onDate);
  host.querySelector('#qaTo').addEventListener('change', onDate);
  [['#qaQueue', 'queue'], ['#qaAction', 'action'], ['#qaOp', 'op']].forEach(([sel, k]) =>
    host.querySelector(sel).addEventListener('change', e => { f[k] = e.target.value; qRenderAuditBody(); }));
  host.querySelector('#qaTask').addEventListener('input', e => { f.task = e.target.value; qRenderAuditBody(); });
  host.querySelector('#qaExport').addEventListener('click', () => showToast('已导出（原型）'));
}
function qRenderAuditBody() {
  const body = document.getElementById('qaBody');
  if (!body) return;
  const rows = qAuditRows();
  body.innerHTML = rows.length ? rows.map(r => {
    const a = qAcct(r.queue); const t = r.task ? v2Task(r.task) : null;
    return `<tr><td>${r.time}</td><td>${esc(r.op)}</td><td>${r.action}</td><td>${a ? qQueueName(a) : '-'}</td>
      <td>${t ? `<a class="link-btn" data-detail="${t.id}">${qShortId(t.id)} ${esc(t.name)}</a>` : '-'}</td>
      <td style="white-space:normal;min-width:180px">${esc(r.change)}</td>
      <td>${r.affected ? r.affected.split(', ').map(qShortId).join(', ') : '-'}</td>
      <td style="white-space:normal;min-width:120px">${r.reason ? esc(r.reason) : '-'}</td></tr>`;
  }).join('') : '<tr><td colspan="8" class="q-empty">暂无审计记录</td></tr>';
  body.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => qOpenTask(b.dataset.detail)));
}

/* ================= 调度参数（6.5.2 回退开关、6.5.4 让行保留比例、附录 A7 缓冲深度、6.5.7 份额轮转） ================= */
function qRenderParams() {
  const host = document.getElementById('paneParams');
  const accts = V2_ACCOUNTS.filter(a => qInScope(a.bl));
  const bls = V2_BUSINESS_LINES.map(b => b.code).filter(qInScope);
  if (!bls.includes(QS.rrBl)) QS.rrBl = bls[0];
  const rr = QS.rr[QS.rrBl];
  const pls = V2_PRODUCT_LINES.filter(p => p.bl === QS.rrBl && p.status === '启用');
  host.innerHTML = `
    <section class="card table-card">
      <div class="table-card-head"><h4 class="card-title">账号调度参数</h4></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>通道</th><th>供应商</th><th>账号</th><th>业务线</th><th class="v2-num">TPS 上限</th>
          <th>任务级调度 ${tipIcon('关闭即回到任务启动全量入队的现状；短信通道账号可独立开关，OTP 账号与其他通道二期不切')}</th>
          <th class="v2-num">让行保留比例 ${tipIcon('插队 / 占位生效时让行任务保留的额度比例，0–50%，默认 0%（高优独占）')}</th>
          <th class="v2-num">缓冲深度 ${tipIcon('TPS × N 秒，N 可配 3–10，默认 5')}</th><th>操作</th></tr></thead>
        <tbody>${accts.map(a => {
          const c = QS.cfg[a.id];
          const switchable = a.channel === 'SMS' && a.mode !== 'otp';
          const sw = switchable
            ? `<label class="v2-switch"><input type="checkbox" data-sched="${a.id}" ${c.sched ? 'checked' : ''}><span></span></label>`
            : `<span class="v2-muted">${a.mode === 'otp' ? 'OTP 独立，不参与' : '二期不切'}</span>`;
          const on = switchable && c.sched;
          return `<tr><td>${a.channel}</td><td>${a.vendor}</td><td>${a.id}</td><td>${a.bl}</td>
            <td class="v2-num">${a.tps ? fmtN(a.tps) + ' 条/秒' : '-'}</td>
            <td>${sw}</td><td class="v2-num">${on ? c.yieldPct + '%' : '-'}</td><td class="v2-num">${on ? `TPS × ${c.bufferSec} 秒` : '-'}</td>
            <td>${on ? `<a class="link-btn" data-edit="${a.id}">编辑</a>` : '<span class="v2-muted">-</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>
      <div class="v2-hint" style="margin-top:8px">TPS 上限读取供应商档案（系统管理 › 供应商档案），修改后下一秒生效。</div>
    </section>
    <section class="card">
      <h4 class="card-title v2-flex">产品线份额轮转 <span class="tag tag-gray-outline">P1</span></h4>
      <div class="v2-form" style="max-width:760px">
        <label class="req">业务线</label>
        <div class="seg-group" id="qrBl" style="width:max-content">${bls.map(b => `<button class="seg-btn ${b === QS.rrBl ? 'active' : ''}" data-bl="${b}">${b}</button>`).join('')}</div>
        <span class="v2-hint">配置按业务线，对其全部短信账号生效</span>
        <label class="req">轮转开关</label>
        <div class="v2-flex"><label class="v2-switch"><input type="checkbox" id="qrOn" ${rr.on ? 'checked' : ''}><span></span></label><span class="v2-hint" id="qrOnTxt">${rr.on ? '开：高优任务用完后的剩余额度按产品线权重轮转' : '关：严格 FIFO'}</span></div>
        <label class="req">产品线权重</label>
        <div class="q-weights">${pls.map(p => `<label><span>${p.name}</span><input type="number" class="input q-param-num" min="1" max="10" step="1" data-w="${p.siteId}" value="${rr.weights[p.siteId] || 1}"></label>`).join('')}</div>
        <span class="v2-hint">取值 1–10，默认全部 1；新增产品线默认 1；某产品线无任务时其份额让给其他产品线</span>
        <span></span>
        <div><button class="btn btn-primary" id="qrSave">保存</button></div>
      </div>
    </section>`;
  host.querySelectorAll('[data-sched]').forEach(cb => cb.addEventListener('change', () => qToggleSched(cb)));
  host.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => qEditParams(b.dataset.edit)));
  host.querySelectorAll('#qrBl [data-bl]').forEach(b => b.addEventListener('click', () => { QS.rrBl = b.dataset.bl; qRenderParams(); refreshIcons(); }));
  host.querySelector('#qrOn').addEventListener('change', e => { host.querySelector('#qrOnTxt').textContent = e.target.checked ? '开：高优任务用完后的剩余额度按产品线权重轮转' : '关：严格 FIFO'; });
  host.querySelector('#qrSave').addEventListener('click', () => qSaveRR(host));
}

function qToggleSched(cb) {
  const a = qAcct(cb.dataset.sched);
  const want = cb.checked;
  cb.checked = !want;
  v2Modal({
    title: want ? '开启任务级调度' : '关闭任务级调度',
    danger: !want,
    body: want
      ? `<div>开启后 ${qQueueName(a)} 切为任务级调度：任务按优先级与排队序号分批注入，可排序 / 插队 / 占位。</div>${qReasonField(false)}`
      : `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><div>关闭后 ${qQueueName(a)} 回到「任务启动全量入队」的现状，队列详情变为只读，排序 / 插队 / 占位不再生效。</div></div>${qReasonField(false)}`,
    okText: want ? '确认开启' : '确认关闭',
    onOk: root => {
      const reason = qReadReason(root);
      QS.cfg[a.id].sched = want;
      if (!want) qQueueTasks(a.id).forEach(t => { t.qPrio = '普通'; t.qHighAt = null; t.qSeq = t.qReady; });
      qAddAudit({ action: '调度开关', queue: a.id, change: `任务级调度 ${want ? '关 → 开' : '开 → 关'}`, reason });
      showToast(want ? '已开启任务级调度' : '已关闭任务级调度');
      qRenderParams(); refreshIcons();
    },
  });
}

function qEditParams(id) {
  const a = qAcct(id); const c = QS.cfg[id];
  v2Modal({
    title: `编辑调度参数 · ${qQueueName(a)}`,
    body: `<div class="v2-form">
        <label class="req">让行保留比例</label><div class="v2-flex"><input type="number" class="input q-param-num" id="qpYield" min="0" max="50" value="${c.yieldPct}">%</div>
        <span class="v2-hint">0–50%，默认 0%（高优独占，让行任务份额 0%）</span>
        <label class="req">缓冲深度</label><div class="v2-flex">TPS × <input type="number" class="input q-param-num" id="qpBuf" min="3" max="10" value="${c.bufferSec}"> 秒</div>
        <span class="v2-hint">3–10 秒，默认 5 秒；当前 TPS 上限 ${a.tps} 条/秒</span>
      </div>${qReasonField(false)}`,
    okText: '保存',
    onOk: root => {
      const y = Number(root.querySelector('#qpYield').value); const b = Number(root.querySelector('#qpBuf').value);
      if (!Number.isInteger(y) || y < 0 || y > 50) { showToast('让行保留比例需为 0–50 的整数'); return false; }
      if (!Number.isInteger(b) || b < 3 || b > 10) { showToast('缓冲深度需为 3–10 的整数秒'); return false; }
      const ch = [];
      if (y !== c.yieldPct) ch.push(`让行保留比例 ${c.yieldPct}% → ${y}%`);
      if (b !== c.bufferSec) ch.push(`缓冲深度 ${c.bufferSec} 秒 → ${b} 秒`);
      if (!ch.length) { showToast('参数未变化'); return; }
      c.yieldPct = y; c.bufferSec = b;
      qAddAudit({ action: '参数变更', queue: id, change: ch.join('；'), reason: qReadReason(root) });
      showToast('调度参数已保存，下一秒生效');
      qRenderParams(); refreshIcons();
    },
  });
}

function qSaveRR(host) {
  const rr = QS.rr[QS.rrBl];
  const on = host.querySelector('#qrOn').checked;
  const ch = []; const newW = {};
  for (const inp of host.querySelectorAll('[data-w]')) {
    const v = Number(inp.value);
    if (!Number.isInteger(v) || v < 1 || v > 10) { showToast('产品线权重需为 1–10 的整数'); inp.focus(); return; }
    newW[inp.dataset.w] = v;
    if (v !== (rr.weights[inp.dataset.w] || 1)) ch.push(`${plName(inp.dataset.w)} 权重 ${rr.weights[inp.dataset.w] || 1} → ${v}`);
  }
  if (on !== rr.on) ch.unshift(`份额轮转 ${rr.on ? '开' : '关'} → ${on ? '开' : '关'}`);
  if (!ch.length) { showToast('配置未变化'); return; }
  rr.on = on; Object.assign(rr.weights, newW);
  V2_ACCOUNTS.filter(a => a.bl === QS.rrBl && qMode(a) === 'tasklevel').forEach(qPromote);
  const first = V2_ACCOUNTS.find(a => a.bl === QS.rrBl && a.channel === 'SMS' && a.mode !== 'otp');
  qAddAudit({ action: '参数变更', queue: first ? first.id : '', change: `${QS.rrBl} 业务线（全部短信账号）：${ch.join('；')}`, reason: '' });
  showToast('份额轮转配置已保存');
}

/* ================= 路由（#board / #queue/<账号> / #audit / #params） ================= */
function qParseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (h.startsWith('queue/')) return { tab: 'board', acct: h.slice(6) };
  if (h === 'audit') return { tab: h };  // 调度参数页移到后续（附录 C.3）
  return { tab: 'board' };
}
function qRoute(keepScroll) {
  if (location.hash === '#params') history.replaceState(null, '', '#board');
  let r = qParseHash();
  if (r.acct) {
    const a = qAcct(r.acct);
    if (!a || !qInScope(a.bl)) { showToast('队列不存在或不在权限范围内'); history.replaceState(null, '', '#board'); r = { tab: 'board' }; }
  }
  const y = window.scrollY;
  document.querySelectorAll('#qTabs [data-qtab]').forEach(b => b.classList.toggle('active', b.dataset.qtab === r.tab));
  const show = { paneBoard: r.tab === 'board' && !r.acct, paneDetail: !!r.acct, paneAudit: r.tab === 'audit', paneParams: r.tab === 'params' };
  Object.entries(show).forEach(([id, v]) => { document.getElementById(id).hidden = !v; });
  if (show.paneBoard) qRenderBoard();
  if (show.paneDetail) qRenderDetail(r.acct);
  if (show.paneAudit) { if (keepScroll === true && document.getElementById('qaBody')) qRenderAuditBody(); else qRenderAudit(); }
  if (show.paneParams && keepScroll !== true) qRenderParams();
  qRenderClock();
  refreshIcons();
  if (keepScroll === true) window.scrollTo(0, y);
}
function qRenderNav() {
  const r = qParseHash();
  const sub = { board: 'queue-board', audit: 'queue-audit', params: 'queue-params' }[r.tab];
  renderSidebar('reach', 'reach-queue', sub);
  refreshIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  renderTopbar();
  if (!hasPerm('queue')) {
    renderSidebar('reach', 'reach-queue');
    refreshIcons();
    showToast('您无此权限');
    setTimeout(() => { location.href = 'index.html'; }, 1200);
    return;
  }
  document.getElementById('queueMain').hidden = false;
  qInit();
  QS.tickAt = Date.now();
  qRenderNav();
  document.querySelectorAll('#qTabs [data-qtab]').forEach(b => b.addEventListener('click', () => {
    history.replaceState(null, '', '#' + b.dataset.qtab);
    qRoute(); setTimeout(qRenderNav, 0);
  }));
  window.addEventListener('hashchange', () => { qRoute(); setTimeout(qRenderNav, 0); });
  qRoute();
  bindDrawerClose();
  QS.timer = setInterval(qTick, 10000);
});

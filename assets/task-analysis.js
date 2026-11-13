/* 任务分析（PRD 6.3.3）+ AI 失败诊断（6.3.4，P1）
 * 漏斗口径 = 4.4.5 恒等式（v2Funnel）；失败 = 已拦截 + 提交失败 + 未送达 + 已过期 + 无回执。
 * 模板、创建日期、供应商拆分、号段前缀、模板历史均为演示数据。 */

const TA_TODAY = '2026-07-13';
const TA_MAX_TASKS = 20;
const TA_TASK_META = {
  T20260713002: { tpl: 'TPL-SMS-0012', created: '2026-07-13' },
  T20260713005: { tpl: 'TPL-SMS-0018', created: '2026-07-13' },
  T20260713007: { tpl: 'TPL-SMS-0025', created: '2026-07-13' },
  T20260713009: { tpl: 'TPL-SMS-0031', created: '2026-07-13' },
  T20260713001: { tpl: 'TPL-SMS-0007', created: '2026-07-13' },
  T20260713011: { tpl: 'TPL-MAIL-0003', created: '2026-07-13' },
  T20260713012: { tpl: 'TPL-PUSH-0009', created: '2026-07-13' },
  T20260712003: { tpl: 'TPL-SMS-0040', created: '2026-07-12' },
  T20260711008: { tpl: 'TPL-SMS-0018', created: '2026-07-11' },
  T20260710004: { tpl: 'TPL-SMS-0012', created: '2026-07-10' },
  T20260709006: { tpl: 'TPL-SMS-0050', created: '2026-07-09' },
};
const TA_TEMPLATES = {
  'TPL-SMS-0007': '世界杯竞猜预热', 'TPL-SMS-0012': '沉默召回通用短信', 'TPL-SMS-0018': '充值提醒',
  'TPL-SMS-0025': '周末返利', 'TPL-SMS-0031': '开赛提醒', 'TPL-SMS-0040': '注册礼包', 'TPL-SMS-0050': '账号安全通知',
  'TPL-MAIL-0003': '周报邮件', 'TPL-PUSH-0009': 'VIP 生日礼包',
};
const TA_SITE_SENDER = { 'bp-growth': 'BPGROWTH', 'bp-poc': 'BPPLATFORM', 'bp-coc': 'BPCONTENT', 'bp-vip': 'BPVIP', gamezone: 'GAMEZONE', arenaplus: 'ARENAPLUS' };
const TA_PREFIX_W = { '0917': 24, '0905': 18, '0927': 15, '0918': 14, '0998': 11, '0947': 10, '0966': 8 };
const TA_RETRY_VENDOR = 'NXLink';
const TA_RETRY_ACCOUNT = 'AGG-01';
const TA_CH_MEAN = { SMS: 95.8, 邮件: 96.4, Push: 93.5, 站内信: 99.5, 'Viber Biz': 90.2, 'Viber Bot': 91.0, 'Messenger Biz': 90.0, 'Messenger Bot': 89.5, WhatsApp: 92.0 }; // 近 30 天同通道均值（演示）
const TA_DIMS = { stage: '阶段', cat: '统一分类', code: '原始码', vendor: '供应商', account: '账号', sender: 'Sender', channel: '通道', task: '任务', prefix: '号段前缀' };
const TA_SUBMIT_W = { 账号鉴权或余额: 1, 模板或签名无效: 1.5, 号段或目标不支持: 2, 内容被供应商拒绝: 2.5, 供应商限流: 2, 供应商网关故障: 1 };
const TA_UNDELIV_W = { 号码或地址无效: 55, 用户不可达: 18, 运营商或平台拦截: 14, 用户拒收: 6, 终端或网络超时: 4, 未分类: 3 };
const TA_UNDELIV_W_AGG = { 号码或地址无效: 30, 用户不可达: 14, 运营商或平台拦截: 38, 用户拒收: 4, 终端或网络超时: 6, 未分类: 8 };

const TA = { scope: 'tasks', tasks: ['T20260713001', 'T20260713002'], activity: '', actOff: new Set(), rowDim: 'cat', colDim: 'vendor', stage: null, ids: [], ms: {} };

/* ================= 数据 ================= */
function taMeta(t) { return TA_TASK_META[t.id] || { tpl: '-', created: TA_TODAY }; }
function taAccount(id) { return V2_ACCOUNTS.find(a => a.id === id) || { id, vendor: '-' }; }
function taActName(id) { const a = typeof activityById === 'function' ? activityById(id) : null; return a ? a.name : id; }
function taTaskLabel(id) { const t = v2Task(id); return t ? `${t.id} ${t.name}` : id; }

/* 漏斗：共享 v2Funnel；审批拒绝的任务未发出，可推送全部计入已取消 */
function taFunnel(t) {
  const f = v2Funnel(t);
  if (t.approval !== 'rejected') return f;
  return { ...f, queued: 0, submitted: 0, submitFail: 0, cancelled: f.sendable, delivered: 0, undelivered: 0, noReceipt: 0, waiting: 0 };
}
/* 按最终供应商拆分：短信直连提交失败后转聚合供应商的记为重试（4.4.6） */
function taVendorParts(t, f) {
  const acc = taAccount(t.account);
  const keys = ['delivered', 'undelivered', 'noReceipt', 'waiting', 'submitFail'];
  if (t.channel !== 'SMS' || t.account === 'OTP-BP') {
    return [{ vendor: acc.vendor, account: acc.id, ...Object.fromEntries(keys.map(k => [k, f[k]])), retry: 0 }];
  }
  const share = { delivered: .08, undelivered: .2, noReceipt: .3, waiting: .08, submitFail: .25 };
  const main = { vendor: acc.vendor, account: acc.id, retry: 0 }; const agg = { vendor: TA_RETRY_VENDOR, account: TA_RETRY_ACCOUNT };
  keys.forEach(k => { const s = faSplit(f[k], { a: 1 - share[k], b: share[k] }); main[k] = s.a; agg[k] = s.b; });
  agg.retry = agg.delivered + agg.undelivered + agg.noReceipt + agg.waiting;
  return [main, agg];
}
function taPartSubmitted(p) { return p.delivered + p.undelivered + p.noReceipt + p.waiting; }

/* 失败原子行（含原始码、号段前缀） */
function taAtoms(t) {
  const f = taFunnel(t); const sender = TA_SITE_SENDER[t.site] || '-';
  const base = { task: t.id, channel: t.channel, sender };
  let rows = faExpand({ ...base, vendor: FA_NO_VENDOR, account: FA_NO_VENDOR }, Object.fromEntries(Object.entries(f.filters).filter(([, n]) => n)));
  taVendorParts(t, f).forEach(p => {
    const b = { ...base, vendor: p.vendor, account: p.account };
    const subW = t.status === 'failed' ? { ...TA_SUBMIT_W, 账号鉴权或余额: 40 } : TA_SUBMIT_W;
    rows = rows.concat(faExpand(b, faSplit(p.submitFail, subW)));
    rows = rows.concat(faExpand(b, faSplit(p.undelivered, p.vendor === TA_RETRY_VENDOR ? TA_UNDELIV_W_AGG : TA_UNDELIV_W)));
    rows = rows.concat(faExpand(b, { 无回执: p.noReceipt }));
  });
  if (f.expired) rows = rows.concat(faExpand({ ...base, vendor: FA_NO_VENDOR, account: FA_NO_VENDOR }, { 已过期: f.expired }));
  if (t.channel !== 'SMS') return rows.map(r => ({ ...r, prefix: '-' }));
  return rows.flatMap(r => Object.entries(faSplit(r.count, TA_PREFIX_W)).filter(([, n]) => n).map(([prefix, n]) => ({ ...r, prefix, count: n })));
}

function taSumFunnel(tasks) {
  const z = { total: 0, filtered: 0, sendable: 0, queued: 0, submitted: 0, submitFail: 0, cancelled: 0, expired: 0, delivered: 0, undelivered: 0, noReceipt: 0, waiting: 0, filters: {} };
  tasks.forEach(t => {
    const f = taFunnel(t);
    Object.keys(z).forEach(k => { if (k !== 'filters') z[k] += f[k]; });
    Object.entries(f.filters).forEach(([k, v]) => { z.filters[k] = (z.filters[k] || 0) + v; });
  });
  return z;
}
const taRate = { del: f => (f.submitted ? f.delivered / f.submitted * 100 : null), acc: f => (f.submitted + f.submitFail ? f.submitted / (f.submitted + f.submitFail) * 100 : null), rec: f => (f.submitted ? (f.delivered + f.undelivered) / f.submitted * 100 : null) };
function taPctTxt(v) { return v == null ? '-' : v.toFixed(1) + '%'; }

/* ================= 范围 ================= */
function taTasksForCond() {
  const range = document.getElementById('taRange').value;
  const days = { today: 0, '7d': 6, '30d': 29 }[range];
  let from; let to = TA_TODAY;
  if (range === 'custom') { from = document.getElementById('taFrom').value; to = document.getElementById('taTo').value; }
  else { const d = new Date(TA_TODAY); d.setDate(d.getDate() - days); from = d.toISOString().slice(0, 10); }
  const pls = TA.ms.pl.get(); const chs = TA.ms.ch.get(); const tpls = TA.ms.tpl.get();
  return V2_TASKS.filter(t => {
    const m = taMeta(t);
    return m.created >= from && m.created <= to && (!pls.length || pls.includes(t.site)) && (!chs.length || chs.includes(t.channel)) && (!tpls.length || tpls.includes(m.tpl));
  }).map(t => t.id);
}
function taActTaskIds(act) { return V2_TASKS.filter(t => t.activity === act).map(t => t.id); }
function taResolve() {
  if (TA.scope === 'tasks') return TA.tasks.slice();
  if (TA.scope === 'activity') return taActTaskIds(TA.activity).filter(id => !TA.actOff.has(id));
  return taTasksForCond();
}
function taValidate(ids) {
  if (TA.scope === 'tasks' && !ids.length) return '请至少选择 1 个任务';
  if (TA.scope === 'activity' && !TA.activity) return '请选择活动';
  if (TA.scope === 'activity' && !ids.length) return '关联任务已全部剔除，请至少保留 1 个';
  if (TA.scope === 'cond' && document.getElementById('taRange').value === 'custom') {
    const a = new Date(document.getElementById('taFrom').value); const b = new Date(document.getElementById('taTo').value);
    if (!(a <= b)) return '开始日期不能晚于结束日期';
    if ((b - a) / 864e5 + 1 > 92) return '自定义时间范围不能超过 92 天';
  }
  return '';
}

/* ---- 选择任务：多选搜索 ---- */
function taRenderTaskTags() {
  document.getElementById('taTaskTags').innerHTML = TA.tasks.map(id => `<span class="ta-tag">${esc(taTaskLabel(id))}<button type="button" data-rm="${id}" title="移除">×</button></span>`).join('');
  document.getElementById('taTaskCount').textContent = `已选 ${TA.tasks.length} / ${TA_MAX_TASKS}`;
  document.querySelectorAll('#taTaskTags [data-rm]').forEach(b => b.addEventListener('click', () => { TA.tasks = TA.tasks.filter(x => x !== b.dataset.rm); taRenderTaskTags(); }));
  refreshIcons();
}
function taTaskDropdown() {
  const q = document.getElementById('taTaskInput').value.trim().toLowerCase();
  const list = V2_TASKS.filter(t => !TA.tasks.includes(t.id) && (!q || t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)));
  const dd = document.getElementById('taTaskDd');
  dd.innerHTML = list.length ? list.map(t => `<div class="ta-dd-item" data-id="${t.id}"><b>${t.id}</b> ${esc(t.name)}<span class="v2-muted"> · ${t.channel} · ${esc(plName(t.site))}</span> ${v2Tag(V2_TASK_STATUS, t.status)}</div>`).join('') : '<div class="ta-dd-empty">无匹配任务</div>';
  dd.classList.add('open');
  dd.querySelectorAll('[data-id]').forEach(el => el.addEventListener('mousedown', e => {
    e.preventDefault();
    if (TA.tasks.length >= TA_MAX_TASKS) { showToast(`最多选择 ${TA_MAX_TASKS} 个任务`); return; }
    TA.tasks.push(el.dataset.id); document.getElementById('taTaskInput').value = ''; taRenderTaskTags(); taTaskDropdown();
  }));
}

/* ---- 按活动：单选搜索 + 关联任务勾选剔除 ---- */
function taActivities() { return (typeof ACTIVITIES !== 'undefined' ? ACTIVITIES : []).filter(a => taActTaskIds(a.id).length); }
function taActDropdown() {
  const q = document.getElementById('taActInput').value.trim().toLowerCase();
  const list = taActivities().filter(a => !q || a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  const dd = document.getElementById('taActDd');
  dd.innerHTML = list.length ? list.map(a => `<div class="ta-dd-item" data-id="${a.id}"><b>${a.id}</b> ${esc(a.name)}<span class="v2-muted"> · ${taActTaskIds(a.id).length} 个任务</span></div>`).join('') : '<div class="ta-dd-empty">无匹配活动</div>';
  dd.classList.add('open');
  dd.querySelectorAll('[data-id]').forEach(el => el.addEventListener('mousedown', e => { e.preventDefault(); taSetActivity(el.dataset.id); dd.classList.remove('open'); }));
}
function taSetActivity(id) {
  TA.activity = id; TA.actOff = new Set();
  document.getElementById('taActInput').value = id ? `${id} ${taActName(id)}` : '';
  taRenderActTasks();
}
function taRenderActTasks() {
  const box = document.getElementById('taActTasks'); const info = document.getElementById('taActInfo');
  if (!TA.activity) { box.hidden = true; info.textContent = ''; return; }
  const ids = taActTaskIds(TA.activity);
  info.textContent = `关联任务 ${ids.length} 个，已选 ${ids.length - TA.actOff.size} 个`;
  box.hidden = false;
  box.innerHTML = `<div class="v2-hint" style="margin-bottom:6px">取消勾选可剔除不纳入聚合的任务</div>` + ids.map(id => {
    const t = v2Task(id);
    return `<label class="ta-act-task"><input type="checkbox" data-act-task="${id}" ${TA.actOff.has(id) ? '' : 'checked'}><b>${id}</b> ${esc(t.name)} <span class="v2-muted">· ${t.channel} · ${esc(plName(t.site))} · ${esc(taMeta(t).tpl)}</span> ${v2Tag(V2_TASK_STATUS, t.status)}</label>`;
  }).join('');
  box.querySelectorAll('[data-act-task]').forEach(cb => cb.addEventListener('change', () => {
    if (cb.checked) TA.actOff.delete(cb.dataset.actTask); else TA.actOff.add(cb.dataset.actTask);
    info.textContent = `关联任务 ${ids.length} 个，已选 ${ids.length - TA.actOff.size} 个`;
  }));
}

function taSetScope(s) {
  TA.scope = s;
  document.querySelectorAll('input[name="taScope"]').forEach(r => { r.checked = r.value === s; });
  document.querySelectorAll('.ta-scope-pane').forEach(p => { p.hidden = p.dataset.scope !== s; });
}

/* ================= 分析 ================= */
function taAnalyze() {
  const ids = taResolve(); const err = taValidate(ids);
  if (err) { showToast(err); return; }
  TA.ids = ids; TA.stage = null;
  document.getElementById('taResult').hidden = false;
  if (!ids.length) { taRenderEmptyScope(); return; }
  taRenderFunnel(); taRenderDimSelects(); taRenderFail(); taRenderCompare(); taRenderAi();
  refreshIcons();
}
function taScopeTasks() { return TA.ids.map(v2Task).filter(Boolean); }
function taRenderEmptyScope() {
  document.getElementById('taScopeLine').textContent = '范围内无任务';
  document.getElementById('taRates').innerHTML = '';
  document.getElementById('taFunnel').innerHTML = '<div class="fa-empty" style="color:var(--text-3)">当前条件下没有任务，请调整范围</div>';
  ['taFailTable', 'taCmpMain', 'taVendorCmp', 'taAi'].forEach(id => { document.getElementById(id).innerHTML = ''; });
  document.getElementById('taFailTotal').textContent = '';
}
function taDrill(extra = {}) {
  const p = new URLSearchParams({ task: (extra.task || TA.ids.join(',')) });
  Object.entries(extra).forEach(([k, v]) => { if (k !== 'task' && v != null && v !== '') p.set(k, v); });
  if (TA.stage && !extra.stage) p.set('stage', TA.stage);
  return `send-records.html?${p.toString()}`;
}

/* ---- 汇总漏斗（6.3.2 同口径，合并后各层直接求和） ---- */
function taRenderFunnel() {
  const tasks = taScopeTasks(); const f = taSumFunnel(tasks);
  const chs = [...new Set(tasks.map(t => t.channel))];
  document.getElementById('taScopeLine').textContent = `${tasks.length} 个任务 · ${chs.join(' / ')} · 按消息计，不去重`;
  const rates = [
    ['送达率', taRate.del(f), '已送达 ÷ 已提交；已提交 = 0 显示 -'],
    ['提交受理率', taRate.acc(f), '已提交 ÷（已提交 + 提交失败）'],
    ['回执率', taRate.rec(f), '（已送达 + 未送达）÷ 已提交'],
  ];
  document.getElementById('taRates').innerHTML = rates.map(([l, v, tip]) => `<span class="ta-rate">${l} <b>${taPctTxt(v)}</b>${tipIcon(tip)}</span>`).join('');
  const hasSms = chs.includes('SMS');
  const sub = (items, stage) => items.filter(([k, v]) => v && (k !== 'DNC' || hasSms)).map(([k, v]) => `<a href="${taDrill({ stage, cat: k })}">${k} ${fmtN(v)}</a>`).join(' · ') || '<span>无</span>';
  const row = (lab, v, cls, opt = {}) => `<div class="v2-fl ${cls}" ${opt.stage ? `data-stage="${opt.stage}" title="点击查看该层失败原因"` : ''}>
      <span class="lab">${lab}${opt.stage ? ' ▸' : ''}</span><span class="bar"><i style="width:${f.total ? (v / f.total * 100).toFixed(1) : 0}%"></i></span>
      <a class="val" href="${taDrill(opt.q || {})}">${fmtN(v)}</a><span class="rt">${pct(v, f.total)}</span></div>`;
  const ok = f.total === f.filtered + f.sendable && f.sendable === f.queued + f.submitted + f.submitFail + f.cancelled + f.expired
    && f.submitted === f.delivered + f.undelivered + f.noReceipt + f.waiting;
  document.getElementById('taFunnel').innerHTML = `<div class="v2-funnel">
    ${row('目标人群总数', f.total, '', {})}
    ${row('过滤排除', f.filtered, 'lv2 bad', { stage: '发送前拦截', q: { status: '已拦截' } })}
    <div class="v2-fl-sub">${sub(Object.entries(f.filters), '发送前拦截')}</div>
    ${row('可推送', f.sendable, 'lv2', {})}
    ${row('排队中', f.queued, 'lv2 ta-lv3', { q: { status: '排队中' } })}
    ${row('已提交', f.submitted, 'lv2 ta-lv3 ok', { q: { status: '已提交' } })}
    <div class="v2-fl-sub ta-sub3"><a href="${taDrill({ status: '已送达' })}">已送达 ${fmtN(f.delivered)}</a> · <a href="#" data-stage-link="未送达">未送达 ${fmtN(f.undelivered)} ▸</a> · <a href="${taDrill({ status: '待回执' })}">待回执 ${fmtN(f.waiting)}</a> · <a href="#" data-stage-link="过期无回执">无回执 ${fmtN(f.noReceipt)}</a></div>
    ${row('提交失败', f.submitFail, 'lv2 ta-lv3 bad', { stage: '提交失败', q: { status: '提交失败' } })}
    <div class="v2-fl-sub ta-sub3"><a href="${taDrill({ status: '已取消' })}">已取消 ${fmtN(f.cancelled)}</a> · <a href="${taDrill({ status: '已过期' })}">已过期 ${fmtN(f.expired)}</a></div>
  </div>${ok ? '' : '<div class="v2-callout danger"><i data-lucide="alert-triangle"></i>漏斗父子层不相等，请联系研发排查</div>'}`;
  document.querySelectorAll('#taFunnel [data-stage]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('a')) return; taFocusStage(el.dataset.stage); }));
  document.querySelectorAll('#taFunnel [data-stage-link]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); taFocusStage(el.dataset.stageLink); }));
}
function taFocusStage(stage) {
  TA.stage = stage; taRenderFail();
  document.getElementById('taFailTable').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- 失败原因分析表 ---- */
function taRenderDimSelects() {
  const hasSms = taScopeTasks().some(t => t.channel === 'SMS');
  if (!hasSms) { if (TA.rowDim === 'prefix') TA.rowDim = 'cat'; if (TA.colDim === 'prefix') TA.colDim = TA.rowDim === 'vendor' ? 'cat' : 'vendor'; }
  const opts = sel => Object.entries(TA_DIMS).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''} ${k === 'prefix' && !hasSms ? 'disabled' : ''}>${l}${k === 'prefix' ? '（仅 SMS）' : ''}</option>`).join('');
  document.getElementById('taRowDim').innerHTML = opts(TA.rowDim);
  document.getElementById('taColDim').innerHTML = opts(TA.colDim);
}
function taLabel(dim, v) {
  if (dim === 'task') return taTaskLabel(v);
  if (dim === 'vendor' && v === FA_NO_VENDOR) return '无（发送前拦截）';
  if (dim === 'account' && v === FA_NO_VENDOR) return '无（发送前拦截）';
  if (dim === 'prefix' && v === '-') return '非 SMS';
  return v;
}
function taFailAtoms() {
  const all = taScopeTasks().flatMap(taAtoms);
  return TA.stage ? all.filter(a => a.stage === TA.stage || (TA.stage === '过期无回执' && a.stage === '过期无回执')) : all;
}
function taRenderFail() {
  const atoms = taFailAtoms(); const total = atoms.reduce((s, a) => s + a.count, 0);
  document.getElementById('taFailTotal').textContent = `失败 ${fmtN(total)} 条（已拦截 + 提交失败 + 未送达 + 已过期 + 无回执；已取消、待回执不计）`;
  document.getElementById('taStageChip').innerHTML = TA.stage ? `<span class="fa-filter-chip">仅看：${TA.stage}<button type="button" id="taStageX" title="清除">×</button></span>` : '';
  if (TA.stage) document.getElementById('taStageX').addEventListener('click', () => { TA.stage = null; taRenderFail(); });
  faRenderTable(document.getElementById('taFailTable'), atoms, {
    rowDim: TA.rowDim, colDim: TA.colDim, dimLabel: d => TA_DIMS[d], label: taLabel, drill: taDrill, emptyText: '无失败',
  });
}
function taOnDimChange(which) {
  const r = document.getElementById('taRowDim').value; const c = document.getElementById('taColDim').value;
  if (r === c) { showToast('行列维度不可相同'); document.getElementById(which === 'row' ? 'taRowDim' : 'taColDim').value = which === 'row' ? TA.rowDim : TA.colDim; return; }
  TA.rowDim = r; TA.colDim = c; taRenderFail();
}

/* ---- 对比区 ---- */
function taTplHistory(tpl) {
  return Array.from({ length: 9 }, (_, i) => ({ id: `${tpl.replace('TPL-', '')}·${String(i + 1).padStart(2, '0')}`, date: `06-${String(2 + i * 3).padStart(2, '0')}`, rate: 95.7 + faRand(tpl + i) * 1.4 }));
}
function taCompareInfo() {
  const tasks = taScopeTasks(); const f = taSumFunnel(tasks); const cur = taRate.del(f);
  const tpls = [...new Set(tasks.map(t => taMeta(t).tpl))];
  if (tpls.length === 1 && cur != null) {
    const hist = taTplHistory(tpls[0]); const mean = hist.reduce((s, h) => s + h.rate, 0) / hist.length;
    return { mode: 'tpl', tpl: tpls[0], hist, mean, cur, f };
  }
  const chs = [...new Set(tasks.map(t => t.channel))];
  return { mode: 'tasks', cur, f, mean: chs.length === 1 ? TA_CH_MEAN[chs[0]] : null, meanLabel: chs.length === 1 ? `近 30 天 ${chs[0]} 均值` : '' };
}
function taRenderCompare() {
  const info = taCompareInfo(); const box = document.getElementById('taCmpMain');
  if (info.mode === 'tpl') {
    const diff = info.cur - info.mean; const bad = diff <= -2;
    const vals = info.hist.map(h => h.rate).concat(info.cur); const labels = info.hist.map(h => h.date).concat('本次');
    const max = Math.max(...vals); const min = Math.min(...vals) - 3;
    box.innerHTML = `<b class="ta-sub-title">同模板近 10 次任务 送达率趋势</b> <span class="v2-hint">${esc(info.tpl)} ${esc(TA_TEMPLATES[info.tpl] || '')}</span>
      <div class="ta-spark">${vals.map((v, i) => `<div class="ta-spark-col${i === vals.length - 1 ? (bad ? ' cur bad' : ' cur') : ''}" title="${esc(labels[i])}：${v.toFixed(1)}%"><span>${v.toFixed(1)}</span><i style="height:${((v - min) / (max - min) * 90 + 10).toFixed(0)}%"></i><em>${esc(labels[i])}</em></div>`).join('')}</div>
      <div class="ta-cmp-line">本次 <b class="${bad ? 'text-danger' : ''}">${info.cur.toFixed(1)}%</b> ${diff < 0 ? '↓ 低于' : '↑ 高于'}均值 ${info.mean.toFixed(1)}%（${diff >= 0 ? '+' : ''}${diff.toFixed(1)} 个百分点）${bad ? ' <span class="tag tag-danger">低于均值 2 个百分点以上</span>' : ''}</div>`;
    document.getElementById('taCmpTitle').textContent = '对比 · 同模板历史';
  } else {
    const tasks = taScopeTasks();
    const rows = tasks.map(t => { const r = taRate.del(taFunnel(t)); return { label: taTaskLabel(t.id), value: r || 0, text: taPctTxt(r), cls: r == null ? 'gray' : '' }; });
    box.innerHTML = `<b class="ta-sub-title">范围内各任务送达率</b> <span class="v2-hint">范围内任务模板不一致，展示各任务对比</span>
      <div style="margin-top:12px">${faBarList(rows, 100)}</div>
      <div class="ta-cmp-line">合计 <b>${taPctTxt(info.cur)}</b>${info.mean != null && info.cur != null ? `，${info.meanLabel} ${info.mean.toFixed(1)}%` : ''}</div>`;
    document.getElementById('taCmpTitle').textContent = '对比 · 范围内任务';
  }
  const sel = document.getElementById('taVendorTask');
  const tasks = taScopeTasks();
  sel.innerHTML = `<option value="">范围内合计</option>` + tasks.map(t => `<option value="${t.id}">${esc(taTaskLabel(t.id))}</option>`).join('');
  sel.value = tasks.length === 1 ? tasks[0].id : '';
  taRenderVendorCmp();
}
function taRenderVendorCmp() {
  const tid = document.getElementById('taVendorTask').value;
  const tasks = tid ? [v2Task(tid)] : taScopeTasks();
  document.getElementById('taVendorTitle').textContent = tid ? '同任务不同供应商对比' : '供应商对比（范围内合计）';
  const agg = {};
  tasks.forEach(t => {
    const f = taFunnel(t);
    taVendorParts(t, f).forEach(p => {
      const a = agg[p.vendor] || (agg[p.vendor] = { vendor: p.vendor, submitted: 0, submitFail: 0, delivered: 0, undelivered: 0, retry: 0, sms: t.channel === 'SMS' });
      a.submitted += taPartSubmitted(p); a.submitFail += p.submitFail; a.delivered += p.delivered; a.undelivered += p.undelivered; a.retry += p.retry || 0;
    });
  });
  const atoms = tasks.flatMap(taAtoms).filter(a => a.vendor !== FA_NO_VENDOR);
  const topCat = v => { const m = {}; atoms.filter(a => a.vendor === v).forEach(a => { m[a.cat] = (m[a.cat] || 0) + a.count; }); const s = Object.values(m).reduce((x, y) => x + y, 0); const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return e ? `${e[0]} ${pct(e[1], s, 0)}` : '-'; };
  const list = Object.values(agg).filter(a => a.submitted + a.submitFail > 0).sort((a, b) => b.submitted - a.submitted);
  if (!list.length) { document.getElementById('taVendorCmp').innerHTML = '<div class="fa-empty" style="color:var(--text-3)">尚无提交至供应商的消息</div>'; return; }
  const best = Math.max(...list.map(a => (a.submitted ? a.delivered / a.submitted : 0)));
  document.getElementById('taVendorCmp').innerHTML = `<div class="table-scroll"><table class="table stats-table"><thead><tr>
    <th>供应商</th><th class="v2-num">已提交</th><th class="v2-num">首发 / 重试</th><th class="v2-num">提交失败</th><th class="v2-num">提交受理率</th><th class="v2-num">送达率</th><th class="v2-num">回执率</th><th>主要失败分类</th></tr></thead><tbody>
    ${list.map(a => { const d = a.submitted ? a.delivered / a.submitted : 0; return `<tr${d < best - .02 ? ' class="v2-row-warn"' : ''}><td>${esc(a.vendor)}${a.retry && a.retry === a.submitted ? ' <span class="tag tag-gray-outline">重试</span>' : ''}</td>
      <td class="v2-num"><a class="fa-cell" href="${taDrill({ task: tid || TA.ids.join(','), vendor: a.vendor, status: '已提交' })}">${fmtN(a.submitted)}</a></td>
      <td class="v2-num">${a.sms ? `${fmtN(a.submitted - a.retry)} / ${fmtN(a.retry)}` : '-'}</td>
      <td class="v2-num">${fmtN(a.submitFail)}</td><td class="v2-num">${pct(a.submitted, a.submitted + a.submitFail)}</td>
      <td class="v2-num"><b>${pct(a.delivered, a.submitted)}</b></td><td class="v2-num">${pct(a.delivered + a.undelivered, a.submitted)}</td><td>${esc(topCat(a.vendor))}</td></tr>`; }).join('')}
    </tbody></table></div><div class="v2-hint" style="margin-top:6px">短信经直连供应商提交失败后转聚合供应商的记为重试，计入最终供应商；送达率低于最优供应商 2 个百分点以上的行标黄</div>`;
}

/* ---- AI 失败诊断（6.3.4，P1）：输入只含聚合数字与分类名 ---- */
function taDiagnose() {
  const atoms = taScopeTasks().flatMap(taAtoms);
  const total = atoms.reduce((s, a) => s + a.count, 0);
  const combos = {};
  atoms.filter(a => a.vendor !== FA_NO_VENDOR).forEach(a => { const k = `${a.vendor}|${a.cat}`; combos[k] = (combos[k] || 0) + a.count; });
  const vendorFail = Object.values(combos).reduce((s, v) => s + v, 0);
  const top = Object.entries(combos).sort((a, b) => b[1] - a[1]);
  if (!top.length) return null;
  const [vendor, cat] = top[0][0].split('|'); const info = taCompareInfo();
  const share = top[0][1] / vendorFail * 100;
  const diff = info.mean != null && info.cur != null ? info.cur - info.mean : null;
  const diffTxt = diff == null ? '' : `，送达率${diff < 0 ? '低于' : '高于'}${info.mode === 'tpl' ? '模板' : '同通道'}均值${Math.abs(diff).toFixed(1)}个点`;
  let text = `主因：${vendor}「${cat}」占供应商侧失败${share.toFixed(0)}%${diffTxt}；建议${faCat(cat).action}。`;
  if (text.length > 60) text = `主因：${vendor}「${cat}」占${share.toFixed(0)}%${diffTxt}；建议${faCat(cat).action}。`.slice(0, 60);
  return { text, basis: [
    ['范围内失败总数', fmtN(total)], ['其中供应商侧失败（提交失败 + 未送达 + 无回执）', fmtN(vendorFail)],
    ['主因组合', `${vendor} × ${cat}：${fmtN(top[0][1])}（${share.toFixed(1)}%）`],
    ['第二组合', top[1] ? `${top[1][0].replace('|', ' × ')}：${fmtN(top[1][1])}（${(top[1][1] / vendorFail * 100).toFixed(1)}%）` : '-'],
    ['本次送达率', taPctTxt(info.cur)], [info.mode === 'tpl' ? '同模板近 9 次均值' : (info.meanLabel || '历史均值'), info.mean != null ? info.mean.toFixed(1) + '%' : '-'],
    ['建议动作来源', '失败码映射表（6.1.4）'],
  ] };
}
function taRenderAi() {
  const box = document.getElementById('taAi');
  let d = null;
  try { d = taDiagnose(); } catch (e) { d = undefined; }
  if (d === null) { box.innerHTML = ''; return; }
  const head = `<div class="ta-ai-head"><span class="tag tag-ai"><i data-lucide="sparkles"></i>AI 生成</span><b>失败诊断</b> <span class="tag tag-gray-outline">P1</span>
    <span class="v2-hint">基于失败原因表与对比区的聚合数字生成，不读取消息内容</span>
    <button class="link-btn" id="taAiFold" type="button" style="margin-left:auto">收起</button></div>`;
  if (d === undefined) { box.innerHTML = `${head}<div class="ta-ai-body v2-muted">诊断生成失败，可稍后重试；不影响其他分析结果。</div>`; refreshIcons(); return; }
  box.innerHTML = `${head}<div class="ta-ai-body" id="taAiBody"><div class="ta-ai-text">${esc(d.text)}</div>
    <div class="v2-flex" style="margin-top:6px"><button class="link-btn" type="button" id="taAiBasisBtn">查看依据</button><button class="link-btn" type="button" id="taAiRegen">重新生成</button></div>
    <div class="ta-ai-basis" id="taAiBasis" hidden><table class="table"><tbody>${d.basis.map(([k, v]) => `<tr><td class="v2-muted">${k}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div></div>`;
  document.getElementById('taAiBasisBtn').addEventListener('click', e => { const b = document.getElementById('taAiBasis'); b.hidden = !b.hidden; e.target.textContent = b.hidden ? '查看依据' : '收起依据'; });
  document.getElementById('taAiRegen').addEventListener('click', () => { taRenderAi(); showToast('已重新生成诊断'); });
  document.getElementById('taAiFold').addEventListener('click', e => { const b = document.getElementById('taAiBody'); b.hidden = !b.hidden; e.target.textContent = b.hidden ? '展开' : '收起'; });
  refreshIcons();
}

/* ================= 常用分析（可选） ================= */
function taSavedList() { try { return JSON.parse(localStorage.getItem('taSavedViews') || '[]'); } catch (e) { return []; } }
function taRenderSaved() {
  document.getElementById('taSaved').innerHTML = `<option value="">常用分析</option>` + taSavedList().map((v, i) => `<option value="${i}">${esc(v.name)}</option>`).join('');
}
function taCurrentView() {
  return { scope: TA.scope, tasks: TA.tasks.slice(), activity: TA.activity, actOff: [...TA.actOff], rowDim: TA.rowDim, colDim: TA.colDim,
    cond: { range: document.getElementById('taRange').value, from: document.getElementById('taFrom').value, to: document.getElementById('taTo').value, pl: TA.ms.pl.get(), ch: TA.ms.ch.get(), tpl: TA.ms.tpl.get() } };
}
function taApplyView(v) {
  taSetScope(v.scope); TA.tasks = v.tasks || []; taRenderTaskTags();
  taSetActivity(v.activity || ''); TA.actOff = new Set(v.actOff || []); taRenderActTasks();
  TA.rowDim = v.rowDim || 'cat'; TA.colDim = v.colDim || 'vendor';
  const c = v.cond || {};
  document.getElementById('taRange').value = c.range || '7d'; document.getElementById('taDates').hidden = c.range !== 'custom';
  if (c.from) document.getElementById('taFrom').value = c.from; if (c.to) document.getElementById('taTo').value = c.to;
  TA.ms.pl.set(c.pl); TA.ms.ch.set(c.ch); TA.ms.tpl.set(c.tpl);
  taAnalyze();
}
function taSaveView() {
  v2Modal({ title: '保存为常用分析', okText: '保存', width: 460,
    body: `<div class="v2-form"><label class="req">名称</label><input class="input" id="taViewName" maxlength="30" placeholder="如：世界杯活动整体送达"></div>
      <div class="v2-hint">保存当前范围与分析维度，下次在右上角「常用分析」一键打开</div>`,
    onOk: root => {
      const name = root.querySelector('#taViewName').value.trim();
      if (!name) { showToast('请输入名称'); return false; }
      const list = taSavedList(); list.push({ name, ...taCurrentView() });
      localStorage.setItem('taSavedViews', JSON.stringify(list)); taRenderSaved(); showToast('已保存为常用分析'); return true;
    } });
}

/* ================= 初始化 ================= */
function taReset() {
  taSetScope('tasks'); TA.tasks = []; taRenderTaskTags(); taSetActivity('');
  document.getElementById('taRange').value = '7d'; document.getElementById('taDates').hidden = true;
  Object.values(TA.ms).forEach(m => m.set([]));
  TA.rowDim = 'cat'; TA.colDim = 'vendor'; TA.stage = null;
  document.getElementById('taResult').hidden = true;
}
function taInitFilters() {
  TA.ms.pl = faMultiSelect(document.getElementById('taPl'), { options: V2_PRODUCT_LINES.filter(p => p.status === '启用').map(p => ({ v: p.siteId, l: p.name, grp: `业务线 ${p.bl}`, sub: true })) });
  TA.ms.ch = faMultiSelect(document.getElementById('taCh'), { options: V2_CHANNELS.map(c => ({ v: c, l: c })) });
  TA.ms.tpl = faMultiSelect(document.getElementById('taTpl'), { options: Object.entries(TA_TEMPLATES).map(([k, n]) => ({ v: k, l: `${k} ${n}` })) });
  document.getElementById('taRange').addEventListener('change', e => {
    document.getElementById('taDates').hidden = e.target.value !== 'custom';
    if (e.target.value !== 'custom') taAnalyze();
  });
  ['taFrom', 'taTo'].forEach(id => document.getElementById(id).addEventListener('change', () => taAnalyze()));
}
function taBind() {
  document.querySelectorAll('input[name="taScope"]').forEach(r => r.addEventListener('change', () => taSetScope(r.value)));
  const ti = document.getElementById('taTaskInput');
  ti.addEventListener('focus', taTaskDropdown); ti.addEventListener('input', taTaskDropdown);
  ti.addEventListener('blur', () => document.getElementById('taTaskDd').classList.remove('open'));
  const ai = document.getElementById('taActInput');
  ai.addEventListener('focus', () => { ai.select(); taActDropdown(); }); ai.addEventListener('input', taActDropdown);
  ai.addEventListener('blur', () => document.getElementById('taActDd').classList.remove('open'));
  document.getElementById('taRun').addEventListener('click', taAnalyze);
  document.getElementById('taReset').addEventListener('click', taReset);
  document.getElementById('taSave').addEventListener('click', taSaveView);
  const exp = () => { if (!TA.ids.length) { showToast('请先分析'); return; } showToast('已导出（原型）'); };
  document.getElementById('taExport').addEventListener('click', exp);
  document.getElementById('taExport2').addEventListener('click', exp);
  document.getElementById('taRowDim').addEventListener('change', () => taOnDimChange('row'));
  document.getElementById('taColDim').addEventListener('change', () => taOnDimChange('col'));
  document.getElementById('taVendorTask').addEventListener('change', taRenderVendorCmp);
  document.getElementById('taSaved').addEventListener('change', e => {
    const v = taSavedList()[e.target.value]; if (v) { taApplyView(v); showToast(`已打开常用分析「${v.name}」`); }
    e.target.value = '';
  });
}
function taFromUrl() {
  const q = new URLSearchParams(location.search);
  if (q.get('task')) {
    const ids = q.get('task').split(',').filter(id => v2Task(id));
    if (ids.length) { taSetScope('tasks'); TA.tasks = ids.slice(0, TA_MAX_TASKS); }
  } else if (q.get('activity') && taActTaskIds(q.get('activity')).length) {
    taSetScope('activity'); taSetActivity(q.get('activity'));
  } else if (q.get('channel') || q.get('range')) {
    taSetScope('cond');
    if (q.get('range')) document.getElementById('taRange').value = q.get('range');
    if (q.get('channel')) TA.ms.ch.set([q.get('channel')]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-stats', 'stats-task'); renderTopbar();
  taInitFilters(); taBind(); taFromUrl(); taRenderTaskTags(); taRenderSaved();
  taAnalyze();
  refreshIcons(); bindDrawerClose();
});

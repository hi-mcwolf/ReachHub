/* 发送记录页（二期改造）：筛选 + 统计卡 + 发送明细 + 详情抽屉
 * 口径：PRD 4.4.5 消息状态（替代一期「发送状态」「回执状态」两列）、6.1.2 发送记录字段改造、6.1.4 失败分类
 * 任务数据复用 V2_TASKS + task-records-data.js（与任务记录同一批任务 ID）；支持 ?task=ID[&status=a,b][&cat=x][&channel=SMS] 预筛 */

const SR_MSG_STATUS = {
  blocked:     { label: '已拦截',   cls: 'tag-gray' },
  queued:      { label: '排队中',   cls: 'tag-primary' },
  submitted:   { label: '已提交',   cls: 'tag-info' },
  submitFail:  { label: '提交失败', cls: 'tag-danger' },
  delivered:   { label: '已送达',   cls: 'tag-success' },
  undelivered: { label: '未送达',   cls: 'tag-danger' },
  expired:     { label: '已过期',   cls: 'tag-warning' },
  noReceipt:   { label: '无回执',   cls: 'tag-gray-outline' },
  cancelled:   { label: '已取消',   cls: 'tag-gray' },
};
const SR_FAIL_STATUSES = ['blocked', 'submitFail', 'undelivered', 'expired', 'noReceipt'];

/* 发送前拦截分类（6.1.4「发送前拦截」阶段，触达自身规则） */
const SR_BLOCK_CATS = {
  黑名单: '调整人群：剔除黑名单用户', DND: '调整人群或改到免打扰窗口外', DNC: '调整人群：剔除 DNC 名单', 重复: '检查人群去重设置',
  频控: '调整频控策略或错峰发送', 格式无效: '清洗名单', 退订: '保持退订，勿重复触达',
};
const SR_SUBMIT_FAIL_CATS = ['vendor', 'rate', 'content'];
const SR_UNDELIVERED_CATS = ['invalid', 'carrier', 'reject', 'unknown'];

/* 状态计划（按任务状态生成样例消息） */
const SR_PLAN = {
  sending: ['delivered', 'delivered', 'submitted', 'undelivered', 'queued', 'blocked', 'submitFail', 'delivered'],
  queued:  ['queued', 'queued', 'blocked', 'queued'],
  done:    ['delivered', 'delivered', 'undelivered', 'noReceipt', 'blocked', 'submitFail', 'delivered'],
  stopped: ['delivered', 'undelivered', 'cancelled', 'cancelled', 'blocked'],
  failed:  ['submitFail', 'submitFail', 'cancelled', 'blocked'],
};

const SR_RECIPIENTS = { SMS: ['0917***2231', '0918***5520', '0927***0182', '0995***7713'], 邮件: ['jua***@gmail.com', 'mar***@yahoo.com', 'kev***@outlook.com'], Push: ['token:fcm_8f2a…', 'token:apns_1c9e…'], 站内信: ['uid 10023881', 'uid 10077120'], 'Viber Biz': ['viber:+63917***2231', 'viber:+63918***5520'], 'Viber Bot': ['viber:+63927***0182'], 'Messenger Biz': ['psid:47***09'], 'Messenger Bot': ['psid:58***21'], WhatsApp: ['+63995***7713'] };

function srCodeFor(cat, vendor) {
  const row = V2_FAIL_ROWS.find(r => r.cat === cat && r.vendor === vendor) || V2_FAIL_ROWS.find(r => r.cat === cat);
  return row ? { code: row.codes[0][0], msg: row.codes[0][1] } : { code: '-', msg: '-' };
}

const SEND_RECORDS = (() => {
  const users = USER_ACCOUNT_SAMPLES;
  const records = [];
  let seq = 0;
  TASK_RECORDS.filter(t => !trNotStarted(t)).forEach((t, ti) => {
    const plan = SR_PLAN[t.status] || SR_PLAN.done;
    t.routes.forEach((r, ri) => {
      const n = t.routes.length > 1 ? 4 : plan.length;
      for (let i = 0; i < n; i++) {
        const status = plan[(i + ri * 2) % plan.length];
        const k = seq++;
        const ver = trActiveVersionOf(t);
        const hh = String(Number((t.timing.match(/(\d{2}):\d{2}/) || [0, '10'])[1])).padStart(2, '0');
        const mm = String((k * 7) % 60).padStart(2, '0');
        const date = (t.timing.match(/\d{4}-\d{2}-\d{2}/) || ['2026-07-13'])[0];
        const sendTime = status === 'queued' ? '-' : `${date} ${hh}:${mm}:${String((k * 13) % 60).padStart(2, '0')}`;
        let cat = null, raw = { code: '-', msg: '-' };
        if (status === 'blocked') {
          const keys = Object.keys(SR_BLOCK_CATS).filter(x => x !== 'DNC' || r.channel === 'SMS');
          cat = keys[k % keys.length];
          raw = { code: '-', msg: `触达规则拦截：${cat}` };
        }
        if (status === 'submitFail') { cat = t.status === 'failed' ? 'vendor' : SR_SUBMIT_FAIL_CATS[k % 3]; raw = t.status === 'failed' ? { code: 'S-401', msg: 'Unauthorized: invalid account credential' } : srCodeFor(cat, r.vendor); }
        if (status === 'undelivered') { cat = SR_UNDELIVERED_CATS[k % 4]; raw = srCodeFor(cat, r.vendor); }
        if (status === 'expired' || status === 'noReceipt') { cat = 'expired'; raw = { code: '-', msg: status === 'noReceipt' ? '超过回执等待窗口仍无回执' : '超过任务有效期' }; }

        // 短信：直连提交失败经路由重试到聚合供应商（首发 / 重试）
        const retried = r.channel === 'SMS' && status === 'delivered' && k % 3 === 0 && t.category !== 'OTP 事务';
        const finalVendor = retried ? 'NXLink' : r.vendor;
        const finalAccount = retried ? 'BP-NX' : r.account;
        const submittedLike = ['submitted', 'delivered', 'undelivered', 'expired', 'noReceipt'].includes(status);
        const attempts = [];
        if (status !== 'blocked' && status !== 'queued' && status !== 'cancelled') {
          attempts.push({ vendor: r.vendor, account: r.account, time: sendTime, result: retried ? '提交失败' : (status === 'submitFail' ? '提交失败' : '已提交'), code: retried ? 'G-500' : (status === 'submitFail' ? raw.code : '0') });
          if (retried) attempts.push({ vendor: 'NXLink', account: 'BP-NX', time: sendTime.replace(/:(\d{2})$/, (m, s) => ':' + String((Number(s) + 4) % 60).padStart(2, '0')), result: '已提交', code: '0' });
        }
        const text = typeof ver.content === 'string' ? ver.content : '';
        const segs = r.channel === 'SMS' ? (/[^\x00-\x7F]/.test(text) ? (text.length <= 70 ? 1 : Math.ceil(text.length / 67)) : (text.length <= 160 ? 1 : Math.ceil(text.length / 153))) : 1;
        records.push({
          recordId: `S${20260713000 + k * 37}`,
          sendTime, status, cat, rawCode: raw.code, rawMsg: raw.msg,
          attempt: retried ? '重试' : '首发', attempts,
          taskId: t.id, taskName: t.name, taskCode: t.taskCode || null, source: t.source, app: t.app || null, operator: t.operator || t.creator,
          category: t.category, site: t.site, productLine: t.productLine, activityId: t.activityId, activityName: t.activityName,
          channel: r.channel, sub: r.sub || null, vendor: finalVendor, account: finalAccount, sender: r.sender || '-',
          content: text, contentVersion: ver.v, title: t.email?.subject || null,
          billable: submittedLike ? segs : null,
          vendorMessageId: submittedLike ? `MSG-${(finalVendor || 'IN').replace(/\W/g, '')}-${883421 + k * 17}` : '-',
          receiptId: ['delivered', 'undelivered'].includes(status) ? `RC${20260713000 + k * 41}` : '-',
          userAccount: users[k % users.length],
          recipient: (SR_RECIPIENTS[r.channel] || ['-'])[k % (SR_RECIPIENTS[r.channel] || ['-']).length],
        });
      }
    });
  });
  return records;
})();

function trActiveVersionOf(t) { return t.versions.find(v => v.state === 'active') || t.versions[t.versions.length - 1]; }

/* ---------------- 状态 ---------------- */
const PAGE_SIZE = 10;
let currentPage = 1;
let filtered = [...SEND_RECORDS];
let productLineFilter = null;
let srPre = { tasks: [], task: null, statuses: [], cat: null, channel: null, vendor: null };

const fmt = v => (v === null || v === undefined || v === '' || v === '-') ? '-' : v;

function srCatLabel(r) {
  if (!r.cat) return null;
  if (r.status === 'blocked') return { label: `发送前拦截 · ${r.cat}`, action: SR_BLOCK_CATS[r.cat] };
  const c = V2_FAIL_CATS.find(x => x.key === r.cat);
  return c ? { label: c.label, action: c.action } : { label: r.cat, action: '-' };
}

/* ---------------- 统计卡（与任务详情漏斗同口径：v2Funnel） ---------------- */
function srKpiTasks() {
  const v = id => document.getElementById(id).value.trim().toLowerCase();
  const task = v('fTask'), activity = v('fActivity');
  const source = document.getElementById('fSource').value;
  const category = document.getElementById('fCategory').value;
  const channel = document.getElementById('fChannel').value || srPre.channel;
  const pls = productLineFilter?.getValue() || [];
  return TASK_RECORDS.filter(t => !trNotStarted(t) && (srPre.tasks.length < 2 || srPre.tasks.includes(t.id)) &&
    (!task || t.id.toLowerCase().includes(task) || t.name.toLowerCase().includes(task)) &&
    (!activity || (t.activityId || '').toLowerCase().includes(activity) || (t.activityName || '').toLowerCase().includes(activity)) &&
    (!source || t.source === source) && (!category || t.category === category) &&
    (!pls.length || pls.includes(t.site)) && (!channel || t.channels.includes(channel)))
    .flatMap(t => (channel ? [channel] : t.channels).map(ch => v2Funnel({ ...t, channel: ch, target: trChannelTarget(t, ch) })));
}

function renderKpis() {
  const fs = srKpiTasks();
  const sum = k => fs.reduce((a, f) => a + f[k], 0);
  const submitted = sum('submitted'), delivered = sum('delivered');
  const kpis = [
    { title: '已提交', value: fmtN(submitted), cls: '', tip: '供应商受理的消息数（含已送达 / 未送达 / 无回执 / 待回执）' },
    { title: '已送达', value: fmtN(delivered), cls: 'kpi-green' },
    { title: '未送达', value: fmtN(sum('undelivered')), cls: 'kpi-red' },
    { title: '提交失败', value: fmtN(sum('submitFail')), cls: 'kpi-red' },
    { title: '送达率', value: pct(delivered, submitted), cls: 'kpi-blue', tip: '已送达 ÷ 已提交' },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-title">${k.title}${k.tip ? tipIcon(k.tip) : ''}</div>
      <div class="kpi-body"><span class="kpi-value ${k.cls}">${k.value}</span></div>
    </div>`).join('');
}

/* ---------------- 筛选 ---------------- */
function srFillSelects() {
  const opt = (v, l = v) => `<option value="${esc(v)}">${esc(l)}</option>`;
  document.getElementById('fStatus').innerHTML = opt('', '全部') + Object.entries(SR_MSG_STATUS).map(([k, s]) => opt(k, s.label)).join('');
  document.getElementById('fCat').innerHTML = opt('', '全部')
    + `<optgroup label="发送前拦截">${Object.keys(SR_BLOCK_CATS).map(k => opt(k)).join('')}</optgroup>`
    + `<optgroup label="提交失败 / 未送达 / 过期">${V2_FAIL_CATS.map(c => opt(c.key, c.label)).join('')}</optgroup>`;
  const vendors = [...new Set([...V2_VENDORS, ...SEND_RECORDS.map(r => r.vendor).filter(Boolean)])];
  document.getElementById('fVendor').innerHTML = opt('', '全部') + vendors.map(v => opt(v)).join('');
  const senders = [...new Set(SEND_RECORDS.flatMap(r => [r.account, r.sender]).filter(x => x && x !== '-'))];
  document.getElementById('fSender').innerHTML = opt('', '全部') + senders.map(v => opt(v)).join('');
}

function applyFilters() {
  const v = id => document.getElementById(id).value.trim().toLowerCase();
  const recordId = v('fRecordId'), task = v('fTask'), taskCode = v('fTaskCode'), content = v('fContent'), activity = v('fActivity'), user = v('fUser');
  const g = id => document.getElementById(id).value;
  const channel = g('fChannel'), source = g('fSource'), category = g('fCategory'), status = g('fStatus'), cat = g('fCat'),
    attempt = g('fAttempt'), vendor = g('fVendor'), sender = g('fSender');
  const statuses = status ? [status] : srPre.statuses;
  const productLines = productLineFilter?.getValue() || [];

  filtered = SEND_RECORDS.filter(r =>
    (!recordId || r.recordId.toLowerCase().includes(recordId)) &&
    (!task || r.taskName.toLowerCase().includes(task) || r.taskId.toLowerCase().includes(task)) &&
    (!taskCode || (r.taskCode || '').toLowerCase().includes(taskCode)) &&
    (!content || (r.content || '').toLowerCase().includes(content)) &&
    (!activity || (r.activityId || '').toLowerCase().includes(activity) || (r.activityName || '').toLowerCase().includes(activity)) &&
    (!productLines.length || productLines.includes(r.site)) &&
    (!channel || r.channel === channel) &&
    (!srPre.channel || r.channel === srPre.channel) &&
    (srPre.tasks.length < 2 || srPre.tasks.includes(r.taskId)) &&
    (!source || r.source === source) &&
    (!category || r.category === category) &&
    (!statuses.length || statuses.includes(r.status)) &&
    (!cat || r.cat === cat) &&
    (!attempt || r.attempt === attempt) &&
    (!vendor || r.vendor === vendor) &&
    (!sender || r.account === sender || r.sender === sender) &&
    (!user || r.userAccount.toLowerCase().includes(user) || r.recipient.toLowerCase().includes(user))
  );
  currentPage = 1;
  renderKpis();
  renderTable();
}

function resetFilters() {
  ['fRecordId', 'fTask', 'fTaskCode', 'fContent', 'fActivity', 'fUser'].forEach(id => document.getElementById(id).value = '');
  ['fChannel', 'fSource', 'fCategory', 'fStatus', 'fCat', 'fAttempt', 'fVendor', 'fSender'].forEach(id => document.getElementById(id).value = '');
  productLineFilter?.setValue([]);
  clearPrefilter(false);
  applyFilters();
}

/* ---------------- ?task= 预筛 ---------------- */
/* 兼容任务详情漏斗与任务分析页的下钻参数：task 可逗号多选；status 接受 key 或中文状态名；stage = 6.1.4 阶段；cat 接受 key 或分类名；vendor */
const SR_STAGE_STATUS = { 发送前拦截: ['blocked'], 提交失败: ['submitFail'], 未送达: ['undelivered'], 过期无回执: ['expired', 'noReceipt'] };
function srStatusKey(s) { return SR_MSG_STATUS[s] ? s : Object.keys(SR_MSG_STATUS).find(k => SR_MSG_STATUS[k].label === s) || (s === '待回执' ? 'submitted' : null); }
function srCatKey(c) { return !c ? null : (SR_BLOCK_CATS[c] || V2_FAIL_CATS.some(x => x.key === c)) ? c : (V2_FAIL_CATS.find(x => x.label === c)?.key || c); }

function readPrefilter() {
  const q = new URLSearchParams(location.search);
  const tasks = (q.get('task') || '').split(',').map(x => x.trim()).filter(Boolean);
  let statuses = (q.get('status') || '').split(',').map(srStatusKey).filter(Boolean);
  if (!statuses.length && SR_STAGE_STATUS[q.get('stage')]) statuses = SR_STAGE_STATUS[q.get('stage')];
  srPre = { tasks, task: tasks[0] || null, statuses, cat: srCatKey(q.get('cat')), channel: q.get('channel'), vendor: q.get('vendor') };
  if (tasks.length === 1) document.getElementById('fTask').value = tasks[0];
  if (srPre.statuses.length === 1) { document.getElementById('fStatus').value = srPre.statuses[0]; srPre.statuses = []; }
  if (srPre.cat) document.getElementById('fCat').value = srPre.cat;
  if (srPre.channel) document.getElementById('fChannel').value = srPre.channel;
  if (srPre.vendor) document.getElementById('fVendor').value = srPre.vendor;
  renderPrefilter();
}

function renderPrefilter() {
  const bar = document.getElementById('srPrefilter');
  if (!srPre.task) { bar.hidden = true; return; }
  const t = srPre.tasks.length === 1 ? TASK_RECORDS.find(x => x.id === srPre.task) : null;
  const parts = [`任务 <b>${srPre.tasks.map(esc).join('、')}</b>${t ? ' ' + esc(t.name) : ''}`];
  if (srPre.statuses.length) parts.push(`消息状态：${srPre.statuses.map(s => SR_MSG_STATUS[s].label).join(' / ')}`);
  if (srPre.channel) parts.push(`通道：${esc(srPre.channel)}`);
  bar.innerHTML = `<i data-lucide="filter"></i><span>已按 ${parts.join(' · ')} 预筛</span>
    ${t ? `<a class="link-btn" href="task-records.html?task=${esc(srPre.task)}">返回任务详情</a>` : ''}
    <button class="link-btn" type="button" id="srClearPre">清除预筛</button>`;
  bar.hidden = false;
  bar.querySelector('#srClearPre').addEventListener('click', () => resetFilters());
  refreshIcons();
}

function clearPrefilter(render = true) {
  srPre = { tasks: [], task: null, statuses: [], cat: null, channel: null, vendor: null };
  history.replaceState(null, '', location.pathname);
  renderPrefilter();
  if (render) applyFilters();
}

/* ---------------- 表格 ---------------- */
function renderTable() {
  const tbody = document.getElementById('recordTableBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="20" class="cell-empty">暂无符合条件的发送记录</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(r => {
      const cat = srCatLabel(r);
      const catCell = cat && ['blocked', 'submitFail', 'undelivered'].includes(r.status)
        ? `<span class="sr-cat" title="建议动作：${esc(cat.action)}"><span class="c">${esc(cat.label)}</span><span class="d">${esc(cat.action)}</span></span>`
        : '-';
      const route = [r.vendor, r.account, r.sender].map(x => x || '-').join(' / ');
      return `
        <tr>
          <td class="cell-muted">${r.recordId}</td>
          <td class="cell-muted">${r.sendTime}</td>
          <td class="cell-muted">${r.taskId}</td>
          <td class="col-name"><span class="cell-ellipsis" title="${esc(r.taskName)}">${esc(r.taskName)}</span></td>
          <td class="cell-muted">${fmt(r.taskCode)}</td>
          <td>${esc(r.userAccount)}</td>
          <td><span class="tag">${r.channel}${r.sub ? ' · ' + r.sub : ''}</span></td>
          <td><span class="cell-ellipsis" title="${esc(route)}">${esc(route)}</span></td>
          <td class="col-name"><span class="cell-ellipsis" title="${esc(r.content)}">${esc(r.content)}</span></td>
          <td>${v2Tag(SR_MSG_STATUS, r.status)}</td>
          <td>${catCell}</td>
          <td class="cell-muted"><span title="${esc(r.rawMsg)}">${esc(r.rawCode)}</span></td>
          <td>${r.attempt === '重试' ? '<span class="tag tag-orange">重试</span>' : '首发'}</td>
          <td class="v2-num">${r.billable == null ? '-' : r.billable}</td>
          <td class="cell-muted">${fmt(r.receiptId)}</td>
          <td>${r.source === 'API' ? '系统调用' : '手动发送'}</td>
          <td>${r.source === 'API' ? `${esc(r.app || '-')} / ${esc(r.operator)}` : '-'}</td>
          <td class="cell-muted">${fmt(r.activityId)}</td>
          <td class="col-name"><span class="cell-ellipsis" title="${esc(fmt(r.activityName))}">${esc(fmt(r.activityName))}</span></td>
          <td class="col-ops"><button class="link-btn" data-detail="${r.recordId}">查看详情</button></td>
        </tr>`;
    }).join('');
  }
  tbody.querySelectorAll('[data-detail]').forEach(btn =>
    btn.addEventListener('click', () => openSendDetail(btn.dataset.detail)));
  renderPagination();
  refreshIcons();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const host = document.getElementById('pagination');
  let html = `<span class="page-total">共 ${filtered.length} 条</span>`;
  html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
  }
  html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>`;
  host.innerHTML = html;
  host.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = Number(btn.dataset.page); renderTable(); });
  });
}

/* ---------------- 详情抽屉 ---------------- */
function buildTimeline(r) {
  const steps = [{ title: '进入待发送表（排队中）', time: r.sendTime === '-' ? '-' : r.sendTime.slice(0, 11) + '00:00:00', state: 'done' }];
  const add = (title, state = 'done', time = r.sendTime) => steps.push({ title, time, state });
  switch (r.status) {
    case 'blocked': steps[0] = { title: `发送前拦截（${r.cat}）`, time: r.sendTime, state: 'error' }; add('最终状态：已拦截'); break;
    case 'queued': steps[0].state = 'active'; add('提交供应商', 'wait'); add('收到回执', 'wait'); break;
    case 'cancelled': add('任务终止，消息取消', 'cancel'); add('最终状态：已取消'); break;
    case 'submitFail': r.attempts.forEach(a => add(`提交 ${a.vendor}（${a.result}${a.code !== '0' ? ' · ' + a.code : ''}）`, a.result === '已提交' ? 'done' : 'error', a.time)); add('最终状态：提交失败'); break;
    default:
      r.attempts.forEach(a => add(`提交 ${a.vendor} / ${a.account}（${a.result}）`, a.result === '已提交' ? 'done' : 'error', a.time));
      if (r.status === 'submitted') add('等待回执', 'active');
      else if (r.status === 'delivered') add('收到回执：已送达');
      else if (r.status === 'undelivered') add(`收到回执：未送达（${r.rawCode}）`, 'error');
      else add(`最终状态：${SR_MSG_STATUS[r.status].label}`, 'error');
  }
  return `<ul class="timeline">${steps.map(s => `
    <li class="tl-item tl-${s.state}"><span class="tl-dot"></span>
      <div class="tl-body"><div class="tl-title">${esc(s.title)}</div><div class="tl-time">${s.state === 'wait' ? '-' : s.time}</div></div>
    </li>`).join('')}</ul>`;
}

function openSendDetail(recordId) {
  const r = SEND_RECORDS.find(x => x.recordId === recordId);
  const cat = srCatLabel(r);
  const d = (l, v) => `<div class="desc-item"><span class="desc-label">${l}</span><span>${v}</span></div>`;
  const attempts = r.attempts.length
    ? `<table class="sr-attempts"><thead><tr><th>次序</th><th>首发 / 重试</th><th>供应商 / 账号</th><th>时间</th><th>结果</th><th>原始码</th></tr></thead><tbody>
        ${r.attempts.map((a, i) => `<tr><td>${i + 1}</td><td>${i === 0 ? '首发' : '重试'}</td><td>${esc(a.vendor)} / ${esc(a.account || '-')}</td><td>${a.time}</td><td>${esc(a.result)}</td><td>${esc(a.code)}</td></tr>`).join('')}
      </tbody></table>`
    : '<div class="v2-hint">未提交供应商，无尝试记录</div>';

  const body = document.getElementById('sendDetailBody');
  body.classList.add('drawer-body--split');
  body.innerHTML = `
    <aside class="detail-preview" id="sendDetailPreview"></aside>
    <div class="detail-main">
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      <div class="desc-list">
        ${d('任务名称', esc(r.taskName))}
        ${d('任务 ID', r.taskId)}
        ${d('任务类型', r.source === 'API' ? '系统调用' : '手动发送')}
        ${d('消息类别', esc(r.category))}
        ${r.source === 'API' ? d('接入方 / operator', `${esc(r.app || '-')} / ${esc(r.operator)}`) + d('任务code', fmt(r.taskCode)) : ''}
        ${d('产品线', esc(r.productLine))}
        ${d('发送记录 ID', r.recordId)}
        ${d('发送时间', r.sendTime)}
        ${d('通道', `<span class="tag tag-primary">${r.channel}${r.sub ? ' · ' + r.sub : ''}</span>`)}
        ${d('内容版本', `v${r.contentVersion}`)}
        ${d('活动 ID', fmt(r.activityId))}
        ${d('活动名称', esc(fmt(r.activityName)))}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">接收方信息</h4>
      <div class="desc-list">
        ${d('用户账号', esc(r.userAccount))}
        ${d('触达地址', esc(r.recipient))}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">通道执行信息</h4>
      <div class="desc-list">
        ${d('消息状态', v2Tag(SR_MSG_STATUS, r.status))}
        ${d('失败分类', cat ? `<span class="fail-reason">${esc(cat.label)}</span>` : '-')}
        ${d('建议动作', cat ? esc(cat.action) : '-')}
        ${d('原始码', esc(r.rawCode))}
        ${d('原始描述', esc(r.rawMsg))}
        ${d('首发 / 重试', r.attempt)}
        ${d('最终供应商', esc(fmt(r.vendor)))}
        ${d('最终账号', esc(fmt(r.account)))}
        ${d('发送方标识', esc(fmt(r.sender)))}
        ${d('计费条数', r.billable == null ? '-' : r.billable)}
        ${d('供应商消息 ID', fmt(r.vendorMessageId))}
        ${d('回执 ID', fmt(r.receiptId))}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">尝试记录</h4>
      ${attempts}
    </section>
    <section class="card detail-group">
      <h4 class="card-title">日志时间线</h4>
      ${buildTimeline(r)}
    </section>
    </div>`;

  mountDetailPreview(document.getElementById('sendDetailPreview'), [{
    channel: r.sub || r.channel,
    content: r.channel === '邮件' ? { subject: r.title || r.taskName, body: r.content } : r.content,
    fallbackTitle: r.taskName,
  }]);
  document.getElementById('detailToTask').onclick = () => { location.href = `task-records.html?task=${r.taskId}`; };
  openDrawer('sendDetailDrawer');
  refreshIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-send-records');
  renderTopbar('reach');
  bindDrawerClose();

  productLineFilter = createSearchMultiSelect({
    container: document.getElementById('fProductLine'),
    options: V2_PRODUCT_LINES.map(p => ({ value: p.siteId, label: p.status === '已下线' ? `${p.name}（已下线）` : p.name, desc: `site id：${p.siteId} · ${p.bl}` })),
    placeholder: '全部产品线',
    searchPlaceholder: '搜索产品线 / site id…',
  });
  srFillSelects();

  document.querySelectorAll('#timeRange .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeRange .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('customDates').hidden = btn.dataset.range !== 'custom';
    });
  });

  document.getElementById('queryBtn').addEventListener('click', applyFilters);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  ['fRecordId', 'fTask', 'fTaskCode', 'fContent', 'fActivity', 'fUser'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); }));
  document.getElementById('exportBtn').addEventListener('click', () => showToast('已导出（原型）'));

  readPrefilter();
  applyFilters();
  refreshIcons();
});

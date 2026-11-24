/* 任务记录页（二期改造）：筛选 + KPI + 任务列表 + 详情抽屉（漏斗 / ETA / 内容版本）+ 编辑内容
 * 口径：PRD 4.4（两维状态、消息状态恒等式）、6.1.2 字段改造、6.3.2 漏斗、6.6.2 ETA、6.10.2 发送中改文案
 * 任务主数据复用 v2-data.js 的 V2_TASKS（与队列页 / SDK 页同一批任务 ID）；本页只叠加展示所需的补充字段（mock） */

const FUNNEL_TIPS = {
  total: '目标人群总数 = 过滤排除数 + 可推送数',
  filtered: '过滤排除数 = 重复 + 黑名单 + DND + DNC + 频控 + 格式无效 + 退订 + 其他',
  sendable: '可推送数 = 排队中 + 已提交 + 提交失败 + 已取消 + 已过期（未发出）',
  submitted: '已提交 = 已送达 + 未送达 + 已过期（已发出未送达）+ 无回执 + 待回执；对应一期「推送至供应商成功条数」',
  submitFail: '供应商拒绝受理；对应一期「推送至供应商失败条数」',
  delivered: '对应一期「供应商推送成功条数」',
  undelivered: '对应一期「供应商推送失败条数」',
  waiting: '对应一期「待供应商确认条数」；超回执窗口后转入无回执',
};

/* ---------------- 状态 ---------------- */
const PAGE_SIZE = 8;
let currentPage = 1;
let filtered = [...TASK_RECORDS];
let productLineFilter = null;
let statusFilter = null;
let channelCascade = null;
let selectedIds = new Set();
let trSort = null; // null | 'asc' | 'desc'（按预计完成）
let trHiddenCols = new Set(JSON.parse(localStorage.getItem('trHiddenCols') || '[]'));
let trDetailId = null;

const fmt = v => (v === null || v === undefined || v === '' || v === '-') ? '-' : (typeof v === 'number' ? v.toLocaleString() : v);
const trTask = id => TASK_RECORDS.find(x => x.id === id);
const trActiveVersion = t => t.versions.find(v => v.state === 'active') || t.versions[t.versions.length - 1];
const trPendingVersion = t => t.versions.find(v => v.state === 'pending');
/* 内容变更是否需审批：任务本身无需审批，或 API 任务的接入方审批方式为「模板免审」时保存即生效 */
function trNeedsApproval(t) {
  if (t.approval === 'none') return false;
  if (t.source === 'API' && V2_APPS.find(a => a.name === t.app)?.approval === '模板免审') return false;
  return true;
}

/* ---------------- 单元格渲染 ---------------- */
const TR_CH_ICON = { SMS: 'message-square', 邮件: 'mail', Push: 'bell', 站内信: 'inbox', 'Viber Biz': 'phone-call', 'Viber Bot': 'bot', 'Messenger Biz': 'message-circle', 'Messenger Bot': 'message-circle', WhatsApp: 'message-circle-more' };

function trChannelCell(t) {
  const tag = t.fallback ? ' <span class="tag tag-primary" title="已配置失败后短信：未送达时由触达短信通道兜底">含兜底短信</span>' : '';
  return t.routes.map(r => `<span class="tr-ch"><i data-lucide="${TR_CH_ICON[r.channel] || 'send'}"></i>${r.channel}${r.sub ? ' · ' + r.sub : ''}${tag}</span>`).join('<br>');
}

function trStatusCell(t) {
  let sub = '';
  if (t.status === 'pending' && t.approval === 'pending') sub = '<span class="tr-sub warn">待审批</span>';
  if (t.status === 'stopped' && t.approval === 'rejected') sub = '<span class="tr-sub danger">审批拒绝</span>';
  else if (t.status === 'stopped' || t.status === 'failed') sub = `<span class="tr-sub" title="${esc(t.stopReason || '人工终止')}">${esc((t.stopReason || '人工终止').split('：')[0])}</span>`;
  if (trPendingVersion(t)) sub += '<span class="tr-sub warn">内容变更待审批</span>';
  if (t.reserve && t.status === 'pending' && hasPerm('queue')) sub += `<span class="tr-sub">到点占位 ${esc(String(t.sched).slice(-5))}</span>`;
  return `${v2Tag(V2_TASK_STATUS, t.status)}${sub}`;
}

function trApprovalCell(t) {
  const tip = t.approval === 'none' ? '无需审批' : t.approval === 'pending' ? '等待审批人处理' : `审批人：${t.approver || '-'} · 审批时间：${t.approvedAt || '-'}`;
  return `<span title="${esc(tip)}">${v2Tag(V2_APPROVAL_STATUS, t.approval)}</span>`;
}

function trProductLineCell(t) {
  const p = V2_PRODUCT_LINES.find(x => x.siteId === t.site);
  const tip = p ? `site id：${p.siteId} · 业务线：${p.bl}${p.status === '已下线' ? ' · 已下线' : ''}` : '未知产品线';
  return `<span title="${esc(tip)}">${esc(t.productLine)}</span>`;
}

function trSourceCell(t) {
  return t.source === 'API' ? `<span title="接入方：${esc(t.app || '-')}">系统调用</span><span class="tr-sub">${esc(t.app || '')}</span>` : '手动发送';
}

function trApprovalMinutes(t) { return (String(t.estStart || '').match(/(\d+)/) || [0, 5])[1]; }

function trEstFlag(t) {
  if (!t.estimated) return '';
  return `<span class="v2-est" title="${esc(t.estReason || '按现有消息队列深度估算')}">估算</span>`;
}

function trEtaStart(t) {
  if (!TR_ACTIVE.includes(t.status)) return '<span class="v2-muted">-</span>';
  if (t.status === 'pending' && t.approval === 'pending') return `<span class="tr-eta-wait">审批通过后预计 ${trApprovalMinutes(t)} 分钟开始</span>`;
  return `<span class="tr-eta" title="按当前通道吞吐推算，供参考">${esc(t.estStart || '-')}${trEstFlag(t)}</span>`;
}

function trEtaFinish(t) {
  if (!TR_ACTIVE.includes(t.status) || !t.estFinish || t.estFinish === '-' || t.approval === 'pending') return '<span class="v2-muted">-</span>';
  const rng = t.range ? `<span class="v2-pm">±${Math.max(1, t.range)} 分</span>` : '';
  return `<span class="tr-eta" title="按当前通道吞吐推算，供参考；通道繁忙或供应商波动时会变化">${esc(t.estFinish)}${rng}${trEstFlag(t)}</span>`;
}

function trFinishSortKey(t) {
  if (!TR_ACTIVE.includes(t.status) || t.approval === 'pending' || !/\d{2}:\d{2}/.test(t.estFinish || '')) return Infinity;
  const m = t.estFinish.match(/(?:(\d{2})-(\d{2}) )?(\d{2}):(\d{2})/);
  return (m[2] ? Number(m[2]) * 1440 : 13 * 1440) + Number(m[3]) * 60 + Number(m[4]);
}

/* ---------------- 列定义 ---------------- */
const TR_COLS = [
  { key: 'id', label: '任务 ID', cls: 'cell-muted', render: t => t.id },
  { key: 'name', label: '任务名称', th: 'col-name', cls: 'col-name', render: t => `<span class="cell-ellipsis" title="${esc(t.name)}">${esc(t.name)}</span>` },
  { key: 'code', label: '任务code', cls: 'cell-muted', optional: true, render: t => fmt(t.taskCode) },
  { key: 'pl', label: '产品线', render: trProductLineCell },
  { key: 'aud', label: '发送对象', optional: true, render: t => { const s = `${t.audience}（${t.audienceCount.toLocaleString()}人）`; return `<span class="cell-ellipsis" title="${esc(s)}">${esc(s)}</span>`; } },
  { key: 'ch', label: '通道', render: trChannelCell },
  { key: 'timing', label: '发送时机', render: t => esc(t.timing) },
  { key: 'source', label: '任务类型', render: trSourceCell },
  { key: 'status', label: '任务状态', render: trStatusCell },
  { key: 'approval', label: '审批状态', render: trApprovalCell },
  { key: 'estStart', label: '预计开始', optional: true, render: trEtaStart },
  { key: 'estFinish', label: '预计完成', optional: true, sortable: true, render: trEtaFinish },
  { key: 'creator', label: '创建人', render: t => esc(t.creator) },
  { key: 'createdAt', label: '创建时间', cls: 'cell-muted', render: t => t.createdAt },
  { key: 'updatedBy', label: '最近更新人', optional: true, render: t => esc(t.updatedBy) },
  { key: 'updatedAt', label: '最近更新时间', cls: 'cell-muted', optional: true, render: t => t.updatedAt },
  { key: 'actId', label: '活动 ID', cls: 'cell-muted', optional: true, render: t => fmt(t.activityId) },
  { key: 'actName', label: '活动名称', th: 'col-name', cls: 'col-name', optional: true, render: t => `<span class="cell-ellipsis" title="${esc(fmt(t.activityName))}">${esc(fmt(t.activityName))}</span>` },
];

const trVisibleCols = () => TR_COLS.filter(c => !trHiddenCols.has(c.key));

function renderTableHead() {
  const sortIcon = trSort === 'asc' ? 'arrow-up' : trSort === 'desc' ? 'arrow-down' : 'arrow-up-down';
  document.getElementById('taskTableHead').innerHTML = `<tr>
    <th class="col-check"><input type="checkbox" id="checkAll" aria-label="全选"></th>
    ${trVisibleCols().map(c => c.sortable
      ? `<th class="tr-th-sort${trSort ? ' on' : ''}" data-sort title="点击按预计完成时间升序 / 降序">${c.label}<i data-lucide="${sortIcon}"></i></th>`
      : `<th class="${c.th || ''}">${c.label}</th>`).join('')}
    <th class="col-ops">操作</th></tr>`;
  document.getElementById('checkAll').addEventListener('change', e => {
    const pageIds = currentPageIds();
    if (e.target.checked) pageIds.forEach(id => selectedIds.add(id));
    else pageIds.forEach(id => selectedIds.delete(id));
    renderTable();
  });
  document.querySelector('#taskTableHead [data-sort]')?.addEventListener('click', () => {
    trSort = trSort === 'asc' ? 'desc' : trSort === 'desc' ? null : 'asc';
    applyFilters(true);
  });
}

function openColumnSettings() {
  const opts = TR_COLS.filter(c => c.optional);
  v2Modal({
    title: '列设置', width: 420, okText: '确定',
    body: `<div class="v2-hint">勾选需要在列表中展示的列</div>
      <div class="chip-group">${opts.map(c => `<label class="v2-flex" style="width:45%"><input type="checkbox" data-col="${c.key}" ${trHiddenCols.has(c.key) ? '' : 'checked'}>${c.label}</label>`).join('')}</div>`,
    onOk: root => {
      trHiddenCols = new Set([...root.querySelectorAll('[data-col]')].filter(i => !i.checked).map(i => i.dataset.col));
      localStorage.setItem('trHiddenCols', JSON.stringify([...trHiddenCols]));
      renderTable();
    },
  });
}

/* ---------------- KPI ---------------- */
function renderKpis() {
  const kpis = [
    { title: '任务总数', value: TASK_RECORDS.length, cls: '' },
    { title: '排队中', value: TASK_RECORDS.filter(t => t.status === 'queued').length, cls: 'kpi-blue' },
    { title: '发送中', value: TASK_RECORDS.filter(t => t.status === 'sending').length, cls: 'kpi-orange' },
    { title: '待审批', value: TASK_RECORDS.filter(t => t.approval === 'pending' || trPendingVersion(t)).length, cls: 'kpi-orange' },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-title">${k.title}</div>
      <div class="kpi-body"><span class="kpi-value ${k.cls}">${k.value}</span></div>
    </div>`).join('');
}

/* ---------------- 通道级联多选（通道 → 供应商 → 账号 → 发送方标识） ---------------- */
function trChannelTree() {
  const node = (label, type, key, children = []) => ({ label, type, key, children });
  const accNodes = (accs, prefix) => {
    const vendors = [...new Set(accs.map(a => a.vendor))];
    return vendors.map(v => node(v, '供应商', `${prefix}›${v}`, accs.filter(a => a.vendor === v).map(a =>
      node(a.id, '账号', `${prefix}›${v}›${a.id}`, a.senders.map(s => node(s, '发送方标识', `${prefix}›${v}›${a.id}›${s}`))))));
  };
  return V2_CHANNELS.map(ch => {
    const accs = V2_ACCOUNTS.filter(a => a.channel === ch);
    return node(ch, '通道', ch, accNodes(accs, ch));
  });
}

function trRouteKey(r) {
  return [r.channel, r.sub, r.vendor, r.account, r.sender].filter(Boolean).join('›');
}

function createChannelCascade(host) {
  const tree = trChannelTree();
  const selected = new Set();
  let active = [];
  let open = false;
  const find = key => { let found = null; const walk = ns => ns.forEach(n => { if (n.key === key) found = n; walk(n.children); }); walk(tree); return found; };

  function columns() {
    const cols = [tree];
    active.forEach(k => { const n = find(k); if (n && n.children.length) cols.push(n.children); });
    return cols;
  }
  function render() {
    const tags = [...selected].map(k => `<span class="tr-cas-tag">${esc(k.split('›').join(' → '))}</span>`).join('');
    host.innerHTML = `<div class="tr-cas-trigger" tabindex="0">${tags || '<span class="tr-cas-ph">选择通道</span>'}<i data-lucide="chevron-down"></i></div>
      ${open ? `<div class="tr-cas-pop"><div style="display:flex">${columns().map((col, ci) => `<div class="tr-cas-col">
          <div class="tr-cas-cap">${col[0]?.type || ''}</div>
          ${col.map(n => `<div class="tr-cas-item${active[ci] === n.key ? ' active' : ''}" data-key="${esc(n.key)}" data-ci="${ci}">
            <input type="checkbox" data-pick="${esc(n.key)}" ${selected.has(n.key) ? 'checked' : ''}><span class="grow">${esc(n.label)}</span>${n.children.length ? '<i data-lucide="chevron-right"></i>' : ''}</div>`).join('')}
        </div>`).join('')}</div></div>` : ''}`;
    if (open) {
      const pop = host.querySelector('.tr-cas-pop');
      pop.style.flexDirection = 'column';
      pop.insertAdjacentHTML('beforeend', `<div class="tr-cas-foot"><span class="v2-hint">可只选上层；下层取自供应商档案</span><button class="link-btn" data-clear type="button">清空</button></div>`);
    }
    host.querySelector('.tr-cas-trigger').addEventListener('click', e => { e.stopPropagation(); open = !open; render(); });
    host.querySelectorAll('.tr-cas-item').forEach(el => el.addEventListener('click', e => {
      e.stopPropagation();
      const ci = Number(el.dataset.ci);
      if (e.target.matches('[data-pick]')) {
        const k = e.target.dataset.pick;
        if (e.target.checked) selected.add(k); else selected.delete(k);
      }
      active = [...active.slice(0, ci), el.dataset.key];
      render();
    }));
    host.querySelector('[data-clear]')?.addEventListener('click', e => { e.stopPropagation(); selected.clear(); render(); });
    host.querySelector('.tr-cas-pop')?.addEventListener('click', e => e.stopPropagation());
    refreshIcons();
  }
  document.addEventListener('click', () => { if (open) { open = false; render(); } });
  render();
  return {
    getValue: () => [...selected],
    setValue: v => { selected.clear(); (v || []).forEach(k => selected.add(k)); render(); },
    matches: t => !selected.size || t.routes.some(r => { const rk = trRouteKey(r); return [...selected].some(k => rk === k || rk.startsWith(k + '›')); }),
  };
}

/* ---------------- 筛选 ---------------- */
function applyFilters(keepPage) {
  const v = id => document.getElementById(id).value.trim().toLowerCase();
  const name = v('fName'), taskCode = v('fTaskCode'), content = v('fContent'), activity = v('fActivity'), approver = v('fApprover');
  const source = document.getElementById('fSource').value;
  const app = document.getElementById('fApp').value;
  const category = document.getElementById('fCategory').value;
  const approval = document.getElementById('fApproval').value;
  const creator = document.getElementById('fCreator').value;
  const fallback = document.getElementById('fFallback').value;
  const productLines = productLineFilter?.getValue() || [];
  const statuses = statusFilter?.getValue() || [];

  filtered = TASK_RECORDS.filter(t =>
    (!name || t.name.toLowerCase().includes(name) || t.id.toLowerCase().includes(name)) &&
    (!taskCode || (t.taskCode || '').toLowerCase().includes(taskCode)) &&
    (!content || t.versions.some(ver => (ver.content || '').toLowerCase().includes(content))) &&
    (!activity || (t.activityId || '').toLowerCase().includes(activity) || (t.activityName || '').toLowerCase().includes(activity)) &&
    (!productLines.length || productLines.includes(t.site)) &&
    (!source || t.source === source) &&
    (!app || t.app === app) &&
    (!category || t.category === category) &&
    (!channelCascade || channelCascade.matches(t)) &&
    (!statuses.length || statuses.includes(t.status)) &&
    (!approval || t.approval === approval) &&
    (!fallback || (fallback === 'yes') === !!t.fallback) &&
    (!approver || (t.approver || '').toLowerCase().includes(approver)) &&
    (!creator || t.creator === creator)
  );
  if (trSort) filtered.sort((a, b) => {
    const ka = trFinishSortKey(a), kb = trFinishSortKey(b);
    if (ka === kb) return 0;
    if (ka === Infinity) return 1; // 无预计完成的任务始终排在后面
    if (kb === Infinity) return -1;
    return trSort === 'asc' ? ka - kb : kb - ka;
  });
  if (keepPage !== true) currentPage = 1;
  clearSelection();
  renderTable();
}

function resetFilters() {
  ['fName', 'fTaskCode', 'fContent', 'fActivity', 'fApprover'].forEach(id => document.getElementById(id).value = '');
  ['fSource', 'fApp', 'fCategory', 'fApproval', 'fCreator', 'fFallback'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
    el.dispatchEvent(new Event('change'));
  });
  productLineFilter?.setValue([]);
  statusFilter?.setValue([]);
  channelCascade?.setValue([]);
  applyFilters();
}

/* ---------------- 多选与批量操作 ---------------- */
function clearSelection() {
  selectedIds.clear();
  updateBatchBar();
}

function updateBatchBar() {
  const bar = document.getElementById('batchBar');
  const count = document.getElementById('batchCount');
  if (!bar) return;
  bar.hidden = selectedIds.size === 0;
  if (count) count.textContent = String(selectedIds.size);
  const checkAll = document.getElementById('checkAll');
  if (checkAll) {
    const pageIds = currentPageIds();
    const checkedOnPage = pageIds.filter(id => selectedIds.has(id)).length;
    checkAll.checked = pageIds.length > 0 && checkedOnPage === pageIds.length;
    checkAll.indeterminate = checkedOnPage > 0 && checkedOnPage < pageIds.length;
  }
}

function currentPageIds() {
  const start = (currentPage - 1) * PAGE_SIZE;
  return filtered.slice(start, start + PAGE_SIZE).map(t => t.id);
}

function trApprove(t) {
  t.approval = 'approved';
  t.approver = 'marvin@';
  t.approvedAt = TR_NOW;
  if (t.status === 'pending' && /审批/.test(t.estStart || '')) {
    // 审批通过后：预计开始 = max(计划时间, 队列清到它的时间)
    t.estStart = /^\d{4}-(\d{2}-\d{2}) (\d{2}:\d{2})$/.test(t.sched) ? t.sched.slice(5) : '16:34';
    t.estFinish = /^\d{4}-/.test(t.sched) ? t.sched.slice(5, 11) + '10:03' : '16:37';
    t.range = 1;
  }
}

function trReject(t) {
  t.approval = 'rejected';
  t.approver = 'marvin@';
  t.approvedAt = TR_NOW;
  t.status = 'stopped';
  t.stopReason = '审批拒绝';
}

function trStop(t) {
  t.status = 'stopped';
  t.stopReason = '人工终止';
  t.updatedBy = 'marvin@';
  t.updatedAt = TR_NOW;
}

function handleBatchAction(act) {
  const tasks = TASK_RECORDS.filter(t => selectedIds.has(t.id));
  if (!tasks.length) return;
  const done = () => { clearSelection(); renderKpis(); renderTable(); };
  if (act === 'approve' || act === 'reject') {
    const ok = tasks.filter(t => t.approval === 'pending');
    ok.forEach(act === 'approve' ? trApprove : trReject);
    showToast(ok.length ? `已批量${act === 'approve' ? '通过' : '拒绝'} ${ok.length} 个任务` : '所选任务均不是待审批状态');
    done();
  }
  if (act === 'stop') {
    const ok = tasks.filter(t => TR_ACTIVE.includes(t.status));
    if (!ok.length) { showToast('所选任务均已结束，无需终止'); return; }
    v2Modal({
      title: '批量终止任务', danger: true, okText: '确认终止',
      body: `<p>将终止 <b>${ok.length}</b> 个任务：${ok.map(t => esc(t.name)).join('、')}。</p>
        <div class="v2-callout warn"><i data-lucide="alert-triangle"></i><span>终止后仍在待发送表中的消息置为「已取消」，已提交的消息不受影响；终止不可撤销。</span></div>`,
      onOk: () => { ok.forEach(trStop); showToast(`已批量终止 ${ok.length} 个任务`); done(); },
    });
  }
}

/* ---------------- 编辑内容入口判断（6.10.2） ---------------- */
function trEditBlockReason(t) {
  if (!['queued', 'sending'].includes(t.status)) return '仅排队中 / 发送中的任务可编辑内容';
  if (t.contentMode === '分别配置') return '「分别配置」（逐行内容）任务不支持发送中改文案';
  if (t.accountMode !== 'tasklevel') return '该通道暂不支持';
  if (trPendingVersion(t)) return '已有内容变更待审批，审批完成后可再次编辑';
  return '';
}

/* ---------------- 表格与分页 ---------------- */
function renderTable() {
  closeAllMoreMenus();
  renderTableHead();
  const cols = trVisibleCols();
  const tbody = document.getElementById('taskTableBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${cols.length + 2}" class="cell-empty">暂无符合条件的任务</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(t => {
      const approvalOps = t.approval === 'pending'
        ? `<button class="link-btn" data-act="approve" data-id="${t.id}">通过</button>
           <button class="link-btn link-btn-danger" data-act="reject" data-id="${t.id}">拒绝</button>`
        : '';
      const block = trEditBlockReason(t);
      const editItem = TR_TERMINAL.includes(t.status) ? ''
        : `<button class="more-item${block ? ' more-disabled' : ''}" data-act="edit" data-id="${t.id}" title="${esc(block)}">编辑内容</button>`;
      const endItem = t.status === 'stopped'
        ? `<button class="more-item" data-act="change" data-id="${t.id}">变更</button>`
        : TR_ACTIVE.includes(t.status) ? `<button class="more-item more-danger" data-act="stop" data-id="${t.id}">终止任务</button>` : '';
      const reserveItem = trReserveItem(t);
      return `
        <tr>
          <td class="col-check"><input type="checkbox" class="row-check" data-check="${t.id}" ${selectedIds.has(t.id) ? 'checked' : ''} aria-label="选择 ${t.id}"></td>
          ${cols.map(c => `<td class="${c.cls || ''}">${c.render(t)}</td>`).join('')}
          <td class="col-ops">
            ${approvalOps}
            <button class="link-btn" data-detail="${t.id}">查看详情</button>
            <span class="more-wrap">
              <button class="link-btn" data-more="${t.id}">更多<i data-lucide="chevron-down"></i></button>
              <span class="more-menu" hidden>
                ${editItem}
                ${reserveItem}
                <button class="more-item" data-act="copy" data-id="${t.id}">复制任务</button>
                <button class="more-item" data-act="records" data-id="${t.id}">查看发送记录</button>
                <button class="more-item" data-act="analysis" data-id="${t.id}">任务分析</button>
                ${endItem}
              </span>
            </span>
          </td>
        </tr>`;
    }).join('');
  }

  bindRowActions();
  renderPagination();
  updateBatchBar();
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
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      clearSelection();
      renderTable();
    });
  });
}

function trConfirmStop(t) {
  v2Modal({
    title: '终止任务', danger: true, okText: '确认终止',
    body: `<p>确认终止任务「${esc(t.name)}」（${t.id}）？</p>
      <div class="v2-callout warn"><i data-lucide="alert-triangle"></i><span>终止后仍在待发送表中的消息置为「已取消」，已提交的消息不受影响；终止不可撤销。</span></div>`,
    onOk: () => {
      trStop(t);
      showToast(`任务「${t.name}」已终止`);
      renderKpis(); renderTable();
      if (trDetailId === t.id) openTaskDetail(t.id);
    },
  });
}

function bindRowActions() {
  const tbody = document.getElementById('taskTableBody');
  tbody.querySelectorAll('[data-detail]').forEach(btn =>
    btn.addEventListener('click', () => openTaskDetail(btn.dataset.detail)));

  tbody.querySelectorAll('.row-check').forEach(cb =>
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.dataset.check);
      else selectedIds.delete(cb.dataset.check);
      updateBatchBar();
    }));

  tbody.querySelectorAll('.link-btn[data-act]').forEach(btn =>
    btn.addEventListener('click', () => {
      const t = trTask(btn.dataset.id);
      if (!t || t.approval !== 'pending') return;
      if (btn.dataset.act === 'approve') { trApprove(t); showToast(`已通过任务「${t.name}」`); }
      if (btn.dataset.act === 'reject') { trReject(t); showToast(`已拒绝任务「${t.name}」，任务已终止（审批拒绝）`); }
      renderKpis(); renderTable();
    }));

  bindMoreMenus(tbody);

  tbody.querySelectorAll('.more-item').forEach(item =>
    item.addEventListener('click', () => {
      const t = trTask(item.dataset.id);
      closeAllMoreMenus();
      const act = item.dataset.act;
      if (act === 'copy') showToast(`已复制任务「${t.name}」，请在新建任务中确认后提交`);
      if (act === 'records') location.href = `send-records.html?task=${t.id}`;
      if (act === 'analysis') location.href = `task-analysis.html?task=${t.id}`;
      if (act === 'stop') trConfirmStop(t);
      if (act === 'change') startTaskChange(t.id);
      if (act === 'reserve' || act === 'unreserve') {
        const block = trReserveBlock(t);
        if (block) showToast(block); else trToggleReserve(t, act === 'reserve');
      }
      if (act === 'edit') {
        const block = trEditBlockReason(t);
        if (block) showToast(block); else openContentEdit(t);
      }
    }));
}

/* ---------------- 占位按钮（6.5.5，触达内建任务；权限节点「占位」，无权限不显示） ---------------- */
function trReserveBlock(t) {
  if (t.source !== '手动') return '上游推送的任务请在队列管理配置计划占位';
  if (t.status !== 'pending') return '仅待发送的定时任务可占位；已排队任务请在队列管理插队';
  if (!t.sched || t.sched === '立即') return '立即发送的任务无需占位，可在队列管理插队';
  const acc = V2_ACCOUNTS.find(a => a.id === t.account);
  if (!acc || acc.mode !== 'tasklevel') return '该通道暂未接入任务级调度，不支持占位';
  return '';
}
function trReserveItem(t) {
  if (!hasPerm('queue') || t.source !== '手动' || TR_TERMINAL.includes(t.status) || !['pending'].includes(t.status)) return '';
  const block = trReserveBlock(t);
  const act = t.reserve ? 'unreserve' : 'reserve';
  return `<button class="more-item${block ? ' more-disabled' : ''}" data-act="${act}" data-id="${t.id}" title="${esc(block)}">${t.reserve ? '取消占位' : '占位'}</button>`;
}
function trToggleReserve(t, on) {
  const acc = V2_ACCOUNTS.find(a => a.id === t.account);
  const hm = String(t.sched).slice(-5);
  const toSec = s => { const [h, m] = s.split(':').map(Number); return h * 3600 + m * 60; };
  const occupy = Math.ceil(t.target / (acc.tps || 1) / 60);
  const conflicts = V2_TASKS.filter(x => x.id !== t.id && x.reserve && x.account === t.account && x.status === 'pending'
    && /\d{2}:\d{2}$/.test(x.sched) && Math.abs(toSec(String(x.sched).slice(-5)) - toSec(hm)) <= 1800);
  v2Modal({
    title: on ? '确认占位' : '确认取消占位', width: 560, okText: on ? '确认占位' : '确认取消', danger: !on,
    body: on
      ? `<div><b>${esc(t.name)}</b>（${t.id}）将在 <b>${hm}</b> 到点后自动置于 ${acc.channel} · ${acc.vendor} · ${acc.id} 队列队首，优先于同队列其他任务；其他任务不暂停。</div>
         <div class="v2-note">按当前吞吐预计占用约 ${occupy} 分钟（目标 ${fmtN(t.target)} 条 ÷ TPS ${acc.tps}）</div>
         ${conflicts.length ? `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><div>该队列 ±30 分钟内已有占位任务：${conflicts.map(x => `${x.id} ${esc(x.name)}（${String(x.sched).slice(-5)}）`).join('、')}，将按计划时间、创建时间先后生效。</div></div>` : ''}`
      : `<div>取消 <b>${esc(t.name)}</b> 的到点占位：${hm} 到点后按普通优先级排队，任务本身不受影响。</div>`,
    onOk: () => { t.reserve = on; showToast(on ? '已设置占位，到点自动优先发送' : '已取消占位'); renderTable(); },
  });
}

function startTaskChange(id) {
  const t = trTask(id);
  if (!t) return;
  closeDrawer('taskDetailDrawer');
  if (typeof openTaskChange === 'function') openTaskChange(t);
  else showToast('变更抽屉未加载');
}

/* ---------------- 发送中改文案：编辑内容弹窗（6.10.2） ---------------- */
const TR_SENSITIVE = ['guaranteed', '100% win', '稳赚', '保证中奖', '免费领取'];
const trVars = s => [...new Set((String(s).match(/\{\{\s*\w+\s*\}\}/g) || []).map(x => x.replace(/\s/g, '')))];

function trSmsCount(text) {
  const ucs = /[^\x00-\x7F]/.test(text);
  const len = [...text].length;
  const seg = ucs ? (len <= 70 ? 1 : Math.ceil(len / 67)) : (len <= 160 ? 1 : Math.ceil(len / 153));
  return `${len} 字 · ${ucs ? 'UCS-2' : 'GSM-7'} · ${len ? seg : 0} 段`;
}

function trCheckHtml(text) {
  const hits = TR_SENSITIVE.filter(w => text.toLowerCase().includes(w.toLowerCase()));
  return hits.length
    ? `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><span>内容检测：命中敏感词「${hits.map(esc).join('」「')}」，建议修改（仅提醒，不阻断保存）</span></div>`
    : `<div class="v2-callout"><i data-lucide="check-circle-2"></i><span>内容检测：长度与敏感词检测通过</span></div>`;
}

function openContentEdit(t) {
  const cur = trActiveVersion(t);
  const needApproval = trNeedsApproval(t);
  const tpls = TR_TEMPLATES.filter(x => x.site === t.site && x.channel === t.channel);
  const root = v2Modal({
    title: `编辑内容 · ${esc(t.name)}`, width: 640, okText: '保存',
    body: `<div class="tr-edit-meta"><span>任务 ID：${t.id}</span><span>当前生效版本：v${cur.v}</span><span>通道：${t.channel}</span><span>审批方式：${needApproval ? '需审批' : '无需审批'}</span></div>
      <div class="v2-callout"><i data-lucide="info"></i><span>新版本只影响之后注入的消息；缓冲内与已提交的消息不变。${needApproval ? '保存后新版本进入「待审批（内容变更）」，审批前继续按旧版本发送。' : '保存即生效。'}</span></div>
      <div class="v2-form">
        <label>模板</label>
        <select class="select" id="trEditTpl">${tpls.map(x => `<option value="${x.id}" ${x.id === cur.template ? 'selected' : ''}>${x.id} ${esc(x.name)}</option>`).join('') || `<option value="">${esc(cur.template || '-')}</option>`}</select>
        <div class="v2-hint">同产品线同通道已审批模板，选中后回填内容</div>
        <label class="req">内容（${t.channel}）</label>
        <textarea class="textarea" id="trEditContent" maxlength="1000">${esc(cur.content)}</textarea>
        <div class="tr-edit-count" id="trEditCount"></div>
        <div class="tr-edit-err" id="trEditVarErr" hidden></div>
        <label class="req">变更说明</label>
        <input class="input" id="trEditNote" maxlength="200" placeholder="为什么改">
        <div class="tr-edit-err" id="trEditNoteErr" hidden></div>
      </div>
      <div id="trEditCheck"></div>`,
    onOk: r => saveContentEdit(t, r),
  });
  const ta = root.querySelector('#trEditContent');
  const sync = () => {
    root.querySelector('#trEditCount').textContent = t.channel === 'SMS' ? trSmsCount(ta.value) : `${[...ta.value].length} 字`;
    root.querySelector('#trEditCheck').innerHTML = trCheckHtml(ta.value);
    refreshIcons();
  };
  ta.addEventListener('input', sync);
  root.querySelector('#trEditTpl').addEventListener('change', e => {
    const c = trTplContent(e.target.value);
    if (c) { ta.value = c; sync(); }
  });
  sync();
}

function saveContentEdit(t, root) {
  const cur = trActiveVersion(t);
  const content = root.querySelector('#trEditContent').value.trim();
  const note = root.querySelector('#trEditNote').value.trim();
  const varErr = root.querySelector('#trEditVarErr');
  const noteErr = root.querySelector('#trEditNoteErr');
  const oldVars = trVars(cur.content), newVars = trVars(content);
  const added = newVars.filter(v => !oldVars.includes(v));
  const removed = oldVars.filter(v => !newVars.includes(v));
  varErr.hidden = !(added.length || removed.length || !content);
  varErr.textContent = !content ? '请输入内容'
    : `变量占位符必须与原版本一致（不可新增变量）${added.length ? '；新增：' + added.join(' ') : ''}${removed.length ? '；缺少：' + removed.join(' ') : ''}`;
  noteErr.hidden = !!note;
  noteErr.textContent = '请填写变更说明';
  if (!varErr.hidden || !noteErr.hidden) return false;
  if (content === cur.content && root.querySelector('#trEditTpl').value === (cur.template || '')) {
    noteErr.hidden = false; noteErr.textContent = '内容未修改';
    return false;
  }
  const needApproval = trNeedsApproval(t);
  const v = Math.max(...t.versions.map(x => x.v)) + 1;
  const submittedNow = v2Funnel(t).submitted + v2Funnel(t).submitFail;
  const ver = { v, by: 'marvin@', at: TR_NOW, note, content, template: root.querySelector('#trEditTpl').value || cur.template };
  if (needApproval) {
    Object.assign(ver, { state: 'pending', effectiveAt: '-', submittedAt: null });
  } else {
    cur.state = 'replaced';
    Object.assign(ver, { state: 'active', effectiveAt: TR_NOW, submittedAt: submittedNow });
  }
  t.versions.push(ver);
  t.updatedBy = 'marvin@';
  t.updatedAt = TR_NOW;
  showToast(needApproval ? `新版本 v${v} 待审批（内容变更），审批通过前继续按 v${cur.v} 发送` : `已保存，新版本 v${v} 已生效`);
  renderKpis(); renderTable();
  if (trDetailId === t.id) openTaskDetail(t.id);
  return true;
}

/* ---------------- 详情：执行信息漏斗（6.3.2） ---------------- */
function trSplit(total, parts) {
  // 按比例拆分且各项之和严格等于 total（恒等式）
  const sum = parts.reduce((a, p) => a + p[1], 0);
  let left = total;
  return parts.map(([k, w], i) => { const n = i === parts.length - 1 ? left : Math.round(total * w / sum); left -= n; return [k, n]; }).filter(x => x[1] > 0);
}

function trCatLabel(key) { return V2_FAIL_CATS.find(c => c.key === key)?.label || key; }

function trFunnelHtml(t, ch, target) {
  const f = v2Funnel({ ...t, channel: ch, target });
  const live = TR_ACTIVE.includes(t.status);
  const base = `send-records.html?task=${t.id}${t.channels.length > 1 ? '&channel=' + encodeURIComponent(ch) : ''}`;
  const why = layer => `task-analysis.html?task=${t.id}&layer=${layer}`;
  const num = (n, q) => `<a class="tr-num-link" href="${base}${q ? '&' + q : ''}" title="查看对应发送记录">${fmtN(n)}</a>`;
  const w = n => f.total ? (n / f.total * 100).toFixed(1) : 0;
  const row = (o) => `<div class="tr-fl lv${o.lv || 0} ${o.cls || ''}${o.open ? ' open' : ''}" ${o.tg ? `data-fl="${o.tg}"` : ''}>
      ${o.tg ? `<button class="tg" type="button" data-tg="${o.tg}" aria-label="展开"><i data-lucide="chevron-right"></i></button>` : '<span></span>'}
      <span class="lab">${o.label}${o.tip ? tipIcon(o.tip) : ''}</span>
      <span class="bar"><i style="width:${w(o.n)}%"></i></span>
      <span class="val">${o.link === false ? fmtN(o.n) : num(o.n, o.q)}</span>
      <span class="rt">${pct(o.n, f.total)}</span></div>`;
  const sub = (key, items, extra = '', lv = '') => `<div class="tr-fl-sub ${lv}" data-sub="${key}">${items.map(([k, n, q]) =>
    `<span class="it">${esc(k)} <b>${q === false ? fmtN(n) : num(n, q)}</b></span>`).join('')}${extra}</div>`;

  const filterItems = Object.entries(f.filters).filter(([, n]) => n > 0).map(([k, n]) => [k, n, `status=blocked&cat=${encodeURIComponent(k)}`]);
  const failCats = cats => cats.map(([k, n]) => [trCatLabel(k), n, `status=${cats.status}&cat=${k}`]);
  const undeliveredCats = trSplit(f.undelivered, [['invalid', 412], ['carrier', 268], ['reject', 96], ['unknown', 18]]); undeliveredCats.status = 'undelivered';
  const submitFailCats = trSplit(f.submitFail, [['vendor', 64], ['rate', 31], ['content', 20]]); submitFailCats.status = 'submitFail';
  const whyLink = layer => `<a class="why" href="${why(layer)}">失败原因 ›</a>`;

  return `<div class="tr-funnel">
    ${row({ label: '目标人群总数', n: f.total, tip: FUNNEL_TIPS.total })}
    ${row({ label: '过滤排除', n: f.filtered, lv: 1, cls: 'mute', tg: 'filtered', q: 'status=blocked', tip: FUNNEL_TIPS.filtered })}
    ${sub('filtered', filterItems, whyLink('filtered'))}
    ${row({ label: '可推送', n: f.sendable, lv: 1, tip: FUNNEL_TIPS.sendable, q: 'status=queued,submitted,submitFail,delivered,undelivered,noReceipt,expired,cancelled' })}
    ${live || f.queued ? row({ label: '排队中', n: f.queued, lv: 2, q: 'status=queued' }) : ''}
    ${row({ label: '已提交', n: f.submitted, lv: 2, cls: 'ok', tg: 'submitted', open: true, tip: FUNNEL_TIPS.submitted, q: 'status=submitted,delivered,undelivered,noReceipt,expired' })}
    ${sub('submitted', [['已送达', f.delivered, 'status=delivered'], ['未送达', f.undelivered, 'status=undelivered'], ['待回执', f.waiting, 'status=submitted'], ['无回执', f.noReceipt, 'status=noReceipt'], ['已过期', f.expired, 'status=expired']], '', 'lv2')}
    ${row({ label: '　未送达', n: f.undelivered, lv: 2, cls: 'bad', tg: 'undelivered', tip: FUNNEL_TIPS.undelivered, q: 'status=undelivered' })}
    ${sub('undelivered', failCats(undeliveredCats), whyLink('undelivered'), 'lv2')}
    ${row({ label: '提交失败', n: f.submitFail, lv: 2, cls: 'bad', tg: 'submitFail', tip: FUNNEL_TIPS.submitFail, q: 'status=submitFail' })}
    ${sub('submitFail', failCats(submitFailCats), whyLink('submitFail'), 'lv2')}
    ${row({ label: '已取消 / 已过期', n: f.cancelled + f.expired, lv: 2, cls: 'mute', q: 'status=cancelled,expired' })}
  </div>
  <div class="tr-rates">
    <span title="送达率 = 已送达 ÷ 已提交；已提交 = 0 时显示 -">送达率<b>${pct(f.delivered, f.submitted)}</b></span>
    <span title="提交受理率 = 已提交 ÷（已提交 + 提交失败）">提交受理率<b>${pct(f.submitted, f.submitted + f.submitFail)}</b></span>
    <span title="回执率 =（已送达 + 未送达）÷ 已提交">回执率<b>${pct(f.delivered + f.undelivered, f.submitted)}</b></span>
  </div>`;
}

function trChannelTargets(t) {
  if (t.channels.length === 1) return [[t.routes[0].sub ? `${t.channel} · ${t.routes[0].sub}` : t.channel, t.channel, t.target]];
  return t.channels.map(c => [c, c, trChannelTarget(t, c)]);
}

function trExecSection(t) {
  if (trNotStarted(t)) {
    return `<div class="tr-empty">${t.status === 'pending' ? '任务尚未开始执行，审批通过并到计划时间后展示执行漏斗' : '任务因审批拒绝终止，未执行发送'}（目标人群 ${fmtN(t.target)}）</div>`;
  }
  const chs = trChannelTargets(t);
  const tabs = chs.length > 1 ? `<div class="chip-group tr-ch-tabs" id="trFunnelTabs">${chs.map(([label, ch, n], i) => {
    const f = v2Funnel({ ...t, channel: ch, target: n });
    return `<button class="chip${i === 0 ? ' selected' : ''}" data-fch="${i}" type="button">${label}<small>送达率 ${pct(f.delivered, f.submitted)}</small></button>`;
  }).join('')}</div>` : '';
  const live = TR_ACTIVE.includes(t.status);
  return `${tabs}<div id="trFunnelBody">${trFunnelHtml(t, chs[0][1], chs[0][2])}</div>
    <div class="tr-funnel-actions">
      <a class="btn btn-outline btn-sm" href="task-analysis.html?task=${t.id}"><i data-lucide="search"></i>查看失败原因</a>
      <button class="btn btn-outline btn-sm" type="button" id="trExportDetail"><i data-lucide="download"></i>导出明细</button>
      ${live ? '<span class="v2-live">进行中 · 每 30 秒刷新</span>' : '<span class="v2-hint" style="margin-left:auto">已结束任务静态展示；回执窗口内晚到回执仍会更新</span>'}
    </div>`;
}

function bindFunnel(t) {
  const host = document.getElementById('trFunnelBody');
  if (!host) return;
  const bindToggles = () => {
    host.querySelectorAll('[data-sub]').forEach(s => {
      const r = host.querySelector(`[data-fl="${s.dataset.sub}"]`);
      s.hidden = !(r && r.classList.contains('open'));
    });
    host.querySelectorAll('[data-tg]').forEach(b => b.addEventListener('click', () => {
      b.closest('.tr-fl').classList.toggle('open');
      host.querySelectorAll('[data-sub]').forEach(s => { s.hidden = !host.querySelector(`[data-fl="${s.dataset.sub}"]`).classList.contains('open'); });
    }));
  };
  bindToggles();
  const chs = trChannelTargets(t);
  document.querySelectorAll('#trFunnelTabs [data-fch]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#trFunnelTabs .chip').forEach(c => c.classList.toggle('selected', c === btn));
    const [, ch, n] = chs[Number(btn.dataset.fch)];
    host.innerHTML = trFunnelHtml(t, ch, n);
    bindToggles();
    refreshIcons();
  }));
  document.getElementById('trExportDetail')?.addEventListener('click', () => showToast('已导出（原型）：本任务发送记录，含消息状态、失败分类、原始码、首发 / 重试、最终供应商'));
}


/* ---------------- 失败后短信：详情展示（PRD 6.3.2） ---------------- */
function trFallbackConfigHtml(t) {
  if (!t.fallback) return '';
  const fb = t.fallback;
  return `<section class="card detail-group">
      <h4 class="card-title">兜底短信 <span class="tag tag-primary">已开启</span></h4>
      <div class="desc-list">
        ${trDesc('适用通道', esc(t.routes.map(r => r.channel).join(' / ')))}
        ${trDesc('等待时长', esc(fb.wait))}
        ${trDesc('短信正文', esc(fb.text))}
        ${trDesc('Sender ID', `${esc(fb.sender)} <span class="v2-muted">（账号 ${esc(fb.account)}，按产品线「${esc(t.productLine)}」自动选择）</span>`)}
      </div>
    </section>`;
}

function trFallbackExecHtml(t) {
  if (!t.fallback || trNotStarted(t)) return '';
  const n = trFallbackTarget(t);
  const tf = { ...t, status: 'done', remaining: 0 };
  const html = trFunnelHtml(tf, 'SMS', n)
    .replace(new RegExp(`send-records\\.html\\?task=${t.id}`, 'g'), `send-records.html?task=${t.id}&channel=SMS&fb=1`)
    .replace(/<a class="why"[^>]*>.*?<\/a>/g, '');
  return `<div class="tr-fb-exec" style="margin-top:20px;padding-top:14px;border-top:1px dashed var(--border,#e5e7eb)">
      <div style="font-weight:600;margin-bottom:8px">兜底短信 <span class="v2-hint">SMS · 指标与短信通道一致，统计对象为触发兜底的消息</span></div>
      <div id="trFbFunnelBody">${html}</div>
    </div>`;
}

function bindFunnelToggles(host) {
  if (!host) return;
  const sync = () => host.querySelectorAll('[data-sub]').forEach(s => { s.hidden = !host.querySelector(`[data-fl="${s.dataset.sub}"]`).classList.contains('open'); });
  host.querySelectorAll('[data-tg]').forEach(b => b.addEventListener('click', () => { b.closest('.tr-fl').classList.toggle('open'); sync(); }));
  sync();
}

/* ---------------- 详情：ETA 行（6.6.2） ---------------- */
function trEtaRow(t) {
  if (!TR_ACTIVE.includes(t.status)) return '';
  const tip = tipIcon('按当前通道吞吐推算，供参考；通道繁忙或供应商波动时会变化');
  if (t.status === 'pending' && t.approval === 'pending') {
    return `<div class="tr-eta-row"><span>预计开始 <b>审批通过后预计 ${trApprovalMinutes(t)} 分钟开始</b></span><span class="v2-hint">更新于 ${TR_ETA_UPDATED} ${tip}</span></div>`;
  }
  const rng = t.range ? `（±${Math.max(1, t.range)} 分）` : '';
  return `<div class="tr-eta-row">
    <span>预计开始 <b>${esc(t.estStart)}</b>${trEstFlag(t)}</span>
    <span>预计完成 <b>${esc(t.estFinish)}</b>${rng}${trEstFlag(t)}</span>
    <span class="v2-hint">更新于 ${TR_ETA_UPDATED} ${tip}</span></div>`;
}

/* ---------------- 详情：内容版本记录（6.10.2） ---------------- */
const TR_VER_STATE = {
  active:   { label: '当前生效', cls: 'tag-success' },
  replaced: { label: '已替换',   cls: 'tag-gray' },
  pending:  { label: '待审批（内容变更）', cls: 'tag-orange' },
  rejected: { label: '已拒绝',   cls: 'tag-danger' },
};

function trVersionsHtml(t) {
  const list = [...t.versions].reverse();
  return `<div class="tr-versions">
    <div class="pane-caption">版本记录（${t.versions.length}）</div>
    ${list.map(v => `<div class="tr-ver${v.state === 'active' ? ' cur' : ''}">
      <div class="tr-ver-head"><b>v${v.v}</b>${v2Tag(TR_VER_STATE, v.state)}</div>
      <dl>
        <dt>修改人</dt><dd>${esc(v.by)}</dd>
        <dt>时间</dt><dd>${esc(v.at)}</dd>
        <dt>生效时间</dt><dd>${esc(v.effectiveAt || '-')}</dd>
        <dt>生效时已提交</dt><dd>${v.submittedAt == null ? '-' : fmtN(v.submittedAt) + ' 条'}</dd>
        <dt>变更说明</dt><dd>${esc(v.note || '-')}</dd>
      </dl></div>`).join('')}
  </div>`;
}

/* ---------------- 详情抽屉 ---------------- */
function taskPreviewItems(t) {
  const cur = trActiveVersion(t);
  return t.routes.map((r, i) => {
    const ch = r.sub || r.channel;
    let content = i === 0 ? cur.content : (t.content || cur.content);
    if (r.channel === '邮件') content = { subject: t.email?.subject || t.name, body: t.email?.body || cur.content };
    return { channel: ch, label: r.sub ? `${r.channel} · ${r.sub}` : r.channel, content: content === '-' ? '' : content, fallbackTitle: t.name };
  }).concat(t.fallback ? [{ channel: 'sms', label: '兜底短信', content: t.fallback.text, fallbackTitle: t.name }] : []);
}

function trDesc(label, value) { return `<div class="desc-item"><span class="desc-label">${label}</span><span>${value}</span></div>`; }

function openTaskDetail(id) {
  const t = trTask(id);
  if (!t) return;
  trDetailId = id;
  const p = V2_PRODUCT_LINES.find(x => x.siteId === t.site);
  const routeText = t.routes.map(r => [r.channel + (r.sub ? ' · ' + r.sub : ''), r.vendor, r.account, r.sender].filter(Boolean).join(' / ')).join('<br>');
  const stopRow = (t.status === 'stopped' || t.status === 'failed') ? trDesc(t.status === 'failed' ? '失败原因' : '终止原因', esc(t.stopReason || '人工终止')) : '';
  const reserveRow = hasPerm('queue') && t.reserve ? trDesc('到点占位', '<span class="tag tag-primary">开</span>') : '';

  const body = document.getElementById('taskDetailBody');
  body.classList.add('drawer-body--split');
  body.innerHTML = `
    <aside class="detail-preview"><div id="taskDetailPreview"></div><div id="taskVersionHost"></div></aside>
    <div class="detail-main">
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      ${trEtaRow(t)}
      <div class="desc-list">
        ${trDesc('任务名称', esc(t.name))}
        ${trDesc('任务 ID', t.id)}
        ${trDesc('任务类型', t.source === 'API' ? `系统调用${t.app ? ' · ' + esc(t.app) : ''}` : '手动发送')}
        ${t.source === 'API' ? trDesc('接入方', esc(t.app || '-')) : ''}
        ${trDesc('operator', esc(t.operator || t.creator))}
        ${trDesc('产品线', `${esc(t.productLine)} <span class="v2-muted">（site id：${esc(t.site)} · 业务线 ${p?.bl || '-'}）</span>`)}
        ${trDesc('创建人', esc(t.creator))}
        ${trDesc('创建时间', t.createdAt)}
        ${trDesc('任务状态', v2Tag(V2_TASK_STATUS, t.status))}
        ${stopRow}
        ${trDesc('审批状态', v2Tag(V2_APPROVAL_STATUS, t.approval))}
        ${trDesc('审批人', esc(fmt(t.approver)))}
        ${trDesc('审批时间', fmt(t.approvedAt))}
        ${reserveRow}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">配置信息</h4>
      <div class="desc-list">
        ${trDesc('发送对象', `${esc(t.audience)}（${fmtN(t.target)} 人）`)}
        ${trDesc('发送时机', esc(t.timing))}
        ${trDesc('通道', routeText)}
        ${trDesc('模板', esc(fmt(trActiveVersion(t).template)))}
        ${trDesc('内容配置方式', t.contentMode)}
        ${t.source === 'API' ? trDesc('任务code', fmt(t.taskCode)) : ''}
        ${trDesc('活动 ID', fmt(t.activityId))}
        ${trDesc('活动名称', esc(fmt(t.activityName)))}
        ${trDesc('Parent', esc(fmt(trMark(t).parent)))}
        ${trDesc('Palcode', esc(fmt(trMark(t).palcode)))}
      </div>
    </section>
    ${trFallbackConfigHtml(t)}
    <section class="card detail-group">
      <h4 class="card-title">执行信息</h4>
      ${trExecSection(t)}
      ${trFallbackExecHtml(t)}
    </section>
    </div>`;

  mountDetailPreview(document.getElementById('taskDetailPreview'), taskPreviewItems(t));
  document.getElementById('taskVersionHost').innerHTML = trVersionsHtml(t);
  bindFunnel(t);
  bindFunnelToggles(document.getElementById('trFbFunnelBody'));
  renderTaskDetailFooter(t);
  openDrawer('taskDetailDrawer');
  refreshIcons();
}

function renderTaskDetailFooter(t) {
  const footer = document.getElementById('taskDetailFooter');
  if (!footer) return;
  const block = trEditBlockReason(t);
  const editBtn = TR_TERMINAL.includes(t.status) ? ''
    : `<button class="btn btn-outline" id="detailEditContent" ${block ? `title="${esc(block)}" style="opacity:.5"` : ''}>编辑内容</button>`;
  if (t.approval === 'pending') {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>关闭</button>
      ${editBtn}
      <button class="btn btn-outline btn-reject" id="detailRejectBtn">拒绝</button>
      <button class="btn btn-primary" id="detailApproveBtn">通过</button>`;
    footer.querySelector('#detailApproveBtn').addEventListener('click', () => {
      trApprove(t); showToast(`已通过任务「${t.name}」`); renderKpis(); renderTable(); openTaskDetail(t.id);
    });
    footer.querySelector('#detailRejectBtn').addEventListener('click', () => {
      trReject(t); showToast(`已拒绝任务「${t.name}」，任务已终止（审批拒绝）`); renderKpis(); renderTable(); openTaskDetail(t.id);
    });
  } else {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>关闭</button>
      ${editBtn}
      <button class="btn btn-outline" id="detailToSendRecords">查看发送记录</button>`;
    footer.querySelector('#detailToSendRecords').addEventListener('click', () => location.href = `send-records.html?task=${t.id}`);
  }
  footer.querySelector('#detailEditContent')?.addEventListener('click', () => {
    if (block) showToast(block); else openContentEdit(t);
  });
  footer.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => { closeDrawer('taskDetailDrawer'); trDetailId = null; }));
}

/* ---------------- 初始化 ---------------- */
function trInitFilters() {
  productLineFilter = createSearchMultiSelect({
    container: document.getElementById('fProductLine'),
    options: V2_PRODUCT_LINES.map(p => ({ value: p.siteId, label: p.status === '已下线' ? `${p.name}（已下线）` : p.name, desc: `site id：${p.siteId} · ${p.bl}` })),
    placeholder: '全部产品线',
    searchPlaceholder: '搜索产品线 / site id…',
  });
  statusFilter = createSearchMultiSelect({
    container: document.getElementById('fStatus'),
    options: Object.entries(V2_TASK_STATUS).map(([k, s]) => ({ value: k, label: s.label })),
    placeholder: '全部',
    searchPlaceholder: '搜索状态…',
  });
  channelCascade = createChannelCascade(document.getElementById('fChannel'));

  const appSel = document.getElementById('fApp');
  appSel.innerHTML = '<option value="">全部</option>' + V2_APPS.map(a => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join('');
  if (typeof enhanceSelect === 'function') enhanceSelect(appSel);
  const creatorSel = document.getElementById('fCreator');
  creatorSel.innerHTML = '<option value="">全部创建人</option>' + [...new Set(TASK_RECORDS.map(t => t.creator))].map(c => `<option>${esc(c)}</option>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-task-records');
  renderTopbar('reach');
  bindDrawerClose();
  trInitFilters();

  document.querySelectorAll('#timeRange .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeRange .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('customDates').hidden = btn.dataset.range !== 'custom';
    });
  });

  document.getElementById('queryBtn').addEventListener('click', applyFilters);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  ['fName', 'fTaskCode', 'fContent', 'fActivity', 'fApprover'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); }));
  document.querySelectorAll('#batchBar [data-batch]').forEach(btn =>
    btn.addEventListener('click', () => handleBatchAction(btn.dataset.batch)));
  document.getElementById('exportBtn').addEventListener('click', () => showToast('已导出（原型）'));
  document.getElementById('colSettingBtn').addEventListener('click', openColumnSettings);
  document.getElementById('taskDetailDrawer').querySelectorAll('.drawer-mask').forEach(m => m.addEventListener('click', () => { trDetailId = null; }));

  document.addEventListener('click', () => closeAllMoreMenus());
  document.querySelectorAll('.table-scroll').forEach(el => el.addEventListener('scroll', closeAllMoreMenus, { passive: true }));

  renderKpis();
  renderTable();
  const qTask = new URLSearchParams(location.search).get('task');
  if (qTask && trTask(qTask)) openTaskDetail(qTask);
  refreshIcons();
});

/* Parent / Palcode（触达工具模块 PRD 6.3.5：任务详情只读展示；演示数据） */
const TR_MARKS = {
  T20260713002: { parent: 'RECALL111', palcode: '123456789012345678' },
  T20260713005: { parent: 'VIP_BDAY', palcode: '' },
};
function trMark(t) { return { parent: t.parent || (TR_MARKS[t.id] || {}).parent || '', palcode: t.palcode || (TR_MARKS[t.id] || {}).palcode || '' }; }

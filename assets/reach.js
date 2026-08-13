/* 页面二：触达主页 + 新建任务抽屉 */

const CHANNELS = {
  sms:      { label: 'SMS',      tip: '短信',     icon: 'message-square' },
  email:    { label: '邮件',     tip: '邮件',     icon: 'mail' },
  push:     { label: 'Push',     tip: 'Push',     icon: 'bell' },
  viber:    { label: 'Viber',    tip: 'Viber',    icon: 'phone-call' },
  messenger:{ label: 'Messenger',tip: 'Messenger',icon: 'message-circle' },
  telegram: { label: 'Telegram', tip: 'Telegram', icon: 'send' },
  inbox:    { label: '站内信',   tip: '站内信',   icon: 'inbox' },
};

const AUDIENCES = [
  { id: 'active',  name: '活跃用户',     count: 12800 },
  { id: 'vip',     name: 'VIP用户',      count: 2300 },
  { id: 'newreg',  name: '新注册用户',   count: 5600 },
  { id: 'churn',   name: '流失预警用户', count: 1800 },
  { id: 'high',    name: '高充值用户',   count: 960 },
  { id: 'silent',  name: '沉默用户',     count: 8400 },
];

const VIBER_BIZ_EXCLUDE_OPTIONS = [
  { value: 'account_delivered', label: 'Account Delivered' },
  { value: 'account_lined_bots', label: 'Account Lined Bots' },
  { value: 'accounts_subscribed_bots', label: 'Accounts Subscribed Bots' },
];
const VIBER_BOT_EXCLUDE_OPTIONS = [
  { value: 'bp_vip', label: 'BP VIP' },
];
const VIBER_BOT_OPTIONS = [
  { value: 'bot_quiz', label: '@BPQuizBot' },
  { value: 'bot_service', label: '@BPServiceBot' },
  { value: 'bot_promo', label: '@BPPromoBot' },
];

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const APPROVAL_QUEUE = [
  { id: 'AP20260714003', name: 'Messenger 社群拉新', channel: 'Messenger', appliedAt: '2026-07-14 09:20',
    creator: 'lily@', audience: '新注册用户', taskType: '手动', timing: '定时 · 2026-07-15 10:00',
    contentSummary: '加入官方社群，每日抽奖赢免费竞猜券！', template: '-' },
  { id: 'AP20260713002', name: '世界杯决赛邮件预告', channel: '邮件', appliedAt: '2026-07-13 15:40',
    creator: 'ken@', audience: '活跃用户', taskType: '手动', timing: '立即发送',
    contentSummary: '决赛之夜即将来临，提前锁定您的冠军竞猜…', template: '世界杯竞猜提醒' },
  { id: 'AP20260712001', name: '沉默用户唤醒短信', channel: 'SMS', appliedAt: '2026-07-12 11:05',
    creator: 'marvin@', audience: '沉默用户', taskType: 'API', timing: '循环 · 每周一 09:00',
    contentSummary: '好久不见！您的老朋友 BingoPlus 为您准备了回归好礼…', template: '流失召回话术' },
];

const RUNNING_TASKS = [
  { id: 'T20260713001', name: '世界杯竞猜预热短信', channel: 'SMS', progress: 75,
    creator: 'marvin@', createdAt: '2026-07-12 10:20', approver: 'lily@', approvedAt: '2026-07-12 11:00',
    audience: '活跃用户', taskType: 'API', timing: '2026-07-13 18:00 定时',
    contentSummary: 'Only the best teams remain! Warm up for the Quarterfinals…', template: '世界杯竞猜提醒',
    execution: { total: 12800, pushable: 12160, valid: 11776, duplicate: 384, blacklist: 256, dnc: 128,
      pushCount: 9632, pushSuccess: 9459, pushFail: 173, pendingConfirm: 482 } },
  { id: 'T20260713002', name: '新用户充值召回邮件', channel: '邮件', progress: 38,
    creator: 'lily@', createdAt: '2026-07-11 14:05', approver: 'marvin@', approvedAt: '2026-07-11 15:00',
    audience: '新注册用户', taskType: '手动', timing: '每天 10:00 循环',
    contentSummary: '尊敬的用户，本周充值满 500 即享 8% 加赠…', template: '充值优惠通知',
    execution: { total: 5600, pushable: 5320, valid: 5152, duplicate: 168, blacklist: 112, dnc: 56,
      pushCount: 2128, pushSuccess: 2051, pushFail: 77, pendingConfirm: 106 } },
  { id: 'T20260712004', name: 'VIP 沉默用户 Push 召回', channel: 'Push', progress: 52,
    creator: 'ken@', createdAt: '2026-07-08 11:00', approver: 'lily@', approvedAt: '2026-07-08 12:00',
    audience: 'VIP用户 · 沉默用户', taskType: 'API', timing: '每天 09:00 循环',
    contentSummary: '您的专属权益即将到期，登录立即领取…', template: '-',
    execution: { total: 21200, pushable: 20140, valid: 19504, duplicate: 636, blacklist: 424, dnc: 212,
      pushCount: 11024, pushSuccess: 10814, pushFail: 210, pendingConfirm: 551 } },
];

let draft = null;
let panelAudienceMsel = null;
let panelViberBizExcludeMsel = null;
let panelViberBizBotsMsel = null;
let panelViberBotExcludeMsel = null;
let panelContentEditor = null;
let activePanel = null;
let taskDrawerMode = 'create';
let editingTaskId = null;
const CFG_ROWS = ['rowAudience', 'rowTiming', 'rowContent'];

function newChannelConfig() {
  return { timing: null, content: null };
}

function newViberAudienceConfig() {
  return { bizExclude: [], bizExcludeBots: [], botExclude: [], viberIdFile: null };
}

function destroyAudiencePanelWidgets() {
  panelAudienceMsel?.destroy();
  panelAudienceMsel = null;
  panelViberBizExcludeMsel?.destroy();
  panelViberBizExcludeMsel = null;
  panelViberBizBotsMsel?.destroy();
  panelViberBizBotsMsel = null;
  panelViberBotExcludeMsel?.destroy();
  panelViberBotExcludeMsel = null;
}

function hasContent(content) {
  if (!content) return false;
  if (typeof content === 'string') return content.trim().length > 0;
  return contentSummary(content).trim().length > 0;
}

function previewText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content.text) return content.text;
  if (content.body) {
    const tmp = document.createElement('div');
    tmp.innerHTML = content.body;
    return tmp.textContent || '';
  }
  return content.title || '';
}

function initDraft(channel) {
  draft = {
    name: '',
    productLine: '',
    taskType: 'manual',
    audienceTags: [],
    audienceFiles: [],
    audienceLabel: '',
    viberAudience: newViberAudienceConfig(),
    strategies: [],
    channels: [channel],
    active: channel,
    perChannel: { [channel]: newChannelConfig() },
  };
  document.getElementById('ntName').value = '';
  document.getElementById('ntProductLine').value = '';
  document.querySelectorAll('input[name="taskType"]').forEach(r => {
    r.checked = r.value === 'manual';
  });
  setTaskDrawerMode('create');
  closePanel();
  syncTaskTypeUi();
  renderRows();
  renderPreview();
}

function setTaskDrawerMode(mode) {
  taskDrawerMode = mode;
  const locked = mode === 'edit';
  const title = document.getElementById('taskDrawerTitle');
  const submit = document.getElementById('createTaskBtn');
  const nameEl = document.getElementById('ntName');
  const plEl = document.getElementById('ntProductLine');
  if (title) title.textContent = locked ? '编辑任务' : '新建';
  if (submit) submit.textContent = locked ? '保存' : '提交审批';
  if (nameEl) nameEl.disabled = locked;
  if (plEl) plEl.disabled = locked;
  document.querySelectorAll('input[name="taskType"]').forEach(r => { r.disabled = locked; });
  document.getElementById('rowAudience')?.classList.toggle('cfg-row-locked', locked);
  document.getElementById('rowTiming')?.classList.toggle('cfg-row-locked', locked);
}

function isSystemTask() {
  return draft?.taskType === 'system';
}

function syncTaskTypeUi() {
  const hideWhoWhen = isSystemTask();
  const audField = document.getElementById('ntAudienceField');
  const timingField = document.getElementById('ntTimingField');
  if (audField) audField.hidden = hideWhoWhen;
  if (timingField) timingField.hidden = hideWhoWhen;
  if (hideWhoWhen && (activePanel === 'audience' || activePanel === 'timing')) closePanel();
}

function toDraftChannel(label) {
  const key = typeof normalizeChannel === 'function' ? normalizeChannel(label) : String(label || '').toLowerCase();
  if (CHANNELS[key]) return key;
  const fallback = { 电销: 'sms', im: 'inbox', bot: 'telegram', call: 'sms' };
  return fallback[key] || 'sms';
}

function parseTimingDisplay(str) {
  if (!str || str === '-') return { type: 'now' };
  if (str.includes('审批通过后') || str.includes('立即')) return { type: 'now' };
  if (str.includes('循环')) {
    const time = (str.match(/\d{2}:\d{2}/) || ['10:00'])[0];
    return { type: 'recurring', freq: str.includes('周') ? 'weekly' : 'daily', weekday: '周一', time };
  }
  const m = str.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (m) return { type: 'scheduled', datetime: `${m[1]}T${m[2]}` };
  return { type: 'scheduled', datetime: str };
}

function audienceTagsFromRecord(t) {
  return String(t.audience || '').split(/[·,，|｜]/).map(s => s.trim()).filter(Boolean)
    .map(n => AUDIENCES.find(a => a.name === n)?.id).filter(Boolean);
}

function ensureProductLineOption(value) {
  const sel = document.getElementById('ntProductLine');
  if (!sel || !value) return;
  if (![...sel.options].some(o => o.value === value)) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    sel.appendChild(opt);
  }
  sel.value = value;
}

function openTaskEdit(task) {
  if (!task || !document.getElementById('taskDrawer')) return;
  editingTaskId = task.id;
  const channels = [...new Set((task.channels || ['SMS']).map(toDraftChannel))];
  const active = channels[0] || 'sms';
  const timing = parseTimingDisplay(task.timing);
  const perChannel = {};
  channels.forEach(c => {
    const label = CHANNELS[c]?.label || c;
    const cc = task.channelContents?.[label] || task.channelContents?.[task.channels.find(x => toDraftChannel(x) === c)] || {};
    const raw = cc.content || cc.contentSummary || task.contentSummary || '';
    const content = typeof ensureContentValue === 'function'
      ? ensureContentValue(c, raw === '-' ? '' : raw)
      : (typeof raw === 'object' ? raw : { text: raw });
    perChannel[c] = { timing: { ...timing }, content };
  });
  draft = {
    name: task.name || '',
    productLine: task.productLine || '',
    taskType: (task.taskType === 'API' || task.taskType === '系统调用' || task.taskType === 'system') ? 'system' : 'manual',
    audienceTags: audienceTagsFromRecord(task),
    audienceFiles: [],
    audienceLabel: task.audience || '',
    viberAudience: newViberAudienceConfig(),
    strategies: [],
    channels,
    active,
    perChannel,
  };
  document.getElementById('ntName').value = draft.name;
  ensureProductLineOption(draft.productLine);
  document.querySelectorAll('input[name="taskType"]').forEach(r => {
    r.checked = r.value === draft.taskType;
  });
  setTaskDrawerMode('edit');
  closePanel();
  syncTaskTypeUi();
  renderRows();
  renderPreview();
  openDrawer('taskDrawer');
  initCharCounters(document.getElementById('taskDrawer'));
}

function renderApprovalQueue() {
  const body = document.getElementById('approvalQueueBody');
  const countEl = document.getElementById('approvalQueueCount');
  if (!body) return;
  body.innerHTML = APPROVAL_QUEUE.map(a => `
    <tr>
      <td><button type="button" class="link-btn" data-detail-kind="approval" data-detail-id="${a.id}">${a.id}</button></td>
      <td>${a.name}</td>
      <td><span class="tag tag-primary">${a.channel}</span></td>
      <td>${a.appliedAt}</td>
      <td class="home-ops">
        <button type="button" class="link-btn" data-approval-act="approve" data-id="${a.id}">通过</button>
        <button type="button" class="link-btn link-btn-danger" data-approval-act="reject" data-id="${a.id}">拒绝</button>
      </td>
    </tr>
  `).join('');
  if (countEl) countEl.textContent = String(APPROVAL_QUEUE.length);
}

function handleApprovalAct(act, id) {
  const idx = APPROVAL_QUEUE.findIndex(a => a.id === id);
  if (idx === -1) return;
  const item = APPROVAL_QUEUE[idx];
  APPROVAL_QUEUE.splice(idx, 1);
  renderApprovalQueue();
  showToast(act === 'approve'
    ? `已通过审批单「${item.name}」`
    : `已拒绝审批单「${item.name}」`);
}

function bindApprovalQueueActions() {
  const body = document.getElementById('approvalQueueBody');
  if (!body || body.dataset.bound) return;
  body.dataset.bound = '1';
  body.addEventListener('click', e => {
    const actBtn = e.target.closest('[data-approval-act]');
    if (actBtn) {
      handleApprovalAct(actBtn.dataset.approvalAct, actBtn.dataset.id);
      return;
    }
    const detailBtn = e.target.closest('[data-detail-id]');
    if (detailBtn) openHomeTaskDetail(detailBtn.dataset.detailId, detailBtn.dataset.detailKind);
  });
}

function renderRunningTasksTable() {
  const body = document.getElementById('runningTaskBody');
  const hint = document.querySelector('.home-sections .card:last-of-type .home-section-hint b');
  if (!body) return;
  body.innerHTML = RUNNING_TASKS.slice(0, 3).map(t => `
    <tr>
      <td><button type="button" class="link-btn" data-detail-kind="running" data-detail-id="${t.id}">${t.id}</button></td>
      <td>${t.name}</td>
      <td><span class="tag tag-primary">${t.channel}</span></td>
      <td>
        <span class="progress"><span class="progress-inner" style="width:${t.progress}%"></span></span>
        <span class="pct">${t.progress}%</span>
      </td>
    </tr>
  `).join('');
  if (hint) hint.textContent = String(RUNNING_TASKS.length);
  bindRunningTaskActions();
}

function bindRunningTaskActions() {
  const body = document.getElementById('runningTaskBody');
  if (!body || body.dataset.bound) return;
  body.dataset.bound = '1';
  body.addEventListener('click', e => {
    const detailBtn = e.target.closest('[data-detail-id]');
    if (detailBtn) openHomeTaskDetail(detailBtn.dataset.detailId, detailBtn.dataset.detailKind);
  });
}

/* ---------------- 首页任务详情抽屉 ---------------- */
/* 字段结构与任务记录详情（task-records.js openTaskDetail）保持一致；
   审批单（待审批）不展示执行信息板块 */
const HOME_EXECUTION_TIPS = {
  total: '任务目标人群总数',
  pushable: '经过策略过滤后可推送的用户数',
  valid: '有效且可触达的用户数',
  duplicate: '因去重策略被排除的重复用户数',
  blacklist: '命中黑名单被排除的用户数',
  dnc: '命中 DNC（Do Not Contact）名单的用户数',
  pushCount: '实际发起推送的总条数',
  pushSuccess: '推送成功的条数',
  pushFail: '推送失败的条数',
  pendingConfirm: '已发送但待回执确认的数量',
};

const hfmt = v => (v === null || v === undefined || v === '' || v === '-') ? '-' : (typeof v === 'number' ? v.toLocaleString() : v);

function homeExecMetric(label, key, value) {
  return `<div class="desc-item"><span class="desc-label desc-label-with-tip">${label}${tipIcon(HOME_EXECUTION_TIPS[key])}</span><span>${hfmt(value)}</span></div>`;
}

function bindHomeDetailFooterClose(footer) {
  footer.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeDrawer('homeTaskDetailDrawer')));
}

function openHomeTaskDetail(id, kind) {
  const title = document.getElementById('homeTaskDetailTitle');
  const body = document.getElementById('homeTaskDetailBody');
  const footer = document.getElementById('homeTaskDetailFooter');
  if (!body || !footer) return;

  const isApproval = kind === 'approval';
  const item = isApproval ? APPROVAL_QUEUE.find(a => a.id === id) : RUNNING_TASKS.find(t => t.id === id);
  if (!item) return;

  title.textContent = isApproval ? '审批单详情' : '任务详情';

  const statusTag = isApproval
    ? '<span class="tag tag-orange">审核中</span>'
    : '<span class="tag tag-orange">执行中</span>';
  const approvalTag = isApproval
    ? '<span class="tag tag-orange">待审批</span>'
    : '<span class="tag tag-success">已通过</span>';

  const execSection = isApproval ? '' : `
    <section class="card detail-group">
      <h4 class="card-title">执行信息</h4>
      <div class="desc-list">
        ${homeExecMetric('总数', 'total', item.execution.total)}
        ${homeExecMetric('可推送用户数', 'pushable', item.execution.pushable)}
        ${homeExecMetric('有效用户数', 'valid', item.execution.valid)}
        ${homeExecMetric('重复用户数', 'duplicate', item.execution.duplicate)}
        ${homeExecMetric('黑名单用户数', 'blacklist', item.execution.blacklist)}
        ${homeExecMetric('DNC用户数', 'dnc', item.execution.dnc)}
        ${homeExecMetric('推送条数', 'pushCount', item.execution.pushCount)}
        ${homeExecMetric('推送成功条数', 'pushSuccess', item.execution.pushSuccess)}
        ${homeExecMetric('推送失败条数', 'pushFail', item.execution.pushFail)}
        ${homeExecMetric('待确认数', 'pendingConfirm', item.execution.pendingConfirm)}
      </div>
    </section>`;

  body.innerHTML = `
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">任务名称</span><span>${item.name}</span></div>
        <div class="desc-item"><span class="desc-label">任务 ID</span><span>${item.id}</span></div>
        <div class="desc-item"><span class="desc-label">创建人</span><span>${item.creator}</span></div>
        <div class="desc-item"><span class="desc-label">创建时间</span><span>${isApproval ? item.appliedAt : item.createdAt}</span></div>
        <div class="desc-item"><span class="desc-label">任务状态</span><span>${statusTag}</span></div>
        <div class="desc-item"><span class="desc-label">审批状态</span><span>${approvalTag}</span></div>
        <div class="desc-item"><span class="desc-label">审批人</span><span>${isApproval ? '-' : hfmt(item.approver)}</span></div>
        <div class="desc-item"><span class="desc-label">审批时间</span><span>${isApproval ? '-' : hfmt(item.approvedAt)}</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">配置信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">发送对象</span><span>${hfmt(item.audience)}</span></div>
        <div class="desc-item"><span class="desc-label">任务类型</span><span>${item.taskType}</span></div>
        <div class="desc-item"><span class="desc-label">通道配置</span><span><span class="tag tag-primary">${item.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">发送时机</span><span>${hfmt(item.timing)}</span></div>
        <div class="desc-item"><span class="desc-label">内容摘要</span><span>${hfmt(item.contentSummary)}</span></div>
        <div class="desc-item"><span class="desc-label">模板名称</span><span>${hfmt(item.template)}</span></div>
      </div>
    </section>
    ${execSection}`;

  if (isApproval) {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>关闭</button>
      <button class="btn btn-outline btn-reject" id="homeDetailRejectBtn">拒绝</button>
      <button class="btn btn-primary" id="homeDetailApproveBtn">通过</button>`;
    footer.querySelector('#homeDetailApproveBtn').addEventListener('click', () => {
      handleApprovalAct('approve', id);
      closeDrawer('homeTaskDetailDrawer');
    });
    footer.querySelector('#homeDetailRejectBtn').addEventListener('click', () => {
      handleApprovalAct('reject', id);
      closeDrawer('homeTaskDetailDrawer');
    });
  } else {
    footer.innerHTML = `<button class="btn btn-outline" data-close>关闭</button>`;
  }
  bindHomeDetailFooterClose(footer);

  openDrawer('homeTaskDetailDrawer');
  refreshIcons();
}

function updatePhoneClock() {
  const phoneTime = document.getElementById('phoneTime');
  const phoneDate = document.getElementById('phoneDate');
  if (!phoneTime || !phoneDate) return;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  phoneTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  phoneDate.textContent =
    `${now.getMonth() + 1}月${now.getDate()}日 星期${'日一二三四五六'[now.getDay()]}`;
}

function bindPhoneScreen() {
  const screen = document.getElementById('phoneScreen');
  const tip = document.getElementById('cursorTip');
  if (!screen || !tip) return;
  screen.addEventListener('mousemove', e => {
    const item = e.target.closest('.app-item');
    tip.textContent = item
      ? `创建${CHANNELS[item.dataset.channel].tip}`
      : '点击APP图标创建任务';
    tip.style.display = 'block';
    tip.style.left = e.clientX + 'px';
    tip.style.top = e.clientY + 'px';
  });
  screen.addEventListener('mouseleave', () => { tip.style.display = 'none'; });

  screen.querySelectorAll('.app-item').forEach(item => {
    item.addEventListener('click', () => {
      tip.style.display = 'none';
      initDraft(item.dataset.channel);
      openDrawer('taskDrawer');
      initCharCounters(document.getElementById('taskDrawer'));
    });
  });
}

function contentTabHandlers(tabsHost, editorHost) {
  return {
    allowAdd: true,
    onSwitch: c => switchContentChannel(c, tabsHost, editorHost),
    onAdd: c => addContentChannel(c, tabsHost, editorHost),
    onRemove: c => removeContentChannel(c, tabsHost, editorHost),
  };
}

function renderChannelTabs(host, { allowAdd = false, onSwitch, onAdd, onRemove } = {}) {
  if (!host || !draft) return;
  const remaining = Object.keys(CHANNELS).filter(c => !draft.channels.includes(c));
  const canRemove = draft.channels.length > 1;
  host.innerHTML = `
    ${draft.channels.map(c => `
      <span class="tab-wrap${c === draft.active ? ' active' : ''}">
        <button type="button" class="tab${c === draft.active ? ' active' : ''}" data-tab="${c}">${CHANNELS[c].tip}</button>
        ${canRemove ? `<button type="button" class="tab-close" data-remove="${c}" aria-label="删除通道">×</button>` : ''}
      </span>
    `).join('')}
    ${allowAdd && remaining.length ? '<button type="button" class="tab-add" id="tabAdd" title="添加通道"><i data-lucide="plus"></i></button>' : ''}
  `;

  host.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const next = tab.dataset.tab;
      if (next === draft.active) return;
      onSwitch?.(next);
    });
  });

  host.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onRemove?.(btn.dataset.remove);
    });
  });

  const addBtn = host.querySelector('#tabAdd');
  if (addBtn) {
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      const existing = host.querySelector('.popover');
      if (existing) { existing.remove(); return; }
      const pop = document.createElement('div');
      pop.className = 'popover';
      pop.innerHTML = remaining.map(c =>
        `<button type="button" class="popover-item" data-add="${c}">${CHANNELS[c].tip}</button>`
      ).join('');
      host.appendChild(pop);
      pop.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          pop.remove();
          onAdd?.(btn.dataset.add);
        });
      });
      const closePop = ev => {
        if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', closePop); }
      };
      setTimeout(() => document.addEventListener('click', closePop));
    });
  }
  refreshIcons();
}

function saveActiveContentEditor() {
  if (panelContentEditor) {
    draft.perChannel[draft.active].content = panelContentEditor.getValue();
  }
}

function mountContentEditor(container) {
  panelContentEditor?.destroy();
  panelContentEditor = createContentEditor({
    container,
    channel: draft.active,
    value: draft.perChannel[draft.active].content,
    showTemplateTools: true,
    onChange: () => {
      draft.perChannel[draft.active].content = panelContentEditor.getValue();
      renderPreview();
      renderRows();
    },
  });
}

function switchContentChannel(nextChannel, tabsHost, editorHost) {
  saveActiveContentEditor();
  draft.active = nextChannel;
  renderChannelTabs(tabsHost, contentTabHandlers(tabsHost, editorHost));
  mountContentEditor(editorHost);
  renderPreview();
  renderRows();
}

function addContentChannel(channel, tabsHost, editorHost) {
  if (draft.channels.includes(channel)) return;
  saveActiveContentEditor();
  draft.channels.push(channel);
  const cfg = newChannelConfig();
  if (taskDrawerMode === 'edit') {
    const src = draft.channels.find(c => c !== channel && draft.perChannel[c]?.timing);
    if (src) cfg.timing = JSON.parse(JSON.stringify(draft.perChannel[src].timing));
  }
  draft.perChannel[channel] = cfg;
  draft.active = channel;
  renderChannelTabs(tabsHost, contentTabHandlers(tabsHost, editorHost));
  mountContentEditor(editorHost);
  renderPreview();
  renderRows();
}

function removeContentChannel(channel, tabsHost, editorHost) {
  if (draft.channels.length <= 1) return;
  saveActiveContentEditor();
  draft.channels = draft.channels.filter(c => c !== channel);
  delete draft.perChannel[channel];
  if (draft.active === channel) draft.active = draft.channels[0];
  renderChannelTabs(tabsHost, contentTabHandlers(tabsHost, editorHost));
  mountContentEditor(editorHost);
  renderPreview();
  renderRows();
}

function timingLabel(t) {
  if (!t) return null;
  if (t.type === 'now') return '审批通过后发送';
  if (t.type === 'scheduled') return `定时 · ${(t.datetime || '').replace('T', ' ')}`;
  if (t.type === 'recurring') {
    return t.freq === 'weekly'
      ? `循环 · 每周${(t.weekday || '周一').replace('周', '')} ${t.time}`
      : `循环 · 每天 ${t.time}`;
  }
  return null;
}

function renderRows() {
  const av = document.getElementById('audienceValue');
  if (!av) return;
  const parts = [];
  if (draft.audienceTags.length) {
    parts.push(draft.audienceTags.map(id => AUDIENCES.find(a => a.id === id)?.name || id).join(' · '));
  }
  if (draft.audienceFiles.length) parts.push(`已上传 ${draft.audienceFiles.length} 个文件`);
  if (!parts.length && draft.audienceLabel) parts.push(draft.audienceLabel);
  av.innerHTML = parts.length
    ? `<span class="cfg-summary">${parts.join(' ｜ ')}</span>`
    : '<span class="placeholder">请选择人群</span>';

  const cfg = draft.perChannel[draft.active];
  const tv = document.getElementById('timingValue');
  const tl = timingLabel(cfg.timing);
  tv.innerHTML = tl
    ? `<span class="tag tag-primary">${tl}</span>`
    : '<span class="placeholder">请选择发送时机</span>';

  const cv = document.getElementById('contentValue');
  const configured = draft.channels.filter(c => hasContent(draft.perChannel[c].content));
  if (!configured.length) {
    cv.innerHTML = '<span class="placeholder">请配置发送内容</span>';
  } else if (draft.channels.length === 1) {
    cv.innerHTML = `<span class="cfg-summary">${contentSummary(draft.perChannel[draft.channels[0]].content)}</span>`;
  } else if (configured.length === draft.channels.length) {
    cv.innerHTML = configured.map(c => `<span class="tag tag-primary">${CHANNELS[c].tip}</span>`).join('');
  } else {
    cv.innerHTML = `<span class="cfg-summary">${configured.length}/${draft.channels.length} 通道已配置内容</span>`;
  }
}

function renderPreview() {
  const host = document.getElementById('ntPreview');
  const ch = draft.active;
  const content = draft.perChannel[ch].content;
  const text = previewText(content) || '您配置的内容将实时显示在这里…';
  const emptyCls = hasContent(content) ? '' : ' empty';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const emailSubject = (typeof content === 'object' && content?.subject)
    || draft.name || document.getElementById('ntName').value || '触达通知';
  const emailSender = (typeof content === 'object' && content?.sender) || 'marketing@bingoplus.com';
  const pushTitle = (typeof content === 'object' && content?.title) || 'BingoPlus';

  let inner = '';
  if (ch === 'sms') {
    inner = `
      <div class="pv-header">
        <div class="pv-avatar"><i data-lucide="message-square"></i></div>
        <div class="pv-sender">106 9013 3***</div>
      </div>
      <div class="pv-bubble${emptyCls}">${text}</div>
      <div class="pv-time-hint">刚刚</div>`;
  } else if (ch === 'email') {
    inner = `
      <div class="pv-mail">
        <div class="pv-mail-row"><span>发件人</span>${emailSender}</div>
        <div class="pv-mail-row"><span>主题</span>${emailSubject}</div>
        <div class="pv-mail-body${emptyCls}">${text}</div>
      </div>`;
  } else if (ch === 'push') {
    inner = `
      <div class="pv-lock-time">
        <div class="t">${timeStr}</div>
        <div class="d">${now.getMonth() + 1}月${now.getDate()}日 星期${'日一二三四五六'[now.getDay()]}</div>
      </div>
      <div class="pv-notify">
        <div class="pv-app-icon"><i data-lucide="bell"></i></div>
        <div>
          <div class="pv-n-title">${pushTitle}</div>
          <div class="pv-n-body${emptyCls}">${text}</div>
        </div>
      </div>`;
  } else if (ch === 'viber') {
    const account = (typeof content === 'object' && (content?.biz?.account || content?.bot?.account)) || 'BingoPlus 官方';
    inner = `
      <div class="pv-header">
        <div class="pv-avatar"><i data-lucide="${CHANNELS[ch].icon}"></i></div>
        <div class="pv-sender">${account} · ${CHANNELS[ch].label}</div>
      </div>
      <div class="pv-bubble${emptyCls}">${text}</div>
      <div class="pv-time-hint">${timeStr}</div>`;
  } else if (ch === 'messenger' || ch === 'telegram') {
    const account = (typeof content === 'object' && content?.account) || `BingoPlus 官方 · ${CHANNELS[ch].label}`;
    const mediaType = (typeof content === 'object' && content?.type) || 'Text';
    inner = `
      <div class="pv-header">
        <div class="pv-avatar"><i data-lucide="${CHANNELS[ch].icon}"></i></div>
        <div class="pv-sender">${account}</div>
      </div>
      ${mediaType !== 'Text' ? `<div class="pv-media-tag"><i data-lucide="image"></i>${mediaType}</div>` : ''}
      <div class="pv-bubble${emptyCls}">${text}</div>
      <div class="pv-time-hint">${timeStr}</div>`;
  } else if (ch === 'inbox') {
    const title = (typeof content === 'object' && content?.title) || 'BingoPlus';
    inner = `
      <div class="pv-header">
        <div class="pv-avatar"><i data-lucide="${CHANNELS[ch].icon}"></i></div>
        <div class="pv-sender">${title}</div>
      </div>
      <div class="pv-bubble${emptyCls}">${text}</div>
      <div class="pv-time-hint">${timeStr}</div>`;
  }

  host.innerHTML = `<div class="pv-screen">${inner}</div>`;
  refreshIcons();
}

function closePanel() {
  destroyAudiencePanelWidgets();
  panelContentEditor?.destroy();
  panelContentEditor = null;
  activePanel = null;
  document.getElementById('ntPanel').innerHTML =
    '<div class="panel-empty">点击左侧配置项查看详情</div>';
  CFG_ROWS.forEach(id => document.getElementById(id).classList.remove('active'));
}

function openPanel(type) {
  if (isSystemTask() && (type === 'audience' || type === 'timing')) return;
  if (taskDrawerMode === 'edit' && (type === 'audience' || type === 'timing')) return;
  destroyAudiencePanelWidgets();
  panelContentEditor?.destroy();
  panelContentEditor = null;
  activePanel = type;
  CFG_ROWS.forEach(id => document.getElementById(id).classList.remove('active'));

  const panel = document.getElementById('ntPanel');

  if (type === 'audience') {
    document.getElementById('rowAudience').classList.add('active');
    panel.innerHTML = `
      <div class="panel-title">选择人群</div>
      <p class="panel-hint">星灵标签与上传至少选择 1 项</p>
      <div class="tabs" id="audTabs">
        <button type="button" class="tab active" data-aud-tab="tags">星灵标签</button>
        <button type="button" class="tab" data-aud-tab="upload">上传</button>
        <button type="button" class="tab" data-aud-tab="viber">viber附加信息</button>
      </div>
      <div class="tab-pane" id="audPaneTags">
        <div id="audTagMsel"></div>
      </div>
      <div class="tab-pane" hidden id="audPaneUpload">
        <div class="upload-area" tabindex="0">
          <div class="upload-btns">
            <button type="button" class="btn btn-outline btn-sm" id="uploadFileBtn"><i data-lucide="file-up"></i>上传文件</button>
            <button type="button" class="btn btn-outline btn-sm" id="uploadFolderBtn"><i data-lucide="folder-up"></i>上传文件夹</button>
            <a class="link-btn" id="downloadTplBtn"><i data-lucide="download"></i>模板下载</a>
          </div>
          <p class="upload-drop-hint">支持拖拽或粘贴文件、文件夹到此处上传</p>
          <p class="upload-hint-limit">单个文件不应超过500,000</p>
          <input type="file" id="uploadFileInput" accept=".csv,.xlsx,.txt" hidden>
          <input type="file" id="uploadFolderInput" webkitdirectory hidden>
          <ul class="upload-list" id="uploadList"></ul>
        </div>
      </div>
      <div class="tab-pane" hidden id="audPaneViber">
        <p class="panel-hint">仅用于Viber通道</p>
        <div class="field">
          <span class="field-label">Biz message Exclude</span>
          <div id="audViberBizExcludeMsel"></div>
        </div>
        <div class="field" id="audViberBizBotsField" hidden>
          <span class="field-label">选择 Bot</span>
          <div id="audViberBizBotsMsel"></div>
        </div>
        <div class="field">
          <span class="field-label">Bot message Exclude</span>
          <div id="audViberBotExcludeMsel"></div>
        </div>
        <div class="field">
          <span class="field-label">Viber ID</span>
          <div class="upload-area" tabindex="0" id="viberIdUploadArea">
            <div class="upload-btns">
              <button type="button" class="btn btn-outline btn-sm" id="uploadViberIdBtn"><i data-lucide="file-up"></i>上传文件</button>
              <a class="link-btn" id="downloadViberIdTplBtn"><i data-lucide="download"></i>模板下载</a>
            </div>
            <p class="upload-drop-hint">支持拖拽或粘贴文件到此处上传</p>
            <input type="file" id="viberIdFileInput" accept=".csv,.xlsx,.txt" hidden>
            <ul class="upload-list" id="viberIdFileList"></ul>
          </div>
        </div>
      </div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    const defaultAudTab = draft.audienceFiles.length && !draft.audienceTags.length ? 'upload' : 'tags';
    const switchAudTab = tab => {
      panel.querySelectorAll('#audTabs .tab').forEach(t => {
        t.classList.toggle('active', t.dataset.audTab === tab);
      });
      panel.querySelector('#audPaneTags').hidden = tab !== 'tags';
      panel.querySelector('#audPaneUpload').hidden = tab !== 'upload';
      panel.querySelector('#audPaneViber').hidden = tab !== 'viber';
    };
    switchAudTab(defaultAudTab);
    panel.querySelectorAll('#audTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => switchAudTab(tab.dataset.audTab));
    });

    const viberCfg = draft.viberAudience || newViberAudienceConfig();
    const bizBotsField = panel.querySelector('#audViberBizBotsField');
    const syncBizBotsVisibility = selected => {
      bizBotsField.hidden = !selected.includes('account_lined_bots') && !selected.includes('accounts_subscribed_bots');
    };
    panelViberBizExcludeMsel = createSearchMultiSelect({
      container: panel.querySelector('#audViberBizExcludeMsel'),
      options: VIBER_BIZ_EXCLUDE_OPTIONS,
      selected: viberCfg.bizExclude,
      placeholder: '请选择 Exclude 项',
      searchPlaceholder: '搜索…',
      onChange: syncBizBotsVisibility,
    });
    syncBizBotsVisibility(viberCfg.bizExclude);
    panelViberBizBotsMsel = createSearchMultiSelect({
      container: panel.querySelector('#audViberBizBotsMsel'),
      options: VIBER_BOT_OPTIONS,
      selected: viberCfg.bizExcludeBots,
      placeholder: '请选择 Bot',
      searchPlaceholder: '搜索 Bot…',
    });
    panelViberBotExcludeMsel = createSearchMultiSelect({
      container: panel.querySelector('#audViberBotExcludeMsel'),
      options: VIBER_BOT_EXCLUDE_OPTIONS,
      selected: viberCfg.botExclude,
      placeholder: '请选择 Exclude 项',
      searchPlaceholder: '搜索…',
    });

    let pendingViberIdFile = viberCfg.viberIdFile;
    const renderViberIdFileList = () => {
      panel.querySelector('#viberIdFileList').innerHTML = pendingViberIdFile
        ? `<li><i data-lucide="file-check-2"></i>${pendingViberIdFile}<button type="button" class="icon-btn" id="rmViberIdFile"><i data-lucide="x"></i></button></li>`
        : '';
      panel.querySelector('#rmViberIdFile')?.addEventListener('click', () => {
        pendingViberIdFile = null;
        renderViberIdFileList();
      });
      refreshIcons();
    };
    renderViberIdFileList();
    const viberIdFileInput = panel.querySelector('#viberIdFileInput');
    const viberIdUploadArea = panel.querySelector('#viberIdUploadArea');
    const viberIdAccept = '.csv,.xlsx,.txt';
    const setViberIdFile = files => {
      if (!files.length) return;
      pendingViberIdFile = files[0].name;
      renderViberIdFileList();
    };
    panel.querySelector('#uploadViberIdBtn').addEventListener('click', () => viberIdFileInput.click());
    viberIdFileInput.addEventListener('change', () => {
      setViberIdFile([...viberIdFileInput.files].filter(f => matchFileAccept(f, viberIdAccept)));
      viberIdFileInput.value = '';
    });
    bindDropPasteUpload({
      zone: viberIdUploadArea,
      accept: viberIdAccept,
      onFiles: setViberIdFile,
    });
    panel.querySelector('#downloadViberIdTplBtn').addEventListener('click', () => showToast('Viber ID 上传模板已开始下载'));

    panelAudienceMsel = createSearchMultiSelect({
      container: panel.querySelector('#audTagMsel'),
      options: AUDIENCES.map(a => ({
        value: a.id,
        label: a.name,
        desc: `${a.count.toLocaleString()} 人`,
      })),
      selected: draft.audienceTags,
      placeholder: '请选择星灵标签',
      searchPlaceholder: '搜索标签…',
    });

    const pendingFiles = [...draft.audienceFiles];
    const renderUploadList = () => {
      panel.querySelector('#uploadList').innerHTML = pendingFiles.map((f, i) => `
        <li><i data-lucide="file-check-2"></i>${f}<button type="button" class="icon-btn" data-rm="${i}"><i data-lucide="x"></i></button></li>
      `).join('');
      panel.querySelectorAll('[data-rm]').forEach(btn => {
        btn.addEventListener('click', () => {
          pendingFiles.splice(Number(btn.dataset.rm), 1);
          renderUploadList();
        });
      });
      refreshIcons();
    };
    renderUploadList();

    const fileInput = panel.querySelector('#uploadFileInput');
    const folderInput = panel.querySelector('#uploadFolderInput');
    const uploadArea = panel.querySelector('.upload-area');
    const audienceAccept = '.csv,.xlsx,.txt';

    const addUploadedFiles = files => {
      files.forEach(f => pendingFiles.push(f.name));
      renderUploadList();
    };
    const addUploadedFolders = folders => {
      folders.forEach(({ name, count }) => pendingFiles.push(`${name}/（${count} 个文件）`));
      renderUploadList();
    };

    panel.querySelector('#uploadFileBtn').addEventListener('click', () => fileInput.click());
    panel.querySelector('#uploadFolderBtn').addEventListener('click', () => folderInput.click());
    fileInput.addEventListener('change', () => {
      addUploadedFiles([...fileInput.files].filter(f => matchFileAccept(f, audienceAccept)));
      fileInput.value = '';
    });
    folderInput.addEventListener('change', () => {
      if (folderInput.files.length) {
        const dir = folderInput.files[0].webkitRelativePath.split('/')[0];
        addUploadedFolders([{ name: dir, count: folderInput.files.length }]);
      }
      folderInput.value = '';
    });
    bindDropPasteUpload({
      zone: uploadArea,
      accept: audienceAccept,
      allowFolder: true,
      onFiles: addUploadedFiles,
      onFolders: addUploadedFolders,
    });
    panel.querySelector('#downloadTplBtn').addEventListener('click', () => showToast('人群上传模板已开始下载'));

    panel.querySelector('#panelOk').addEventListener('click', () => {
      const tags = panelAudienceMsel.getValue();
      if (!tags.length && !pendingFiles.length) {
        showToast('星灵标签与上传至少选择 1 项');
        return;
      }
      draft.audienceTags = tags;
      draft.audienceFiles = pendingFiles;
      draft.viberAudience = {
        bizExclude: panelViberBizExcludeMsel.getValue(),
        bizExcludeBots: panelViberBizBotsMsel.getValue(),
        botExclude: panelViberBotExcludeMsel.getValue(),
        viberIdFile: pendingViberIdFile,
      };
      closePanel();
      renderRows();
    });
  } else if (type === 'timing') {
    document.getElementById('rowTiming').classList.add('active');
    const t = draft.perChannel[draft.active].timing || {};
    const type0 = t.type || 'now';
    panel.innerHTML = `
      <div class="panel-title">发送时机 · ${CHANNELS[draft.active].tip}</div>
      <div class="field">
        <div class="radio-group">
          <label><input type="radio" name="ntTiming" value="now" ${type0 === 'now' ? 'checked' : ''}>审批通过后发送</label>
          <label><input type="radio" name="ntTiming" value="scheduled" ${type0 === 'scheduled' ? 'checked' : ''}>定时</label>
          <label><input type="radio" name="ntTiming" value="recurring" ${type0 === 'recurring' ? 'checked' : ''}>循环</label>
        </div>
      </div>
      <div class="send-config" id="ntScheduled" ${type0 !== 'scheduled' ? 'hidden' : ''}>
        <input type="datetime-local" class="input" id="ntDatetime" value="${t.datetime || '2026-07-15T10:00'}">
      </div>
      <div class="send-config" id="ntRecurring" ${type0 !== 'recurring' ? 'hidden' : ''}>
        <select class="select" id="ntFreq">
          <option value="daily" ${t.freq !== 'weekly' ? 'selected' : ''}>每天</option>
          <option value="weekly" ${t.freq === 'weekly' ? 'selected' : ''}>每周</option>
        </select>
        <select class="select" id="ntWeekday" ${t.freq !== 'weekly' ? 'hidden' : ''}>
          ${WEEKDAYS.map(w => `<option ${t.weekday === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
        <input type="time" class="input" id="ntTime" value="${t.time || '10:00'}">
      </div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    panel.querySelectorAll('input[name="ntTiming"]').forEach(r => {
      r.addEventListener('change', () => {
        panel.querySelector('#ntScheduled').hidden = r.value !== 'scheduled';
        panel.querySelector('#ntRecurring').hidden = r.value !== 'recurring';
      });
    });
    panel.querySelector('#ntFreq').addEventListener('change', e => {
      panel.querySelector('#ntWeekday').hidden = e.target.value !== 'weekly';
    });
    panel.querySelector('#panelOk').addEventListener('click', () => {
      const sel = panel.querySelector('input[name="ntTiming"]:checked').value;
      draft.perChannel[draft.active].timing = {
        type: sel,
        datetime: panel.querySelector('#ntDatetime').value,
        freq: panel.querySelector('#ntFreq').value,
        weekday: panel.querySelector('#ntWeekday').value,
        time: panel.querySelector('#ntTime').value,
      };
      closePanel();
      renderRows();
    });
  } else if (type === 'content') {
    document.getElementById('rowContent').classList.add('active');
    panel.innerHTML = `
      <div class="panel-title">发送内容</div>
      <div class="tabs panel-channel-tabs" id="ntContentChannelTabs"></div>
      <div id="ntContentEditor"></div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    const tabsHost = panel.querySelector('#ntContentChannelTabs');
    const editorHost = panel.querySelector('#ntContentEditor');
    renderChannelTabs(tabsHost, contentTabHandlers(tabsHost, editorHost));
    mountContentEditor(editorHost);

    panel.querySelector('#panelOk').addEventListener('click', () => {
      saveActiveContentEditor();
      closePanel();
      renderRows();
      renderPreview();
    });
  }

  panel.querySelector('#panelCancel')?.addEventListener('click', () => {
    closePanel();
    renderPreview();
  });
  enhanceSelects(panel);
  refreshIcons();
}

function createTask() {
  const name = document.getElementById('ntName').value.trim();
  if (!name) { showToast('请输入名称'); return; }
  if (!document.getElementById('ntProductLine').value) { showToast('请选择产品线'); return; }
  draft.taskType = document.querySelector('input[name="taskType"]:checked')?.value || 'manual';
  if (!isSystemTask() && !draft.audienceTags.length && !draft.audienceFiles.length) {
    showToast('请选择人群（星灵标签或上传至少 1 项）');
    return;
  }
  const missing = draft.channels.find(c => {
    if (!hasContent(draft.perChannel[c].content)) return true;
    if (!isSystemTask() && !draft.perChannel[c].timing) return true;
    return false;
  });
  if (missing) {
    showToast(isSystemTask()
      ? `请完成「${CHANNELS[missing].tip}」通道的内容配置`
      : `请完成「${CHANNELS[missing].tip}」通道的时机与内容配置`);
    return;
  }

  const channelLabel = CHANNELS[draft.channels[0]]?.label || draft.channels[0];
  RUNNING_TASKS.unshift({
    id: `T${Date.now()}`,
    name,
    channel: channelLabel,
    progress: 0,
  });

  renderRunningTasksTable();
  closeDrawer('taskDrawer');
  showToast('已提交审批');
}

function saveEditedTask() {
  saveActiveContentEditor();
  const missing = draft.channels.find(c => !hasContent(draft.perChannel[c].content));
  if (missing) {
    showToast(`请完成「${CHANNELS[missing].tip}」通道的内容配置`);
    return;
  }
  const t = typeof TASK_RECORDS !== 'undefined' ? TASK_RECORDS.find(x => x.id === editingTaskId) : null;
  if (!t) { showToast('未找到任务'); return; }
  t.channels = draft.channels.map(c => CHANNELS[c].label);
  t.channelContents = {};
  draft.channels.forEach(c => {
    const label = CHANNELS[c].label;
    t.channelContents[label] = {
      contentSummary: contentSummary(draft.perChannel[c].content, 80),
      template: t.template || '-',
      timing: t.timing,
      content: draft.perChannel[c].content,
    };
  });
  t.contentSummary = contentSummary(draft.perChannel[draft.channels[0]].content, 80);
  t.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  t.updatedBy = 'marvin@';
  closeDrawer('taskDrawer');
  showToast(`任务「${t.name}」已保存`);
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderKpis === 'function') renderKpis();
}

function submitTaskDrawer() {
  if (taskDrawerMode === 'edit') saveEditedTask();
  else createTask();
}

function bindTaskDrawer() {
  document.getElementById('rowAudience')?.addEventListener('click', () => {
    if (taskDrawerMode === 'edit') return;
    openPanel('audience');
  });
  document.getElementById('rowTiming')?.addEventListener('click', () => {
    if (taskDrawerMode === 'edit') return;
    openPanel('timing');
  });
  document.getElementById('rowContent')?.addEventListener('click', () => openPanel('content'));
  document.getElementById('ntName')?.addEventListener('input', () => {
    if (draft && draft.active === 'email') renderPreview();
  });
  document.querySelectorAll('input[name="taskType"]').forEach(r => {
    r.addEventListener('change', () => {
      if (!draft) return;
      draft.taskType = r.value;
      syncTaskTypeUi();
      renderRows();
    });
  });
  document.getElementById('createTaskBtn')?.addEventListener('click', submitTaskDrawer);
}

document.addEventListener('DOMContentLoaded', () => {
  const isReachPage = !!document.getElementById('phoneScreen');

  if (isReachPage) {
    renderSidebar('reach', 'reach-task');
    renderTopbar('reach');
    bindDrawerClose();
    renderApprovalQueue();
    bindApprovalQueueActions();
    renderRunningTasksTable();
    updatePhoneClock();
    setInterval(updatePhoneClock, 30 * 1000);
    bindPhoneScreen();
    refreshIcons();
  }

  if (document.getElementById('taskDrawer')) {
    bindTaskDrawer();
  }
});

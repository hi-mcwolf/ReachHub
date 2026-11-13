/* 页面二：触达主页 + 新建任务抽屉 */

const CHANNELS = {
  sms:      { label: 'SMS',      tip: '短信',     icon: 'message-square' },
  email:    { label: '邮件',     tip: '邮件',     icon: 'mail' },
  push:     { label: 'Push',     tip: 'Push',     icon: 'bell' },
  viber:    { label: 'Viber',    tip: 'Viber',    icon: 'phone-call' },
  messenger:{ label: 'Messenger',tip: 'Messenger',icon: 'message-circle' },
  whatsapp: { label: 'WhatsApp', tip: 'WhatsApp', icon: 'message-circle-more' },
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

/* 审批单的邮件内容与检测存档（6.9.2 场景：运营决定照发，审批人只读查看） */
const HOME_DEMO_EMAIL = {
  subject: 'Exclusive $50 Offer: Bet & Win!',
  preheader: "Don't miss the biggest jackpot of the week",
  body: '<p><img src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'1200\' height=\'600\'><rect width=\'100%\' height=\'100%\' fill=\'%23dbe4f5\'/><text x=\'50%\' y=\'50%\' font-size=\'64\' text-anchor=\'middle\' fill=\'%236b7a99\'>WORLD CUP FINAL · BET &amp; WIN</text></svg>" alt="" width="1200" height="600"></p><p>World Cup final night is here. Lock in your champion prediction before kick-off.</p>',
};
const HOME_DEMO_EMAIL_RECORDS = [
  { action: '已忽略', desc: '忽略全部提醒（强提醒 3 · 提醒 2 · 建议 2）', by: 'ken@', time: '2026-07-13 15:38' },
];
const APPROVAL_QUEUE = [
  { id: 'AP20260714003', name: 'Messenger 社群拉新', channel: 'Messenger', appliedAt: '2026-07-14 09:20',
    creator: 'lily@', audience: '新注册用户', taskType: '手动发送', timing: '定时 · 2026-07-15 10:00', category: '营销', site: 'bp-growth',
    contentSummary: '加入官方社群，每日抽奖赢免费竞猜券！', template: '-' },
  { id: 'AP20260713002', name: '世界杯决赛邮件预告', channel: '邮件', appliedAt: '2026-07-13 15:40',
    creator: 'ken@', audience: '活跃用户', taskType: '手动发送', timing: '立即发送', category: '营销', site: 'bp-growth',
    contentSummary: '决赛之夜即将来临，提前锁定您的冠军竞猜…', template: '世界杯竞猜提醒',
    emailContent: HOME_DEMO_EMAIL, emailRecords: HOME_DEMO_EMAIL_RECORDS },
  { id: 'AP20260712001', name: '沉默用户唤醒短信', channel: 'SMS', appliedAt: '2026-07-12 11:05',
    creator: 'marvin@', audience: '沉默用户', taskType: '系统调用', taskCode: 'TC-20260712001', timing: '循环 · 每周一 09:00', category: '营销', site: 'bp-vip',
    contentSummary: '好久不见！您的老朋友 BingoPlus 为您准备了回归好礼…', template: '流失召回话术' },
];

const RUNNING_TASKS = [
  { id: 'T20260713001', name: '世界杯竞猜预热短信', channel: 'SMS', progress: 75, status: 'running', estFinish: '18:02', estRange: 5,
    creator: 'marvin@', createdAt: '2026-07-12 10:20', approver: 'lily@', approvedAt: '2026-07-12 11:00',
    audience: '活跃用户', taskType: '系统调用', taskCode: 'TC-20260713001', timing: '2026-07-13 18:00 定时',
    activityId: 'ACT202607001', activityName: '世界杯竞猜预热',
    contentSummary: 'Only the best teams remain! Warm up for the Quarterfinals…', template: '世界杯竞猜提醒',
    execution: { total: 12800, pushable: 12160, valid: 11776, duplicate: 384, blacklist: 256, dnd: 128, dnc: 64,
      pushCount: 9632, pushVendorFail: 96, pushSuccess: 9459, pushFail: 173, pendingConfirm: 482 } },
  { id: 'T20260713013', name: '新用户充值召回邮件', channel: '邮件', progress: 38, status: 'running', estFinish: '16:58', estRange: 2, estimated: '邮件通道未接入任务级调度，按当前队列深度估算',
    creator: 'lily@', createdAt: '2026-07-11 14:05', approver: 'marvin@', approvedAt: '2026-07-11 15:00',
    audience: '新注册用户', taskType: '手动发送', timing: '每天 10:00 循环',
    activityId: 'ACT202607003', activityName: '新用户注册礼包',
    contentSummary: '尊敬的用户，本周充值满 500 即享 8% 加赠…', template: '充值优惠通知',
    execution: { total: 5600, pushable: 5320, valid: 5152, duplicate: 168, blacklist: 112, dnd: 56,
      pushCount: 2128, pushVendorFail: 21, pushSuccess: 2051, pushFail: 77, pendingConfirm: 106 } },
  { id: 'T20260712014', name: 'VIP 沉默用户 Push 召回', channel: 'Push', progress: 52, status: 'running', estFinish: '17:20', estRange: 3, estimated: 'Push 通道未接入任务级调度，按当前队列深度估算',
    creator: 'ken@', createdAt: '2026-07-08 11:00', approver: 'lily@', approvedAt: '2026-07-08 12:00',
    audience: 'VIP用户 · 沉默用户', taskType: '系统调用', taskCode: 'TC-20260712004', timing: '每天 09:00 循环',
    activityId: 'ACT202607004', activityName: 'VIP 专属回归礼',
    contentSummary: '您的专属权益即将到期，登录立即领取…', template: '-',
    execution: { total: 21200, pushable: 20140, valid: 19504, duplicate: 636, blacklist: 424, dnd: 212,
      pushCount: 11024, pushVendorFail: 110, pushSuccess: 10814, pushFail: 210, pendingConfirm: 551 } },
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

/* ================= 二期：新建 / 编辑任务表单改造 =================
 * 6.1.2 产品线取 site id、任务类型（手动发送 / 系统调用）与任务code 保持一期；6.5.5 到点占位；6.6.3 提交前 ETA 预览；6.9.2 邮件检测面板 */
const RH_CH_V2 = { sms: 'SMS', email: '邮件', push: 'Push', inbox: '站内信', viber: 'Viber Biz', messenger: 'Messenger Bot', whatsapp: 'WhatsApp' }; /* 无 IM 通道；Viber 按内容「渠道」、Messenger 按发送账号（Bot / 主页）区分 Biz / Bot */
const RH_CAT_HINT = {
  营销: '营销类：按营销频控、DND 与退订名单过滤；邮件通道执行内容检测（只提醒不阻断）',
  通知: '通知类：不按邮件退订名单过滤，DND 与频控按通知规则；邮件通道同样执行内容检测',
  'OTP': 'OTP仅系统调用，手动任务不可选',
};
const RH_SENDABLE_RATIO = 0.92;   /* 近 30 天该产品线该通道可推送比例（mock） */
const RH_LEGACY_TPS = { 邮件: 300, Push: 800, 站内信: 1000, 'Viber Biz': 20, 'Viber Bot': 20, 'Messenger Biz': 20, 'Messenger Bot': 20, WhatsApp: 20 };  /* 未接入任务级调度通道的估算吞吐（mock） */
const RH_FILE_EST = 5000;         /* 上传文件的预估人数（mock，按文件行数） */
let panelEmailCheck = null;
let rhEtaTimer = null;

function rhChannelLabel(c) { if (c === 'viber') return (typeof draft !== 'undefined' && draft?.perChannel?.viber?.content?.channel === 'bot') ? 'Viber Bot' : 'Viber Biz'; if (c === 'messenger') { const acc = (typeof draft !== 'undefined' && draft?.perChannel?.messenger?.content?.account) || ''; return /Bot/i.test(acc) || !acc ? 'Messenger Bot' : 'Messenger Biz'; } return RH_CH_V2[c] || c; }
function rhSiteOf(value) {
  if (!value) return '';
  const p = V2_PRODUCT_LINES.find(x => x.siteId === value || x.name === value);
  return p ? p.siteId : value;
}
function rhCurrentSite() { return rhSiteOf(document.getElementById('ntProductLine')?.value || draft?.productLine || ''); }
function rhSenderOf(site) { return String(site || '').toUpperCase().replace(/[^A-Z]/g, ''); }
function rhPad(n) { return String(n).padStart(2, '0'); }
function rhFmtTime(d) {
  const now = new Date();
  const hm = `${rhPad(d.getHours())}:${rhPad(d.getMinutes())}`;
  return d.toDateString() === now.toDateString() ? hm : `${rhPad(d.getMonth() + 1)}-${rhPad(d.getDate())} ${hm}`;
}
function rhMinuteOfDay(str) {
  const m = String(str || '').match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function rhDefaultDatetime() { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${rhPad(d.getMonth() + 1)}-${rhPad(d.getDate())}T10:00`; }
function rhHm(min) { const m = ((min % 1440) + 1440) % 1440; return `${rhPad(Math.floor(m / 60))}:${rhPad(m % 60)}`; }

function rhAudienceCount() {
  if (!draft) return 0;
  const tags = draft.audienceTags.reduce((s, id) => s + (AUDIENCES.find(a => a.id === id)?.count || 0), 0);
  return tags + draft.audienceFiles.length * RH_FILE_EST;
}

/* 目标队列 = 该产品线所在业务线在该通道的账号（发送方标识覆盖该产品线） */
function rhCandidateAccounts(site, ch) {
  const pl = V2_PRODUCT_LINES.find(p => p.siteId === site);
  const v2ch = RH_CH_V2[ch];
  if (!pl || !v2ch) return [];
  const accs = V2_ACCOUNTS.filter(a => a.channel === v2ch && a.bl === pl.bl && a.mode !== 'otp');
  if (v2ch !== 'SMS') return accs;
  const sender = rhSenderOf(site);
  const own = accs.filter(a => a.mode === 'tasklevel' && a.senders.includes(sender));
  return own.length ? own : accs.filter(a => a.mode === 'tasklevel');
}
function rhAccountDepth(acc) {
  return V2_TASKS.filter(t => t.account === acc.id && (t.status === 'queued' || t.status === 'sending') && t.id !== editingTaskId)
    .reduce((s, t) => s + (t.remaining || 0), 0);
}
function rhQueueFor(site, ch) {
  const accs = rhCandidateAccounts(site, ch);
  if (!accs.length) return null;
  const rows = accs.map(a => {
    const tps = a.mode === 'tasklevel' ? a.tps : (a.tps || RH_LEGACY_TPS[a.channel]);
    return { acc: a, tps, waitSec: tps ? rhAccountDepth(a) / tps : 0, estimated: a.mode !== 'tasklevel' };
  }).filter(r => r.tps);
  if (!rows.length) return null;
  return rows.sort((x, y) => x.waitSec - y.waitSec)[0]; /* 多账号取深度最小者 */
}

/* 6.6.3 提交前 ETA 预览：选定产品线、通道、人群后显示；只给时间，不出现位置 / 前方条数 / 让行信息 */
function rhEtaLines() {
  if (!draft || isSystemTask()) return [];
  const site = rhCurrentSite();
  const people = rhAudienceCount();
  if (!site || !people) return [];
  const bl = V2_PRODUCT_LINES.find(p => p.siteId === site)?.bl || '';
  const now = new Date();
  return draft.channels.map(c => {
    const q = rhQueueFor(site, c);
    if (!q) return null; /* 调度器无数据时不显示 */
    const timing = draft.perChannel[c]?.timing;
    const self = Math.round(people * RH_SENDABLE_RATIO);
    const est = q.estimated ? '（估算）' : '';
    const waitMin = Math.max(1, Math.round(q.waitSec / 60));
    const durMs = Math.max(60, self / q.tps) * 1000;
    if (timing?.type === 'scheduled' && timing.datetime) {
      const plan = new Date(timing.datetime);
      const clear = new Date(now.getTime() + q.waitSec * 1000);
      const start = isNaN(plan) ? clear : new Date(Math.max(plan.getTime(), clear.getTime()));
      return { scheduled: true, text: `${rhChannelLabel(c)} · ${bl}：预计 ${rhFmtTime(start)} 开始${est}（计划时间与队列清空取较晚者），按预估人数 ${fmtN(people)} 推算 ${rhFmtTime(new Date(start.getTime() + durMs))} 完成${est}。` };
    }
    const start = new Date(now.getTime() + q.waitSec * 1000);
    return { scheduled: false, text: `当前 ${rhChannelLabel(c)} · ${bl} 队列排队约 ${waitMin} 分钟；按预估人数 ${fmtN(people)} 推算：预计 ${rhFmtTime(start)} 开始、${rhFmtTime(new Date(start.getTime() + durMs))} 完成${est}。` };
  }).filter(Boolean);
}
function renderEtaPreview() {
  const host = document.getElementById('ntEtaPreview');
  if (!host) return;
  const lines = rhEtaLines();
  host.hidden = !lines.length;
  if (!lines.length) { host.innerHTML = ''; return; }
  const tail = lines.some(l => !l.scheduled) ? '如需更早送达可联系管理员或改为定时。' : '';
  host.innerHTML = `<div class="v2-callout"><i data-lucide="info"></i><div class="nt-eta-lines">
    ${lines.map(l => `<span>${esc(l.text)}</span>`).join('')}${tail ? `<span>${tail}</span>` : ''}</div></div>`;
  refreshIcons();
}
function scheduleEtaPreview() {
  clearTimeout(rhEtaTimer);
  rhEtaTimer = setTimeout(renderEtaPreview, 500); /* 防抖 500 ms */
}

/* 6.5.5 到点占位：仅发送时机 = 定时 且具备「队列管理」权限时可见；短信以外未接入调度的通道置灰 */
function rhReserveInfo(c) {
  const site = rhCurrentSite();
  const timing = draft.perChannel[c]?.timing;
  const accs = rhCandidateAccounts(site, c);
  const acc = accs.find(a => a.mode === 'tasklevel') || null;
  const self = Math.round(rhAudienceCount() * RH_SENDABLE_RATIO);
  const minutes = acc && self ? Math.max(1, Math.ceil(self / acc.tps / 60)) : null;
  let conflict = null;
  const start = rhMinuteOfDay(timing?.datetime);
  if (acc && start !== null) {
    const end = start + (minutes || 1);
    V2_TASKS.filter(t => t.reserve && t.account === acc.id && t.id !== editingTaskId).some(t => {
      const s = rhMinuteOfDay(t.sched);
      if (s === null) return false;
      const from = s - 15, to = s + 15;
      if (start < to && end > from) { conflict = { task: t, from: rhHm(from), to: rhHm(to) }; return true; }
      return false;
    });
  }
  return { acc, minutes, conflict, enabled: !!acc };
}
function rhConflictText(info) {
  const c = info.conflict;
  return `该队列（${info.acc.channel} · ${info.acc.vendor} · ${info.acc.id}）${c.from}–${c.to} 已有占位任务 ${c.task.id} ${c.task.name}，将按计划时间先后生效`;
}
function renderReserveField() {
  const field = document.getElementById('ntReserveField');
  if (!field || !draft) return;
  const chs = draft.channels.filter(c => draft.perChannel[c]?.timing?.type === 'scheduled');
  const visible = typeof hasPerm === 'function' && hasPerm('queue') && !isSystemTask() && chs.length > 0;
  field.hidden = !visible;
  if (!visible) { field.innerHTML = ''; return; }
  draft.reserve = draft.reserve || {};
  const tips = [];
  const rows = chs.map(c => {
    const info = rhReserveInfo(c);
    const on = !!draft.reserve[c] && info.enabled;
    if (on) {
      tips.push(`<div class="v2-callout"><i data-lucide="zap"></i><span>${rhChannelLabel(c)}：将优先于同队列其他任务；${info.minutes ? `按当前吞吐预计占用 ${info.minutes} 分钟` : '选择人群后显示预计占用时长'}</span></div>`);
      if (info.conflict) tips.push(`<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><span>${esc(rhConflictText(info))}</span></div>`);
    }
    return `<div class="nt-reserve-row${info.enabled ? '' : ' is-disabled'}">
      <label class="v2-switch"><input type="checkbox" data-reserve="${c}" ${on ? 'checked' : ''} ${info.enabled ? '' : 'disabled'}><span></span></label>
      <span>${rhChannelLabel(c)}</span>
      ${info.enabled ? '<span class="v2-hint">到达发送时间时自动插队</span>' : '<span class="v2-hint">该通道未接入任务级调度，暂不支持到点占位</span>'}
    </div>`;
  });
  field.innerHTML = `<span class="field-label">到点占位</span>${rows.join('')}${tips.length ? `<div class="nt-reserve-tips">${tips.join('')}</div>` : ''}`;
  field.querySelectorAll('[data-reserve]').forEach(cb => cb.addEventListener('change', () => {
    draft.reserve[cb.dataset.reserve] = cb.checked;
    renderReserveField();
  }));
  refreshIcons();
}
function rhActiveReserves() {
  if (!draft?.reserve || !hasPerm('queue')) return [];
  return draft.channels.filter(c => draft.reserve[c] && draft.perChannel[c]?.timing?.type === 'scheduled')
    .map(c => ({ c, info: rhReserveInfo(c) })).filter(r => r.info.enabled);
}

/* 6.9.2 邮件检测：提交按钮旁「强提醒 N」 */
function rhEmailCheckInput() {
  const c = draft?.perChannel?.email?.content;
  if (!c) return null;
  return { ...ecInputFromContent(c, rhCurrentSite()), footerVersion: draft.emailFooter || '' };
}
function renderSubmitBadge() {
  const host = document.getElementById('ntCheckBadge');
  if (!host) return;
  const input = draft?.channels.includes('email') && typeof ecAnalyze === 'function' ? rhEmailCheckInput() : null;
  host.innerHTML = input && (input.subject || input.bodyHtml) ? ecBadgeHtml(ecAnalyze(input).counts) : '';
}
function mountEmailCheckFor(editorHost) {
  panelEmailCheck?.destroy();
  panelEmailCheck = null;
  document.getElementById('ntEmailCheck')?.remove();
  if (!editorHost || draft.active !== 'email' || typeof renderEmailCheck !== 'function') return;
  const host = document.createElement('div');
  host.id = 'ntEmailCheck';
  editorHost.after(host);
  panelEmailCheck = renderEmailCheck(host, {
    ...rhEmailCheckInput(),
    records: draft.emailCheck?.records || [],
    onApply: (field, value) => {
      const v = panelContentEditor.getValue();
      if (field === 'subject') v.subject = value; else v.body = value;
      panelContentEditor.setValue(v);
      draft.perChannel.email.content = panelContentEditor.getValue();
      draft.emailCheck = panelEmailCheck.getResult();
      renderPreview();
      renderRows();
    },
    onIgnore: res => { draft.emailCheck = res; },
    onFooterChange: ver => { draft.emailFooter = ver; draft.emailCheck = panelEmailCheck.getResult(); renderSubmitBadge(); },
  });
}
function rhArchiveEmailCheck() {
  if (!draft.channels.includes('email') || typeof ecAnalyze !== 'function') return null;
  const res = ecAnalyze(rhEmailCheckInput(), { full: true }); /* 提交时全量检测（含 AI 语义与评分） */
  const records = draft.emailCheck?.records || [];
  return { ...res, records, ignored: records.some(r => r.action === '已忽略') };
}

function syncPlMeta() {
  const host = document.getElementById('ntPlMeta');
  if (!host) return;
  const site = rhCurrentSite();
  const pl = V2_PRODUCT_LINES.find(p => p.siteId === site);
  host.innerHTML = pl ? `site id：${esc(pl.siteId)}<span class="tag tag-info">业务线 ${esc(pl.bl)}</span>${pl.status !== '启用' ? '<span class="tag tag-gray">已下线</span>' : ''}`
    : (site ? `<span class="tag tag-gray">未知产品线</span>` : '');
}
function syncCategoryUi() {
  if (!draft) return;
  const locked = taskDrawerMode === 'edit' || taskDrawerMode === 'change';
  document.querySelectorAll('input[name="taskType"]').forEach(r => {
    r.checked = r.value === draft.taskType;
    r.disabled = locked;
  });
  /* 统计口径派生：任务来源 = 任务类型（手动发送 → 手动，系统调用 → API）；消息类别不由表单录入 */
  draft.source = draft.taskType === 'system' ? 'API' : '手动';
}
function rhAfterRender() {
  syncPlMeta();
  renderReserveField();
  renderSubmitBadge();
  scheduleEtaPreview();
}

/* 三个页面（首页 / 任务记录 / 模板管理）共用同一份抽屉 DOM：运行时改造为二期字段 */
function upgradeTaskDrawerV2() {
  const drawer = document.getElementById('taskDrawer');
  if (!drawer || drawer.dataset.v2) return;
  drawer.dataset.v2 = '1';
  const pl = document.getElementById('ntProductLine');
  if (pl) {
    pl.innerHTML = '<option value="">请选择产品线</option>' + V2_PRODUCT_LINES.filter(p => p.status === '启用')
      .map(p => `<option value="${p.siteId}">${esc(p.name)}</option>`).join('');
    const meta = document.createElement('div');
    meta.className = 'v2-hint nt-pl-meta';
    meta.id = 'ntPlMeta';
    pl.closest('.field').appendChild(meta);
  }
  /* 任务类型（手动发送 / 系统调用）与任务 code 保持一期表单（Marvin 2026-11-12）；任务来源 / 消息类别不在表单录入 */
  const timingField = document.getElementById('ntTimingField');
  if (timingField && !document.getElementById('ntReserveField')) {
    timingField.insertAdjacentHTML('afterend', '<div class="field" id="ntReserveField" hidden></div><div class="nt-eta" id="ntEtaPreview" hidden></div>');
  }
  const submit = document.getElementById('createTaskBtn');
  if (submit && !document.getElementById('ntCheckBadge')) submit.insertAdjacentHTML('beforebegin', '<span id="ntCheckBadge"></span>');
}

function newChannelConfig() {
  return { timing: null, content: null };
}

function newViberAudienceConfig() {
  return { bizExclude: [], bizExcludeBots: [], botExclude: [] };
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
    activityId: '',
    activityName: '',
    taskType: 'manual',
    source: '手动',      /* 派生自任务类型，不在表单录入 */
    reserve: {},         /* 到点占位：按通道 */
    emailCheck: null,
    emailFooter: '',
    taskCode: '',
    resendFilter: null,
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
  const actEl = document.getElementById('ntActivity');
  if (actEl) actEl.value = '';
  const codeEl = document.getElementById('ntTaskCode');
  if (codeEl) codeEl.value = '';
  setTaskDrawerMode('create');
  closePanel();
  syncTaskTypeUi();
  renderRows();
  renderPreview();
}

function setTaskDrawerMode(mode) {
  taskDrawerMode = mode;
  const locked = mode === 'edit' || mode === 'change';
  const titles = { create: '新建', edit: '编辑任务', change: '变更任务' };
  const title = document.getElementById('taskDrawerTitle');
  const submit = document.getElementById('createTaskBtn');
  const nameEl = document.getElementById('ntName');
  const plEl = document.getElementById('ntProductLine');
  const actEl = document.getElementById('ntActivity');
  const codeEl = document.getElementById('ntTaskCode');
  if (title) title.textContent = titles[mode] || '新建';
  if (submit) submit.textContent = locked ? '保存' : '提交审批';
  if (nameEl) nameEl.disabled = locked;
  if (plEl) plEl.disabled = locked;
  if (actEl) actEl.disabled = locked;
  if (codeEl) codeEl.disabled = locked;
  syncCategoryUi();
  document.getElementById('rowAudience')?.classList.toggle('cfg-row-locked', mode === 'edit');
  document.getElementById('rowTiming')?.classList.toggle('cfg-row-locked', locked);
}

function isSystemTask() {
  return draft?.taskType === 'system';
}

function syncTaskTypeUi() {
  const sys = isSystemTask();
  const audField = document.getElementById('ntAudienceField');
  const timingField = document.getElementById('ntTimingField');
  const codeField = document.getElementById('ntTaskCodeField');
  if (audField) audField.hidden = sys;
  if (timingField) timingField.hidden = sys;
  if (codeField) codeField.hidden = !sys;
  if (audField?.hidden && activePanel === 'audience') closePanel();
  if (timingField?.hidden && activePanel === 'timing') closePanel();
  if (activePanel === 'content') {
    const editorHost = document.getElementById('ntContentEditor');
    if (editorHost) mountContentEditor(editorHost);
  }
}

function toDraftChannel(label) {
  const key = typeof normalizeChannel === 'function' ? normalizeChannel(label) : String(label || '').toLowerCase();
  if (CHANNELS[key]) return key;
  const fallback = { im: 'viber' };
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
  if (!sel) return;
  const site = rhSiteOf(value);
  if (!site) { sel.value = ''; return; }
  if (![...sel.options].some(o => o.value === site)) {
    const pl = V2_PRODUCT_LINES.find(p => p.siteId === site);
    const opt = document.createElement('option');
    opt.value = site;
    opt.textContent = pl ? `${pl.name}${pl.status !== '启用' ? '（已下线）' : ''}` : `未知产品线（${value}）`;
    sel.appendChild(opt);
  }
  sel.value = site;
}

function ensureActivityOption(id, name) {
  const sel = document.getElementById('ntActivity');
  if (!sel) return;
  if (!id) {
    sel.value = '';
    return;
  }
  if (![...sel.options].some(o => o.value === id)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = name || id;
    sel.appendChild(opt);
  }
  sel.value = id;
}

function syncDraftActivityFromSelect() {
  if (!draft) return;
  const sel = document.getElementById('ntActivity');
  const id = sel?.value || '';
  const act = activityById(id);
  draft.activityId = id;
  draft.activityName = act?.name || (sel?.selectedOptions?.[0]?.textContent?.trim() || '');
}

function openTaskEdit(task, mode = 'edit') {
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
    productLine: rhSiteOf(task.site || task.productLine || ''),
    activityId: task.activityId || '',
    activityName: task.activityName || activityById(task.activityId)?.name || '',
    taskType: (task.source === 'API' || task.taskType === 'API' || task.taskType === '系统调用' || task.taskType === 'system') ? 'system' : 'manual',
    source: (task.source === 'API' || task.taskType === 'API' || task.taskType === '系统调用' || task.taskType === 'system') ? 'API' : '手动',
    category: task.category || '营销',
    reserve: task.reserve ? Object.fromEntries(channels.filter(c => c === 'sms').map(c => [c, true])) : {},
    emailCheck: task.emailCheck || null,
    emailFooter: task.emailCheck?.footerVersion || '',
    taskCode: task.taskCode || '',
    resendFilter: null,
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
  ensureActivityOption(draft.activityId, draft.activityName);
  const codeEl = document.getElementById('ntTaskCode');
  if (codeEl) codeEl.value = draft.taskCode;
  setTaskDrawerMode(mode);
  closePanel();
  syncTaskTypeUi();
  renderRows();
  renderPreview();
  openDrawer('taskDrawer');
  initCharCounters(document.getElementById('taskDrawer'));
}

/* 已终止的系统调用任务：变更（可重新选择人群过滤方式与内容） */
function openTaskChange(task) {
  openTaskEdit(task, 'change');
}

/* 从模板新建任务：带入通道与模板内容 */
function openTaskCreateWithContent(channelLabel, content) {
  if (!document.getElementById('taskDrawer')) return;
  const ch = toDraftChannel(channelLabel);
  initDraft(ch);
  if (content) {
    const copy = JSON.parse(JSON.stringify(content));
    draft.perChannel[ch].content = typeof ensureContentValue === 'function'
      ? ensureContentValue(ch, copy)
      : copy;
  }
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

/* 预计完成（PRD 6.6.2）：HH:mm ± 区间；估算标记 hover 说明原因。运营可见，不展示排队位置 */
function homeEtaHtml(t) {
  if (!t.estFinish) return '-';
  return `${t.estFinish}<span class="v2-pm">±${t.estRange || 1} 分</span>${t.estimated ? `<span class="v2-est" title="${esc(t.estimated)}">估算</span>` : ''}`;
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
      <td>${homeEtaHtml(t)}</td>
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
  dnc: '命中 DNC（Do Not Call/Contact）名单的用户数，仅短信通道',
  dnd: '命中 DND（Do Not Disturb）免打扰名单的用户数',
  pushCount: '成功推送至供应商的条数',
  pushVendorFail: '推送至供应商失败的条数（未被供应商受理）',
  pushSuccess: '供应商回执推送成功的条数',
  pushFail: '供应商回执推送失败的条数',
  pendingConfirm: '已推送至供应商、待供应商回执确认的条数',
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

  /* 两维状态（4.4.4）：待审批的任务 = 待发送 + 「待审批」辅助文案；「发送中 / 已启用」合并为发送中 */
  const statusTag = isApproval
    ? `${v2Tag(V2_TASK_STATUS, 'pending')} <span class="v2-hint">待审批</span>`
    : v2Tag(V2_TASK_STATUS, item.status === 'running' ? 'sending' : item.status);
  const source = item.source || (isSystemTaskType(item.taskType) ? 'API' : '手动');
  const site = rhSiteOf(item.site || item.productLine || '');
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
        ${homeExecMetric('DND用户数', 'dnd', item.execution.dnd)}
        ${item.channel === 'SMS' ? homeExecMetric('DNC用户数', 'dnc', item.execution.dnc) : ''}
        ${homeExecMetric('推送至供应商成功条数', 'pushCount', item.execution.pushCount)}
        ${homeExecMetric('推送至供应商失败条数', 'pushVendorFail', item.execution.pushVendorFail)}
        ${homeExecMetric('供应商推送成功条数', 'pushSuccess', item.execution.pushSuccess)}
        ${homeExecMetric('供应商推送失败条数', 'pushFail', item.execution.pushFail)}
        ${homeExecMetric('待供应商确认条数', 'pendingConfirm', item.execution.pendingConfirm)}
      </div>
    </section>`;

  body.classList.add('drawer-body--split');
  body.innerHTML = `
    <aside class="detail-preview" id="homeDetailPreview"></aside>
    <div class="detail-main">
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">任务名称</span><span>${item.name}</span></div>
        <div class="desc-item"><span class="desc-label">任务 ID</span><span>${item.id}</span></div>
        <div class="desc-item"><span class="desc-label">创建人</span><span>${item.creator}</span></div>
        <div class="desc-item"><span class="desc-label">创建时间</span><span>${isApproval ? item.appliedAt : item.createdAt}</span></div>
        <div class="desc-item"><span class="desc-label">任务状态</span><span>${statusTag}</span></div>
        ${isApproval ? '' : `<div class="desc-item"><span class="desc-label desc-label-with-tip">预计完成${tipIcon('按当前通道吞吐推算，供参考；通道繁忙或供应商波动时会变化')}</span><span>${homeEtaHtml(item)}</span></div>`}
        <div class="desc-item"><span class="desc-label">审批状态</span><span>${approvalTag}</span></div>
        <div class="desc-item"><span class="desc-label">审批人</span><span>${isApproval ? '-' : hfmt(item.approver)}</span></div>
        <div class="desc-item"><span class="desc-label">审批时间</span><span>${isApproval ? '-' : hfmt(item.approvedAt)}</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">配置信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">发送对象</span><span>${hfmt(item.audience)}</span></div>
        <div class="desc-item"><span class="desc-label">任务类型</span><span>${source === 'API' ? '系统调用' : '手动发送'}${source === 'API' && item.app ? ` · ${esc(item.app)}` : ''}</span></div>
        ${source === 'API' ? `<div class="desc-item"><span class="desc-label">任务code</span><span>${hfmt(item.taskCode)}</span></div>` : ''}
        <div class="desc-item"><span class="desc-label">产品线</span><span>${site ? esc(plName(site)) : '-'}</span></div>
        <div class="desc-item"><span class="desc-label">通道配置</span><span><span class="tag tag-primary">${item.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">发送时机</span><span>${hfmt(item.timing)}</span></div>
        <div class="desc-item"><span class="desc-label">模板名称</span><span>${hfmt(item.template)}</span></div>
        <div class="desc-item"><span class="desc-label">活动 ID</span><span>${hfmt(item.activityId)}</span></div>
        <div class="desc-item"><span class="desc-label">活动名称</span><span>${hfmt(item.activityName)}</span></div>
      </div>
    </section>
    ${execSection}
    ${item.emailContent ? '<section class="card detail-group"><h4 class="card-title">内容检测结果</h4><div id="homeDetailEmailCheck"></div></section>' : ''}
    </div>`;
  if (item.emailContent && typeof renderEmailCheck === 'function') {
    renderEmailCheck(document.getElementById('homeDetailEmailCheck'), {
      ...ecInputFromContent(item.emailContent, site), readOnly: true, full: true, records: item.emailRecords || [],
    });
  }

  mountDetailPreview(document.getElementById('homeDetailPreview'), [{
    channel: item.channel,
    content: item.emailContent || (item.contentSummary === '-' ? '' : item.contentSummary),
    fallbackTitle: item.name,
  }]);

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
    if (item && CHANNELS[item.dataset.channel]?.disabled) {
      tip.textContent = '敬请期待';
    } else {
      tip.textContent = item
        ? `创建${CHANNELS[item.dataset.channel].tip}`
        : '点击APP图标创建任务';
    }
    tip.style.display = 'block';
    tip.style.left = e.clientX + 'px';
    tip.style.top = e.clientY + 'px';
  });
  screen.addEventListener('mouseleave', () => { tip.style.display = 'none'; });

  screen.querySelectorAll('.app-item').forEach(item => {
    item.addEventListener('click', () => {
      if (CHANNELS[item.dataset.channel]?.disabled) return;
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
  const remaining = Object.keys(CHANNELS).filter(c => !draft.channels.includes(c) && !CHANNELS[c].disabled);
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
    showSmsConfigMode: !isSystemTask(),
    onChange: () => {
      draft.perChannel[draft.active].content = panelContentEditor.getValue();
      if (panelEmailCheck && draft.active === 'email') panelEmailCheck.update(rhEmailCheckInput());
      renderPreview();
      renderRows();
    },
  });
  mountEmailCheckFor(container);
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
  rhAfterRender();
}

function renderPreview() {
  const host = document.getElementById('ntPreview');
  const ch = draft.active;
  const content = draft.perChannel[ch].content;
  const fallbackTitle = draft.name || document.getElementById('ntName').value || '触达通知';
  host.innerHTML = channelPreviewHtml(ch, content, {
    emptyText: '您配置的内容将实时显示在这里…',
    fallbackTitle,
  });
  refreshIcons();
}

function closePanel() {
  panelEmailCheck?.destroy();
  panelEmailCheck = null;
  destroyAudiencePanelWidgets();
  panelContentEditor?.destroy();
  panelContentEditor = null;
  activePanel = null;
  document.getElementById('ntPanel').innerHTML =
    '<div class="panel-empty">点击左侧配置项查看详情</div>';
  CFG_ROWS.forEach(id => document.getElementById(id).classList.remove('active'));
}

function openPanel(type) {
  if (isSystemTask() && type === 'timing') return;
  if (isSystemTask() && type === 'audience') return;
  if (taskDrawerMode === 'edit' && (type === 'audience' || type === 'timing')) return;
  destroyAudiencePanelWidgets();
  panelContentEditor?.destroy();
  panelContentEditor = null;
  panelEmailCheck = null;
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
      <div class="collapse-section aud-viber-collapse" id="audViberExtra">
        <button type="button" class="collapse-toggle" id="viberExtraToggle">
          <i data-lucide="chevron-right"></i>viber附加信息
        </button>
        <div class="collapse-body" hidden id="viberExtraBody">
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
        </div>
      </div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    /* viber附加信息折叠区：随当前 tab 移动，默认收起 */
    const viberExtra = panel.querySelector('#audViberExtra');
    const viberExtraBody = panel.querySelector('#viberExtraBody');
    const ntPanelEl = document.getElementById('ntPanel');
    const ensureViberExtraVisible = () => {
      if (!viberExtra?.classList.contains('open') || viberExtraBody?.hidden) return;
      requestAnimationFrame(() => {
        const panelRect = ntPanelEl?.getBoundingClientRect();
        const bodyRect = viberExtraBody.getBoundingClientRect();
        if (panelRect && bodyRect.bottom > panelRect.bottom - 12) {
          ntPanelEl.scrollTop += bodyRect.bottom - panelRect.bottom + 24;
        }
      });
    };
    panel.querySelector('#viberExtraToggle').addEventListener('click', () => {
      viberExtraBody.hidden = !viberExtraBody.hidden;
      viberExtra.classList.toggle('open', !viberExtraBody.hidden);
      if (!viberExtraBody.hidden) ensureViberExtraVisible();
    });

    const defaultAudTab = draft.audienceFiles.length && !draft.audienceTags.length ? 'upload' : 'tags';
    const switchAudTab = tab => {
      panel.querySelectorAll('#audTabs .tab').forEach(t => {
        t.classList.toggle('active', t.dataset.audTab === tab);
      });
      panel.querySelector('#audPaneTags').hidden = tab !== 'tags';
      panel.querySelector('#audPaneUpload').hidden = tab !== 'upload';
      panel.querySelector(tab === 'upload' ? '#audPaneUpload' : '#audPaneTags').appendChild(viberExtra);
    };
    switchAudTab(defaultAudTab);
    panel.querySelectorAll('#audTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => switchAudTab(tab.dataset.audTab));
    });

    const viberCfg = draft.viberAudience || newViberAudienceConfig();
    const bizBotsField = panel.querySelector('#audViberBizBotsField');
    const syncBizBotsVisibility = selected => {
      bizBotsField.hidden = !selected.includes('account_lined_bots') && !selected.includes('accounts_subscribed_bots');
      if (!bizBotsField.hidden) ensureViberExtraVisible();
    };
    const viberMselOpts = { onOpen: ensureViberExtraVisible };
    panelViberBizExcludeMsel = createSearchMultiSelect({
      container: panel.querySelector('#audViberBizExcludeMsel'),
      options: VIBER_BIZ_EXCLUDE_OPTIONS,
      selected: viberCfg.bizExclude,
      placeholder: '请选择 Exclude 项',
      searchPlaceholder: '搜索…',
      onChange: syncBizBotsVisibility,
      ...viberMselOpts,
    });
    syncBizBotsVisibility(viberCfg.bizExclude);
    panelViberBizBotsMsel = createSearchMultiSelect({
      container: panel.querySelector('#audViberBizBotsMsel'),
      options: VIBER_BOT_OPTIONS,
      selected: viberCfg.bizExcludeBots,
      placeholder: '请选择 Bot',
      searchPlaceholder: '搜索 Bot…',
      ...viberMselOpts,
    });
    panelViberBotExcludeMsel = createSearchMultiSelect({
      container: panel.querySelector('#audViberBotExcludeMsel'),
      options: VIBER_BOT_EXCLUDE_OPTIONS,
      selected: viberCfg.botExclude,
      placeholder: '请选择 Exclude 项',
      searchPlaceholder: '搜索…',
      ...viberMselOpts,
    });

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
      };
      closePanel();
      renderRows();
    });
  } else if (type === 'timing') {
    document.getElementById('rowTiming').classList.add('active');
    const t = draft.perChannel[draft.active].timing || {};
    const type0 = t.type === 'recurring' ? 'now' : (t.type || 'now');
    panel.innerHTML = `
      <div class="panel-title">发送时机 · ${CHANNELS[draft.active].tip}</div>
      <div class="field">
        <div class="radio-group">
          <label><input type="radio" name="ntTiming" value="now" ${type0 === 'now' ? 'checked' : ''}>审批通过后发送</label>
          <label><input type="radio" name="ntTiming" value="scheduled" ${type0 === 'scheduled' ? 'checked' : ''}>定时</label>
        </div>
      </div>
      <div class="send-config" id="ntScheduled" ${type0 !== 'scheduled' ? 'hidden' : ''}>
        <input type="datetime-local" class="input" id="ntDatetime" value="${t.datetime || rhDefaultDatetime()}">
      </div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    panel.querySelectorAll('input[name="ntTiming"]').forEach(r => {
      r.addEventListener('change', () => {
        panel.querySelector('#ntScheduled').hidden = r.value !== 'scheduled';
      });
    });
    panel.querySelector('#panelOk').addEventListener('click', () => {
      const sel = panel.querySelector('input[name="ntTiming"]:checked').value;
      draft.perChannel[draft.active].timing = {
        type: sel,
        datetime: panel.querySelector('#ntDatetime').value,
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
  syncDraftActivityFromSelect();
  draft.productLine = rhCurrentSite();
  draft.taskCode = document.getElementById('ntTaskCode')?.value.trim() || '';
  if (isSystemTask() && !draft.taskCode) {
    showToast('请输入任务code');
    return;
  }
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

  rhConfirmReserve(() => {
    const channelLabel = CHANNELS[draft.channels[0]]?.label || draft.channels[0];
    const emailCheck = rhArchiveEmailCheck();
    const reserves = rhActiveReserves();
    RUNNING_TASKS.unshift({
      id: `T${Date.now()}`,
      name,
      channel: channelLabel,
      progress: 0,
      status: 'running',
      taskType: isSystemTask() ? '系统调用' : '手动发送',
      source: isSystemTask() ? 'API' : '手动',
      taskCode: isSystemTask() ? draft.taskCode : '',
      site: draft.productLine,
      reserve: reserves.length > 0,
      emailCheck,
      activityId: draft.activityId || '',
      activityName: draft.activityName || '',
    });
    renderRunningTasksTable();
    closeDrawer('taskDrawer');
    showToast(rhSubmitToast('已提交审批', emailCheck, reserves));
  });
}

/* 到点占位：保存时检查目标队列同时段占位，冲突仅提示，可继续保存（6.5.5） */
function rhConfirmReserve(proceed) {
  const reserves = rhActiveReserves();
  const conflicts = reserves.filter(r => r.info.conflict);
  if (!conflicts.length) { proceed(); return; }
  v2Modal({
    title: '到点占位冲突提示',
    body: conflicts.map(r => `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><span>${esc(rhConflictText(r.info))}</span></div>`).join('')
      + reserves.map(r => `<div class="v2-hint">${rhChannelLabel(r.c)}：按当前吞吐预计占用 ${r.info.minutes || '-'} 分钟</div>`).join(''),
    okText: '继续保存',
    onOk: () => { setTimeout(proceed); },
  });
}
function rhSubmitToast(prefix, emailCheck, reserves) {
  const parts = [prefix];
  if (emailCheck) parts.push(`邮件检测 强提醒 ${emailCheck.counts.strong} · 提醒 ${emailCheck.counts.mid} · 建议 ${emailCheck.counts.tip}，已随任务存档`);
  if (reserves?.length) parts.push(`到点占位已开启，按当前吞吐预计占用 ${reserves.map(r => r.info.minutes || '-').join(' / ')} 分钟`);
  return parts.join('；');
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
  if (taskDrawerMode === 'change' && !isSystemTask() && !draft.audienceTags.length && !draft.audienceFiles.length) {
    showToast('请选择人群（星灵标签或上传至少 1 项）');
    return;
  }
  rhConfirmReserve(() => applyEditedTask(t));
}

function applyEditedTask(t) {
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
  syncDraftActivityFromSelect();
  t.activityId = draft.activityId || '';
  t.activityName = draft.activityName || '';
  const emailCheck = rhArchiveEmailCheck();
  const reserves = rhActiveReserves();
  if (emailCheck) t.emailCheck = emailCheck;
  if (hasPerm('queue') && draft.channels.some(c => draft.perChannel[c]?.timing?.type === 'scheduled')) t.reserve = reserves.length > 0;
  if (taskDrawerMode === 'change' && !isSystemTask()) {
    const audParts = [];
    if (draft.audienceTags.length) {
      audParts.push(draft.audienceTags.map(id => AUDIENCES.find(a => a.id === id)?.name || id).join(' · '));
    }
    if (draft.audienceFiles.length) audParts.push(`已上传 ${draft.audienceFiles.length} 个文件`);
    t.audience = audParts.join(' ｜ ') || t.audience;
  }
  closeDrawer('taskDrawer');
  showToast(rhSubmitToast(taskDrawerMode === 'change' ? `任务「${t.name}」已变更` : `任务「${t.name}」已保存`, emailCheck, reserves));
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderKpis === 'function') renderKpis();
}

function submitTaskDrawer() {
  if (taskDrawerMode === 'edit' || taskDrawerMode === 'change') saveEditedTask();
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
  document.getElementById('ntTaskCode')?.addEventListener('input', e => {
    if (draft) draft.taskCode = e.target.value;
  });
  document.getElementById('ntActivity')?.addEventListener('change', () => {
    syncDraftActivityFromSelect();
  });
  document.querySelectorAll('input[name="taskType"]').forEach(r => {
    r.addEventListener('change', () => {
      if (!draft || !r.checked) return;
      draft.taskType = r.value;
      syncCategoryUi();
      syncTaskTypeUi();
      renderRows();
      rhAfterRender();
    });
  });
  document.getElementById('ntProductLine')?.addEventListener('change', () => {
    if (!draft) return;
    draft.productLine = rhCurrentSite();
    if (panelEmailCheck) panelEmailCheck.update(rhEmailCheckInput());
    rhAfterRender();
  });
  document.getElementById('createTaskBtn')?.addEventListener('click', submitTaskDrawer);
}

/* 在 search-select 增强下拉之前完成抽屉 DOM 改造 */
upgradeTaskDrawerV2();

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

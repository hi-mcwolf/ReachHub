/* 二期原型共享 mock 数据（所有二期页面共用，保证各页口径一致）
 * 口径来源：触达中心二期 PRD v1.0（4.4 口径修订 / 第六章）
 * 注意：全部为演示数据，不代表真实指标 */

/* ---- 组织维度：业务线 → 产品线（site id，来自用户域血缘） ---- */
const V2_BUSINESS_LINES = [
  /* 业务线（Marvin 2026-11-13）：BP = BingoPlus（下设 4 个中心）；AP = ArenaPlus；GP = GameZone（后两者自身即产品线） */
  { code: 'BP', name: 'BingoPlus' },
  { code: 'AP', name: 'ArenaPlus' },
  { code: 'GP', name: 'GameZone' },
];
const V2_PRODUCT_LINES = [
  { siteId: 'bp-vip',     name: 'VIP',                        bl: 'BP', status: '启用' },
  { siteId: 'bp-growth',  name: 'Growth Center',              bl: 'BP', status: '启用' },
  { siteId: 'bp-poc',     name: 'Platform Operation Center',  bl: 'BP', status: '启用' },
  { siteId: 'bp-coc',     name: 'Content Operation Center',   bl: 'BP', status: '启用' },
  { siteId: 'arenaplus',  name: 'ArenaPlus',                  bl: 'AP', status: '启用' },
  { siteId: 'gamezone',   name: 'GameZone',                   bl: 'GP', status: '启用' },
  { siteId: 'arena-old',  name: '旧产品线（已下线）',          bl: 'BP', status: '已下线' },
];
function plName(siteId) { const p = V2_PRODUCT_LINES.find(x => x.siteId === siteId); return p ? p.name : siteId; }

/* ---- 渠道维度：通道 → 供应商 → 供应商账号 → 内部账号 → 发送方标识（无「IM」通道，Marvin 2026-11-13） ---- */
const V2_CHANNELS = ['SMS', '邮件', 'Push', '站内信', 'Viber Biz', 'Viber Bot', 'Messenger Bot', 'WhatsApp'];
const V2_IM_SUB = []; /* 已废弃：原 IM 子渠道现为独立通道 */
const V2_CHAT_CHANNELS = ['Viber Biz', 'Viber Bot', 'Messenger Bot', 'WhatsApp'];
const V2_MSG_CATEGORIES = ['OTP 事务', '营销', '通知'];
const V2_TASK_SOURCES = ['手动', 'API'];

const V2_ACCOUNTS = [
  // 调度：tasklevel = 已切任务级调度；otp = OTP 独立账号；legacy = 未接入调度（只读）
  { id: 'BP-01',   channel: 'SMS', vendor: 'Globe',  bl: 'BP', tps: 50,  dailyCap: null, mode: 'tasklevel', senders: ['BPGROWTH', 'BPPLATFORM', 'BPCONTENT'] },
  { id: 'BP-02',   channel: 'SMS', vendor: 'Smart',  bl: 'BP', tps: 30,  dailyCap: null, mode: 'tasklevel', senders: ['BPGROWTH', 'BPVIP'] },
  { id: 'GP-01',   channel: 'SMS', vendor: 'DLink',  bl: 'GP', tps: 40,  dailyCap: null, mode: 'tasklevel', senders: ['GAMEZONE'] },
  { id: 'AP-01',   channel: 'SMS', vendor: 'Smart',  bl: 'AP', tps: 30,  dailyCap: null, mode: 'tasklevel', senders: ['ARENAPLUS'] },
  { id: 'BP-04',   channel: 'SMS', vendor: 'DLink',  bl: 'BP', tps: 40,  dailyCap: null, mode: 'tasklevel', senders: ['BPGROWTH', 'BPPLATFORM'] },
  { id: 'OTP-BP',  channel: 'SMS', vendor: 'Globe',  bl: 'BP', tps: 50,  dailyCap: null, mode: 'otp',       senders: ['BPVERIFY'] },
  { id: 'BP-mail', channel: '邮件', vendor: 'OneSignal', bl: 'BP', tps: null, dailyCap: null, mode: 'legacy',  senders: ['news@bingoplus.ph'] },
  { id: 'BP-push', channel: 'Push', vendor: 'Engagement Lab', bl: 'BP', tps: null, dailyCap: null, mode: 'legacy', senders: ['BP App'] },
  /* 供应商（Marvin 2026-11-12/13）：Viber Biz = PTX（OTP 走 Mocean）；Viber Bot = Viber 官方；Messenger Bot = Meta 官方；WhatsApp（OTP）= Mocean */
  { id: 'BP-im',     channel: 'Viber Biz', sub: 'Viber Biz',      vendor: 'PTX',     bl: 'BP', tps: 20, dailyCap: null, mode: 'legacy', senders: ['BingoPlus Viber'] },
  { id: 'BP-vbot',   channel: 'Viber Bot', sub: 'Viber Bot',     vendor: 'Viber',   bl: 'BP', tps: 20, dailyCap: null, mode: 'legacy', senders: ['BingoPlus Bot'] },
  { id: 'BP-msgbot', channel: 'Messenger Bot', sub: 'Messenger Bot', vendor: 'Meta',    bl: 'BP', tps: 20, dailyCap: null, mode: 'legacy', senders: ['BingoPlus Page Bot'] },
  { id: 'OTP-VB',    channel: 'Viber Biz', sub: 'Viber Biz', vendor: 'Mocean', bl: 'BP', tps: 20, dailyCap: null, mode: 'otp', senders: ['BPVERIFY'] },
  { id: 'OTP-IM',    channel: 'WhatsApp', sub: 'WhatsApp', vendor: 'Mocean', bl: 'BP', tps: 20, dailyCap: null, mode: 'otp', senders: ['BPVERIFY'] },
];
/* Sender ID 已配置的产品线（6.1.3 供应商账号 · 发送方标识；切换供应商时只可选与任务产品线一致的） */
const V2_SENDER_PL = { BPGROWTH: ['bp-growth'], BPPLATFORM: ['bp-poc'], BPCONTENT: ['bp-coc'], BPVIP: ['bp-vip'], GAMEZONE: ['gamezone'], ARENAPLUS: ['arenaplus'] };
const V2_VENDORS = ['Smart', 'Globe', 'Mocean', 'DLink', 'NXLink', 'OneSignal', 'Engagement Lab', 'PTX', 'Viber', 'Meta'];

/* ---- 两维状态（4.4.4） ---- */
const V2_TASK_STATUS = {
  pending:  { label: '待发送', cls: 'tag-info' },
  queued:   { label: '排队中', cls: 'tag-primary' },
  sending:  { label: '发送中', cls: 'tag-orange' },
  done:     { label: '已完成', cls: 'tag-success' },
  stopped:  { label: '已终止', cls: 'tag-gray' },
  failed:   { label: '失败',   cls: 'tag-danger' },
};
const V2_APPROVAL_STATUS = {
  none:     { label: '无需审批', cls: 'tag-gray-outline' },
  pending:  { label: '待审批', cls: 'tag-orange' },
  approved: { label: '已通过', cls: 'tag-success' },
  rejected: { label: '已拒绝', cls: 'tag-danger' },
};
function v2Tag(map, k) { const s = map[k] || { label: k, cls: 'tag-gray' }; return `<span class="tag ${s.cls}">${s.label}</span>`; }

/* ---- 失败分类（6.1.4，统一分类 → 建议动作） ---- */
const V2_FAIL_CATS = [
  // 与 PRD 6.1.4「统一失败分类」一致（发送前拦截类见各页过滤排除口径）
  { key: 'auth',      stage: '提交失败',   label: '账号鉴权或余额',   action: '联系供应商 / 充值' },
  { key: 'tpl',       stage: '提交失败',   label: '模板或签名无效',   action: '检查供应商侧配置' },
  { key: 'prefix',    stage: '提交失败',   label: '号段或目标不支持', action: '清洗名单' },
  { key: 'content',   stage: '提交失败',   label: '内容被供应商拒绝', action: '修改内容' },
  { key: 'rate',      stage: '提交失败',   label: '供应商限流',       action: '降低 TPS 或改时间' },
  { key: 'vendor',    stage: '提交失败',   label: '供应商网关故障',   action: '等待恢复，路由重试' },
  { key: 'param',     stage: '提交失败',   label: '参数错误',         action: '研发排查' },
  { key: 'invalid',   stage: '未送达',     label: '号码或地址无效',   action: '清洗名单' },
  { key: 'unreach',   stage: '未送达',     label: '用户不可达',       action: '换通道或稍后重试' },
  { key: 'reject',    stage: '未送达',     label: '用户拒收',         action: '加入退订 / 屏蔽名单' },
  { key: 'carrier',   stage: '未送达',     label: '运营商或平台拦截', action: '修改内容、检查发件信誉' },
  { key: 'timeout',   stage: '未送达',     label: '终端或网络超时',   action: '稍后重试' },
  { key: 'other',     stage: '未送达',     label: '其他',             action: '待归类' },
  { key: 'expired',   stage: '过期无回执', label: '已过期',           action: '检查队列与供应商回执' },
  { key: 'noreceipt', stage: '过期无回执', label: '无回执',           action: '检查队列与供应商回执' },
  { key: 'unknown',   stage: '待归类',     label: '未分类',           action: '规则维护者在失败码映射表归类' },
];

/* ---- 任务（各页共用，ID 与 PRD 示例一致） ---- */
const V2_TASKS = [
  { id: 'T20260713002', name: '沉默召回短信',   site: 'bp-poc', channel: 'SMS', account: 'BP-01', source: '手动', creator: 'lily@', operator: 'lily@', category: '营销',
    status: 'sending', approval: 'approved', target: 200000, remaining: 186000, sched: '16:00', estStart: '已开始', estFinish: '17:42', range: 5, priority: '普通', share: 100, seq: 1, activity: 'ACT202607006' },
  { id: 'T20260713005', name: '充值提醒',       site: 'bp-growth', channel: 'SMS', account: 'BP-01', source: 'API', app: '星灵', creator: 'ken@', operator: 'ken@', category: '营销',
    status: 'queued', approval: 'approved', target: 60000, remaining: 60000, sched: '16:30', estStart: '17:42', estFinish: '18:02', range: 5, priority: '普通', share: 0, seq: 2, activity: 'ACT202607002' },
  { id: 'T20260713007', name: '周末返利',       site: 'bp-coc', channel: 'SMS', account: 'BP-01', source: '手动', creator: 'ann@', operator: 'ann@', category: '营销',
    status: 'queued', approval: 'none', target: 40000, remaining: 40000, sched: '17:00', estStart: '18:02', estFinish: '18:15', range: 6, priority: '普通', share: 0, seq: 3 },
  { id: 'T20260713009', name: '开赛提醒',       site: 'bp-growth', channel: 'SMS', account: 'BP-01', source: '手动', creator: 'lily@', operator: 'lily@', category: '通知',
    status: 'pending', approval: 'approved', target: 20000, remaining: 20000, sched: '18:00', estStart: '18:00', estFinish: '18:07', range: 2, priority: '普通', reserve: true, seq: null, activity: 'ACT202607001' },
  { id: 'T20260713001', name: '世界杯竞猜预热短信', site: 'bp-growth', channel: 'SMS', account: 'BP-02', source: 'API', app: '星灵', creator: 'ken@', operator: 'ken@', category: '营销',
    status: 'sending', approval: 'approved', target: 12800, remaining: 3584, sched: '15:40', estStart: '已开始', estFinish: '18:02', range: 5, priority: '普通', share: 100, seq: 1, activity: 'ACT202607001' },
  { id: 'T20260713011', name: '周报邮件',       site: 'bp-growth', channel: '邮件', account: 'BP-mail', source: '手动', creator: 'marvin@', operator: 'marvin@', category: '营销',
    status: 'queued', approval: 'none', target: 42000, remaining: 42000, sched: '立即', estStart: '16:21', estFinish: '16:24', range: 1, estimated: true },
  { id: 'T20260713012', name: 'VIP 生日礼包 Push', site: 'bp-vip', channel: 'Push', account: 'BP-push', source: '手动', creator: 'lily@', operator: 'lily@', category: '营销',
    status: 'pending', approval: 'pending', target: 3200, remaining: 3200, sched: '2026-07-14 10:00', estStart: '审批通过后约 3 分钟', estFinish: '-', range: 0, activity: 'ACT202607007' },
  { id: 'T20260712003', name: '新用户注册礼包', site: 'gamezone', channel: 'SMS', account: 'GP-01', source: '手动', creator: 'ann@', operator: 'ann@', category: '营销',
    status: 'done', approval: 'approved', target: 9500, remaining: 0, sched: '2026-07-12 10:00', finishedAt: '2026-07-12 10:21', activity: 'ACT202607003' },
  { id: 'T20260711008', name: '充值满赠限时活动', site: 'bp-growth', channel: 'SMS', account: 'BP-01', source: '手动', creator: 'lily@', operator: 'lily@', category: '营销',
    status: 'stopped', approval: 'approved', target: 50000, remaining: 0, sched: '2026-07-11 19:00', stopReason: '人工终止：活动提前结束', activity: 'ACT202607002' },
  { id: 'T20260710004', name: '七月大促预热',   site: 'bp-poc', channel: 'SMS', account: 'BP-02', source: '手动', creator: 'ken@', operator: 'ken@', category: '营销',
    status: 'stopped', approval: 'rejected', target: 80000, remaining: 0, sched: '2026-07-10 12:00', stopReason: '审批拒绝：文案含高风险促销词', activity: 'ACT202607008' },
  { id: 'T20260709006', name: '账号安全通知',   site: 'bp-growth', channel: 'SMS', account: 'BP-02', source: 'API', app: '用户中心', creator: 'system', operator: '系统', category: '通知',
    status: 'failed', approval: 'none', target: 15000, remaining: 0, sched: '2026-07-09 09:00', stopReason: '任务级异常：供应商账号鉴权失效' },
];
function v2Task(id) { return V2_TASKS.find(t => t.id === id); }

/* ---- 任务漏斗（6.3.2，恒等式口径） ---- */
function v2Funnel(task) {
  const total = task.target;
  const filters = { 重复: Math.round(total * .03), 黑名单: Math.round(total * .02), DND: Math.round(total * .01), DNC: task.channel === 'SMS' ? Math.round(total * .005) : 0, 频控: Math.round(total * .012), 格式无效: Math.round(total * .003), 退订: task.channel === '邮件' ? Math.round(total * .01) : 0 };
  const filtered = Object.values(filters).reduce((a, b) => a + b, 0);
  const sendable = total - filtered;
  const doneRatio = task.status === 'done' || task.status === 'stopped' || task.status === 'failed' ? 1 : Math.max(0, 1 - task.remaining / total);
  const submittedAll = Math.round(sendable * doneRatio);
  const submitFail = Math.round(submittedAll * .012);
  const submitted = submittedAll - submitFail;
  const queued = task.status === 'stopped' ? 0 : sendable - submittedAll;
  const cancelled = task.status === 'stopped' ? sendable - submittedAll : 0;
  const delivered = Math.round(submitted * .94);
  const undelivered = Math.round(submitted * .035);
  const noReceipt = Math.round(submitted * .005);
  const waiting = submitted - delivered - undelivered - noReceipt;
  return { total, filters, filtered, sendable, queued, submitted, submitFail, cancelled, expired: 0, delivered, undelivered, noReceipt, waiting };
}

/* ---- 失败原因（任务 / 多任务，6.3.3） ---- */
const V2_FAIL_ROWS = [
  { cat: 'invalid', vendor: 'Globe', count: 412, codes: [['G-1102', 'Invalid MSISDN', 380], ['G-1104', 'Number not in service', 32]] },
  { cat: 'carrier', vendor: 'Globe', count: 268, codes: [['G-3301', 'Blocked by carrier filter', 268]] },
  { cat: 'content', vendor: 'Smart', count: 173, codes: [['S-451', 'Message content rejected', 173]] },
  { cat: 'reject',  vendor: 'Globe', count: 96,  codes: [['G-2201', 'Subscriber opted out', 96]] },
  { cat: 'vendor',  vendor: 'Smart', count: 64,  codes: [['S-500', 'Internal server error', 64]] },
  { cat: 'rate',    vendor: 'DLink', count: 31,  codes: [['D-429', 'Throttled', 31]] },
  { cat: 'unknown', vendor: 'NXLink', count: 18, codes: [['NX-77', 'ERR_77 (unmapped)', 18]] },
];

/* ---- 接入方（6.7） ---- */
const V2_APPS = [
  { name: '星灵',     appId: 'xl_01', owner: 'ken@',  bls: ['BP'], sites: 'BP 全部（含未来新增）', channels: ['SMS', '邮件', 'Push'], cats: ['营销', '通知'], approval: '模板免审', usage: 312000, quota: 500000, rate: 50, status: '启用', callback: 'https://xingling.internal/reach/callback' },
  { name: '用户中心', appId: 'uc_01', owner: 'jay@',  bls: ['BP', 'GP'], sites: 'bingoplus · perya · pinoyplay', channels: ['SMS', 'Push', '站内信'], cats: ['通知', 'OTP 事务'], approval: '模板免审', usage: 48200, quota: 200000, rate: 100, status: '启用', callback: 'https://uc.internal/notify/reach' },
  { name: '风控平台', appId: 'rc_01', owner: 'mia@',  bls: ['BP'], sites: 'bp-growth', channels: ['SMS'], cats: ['通知'], approval: '逐任务审批', usage: 2100, quota: 20000, rate: 10, status: '启用', callback: '' },
  { name: 'MMS 活动中心', appId: 'mms_01', owner: 'leo@', bls: ['GP'], sites: 'gamezone', channels: ['SMS', '邮件'], cats: ['营销'], approval: '逐任务审批', usage: 0, quota: 100000, rate: 20, status: '停用', callback: '' },
];

/* ---- 通用小工具 ---- */
function fmtN(n) { return n == null || n === '' ? '-' : Number(n).toLocaleString('en-US'); }
function pct(a, b, d = 1) { return b ? (a / b * 100).toFixed(d) + '%' : '-'; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* 简易确认 / 内容弹窗：v2Modal({title, body, okText, onOk, danger, width}) */
function v2Modal({ title, body, okText = '确定', cancelText = '取消', onOk, danger = false, width = 560, hideCancel = false }) {
  let root = document.getElementById('v2ModalRoot');
  if (!root) { root = document.createElement('div'); root.id = 'v2ModalRoot'; document.body.appendChild(root); }
  root.innerHTML = `<div class="v2-modal-mask"><div class="v2-modal" style="width:${width}px">
      <div class="v2-modal-head"><h3>${title}</h3><button class="icon-btn" data-x><i data-lucide="x"></i></button></div>
      <div class="v2-modal-body">${body}</div>
      <div class="v2-modal-foot">${hideCancel ? '' : `<button class="btn btn-outline" data-x>${cancelText}</button>`}
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${okText}</button></div>
    </div></div>`;
  const close = () => { root.innerHTML = ''; };
  root.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', close));
  root.querySelector('[data-ok]').addEventListener('click', () => { if (!onOk || onOk(root) !== false) close(); });
  if (typeof refreshIcons === 'function') refreshIcons();
  return root;
}

/* Tabs：<div class="tabs" data-v2tabs="group"> <button class="tab" data-tab="a"> … 与 <div data-pane="a"> */
function v2BindTabs(container, onChange) {
  const tabs = container.querySelectorAll('[data-tab]');
  const show = key => {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === key));
    document.querySelectorAll(`[data-pane]`).forEach(p => { if (p.closest('[data-tabscope]') === container.closest('[data-tabscope]')) p.hidden = p.dataset.pane !== key; });
    if (onChange) onChange(key);
  };
  tabs.forEach(t => t.addEventListener('click', () => { show(t.dataset.tab); if (container.dataset.hash !== undefined) history.replaceState(null, '', '#' + t.dataset.tab); }));
  return show;
}

/* 简易条形图（用于日报 / 用量趋势） */
function v2Bars(rows, { valueKey = 'v', labelKey = 'k', fmt = fmtN, color = 'var(--primary)' } = {}) {
  const max = Math.max(...rows.map(r => r[valueKey]), 1);
  return `<div class="bar-list">${rows.map(r => `<div class="bar-row"><span class="bar-label">${r[labelKey]}</span>
    <div class="bar-track"><div class="bar-fill" style="width:${(r[valueKey] / max * 100).toFixed(1)}%;background:${color}"></div></div>
    <span class="bar-count">${fmt(r[valueKey])}</span></div>`).join('')}</div>`;
}

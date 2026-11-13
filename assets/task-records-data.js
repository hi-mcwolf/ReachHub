/* 任务记录 / 发送记录共用的任务补充数据（mock）
 * 任务主数据 = v2-data.js 的 V2_TASKS（与队列页 / SDK 页同一批 ID）；这里只叠加展示字段（发送对象、模板、内容版本等），
 * 外加 4 个本页独有的历史终态任务（不进入队列）。task-records.html 与 send-records.html 都在 v2-data.js 之后引入本文件。 */

const TR_NOW = '2026-07-13 16:31';
const TR_ETA_UPDATED = '16:31:10';
const TR_ACTIVE = ['pending', 'queued', 'sending'];
const TR_TERMINAL = ['done', 'stopped', 'failed'];

/* ---------------- 页面补充数据（mock，按任务 ID 叠加到 V2_TASKS） ---------------- */
const TR_TEMPLATES = [
  { id: 'TPL-SMS-0021', name: '沉默召回 A', site: 'arenaplus', channel: 'SMS', content: 'Hi {{name}}, we miss you! Log in to ArenaPlus and claim your comeback bonus before {{deadline}}.' },
  { id: 'TPL-SMS-0022', name: '沉默召回 B（短版）', site: 'arenaplus', channel: 'SMS', content: '{{name}}, your ArenaPlus comeback bonus expires {{deadline}}. Log in now!' },
  { id: 'TPL-SMS-0012', name: '世界杯竞猜提醒', site: 'bingoplus', channel: 'SMS', content: 'Only the best teams remain, {{name}}! Join today\'s World Cup Quiz on BingoPlus.' },
  { id: 'TPL-SMS-0013', name: '世界杯竞猜提醒（决赛版）', site: 'bingoplus', channel: 'SMS', content: 'Final countdown, {{name}}! Lock in your World Cup prediction on BingoPlus today.' },
  { id: 'TPL-SMS-0031', name: '充值提醒', site: 'bingoplus', channel: 'SMS', content: '{{name}}, top up {{amount}} today and get 8% bonus on BingoPlus. T&C apply.' },
  { id: 'TPL-SMS-0032', name: '充值提醒（限时）', site: 'bingoplus', channel: 'SMS', content: 'Last call {{name}}: top up {{amount}} before midnight for an 8% bonus on BingoPlus.' },
  { id: 'TPL-SMS-0041', name: '周末返利', site: 'gamezone', channel: 'SMS', content: 'Weekend cashback is live on GameZone, {{name}}! Play now and get up to 10% back.' },
];

const TR_EXTRA = {
  T20260713002: { audience: '沉默用户', sender: 'ARENAPLUS', template: 'TPL-SMS-0021', createdAt: '2026-07-13 15:20', updatedAt: '2026-07-13 16:20', updatedBy: 'lily@', approver: 'marvin@', approvedAt: '2026-07-13 15:42',
    versions: [
      { v: 1, by: 'lily@', at: '2026-07-13 15:20', effectiveAt: '2026-07-13 16:00', submittedAt: 0, note: '创建任务', state: 'replaced', template: 'TPL-SMS-0021',
        content: 'Hi {{name}}, we miss you! Log in to ArenaPlus and claim your comeback bonus before {{deadline}}.' },
      { v: 2, by: 'lily@', at: '2026-07-13 16:18', effectiveAt: '2026-07-13 16:20', submittedAt: 8400, note: '活动截止时间调整', state: 'active', template: 'TPL-SMS-0021',
        content: 'Hi {{name}}, we miss you! Your ArenaPlus comeback bonus is extended to {{deadline}}. Log in now.' },
    ] },
  T20260713005: { audience: '充值用户 · 近 7 天未充值', sender: 'BINGOPLUS', template: 'TPL-SMS-0031', createdAt: '2026-07-13 15:58', updatedAt: '2026-07-13 16:05', updatedBy: 'ken@', approver: 'lily@', approvedAt: '2026-07-13 16:05' },
  T20260713007: { audience: '活跃用户', sender: 'GAMEZONE', template: 'TPL-SMS-0041', contentMode: '分别配置', createdAt: '2026-07-13 14:10', updatedAt: '2026-07-13 14:10', updatedBy: 'ann@',
    content: '（分别配置：按上传名单逐行内容发送）' },
  T20260713009: { audience: '竞猜参与用户', sender: 'BINGOPLUS', template: 'TPL-SMS-0012', createdAt: '2026-07-13 11:30', updatedAt: '2026-07-13 12:02', updatedBy: 'lily@', approver: 'ken@', approvedAt: '2026-07-13 12:02',
    content: 'Kick-off in 30 minutes, {{name}}! Place your prediction on BingoPlus now.' },
  T20260713001: { audience: '活跃用户', sender: 'BINGOPLUS', template: 'TPL-SMS-0012', createdAt: '2026-07-13 15:10', updatedAt: '2026-07-13 15:38', updatedBy: 'ken@', approver: '星灵 · 模板免审', approvedAt: '2026-07-13 15:10' },
  T20260713011: { audience: '订阅周报用户', sender: 'news@bingoplus.ph', template: 'TPL-MAIL-0007', createdAt: '2026-07-13 16:15', updatedAt: '2026-07-13 16:15', updatedBy: 'marvin@',
    estReason: '邮件通道未接入任务级调度，按现有消息队列深度估算', content: 'Hi {{name}}，本周精选活动已上线，点击查看。', email: { subject: 'BingoPlus 本周精选', body: '<p>Hi {{name}}，本周精选活动已上线……</p>' } },
  T20260713012: { audience: 'VIP 用户 · 当日生日', sender: 'BP App', template: 'TPL-PUSH-0003', createdAt: '2026-07-13 16:02', updatedAt: '2026-07-13 16:02', updatedBy: 'lily@',
    content: '生日快乐 {{name}}！VIP 专属生日礼包已放入账户。' },
  T20260712003: { audience: '新注册用户', sender: 'PERYA', template: 'TPL-SMS-0105', createdAt: '2026-07-12 09:30', updatedAt: '2026-07-12 10:21', updatedBy: 'ann@', approver: 'leo@', approvedAt: '2026-07-12 09:50',
    content: 'Welcome to Perya Game, {{name}}! Your sign-up gift is ready.' },
  T20260711008: { audience: '高充值用户 · 活跃用户', sender: 'BINGOPLUS', template: 'TPL-SMS-0031', createdAt: '2026-07-11 15:00', updatedAt: '2026-07-11 19:22', updatedBy: 'lily@', approver: 'marvin@', approvedAt: '2026-07-11 16:10' },
  T20260710004: { audience: '全量用户', sender: 'ARENAPLUS', template: 'TPL-SMS-0088', createdAt: '2026-07-10 10:00', updatedAt: '2026-07-10 11:05', updatedBy: 'marvin@', approver: 'marvin@', approvedAt: '2026-07-10 11:05',
    content: 'ArenaPlus July mega sale: 100% win guaranteed bonus for {{name}}!' },
  T20260709006: { audience: '异常登录用户', sender: 'BPVIP', template: 'TPL-SMS-0201', createdAt: '2026-07-09 08:58', updatedAt: '2026-07-09 09:03', updatedBy: '系统',
    content: '[BingoPlus] New login to your account detected at {{time}}. If this was not you, reset your password.' },
};

/* 本页独有的历史任务（均为终态，不进入队列；用于演示多通道漏斗页签、IM 子渠道、站内信、OTP） */
const TR_LOCAL_TASKS = [
  { id: 'T20260708013', name: '充值满赠活动通知', site: 'bingoplus', channel: 'SMS', channels: ['SMS', 'Push'], channelSplit: { SMS: 8000, Push: 5760 }, account: 'BP-01', source: '手动', creator: 'marvin@', operator: 'marvin@', category: '营销',
    status: 'done', approval: 'approved', target: 13760, remaining: 0, sched: '2026-07-08 18:00', activity: 'ACT202607002',
    audience: '高充值用户 · 活跃用户', sender: 'BINGOPLUS', template: 'TPL-SMS-0031', createdAt: '2026-07-08 10:10', updatedAt: '2026-07-08 20:15', updatedBy: 'marvin@', approver: 'lily@', approvedAt: '2026-07-08 11:00',
    routesExtra: [{ channel: 'Push', vendor: 'Engagement Lab', account: 'BP-push', sender: 'BP App' }],
    content: 'Top up 500 this week and get 8% bonus, {{name}}! Ends tonight 24:00.' },
  { id: 'T20260709012', name: 'IM 客服满意度回访', site: 'bingoplus', channel: 'IM', sub: 'Viber', account: 'BP-im', source: '手动', creator: 'ken@', operator: 'ken@', category: '通知',
    status: 'done', approval: 'none', target: 1860, remaining: 0, sched: '2026-07-09 10:00', activity: null,
    audience: '近 7 天客服会话用户', sender: 'BingoPlus Viber', template: 'TPL-IM-0002', createdAt: '2026-07-02 11:20', updatedAt: '2026-07-09 18:00', updatedBy: 'ken@',
    content: '感谢您使用在线客服，邀请您对本次服务进行评价。' },
  { id: 'T20260706016', name: '新功能上线公告', site: 'bingoplus', channel: '站内信', account: null, source: '手动', creator: 'marvin@', operator: 'marvin@', category: '通知',
    status: 'done', approval: 'approved', target: 318000, remaining: 0, sched: '2026-07-06 12:00', activity: null,
    audience: '全量用户', sender: '-', template: '-', createdAt: '2026-07-06 09:20', updatedAt: '2026-07-06 13:00', updatedBy: 'marvin@', approver: 'ken@', approvedAt: '2026-07-06 10:00',
    content: '全新「星灵标签」功能上线，人群圈选更精准。' },
  { id: 'T20260712020', name: '登录验证码', site: 'bingoplus', channel: 'SMS', account: 'OTP-BP', source: 'API', app: '用户中心', creator: 'system', operator: '系统', category: 'OTP 事务',
    status: 'done', approval: 'none', target: 52000, remaining: 0, sched: '2026-07-12 00:00', activity: null,
    audience: '按次调用（单发聚合）', sender: 'BPVERIFY', template: 'TPL-OTP-0001', createdAt: '2026-07-12 00:00', updatedAt: '2026-07-12 23:59', updatedBy: '系统',
    content: '[BingoPlus] Your verification code is {{code}}. Valid for 5 minutes.' },
];

/* ---------------- 构造任务记录 ---------------- */
function trTimingText(sched) {
  if (!sched || sched === '立即') return '立即';
  return /^\d{2}:\d{2}$/.test(sched) ? `2026-07-13 ${sched} 定时` : `${sched} 定时`;
}

function trTplContent(id) { return TR_TEMPLATES.find(x => x.id === id)?.content || ''; }

function trRoutes(t) {
  const acc = V2_ACCOUNTS.find(a => a.id === t.account);
  const main = t.channel === '站内信'
    ? { channel: '站内信' }
    : { channel: t.channel, sub: t.sub || null, vendor: acc?.vendor || null, account: t.account || null, sender: t.sender || acc?.senders?.[0] || null };
  return [main, ...(t.routesExtra || [])];
}

function trBuildRecord(base, extra = {}) {
  const t = { ...base, ...extra };
  const acc = V2_ACCOUNTS.find(a => a.id === t.account);
  t.channels = t.channels || [t.channel];
  t.routes = trRoutes(t);
  t.productLine = V2_PRODUCT_LINES.find(p => p.siteId === t.site)?.name || '未知产品线';
  t.taskType = t.source === 'API' ? '系统调用' : '手动发送'; // 兼容一期编辑 / 变更抽屉
  if (t.source === 'API' && !t.taskCode) t.taskCode = 'TC-' + t.id.slice(1);
  t.timing = trTimingText(t.sched);
  t.accountMode = acc?.mode || 'legacy';
  t.contentMode = t.contentMode || '统一配置';
  t.audienceCount = t.target;
  t.activityId = t.activity || null;
  t.activityName = t.activityId ? (activityById(t.activityId)?.name || t.activityId) : null;
  t.updatedBy = t.updatedBy || t.creator;
  if (!t.versions) {
    const content = t.content || trTplContent(t.template) || '-';
    const started = t.status === 'sending' || TR_TERMINAL.includes(t.status) && t.approval !== 'rejected';
    t.versions = [{ v: 1, by: t.creator, at: t.createdAt, effectiveAt: started ? (t.sched === '立即' ? t.createdAt : t.timing.replace(' 定时', '')) : '-', submittedAt: 0, note: '创建任务', state: 'active', template: t.template, content }];
  }
  return t;
}

const TASK_RECORDS = [
  ...V2_TASKS.map(v => trBuildRecord(v, TR_EXTRA[v.id] || {})),
  ...TR_LOCAL_TASKS.map(v => trBuildRecord(v)),
];

/* 未开始执行（待发送，或审批拒绝终止）的任务没有执行漏斗 */
function trNotStarted(t) { return t.status === 'pending' || (t.status === 'stopped' && t.approval === 'rejected'); }

/* 任务在某通道上的目标人数（多通道任务按 channelSplit 拆分） */
function trChannelTarget(t, ch) {
  if (!ch || t.channels.length === 1) return t.target;
  return t.channelSplit?.[ch] ?? Math.round(t.target / t.channels.length);
}

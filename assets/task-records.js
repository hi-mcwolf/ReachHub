/* 任务记录页：筛选 + KPI + 任务列表 + 详情抽屉 */

const TASK_STATUS = {
  draft:     { label: '草稿',   cls: 'tag-gray' },
  reviewing: { label: '审核中', cls: 'tag-orange' },
  pending:   { label: '待发送', cls: 'tag-info' },
  running:   { label: '执行中', cls: 'tag-orange' },
  done:      { label: '已完成', cls: 'tag-success' },
  paused:    { label: '已暂停', cls: 'tag-gray-outline' },
  failed:    { label: '失败',   cls: 'tag-danger' },
  enabled:   { label: '启用',   cls: 'tag-success' },
  disabled:  { label: '禁用',   cls: 'tag-gray-outline' },
};

const APPROVAL_STATUS = {
  pending:  { label: '待审批', cls: 'tag-orange' },
  approved: { label: '已通过', cls: 'tag-success' },
  rejected: { label: '已拒绝', cls: 'tag-danger' },
};

const EXECUTION_TIPS = {
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

function execMetric(label, key, value) {
  return `<div class="desc-item"><span class="desc-label desc-label-with-tip">${label}${tipIcon(EXECUTION_TIPS[key])}</span><span>${fmt(value)}</span></div>`;
}

function enrichTaskRecords() {
  const APPROVERS = ['lily@', 'ken@', 'marvin@'];
  TASK_RECORDS.forEach((t, i) => {
    if (!t.productLine) t.productLine = ['BP-VIP', 'BingoPlus', 'BP-CONTENT OPERATION CENTER'][i % 3];
    if (t.audienceCount == null) t.audienceCount = t.total;
    if (!t.taskType) t.taskType = i % 3 === 0 ? 'API' : '手动';
    if (!t.approvalStatus) {
      if (t.status === 'reviewing' || t.status === 'draft') t.approvalStatus = 'pending';
      else if (t.status === 'failed' && i % 2 === 0) t.approvalStatus = 'rejected';
      else t.approvalStatus = 'approved';
    }
    if (t.approvalStatus !== 'pending') {
      if (!t.approver) t.approver = APPROVERS[(i + 1) % APPROVERS.length];
      if (!t.approvedAt) t.approvedAt = t.createdAt;
    }
    if (!t.updatedBy) t.updatedBy = APPROVERS[i % APPROVERS.length];
    if (!t.channelContents) {
      t.channelContents = {};
      t.channels.forEach((c, ci) => {
        t.channelContents[c] = {
          contentSummary: t.contentSummary === '-' ? '-' : `【${c}】${t.contentSummary}`,
          template: ci === 0 ? t.template : '-',
          timing: t.timing,
        };
      });
    }
    if (!t.execution) {
      const sent = t.sent || 0;
      const fails = t.fails || 0;
      t.execution = {
        total: t.total,
        pushable: Math.round(t.total * 0.95),
        valid: Math.round(t.total * 0.92),
        duplicate: Math.round(t.total * 0.03),
        blacklist: Math.round(t.total * 0.02),
        dnc: Math.round(t.total * 0.01),
        pushCount: sent,
        pushSuccess: sent && t.fails != null ? sent - fails : sent,
        pushFail: fails,
        pendingConfirm: Math.round(sent * 0.05),
      };
    }
  });
}

/* ---------------- Mock 数据 ---------------- */
const TASK_RECORDS = [
  {
    id: 'T20260713001', name: '世界杯竞猜预热短信', type: '营销活动', audience: '活跃用户',
    channels: ['SMS'], timing: '2026-07-13 18:00 定时', strategy: '单用户每日频控',
    status: 'running', creator: 'marvin@', createdAt: '2026-07-12 10:20', updatedAt: '2026-07-13 01:40',
    sent: 9632, total: 12800, deliverRate: '98.2%', opens: 4021, clicks: 1873, fails: 173,
    party: '自营平台', sender: 'BPLUS', template: '世界杯竞猜提醒',
    contentSummary: "Only the best teams remain! Warm up for the Quarterfinals…",
  },
  {
    id: 'T20260713002', name: '新用户充值召回邮件', type: '召回', audience: '新注册用户',
    channels: ['邮件'], timing: '每天 10:00 循环', strategy: '夜间免打扰',
    status: 'running', creator: 'lily@', createdAt: '2026-07-11 14:05', updatedAt: '2026-07-13 00:12',
    sent: 2128, total: 5600, deliverRate: '96.4%', opens: 812, clicks: 233, fails: 77,
    party: '自营平台', sender: 'marketing@bingoplus.com', template: '充值优惠通知',
    contentSummary: '尊敬的用户，本周充值满 500 即享 8% 加赠…',
  },
  {
    id: 'T20260713003', name: 'VIP 流失预警电销', type: '召回', audience: 'VIP用户 · 流失预警用户',
    channels: ['电销'], timing: '工作日 10:00-19:00', strategy: '电销工作时段限制',
    status: 'paused', creator: 'marvin@', createdAt: '2026-07-10 09:30', updatedAt: '2026-07-12 16:20',
    sent: 384, total: 960, deliverRate: '87.5%', opens: null, clicks: null, fails: 48,
    party: '自营平台', sender: '400 880 1***', template: '流失召回话术',
    contentSummary: '您好，我们注意到您已有一段时间未登录…',
  },
  {
    id: 'T20260712004', name: '每日签到提醒 Push', type: '促活', audience: '活跃用户 · 沉默用户',
    channels: ['Push'], timing: '每天 09:00 循环', strategy: 'AI 最佳发送时间推荐',
    status: 'running', creator: 'ken@', createdAt: '2026-07-08 11:00', updatedAt: '2026-07-13 00:05',
    sent: 152300, total: 212000, deliverRate: '91.8%', opens: 38200, clicks: 12400, fails: 1250,
    party: '自营平台', sender: 'BingoPlus App', template: '-',
    contentSummary: '今日签到礼包已刷新，连续签到 7 天可领神秘大奖！',
  },
  {
    id: 'T20260712005', name: '生命周期·首充引导', type: '生命周期', audience: '新注册用户',
    channels: ['Push', 'SMS'], timing: '注册后 24 小时触发', strategy: '相同内容 24 小时去重',
    status: 'done', creator: 'lily@', createdAt: '2026-07-05 10:15', updatedAt: '2026-07-12 09:00',
    sent: 5600, total: 5600, deliverRate: '97.1%', opens: 2210, clicks: 890, fails: 162,
    party: '渠道 A', sender: 'BPLUS', template: '首充引导话术',
    contentSummary: '完成首充最高可得 100% 加赠，新手专享仅此一次！',
  },
  {
    id: 'T20260712006', name: '系统维护通知', type: '通知', audience: '全量用户',
    channels: ['Inbox', 'Push'], timing: '2026-07-12 20:00 定时', strategy: '-',
    status: 'done', creator: 'ken@', createdAt: '2026-07-12 15:00', updatedAt: '2026-07-12 21:10',
    sent: 320000, total: 320000, deliverRate: '99.5%', opens: 96000, clicks: null, fails: 1600,
    party: '自营平台', sender: 'System', template: '系统维护通知',
    contentSummary: '系统将于今晚 22:00-23:00 进行升级维护…',
  },
  {
    id: 'T20260711007', name: 'Viber 高充值用户回馈', type: '营销活动', audience: '高充值用户',
    channels: ['Viber'], timing: '2026-07-11 19:00 定时', strategy: 'SMS 通道周频控',
    status: 'failed', creator: 'marvin@', createdAt: '2026-07-11 10:40', updatedAt: '2026-07-11 19:22',
    sent: 120, total: 960, deliverRate: '12.5%', opens: null, clicks: null, fails: 840,
    party: '渠道 B', sender: 'BingoPlus Official', template: '-',
    contentSummary: '尊贵的用户，您的专属回馈礼包已到账，点击查收…',
  },
  {
    id: 'T20260711008', name: 'Messenger 社群拉新', type: '营销活动', audience: '活跃用户',
    channels: ['Messenger'], timing: '2026-07-14 12:00 定时', strategy: '单活动触达频控',
    status: 'reviewing', creator: 'lily@', createdAt: '2026-07-11 16:25', updatedAt: '2026-07-12 09:10',
    sent: null, total: 12800, deliverRate: null, opens: null, clicks: null, fails: null,
    party: '自营平台', sender: '@BingoPlusBot', template: '-',
    contentSummary: '加入官方社群，每日抽奖赢免费竞猜券！',
  },
  {
    id: 'T20260710009', name: '沉默用户唤醒短信', type: '促活', audience: '沉默用户',
    channels: ['SMS'], timing: '每周六 10:00 循环', strategy: '召回消息 7 天去重',
    status: 'enabled', creator: 'ken@', createdAt: '2026-07-06 09:50', updatedAt: '2026-07-12 10:00',
    sent: 6300, total: 8400, deliverRate: '95.6%', opens: null, clicks: 420, fails: 277,
    party: '自营平台', sender: 'BPLUS', template: '流失召回话术',
    contentSummary: '好久不见！您的老朋友 BingoPlus 为您准备了回归好礼…',
  },
  {
    id: 'T20260710010', name: '世界杯决赛邮件预告', type: '营销活动', audience: '活跃用户 · VIP用户',
    channels: ['邮件'], timing: '2026-07-18 10:00 定时', strategy: '多语言模板适配',
    status: 'draft', creator: 'marvin@', createdAt: '2026-07-10 14:30', updatedAt: '2026-07-10 14:30',
    sent: null, total: 15100, deliverRate: null, opens: null, clicks: null, fails: null,
    party: '自营平台', sender: 'marketing@bingoplus.com', template: '世界杯竞猜提醒',
    contentSummary: '决赛之夜即将来临，提前锁定您的冠军竞猜…',
  },
  {
    id: 'T20260709011', name: '生日专属礼包 Push', type: '生命周期', audience: '当日生日用户',
    channels: ['Push'], timing: '每天 09:30 循环', strategy: 'AI 最佳发送时间推荐',
    status: 'running', creator: 'lily@', createdAt: '2026-07-01 10:00', updatedAt: '2026-07-13 00:30',
    sent: 4210, total: 4400, deliverRate: '94.9%', opens: 1980, clicks: 860, fails: 215,
    party: '自营平台', sender: 'BingoPlus App', template: '生日祝福',
    contentSummary: '生日快乐！您的专属生日礼包已放入账户…',
  },
  {
    id: 'T20260709012', name: 'IM 客服满意度回访', type: '通知', audience: '近7天客服会话用户',
    channels: ['IM'], timing: '会话结束后 1 小时', strategy: '-',
    status: 'done', creator: 'ken@', createdAt: '2026-07-02 11:20', updatedAt: '2026-07-09 18:00',
    sent: 1860, total: 1860, deliverRate: '99.1%', opens: 1120, clicks: 640, fails: 17,
    party: '自营平台', sender: '客服助手', template: '满意度回访',
    contentSummary: '感谢您使用在线客服，邀请您对本次服务进行评价…',
  },
  {
    id: 'T20260708013', name: '充值满赠活动通知', type: '营销活动', audience: '高充值用户 · 活跃用户',
    channels: ['SMS', 'Push'], timing: '2026-07-08 18:00 定时', strategy: '单用户每日频控',
    status: 'done', creator: 'marvin@', createdAt: '2026-07-08 10:10', updatedAt: '2026-07-08 20:15',
    sent: 13760, total: 13760, deliverRate: '97.8%', opens: 5230, clicks: 2410, fails: 302,
    party: '自营平台', sender: 'BPLUS', template: '充值优惠通知',
    contentSummary: '本周充值满 500 即享 8% 加赠，活动今晚 24:00 截止…',
  },
  {
    id: 'T20260708014', name: 'Bot 自动竞猜提醒', type: '促活', audience: '竞猜参与用户',
    channels: ['Bot'], timing: '赛前 30 分钟触发', strategy: '菲律宾 SIM 注册法合规',
    status: 'failed', creator: 'ken@', createdAt: '2026-07-08 09:00', updatedAt: '2026-07-08 19:35',
    sent: 45, total: 5200, deliverRate: '0.9%', opens: null, clicks: null, fails: 5155,
    party: '渠道 B', sender: '@BPQuizBot', template: '-',
    contentSummary: '您关注的比赛即将开始，快来提交您的竞猜…',
  },
  {
    id: 'T20260707015', name: '流失 30 天召回邮件', type: '召回', audience: '流失预警用户',
    channels: ['邮件'], timing: '每周一 10:00 循环', strategy: '流失预警人群圈选',
    status: 'disabled', creator: 'lily@', createdAt: '2026-06-30 15:40', updatedAt: '2026-07-07 10:05',
    sent: 1240, total: 1800, deliverRate: '93.2%', opens: 310, clicks: 96, fails: 84,
    party: '自营平台', sender: 'marketing@bingoplus.com', template: '流失召回话术',
    contentSummary: '您的专属回归礼包即将过期，登录即可领取…',
  },
  {
    id: 'T20260706016', name: '新功能上线公告', type: '通知', audience: '全量用户',
    channels: ['Inbox'], timing: '2026-07-06 12:00 定时', strategy: '-',
    status: 'done', creator: 'marvin@', createdAt: '2026-07-06 09:20', updatedAt: '2026-07-06 13:00',
    sent: 318000, total: 318000, deliverRate: '99.8%', opens: 88000, clicks: null, fails: 636,
    party: '自营平台', sender: 'System', template: '功能公告',
    contentSummary: '全新「星灵标签」功能上线，人群圈选更精准…',
  },
  {
    id: 'T20260705017', name: '周末充值提醒 A/B', type: '营销活动', audience: '活跃用户',
    channels: ['SMS'], timing: '每周六 20:00 循环', strategy: '世界杯文案 A/B 实验',
    status: 'running', creator: 'lily@', createdAt: '2026-07-05 14:00', updatedAt: '2026-07-12 20:10',
    sent: 6350, total: 12800, deliverRate: '97.3%', opens: null, clicks: 1830, fails: 171,
    party: '自营平台', sender: 'BPLUS', template: '充值优惠通知',
    contentSummary: '周末充值加赠限时开启，最高返 10%…',
  },
  {
    id: 'T20260703018', name: 'VIP 生日电销回访', type: '生命周期', audience: 'VIP用户',
    channels: ['电销'], timing: '生日当天 14:00', strategy: '电销工作时段限制',
    status: 'pending', creator: 'ken@', createdAt: '2026-07-03 10:30', updatedAt: '2026-07-10 09:45',
    sent: null, total: 130, deliverRate: null, opens: null, clicks: null, fails: null,
    party: '自营平台', sender: '400 880 1***', template: 'VIP 生日回访话术',
    contentSummary: '尊敬的 VIP 用户，祝您生日快乐，专属客服为您送上…',
  },
  {
    id: 'T20260702019', name: '邮箱验证激活提醒', type: '通知', audience: '未验证邮箱用户',
    channels: ['邮件'], timing: '注册后 48 小时触发', strategy: '邮件 CAN-SPAM 合规',
    status: 'running', creator: 'marvin@', createdAt: '2026-07-02 16:10', updatedAt: '2026-07-12 23:50',
    sent: 3420, total: 4100, deliverRate: '95.0%', opens: 1520, clicks: 1180, fails: 171,
    party: '自营平台', sender: 'noreply@bingoplus.com', template: '邮箱验证',
    contentSummary: '请验证您的邮箱以解锁全部功能…',
  },
  {
    id: 'T20260701020', name: '七月大促预热草稿', type: '营销活动', audience: '全量用户',
    channels: ['SMS', '邮件', 'Push'], timing: '未配置', strategy: '-',
    status: 'draft', creator: 'lily@', createdAt: '2026-07-01 11:00', updatedAt: '2026-07-01 11:00',
    sent: null, total: 320000, deliverRate: null, opens: null, clicks: null, fails: null,
    party: '自营平台', sender: '-', template: '-',
    contentSummary: '-',
  },
];

enrichTaskRecords();

/* ---------------- 状态 ---------------- */
const PAGE_SIZE = 8;
let currentPage = 1;
let filtered = [...TASK_RECORDS];
let productLineFilter = null;
let selectedIds = new Set();

const fmt = v => (v === null || v === undefined || v === '' || v === '-') ? '-' : (typeof v === 'number' ? v.toLocaleString() : v);

/* ---------------- KPI ---------------- */
function renderKpis() {
  const total = TASK_RECORDS.length;
  const running = TASK_RECORDS.filter(t => t.status === 'running').length;
  const todayNew = TASK_RECORDS.filter(t => t.createdAt.startsWith('2026-07-13')).length;
  const failed = TASK_RECORDS.filter(t => t.status === 'failed').length;
  const pendingApproval = TASK_RECORDS.filter(t => t.approvalStatus === 'pending').length;
  const kpis = [
    { title: '任务总数', value: total, cls: '' },
    { title: '执行中任务数', value: running, cls: 'kpi-orange' },
    { title: '待审批', value: pendingApproval, cls: 'kpi-orange' },
    { title: '失败任务数', value: failed, cls: 'kpi-red' },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-title">${k.title}</div>
      <div class="kpi-body"><span class="kpi-value ${k.cls}">${k.value}</span></div>
    </div>`).join('');
}

/* ---------------- 筛选 ---------------- */
function applyFilters() {
  const name = document.getElementById('fName').value.trim().toLowerCase();
  const content = document.getElementById('fContent').value.trim().toLowerCase();
  const type = document.getElementById('fType').value;
  const channel = document.getElementById('fChannel').value;
  const status = document.getElementById('fStatus').value;
  const approval = document.getElementById('fApproval').value;
  const party = document.getElementById('fParty').value;
  const approver = document.getElementById('fApprover').value.trim().toLowerCase();
  const creator = document.getElementById('fCreator').value;

  const productLines = productLineFilter?.getValue() || [];

  filtered = TASK_RECORDS.filter(t =>
    (!name || t.name.toLowerCase().includes(name) || t.id.toLowerCase().includes(name)) &&
    (!content || (t.contentSummary || '').toLowerCase().includes(content)) &&
    (!productLines.length || productLines.includes(t.productLine)) &&
    (!type || t.taskType === type) &&
    (!channel || t.channels.includes(channel)) &&
    (!status || t.status === status) &&
    (!approval || t.approvalStatus === approval) &&
    (!party || t.party === party) &&
    (!approver || (t.approver || '').toLowerCase().includes(approver)) &&
    (!creator || t.creator === creator)
  );
  currentPage = 1;
  clearSelection();
  renderTable();
}

function resetFilters() {
  ['fName', 'fContent', 'fApprover'].forEach(id => document.getElementById(id).value = '');
  ['fType', 'fChannel', 'fStatus', 'fApproval', 'fParty', 'fCreator'].forEach(id =>
    document.getElementById(id).value = '');
  productLineFilter?.setValue([]);
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

function handleBatchAction(act) {
  const tasks = TASK_RECORDS.filter(t => selectedIds.has(t.id));
  if (!tasks.length) return;
  const n = tasks.length;
  if (act === 'approve') {
    tasks.forEach(t => { if (t.approvalStatus === 'pending') { t.approvalStatus = 'approved'; t.approver = 'marvin@'; t.approvedAt = '2026-07-14 10:00'; } });
    showToast(`已批量通过 ${n} 个任务`);
  }
  if (act === 'reject') {
    tasks.forEach(t => { if (t.approvalStatus === 'pending') { t.approvalStatus = 'rejected'; t.approver = 'marvin@'; t.approvedAt = '2026-07-14 10:00'; } });
    showToast(`已批量拒绝 ${n} 个任务`);
  }
  if (act === 'pause') {
    tasks.forEach(t => { if (t.status === 'running') t.status = 'paused'; });
    showToast(`已批量暂停 ${n} 个任务`);
  }
  if (act === 'resume') {
    tasks.forEach(t => { if (t.status === 'paused') t.status = 'running'; });
    showToast(`已批量恢复 ${n} 个任务`);
  }
  if (act === 'stop') {
    tasks.forEach(t => { if (['running', 'paused', 'pending'].includes(t.status)) t.status = 'failed'; });
    showToast(`已批量终止 ${n} 个任务`);
  }
  clearSelection();
  renderKpis();
  renderTable();
}

/* ---------------- 表格与分页 ---------------- */
function renderTable() {
  closeAllMoreMenus();
  const tbody = document.getElementById('taskTableBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="14" class="cell-empty">暂无符合条件的任务</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(t => {
      const st = TASK_STATUS[t.status];
      const audienceText = `${t.audience}（${t.audienceCount.toLocaleString()}人）`;
      const pauseItem = t.status === 'running'
        ? `<button class="more-item" data-act="pause" data-id="${t.id}">暂停</button>`
        : t.status === 'paused'
          ? `<button class="more-item" data-act="resume" data-id="${t.id}">恢复</button>`
          : '';
      const approvalOps = t.approvalStatus === 'pending'
        ? `<button class="link-btn" data-act="approve" data-id="${t.id}">通过</button>
           <button class="link-btn link-btn-danger" data-act="reject" data-id="${t.id}">拒绝</button>`
        : '';
      return `
        <tr>
          <td class="col-check"><input type="checkbox" class="row-check" data-check="${t.id}" ${selectedIds.has(t.id) ? 'checked' : ''} aria-label="选择 ${t.id}"></td>
          <td class="cell-muted">${t.id}</td>
          <td class="col-name"><span class="cell-ellipsis" title="${t.name}">${t.name}</span></td>
          <td>${t.productLine}</td>
          <td><span class="cell-ellipsis" title="${audienceText}">${audienceText}</span></td>
          <td>${t.channels.map(c => `<span class="tag">${c}</span>`).join('')}</td>
          <td>${fmt(t.timing)}</td>
          <td>${t.taskType}</td>
          <td><span class="tag ${st.cls}">${st.label}</span></td>
          <td>${t.creator}</td>
          <td class="cell-muted">${t.createdAt}</td>
          <td>${t.updatedBy}</td>
          <td class="cell-muted">${t.updatedAt}</td>
          <td class="col-ops">
            ${approvalOps}
            <button class="link-btn" data-detail="${t.id}">查看详情</button>
            <span class="more-wrap">
              <button class="link-btn" data-more="${t.id}">更多<i data-lucide="chevron-down"></i></button>
              <span class="more-menu" hidden>
                ${pauseItem}
                <button class="more-item" data-act="copy" data-id="${t.id}">复制任务</button>
                <button class="more-item" data-act="records" data-id="${t.id}">查看发送记录</button>
                <button class="more-item more-danger" data-act="stop" data-id="${t.id}">终止任务</button>
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
      const t = TASK_RECORDS.find(x => x.id === btn.dataset.id);
      if (!t || t.approvalStatus !== 'pending') return;
      const now = '2026-07-14 10:00';
      if (btn.dataset.act === 'approve') {
        t.approvalStatus = 'approved';
        showToast(`已通过任务「${t.name}」`);
      } else {
        t.approvalStatus = 'rejected';
        showToast(`已拒绝任务「${t.name}」`);
      }
      t.approver = 'marvin@';
      t.approvedAt = now;
      renderKpis();
      renderTable();
    }));

  bindMoreMenus(tbody);

  tbody.querySelectorAll('.more-item').forEach(item =>
    item.addEventListener('click', () => {
      const t = TASK_RECORDS.find(x => x.id === item.dataset.id);
      closeAllMoreMenus();
      if (item.dataset.act === 'pause') {
        t.status = 'paused';
        showToast(`任务「${t.name}」已暂停`);
        renderKpis(); renderTable();
      }
      if (item.dataset.act === 'resume') {
        t.status = 'running';
        showToast(`任务「${t.name}」已恢复`);
        renderKpis(); renderTable();
      }
      if (item.dataset.act === 'copy') showToast(`已复制任务「${t.name}」为草稿`);
      if (item.dataset.act === 'records') location.href = 'send-records.html';
      if (item.dataset.act === 'stop') {
        t.status = 'failed';
        showToast(`任务「${t.name}」已终止`);
        renderKpis(); renderTable();
      }
    }));
}

/* ---------------- 详情抽屉 ---------------- */
function channelDetailHtml(t, channel) {
  const cc = t.channelContents?.[channel] || {};
  return `
    <div class="desc-item"><span class="desc-label">发送时机</span><span>${fmt(cc.timing ?? t.timing)}</span></div>
    <div class="desc-item"><span class="desc-label">内容摘要</span><span>${fmt(cc.contentSummary ?? t.contentSummary)}</span></div>
    <div class="desc-item"><span class="desc-label">模板名称</span><span>${fmt(cc.template ?? t.template)}</span></div>`;
}

function bindChannelTabs(t) {
  const tabs = document.getElementById('detailChannelTabs');
  const panel = document.getElementById('detailChannelPanel');
  if (!tabs || !panel) return;
  tabs.querySelectorAll('.chip').forEach(chip =>
    chip.addEventListener('click', () => {
      tabs.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      panel.innerHTML = channelDetailHtml(t, chip.dataset.channel);
    }));
}

function openTaskDetail(id) {
  const t = TASK_RECORDS.find(x => x.id === id);
  const st = TASK_STATUS[t.status];
  const ap = APPROVAL_STATUS[t.approvalStatus] || APPROVAL_STATUS.pending;
  const channelBlock = t.channels.length > 1
    ? `
      <div class="desc-item desc-block">
        <span class="desc-label">通道配置</span>
        <div class="chip-group detail-channel-tabs" id="detailChannelTabs">
          ${t.channels.map((c, i) => `<button class="chip${i === 0 ? ' selected' : ''}" data-channel="${c}">${c}</button>`).join('')}
        </div>
        <div class="desc-list detail-channel-panel" id="detailChannelPanel">${channelDetailHtml(t, t.channels[0])}</div>
      </div>`
    : `
      <div class="desc-item"><span class="desc-label">通道配置</span><span><span class="tag tag-primary">${t.channels[0]}</span></span></div>
      ${channelDetailHtml(t, t.channels[0])}`;

  document.getElementById('taskDetailBody').innerHTML = `
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">任务名称</span><span>${t.name}</span></div>
        <div class="desc-item"><span class="desc-label">任务 ID</span><span>${t.id}</span></div>
        <div class="desc-item"><span class="desc-label">创建人</span><span>${t.creator}</span></div>
        <div class="desc-item"><span class="desc-label">创建时间</span><span>${t.createdAt}</span></div>
        <div class="desc-item"><span class="desc-label">任务状态</span><span class="tag ${st.cls}">${st.label}</span></div>
        <div class="desc-item"><span class="desc-label">审批状态</span><span class="tag ${ap.cls}">${ap.label}</span></div>
        <div class="desc-item"><span class="desc-label">审批人</span><span>${fmt(t.approver)}</span></div>
        <div class="desc-item"><span class="desc-label">审批时间</span><span>${fmt(t.approvedAt)}</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">配置信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">发送对象</span><span>${fmt(t.audience)}</span></div>
        <div class="desc-item"><span class="desc-label">任务类型</span><span>${t.taskType}</span></div>
        ${channelBlock}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">执行信息</h4>
      <div class="desc-list">
        ${execMetric('总数', 'total', t.execution.total)}
        ${execMetric('可推送用户数', 'pushable', t.execution.pushable)}
        ${execMetric('有效用户数', 'valid', t.execution.valid)}
        ${execMetric('重复用户数', 'duplicate', t.execution.duplicate)}
        ${execMetric('黑名单用户数', 'blacklist', t.execution.blacklist)}
        ${execMetric('DNC用户数', 'dnc', t.execution.dnc)}
        ${execMetric('推送条数', 'pushCount', t.execution.pushCount)}
        ${execMetric('推送成功条数', 'pushSuccess', t.execution.pushSuccess)}
        ${execMetric('推送失败条数', 'pushFail', t.execution.pushFail)}
        ${execMetric('待确认数', 'pendingConfirm', t.execution.pendingConfirm)}
      </div>
    </section>`;

  bindChannelTabs(t);
  renderTaskDetailFooter(t);

  openDrawer('taskDetailDrawer');
  refreshIcons();
}

function renderTaskDetailFooter(t) {
  const footer = document.getElementById('taskDetailFooter');
  if (!footer) return;

  if (t.approvalStatus === 'pending') {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>关闭</button>
      <button class="btn btn-outline btn-reject" id="detailRejectBtn">拒绝</button>
      <button class="btn btn-primary" id="detailApproveBtn">通过</button>`;
    footer.querySelector('#detailApproveBtn').addEventListener('click', () => {
      t.approvalStatus = 'approved';
      t.approver = 'marvin@';
      t.approvedAt = '2026-07-14 10:00';
      showToast(`已通过任务「${t.name}」`);
      renderKpis();
      renderTable();
      closeDrawer('taskDetailDrawer');
    });
    footer.querySelector('#detailRejectBtn').addEventListener('click', () => {
      t.approvalStatus = 'rejected';
      t.approver = 'marvin@';
      t.approvedAt = '2026-07-14 10:00';
      showToast(`已拒绝任务「${t.name}」`);
      renderKpis();
      renderTable();
      closeDrawer('taskDetailDrawer');
    });
  } else {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>关闭</button>
      <button class="btn btn-outline" id="detailToSendRecords">查看发送记录</button>
      <button class="btn btn-primary" id="detailEditBtn">编辑任务</button>`;
    footer.querySelector('#detailToSendRecords').addEventListener('click', () => location.href = 'send-records.html');
    const editBtn = footer.querySelector('#detailEditBtn');
    const editable = ['draft', 'pending', 'paused'].includes(t.status);
    editBtn.disabled = !editable;
    editBtn.title = editable ? '' : '当前状态不可编辑';
    editBtn.addEventListener('click', () => showToast('进入任务编辑（原型演示）'));
  }
  footer.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeDrawer('taskDetailDrawer')));
}

/* ---------------- 初始化 ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-task-records');
  renderTopbar('reach');
  bindDrawerClose();

  // 产品线筛选项（多选）
  productLineFilter = createSearchMultiSelect({
    container: document.getElementById('fProductLine'),
    options: PRODUCT_LINES.map(p => ({ value: p.value, label: p.label })),
    placeholder: '全部产品线',
    searchPlaceholder: '搜索产品线…',
  });

  // 时间范围切换
  document.querySelectorAll('#timeRange .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeRange .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('customDates').hidden = btn.dataset.range !== 'custom';
    });
  });

  document.getElementById('queryBtn').addEventListener('click', applyFilters);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  ['fName', 'fContent', 'fApprover'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); }));

  // 全选与批量操作
  document.getElementById('checkAll').addEventListener('change', e => {
    const pageIds = currentPageIds();
    if (e.target.checked) pageIds.forEach(id => selectedIds.add(id));
    else pageIds.forEach(id => selectedIds.delete(id));
    renderTable();
  });
  document.querySelectorAll('#batchBar [data-batch]').forEach(btn =>
    btn.addEventListener('click', () => handleBatchAction(btn.dataset.batch)));
  document.getElementById('exportBtn').addEventListener('click', () => showToast('任务记录导出中，完成后将通知您'));

  // 点击空白处收起更多菜单
  document.addEventListener('click', () => closeAllMoreMenus());
  document.querySelectorAll('.table-scroll').forEach(el => {
    el.addEventListener('scroll', closeAllMoreMenus, { passive: true });
  });

  renderKpis();
  renderTable();
  refreshIcons();
});

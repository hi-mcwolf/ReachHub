/* 发送记录页：筛选 + 统计卡 + 发送明细 + 详情抽屉 */

const SEND_STATUS = {
  pending:   { label: '待发送',   cls: 'tag-info' },
  sent:      { label: '已发送',   cls: 'tag-primary' },
  delivered: { label: '送达成功', cls: 'tag-success' },
  failed:    { label: '发送失败', cls: 'tag-danger' },
  cancelled: { label: '已取消',   cls: 'tag-gray' },
};

const RECEIPT_STATUS = {
  received: { label: '已回执',   cls: 'tag-success' },
  waiting:  { label: '回执中',   cls: 'tag-orange' },
  failed:   { label: '回执失败', cls: 'tag-danger' },
  none:     { label: '无回执',   cls: 'tag-gray' },
};

const SEND_RECORDS = (() => {
  const tasks = [
    { name: '世界杯竞猜预热短信', id: 'T20260713001', channel: 'SMS', productLine: 'BingoPlus', vendor: '供应商 A', sender: 'BPLUS', party: '自营平台', strategy: '单用户每日频控', template: '世界杯竞猜提醒',
      content: "Only the best teams remain! Warm up for the Quarterfinals with today's FREE World Cup Quiz. Visit bingoplus.com." },
    { name: '新用户充值召回邮件', id: 'T20260713002', channel: '邮件', productLine: 'BP-VIP', vendor: 'SendCloud', sender: 'marketing@bingoplus.com', party: '自营平台', strategy: '夜间免打扰', template: '充值优惠通知',
      content: '尊敬的用户，本周充值满 500 即享 8% 加赠，活动今晚 24:00 截止，立即打开 App 参与吧！' },
    { name: '每日签到提醒 Push', id: 'T20260712004', channel: 'Push', productLine: 'BingoPlus', vendor: 'APNs/FCM', sender: 'BingoPlus App', party: '自营平台', strategy: 'AI 最佳发送时间推荐', template: '-',
      content: '今日签到礼包已刷新，连续签到 7 天可领神秘大奖！' },
    { name: 'Viber 高充值用户回馈', id: 'T20260711007', channel: 'Viber', productLine: 'BP-VIP', vendor: '供应商 B', sender: 'BingoPlus Official', party: '渠道 B', strategy: 'SMS 通道周频控', template: '-',
      content: '尊贵的用户，您的专属回馈礼包已到账，点击查收！' },
    { name: '沉默用户唤醒短信', id: 'T20260710009', channel: 'SMS', productLine: 'BingoPlus', vendor: '供应商 A', sender: 'BPLUS', party: '自营平台', strategy: '召回消息 7 天去重', template: '流失召回话术',
      content: '好久不见！您的老朋友 BingoPlus 为您准备了回归好礼，登录即可领取！' },
    { name: 'Telegram 社群拉新', id: 'T20260711008', channel: 'Telegram', productLine: 'BP-CONTENT OPERATION CENTER', vendor: '供应商 B', sender: '@BingoPlusBot', party: '自营平台', strategy: '单活动触达频控', template: '-',
      content: '加入官方社群，每日抽奖赢免费竞猜券！' },
    { name: '账户激活提醒', id: 'T20260702019', channel: '邮件', productLine: 'BingoPlus', vendor: 'Mailgun', sender: 'noreply@bingoplus.com', party: '自营平台', strategy: '邮件 CAN-SPAM 合规', template: '账户激活',
      content: '请完成账户激活以解锁全部功能。' },
  ];

  const users = USER_ACCOUNT_SAMPLES.map((account, i) => ({
    account,
    tags: ['活跃用户', 'VIP用户 · 高充值用户', '新注册用户', '流失预警用户', '沉默用户', '活跃用户 · 竞猜参与用户'][i % 6],
  }));

  const statusPlan = [
    'delivered', 'delivered', 'delivered', 'failed', 'delivered',
    'sent', 'delivered', 'pending', 'delivered', 'failed',
    'delivered', 'cancelled', 'delivered', 'sent', 'delivered',
    'delivered', 'failed', 'delivered', 'delivered', 'pending',
    'delivered', 'delivered', 'sent', 'delivered', 'failed',
    'delivered', 'delivered', 'cancelled', 'delivered', 'delivered',
  ];
  const failReasons = {
    SMS: '供应商网关超时（错误码 408）',
    '邮件': '用户账号无效',
    Push: '设备 Token 已失效',
    Viber: '用户未安装 Viber 客户端',
    Telegram: '用户已屏蔽 Bot',
  };

  const records = [];
  for (let i = 0; i < 30; i++) {
    const task = tasks[i % tasks.length];
    const user = users[i % users.length];
    const status = statusPlan[i];

    const day = 13 - (i % 5);
    const hh = String(9 + (i * 3) % 13).padStart(2, '0');
    const mm = String((i * 17) % 60).padStart(2, '0');
    const sendTime = `2026-07-${String(day).padStart(2, '0')} ${hh}:${mm}:${String((i * 7) % 60).padStart(2, '0')}`;

    let receipt = 'none';
    let failReason = null;
    if (status === 'delivered') receipt = i % 6 === 3 ? 'failed' : 'received';
    if (status === 'sent') receipt = 'waiting';
    if (status === 'failed') { receipt = 'none'; failReason = failReasons[task.channel]; }

    records.push({
      recordId: `S${String(20260713000 + i * 37)}`,
      sendTime, status, receipt, failReason,
      taskName: task.name, taskId: task.id, productLine: task.productLine,
      channel: task.channel, vendor: task.vendor, sender: task.sender, party: task.party,
      strategy: task.strategy, template: task.template, content: task.content,
      userAccount: user.account, userTags: user.tags,
      returnCode: status === 'failed' ? (task.channel === '邮件' ? '550' : 'E-TIMEOUT') : '0（成功）',
      retries: status === 'failed' ? 3 : 0,
      title: task.channel === '邮件' ? task.name : null,
    });
  }
  return records;
})();

const PAGE_SIZE = 10;
let currentPage = 1;
let filtered = [...SEND_RECORDS];
let productLineFilter = null;

const fmt = v => (v === null || v === undefined || v === '' || v === '-') ? '-' : v;

function renderKpis() {
  const total = SEND_RECORDS.length;
  const delivered = SEND_RECORDS.filter(r => r.status === 'delivered').length;
  const failed = SEND_RECORDS.filter(r => r.status === 'failed').length;
  const rate = ((delivered / total) * 100).toFixed(1) + '%';
  const receiptAbn = SEND_RECORDS.filter(r => r.receipt === 'failed').length;
  const kpis = [
    { title: '发送总数', value: total.toLocaleString(), cls: '' },
    { title: '成功送达数', value: delivered.toLocaleString(), cls: 'kpi-green' },
    { title: '失败数', value: failed.toLocaleString(), cls: 'kpi-red' },
    { title: '平均送达率', value: rate, cls: 'kpi-blue' },
    { title: '回执异常数', value: receiptAbn.toLocaleString(), cls: 'kpi-orange' },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-title">${k.title}</div>
      <div class="kpi-body"><span class="kpi-value ${k.cls}">${k.value}</span></div>
    </div>`).join('');
}

function applyFilters() {
  const recordId = document.getElementById('fRecordId').value.trim().toLowerCase();
  const task = document.getElementById('fTask').value.trim().toLowerCase();
  const channel = document.getElementById('fChannel').value;
  const status = document.getElementById('fStatus').value;
  const party = document.getElementById('fParty').value;
  const vendor = document.getElementById('fVendor').value;
  const sender = document.getElementById('fSender').value;
  const user = document.getElementById('fUser').value.trim().toLowerCase();
  const strategy = document.getElementById('fStrategy').value;
  const productLines = productLineFilter?.getValue() || [];

  filtered = SEND_RECORDS.filter(r =>
    (!recordId || r.recordId.toLowerCase().includes(recordId)) &&
    (!task || r.taskName.toLowerCase().includes(task) || r.taskId.toLowerCase().includes(task)) &&
    (!productLines.length || productLines.includes(r.productLine)) &&
    (!channel || r.channel === channel) &&
    (!status || (status === 'receipt-failed' ? r.receipt === 'failed' : r.status === status)) &&
    (!party || r.party === party) &&
    (!vendor || r.vendor === vendor) &&
    (!sender || r.sender === sender) &&
    (!user || r.userAccount.toLowerCase().includes(user)) &&
    (!strategy || r.strategy === strategy)
  );
  currentPage = 1;
  renderTable();
}

function resetFilters() {
  ['fRecordId', 'fTask', 'fUser'].forEach(id => document.getElementById(id).value = '');
  ['fChannel', 'fStatus', 'fParty', 'fVendor', 'fSender', 'fStrategy'].forEach(id =>
    document.getElementById(id).value = '');
  productLineFilter?.setValue([]);
  applyFilters();
}

function renderTable() {
  const tbody = document.getElementById('recordTableBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="15" class="cell-empty">暂无符合条件的发送记录</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(r => {
      const st = SEND_STATUS[r.status];
      const rc = RECEIPT_STATUS[r.receipt];
      const failCell = r.failReason
        ? `<span class="fail-reason" title="${r.failReason}"><i data-lucide="alert-triangle"></i>${r.failReason}</span>`
        : '-';
      return `
        <tr>
          <td class="cell-muted">${r.recordId}</td>
          <td class="cell-muted">${r.sendTime}</td>
          <td class="col-name"><span class="cell-ellipsis" title="${r.taskName}">${r.taskName}</span></td>
          <td class="cell-muted">${r.taskId}</td>
          <td>${r.userAccount}</td>
          <td><span class="tag">${r.channel}</span></td>
          <td>${r.vendor}</td>
          <td><span class="cell-ellipsis" title="${r.sender}">${r.sender}</span></td>
          <td class="col-name"><span class="cell-ellipsis" title="${r.content}">${r.content}</span></td>
          <td><span class="cell-ellipsis" title="${r.strategy}">${fmt(r.strategy)}</span></td>
          <td><span class="tag ${st.cls}">${st.label}</span></td>
          <td><span class="tag ${rc.cls}">${rc.label}</span></td>
          <td>${failCell}</td>
          <td>${r.party}</td>
          <td class="col-ops">
            <button class="link-btn" data-detail="${r.recordId}">查看详情</button>
          </td>
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
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      renderTable();
    });
  });
}

function buildTimeline(r) {
  const base = [
    { title: '任务创建', time: r.sendTime.slice(0, 11) + '00:00:00', state: 'done' },
    { title: '进入发送队列', time: r.sendTime, state: 'done' },
    { title: '调用供应商接口', time: r.sendTime, state: 'done' },
    { title: '返回发送结果', time: r.sendTime, state: 'done' },
    { title: '收到回执', time: r.sendTime, state: 'done' },
    { title: '最终状态确认', time: r.sendTime, state: 'done' },
  ];

  if (r.status === 'pending') {
    base[1].state = 'active';
    base[2].state = base[3].state = base[4].state = base[5].state = 'wait';
  } else if (r.status === 'cancelled') {
    base[2].state = 'cancel'; base[2].title = '发送已取消';
    base[3].state = base[4].state = 'wait';
    base[5].state = 'done'; base[5].title = '最终状态确认（已取消）';
  } else if (r.status === 'failed') {
    base[3].state = 'error'; base[3].title = `返回发送结果（失败：${r.failReason}）`;
    base[4].state = 'wait';
    base[5].title = '最终状态确认（发送失败）';
  } else if (r.status === 'sent') {
    base[4].state = 'active'; base[4].title = '等待回执中';
    base[5].state = 'wait';
  } else if (r.receipt === 'failed') {
    base[4].state = 'error'; base[4].title = '收到回执（回执失败）';
  }

  return `
    <ul class="timeline">
      ${base.map(s => `
        <li class="tl-item tl-${s.state}">
          <span class="tl-dot"></span>
          <div class="tl-body">
            <div class="tl-title">${s.title}</div>
            <div class="tl-time">${s.state === 'wait' ? '-' : s.time}</div>
          </div>
        </li>`).join('')}
    </ul>`;
}

function openSendDetail(recordId) {
  const r = SEND_RECORDS.find(x => x.recordId === recordId);
  const st = SEND_STATUS[r.status];
  const rc = RECEIPT_STATUS[r.receipt];

  document.getElementById('sendDetailBody').innerHTML = `
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">任务名称</span><span>${r.taskName}</span></div>
        <div class="desc-item"><span class="desc-label">任务 ID</span><span>${r.taskId}</span></div>
        <div class="desc-item"><span class="desc-label">发送记录 ID</span><span>${r.recordId}</span></div>
        <div class="desc-item"><span class="desc-label">发送时间</span><span>${r.sendTime}</span></div>
        <div class="desc-item"><span class="desc-label">通道</span><span><span class="tag tag-primary">${r.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">接入方</span><span>${r.party}</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">接收方信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">用户账号</span><span>${r.userAccount}</span></div>
        <div class="desc-item"><span class="desc-label">人群标签</span><span>${r.userTags}</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">发送内容</h4>
      <div class="desc-list">
        ${r.title ? `<div class="desc-item"><span class="desc-label">发送标题</span><span>${r.title}</span></div>` : ''}
        <div class="desc-item desc-block"><span class="desc-label">发送正文</span><span>${r.content}</span></div>
        <div class="desc-item"><span class="desc-label">模板名称</span><span>${fmt(r.template)}</span></div>
        <div class="desc-item"><span class="desc-label">变量替换结果</span><span>{userName} → ${r.userAccount}；{deadline} → 今晚 24:00</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">通道执行信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">供应商</span><span>${r.vendor}</span></div>
        <div class="desc-item"><span class="desc-label">账号/Sender</span><span>${r.sender}</span></div>
        <div class="desc-item"><span class="desc-label">发送状态</span><span class="tag ${st.cls}">${st.label}</span></div>
        <div class="desc-item"><span class="desc-label">回执状态</span><span class="tag ${rc.cls}">${rc.label}</span></div>
        <div class="desc-item"><span class="desc-label">失败原因</span><span>${r.failReason ? `<span class="fail-reason">${r.failReason}</span>` : '-'}</span></div>
        <div class="desc-item"><span class="desc-label">通道返回码</span><span>${r.returnCode}</span></div>
        <div class="desc-item"><span class="desc-label">重试次数</span><span>${r.retries}</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">日志时间线</h4>
      ${buildTimeline(r)}
    </section>`;

  openDrawer('sendDetailDrawer');
  refreshIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-send-records');
  renderTopbar('reach');
  bindDrawerClose();

  productLineFilter = createSearchMultiSelect({
    container: document.getElementById('fProductLine'),
    options: PRODUCT_LINES.map(p => ({ value: p.value, label: p.label })),
    placeholder: '全部产品线',
    searchPlaceholder: '搜索产品线…',
  });

  const fStrategy = document.getElementById('fStrategy');
  fStrategy.innerHTML = '<option value="">全部策略</option>' +
    REACH_STRATEGIES.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  fStrategy._ssel?.refresh();

  document.querySelectorAll('#timeRange .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeRange .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('customDates').hidden = btn.dataset.range !== 'custom';
    });
  });

  document.getElementById('queryBtn').addEventListener('click', applyFilters);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  ['fRecordId', 'fTask', 'fUser'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); }));
  document.getElementById('exportBtn').addEventListener('click', () => showToast('发送记录导出中，完成后将通知您'));
  document.getElementById('detailToTask').addEventListener('click', () => location.href = 'task-records.html');

  renderKpis();
  renderTable();
  refreshIcons();
});

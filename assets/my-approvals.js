/* 我的审批页：列表 + 筛选 + 多选批量 + 通过/拒绝 + 详情（与首页审批单详情一致） */

const APPROVAL_STATUS = {
  pending:  { label: '待审批', cls: 'tag-warning' },
  approved: { label: '已通过', cls: 'tag-success' },
  rejected: { label: '已拒绝', cls: 'tag-danger' },
};

/* 审批单的邮件内容与检测存档（6.9.2：审批页只读展示同一检测面板与采纳 / 忽略记录） */
const MA_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'><rect width='100%' height='100%' fill='%23dbe4f5'/><text x='50%' y='50%' font-size='64' text-anchor='middle' fill='%236b7a99'>WORLD CUP FINAL</text></svg>";
const MA_EMAIL_WC = {
  subject: 'Exclusive $50 Offer: Bet & Win!',
  preheader: "Don't miss the biggest jackpot of the week",
  body: `<p><img src="${MA_IMG}" alt="" width="1200" height="600"></p><p>World Cup final night is here. Lock in your champion prediction before kick-off.</p>`,
};
const MA_EMAIL_WELCOME = {
  subject: "Welcome to BingoPlus, {{user_name}}",
  preheader: "Here's how to get started",
  body: '<p>Hi {{user_name}}, welcome aboard! Explore this week\'s featured event lineup and set up your profile to get personalised updates.</p><p>Complete your first deposit to unlock a 100% match Bonus on selected games.</p>',
};
/* 内容变更单（6.10.2）：新旧版本对比 + 变更说明；审批前继续按旧版本发送 */
const MA_CHANGE_SMS = {
  oldVer: 'v1', newVer: 'v2',
  oldText: 'Hi {{user_name}}, we miss you! Log in before 07-14 23:59 to claim your comeback gift at BingoPlus.',
  newText: 'Hi {{user_name}}, we miss you! Log in before 07-16 23:59 to claim your comeback gift at ArenaPlus.',
  note: '活动截止时间调整，品牌名更正为 ArenaPlus',
  submittedAtSend: 14000,
  versions: [
    { ver: 'v2', user: 'lily@', time: '2026-07-14 09:42', effective: '待审批', sent: '-' },
    { ver: 'v1', user: 'lily@', time: '2026-07-13 15:20', effective: '2026-07-13 16:00', sent: 0 },
  ],
};

let APPROVAL_RECORDS = [
  { id: 'AP20260714007', name: '沉默召回短信 · 内容变更', kind: '待我审批', bizType: '内容变更', taskId: 'T20260713002', channel: 'SMS', applicant: 'lily@', appliedAt: '2026-07-14 09:42', status: 'pending', productLine: 'ArenaPlus', site: 'arenaplus', audience: '沉默用户', taskType: '手动发送', category: '营销', timing: '定时 · 2026-07-13 16:00',
    contentSummary: MA_CHANGE_SMS.newText, template: '流失召回话术', change: MA_CHANGE_SMS },
  { id: 'AP20260712008', name: '充值提醒 · 内容变更', kind: '我的申请', bizType: '内容变更', taskId: 'T20260713005', channel: 'SMS', applicant: 'marvin@', appliedAt: '2026-07-12 17:05', status: 'rejected', productLine: 'BingoPlus', site: 'bingoplus', audience: '高充值用户', taskType: '系统调用', taskCode: 'TC-20260713005', category: '营销', timing: '定时 · 2026-07-13 16:30', reviewedAt: '2026-07-12 17:30', reviewer: 'lily@', rejectReason: '新文案未带退订说明，保留旧版本',
    contentSummary: 'Top up today and enjoy extra rewards on BingoPlus.', template: '-',
    change: { oldVer: 'v1', newVer: 'v2', oldText: 'Top up today and enjoy extra rewards on BingoPlus.', newText: 'Top up NOW and WIN BIG bonus on BingoPlus!!', note: '加强促销力度', versions: [
      { ver: 'v2', user: 'marvin@', time: '2026-07-12 17:05', effective: '已拒绝，未生效', sent: '-' },
      { ver: 'v1', user: 'ken@', time: '2026-07-12 10:00', effective: '2026-07-13 16:30', sent: 0 }] } },
  { id: 'AP20260713010', name: 'VIP 生日祝福邮件 · 模板 v1.1', kind: '待我审批', bizType: '模板', channel: '邮件', applicant: 'lily@', appliedAt: '2026-07-13 11:20', status: 'pending', productLine: 'BP-VIP', audience: '-', taskType: '手动发送', category: '营销', timing: '-',
    contentSummary: 'Happy Birthday, {{user_name}}!', template: 'TPL-EMAIL-0018 VIP 生日祝福邮件',
    emailContent: { subject: 'Happy Birthday, {{user_name}}!', preheader: 'Your exclusive VIP gift awaits', body: '<p>Dear {{user_name}}, on your special day we have prepared an exclusive birthday gift worth {{bonus_amount}}. Log in now to claim it!</p>' },
    emailRecords: [{ action: '已采纳', desc: 'Footer 换版本为 v1 2026-09', by: 'lily@', time: '2026-07-13 11:18' }] },
  { id: 'AP20260714003', name: 'Messenger 社群拉新', kind: '待我审批', channel: 'Messenger', applicant: 'lily@', appliedAt: '2026-07-14 09:20', status: 'pending', productLine: 'BingoPlus', audience: '新注册用户', taskType: '手动发送', category: '营销', timing: '定时 · 2026-07-15 10:00',
    contentSummary: '加入官方社群，每日抽奖赢免费竞猜券！', template: '-' },
  { id: 'AP20260713002', name: '世界杯决赛邮件预告', kind: '待我审批', channel: '邮件', applicant: 'ken@', appliedAt: '2026-07-13 15:40', status: 'pending', productLine: 'BingoPlus', audience: '活跃用户', taskType: '手动发送', category: '营销', timing: '立即发送',
    contentSummary: '决赛之夜即将来临，提前锁定您的冠军竞猜…', template: '世界杯竞猜提醒',
    emailContent: MA_EMAIL_WC, emailRecords: [{ action: '已忽略', desc: '忽略全部提醒（强提醒 3 · 提醒 2 · 建议 2）', by: 'ken@', time: '2026-07-13 15:38' }] },
  { id: 'AP20260712001', name: '沉默用户唤醒短信', kind: '我的申请', channel: 'SMS', applicant: 'marvin@', appliedAt: '2026-07-12 11:05', status: 'pending', productLine: 'BP-VIP', audience: '沉默用户', taskType: '系统调用', taskCode: 'TC-20260712001', category: '营销', timing: '循环 · 每周一 09:00',
    contentSummary: '好久不见！您的老朋友 BingoPlus 为您准备了回归好礼…', template: '流失召回话术' },
  { id: 'AP20260711004', name: 'VIP 充值提醒 Push', kind: '待我审批', channel: 'Push', applicant: 'lily@', appliedAt: '2026-07-11 16:22', status: 'approved', productLine: 'BP-VIP', audience: 'VIP用户', taskType: '手动发送', category: '通知', taskStatus: 'done', timing: '立即发送', reviewedAt: '2026-07-11 17:00', reviewer: 'marvin@',
    contentSummary: '您的专属充值礼包已就绪，立即打开 App 领取！', template: '充值优惠通知' },
  { id: 'AP20260710005', name: 'Viber 限时活动通知', kind: '待我审批', channel: 'Viber', applicant: 'ken@', appliedAt: '2026-07-10 14:30', status: 'rejected', productLine: 'BingoPlus', audience: '高充值用户', taskType: '手动发送', category: '营销', timing: '定时 · 2026-07-11 12:00', reviewedAt: '2026-07-10 15:10', reviewer: 'marvin@', rejectReason: '内容与合规要求不符，请修改后重新提交',
    contentSummary: '尊贵的用户，您的专属回馈礼包已到账，点击查收…', template: '-' },
  { id: 'AP20260709006', name: '新用户欢迎邮件', kind: '我的申请', channel: '邮件', applicant: 'marvin@', appliedAt: '2026-07-09 10:00', status: 'approved', productLine: 'BingoPlus', audience: '新注册用户', taskType: '手动发送', category: '营销', taskStatus: 'done', timing: '立即发送', reviewedAt: '2026-07-09 11:30', reviewer: 'lily@',
    contentSummary: '欢迎加入 BingoPlus！完成首充最高可得 100% 加赠…', template: '新用户欢迎',
    emailContent: MA_EMAIL_WELCOME, emailRecords: [
      { action: '已采纳', desc: 'E1-1 主题改写：Welcome to BingoPlus, {{user_name}}', by: 'marvin@', time: '2026-07-09 09:52' },
      { action: '已采纳', desc: 'E1-1 首段改写：Explore this week\'s featured event lineup…', by: 'marvin@', time: '2026-07-09 09:55' }] },
];
APPROVAL_RECORDS.forEach(a => {
  a.bizType = a.bizType || '任务';
  a.site = a.site || (V2_PRODUCT_LINES.find(p => p.name === a.productLine)?.siteId || '');
  a.source = a.source || (a.taskType === '系统调用' ? 'API' : '手动');
});

let filtered = [...APPROVAL_RECORDS];
let page = 1;
const PAGE_SIZE = 10;
let selectedIds = new Set();

function fmt(v) {
  return v == null || v === '' || v === '-' ? '-' : v;
}

/* 审批状态标签：内容变更单待审批时标「待审批（内容变更）」（6.10.2） */
function maApprovalTag(a) {
  const st = APPROVAL_STATUS[a.status] || APPROVAL_STATUS.pending;
  const label = a.bizType === '内容变更' && a.status === 'pending' ? '待审批（内容变更）' : st.label;
  return `<span class="tag ${st.cls}">${label}</span>`;
}
const MA_BIZ_CLS = { 任务: 'tag-gray-outline', 内容变更: 'tag-primary', 模板: 'tag-info' };

/* 任务状态口径（4.4.4）：待审批 = 待发送；审批拒绝 = 已终止（终止原因「审批拒绝」）；内容变更不改变任务状态 */
function maTaskStatusHtml(a) {
  if (a.bizType === '模板') return '-';
  if (a.bizType === '内容变更') {
    const t = typeof v2Task === 'function' ? v2Task(a.taskId) : null;
    return `${v2Tag(V2_TASK_STATUS, t?.status || 'sending')}${a.status === 'pending' ? ' <span class="v2-hint">审批前继续按旧版本发送</span>' : ''}`;
  }
  if (a.status === 'pending') return `${v2Tag(V2_TASK_STATUS, 'pending')} <span class="v2-hint">待审批</span>`;
  if (a.status === 'rejected') return `${v2Tag(V2_TASK_STATUS, 'stopped')} <span class="v2-hint">终止原因：审批拒绝</span>`;
  return v2Tag(V2_TASK_STATUS, a.taskStatus || 'queued');
}

/* 简易字符级对比（LCS），用于新旧版本对比 */
function maDiff(a, b) {
  const x = [...a], y = [...b];
  const n = x.length, m = y.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, oldH = '', newH = '';
  const e = c => esc(c);
  while (i < n && j < m) {
    if (x[i] === y[j]) { oldH += e(x[i]); newH += e(y[j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { oldH += `<del>${e(x[i])}</del>`; i++; }
    else { newH += `<ins>${e(y[j])}</ins>`; j++; }
  }
  while (i < n) oldH += `<del>${e(x[i++])}</del>`;
  while (j < m) newH += `<ins>${e(y[j++])}</ins>`;
  return { oldH: oldH.replace(/<\/del><del>/g, ''), newH: newH.replace(/<\/ins><ins>/g, '') };
}

function maChangeSection(item) {
  const c = item.change;
  const d = maDiff(c.oldText, c.newText);
  return `<section class="card detail-group">
    <h4 class="card-title">内容变更</h4>
    <div class="desc-list">
      <div class="desc-item"><span class="desc-label">关联任务</span><span>${esc(item.taskId)} ${esc(item.name.replace(' · 内容变更', ''))}</span></div>
      <div class="desc-item"><span class="desc-label">变更说明</span><span>${esc(c.note)}</span></div>
    </div>
    <div class="ap-diff">
      <div class="ap-diff-col"><h5>旧版本 ${c.oldVer} <span class="tag tag-gray">当前生效</span></h5>${d.oldH}</div>
      <div class="ap-diff-col new"><h5>新版本 ${c.newVer} <span class="tag tag-orange">${item.status === 'pending' ? '待审批' : item.status === 'approved' ? '已生效' : '已拒绝'}</span></h5>${d.newH}</div>
    </div>
    <div class="v2-hint">变量占位符与原版本一致 · 内容检测（短信）：长度 ${c.newText.length} 字符，敏感词未命中 · 通过后自下一批注入起生效，缓冲内与已提交消息不变；拒绝则保留旧版本继续发送</div>
    <table class="table ap-versions">
      <thead><tr><th>版本号</th><th>修改人</th><th>时间</th><th>生效时间</th><th>生效时已提交条数</th></tr></thead>
      <tbody>${c.versions.map(v => `<tr><td>${v.ver}</td><td>${v.user}</td><td>${v.time}</td><td>${v.effective}</td><td>${typeof v.sent === 'number' ? fmtN(v.sent) : v.sent}</td></tr>`).join('')}</tbody>
    </table>
  </section>`;
}

function renderKpis() {
  const pending = APPROVAL_RECORDS.filter(a => a.status === 'pending').length;
  const approved = APPROVAL_RECORDS.filter(a => a.status === 'approved').length;
  const rejected = APPROVAL_RECORDS.filter(a => a.status === 'rejected').length;
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="kpi-card"><div class="kpi-title">待审批</div><div class="kpi-body"><span class="kpi-value warning">${pending}</span></div></div>
    <div class="kpi-card"><div class="kpi-title">已通过</div><div class="kpi-body"><span class="kpi-value">${approved}</span></div></div>
    <div class="kpi-card"><div class="kpi-title">已拒绝</div><div class="kpi-body"><span class="kpi-value danger">${rejected}</span></div></div>
  `;
}

/* ---------------- 多选与批量操作 ---------------- */
function currentPageIds() {
  const start = (page - 1) * PAGE_SIZE;
  return filtered.slice(start, start + PAGE_SIZE).map(a => a.id);
}

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

function handleBatchAction(act) {
  const items = APPROVAL_RECORDS.filter(a => selectedIds.has(a.id));
  if (!items.length) return;
  const now = '2026-07-14 10:00';
  const n = items.length;
  items.forEach(item => {
    if (item.status !== 'pending') return;
    if (act === 'approve') {
      item.status = 'approved';
    } else {
      item.status = 'rejected';
      item.rejectReason = '审批人拒绝';
    }
    item.reviewer = 'marvin@';
    item.reviewedAt = now;
  });
  showToast(act === 'approve' ? `已批量通过 ${n} 个审批单` : `已批量拒绝 ${n} 个审批单`);
  clearSelection();
  renderKpis();
  renderTable();
}

/* ---------------- 表格 ---------------- */
function renderTable() {
  const body = document.getElementById('approvalTableBody');
  if (!body) return;
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="10" class="empty-cell">暂无审批数据</td></tr>`;
    renderPagination();
    updateBatchBar();
    return;
  }

  body.innerHTML = rows.map(a => {
    const ops = a.status === 'pending'
      ? `<button type="button" class="link-btn" data-act="approve" data-id="${a.id}">通过</button>
         <button type="button" class="link-btn link-btn-danger" data-act="reject" data-id="${a.id}">拒绝</button>
         <button type="button" class="link-btn" data-act="detail" data-id="${a.id}">查看详情</button>`
      : `<button type="button" class="link-btn" data-act="detail" data-id="${a.id}">查看详情</button>`;
    return `
      <tr>
        <td class="col-check"><input type="checkbox" class="row-check" data-check="${a.id}" ${selectedIds.has(a.id) ? 'checked' : ''} aria-label="选择 ${a.id}"></td>
        <td><span class="tag ${a.kind === '我的申请' ? 'tag-info' : 'tag-orange'}">${a.kind}</span></td>
        <td><span class="tag ${MA_BIZ_CLS[a.bizType] || 'tag-gray-outline'}">${a.bizType}</span></td>
        <td><button type="button" class="link-btn" data-act="detail" data-id="${a.id}">${a.id}</button></td>
        <td class="col-name">${a.name}</td>
        <td><span class="tag tag-primary">${a.channel}</span></td>
        <td>${a.applicant}</td>
        <td>${a.appliedAt}</td>
        <td>${maApprovalTag(a)}</td>
        <td class="col-ops">${ops}</td>
      </tr>
    `;
  }).join('');
  renderPagination();
  updateBatchBar();
}

function renderPagination() {
  const el = document.getElementById('pagination');
  if (!el) return;
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) page = pages;
  el.innerHTML = `
    <span class="page-info">共 ${total} 条</span>
    <button class="page-btn" id="prevPage" ${page <= 1 ? 'disabled' : ''}>上一页</button>
    <span class="page-num">${page} / ${pages}</span>
    <button class="page-btn" id="nextPage" ${page >= pages ? 'disabled' : ''}>下一页</button>
  `;
  el.querySelector('#prevPage')?.addEventListener('click', () => { page--; clearSelection(); renderTable(); });
  el.querySelector('#nextPage')?.addEventListener('click', () => { page++; clearSelection(); renderTable(); });
}

function applyFilters() {
  const kind = document.getElementById('fKind')?.value || '';
  const bizType = document.getElementById('fBizType')?.value || '';
  const kw = document.getElementById('fKeyword')?.value.trim().toLowerCase() || '';
  const channel = document.getElementById('fChannel')?.value || '';
  const status = document.getElementById('fStatus')?.value || '';
  const applicant = document.getElementById('fApplicant')?.value || '';

  filtered = APPROVAL_RECORDS.filter(a => {
    if (kind && a.kind !== kind) return false;
    if (bizType && a.bizType !== bizType) return false;
    if (kw && !a.id.toLowerCase().includes(kw) && !a.name.toLowerCase().includes(kw)) return false;
    if (channel && a.channel !== channel) return false;
    if (status && a.status !== status) return false;
    if (applicant && a.applicant !== applicant) return false;
    return true;
  });
  page = 1;
  clearSelection();
  renderTable();
}

function resetFilters() {
  document.getElementById('fKind').value = '';
  document.getElementById('fBizType').value = '';
  document.getElementById('fKeyword').value = '';
  document.getElementById('fChannel').value = '';
  document.getElementById('fStatus').value = '';
  document.getElementById('fApplicant').value = '';
  filtered = [...APPROVAL_RECORDS];
  page = 1;
  clearSelection();
  renderTable();
}

/* ---------------- 详情（与首页审批单详情一致） ---------------- */
function openDetail(id) {
  const item = APPROVAL_RECORDS.find(a => a.id === id);
  if (!item) return;
  const body = document.getElementById('approvalDetailBody');
  const footer = document.getElementById('approvalDetailFooter');
  if (!body || !footer) return;

  body.classList.add('drawer-body--split');
  body.innerHTML = `
    <aside class="detail-preview" id="approvalDetailPreview"></aside>
    <div class="detail-main">
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">任务名称</span><span>${item.name}</span></div>
        <div class="desc-item"><span class="desc-label">任务 ID</span><span>${item.id}</span></div>
        <div class="desc-item"><span class="desc-label">类型</span><span>${item.kind} · ${item.bizType}</span></div>
        <div class="desc-item"><span class="desc-label">创建人</span><span>${item.applicant}</span></div>
        <div class="desc-item"><span class="desc-label">创建时间</span><span>${item.appliedAt}</span></div>
        <div class="desc-item"><span class="desc-label">任务状态</span><span>${maTaskStatusHtml(item)}</span></div>
        <div class="desc-item"><span class="desc-label">审批状态</span><span>${maApprovalTag(item)}</span></div>
        <div class="desc-item"><span class="desc-label">审批人</span><span>${fmt(item.reviewer)}</span></div>
        <div class="desc-item"><span class="desc-label">审批时间</span><span>${fmt(item.reviewedAt)}</span></div>
        ${item.rejectReason ? `<div class="desc-item desc-block"><span class="desc-label">拒绝原因</span><span class="warn-cell danger">${item.rejectReason}</span></div>` : ''}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">配置信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">发送对象</span><span>${fmt(item.audience)}</span></div>
        <div class="desc-item"><span class="desc-label">任务类型</span><span>${item.source === 'API' ? '系统调用' : '手动发送'}</span></div>
        ${item.source === 'API' ? `<div class="desc-item"><span class="desc-label">任务code</span><span>${fmt(item.taskCode)}</span></div>` : ''}
        <div class="desc-item"><span class="desc-label">产品线</span><span title="site id：${esc(item.site)}">${item.site ? esc(plName(item.site)) : '未知产品线'}</span></div>
        ${item.source === 'API' ? `<div class="desc-item"><span class="desc-label">任务code</span><span>${fmt(item.taskCode)}</span></div>` : ''}
        <div class="desc-item"><span class="desc-label">通道配置</span><span><span class="tag tag-primary">${item.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">发送时机</span><span>${fmt(item.timing)}</span></div>
        <div class="desc-item"><span class="desc-label">模板名称</span><span>${fmt(item.template)}</span></div>
      </div>
    </section>
    ${item.change ? maChangeSection(item) : ''}
    ${item.emailContent ? '<section class="card detail-group"><h4 class="card-title">内容检测结果</h4><div id="approvalEmailCheck"></div></section>' : ''}
    </div>
  `;
  if (item.emailContent && typeof renderEmailCheck === 'function') {
    renderEmailCheck(document.getElementById('approvalEmailCheck'), {
      ...ecInputFromContent(item.emailContent, item.site), readOnly: true, full: true, records: item.emailRecords || [],
    });
  }

  mountDetailPreview(document.getElementById('approvalDetailPreview'), [{
    channel: item.channel,
    content: item.emailContent || (item.contentSummary === '-' ? '' : item.contentSummary),
    fallbackTitle: item.name,
  }]);

  if (item.status === 'pending') {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>关闭</button>
      <button class="btn btn-outline btn-reject" id="detailRejectBtn">拒绝</button>
      <button class="btn btn-primary" id="detailApproveBtn">通过</button>
    `;
    footer.querySelector('#detailApproveBtn').addEventListener('click', () => {
      handleAct('approve', id);
      closeDrawer('approvalDetailDrawer');
    });
    footer.querySelector('#detailRejectBtn').addEventListener('click', () => {
      handleAct('reject', id);
      closeDrawer('approvalDetailDrawer');
    });
  } else {
    footer.innerHTML = `<button class="btn btn-outline" data-close>关闭</button>`;
  }

  footer.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeDrawer('approvalDetailDrawer')));
  openDrawer('approvalDetailDrawer');
  refreshIcons();
}

function handleAct(act, id) {
  const idx = APPROVAL_RECORDS.findIndex(a => a.id === id);
  if (idx === -1) return;
  const item = APPROVAL_RECORDS[idx];
  if (item.status !== 'pending') return;

  const now = '2026-07-14 10:00';
  if (act === 'approve') {
    item.status = 'approved';
    item.reviewer = 'marvin@';
    item.reviewedAt = now;
    if (item.change) item.change.versions[0].effective = '下一批注入起生效';
    showToast(item.bizType === '内容变更' ? `已通过「${item.name}」，新版本自下一批注入起生效` : `已通过审批单「${item.name}」`);
  } else {
    item.status = 'rejected';
    item.reviewer = 'marvin@';
    item.reviewedAt = now;
    item.rejectReason = '审批人拒绝';
    if (item.change) item.change.versions[0].effective = '已拒绝，未生效';
    showToast(item.bizType === '内容变更' ? `已拒绝「${item.name}」，任务保留旧版本继续发送` : (item.bizType === '模板' ? `已拒绝审批单「${item.name}」` : `已拒绝审批单「${item.name}」，任务已终止（审批拒绝）`));
  }

  filtered = filtered.map(a => a.id === id ? item : a);
  renderKpis();
  renderTable();
}

function bindTableActions() {
  const body = document.getElementById('approvalTableBody');
  if (!body || body.dataset.bound) return;
  body.dataset.bound = '1';
  body.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const { act, id } = btn.dataset;
    if (act === 'detail') openDetail(id);
    else handleAct(act, id);
  });
  body.addEventListener('change', e => {
    const cb = e.target.closest('.row-check');
    if (!cb) return;
    if (cb.checked) selectedIds.add(cb.dataset.check);
    else selectedIds.delete(cb.dataset.check);
    updateBatchBar();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-my-approvals');
  renderTopbar('reach');
  bindDrawerClose();
  bindTableActions();

  document.getElementById('queryBtn')?.addEventListener('click', applyFilters);
  document.getElementById('resetBtn')?.addEventListener('click', resetFilters);
  document.getElementById('fKeyword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') applyFilters();
  });

  document.getElementById('checkAll')?.addEventListener('change', e => {
    const pageIds = currentPageIds();
    if (e.target.checked) pageIds.forEach(id => selectedIds.add(id));
    else pageIds.forEach(id => selectedIds.delete(id));
    renderTable();
  });
  document.querySelectorAll('#batchBar [data-batch]').forEach(btn =>
    btn.addEventListener('click', () => handleBatchAction(btn.dataset.batch)));

  renderKpis();
  renderTable();
  refreshIcons();
});

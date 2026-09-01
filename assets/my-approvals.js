/* 我的审批页：列表 + 筛选 + 多选批量 + 通过/拒绝 + 详情（与首页审批单详情一致） */

const APPROVAL_STATUS = {
  pending:  { label: '待审批', cls: 'tag-warning' },
  approved: { label: '已通过', cls: 'tag-success' },
  rejected: { label: '已拒绝', cls: 'tag-danger' },
};

let APPROVAL_RECORDS = [
  { id: 'AP20260714003', name: 'Messenger 社群拉新', kind: '待我审批', channel: 'Messenger', applicant: 'lily@', appliedAt: '2026-07-14 09:20', status: 'pending', productLine: 'BingoPlus', audience: '新注册用户', taskType: '手动发送', timing: '定时 · 2026-07-15 10:00',
    contentSummary: '加入官方社群，每日抽奖赢免费竞猜券！', template: '-' },
  { id: 'AP20260713002', name: '世界杯决赛邮件预告', kind: '待我审批', channel: '邮件', applicant: 'ken@', appliedAt: '2026-07-13 15:40', status: 'pending', productLine: 'BingoPlus', audience: '活跃用户', taskType: '手动发送', timing: '立即发送',
    contentSummary: '决赛之夜即将来临，提前锁定您的冠军竞猜…', template: '世界杯竞猜提醒' },
  { id: 'AP20260712001', name: '沉默用户唤醒短信', kind: '我的申请', channel: 'SMS', applicant: 'marvin@', appliedAt: '2026-07-12 11:05', status: 'pending', productLine: 'BP-VIP', audience: '沉默用户', taskType: '系统调用', taskCode: 'TC-20260712001', timing: '循环 · 每周一 09:00',
    contentSummary: '好久不见！您的老朋友 BingoPlus 为您准备了回归好礼…', template: '流失召回话术' },
  { id: 'AP20260711004', name: 'VIP 充值提醒 Push', kind: '待我审批', channel: 'Push', applicant: 'lily@', appliedAt: '2026-07-11 16:22', status: 'approved', productLine: 'BP-VIP', audience: 'VIP用户', taskType: '手动发送', timing: '立即发送', reviewedAt: '2026-07-11 17:00', reviewer: 'marvin@',
    contentSummary: '您的专属充值礼包已就绪，立即打开 App 领取！', template: '充值优惠通知' },
  { id: 'AP20260710005', name: 'Viber 限时活动通知', kind: '待我审批', channel: 'Viber', applicant: 'ken@', appliedAt: '2026-07-10 14:30', status: 'rejected', productLine: 'BingoPlus', audience: '高充值用户', taskType: '手动发送', timing: '定时 · 2026-07-11 12:00', reviewedAt: '2026-07-10 15:10', reviewer: 'marvin@', rejectReason: '内容与合规要求不符，请修改后重新提交',
    contentSummary: '尊贵的用户，您的专属回馈礼包已到账，点击查收…', template: '-' },
  { id: 'AP20260709006', name: '新用户欢迎邮件', kind: '我的申请', channel: '邮件', applicant: 'marvin@', appliedAt: '2026-07-09 10:00', status: 'approved', productLine: 'BingoPlus', audience: '新注册用户', taskType: '手动发送', timing: '立即发送', reviewedAt: '2026-07-09 11:30', reviewer: 'lily@',
    contentSummary: '欢迎加入 BingoPlus！完成首充最高可得 100% 加赠…', template: '新用户欢迎' },
];

let filtered = [...APPROVAL_RECORDS];
let page = 1;
const PAGE_SIZE = 10;
let selectedIds = new Set();

function fmt(v) {
  return v == null || v === '' || v === '-' ? '-' : v;
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
    body.innerHTML = `<tr><td colspan="9" class="empty-cell">暂无审批数据</td></tr>`;
    renderPagination();
    updateBatchBar();
    return;
  }

  body.innerHTML = rows.map(a => {
    const st = APPROVAL_STATUS[a.status] || APPROVAL_STATUS.pending;
    const ops = a.status === 'pending'
      ? `<button type="button" class="link-btn" data-act="approve" data-id="${a.id}">通过</button>
         <button type="button" class="link-btn link-btn-danger" data-act="reject" data-id="${a.id}">拒绝</button>
         <button type="button" class="link-btn" data-act="detail" data-id="${a.id}">查看详情</button>`
      : `<button type="button" class="link-btn" data-act="detail" data-id="${a.id}">查看详情</button>`;
    return `
      <tr>
        <td class="col-check"><input type="checkbox" class="row-check" data-check="${a.id}" ${selectedIds.has(a.id) ? 'checked' : ''} aria-label="选择 ${a.id}"></td>
        <td><span class="tag ${a.kind === '我的申请' ? 'tag-info' : 'tag-orange'}">${a.kind}</span></td>
        <td><button type="button" class="link-btn" data-act="detail" data-id="${a.id}">${a.id}</button></td>
        <td class="col-name">${a.name}</td>
        <td><span class="tag tag-primary">${a.channel}</span></td>
        <td>${a.applicant}</td>
        <td>${a.appliedAt}</td>
        <td><span class="tag ${st.cls}">${st.label}</span></td>
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
  const kw = document.getElementById('fKeyword')?.value.trim().toLowerCase() || '';
  const channel = document.getElementById('fChannel')?.value || '';
  const status = document.getElementById('fStatus')?.value || '';
  const applicant = document.getElementById('fApplicant')?.value || '';

  filtered = APPROVAL_RECORDS.filter(a => {
    if (kind && a.kind !== kind) return false;
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
  const st = APPROVAL_STATUS[item.status] || APPROVAL_STATUS.pending;
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
        <div class="desc-item"><span class="desc-label">类型</span><span>${item.kind}</span></div>
        <div class="desc-item"><span class="desc-label">创建人</span><span>${item.applicant}</span></div>
        <div class="desc-item"><span class="desc-label">创建时间</span><span>${item.appliedAt}</span></div>
        <div class="desc-item"><span class="desc-label">任务状态</span><span class="tag tag-info">待发送</span></div>
        <div class="desc-item"><span class="desc-label">审批状态</span><span class="tag ${st.cls}">${st.label}</span></div>
        <div class="desc-item"><span class="desc-label">审批人</span><span>${fmt(item.reviewer)}</span></div>
        <div class="desc-item"><span class="desc-label">审批时间</span><span>${fmt(item.reviewedAt)}</span></div>
        ${item.rejectReason ? `<div class="desc-item desc-block"><span class="desc-label">拒绝原因</span><span class="warn-cell danger">${item.rejectReason}</span></div>` : ''}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">配置信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">发送对象</span><span>${fmt(item.audience)}</span></div>
        <div class="desc-item"><span class="desc-label">任务类型</span><span>${fmt(item.taskType)}</span></div>
        ${item.taskType === '系统调用' ? `<div class="desc-item"><span class="desc-label">任务code</span><span>${fmt(item.taskCode)}</span></div>` : ''}
        <div class="desc-item"><span class="desc-label">通道配置</span><span><span class="tag tag-primary">${item.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">发送时机</span><span>${fmt(item.timing)}</span></div>
        <div class="desc-item"><span class="desc-label">模板名称</span><span>${fmt(item.template)}</span></div>
      </div>
    </section>
    </div>
  `;

  mountDetailPreview(document.getElementById('approvalDetailPreview'), [{
    channel: item.channel,
    content: item.contentSummary === '-' ? '' : item.contentSummary,
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
    showToast(`已通过审批单「${item.name}」`);
  } else {
    item.status = 'rejected';
    item.reviewer = 'marvin@';
    item.reviewedAt = now;
    item.rejectReason = '审批人拒绝';
    showToast(`已拒绝审批单「${item.name}」`);
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

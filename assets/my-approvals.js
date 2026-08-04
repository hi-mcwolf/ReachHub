/* 我的审批页：列表 + 筛选 + 通过/拒绝 */

const APPROVAL_STATUS = {
  pending:  { label: '待审批', cls: 'tag-warning' },
  approved: { label: '已通过', cls: 'tag-success' },
  rejected: { label: '已拒绝', cls: 'tag-danger' },
};

let APPROVAL_RECORDS = [
  { id: 'AP20260714003', name: 'Messenger 社群拉新', channel: 'Messenger', applicant: 'lily@', appliedAt: '2026-07-14 09:20', status: 'pending', productLine: 'BingoPlus', audience: '新注册用户', timing: '定时 · 2026-07-15 10:00' },
  { id: 'AP20260713002', name: '世界杯决赛邮件预告', channel: '邮件', applicant: 'ken@', appliedAt: '2026-07-13 15:40', status: 'pending', productLine: 'BingoPlus', audience: '活跃用户', timing: '立即发送' },
  { id: 'AP20260712001', name: '沉默用户唤醒短信', channel: 'SMS', applicant: 'marvin@', appliedAt: '2026-07-12 11:05', status: 'pending', productLine: 'BP-VIP', audience: '沉默用户', timing: '循环 · 每周一 09:00' },
  { id: 'AP20260711004', name: 'VIP 充值提醒 Push', channel: 'Push', applicant: 'lily@', appliedAt: '2026-07-11 16:22', status: 'approved', productLine: 'BP-VIP', audience: 'VIP用户', timing: '立即发送', reviewedAt: '2026-07-11 17:00', reviewer: 'marvin@' },
  { id: 'AP20260710005', name: 'Viber 限时活动通知', channel: 'Viber', applicant: 'ken@', appliedAt: '2026-07-10 14:30', status: 'rejected', productLine: 'BingoPlus', audience: '高充值用户', timing: '定时 · 2026-07-11 12:00', reviewedAt: '2026-07-10 15:10', reviewer: 'marvin@', rejectReason: '内容与合规要求不符，请修改后重新提交' },
  { id: 'AP20260709006', name: '新用户欢迎邮件', channel: '邮件', applicant: 'marvin@', appliedAt: '2026-07-09 10:00', status: 'approved', productLine: 'BingoPlus', audience: '新注册用户', timing: '立即发送', reviewedAt: '2026-07-09 11:30', reviewer: 'lily@' },
];

let filtered = [...APPROVAL_RECORDS];
let page = 1;
const PAGE_SIZE = 10;

function fmt(v) {
  return v == null || v === '' ? '—' : v;
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

function renderTable() {
  const body = document.getElementById('approvalTableBody');
  if (!body) return;
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty-cell">暂无审批数据</td></tr>`;
    renderPagination();
    return;
  }

  body.innerHTML = rows.map(a => {
    const st = APPROVAL_STATUS[a.status] || APPROVAL_STATUS.pending;
    const ops = a.status === 'pending'
      ? `<button type="button" class="link-btn" data-act="approve" data-id="${a.id}">通过</button>
         <button type="button" class="link-btn link-btn-danger" data-act="reject" data-id="${a.id}">拒绝</button>`
      : `<button type="button" class="link-btn" data-act="detail" data-id="${a.id}">查看</button>`;
    return `
      <tr>
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
  el.querySelector('#prevPage')?.addEventListener('click', () => { page--; renderTable(); });
  el.querySelector('#nextPage')?.addEventListener('click', () => { page++; renderTable(); });
}

function applyFilters() {
  const kw = document.getElementById('fKeyword')?.value.trim().toLowerCase() || '';
  const channel = document.getElementById('fChannel')?.value || '';
  const status = document.getElementById('fStatus')?.value || '';
  const applicant = document.getElementById('fApplicant')?.value || '';

  filtered = APPROVAL_RECORDS.filter(a => {
    if (kw && !a.id.toLowerCase().includes(kw) && !a.name.toLowerCase().includes(kw)) return false;
    if (channel && a.channel !== channel) return false;
    if (status && a.status !== status) return false;
    if (applicant && a.applicant !== applicant) return false;
    return true;
  });
  page = 1;
  renderTable();
}

function resetFilters() {
  document.getElementById('fKeyword').value = '';
  document.getElementById('fChannel').value = '';
  document.getElementById('fStatus').value = '';
  document.getElementById('fApplicant').value = '';
  filtered = [...APPROVAL_RECORDS];
  page = 1;
  renderTable();
}

function openDetail(id) {
  const item = APPROVAL_RECORDS.find(a => a.id === id);
  if (!item) return;
  const st = APPROVAL_STATUS[item.status] || APPROVAL_STATUS.pending;
  const body = document.getElementById('approvalDetailBody');
  const footer = document.getElementById('approvalDetailFooter');
  if (!body || !footer) return;

  body.innerHTML = `
    <section class="card detail-group">
      <h4 class="card-title">审批信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">审批单 ID</span><span>${item.id}</span></div>
        <div class="desc-item"><span class="desc-label">审批单名称</span><span>${item.name}</span></div>
        <div class="desc-item"><span class="desc-label">通道</span><span><span class="tag tag-primary">${item.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">产品线</span><span>${fmt(item.productLine)}</span></div>
        <div class="desc-item"><span class="desc-label">目标人群</span><span>${fmt(item.audience)}</span></div>
        <div class="desc-item"><span class="desc-label">发送时机</span><span>${fmt(item.timing)}</span></div>
        <div class="desc-item"><span class="desc-label">申请人</span><span>${item.applicant}</span></div>
        <div class="desc-item"><span class="desc-label">申请时间</span><span>${item.appliedAt}</span></div>
        <div class="desc-item"><span class="desc-label">审批状态</span><span class="tag ${st.cls}">${st.label}</span></div>
        ${item.reviewer ? `<div class="desc-item"><span class="desc-label">审批人</span><span>${item.reviewer}</span></div>` : ''}
        ${item.reviewedAt ? `<div class="desc-item"><span class="desc-label">审批时间</span><span>${item.reviewedAt}</span></div>` : ''}
        ${item.rejectReason ? `<div class="desc-item desc-block"><span class="desc-label">拒绝原因</span><span class="warn-cell danger">${item.rejectReason}</span></div>` : ''}
      </div>
    </section>
  `;

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

  renderKpis();
  renderTable();
  refreshIcons();
});

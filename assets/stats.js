/* 触达数据统计页 */

/* ---------------- 假数据 ---------------- */
const STAT_CHANNELS = ['SMS', '邮件', 'Push', 'Inbox', 'IM', 'Bot', 'Viber', 'Telegram', '电销'];
const BLUE_SHADES = ['#1E4FB8', '#2E6BE6', '#4A7DFF', '#6D96F5', '#8FAEF7', '#A9C0F8', '#C0D1FA', '#D5E1FC', '#E7EEFE'];

let currentRange = '7d';
let jitterSeed = 1;

function rand(min, max) { return min + Math.random() * (max - min); }
function fmt(n) { return Math.round(n).toLocaleString(); }

function rangeLabels(range) {
  if (range === 'today') {
    return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  }
  const days = range === '30d' ? 30 : 7;
  const labels = [];
  const now = new Date('2026-07-10');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return labels;
}

function genTrend(range) {
  const labels = rangeLabels(range);
  const n = labels.length;
  const base = range === 'today' ? 9000 : range === '30d' ? 165000 : 180000;
  const send = labels.map((_, i) => {
    const wave = Math.sin(i / (n / 3.2)) * 0.22 + 1;
    const hourDip = range === 'today' ? (i < 7 ? 0.35 : 1) : 1;
    return base * wave * hourDip * rand(0.9, 1.1) * jitterSeed;
  });
  const delivered = send.map(v => v * rand(0.945, 0.985));
  const opened = delivered.map(v => v * rand(0.24, 0.33));
  return { labels, send, delivered, opened };
}

function genChannelDist() {
  const base = [420000, 268000, 231000, 152000, 98000, 61000, 32000, 15600, 7300];
  return STAT_CHANNELS.map((name, i) => ({ name, value: Math.round(base[i] * rand(0.92, 1.08) * jitterSeed) }));
}

function genEffect() {
  const chs = ['SMS', '邮件', 'Push', 'Inbox', 'IM', 'Bot'];
  return {
    channels: chs,
    delivered: chs.map(() => +rand(88, 99).toFixed(1)),
    opened: chs.map(() => +rand(16, 42).toFixed(1)),
    clicked: chs.map(() => +rand(5, 19).toFixed(1)),
  };
}

const TOP_TASKS = [
  { name: '世界杯竞猜预热短信', send: 128000, ctr: 18.2, cvr: 6.4 },
  { name: '充值加赠限时提醒', send: 96400, ctr: 15.7, cvr: 5.1 },
  { name: 'VIP 专属回归礼包', send: 23000, ctr: 14.9, cvr: 4.8 },
  { name: '新用户注册福利 Push', send: 56000, ctr: 12.3, cvr: 3.2 },
  { name: '沉默用户召回邮件', send: 84000, ctr: 9.6, cvr: 2.1 },
];

const QUOTAS = [
  { name: 'SMS', pct: 82 },
  { name: 'Push', pct: 64 },
  { name: '邮件', pct: 91 },
  { name: 'IM', pct: 47 },
  { name: '电销', pct: 96 },
];

const TASK_ROWS = [
  { name: '世界杯竞猜预热短信', type: '营销活动', channel: 'SMS', partner: '自营平台', time: '2026-07-10 10:00', send: 128000, dlv: 97.2, open: 31.4, click: 18.2, status: '执行中', warn: null },
  { name: '充值加赠限时提醒', type: '促活', channel: 'Push', partner: '自营平台', time: '2026-07-10 09:30', send: 96400, dlv: 95.8, open: 27.6, click: 15.7, status: '执行中', warn: null },
  { name: '沉默用户召回邮件', type: '召回', channel: '邮件', partner: '渠道 A', time: '2026-07-09 20:00', send: 84000, dlv: 91.3, open: 18.9, click: 9.6, status: '已完成', warn: '回执延迟' },
  { name: '新用户注册福利 Push', type: '生命周期', channel: 'Push', partner: '自营平台', time: '2026-07-09 18:00', send: 56000, dlv: 96.4, open: 24.8, click: 12.3, status: '已完成', warn: null },
  { name: 'VIP 专属回归礼包', type: '召回', channel: '电销', partner: '渠道 B', time: '2026-07-09 14:00', send: 23000, dlv: 88.6, open: 42.1, click: 14.9, status: '已完成', warn: null },
  { name: '活动开赛提醒 Viber', type: '通知', channel: 'Viber', partner: '渠道 A', time: '2026-07-09 12:00', send: 15600, dlv: 76.2, open: 20.3, click: 8.8, status: '失败', warn: '通道中断', danger: true },
  { name: '周末充值返利 IM', type: '营销活动', channel: 'IM', partner: '自营平台', time: '2026-07-08 19:00', send: 48200, dlv: 94.1, open: 26.2, click: 11.4, status: '已完成', warn: null },
  { name: '流失预警关怀短信', type: '生命周期', channel: 'SMS', partner: '自营平台', time: '2026-07-08 15:00', send: 36800, dlv: 90.4, open: 22.7, click: 7.9, status: '已暂停', warn: '失败率异常', danger: true },
  { name: '赛事结果推送 Bot', type: '通知', channel: 'Bot', partner: '渠道 B', time: '2026-07-08 11:00', send: 61000, dlv: 98.3, open: 35.6, click: 16.1, status: '已完成', warn: null },
  { name: '月度账单通知 Inbox', type: '通知', channel: 'Inbox', partner: '自营平台', time: '2026-07-07 09:00', send: 152000, dlv: 99.1, open: 40.2, click: 6.3, status: '已完成', warn: null },
];

/* ---------------- KPI 卡片 ---------------- */
function sparkline(series) {
  const w = 70, h = 28, pad = 2;
  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="kpi-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}"/></svg>`;
}

function renderKpis(trend) {
  const totalSend = trend.send.reduce((a, b) => a + b, 0);
  const dlvRate = trend.delivered.reduce((a, b) => a + b, 0) / totalSend * 100;
  const openRate = trend.opened.reduce((a, b) => a + b, 0) / trend.delivered.reduce((a, b) => a + b, 0) * 100;

  const kpis = [
    { title: '发送总量', value: fmt(totalSend), delta: 12.6, label: '较上周期', spark: trend.send },
    { title: '送达率', value: dlvRate.toFixed(1) + '%', delta: 1.2, label: '较上周期', spark: trend.delivered },
    { title: '打开率', value: openRate.toFixed(1) + '%', delta: -0.8, label: '较上周期', spark: trend.opened },
    { title: '点击率', value: (openRate * rand(0.4, 0.44)).toFixed(1) + '%', delta: 3.5, label: '较上周期', spark: trend.opened.map(v => v * 0.42) },
    { title: '异常任务数', value: '14', delta: 4, label: '较昨日', valueClass: 'danger', goodWhenUp: false },
    { title: '预警数', value: '5', delta: -2, label: '较昨日', valueClass: 'warning', goodWhenUp: false },
  ];

  document.getElementById('kpiGrid').innerHTML = kpis.map(k => {
    const up = k.delta >= 0;
    const good = k.goodWhenUp === false ? !up : up;
    const arrow = up ? 'arrow-up-right' : 'arrow-down-right';
    return `
      <div class="kpi-card">
        <div class="kpi-title">${k.title}</div>
        <div class="kpi-body">
          <div class="kpi-value ${k.valueClass || ''}">${k.value}</div>
          ${k.spark ? sparkline(k.spark) : ''}
        </div>
        <div class="kpi-delta ${good ? 'up' : 'down'}">
          <span class="delta-label">${k.label}</span>
          <i data-lucide="${arrow}"></i>${up ? '+' : ''}${k.delta}${k.title.includes('数') ? '' : '%'}
        </div>
      </div>`;
  }).join('');
  refreshIcons();
}

/* ---------------- ECharts 图表 ---------------- */
let trendChart, channelChart, effectChart;

const AXIS_STYLE = {
  axisLine: { lineStyle: { color: '#E5E7EB' } },
  axisLabel: { color: '#86909C', fontSize: 11 },
  axisTick: { show: false },
};
const SPLIT_LINE = { lineStyle: { color: '#F2F3F5' } };

function renderTrendChart(trend) {
  trendChart.setOption({
    color: ['#2E6BE6', '#2BA471', '#A9C0F8'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, itemWidth: 14, textStyle: { color: '#4E5969', fontSize: 12 } },
    grid: { left: 8, right: 8, top: 36, bottom: 0, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: trend.labels, ...AXIS_STYLE },
    yAxis: { type: 'value', splitLine: SPLIT_LINE, axisLabel: AXIS_STYLE.axisLabel },
    series: [
      { name: '发送量', type: 'line', smooth: true, showSymbol: false, data: trend.send.map(Math.round) },
      { name: '送达量', type: 'line', smooth: true, showSymbol: false, data: trend.delivered.map(Math.round) },
      { name: '打开量', type: 'line', smooth: true, showSymbol: false, data: trend.opened.map(Math.round) },
    ],
  });
}

function renderChannelChart() {
  const data = genChannelDist().sort((a, b) => a.value - b.value);
  channelChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 24, top: 8, bottom: 0, containLabel: true },
    xAxis: { type: 'value', splitLine: SPLIT_LINE, axisLabel: AXIS_STYLE.axisLabel },
    yAxis: { type: 'category', data: data.map(d => d.name), ...AXIS_STYLE },
    series: [{
      name: '发送量',
      type: 'bar',
      barWidth: 14,
      data: data.map((d, i) => ({
        value: d.value,
        itemStyle: { color: BLUE_SHADES[data.length - 1 - i], borderRadius: [0, 3, 3, 0] },
      })),
    }],
  });
}

function renderEffectChart() {
  const e = genEffect();
  effectChart.setOption({
    color: ['#2E6BE6', '#6D96F5', '#C0D1FA'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + '%' },
    legend: { top: 0, right: 0, itemWidth: 14, textStyle: { color: '#4E5969', fontSize: 12 } },
    grid: { left: 8, right: 8, top: 36, bottom: 0, containLabel: true },
    xAxis: { type: 'category', data: e.channels, ...AXIS_STYLE },
    yAxis: { type: 'value', max: 100, splitLine: SPLIT_LINE, axisLabel: { ...AXIS_STYLE.axisLabel, formatter: '{value}%' } },
    series: [
      { name: '送达率', type: 'bar', barWidth: 10, itemStyle: { borderRadius: [3, 3, 0, 0] }, data: e.delivered },
      { name: '打开率', type: 'bar', barWidth: 10, itemStyle: { borderRadius: [3, 3, 0, 0] }, data: e.opened },
      { name: '点击率', type: 'bar', barWidth: 10, itemStyle: { borderRadius: [3, 3, 0, 0] }, data: e.clicked },
    ],
  });
}

/* ---------------- TOP5 / 配额 / 表格 ---------------- */
function renderTopList() {
  const max = Math.max(...TOP_TASKS.map(t => t.ctr));
  document.getElementById('topList').innerHTML = TOP_TASKS.map((t, i) => `
    <div class="top-item">
      <span class="top-rank">${i + 1}</span>
      <span class="top-name" title="${t.name}">${t.name}</span>
      <span class="top-meta">
        <span>发送 ${fmt(t.send)}</span>
        <span>点击率 ${t.ctr}%</span>
      </span>
      <span class="top-bar">
        <span class="progress"><span class="progress-inner" style="width:${(t.ctr / max * 100).toFixed(0)}%"></span></span>
        <span class="pct">${t.ctr}%</span>
      </span>
    </div>`).join('');
}

function renderQuota() {
  document.getElementById('quotaList').innerHTML = QUOTAS.map(q => {
    const level = q.pct > 95 ? 'danger' : q.pct > 80 ? 'warning' : '';
    return `
      <div class="quota-item" title="${q.name} 通道本月已用 ${q.pct}%${level ? '，' + (level === 'danger' ? '即将耗尽，请立即扩容' : '用量偏高，请关注') : ''}">
        <span class="quota-name">${q.name}</span>
        <span class="progress"><span class="quota-fill ${level}" style="width:${q.pct}%"></span></span>
        <span class="quota-pct ${level}">${q.pct}%</span>
      </div>`;
  }).join('');
}

const STATUS_TAG = {
  '执行中': 'tag-primary',
  '已完成': 'tag-success',
  '失败': 'tag-danger',
  '已暂停': 'tag-warning',
};

const PAGE_SIZE = 5;
let currentPage = 1;

function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = TASK_ROWS.slice(start, start + PAGE_SIZE);
  document.getElementById('taskTableBody').innerHTML = rows.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.channel}</td>
      <td>${r.partner}</td>
      <td class="cell-muted">${r.time}</td>
      <td>${fmt(r.send)}</td>
      <td>${r.dlv}%</td>
      <td>${r.open}%</td>
      <td>${r.click}%</td>
      <td><span class="tag ${STATUS_TAG[r.status]}">${r.status}</span></td>
      <td>${r.warn
        ? `<span class="warn-cell ${r.danger ? 'danger' : ''}" title="${r.warn}"><i data-lucide="alert-triangle"></i>${r.warn}</span>`
        : '<span class="cell-muted">-</span>'}</td>
      <td>
        <button class="link-btn" data-act="detail">查看详情</button>
      </td>
    </tr>`).join('');
  renderPagination();
  refreshIcons();
}

function renderPagination() {
  const pages = Math.ceil(TASK_ROWS.length / PAGE_SIZE);
  let html = `<span class="page-total">共 ${TASK_ROWS.length} 条</span>
    <button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) {
    html += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
  }
  html += `<button class="page-btn" data-page="next" ${currentPage === pages ? 'disabled' : ''}>›</button>`;
  const host = document.getElementById('pagination');
  host.innerHTML = html;
  host.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.page;
      if (v === 'prev') currentPage--;
      else if (v === 'next') currentPage++;
      else currentPage = +v;
      renderTable();
    });
  });
}

/* ---------------- 联动刷新 ---------------- */
function rerenderAll() {
  const trend = genTrend(currentRange);
  renderKpis(trend);
  renderTrendChart(trend);
  renderChannelChart();
  renderEffectChart();
}

function touchUpdateTime() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('updateTime').textContent =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} 更新`;
}

/* ---------------- 初始化 ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-stats');
  renderTopbar('reach');

  trendChart = echarts.init(document.getElementById('trendChart'));
  channelChart = echarts.init(document.getElementById('channelChart'));
  effectChart = echarts.init(document.getElementById('effectChart'));
  window.addEventListener('resize', () => {
    trendChart.resize(); channelChart.resize(); effectChart.resize();
  });

  // 时间范围切换
  document.querySelectorAll('#timeRange .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeRange .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.dataset.range;
      document.getElementById('customDates').hidden = range !== 'custom';
      currentRange = range === 'custom' ? '7d' : range;
      jitterSeed = rand(0.95, 1.05);
      rerenderAll();
    });
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    jitterSeed = rand(0.92, 1.08);
    rerenderAll();
    touchUpdateTime();
    showToast('数据已刷新');
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    showToast('导出任务已提交，稍后可在下载中心查看');
  });
  document.getElementById('queryBtn').addEventListener('click', () => {
    jitterSeed = rand(0.92, 1.08);
    rerenderAll();
    showToast('查询完成');
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.querySelectorAll('.filter-card .select').forEach(s => { s.selectedIndex = 0; });
    document.querySelector('#timeRange .seg-btn[data-range="7d"]').click();
    showToast('筛选条件已重置');
  });

  // 表格操作列
  document.getElementById('taskTableBody').addEventListener('click', e => {
    const btn = e.target.closest('.link-btn');
    if (!btn) return;
    const name = btn.closest('tr').children[0].textContent;
    showToast(`查看详情：${name}（原型演示）`);
  });

  rerenderAll();
  renderTopList();
  renderQuota();
  renderTable();
  refreshIcons();
});

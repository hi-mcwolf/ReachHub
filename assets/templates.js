/* 模板管理页：列表 + 筛选 + 详情/编辑/新建抽屉 */

const TPL_STATUS = {
  draft:    { label: '草稿',     cls: 'tag-gray' },
  active:   { label: '已生效',   cls: 'tag-success' },
  disabled: { label: '已停用',   cls: 'tag-gray-outline' },
};

const CHANNELS = ['SMS', '邮件', 'Push', 'Inbox', 'IM', 'Bot', 'Viber', 'Telegram', '电销'];
const TEMPLATE_TYPES = ['营销', 'OTP'];

/* ---------------- Mock 数据（18 条） ---------------- */
let TEMPLATE_RECORDS = [
  {
    id: 'tpl-001', name: '世界杯竞猜提醒', code: 'TPL-SMS-0012', type: '营销', channel: 'SMS',
    langs: '英文', bizLine: 'BingoPlus', status: 'active', creator: 'marvin@',
    createdAt: '2026-06-10 10:20', updatedAt: '2026-07-10 15:42', updatedBy: 'marvin@',
    content: { text: "Hi {{user_name}}! Only the best teams remain! Warm up for the Quarterfinals with today's FREE World Cup Quiz. Visit bingoplus.com.", hasShortLink: true, signature: 'BPLUS' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'Juan', required: true },
      { name: 'event_name', desc: '活动名称', example: 'World Cup Quiz', required: false },
    ],
    audit: { status: '已通过', reviewer: 'lily@', time: '2026-06-12 14:30', rejectReason: null },
    versions: [
      { ver: 'v1.2', time: '2026-07-10 15:42', user: 'marvin@', summary: '更新短链文案' },
      { ver: 'v1.1', time: '2026-06-28 11:00', user: 'lily@', summary: '新增 user_name 变量' },
      { ver: 'v1.0', time: '2026-06-10 10:20', user: 'marvin@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-002', name: '充值优惠通知', code: 'TPL-EMAIL-0008', type: '营销', channel: '邮件',
    langs: '中文', bizLine: 'BingoPlus', status: 'active', creator: 'lily@',
    createdAt: '2026-06-15 14:05', updatedAt: '2026-07-08 11:30', updatedBy: 'lily@',
    content: { subject: '本周充值满 {{bonus_amount}} 即享 8% 加赠', subtitle: '限时活动，今晚 24:00 截止', body: '尊敬的用户 {{user_name}}，本周充值满 {{bonus_amount}} 即享 8% 加赠，活动今晚 24:00 截止，立即打开 App 参与吧！', ctaText: '立即充值', ctaLink: 'https://bingoplus.com/recharge' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'Maria', required: true },
      { name: 'bonus_amount', desc: '优惠门槛金额', example: '500', required: true },
    ],
    audit: { status: '已通过', reviewer: 'ken@', time: '2026-06-16 09:15', rejectReason: null },
    versions: [
      { ver: 'v2.0', time: '2026-07-08 11:30', user: 'lily@', summary: '更新 CTA 按钮文案' },
      { ver: 'v1.0', time: '2026-06-15 14:05', user: 'lily@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-003', name: '每日签到提醒', code: 'TPL-PUSH-0021', type: '营销', channel: 'Push',
    langs: '中文', bizLine: 'BingoPlus', status: 'active', creator: 'ken@',
    createdAt: '2026-06-20 09:00', updatedAt: '2026-07-12 18:12', updatedBy: 'ken@',
    content: { title: '签到礼包已刷新', body: '{{user_name}}，连续签到 7 天可领神秘大奖！今日签到即得 {{bonus_amount}} 积分', link: 'bingoplus://signin', imageHint: '签到图标 64×64' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'Kevin', required: true },
      { name: 'bonus_amount', desc: '签到积分', example: '50', required: false },
    ],
    audit: { status: '已通过', reviewer: 'marvin@', time: '2026-06-21 10:00', rejectReason: null },
    versions: [
      { ver: 'v1.1', time: '2026-07-12 18:12', user: 'ken@', summary: '增加积分变量' },
      { ver: 'v1.0', time: '2026-06-20 09:00', user: 'ken@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-004', name: '系统维护通知', code: 'TPL-INBOX-0003', type: 'OTP', channel: 'Inbox',
    langs: '中文', bizLine: 'BingoPlus', status: 'active', creator: 'marvin@',
    createdAt: '2026-06-25 16:40', updatedAt: '2026-07-06 09:25', updatedBy: 'marvin@',
    content: { title: '系统升级维护通知', body: '系统将于 {{expire_time}} 进行升级维护，期间部分功能暂不可用，敬请谅解。', buttonText: '查看详情' },
    variables: [
      { name: 'expire_time', desc: '维护时间', example: '今晚 22:00-23:00', required: true },
    ],
    audit: { status: '已通过', reviewer: 'lily@', time: '2026-06-26 11:20', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-06-25 16:40', user: 'marvin@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-005', name: '客服满意度回访', code: 'TPL-IM-0007', type: 'OTP', channel: 'IM',
    langs: '中文', bizLine: 'BingoPlus', status: 'reviewing', creator: 'lily@',
    createdAt: '2026-07-01 10:15', updatedAt: '2026-07-11 14:05', updatedBy: 'lily@',
    content: { title: '服务评价邀请', body: '感谢您使用在线客服，邀请您对本次服务进行评价，您的反馈对我们很重要。', buttonText: '去评价' },
    variables: [],
    audit: { status: '审核中', reviewer: null, time: null, rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-07-01 10:15', user: 'lily@', summary: '初始创建并提交审核' },
    ],
  },
  {
    id: 'tpl-006', name: '竞猜 Bot 自动提醒', code: 'TPL-BOT-0015', type: '营销', channel: 'Bot',
    langs: '英文', bizLine: 'BingoPlus', status: 'active', creator: 'ken@',
    createdAt: '2026-07-02 11:20', updatedAt: '2026-07-09 16:40', updatedBy: 'ken@',
    content: { title: 'Quiz Starting Soon', body: 'The match you follow starts in 30 minutes. Submit your prediction now!', buttonText: 'Submit Prediction' },
    variables: [
      { name: 'event_name', desc: '赛事名称', example: 'Quarterfinals', required: true },
    ],
    audit: { status: '已通过', reviewer: 'marvin@', time: '2026-07-03 09:00', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-07-02 11:20', user: 'ken@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-007', name: '流失召回话术', code: 'TPL-SMS-0005', type: '营销', channel: 'SMS',
    langs: '中文', bizLine: 'BingoPlus', status: 'active', creator: 'marvin@',
    createdAt: '2026-05-28 09:30', updatedAt: '2026-07-05 10:35', updatedBy: 'lily@',
    content: { text: '您好 {{user_name}}，我们注意到您已有一段时间未登录。现为您专属保留了回归礼包，登录即可领取，期待您的回来！', hasShortLink: false, signature: 'BPLUS' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'Ana', required: true },
    ],
    audit: { status: '已通过', reviewer: 'ken@', time: '2026-05-30 14:00', rejectReason: null },
    versions: [
      { ver: 'v1.1', time: '2026-07-05 10:35', user: 'lily@', summary: '优化召回文案' },
      { ver: 'v1.0', time: '2026-05-28 09:30', user: 'marvin@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-008', name: 'VIP 生日祝福邮件', code: 'TPL-EMAIL-0018', type: '营销', channel: '邮件',
    langs: '英文', bizLine: 'BP-VIP', status: 'active', creator: 'lily@',
    createdAt: '2026-06-08 15:50', updatedAt: '2026-07-07 11:20', updatedBy: 'lily@',
    content: { subject: 'Happy Birthday, {{user_name}}!', subtitle: 'Your exclusive VIP gift awaits', body: 'Dear {{user_name}}, on your special day we have prepared an exclusive birthday gift worth {{bonus_amount}}. Log in now to claim it!', ctaText: 'Claim Gift', ctaLink: 'https://bingoplus.com/vip/birthday' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'Grace', required: true },
      { name: 'bonus_amount', desc: '礼包金额', example: '1,000', required: true },
    ],
    audit: { status: '已通过', reviewer: 'marvin@', time: '2026-06-10 10:00', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-06-08 15:50', user: 'lily@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-009', name: '新功能上线公告', code: 'TPL-PUSH-0009', type: 'OTP', channel: 'Push',
    langs: '中文', bizLine: 'BingoPlus', status: 'disabled', creator: 'ken@',
    createdAt: '2026-06-12 10:00', updatedAt: '2026-06-30 16:45', updatedBy: 'marvin@',
    content: { title: '全新功能上线', body: '「星灵标签」功能已上线，人群圈选更精准，快来体验！', link: 'bingoplus://features/tags', imageHint: '功能图标' },
    variables: [],
    audit: { status: '已通过', reviewer: 'lily@', time: '2026-06-13 09:30', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-06-12 10:00', user: 'ken@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-010', name: 'Viber 回馈礼包', code: 'TPL-VIBER-0002', type: '营销', channel: 'Viber',
    langs: '菲律宾语', bizLine: 'BingoPlus', status: 'reviewing', creator: 'marvin@',
    createdAt: '2026-07-05 14:00', updatedAt: '2026-07-10 10:12', updatedBy: 'marvin@',
    content: { title: 'Exclusive Gift', body: 'Mahal na {{user_name}}, ang iyong eksklusibong regalo ay handa na. I-click para kunin!', buttonText: 'Claim Now' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'Paolo', required: true },
    ],
    audit: { status: '审核中', reviewer: null, time: null, rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-07-05 14:00', user: 'marvin@', summary: '初始创建并提交审核' },
    ],
  },
  {
    id: 'tpl-011', name: 'Telegram 社群邀请', code: 'TPL-TG-0004', type: '营销', channel: 'Telegram',
    langs: '英文', bizLine: 'BingoPlus', status: 'active', creator: 'lily@',
    createdAt: '2026-07-06 09:20', updatedAt: '2026-07-11 16:25', updatedBy: 'lily@',
    content: { title: 'Join Our Community', body: 'Join the official BingoPlus community for daily free quiz tickets and exclusive bonuses!', buttonText: 'Join Group' },
    variables: [],
    audit: { status: '已通过', reviewer: 'ken@', time: '2026-07-07 10:00', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-07-06 09:20', user: 'lily@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-012', name: '电销 VIP 回访话术', code: 'TPL-TELE-0001', type: '营销', channel: '电销',
    langs: '中文', bizLine: 'BP-VIP', status: 'active', creator: 'ken@',
    createdAt: '2026-06-18 13:30', updatedAt: '2026-07-04 09:50', updatedBy: 'ken@',
    content: { title: 'VIP 回访', body: '您好 {{user_name}}，我是 BingoPlus VIP 专属客服。注意到您近期较少登录，为您准备了专属回归礼包，价值 {{bonus_amount}}，请问方便了解一下吗？', buttonText: '确认意向' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'VIP用户', required: true },
      { name: 'bonus_amount', desc: '礼包价值', example: '2,000', required: true },
    ],
    audit: { status: '已通过', reviewer: 'marvin@', time: '2026-06-20 11:00', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-06-18 13:30', user: 'ken@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-013', name: '邮箱验证激活', code: 'TPL-EMAIL-0022', type: 'OTP', channel: '邮件',
    langs: '英文', bizLine: 'BingoPlus', status: 'active', creator: 'marvin@',
    createdAt: '2026-07-02 16:10', updatedAt: '2026-07-12 23:50', updatedBy: 'marvin@',
    content: { subject: 'Verify Your Email', subtitle: 'One step away from full access', body: 'Hi {{user_name}}, please verify your email address to unlock all features. This link expires on {{expire_time}}.', ctaText: 'Verify Email', ctaLink: 'https://bingoplus.com/verify' },
    variables: [
      { name: 'user_name', desc: '用户昵称', example: 'User', required: true },
      { name: 'expire_time', desc: '链接过期时间', example: '2026-07-15', required: true },
    ],
    audit: { status: '已通过', reviewer: 'lily@', time: '2026-07-03 10:00', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-07-02 16:10', user: 'marvin@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-014', name: '首充引导话术', code: 'TPL-SMS-0033', type: '营销', channel: 'SMS',
    langs: '中文', bizLine: 'BingoPlus', status: 'draft', creator: 'lily@',
    createdAt: '2026-07-08 10:40', updatedAt: '2026-07-08 10:40', updatedBy: 'lily@',
    content: { text: '完成首充最高可得 100% 加赠，新手专享仅此一次！立即充值 {{bonus_amount}} 起。', hasShortLink: true, signature: 'BPLUS' },
    variables: [
      { name: 'bonus_amount', desc: '最低充值金额', example: '100', required: true },
    ],
    audit: { status: '未提交', reviewer: null, time: null, rejectReason: null },
    versions: [
      { ver: 'v0.1', time: '2026-07-08 10:40', user: 'lily@', summary: '草稿创建' },
    ],
  },
  {
    id: 'tpl-015', name: '周末大促 Push', code: 'TPL-PUSH-0044', type: '营销', channel: 'Push',
    langs: '英文', bizLine: 'ArenaPlus', status: 'rejected', creator: 'ken@',
    createdAt: '2026-07-09 11:00', updatedAt: '2026-07-10 09:15', updatedBy: 'marvin@',
    content: { title: 'Weekend Mega Sale', body: 'Deposit now and get up to 10% bonus! Limited time only.', link: 'arenplus://promo', imageHint: '促销 Banner' },
    variables: [],
    audit: { status: '已驳回', reviewer: 'marvin@', time: '2026-07-10 09:15', rejectReason: 'Push 标题超过 20 字符限制；正文缺少退订说明' },
    versions: [
      { ver: 'v1.0', time: '2026-07-09 11:00', user: 'ken@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-016', name: '验证码通知', code: 'TPL-SMS-0001', type: 'OTP', channel: 'SMS',
    langs: '中文', bizLine: 'BingoPlus', status: 'active', creator: 'marvin@',
    createdAt: '2026-05-10 09:00', updatedAt: '2026-06-30 14:30', updatedBy: 'marvin@',
    content: { text: 'Your verification code is {{verify_code}}. Valid for 5 minutes. Do not share with anyone.', hasShortLink: false, signature: 'BPLUS' },
    variables: [
      { name: 'verify_code', desc: '验证码', example: '839201', required: true },
    ],
    audit: { status: '已通过', reviewer: 'ken@', time: '2026-05-12 10:00', rejectReason: null },
    versions: [
      { ver: 'v2.0', time: '2026-06-30 14:30', user: 'marvin@', summary: '增加安全提示文案' },
      { ver: 'v1.0', time: '2026-05-10 09:00', user: 'marvin@', summary: '初始创建' },
    ],
  },
  {
    id: 'tpl-017', name: '站内信活动预告', code: 'TPL-INBOX-0011', type: '营销', channel: 'Inbox',
    langs: '中文', bizLine: 'BingoPlus', status: 'draft', creator: 'ken@',
    createdAt: '2026-07-11 15:00', updatedAt: '2026-07-11 15:00', updatedBy: 'ken@',
    content: { title: '七月大促即将开启', body: '七月大促活动将于 {{expire_time}} 正式开启，提前锁定您的优惠名额！', buttonText: '预约提醒' },
    variables: [
      { name: 'expire_time', desc: '活动开始时间', example: '7月15日 10:00', required: true },
    ],
    audit: { status: '未提交', reviewer: null, time: null, rejectReason: null },
    versions: [
      { ver: 'v0.1', time: '2026-07-11 15:00', user: 'ken@', summary: '草稿创建' },
    ],
  },
  {
    id: 'tpl-018', name: 'IM 充值成功通知', code: 'TPL-IM-0020', type: 'OTP', channel: 'IM',
    langs: '中文', bizLine: 'BingoPlus', status: 'disabled', creator: 'lily@',
    createdAt: '2026-06-22 10:30', updatedAt: '2026-07-01 14:22', updatedBy: 'marvin@',
    content: { title: '充值成功', body: '您已成功充值 {{bonus_amount}}，账户余额已更新。感谢您的支持！', buttonText: '查看余额' },
    variables: [
      { name: 'bonus_amount', desc: '充值金额', example: '500', required: true },
    ],
    audit: { status: '已通过', reviewer: 'ken@', time: '2026-06-23 09:00', rejectReason: null },
    versions: [
      { ver: 'v1.0', time: '2026-06-22 10:30', user: 'lily@', summary: '初始创建' },
    ],
  },
];

TEMPLATE_RECORDS.forEach(t => {
  if (t.status === 'reviewing' || t.status === 'rejected') t.status = 'draft';
});

/* ---------------- 状态 ---------------- */
const PAGE_SIZE = 8;
let currentPage = 1;
let activeCat = 'all';
let filtered = [...TEMPLATE_RECORDS];
let drawerMode = 'view'; // view | edit | create
let currentTplId = null;
let editDraft = null;
let lastFocusedInput = null;

/* ---------------- KPI ---------------- */
function renderKpis() {
  const total = TEMPLATE_RECORDS.length;
  const active = TEMPLATE_RECORDS.filter(t => t.status === 'active').length;
  const disabled = TEMPLATE_RECORDS.filter(t => t.status === 'disabled').length;
  document.getElementById('kpiGrid').innerHTML = [
    { title: '模板总数', value: total, cls: '' },
    { title: '生效中模板数', value: active, cls: 'kpi-green' },
    { title: '草稿模板数', value: TEMPLATE_RECORDS.filter(t => t.status === 'draft').length, cls: 'kpi-blue' },
    { title: '停用模板数', value: disabled, cls: '' },
  ].map(k => `
    <div class="kpi-card">
      <div class="kpi-title">${k.title}</div>
      <div class="kpi-body"><span class="kpi-value ${k.cls}">${k.value}</span></div>
    </div>`).join('');
}

/* ---------------- 筛选 ---------------- */
function applyFilters() {
  const name = document.getElementById('fName').value.trim().toLowerCase();
  const code = document.getElementById('fCode').value.trim().toLowerCase();
  const type = document.getElementById('fType').value;
  const channel = document.getElementById('fChannel').value;
  const status = document.getElementById('fStatus').value;
  const biz = document.getElementById('fBiz').value;
  const creator = document.getElementById('fCreator').value;

  filtered = TEMPLATE_RECORDS.filter(t => {
    if (activeCat !== 'all' && t.channel !== activeCat) return false;
    return (!name || t.name.toLowerCase().includes(name)) &&
      (!code || t.code.toLowerCase().includes(code)) &&
      (!type || t.type === type) &&
      (!channel || t.channel === channel) &&
      (!status || t.status === status) &&
      (!biz || t.bizLine === biz) &&
      (!creator || t.creator === creator);
  });
  currentPage = 1;
  renderTable();
}

function resetFilters() {
  activeCat = 'all';
  document.querySelectorAll('#catChips .chip').forEach(c => c.classList.toggle('selected', c.dataset.cat === 'all'));
  ['fName', 'fCode'].forEach(id => document.getElementById(id).value = '');
  ['fType', 'fChannel', 'fStatus', 'fBiz', 'fCreator'].forEach(id => document.getElementById(id).value = '');
  applyFilters();
}

/* ---------------- 表格与分页 ---------------- */
function renderTable() {
  closeAllMoreMenus();
  const tbody = document.getElementById('tplTableBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="cell-empty">暂无符合条件的模板</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(t => {
      const st = TPL_STATUS[t.status];
      const toggleItem = t.status === 'active'
        ? `<button class="more-item" data-act="disable" data-id="${t.id}">停用</button>`
        : t.status === 'disabled'
          ? `<button class="more-item" data-act="enable" data-id="${t.id}">启用</button>`
          : '';
      return `
        <tr>
          <td class="col-name"><span class="cell-ellipsis" title="${t.name}">${t.name}</span></td>
          <td class="col-name"><span class="cell-ellipsis" title="${t.code}">${t.code}</span></td>
          <td>${t.type}</td>
          <td>${t.bizLine}</td>
          <td><span class="tag tag-primary">${t.channel}</span></td>
          <td class="num"><button class="link-btn var-count-btn" data-vars="${t.id}">${t.variables.length}</button></td>
          <td><span class="tag ${st.cls}">${st.label}</span></td>
          <td class="cell-muted">${t.updatedAt}</td>
          <td>${t.updatedBy}</td>
          <td class="col-ops">
            <button class="link-btn" data-view="${t.id}">查看详情</button>
            <button class="link-btn" data-edit="${t.id}">编辑</button>
            <span class="more-wrap">
              <button class="link-btn" data-more="${t.id}">更多<i data-lucide="chevron-down"></i></button>
              <span class="more-menu" hidden>
                <button class="more-item" data-act="copy" data-id="${t.id}">复制</button>
                ${toggleItem}
                <button class="more-item" data-act="versions" data-id="${t.id}">查看版本</button>
                <button class="more-item more-danger" data-act="delete" data-id="${t.id}">删除</button>
              </span>
            </span>
          </td>
        </tr>`;
    }).join('');
  }
  bindRowActions();
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
    btn.addEventListener('click', () => { currentPage = Number(btn.dataset.page); renderTable(); });
  });
}

function bindRowActions() {
  const tbody = document.getElementById('tplTableBody');
  tbody.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => openTplDrawer('view', b.dataset.view)));
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openTplDrawer('edit', b.dataset.edit)));

  bindMoreMenus(tbody);

  tbody.querySelectorAll('.more-item').forEach(item => item.addEventListener('click', () => {
    const t = TEMPLATE_RECORDS.find(x => x.id === item.dataset.id);
    closeAllMoreMenus();
    if (item.dataset.act === 'copy') copyTemplate(t.id);
    if (item.dataset.act === 'disable') toggleStatus(t.id, 'disabled');
    if (item.dataset.act === 'enable') toggleStatus(t.id, 'active');
    if (item.dataset.act === 'versions') openTplDrawer('view', t.id, true);
    if (item.dataset.act === 'delete') deleteTemplate(t.id);
  }));

  tbody.querySelectorAll('[data-vars]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    showVarPopover(btn, TEMPLATE_RECORDS.find(x => x.id === btn.dataset.vars));
  }));
}

function copyTemplate(id) {
  const src = TEMPLATE_RECORDS.find(x => x.id === id);
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = 'tpl-' + Date.now();
  copy.name = src.name + '（副本）';
  copy.code = src.code + '-COPY';
  copy.status = 'draft';
  copy.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  copy.updatedBy = 'marvin@';
  TEMPLATE_RECORDS.unshift(copy);
  showToast(`已复制模板「${src.name}」为草稿`);
  renderKpis(); applyFilters();
}

function toggleStatus(id, status) {
  const t = TEMPLATE_RECORDS.find(x => x.id === id);
  t.status = status;
  showToast(`模板「${t.name}」已${status === 'active' ? '启用' : '停用'}`);
  renderKpis(); renderTable();
}

function deleteTemplate(id) {
  const t = TEMPLATE_RECORDS.find(x => x.id === id);
  TEMPLATE_RECORDS = TEMPLATE_RECORDS.filter(x => x.id !== id);
  showToast(`模板「${t.name}」已删除`);
  renderKpis(); applyFilters();
}

function showVarPopover(anchor, tpl) {
  document.querySelectorAll('.var-popover').forEach(p => p.remove());
  const pop = document.createElement('div');
  pop.className = 'var-popover';
  pop.innerHTML = tpl.variables.length
    ? tpl.variables.map(v => `<span class="var-tag">{{${v.name}}}</span>`).join('')
    : '<span class="cell-muted">无变量</span>';
  anchor.parentElement.style.position = 'relative';
  anchor.parentElement.appendChild(pop);
  const close = ev => { if (!pop.contains(ev.target) && ev.target !== anchor) { pop.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close));
}

/* ---------------- 变量替换（预览用） ---------------- */
function applyVars(text, variables) {
  if (!text) return '';
  let out = text;
  variables.forEach(v => { out = out.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), v.example); });
  return out;
}

/* ---------------- 预览渲染 ---------------- */
function renderPreview(tpl) {
  const host = document.getElementById('tplPreview');
  const c = tpl.content;
  const ch = tpl.channel;
  let inner = '';

  if (ch === 'SMS') {
    const text = applyVars(c.text || '', tpl.variables);
    inner = `
      <div class="pv-header"><div class="pv-avatar"><i data-lucide="message-square"></i></div>
        <div class="pv-sender">${c.signature || 'BPLUS'}</div></div>
      <div class="pv-bubble">${text || '请输入短信内容…'}</div>
      <div class="pv-time-hint">刚刚 · ${(c.text || '').length} 字</div>`;
  } else if (ch === '邮件') {
    inner = `
      <div class="pv-mail">
        <div class="pv-mail-row"><span>发件人</span>marketing@bingoplus.com</div>
        <div class="pv-mail-row"><span>主题</span>${applyVars(c.subject || '', tpl.variables) || '邮件标题'}</div>
        ${c.subtitle ? `<div class="pv-mail-row"><span>副标题</span>${applyVars(c.subtitle, tpl.variables)}</div>` : ''}
        <div class="pv-mail-body">${applyVars(c.body || '', tpl.variables) || '邮件正文…'}</div>
        ${c.ctaText ? `<div class="tpl-cta-preview">${c.ctaText}</div>` : ''}
      </div>`;
  } else if (ch === 'Push') {
    const now = new Date();
    inner = `
      <div class="pv-lock-time"><div class="t">${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}</div></div>
      <div class="pv-notify">
        <div class="pv-app-icon"><i data-lucide="bell"></i></div>
        <div>
          <div class="pv-n-title">${applyVars(c.title || '', tpl.variables) || 'Push 标题'}</div>
          <div class="pv-n-body">${applyVars(c.body || '', tpl.variables) || 'Push 正文…'}</div>
        </div>
      </div>`;
  } else {
    inner = `
      <div class="pv-msg-card">
        <div class="pv-msg-title">${applyVars(c.title || '', tpl.variables) || '消息标题'}</div>
        <div class="pv-msg-body">${applyVars(c.body || '', tpl.variables) || '消息正文…'}</div>
        ${c.buttonText ? `<button class="btn btn-primary btn-sm tpl-msg-btn">${c.buttonText}</button>` : ''}
      </div>`;
  }
  host.innerHTML = `<div class="pv-screen">${inner}</div>`;
  refreshIcons();
}

/* ---------------- 抽屉：内容表单（按通道） ---------------- */
function contentFieldsHtml(tpl, editable) {
  const c = tpl.content;
  const ch = tpl.channel;
  const dis = editable ? '' : 'disabled';

  if (ch === 'SMS') {
    return `
      <div class="field"><span class="field-label">文本内容</span>
        <textarea class="textarea tpl-field" data-key="text" data-char-max="160" rows="5" ${dis}>${c.text || ''}</textarea>
      </div>
      <div class="field"><label class="check-item"><input type="checkbox" class="tpl-field" data-key="hasShortLink" ${c.hasShortLink ? 'checked' : ''} ${dis}> 包含短链</label></div>
      <div class="field"><span class="field-label">签名配置</span>
        <input class="input tpl-field" data-key="signature" value="${c.signature || ''}" ${dis}></div>`;
  }
  if (ch === '邮件') {
    return `
      <div class="field"><span class="field-label">邮件标题</span><input class="input tpl-field" data-key="subject" value="${c.subject || ''}" ${dis}></div>
      <div class="field"><span class="field-label">邮件副标题（可选）</span><input class="input tpl-field" data-key="subtitle" value="${c.subtitle || ''}" ${dis}></div>
      <div class="field"><span class="field-label">正文</span><textarea class="textarea tpl-field" data-key="body" rows="6" ${dis}>${c.body || ''}</textarea></div>
      <div class="field"><span class="field-label">CTA 按钮文案</span><input class="input tpl-field" data-key="ctaText" value="${c.ctaText || ''}" ${dis}></div>
      <div class="field"><span class="field-label">落地页链接</span><input class="input tpl-field" data-key="ctaLink" value="${c.ctaLink || ''}" ${dis}></div>`;
  }
  if (ch === 'Push') {
    return `
      <div class="field"><span class="field-label">Push 标题</span><input class="input tpl-field" data-key="title" value="${c.title || ''}" ${dis} placeholder="建议不超过 20 字符"></div>
      <div class="field"><span class="field-label">Push 正文</span><textarea class="textarea tpl-field" data-key="body" rows="4" ${dis}>${c.body || ''}</textarea></div>
      <div class="field"><span class="field-label">跳转链接 / 页面</span><input class="input tpl-field" data-key="link" value="${c.link || ''}" ${dis}></div>
      <div class="field"><span class="field-label">图标 / 图片</span><div class="img-placeholder"><i data-lucide="image"></i>${c.imageHint || '点击上传图片（原型占位）'}</div></div>`;
  }
  return `
    <div class="field"><span class="field-label">标题</span><input class="input tpl-field" data-key="title" value="${c.title || ''}" ${dis}></div>
    <div class="field"><span class="field-label">消息正文</span><textarea class="textarea tpl-field" data-key="body" rows="5" ${dis}>${c.body || ''}</textarea></div>
    <div class="field"><span class="field-label">操作按钮文案</span><input class="input tpl-field" data-key="buttonText" value="${c.buttonText || ''}" ${dis}></div>`;
}

function variablesHtml(tpl, editable) {
  const rows = tpl.variables.map((v, i) => `
    <tr>
      <td><code>{{${v.name}}}</code></td>
      <td>${editable ? `<input class="input input-sm var-field" data-idx="${i}" data-f="desc" value="${v.desc}">` : v.desc}</td>
      <td>${editable ? `<input class="input input-sm var-field" data-idx="${i}" data-f="example" value="${v.example}">` : v.example}</td>
      <td>${editable ? `<input type="checkbox" class="var-field" data-idx="${i}" data-f="required" ${v.required ? 'checked' : ''}>` : (v.required ? '是' : '否')}</td>
      <td>${editable ? `<button class="link-btn var-del" data-idx="${i}">删除</button>` : `<button class="link-btn var-insert" data-var="${v.name}">插入</button>`}</td>
    </tr>`).join('');

  return `
    <table class="table var-table">
      <thead><tr><th>变量名</th><th>含义</th><th>示例值</th><th>必填</th><th>操作</th></tr></thead>
      <tbody id="varTableBody">${rows || '<tr><td colspan="5" class="cell-empty">暂无变量</td></tr>'}</tbody>
    </table>
    ${editable ? '<button class="btn btn-outline btn-sm" id="addVarBtn"><i data-lucide="plus"></i>新增变量</button>' : ''}
    ${editable ? '<div class="var-insert-hint">点击变量标签可插入到当前聚焦的内容输入框：</div><div class="var-insert-tags" id="varInsertTags">' +
      tpl.variables.map(v => `<button class="var-tag-btn" data-var="${v.name}">{{${v.name}}}</button>`).join('') + '</div>' : ''}`;
}

function collapseHtml(title, body, open) {
  return `
    <section class="collapse-section${open ? ' open' : ''}">
      <button class="collapse-head" type="button">
        <span>${title}</span><i data-lucide="chevron-down" class="collapse-chev"></i>
      </button>
      <div class="collapse-body">${body}</div>
    </section>`;
}

function renderDrawerBody(tpl, mode, scrollToVersions) {
  const editable = mode === 'edit' || mode === 'create';
  const st = TPL_STATUS[tpl.status] || TPL_STATUS.draft;

  let basicHtml;
  if (editable) {
    basicHtml = `
      <div class="field"><span class="field-label">模板名称</span><input class="input" id="fTplName" value="${tpl.name}"></div>
      <div class="field"><span class="field-label">模板编码</span><input class="input" id="fTplCode" value="${tpl.code}" placeholder="如 TPL-SMS-0001"></div>
      <div class="field-row-2">
        <div class="field"><span class="field-label">模板类型</span>
          <select class="select" id="fTplType">
            ${TEMPLATE_TYPES.map(t =>
              `<option${t === tpl.type ? ' selected' : ''}>${t}</option>`).join('')}
          </select></div>
        <div class="field"><span class="field-label">通道类型</span>
          <select class="select" id="fTplChannel" ${mode === 'edit' ? 'disabled' : ''}>
            ${CHANNELS.map(c => `<option${c === tpl.channel ? ' selected' : ''}>${c}</option>`).join('')}
          </select></div>
      </div>
      <div class="field-row-2">
        <div class="field"><span class="field-label">产品线</span>
          <select class="select" id="fTplBiz">
            ${['BingoPlus','ArenaPlus','BP-VIP'].map(b =>
              `<option${b === tpl.bizLine ? ' selected' : ''}>${b}</option>`).join('')}
          </select></div>
      </div>`;
  } else {
    basicHtml = `
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">模板名称</span><span>${tpl.name}</span></div>
        <div class="desc-item"><span class="desc-label">模板编码</span><span>${tpl.code}</span></div>
        <div class="desc-item"><span class="desc-label">模板类型</span><span>${tpl.type}</span></div>
        <div class="desc-item"><span class="desc-label">通道类型</span><span><span class="tag tag-primary">${tpl.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">产品线</span><span>${tpl.bizLine}</span></div>
        <div class="desc-item"><span class="desc-label">当前状态</span><span class="tag ${st.cls}">${st.label}</span></div>
        <div class="desc-item"><span class="desc-label">创建人 / 更新时间</span><span>${tpl.creator} · ${tpl.updatedAt}</span></div>
      </div>`;
  }

  const versionBody = `<ul class="version-list">${tpl.versions.map(v =>
    `<li><span class="ver-no">${v.ver}</span><span class="ver-summary">${v.summary}</span><span class="ver-meta">${v.user} · ${v.time}</span></li>`
  ).join('')}</ul>`;

  document.getElementById('tplDrawerForm').innerHTML = `
    <section class="card detail-group" id="sectionBasic">
      <h4 class="card-title">基础信息</h4>${basicHtml}
    </section>
    <section class="card detail-group" id="sectionContent">
      <h4 class="card-title">模板内容</h4>${contentFieldsHtml(tpl, editable)}
    </section>
    <section class="card detail-group" id="sectionVars">
      <h4 class="card-title">变量配置</h4>${variablesHtml(tpl, editable)}
    </section>
    <section class="card detail-group" id="sectionVersions">
      <h4 class="card-title">版本记录</h4>${versionBody}
    </section>
  `;

  bindDrawerFormEvents(tpl, editable);
  enhanceSelects(document.getElementById('tplDrawerForm'));
  renderPreview(tpl);
  if (scrollToVersions) {
    setTimeout(() => document.getElementById('sectionVersions')?.scrollIntoView({ behavior: 'smooth' }), 300);
  }
  refreshIcons();
}

function bindDrawerFormEvents(tpl, editable) {
  const form = document.getElementById('tplDrawerForm');

  form.querySelectorAll('.collapse-head').forEach(head => {
    head.addEventListener('click', () => head.closest('.collapse-section')?.classList.toggle('open'));
  });

  if (!editable) {
    form.querySelectorAll('.var-insert').forEach(btn => btn.addEventListener('click', () => showToast(`变量 {{${btn.dataset.var}}} 可在编辑模式插入`)));
    initCharCounters(form);
    return;
  }

  const syncContent = () => {
    form.querySelectorAll('.tpl-field').forEach(el => {
      const key = el.dataset.key;
      if (el.type === 'checkbox') tpl.content[key] = el.checked;
      else tpl.content[key] = el.value;
    });
    renderPreview(tpl);
  };

  form.querySelectorAll('.tpl-field').forEach(el => {
    el.addEventListener('focus', () => { lastFocusedInput = el; });
    el.addEventListener('input', syncContent);
    el.addEventListener('change', syncContent);
  });

  if (drawerMode === 'create') {
    form.querySelector('#fTplChannel')?.addEventListener('change', e => {
      tpl.channel = e.target.value;
      tpl.content = defaultContent(tpl.channel);
      document.getElementById('sectionContent').innerHTML = `<h4 class="card-title">模板内容</h4>${contentFieldsHtml(tpl, true)}`;
      bindDrawerFormEvents(tpl, true);
    });
  }

  form.querySelector('#addVarBtn')?.addEventListener('click', () => {
    const name = 'var_' + (tpl.variables.length + 1);
    tpl.variables.push({ name, desc: '新变量', example: '示例值', required: false });
    document.getElementById('sectionVars').innerHTML = `<h4 class="card-title">变量配置</h4>${variablesHtml(tpl, true)}`;
    bindDrawerFormEvents(tpl, true);
  });

  form.querySelectorAll('.var-del').forEach(btn => btn.addEventListener('click', () => {
    tpl.variables.splice(Number(btn.dataset.idx), 1);
    document.getElementById('sectionVars').innerHTML = `<h4 class="card-title">变量配置</h4>${variablesHtml(tpl, true)}`;
    bindDrawerFormEvents(tpl, true);
  }));

  form.querySelectorAll('.var-field').forEach(el => {
    el.addEventListener('change', () => {
      const v = tpl.variables[Number(el.dataset.idx)];
      if (el.dataset.f === 'required') v.required = el.checked;
      else v[el.dataset.f] = el.value;
    });
  });

  form.querySelectorAll('.var-tag-btn').forEach(btn => btn.addEventListener('click', () => insertVariable(btn.dataset.var)));

  function insertVariable(varName) {
    const token = `{{${varName}}}`;
    if (lastFocusedInput) {
      const el = lastFocusedInput;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, start) + token + el.value.slice(end);
      el.dispatchEvent(new Event('input'));
      el.focus();
    } else {
      showToast(`已复制 ${token}，请先聚焦内容输入框`);
    }
  }

  initCharCounters(form);
}

function defaultContent(channel) {
  if (channel === 'SMS') return { text: '', hasShortLink: false, signature: 'BPLUS' };
  if (channel === '邮件') return { subject: '', subtitle: '', body: '', ctaText: '', ctaLink: '' };
  if (channel === 'Push') return { title: '', body: '', link: '', imageHint: '' };
  return { title: '', body: '', buttonText: '' };
}

function newTemplateDraft() {
  return {
    id: null, name: '', code: '', type: '营销', channel: 'SMS', langs: '中文',
    bizLine: 'BingoPlus', status: 'draft', creator: 'marvin@',
    createdAt: '', updatedAt: '', updatedBy: 'marvin@',
    content: defaultContent('SMS'), variables: [],
    audit: { status: '未提交', reviewer: null, time: null, rejectReason: null },
    versions: [],
  };
}

function renderDrawerFooter(mode) {
  const footer = document.getElementById('tplDrawerFooter');
  if (mode === 'view') {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>关闭</button>
      <button class="btn btn-primary" id="footerEditBtn">编辑</button>`;
    footer.querySelector('#footerEditBtn').addEventListener('click', () => openTplDrawer('edit', currentTplId));
  } else {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>取消</button>
      <button class="btn btn-outline" id="footerDraftBtn">保存草稿</button>
      <button class="btn btn-primary" id="footerSaveBtn">提交</button>`;
    footer.querySelector('#footerDraftBtn').addEventListener('click', () => saveTemplate(false));
    footer.querySelector('#footerSaveBtn').addEventListener('click', () => saveTemplate(true));
  }
  footer.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => closeDrawer('tplDrawer')));
}

function saveTemplate(submitReview) {
  const tpl = editDraft;
  const form = document.getElementById('tplDrawerForm');
  tpl.name = form.querySelector('#fTplName')?.value.trim() || tpl.name;
  tpl.code = form.querySelector('#fTplCode')?.value.trim() || tpl.code;
  tpl.type = form.querySelector('#fTplType')?.value || tpl.type;
  tpl.bizLine = form.querySelector('#fTplBiz')?.value || tpl.bizLine;
  if (!tpl.name) { showToast('请输入模板名称'); return; }
  if (!tpl.code) { showToast('请输入模板编码'); return; }

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  tpl.updatedAt = now;
  tpl.updatedBy = 'marvin@';

  if (submitReview) {
    tpl.status = 'active';
    showToast(`模板「${tpl.name}」已提交`);
  } else {
    tpl.status = 'draft';
    showToast(`模板「${tpl.name}」已保存为草稿`);
  }

  if (drawerMode === 'create') {
    tpl.id = 'tpl-' + Date.now();
    tpl.createdAt = now;
    tpl.versions.push({ ver: 'v0.1', time: now, user: 'marvin@', summary: submitReview ? '创建并提交' : '草稿创建' });
    TEMPLATE_RECORDS.unshift(tpl);
  } else {
    const idx = TEMPLATE_RECORDS.findIndex(x => x.id === tpl.id);
    if (idx >= 0) TEMPLATE_RECORDS[idx] = tpl;
    tpl.versions.unshift({ ver: 'v' + (tpl.versions.length + 1) + '.0', time: now, user: 'marvin@', summary: submitReview ? '提交' : '保存草稿' });
  }

  closeDrawer('tplDrawer');
  renderKpis();
  applyFilters();
}

function openTplDrawer(mode, id, scrollToVersions) {
  drawerMode = mode;
  currentTplId = id;
  const titles = { view: '模板详情', edit: '编辑模板', create: '新建模板' };
  document.getElementById('tplDrawerTitle').textContent = titles[mode];

  if (mode === 'create') {
    editDraft = newTemplateDraft();
  } else {
    editDraft = JSON.parse(JSON.stringify(TEMPLATE_RECORDS.find(x => x.id === id)));
  }

  renderDrawerBody(editDraft, mode, scrollToVersions);
  renderDrawerFooter(mode);
  openDrawer('tplDrawer');
}

/* ---------------- 初始化 ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-template');
  renderTopbar('reach');
  bindDrawerClose();

  document.querySelectorAll('#catChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#catChips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      activeCat = chip.dataset.cat;
      applyFilters();
    });
  });

  document.querySelectorAll('#timeRange .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeRange .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('customDates').hidden = btn.dataset.range !== 'custom';
    });
  });

  document.getElementById('queryBtn').addEventListener('click', applyFilters);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  ['fName', 'fCode'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); }));
  document.getElementById('newTplBtn').addEventListener('click', () => openTplDrawer('create'));

  document.addEventListener('click', () => closeAllMoreMenus());
  document.querySelectorAll('.table-scroll').forEach(el => {
    el.addEventListener('scroll', closeAllMoreMenus, { passive: true });
  });

  renderKpis();
  applyFilters();
  refreshIcons();
});

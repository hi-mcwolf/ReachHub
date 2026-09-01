/* 模板管理页：列表 + 筛选 + 详情/编辑/新建抽屉 */

/* 命名为 TPL_CHANNELS，避免与 reach.js 的 CHANNELS 冲突（本页同时加载两者） */
const TPL_CHANNELS = ['SMS', '邮件', 'Push', 'Viber', 'Messenger', 'WhatsApp', '站内信'];

function tplContentText(t) {
  const c = t.content || {};
  if (typeof contentSummary === 'function') {
    const s = contentSummary(c, 80);
    if (s && s !== '-') return s;
  }
  return c.text || c.body || c.subject || c.title || '';
}

function fmtTpl(v) {
  return (v === null || v === undefined || v === '') ? '-' : v;
}

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
    id: 'tpl-004', name: '系统维护通知', code: 'TPL-INBOX-0003', type: 'OTP', channel: '站内信',
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
    id: 'tpl-005', name: '客服满意度回访', code: 'TPL-INBOX-0007', type: 'OTP', channel: '站内信',
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
    id: 'tpl-006', name: 'WhatsApp 竞猜提醒', code: 'TPL-WHATSAPP-0001', type: '营销', channel: 'WhatsApp',
    langs: '英文', bizLine: 'BingoPlus', status: 'active', creator: 'ken@',
    createdAt: '2026-07-02 11:20', updatedAt: '2026-07-09 16:40', updatedBy: 'ken@',
    content: { account: 'BingoPlus 官方 WhatsApp', type: 'Text', body: 'The match you follow starts in 30 minutes. Submit your prediction now!' },
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
    id: 'tpl-011', name: 'Messenger 社群邀请', code: 'TPL-MSG-0004', type: '营销', channel: 'Messenger',
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
    id: 'tpl-012', name: '电销 VIP 回访话术', code: 'TPL-SMS-0006', type: '营销', channel: 'SMS',
    langs: '中文', bizLine: 'BP-VIP', status: 'active', creator: 'ken@',
    createdAt: '2026-06-18 13:30', updatedAt: '2026-07-04 09:50', updatedBy: 'ken@',
    content: { text: '您好 {{user_name}}，我是 BingoPlus VIP 专属客服。注意到您近期较少登录，为您准备了专属回归礼包，价值 {{bonus_amount}}，请问方便了解一下吗？' },
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
    id: 'tpl-017', name: '站内信活动预告', code: 'TPL-INBOX-0011', type: '营销', channel: '站内信',
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
    id: 'tpl-018', name: 'IM 充值成功通知', code: 'TPL-INBOX-0020', type: 'OTP', channel: '站内信',
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

/* ---------------- 状态 ---------------- */
const PAGE_SIZE = 8;
let currentPage = 1;
let filtered = [...TEMPLATE_RECORDS];
let drawerMode = 'view'; // view | edit | create
let currentTplId = null;
let editDraft = null;
let tplContentEditor = null;

/* ---------------- 筛选 ---------------- */
function applyFilters() {
  const name = document.getElementById('fName').value.trim().toLowerCase();
  const code = document.getElementById('fCode').value.trim().toLowerCase();
  const channel = document.getElementById('fChannel').value;
  const biz = document.getElementById('fBiz').value;
  const creator = document.getElementById('fCreator').value;
  const content = document.getElementById('fContent').value.trim().toLowerCase();

  filtered = TEMPLATE_RECORDS.filter(t =>
    (!name || t.name.toLowerCase().includes(name)) &&
    (!code || t.code.toLowerCase().includes(code)) &&
    (!channel || t.channel === channel) &&
    (!biz || t.bizLine === biz) &&
    (!creator || t.creator === creator) &&
    (!content || tplContentText(t).toLowerCase().includes(content))
  );
  currentPage = 1;
  renderTable();
}

function resetFilters() {
  ['fName', 'fCode', 'fContent'].forEach(id => document.getElementById(id).value = '');
  ['fChannel', 'fBiz', 'fCreator'].forEach(id => document.getElementById(id).value = '');
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
      const contentText = tplContentText(t);
      return `
        <tr>
          <td class="cell-muted">${t.code}</td>
          <td class="col-name"><span class="cell-ellipsis" title="${t.name}">${t.name}</span></td>
          <td>${t.bizLine}</td>
          <td><span class="tag tag-primary">${t.channel}</span></td>
          <td class="col-name"><span class="cell-ellipsis" title="${contentText}">${contentText || '-'}</span></td>
          <td>${t.creator}</td>
          <td class="cell-muted">${t.createdAt}</td>
          <td>${t.updatedBy}</td>
          <td class="cell-muted">${t.updatedAt}</td>
          <td class="col-ops">
            <button class="link-btn" data-view="${t.id}">查看详情</button>
            <button class="link-btn" data-edit="${t.id}">编辑</button>
            <button class="link-btn" data-newtask="${t.id}">新建任务</button>
            <span class="more-wrap">
              <button class="link-btn" data-more="${t.id}">更多<i data-lucide="chevron-down"></i></button>
              <span class="more-menu" hidden>
                <button class="more-item" data-act="copy" data-id="${t.id}">复制</button>
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
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      renderTable();
    });
  });
}

function bindRowActions() {
  const tbody = document.getElementById('tplTableBody');
  tbody.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => openTplDrawer('view', b.dataset.view)));
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openTplDrawer('edit', b.dataset.edit)));
  tbody.querySelectorAll('[data-newtask]').forEach(b => b.addEventListener('click', () => {
    const t = TEMPLATE_RECORDS.find(x => x.id === b.dataset.newtask);
    if (t && typeof openTaskCreateWithContent === 'function') {
      openTaskCreateWithContent(t.channel, t.content);
    }
  }));

  bindMoreMenus(tbody);

  tbody.querySelectorAll('.more-item').forEach(item => item.addEventListener('click', () => {
    const t = TEMPLATE_RECORDS.find(x => x.id === item.dataset.id);
    closeAllMoreMenus();
    if (item.dataset.act === 'copy') copyTemplate(t.id);
    if (item.dataset.act === 'delete') deleteTemplate(t.id);
  }));
}

function copyTemplate(id) {
  const src = TEMPLATE_RECORDS.find(x => x.id === id);
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = 'tpl-' + Date.now();
  copy.name = src.name + '（副本）';
  copy.code = nextTplCode(src.channel);
  copy.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  copy.updatedBy = 'marvin@';
  TEMPLATE_RECORDS.unshift(copy);
  showToast(`已复制模板「${src.name}」`);
  applyFilters();
}

function deleteTemplate(id) {
  const t = TEMPLATE_RECORDS.find(x => x.id === id);
  TEMPLATE_RECORDS = TEMPLATE_RECORDS.filter(x => x.id !== id);
  showToast(`模板「${t.name}」已删除`);
  applyFilters();
}

function previewPlain(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content.text) return content.text;
  if (content.body) {
    const tmp = document.createElement('div');
    tmp.innerHTML = content.body;
    return tmp.textContent || '';
  }
  if (content.biz?.body) return content.biz.body;
  if (content.bot?.singleCustomBody) return content.bot.singleCustomBody;
  return content.title || content.subject || '';
}

function renderTplPreview(tpl) {
  const host = document.getElementById('tplPreview');
  if (!host) return;
  const c = tpl.content || {};
  const ch = normalizeChannel(tpl.channel);
  const text = previewPlain(c) || '您配置的内容将实时显示在这里…';
  const emptyCls = text && text !== '您配置的内容将实时显示在这里…' ? '' : ' empty';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const emailSubject = c.subject || tpl.name || '触达通知';
  const emailSender = c.sender || 'marketing@bingoplus.com';
  const pushTitle = c.title || 'BingoPlus';

  let inner = '';
  if (ch === 'sms') {
    inner = `
      <div class="pv-header"><div class="pv-avatar"><i data-lucide="message-square"></i></div>
        <div class="pv-sender">106 9013 3***</div></div>
      <div class="pv-bubble${emptyCls}">${text}</div>
      <div class="pv-time-hint">刚刚</div>`;
  } else if (ch === 'email') {
    inner = `
      <div class="pv-mail">
        <div class="pv-mail-row"><span>发件人</span>${emailSender}</div>
        <div class="pv-mail-row"><span>主题</span>${emailSubject}</div>
        <div class="pv-mail-body${emptyCls}">${text}</div>
      </div>`;
  } else if (ch === 'push') {
    inner = `
      <div class="pv-lock-time"><div class="t">${timeStr}</div></div>
      <div class="pv-notify">
        <div class="pv-app-icon"><i data-lucide="bell"></i></div>
        <div>
          <div class="pv-n-title">${pushTitle}</div>
          <div class="pv-n-body${emptyCls}">${text}</div>
        </div>
      </div>`;
  } else {
    inner = `
      <div class="pv-header">
        <div class="pv-avatar"><i data-lucide="message-circle"></i></div>
        <div class="pv-sender">${tpl.channel}</div>
      </div>
      <div class="pv-bubble${emptyCls}">${text}</div>
      <div class="pv-time-hint">${timeStr}</div>`;
  }
  host.innerHTML = `<div class="pv-screen">${inner}</div>`;
  refreshIcons();
}

const CHANNEL_CODE = {
  SMS: 'SMS', 邮件: 'EMAIL', Push: 'PUSH', Viber: 'VIBER',
  Messenger: 'MESSENGER', WhatsApp: 'WHATSAPP', 站内信: 'INBOX',
};

function nextTplCode(channel) {
  const key = CHANNEL_CODE[channel] || String(channel || 'SMS').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SMS';
  const prefix = `TPL-${key}-`;
  let max = 0;
  TEMPLATE_RECORDS.forEach(t => {
    if (!t.code?.startsWith(prefix)) return;
    const n = Number(t.code.slice(prefix.length));
    if (!Number.isNaN(n)) max = Math.max(max, n);
  });
  return prefix + String(max + 1).padStart(4, '0');
}

function mountTplContentEditor(tpl, editable) {
  tplContentEditor?.destroy();
  tplContentEditor = null;
  const host = document.getElementById('tplContentEditor');
  if (!host) return;
  const value = typeof ensureContentValue === 'function'
    ? ensureContentValue(tpl.channel, tpl.content)
    : (tpl.content || defaultContentValue(tpl.channel));
  tpl.content = value;
  host.classList.toggle('is-readonly', !editable);
  tplContentEditor = createContentEditor({
    container: host,
    channel: tpl.channel,
    value,
    showTemplateTools: false,
    showSmsConfigMode: false,
    onChange: () => {
      tpl.content = tplContentEditor.getValue();
      renderTplPreview(tpl);
    },
  });
  if (!editable) {
    host.classList.add('is-readonly');
    const lock = () => {
      host.querySelectorAll('input, textarea, select, button').forEach(el => { el.disabled = true; });
      host.querySelectorAll('.ql-editor').forEach(el => el.setAttribute('contenteditable', 'false'));
    };
    lock();
    setTimeout(lock, 400);
  }
}

function renderDrawerBody(tpl, mode) {
  const editable = mode === 'edit' || mode === 'create';
  const channelDisabled = mode === 'edit';

  let basicHtml;
  if (editable) {
    basicHtml = `
      <div class="field"><span class="field-label">模板名称</span><input class="input" id="fTplName" value="${tpl.name}"></div>
      <div class="field"><span class="field-label">产品线</span>
        <select class="select" id="fTplBiz">
          ${['BingoPlus','ArenaPlus','BP-VIP'].map(b =>
            `<option${b === tpl.bizLine ? ' selected' : ''}>${b}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <span class="field-label">通道</span>
        <div class="radio-group" id="fTplChannel">
          ${TPL_CHANNELS.map(c => `
            <label><input type="radio" name="tplChannel" value="${c}" ${c === tpl.channel ? 'checked' : ''} ${channelDisabled ? 'disabled' : ''}>${c}</label>
          `).join('')}
        </div>
      </div>`;
  } else {
    basicHtml = `
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">模板名称</span><span>${tpl.name}</span></div>
        <div class="desc-item"><span class="desc-label">模板ID</span><span>${tpl.code}</span></div>
        <div class="desc-item"><span class="desc-label">通道</span><span><span class="tag tag-primary">${tpl.channel}</span></span></div>
        <div class="desc-item"><span class="desc-label">产品线</span><span>${tpl.bizLine}</span></div>
        <div class="desc-item"><span class="desc-label">创建人 / 更新时间</span><span>${tpl.creator} · ${tpl.updatedAt}</span></div>
      </div>`;
  }

  document.getElementById('tplDrawerForm').innerHTML = `
    <section class="card detail-group" id="sectionBasic">
      <h4 class="card-title">基础信息</h4>${basicHtml}
    </section>
    <section class="card detail-group" id="sectionContent">
      <h4 class="card-title">模板内容</h4>
      <div id="tplContentEditor"></div>
    </section>
  `;

  if (editable && mode === 'create') {
    document.querySelectorAll('input[name="tplChannel"]').forEach(r => {
      r.addEventListener('change', () => {
        tpl.channel = r.value;
        tpl.content = defaultContentValue(tpl.channel);
        mountTplContentEditor(tpl, true);
        renderTplPreview(tpl);
      });
    });
  }

  enhanceSelects(document.getElementById('tplDrawerForm'));
  mountTplContentEditor(tpl, editable);
  renderTplPreview(tpl);
  refreshIcons();
}

function newTemplateDraft() {
  return {
    id: null, name: '', code: '', channel: 'SMS', langs: '中文',
    bizLine: 'BingoPlus', creator: 'marvin@',
    createdAt: '', updatedAt: '', updatedBy: 'marvin@',
    content: defaultContentValue('SMS'),
  };
}

function renderDrawerFooter(mode) {
  const footer = document.getElementById('tplDrawerFooter');
  if (mode === 'view') {
    footer.innerHTML = `<button class="btn btn-outline" data-close>关闭</button>`;
  } else {
    footer.innerHTML = `
      <button class="btn btn-outline" data-close>取消</button>
      <button class="btn btn-primary" id="footerSaveBtn">提交</button>`;
    footer.querySelector('#footerSaveBtn').addEventListener('click', saveTemplate);
  }
  footer.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => closeDrawer('tplDrawer')));
}

function saveTemplate() {
  const tpl = editDraft;
  const form = document.getElementById('tplDrawerForm');
  tpl.name = form.querySelector('#fTplName')?.value.trim() || tpl.name;
  tpl.bizLine = form.querySelector('#fTplBiz')?.value || tpl.bizLine;
  if (drawerMode === 'create') {
    const ch = form.querySelector('input[name="tplChannel"]:checked')?.value;
    if (ch) tpl.channel = ch;
  }
  if (tplContentEditor) tpl.content = tplContentEditor.getValue();
  if (!tpl.name) { showToast('请输入模板名称'); return; }
  if (!tpl.code) tpl.code = nextTplCode(tpl.channel);

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  tpl.updatedAt = now;
  tpl.updatedBy = 'marvin@';

  if (drawerMode === 'create') {
    tpl.id = 'tpl-' + Date.now();
    tpl.createdAt = now;
    tpl.creator = 'marvin@';
    TEMPLATE_RECORDS.unshift(tpl);
    showToast(`模板「${tpl.name}」已创建`);
  } else {
    const idx = TEMPLATE_RECORDS.findIndex(x => x.id === tpl.id);
    if (idx >= 0) TEMPLATE_RECORDS[idx] = tpl;
    showToast(`模板「${tpl.name}」已保存`);
  }

  closeDrawer('tplDrawer');
  applyFilters();
}

function openTplDrawer(mode, id) {
  drawerMode = mode;
  currentTplId = id;
  const titles = { view: '模板详情', edit: '编辑模板', create: '新建模板' };
  document.getElementById('tplDrawerTitle').textContent = titles[mode];

  if (mode === 'create') {
    editDraft = newTemplateDraft();
  } else {
    editDraft = JSON.parse(JSON.stringify(TEMPLATE_RECORDS.find(x => x.id === id)));
  }

  renderDrawerBody(editDraft, mode);
  renderDrawerFooter(mode);
  openDrawer('tplDrawer');
}

/* ---------------- 初始化 ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-template');
  renderTopbar('reach');
  bindDrawerClose();

  document.getElementById('queryBtn').addEventListener('click', applyFilters);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  ['fName', 'fCode', 'fContent'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); }));
  document.getElementById('newTplBtn').addEventListener('click', () => openTplDrawer('create'));

  document.addEventListener('click', () => closeAllMoreMenus());
  document.querySelectorAll('.table-scroll').forEach(el => {
    el.addEventListener('scroll', closeAllMoreMenus, { passive: true });
  });

  applyFilters();
  refreshIcons();
});

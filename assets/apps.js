/* 系统管理 › 接入方管理（PRD 6.7）
 * #list 接入方列表 + 新建 / 编辑 / 重置密钥 / 停用（6.7.2）
 * #api  能力说明 + 调试台（6.7.3–6.7.6、6.7.8 P1）
 * #audit 调用审计与配额（6.7.7）
 * 全部为演示数据 */

/* ================= 页面数据 ================= */
const AP_USERS = ['ken@', 'jay@', 'mia@', 'leo@', 'lily@', 'ann@', 'marvin@'];
const AP_EXTRA = {
  xl_01:  { siteAll: ['BP'], siteList: [], defaultSite: 'bp-growth', approvers: [], events: ['task', 'msgFinal'], sandbox: false, remark: '星灵活动页通过 H5 SDK 配置触达；批量 API 发送开赛提醒' },
  uc_01:  { siteAll: [], siteList: ['bp-growth', 'gamezone', 'arenaplus'], defaultSite: 'bp-growth', approvers: [], events: ['task', 'msgFinal'], sandbox: false, remark: '注册欢迎 / 安全通知 / OTP' },
  rc_01:  { siteAll: [], siteList: ['bp-growth'], defaultSite: '', approvers: ['mia@', 'lily@'], events: ['task'], sandbox: false, remark: '' },
  mms_01: { siteAll: [], siteList: ['gamezone'], defaultSite: '', approvers: ['leo@'], events: ['task'], sandbox: true, remark: '对接中，暂停' },
};
const AP_APPS = V2_APPS.map(a => Object.assign({}, a, AP_EXTRA[a.appId] || { siteAll: [], siteList: [], defaultSite: '', approvers: [], events: ['task'], sandbox: false, remark: '' }));

const AP_TPLS = [
  { code: 'TPL-SMS-0012', site: 'bp-growth', channel: 'SMS', content: 'Only the best teams remain! Join the World Cup prediction on BingoPlus and win daily prizes. Reply STOP to opt out.' },
  { code: 'TPL-SMS-0020', site: 'bp-growth', channel: 'SMS', content: 'Hi {nickname}, your weekend top-up reward is ready. Log in to BingoPlus to check it.' },
  { code: 'TPL-SMS-0031', site: 'bp-poc', channel: 'SMS', content: 'ArenaPlus: the match starts at 20:00. Tap to watch live.' },
  { code: 'TPL-MAIL-0007', site: 'bp-growth', channel: '邮件', content: 'This week on BingoPlus: World Cup predictions are open. See the featured match lineup inside.' },
  { code: 'TPL-PUSH-0003', site: 'bp-growth', channel: 'Push', content: 'World Cup predictions are open. Tap to join.' },
];
const AP_CROWDS = [
  { id: 'CP-20261101-07', name: '世界杯活跃用户', n: 12800 },
  { id: 'CP-20261103-02', name: '近 30 天充值用户', n: 48000 },
  { id: 'CP-20261105-11', name: '全量注册用户', n: 230000 },
];
const AP_SENSITIVE = ['赌场代理', 'guaranteed win'];
const AP_MAIL_HIGH = ['casino', 'bet', 'bonus', 'free money', 'free', 'win big', 'win', 'jackpot', 'no deposit', 'claim now', '$$$'];
const AP_MAIL_MID = ['offer', 'exclusive', 'limited', 'urgent', 'act now'];

/* 幂等记录：AppId|Out Id → 首次结果（24 小时内） */
const AP_OUTIDS = {
  'xl_01|order-20261111-001': { kind: 'accepted', taskId: 'T20260713005', approval: 'approved', approverTxt: 'lily@ · 2026-11-11 09:40', at: '2026-11-11 09:58:12', estStart: '17:42', estFinish: '18:02 ±5 分', hints: [] },
};
let apSeq = 100;

/* 调用审计（6.7.7） */
const AP_AUDIT = [
  { time: '2026-11-11 10:00:01', app: '星灵', type: '发送', result: '受理', reason: '', task: 'T20260713005', outId: 'order-20261111-001', site: 'bp-growth', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:02:37', app: '星灵', type: '发送', result: '拒绝', reason: 'SITE_OFFLINE 产品线已下线（arena-old）', task: '', outId: 'order-20261111-014', site: 'arena-old', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:05:12', app: '星灵', type: '预检', result: '受理', reason: '', task: '', outId: 'order-20261111-015', site: 'bp-growth', channel: '邮件', cat: '营销' },
  { time: '2026-11-11 10:08:44', app: '星灵', type: '回调投递', result: '回调失败', reason: 'CALLBACK_FAILED 3 次重试仍失败（HTTP 503），已通知负责人', task: 'T20260713001', outId: 'order-20261110-088', site: 'bp-growth', channel: 'SMS', cat: '营销',
    retries: [['首次投递', '10:08:44', '失败 · HTTP 503'], ['第 1 次重试（+1 分钟）', '10:09:44', '失败 · HTTP 503'], ['第 2 次重试（+5 分钟）', '10:14:44', '失败 · 连接超时'], ['第 3 次重试（+30 分钟）', '10:44:44', '失败 · HTTP 503']], event: '执行统计快照' },
  { time: '2026-11-11 10:11:05', app: '用户中心', type: '发送', result: '受理', reason: '', task: 'E20261111-UC-REG', outId: 'reg-88123401', site: 'bp-growth', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:11:06', app: '用户中心', type: '发送', result: '限流', reason: 'RATE_LIMITED 超出速率上限 100 请求 / 秒', task: '', outId: 'reg-88123477', site: 'bp-growth', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:15:30', app: '用户中心', type: '回调投递', result: '受理', reason: '', task: 'E20261111-UC-REG', outId: 'reg-88123401', site: 'bp-growth', channel: 'SMS', cat: '营销',
    retries: [['首次投递', '10:15:30', '失败 · HTTP 502'], ['第 1 次重试（+1 分钟）', '10:16:30', '成功 · HTTP 200']], event: '已送达' },
  { time: '2026-11-11 10:20:18', app: '风控平台', type: '发送', result: '拒绝', reason: 'CHANNEL_NOT_ALLOWED 通道不在允许范围（Push）', task: '', outId: 'rc-alert-0091', site: 'bp-growth', channel: 'Push', cat: '营销' },
  { time: '2026-11-11 10:21:40', app: '风控平台', type: '发送', result: '受理', reason: '', task: 'T20261111021', outId: 'rc-alert-0092', site: 'bp-growth', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:30:02', app: 'MMS 活动中心', type: '发送', result: '拒绝', reason: 'APP_DISABLED 接入方已停用', task: '', outId: 'mms-7781', site: 'gamezone', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:31:15', app: '星灵', type: '查询', result: '受理', reason: '', task: 'T20260713001', outId: 'order-20261110-088', site: 'bp-growth', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:35:47', app: '星灵', type: '发送', result: '拒绝', reason: 'APPROVAL_INFO_MISSING 声明需要审批但缺少审批人或审批时间', task: '', outId: 'order-20261111-021', site: 'bp-growth', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:40:09', app: '用户中心', type: '发送', result: '拒绝', reason: 'SITE_NOT_FOUND 产品线不存在（bingo-ph）', task: '', outId: 'reg-88123990', site: 'bingo-ph', channel: 'SMS', cat: '营销' },
  { time: '2026-11-11 10:42:51', app: '星灵', type: '回调投递', result: '受理', reason: '', task: 'T20260713005', outId: 'order-20261111-001', site: 'bp-growth', channel: 'SMS', cat: '营销',
    retries: [['首次投递', '10:42:51', '成功 · HTTP 200']], event: '排队中' },
];

/* 回调事件（调试台右侧，6.7.4） */
const AP_CB_EVENTS = [
  { id: 'EV-9F21A0', time: '10:08:44', level: '任务级', event: '执行统计快照', ref: 'T20260713001', outId: 'order-20261110-088', delivery: 'fail', note: '3 次重试仍失败，已通知负责人' },
  { id: 'EV-9F2201', time: '10:42:51', level: '任务级', event: '排队中', ref: 'T20260713005', outId: 'order-20261111-001', delivery: 'ok', note: 'HTTP 200' },
];

/* ================= 通用小工具 ================= */
function apBl(siteId) { const p = V2_PRODUCT_LINES.find(x => x.siteId === siteId); return p ? p.bl : ''; }
function apAllowedSites(app) {
  const fromBl = V2_PRODUCT_LINES.filter(p => app.siteAll.includes(p.bl) && p.status === '启用').map(p => p.siteId);
  return [...new Set([...fromBl, ...app.siteList])];
}
function apSitesLabel(app) {
  const n = apAllowedSites(app).length;
  if (app.siteAll.length) return `${app.siteAll.join(' / ')} 全部（${n}）`;
  return String(n);
}
function apAppByName(name) { return AP_APPS.find(a => a.name === name); }
function apAppById(id) { return AP_APPS.find(a => a.appId === id); }
function apPad(n) { return String(n).padStart(2, '0'); }
function apHM(d) { return `${apPad(d.getHours())}:${apPad(d.getMinutes())}`; }
function apHMS(d) { return `${apHM(d)}:${apPad(d.getSeconds())}`; }
function apStamp(d = new Date()) { return `2026-11-11 ${apHMS(d)}`; }
function apFmtEta(d) {
  const now = new Date();
  return d.toDateString() === now.toDateString() ? apHM(d) : `${apPad(d.getMonth() + 1)}-${apPad(d.getDate())} ${apHM(d)}`;
}
function apSecret() {
  const c = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'sk_' + Array.from({ length: 32 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}
function apUsageCell(app) {
  const r = app.usage / app.quota;
  const cls = r >= 1 ? 'hot' : r >= .8 ? 'mid' : '';
  return `<span class="v2-util ${cls}">${fmtN(app.usage)} / ${fmtN(app.quota)}<span class="track"><i style="width:${Math.min(100, r * 100).toFixed(0)}%"></i></span></span>`;
}

/* ETA 预览（6.6 口径：目标队列取该业务线该通道深度最小的账号；未接入调度标「估算」） */
function apEta(site, channel, n, schedAt) {
  const bl = apBl(site);
  const accs = V2_ACCOUNTS.filter(a => a.channel === channel && a.bl === bl && a.mode !== 'otp');
  if (!accs.length) return null;
  const depthOf = a => V2_TASKS.filter(t => t.account === a.id && (t.status === 'queued' || t.status === 'sending')).reduce((s, t) => s + t.remaining, 0);
  const acc = accs.slice().sort((x, y) => depthOf(x) - depthOf(y))[0];
  const thr = acc.tps ? acc.tps * .85 : 300; // 有效吞吐 = min(TPS, 近 15 分钟提交速率)，演示取 85%
  const now = new Date();
  const waitMin = depthOf(acc) / thr / 60;
  let start = new Date(now.getTime() + waitMin * 60000);
  if (schedAt && schedAt > start) start = schedAt;
  const durMin = n * .92 / thr / 60;
  const finish = new Date(start.getTime() + Math.max(1, durMin) * 60000);
  return { start, finish, waitMin: Math.round(waitMin), range: Math.max(1, Math.round(durMin * .1)), estimated: acc.mode === 'legacy' };
}

/* 预检（6.7.5）：只提示不阻断 */
function apPrecheck(req) {
  const hints = [];
  const text = req.content || (AP_TPLS.find(t => t.code === req.tpl) || {}).content || '';
  if (req.channels.includes('SMS') && text.length > 160) hints.push({ lv: 'mid', item: '长度', msg: `短信内容 ${text.length} 字，超过 160（将按多条计费）` });
  if (req.tpl === 'TPL-SMS-0012') hints.push({ lv: 'tip', item: '重复内容', msg: '24 小时内已向相同用户发送同一模板：重复用户 1,024 人（占 8.0%）' });
  AP_SENSITIVE.forEach(w => { if (text.toLowerCase().includes(w.toLowerCase())) hints.push({ lv: 'strong', item: '敏感词', msg: `命中一期敏感词「${w}」，该消息发送时将失败` }); });
  if (req.channels.includes('邮件')) {
    const low = text.toLowerCase();
    const hi = AP_MAIL_HIGH.filter(w => new RegExp(`(^|[^a-z])${w.replace(/\$/g, '\\$')}([^a-z]|$)`).test(low));
    const mid = AP_MAIL_MID.filter(w => low.includes(w));
    if (hi.length) hints.push({ lv: 'strong', item: '邮件规则包 E1-1', msg: `含高风险促销词：${hi.join(', ')}；建议改写为活动信息描述` });
    if (mid.length) hints.push({ lv: 'mid', item: '邮件规则包 E1-2', msg: `含中风险促销词：${mid.join(', ')}` });
  }
  return hints;
}

/* 发送校验与受理（6.7.3 / 6.7.6） */
function apCount(req) {
  if (req.mode === '任务式') return (AP_CROWDS.find(c => c.id === req.crowd) || { n: 0 }).n;
  return req.recipients.length;
}
function apValidate(req, forPrecheck) {
  const app = apAppById(req.appId);
  const R = (code, msg) => ({ code, msg });
  if (!app) return R('AUTH_FAILED', '鉴权失败：AppId 不存在或签名错误');
  if (app.status !== '启用') return R('APP_DISABLED', '接入方已停用，新调用全部拒绝');
  let site = req.site;
  let fallback = false;
  if (!site) return R('SITE_MISSING', '缺少产品线（site id），不发送'); /* 无兜底归属（Marvin 2026-11-13） */
  const pl = V2_PRODUCT_LINES.find(p => p.siteId === site);
  if (!pl) return R('SITE_NOT_FOUND', `产品线不存在（${site}）`);
  if (pl.status !== '启用') return R('SITE_OFFLINE', `产品线已下线（${site}）`);
  if (!apAllowedSites(app).includes(site)) return R('SITE_NOT_ALLOWED', `产品线不在接入方允许范围（${site}）`);
  if (!app.cats.includes(req.cat)) return R('CATEGORY_NOT_ALLOWED', `消息类别不在允许范围（${req.cat}）`);
  if (!req.channels.length) return R('PARAM_MISSING', '缺少通道');
  const badCh = req.channels.filter(c => !app.channels.includes(c));
  if (badCh.length) return R('CHANNEL_NOT_ALLOWED', `通道不在允许范围（${badCh.join('、')}）`);
  if (req.mode !== '任务式' && !req.recipients.length) return R('PARAM_MISSING', '缺少收件人');
  if (req.mode === '任务式' && !req.crowd) return R('PARAM_MISSING', '任务式发送需指定人群包 / 人群标签');
  if (req.recipients.some(r => !r.startsWith('user:')) && req.cat !== 'OTP') return R('RECIPIENT_NOT_ALLOWED', '裸地址（手机号 / 邮箱 / 设备 token）只允许 OTP 类消息，请改传用户 ID');
  if (req.mode === '批量' && req.recipients.length > 5000) return R('BATCH_LIMIT', '批量一次最多 5,000 个收件人，请分多次或改任务式');
  if (req.mode === '单发' && req.timing === '定时') return R('PARAM_INVALID', '事件单发只能立即发送');
  if (!req.operator) return R('PARAM_MISSING', '缺少操作人（Operator）');
  if (!forPrecheck && !req.outId) return R('PARAM_MISSING', '缺少业务幂等键（Out Id）');
  if (req.mode !== '单发' && !req.taskName) return R('PARAM_MISSING', '任务式 / 批量发送需填任务名称');
  if (req.timing === '定时' && !req.time) return R('PARAM_MISSING', '定时发送需填计划时间');
  if (!req.tpl && !req.content) return R('PARAM_MISSING', '模板与内容至少传一个');
  if (req.tpl) {
    const t = AP_TPLS.find(x => x.code === req.tpl);
    if (!t || t.site !== site || !req.channels.includes(t.channel)) return R('TEMPLATE_MISMATCH', `模板 ${req.tpl} 与产品线 / 通道不匹配`);
  }
  if (!forPrecheck) {
    if (req.mode !== '单发' && req.needAppr === '是' && (!req.approver.trim() || !req.apprTime)) return R('APPROVAL_INFO_MISSING', '上游声明需要审批，但缺少审批人或审批时间');
    const need = apCount(req) * req.channels.length;
    if (app.usage + need > app.quota) return R('QUOTA_EXCEEDED', `超出接入方日配额：今日已用 ${fmtN(app.usage)}，本次 ${fmtN(need)}，配额 ${fmtN(app.quota)}`);
  }
  return { ok: true, app, site, fallback };
}

/* ================= 接入方列表 ================= */
const apFilter = { name: '', bls: [], status: '' };

function apRenderBlFilter() {
  const host = document.getElementById('fBl');
  const label = apFilter.bls.length ? apFilter.bls.join('、') : '全部';
  host.innerHTML = `<button class="select ap-msel-btn" type="button">${label}</button>
    <div class="ap-msel-pop" hidden>${V2_BUSINESS_LINES.map(b => `<label><input type="checkbox" value="${b.code}" ${apFilter.bls.includes(b.code) ? 'checked' : ''}>${b.name}</label>`).join('')}</div>`;
  const pop = host.querySelector('.ap-msel-pop');
  host.querySelector('.ap-msel-btn').addEventListener('click', e => { e.stopPropagation(); pop.hidden = !pop.hidden; });
  pop.addEventListener('click', e => e.stopPropagation());
  pop.querySelectorAll('input').forEach(i => i.addEventListener('change', () => {
    apFilter.bls = [...pop.querySelectorAll('input:checked')].map(x => x.value);
    host.querySelector('.ap-msel-btn').textContent = apFilter.bls.length ? apFilter.bls.join('、') : '全部';
  }));
}

function apRenderList() {
  const rows = AP_APPS.filter(a =>
    (!apFilter.name || a.name.includes(apFilter.name)) &&
    (!apFilter.bls.length || a.bls.some(b => apFilter.bls.includes(b))) &&
    (!apFilter.status || a.status === apFilter.status));
  const body = document.getElementById('appRows');
  if (!rows.length) { body.innerHTML = '<tr><td colspan="9" class="v2-muted" style="text-align:center;padding:32px">暂无数据</td></tr>'; return; }
  body.innerHTML = rows.map(a => `<tr>
    <td><b>${esc(a.name)}</b>${a.sandbox ? ' <span class="tag tag-warning">测试模式</span>' : ''}</td>
    <td><code>${a.appId}</code></td>
    <td>${a.bls.join(' ')}</td>
    <td title="${esc(apAllowedSites(a).map(plName).join('、'))}">${apSitesLabel(a)}</td>
    <td>${a.channels.join(' ')}</td>
    <td>${a.cats.join(' ')}</td>
    <td class="v2-num">${apUsageCell(a)}</td>
    <td>${a.status === '启用' ? '<span class="tag tag-success">启用</span>' : '<span class="tag tag-gray">停用</span>'}</td>
    <td>
      <button class="link-btn" data-act="edit" data-id="${a.appId}">编辑</button>
      <button class="link-btn" data-act="secret" data-id="${a.appId}">密钥</button>
      <button class="link-btn ${a.status === '启用' ? 'link-btn-danger' : ''}" data-act="toggle" data-id="${a.appId}">${a.status === '启用' ? '停用' : '启用'}</button>
      <button class="link-btn" data-act="usage" data-id="${a.appId}">统计</button>
    </td></tr>`).join('');
  body.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => apRowAction(b.dataset.act, b.dataset.id)));
}

function apRowAction(act, id) {
  const app = apAppById(id);
  if (act === 'edit') apOpenForm(app);
  if (act === 'secret') apResetSecret(app);
  if (act === 'toggle') apToggle(app);
  if (act === 'usage') { document.getElementById('aApp').value = app.name; apAuditPage = 1; apShowTab('audit'); apRenderAudit(); }
}

function apShowSecret(app, isReset) {
  const sec = apSecret();
  v2Modal({
    title: isReset ? '新密钥' : '接入方已创建',
    okText: '我已保存', hideCancel: true,
    body: `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><div>密钥仅显示这一次，关闭后无法再次查看，请立即复制并妥善保存。${isReset ? '重置后旧密钥 10 分钟内仍有效。' : ''}</div></div>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">接入方</span><span>${esc(app.name)}</span></div>
        <div class="desc-item"><span class="desc-label">AppId</span><span><code>${app.appId}</code></span></div>
        <div class="desc-item"><span class="desc-label">密钥</span><span class="v2-flex"><code class="ap-secret" id="apSecretVal">${sec}</code><button class="btn btn-outline btn-sm" id="apCopy"><i data-lucide="copy"></i>复制</button></span></div>
      </div>`,
  });
  document.getElementById('apCopy').addEventListener('click', () => {
    try { navigator.clipboard && navigator.clipboard.writeText(sec).catch(() => {}); } catch (e) { /* 原型忽略 */ }
    showToast('密钥已复制');
  });
}

function apResetSecret(app) {
  v2Modal({
    title: '重置密钥', okText: '确认重置', danger: true,
    body: `<p>确认重置「${esc(app.name)}」（${app.appId}）的密钥？</p><p class="v2-hint">新密钥只显示一次；重置后旧密钥 10 分钟内仍有效，请在此期间完成替换。</p>`,
    onOk: () => { setTimeout(() => apShowSecret(app, true), 0); showToast('密钥已重置'); },
  });
}

function apToggle(app) {
  const off = app.status === '启用';
  v2Modal({
    title: off ? '停用接入方' : '启用接入方', okText: off ? '确认停用' : '确认启用', danger: off,
    body: off ? `<p>确认停用「${esc(app.name)}」？</p><p class="v2-hint">停用后该接入方的新调用（发送 / 查询 / 预检 / H5 SDK）全部拒绝，已创建任务不受影响。</p>`
      : `<p>确认启用「${esc(app.name)}」？启用后按当前配置立即生效。</p>`,
    onOk: () => { app.status = off ? '停用' : '启用'; apRenderList(); apRenderQuota(); apRenderDebugForm(); showToast(off ? '已停用' : '已启用'); },
  });
}

/* ---------- 新建 / 编辑表单 ---------- */
let apEditing = null;

function apOpenForm(app) {
  apEditing = app || null;
  const a = app || { name: '', appId: '', owner: '', bls: [], siteAll: [], siteList: [], defaultSite: '', channels: [], cats: ['营销'], approval: '逐任务审批', approvers: [], quota: '', rate: 50, callback: '', events: ['task'], sandbox: false, status: '启用', remark: '' };
  document.getElementById('appDrawerTitle').textContent = app ? `编辑接入方 · ${app.name}` : '新建接入方';
  const chk = (name, val, on, extra = '') => `<label class="ap-chk"><input type="checkbox" name="${name}" value="${val}" ${on ? 'checked' : ''} ${extra}>${val}</label>`;
  const siteTree = V2_BUSINESS_LINES.map(b => {
    const sites = V2_PRODUCT_LINES.filter(p => p.bl === b.code);
    const all = a.siteAll.includes(b.code);
    return `<div class="ap-cas-col" data-bl="${b.code}">
      <label class="ap-chk ap-cas-head"><input type="checkbox" name="blAll" value="${b.code}" ${all ? 'checked' : ''}>${b.name} 全部（含未来新增）</label>
      ${sites.map(p => `<label class="ap-chk"><input type="checkbox" name="site" value="${p.siteId}" ${p.status !== '启用' ? 'disabled' : ''} ${all || a.siteList.includes(p.siteId) ? 'checked' : ''}>${p.name}${p.status !== '启用' ? ' <span class="tag tag-gray">已下线</span>' : ''}</label>`).join('')}
    </div>`;
  }).join('');
  document.getElementById('appFormBody').innerHTML = `
    <div id="apFormErr"></div>
    <div class="v2-form ap-form">
      <label class="req">接入方名称</label><input class="input" id="fmName" maxlength="50" placeholder="请输入" value="${esc(a.name)}" data-char-count="off">
      <label class="req">AppId</label><div>${app ? `<code>${a.appId}</code> <span class="v2-hint">创建后不可改</span>` : '<span class="v2-muted">保存后系统生成</span>'}</div>
      <label class="req">密钥</label><div class="v2-flex"><code>****************</code><span class="v2-hint">仅创建 / 重置时显示一次</span>${app ? '<button class="btn btn-outline btn-sm" id="fmReset" type="button">重置密钥</button>' : ''}</div>
      <label class="req">负责人</label><input class="input" id="fmOwner" list="apUsers" placeholder="选择对接负责人" value="${esc(a.owner)}" data-char-count="off">
      <span class="v2-hint">接收配额与拒绝告警</span>
      <label class="req">允许业务线 / 产品线</label><div class="ap-cascade" id="fmSites">${siteTree}</div>
      <span class="v2-hint">勾选「业务线下全部」时，该业务线未来新增的产品线自动纳入</span>
      <select id="fmDefault" hidden></select>
      <label class="req">允许通道</label><div class="ap-chk-row">${V2_CHANNELS.map(c => chk('ch', c, a.channels.includes(c))).join('')}</div>
      <label class="req">允许消息类别</label><div class="ap-chk-row">${V2_MSG_CATEGORIES.map(c => chk('cat', c, a.cats.includes(c))).join('')}</div>
      <span class="v2-hint">OTP需管理员单独勾选</span>
      <label>审批</label><span class="v2-hint" style="margin:0;align-self:center">不在触达配置：上游业务单需审批的，审批通过后才调用触达并传入审批人；无需审批的，审批人显示「无需审批」</span>
      <label class="req">日配额</label><div class="v2-flex"><input class="input" id="fmQuota" type="number" min="1" value="${a.quota}" style="width:200px"><span class="v2-muted">条 / 日</span></div>
      <span class="v2-hint">按消息数；超出拒绝</span>
      <label class="req">速率上限</label><div class="v2-flex"><input class="input" id="fmRate" type="number" min="1" max="1000" value="${a.rate}" style="width:200px"><span class="v2-muted">请求 / 秒</span></div>
      <span class="v2-hint">1–1000；超出返回限流</span>
      <label>回调地址</label><input class="input" id="fmCallback" placeholder="接收状态事件，https://…" value="${esc(a.callback)}" data-char-count="off">
      <span class="v2-hint">保存时连通性测试；留空不回调，只能查询</span>
      <label>回调事件</label><div class="ap-chk-row">
        <label class="ap-chk"><input type="checkbox" name="ev" value="task" ${a.events.includes('task') ? 'checked' : ''}>任务级全部</label>
        <label class="ap-chk"><input type="checkbox" name="ev" value="msgFinal" ${a.events.includes('msgFinal') ? 'checked' : ''}>消息级 · 终态</label>
        <label class="ap-chk"><input type="checkbox" name="ev" value="msgSubmitted" ${a.events.includes('msgSubmitted') ? 'checked' : ''}>消息级 · 已提交（中间态）</label></div>
      <span class="v2-hint">消息级事件量大，默认只推终态</span>
      <label>测试模式</label><div class="v2-flex"><label class="v2-switch"><input type="checkbox" id="fmSandbox" ${a.sandbox ? 'checked' : ''}><span></span></label><span class="v2-hint" style="margin:0">开时所有消息按测试消息处理（不计量），走测试账号白名单</span></div>
      <label class="req">状态</label><div class="v2-flex"><label class="v2-switch"><input type="checkbox" id="fmStatus" ${a.status === '启用' ? 'checked' : ''}><span></span></label><span id="fmStatusTxt">${a.status}</span></div>
      <label>备注</label><textarea class="textarea" id="fmRemark" maxlength="500" placeholder="对接说明" data-char-count="off">${esc(a.remark)}</textarea>
    </div>
    <datalist id="apUsers">${AP_USERS.map(u => `<option value="${u}">`).join('')}</datalist>`;
  apBindForm(a);
  openDrawer('appDrawer');
  refreshIcons();
}

function apFormSites() {
  const box = document.getElementById('fmSites');
  const siteAll = [...box.querySelectorAll('[name=blAll]:checked')].map(i => i.value);
  const siteList = [...box.querySelectorAll('[name=site]:checked')].map(i => i.value).filter(s => !siteAll.includes(apBl(s)));
  return { siteAll, siteList };
}

function apBindForm(a) {
  const box = document.getElementById('fmSites');
  const syncDefault = () => {
    const s = apFormSites();
    const allowed = apAllowedSites(s);
    const sel = document.getElementById('fmDefault');
    const cur = sel.value || a.defaultSite;
    sel.innerHTML = '<option value="">不设置</option>' + allowed.map(x => `<option value="${x}" ${x === cur ? 'selected' : ''}>${plName(x)}</option>`).join('');
  };
  box.querySelectorAll('[name=blAll]').forEach(i => i.addEventListener('change', () => {
    box.querySelectorAll(`[data-bl="${i.value}"] [name=site]:not(:disabled)`).forEach(s => { s.checked = i.checked; });
    syncDefault();
  }));
  box.querySelectorAll('[name=site]').forEach(i => i.addEventListener('change', () => {
    const col = i.closest('[data-bl]');
    if (!i.checked) col.querySelector('[name=blAll]').checked = false;
    syncDefault();
  }));
  syncDefault();
  document.getElementById('fmStatus').addEventListener('change', e => { document.getElementById('fmStatusTxt').textContent = e.target.checked ? '启用' : '停用'; });
  const rs = document.getElementById('fmReset');
  if (rs) rs.addEventListener('click', () => apResetSecret(apEditing));
}

function apSaveForm() {
  const v = id => document.getElementById(id).value.trim();
  const checked = n => [...document.querySelectorAll(`#appFormBody [name=${n}]:checked`)].map(i => i.value);
  const sites = apFormSites();
  const data = {
    name: v('fmName'), owner: v('fmOwner'), siteAll: sites.siteAll, siteList: sites.siteList, defaultSite: v('fmDefault'),
    channels: checked('ch'), cats: checked('cat'),
    quota: Number(v('fmQuota')), rate: Number(v('fmRate')),
    callback: v('fmCallback'), events: checked('ev'), sandbox: document.getElementById('fmSandbox').checked,
    status: document.getElementById('fmStatus').checked ? '启用' : '停用', remark: v('fmRemark'),
  };
  const errs = [];
  if (!data.name) errs.push('请输入接入方名称');
  else if (AP_APPS.some(x => x.name === data.name && x !== apEditing)) errs.push('接入方名称已存在');
  if (!data.owner) errs.push('请选择负责人');
  if (!data.siteAll.length && !data.siteList.length) errs.push('请选择允许的产品线');
  if (!data.channels.length) errs.push('请选择允许通道');
  if (!data.cats.length) errs.push('请选择允许消息类别');
  if (!(data.quota >= 1)) errs.push('日配额需 ≥ 1');
  if (!(data.rate >= 1 && data.rate <= 1000)) errs.push('速率上限需在 1–1000 之间');
  if (data.callback && !/^https:\/\/\S+$/.test(data.callback)) errs.push('回调地址需为 https URL');
  const errBox = document.getElementById('apFormErr');
  if (errs.length) {
    errBox.innerHTML = `<div class="v2-callout danger" style="margin-bottom:16px"><i data-lucide="alert-circle"></i><div>${errs.join('；')}</div></div>`;
    refreshIcons(); document.getElementById('appFormBody').scrollTop = 0; return;
  }
  errBox.innerHTML = '';
  data.bls = [...new Set([...data.siteAll, ...data.siteList.map(apBl)])];
  if (data.callback) showToast('回调地址连通性测试通过（HTTP 200 · 86 ms）');
  if (apEditing) {
    Object.assign(apEditing, data);
    closeDrawer('appDrawer');
    setTimeout(() => showToast('已保存，立即生效'), data.callback ? 1200 : 0);
  } else {
    const app = Object.assign({ appId: `app_${apPad(AP_APPS.length + 1)}`, usage: 0 }, data);
    AP_APPS.push(app);
    closeDrawer('appDrawer');
    apShowSecret(app, false);
  }
  apRenderList(); apRenderQuota(); apRenderAuditAppOptions(); apRenderDebugForm();
}

/* ================= 调试台 ================= */
const AP_PRESETS = [
  { label: '正常受理', set: { appId: 'xl_01', mode: '任务式', site: 'bp-growth', cat: '营销', channels: ['SMS'], crowd: 'CP-20261101-07', tpl: 'TPL-SMS-0012', content: '' } },
  { label: '产品线已下线', set: { appId: 'xl_01', site: 'arena-old', channels: ['SMS'], tpl: 'TPL-SMS-0012' } },
  { label: '超出允许通道', set: { appId: 'xl_01', site: 'bp-growth', channels: ['SMS', '站内信'], tpl: 'TPL-SMS-0012' } },
  { label: 'Out Id 重复', set: { appId: 'xl_01', site: 'bp-growth', channels: ['SMS'], tpl: 'TPL-SMS-0012', outId: 'order-20261111-001' } },
  { label: '自由文案', set: { appId: 'xl_01', site: 'bp-growth', channels: ['SMS'], tpl: '', content: 'Hi Marvin, World Cup prediction closes tonight. Join now on BingoPlus!' } },
  { label: '上游已审批', set: { needAppr: '是', approver: 'lily@', apprTime: '2026-11-23T15:20', apprRef: 'MMS-AP-0031' } },
  { label: '审批信息缺失', set: { needAppr: '是', approver: '', apprTime: '' } },
  { label: '批量（无需审批）', set: { appId: 'rc_01', mode: '批量', needAppr: '否', site: 'bp-growth', cat: '营销', channels: ['SMS'], tpl: '', content: 'Your account login from a new device was detected. If not you, contact support.', recipients: 'user:10023\nuser:10024' } },
  { label: '超出日配额', set: { appId: 'xl_01', mode: '任务式', site: 'bp-growth', cat: '营销', channels: ['SMS'], crowd: 'CP-20261105-11', tpl: 'TPL-SMS-0012' } },
  { label: '邮件预检强提醒', set: { appId: 'xl_01', site: 'bp-growth', cat: '营销', channels: ['邮件'], tpl: '', content: 'Claim your Free Bonus now! Win Big this weekend with an exclusive offer.' } },
  { label: '接入方已停用', set: { appId: 'mms_01', site: 'gamezone', cat: '营销', channels: ['SMS'], tpl: '' , content: 'GameZone weekend event is live.' } },
];
const apDbg = {
  appId: 'xl_01', mode: '任务式', site: 'bp-growth', cat: '营销', channels: ['SMS'], imSub: '', crowd: 'CP-20261101-07',
  recipients: 'user:10023\nuser:10024\nuser:10025', tpl: 'TPL-SMS-0012', content: '', vars: 'nickname=Marvin', operator: 'ken@',
  activity: 'ACT202607001', outId: 'order-20261111-101', taskName: '开赛提醒', timing: '立即', time: '', test: false,
  needAppr: '否', approver: '', apprTime: '', apprRef: '',
};

function apRenderPresets() {
  const host = document.getElementById('dbgPresets');
  host.innerHTML = '<span class="v2-hint">示例：</span>' + AP_PRESETS.map((p, i) => `<button class="btn btn-outline btn-sm" data-preset="${i}">${p.label}</button>`).join('');
  host.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    Object.assign(apDbg, { mode: '任务式', cat: '营销', needAppr: '否', approver: '', apprTime: '', apprRef: '', recipients: 'user:10023\nuser:10024\nuser:10025', outId: 'order-20261111-' + (++apSeq), imSub: '' }, AP_PRESETS[b.dataset.preset].set);
    apRenderDebugForm();
    showToast(`已填入示例「${AP_PRESETS[b.dataset.preset].label}」`);
  }));
}

function apRenderDebugForm() {
  const d = apDbg;
  const siteOpts = [['', '（不传）'], ...V2_PRODUCT_LINES.map(p => [p.siteId, `${p.siteId} · ${p.name}${p.status !== '启用' ? '（已下线）' : ''}`]), ['bingo-ph', 'bingo-ph（不存在）']];
  const tplOpts = AP_TPLS.map(t => `<option value="${t.code}" ${d.tpl === t.code ? 'selected' : ''}>${t.code} · ${t.channel} · ${plName(t.site)}</option>`).join('');
  const app = apAppById(d.appId);
  document.getElementById('dbgForm').innerHTML = `<div class="v2-form ap-dbg-form">
    <label class="req">接入方</label><div class="v2-flex"><select class="select" data-k="appId">${AP_APPS.map(a => `<option value="${a.appId}" ${a.appId === d.appId ? 'selected' : ''}>${esc(a.name)}（${a.appId}）</option>`).join('')}</select></div>
    <span class="v2-hint">${app ? `${app.status} · 通道 ${app.channels.join(' ')} · 类别 ${app.cats.join(' ')} · 产品线 ${apSitesLabel(app)}` : ''}</span>
    <label class="req">发送方式</label><div class="seg-group" data-seg="mode">${['任务式', '批量', '单发'].map(m => `<button type="button" class="seg-btn ${d.mode === m ? 'active' : ''}" data-v="${m}">${m}</button>`).join('')}</div>
    <label class="req">产品线 Site Id</label><select class="select" data-k="site">${siteOpts.map(([v, l]) => `<option value="${v}" ${d.site === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <label class="req">消息类别</label><select class="select" data-k="cat">${V2_MSG_CATEGORIES.map(c => `<option ${d.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <label class="req">通道</label><div class="ap-chk-row">${V2_CHANNELS.map(c => `<label class="ap-chk"><input type="checkbox" data-ch value="${c}" ${d.channels.includes(c) ? 'checked' : ''}>${c}</label>`).join('')}</div>
    ${d.mode === '任务式'
      ? `<label class="req">人群</label><select class="select" data-k="crowd">${AP_CROWDS.map(c => `<option value="${c.id}" ${d.crowd === c.id ? 'selected' : ''}>${c.id} · ${c.name}（${fmtN(c.n)}）</option>`).join('')}</select>`
      : `<label class="req">收件人</label><textarea class="textarea" data-k="recipients" rows="3" placeholder="每行一个：user:用户ID（优先）或 手机号 / 邮箱 / 设备 token" data-char-count="off">${esc(d.recipients)}</textarea>
         <span class="v2-hint">${d.mode === '批量' ? '一次 ≤ 5,000 个收件人' : '单发：一条消息，归入当日该场景的事件任务'}；裸地址只允许 OTP 类</span>`}
    <label>模板 Template Code</label><select class="select" data-k="tpl"><option value="">不使用模板（自由文案）</option>${tplOpts}</select>
    <label>内容 Content</label><textarea class="textarea" data-k="content" rows="3" placeholder="传内容即「自由文案」；与模板二选一" data-char-count="off">${esc(d.content)}</textarea>
    <label>变量</label><input class="input" data-k="vars" value="${esc(d.vars)}" placeholder="key=value，多个用逗号分隔" data-char-count="off">
    <label class="req">操作人 Operator</label><input class="input" data-k="operator" value="${esc(d.operator)}" placeholder="SSO 账号；事件类可传「系统」" data-char-count="off">
    <label>活动 ID</label><input class="input" data-k="activity" value="${esc(d.activity)}" data-char-count="off">
    <label class="req">业务幂等键 Out Id</label><input class="input" data-k="outId" value="${esc(d.outId)}" data-char-count="off">
    <span class="v2-hint">接入方内唯一；24 小时内重复 → 返回首次结果，不重复发送</span>
    ${d.mode === '单发' ? '' : `<label class="req">任务名称</label><input class="input" data-k="taskName" value="${esc(d.taskName)}" maxlength="50" data-char-count="off">`}
    <label>发送时机</label><div class="v2-flex"><div class="seg-group" data-seg="timing">${['立即', '定时'].map(m => `<button type="button" class="seg-btn ${d.timing === m ? 'active' : ''}" data-v="${m}">${m}</button>`).join('')}</div>
      ${d.timing === '定时' ? `<input class="input" type="datetime-local" data-k="time" value="${d.time}" style="width:220px">` : ''}</div>
    ${d.mode === '单发' ? '<label>审批</label><span class="v2-hint" style="margin:0;align-self:center">单发不传审批信息，事件任务审批人显示「无需审批」</span>' : `<label class="req">是否需要审批</label><div class="v2-flex"><div class="seg-group" data-seg="needAppr">${['否', '是'].map(m => `<button type="button" class="seg-btn ${d.needAppr === m ? 'active' : ''}" data-v="${m}">${m}</button>`).join('')}</div><span class="v2-hint" style="margin:0">上游业务单是否经过审批；审批在上游完成后才调用</span></div>
      ${d.needAppr === '是' ? `<label class="req">审批人</label><input class="input" data-k="approver" value="${esc(d.approver)}" placeholder="上游审批通过人（SSO 账号）" data-char-count="off">
      <label class="req">审批时间</label><input class="input" type="datetime-local" data-k="apprTime" value="${d.apprTime}" style="width:220px">
      <label>上游审批单号</label><input class="input" data-k="apprRef" value="${esc(d.apprRef)}" placeholder="选填，任务详情展示" data-char-count="off">` : ''}`}
    <label>测试标记</label><div class="v2-flex"><label class="v2-switch"><input type="checkbox" data-k="test" ${d.test ? 'checked' : ''}><span></span></label><span class="v2-hint" style="margin:0">是 → 按测试消息处理</span></div>
  </div>`;
  const form = document.getElementById('dbgForm');
  form.querySelectorAll('[data-k]').forEach(el => {
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'datetime-local' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      apDbg[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.k === 'appId') apRenderDebugForm();
    });
  });
  form.querySelectorAll('[data-ch]').forEach(el => el.addEventListener('change', () => {
    apDbg.channels = [...form.querySelectorAll('[data-ch]:checked')].map(i => i.value);
    apRenderDebugForm();
  }));
  form.querySelectorAll('[data-seg]').forEach(g => g.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
    apDbg[g.dataset.seg] = b.dataset.v; apRenderDebugForm();
  })));
  const cb = app && app.callback;
  document.getElementById('cbTarget').textContent = cb ? `投递到 ${cb}` : '该接入方未配置回调地址，只能查询';
}

function apReq() {
  const d = apDbg;
  return Object.assign({}, d, { recipients: d.mode === '任务式' ? [] : d.recipients.split(/\n+/).map(s => s.trim()).filter(Boolean), content: d.content.trim(), outId: d.outId.trim(), operator: d.operator.trim(), taskName: (d.taskName || '').trim() });
}

function apAddAudit(type, result, reason, req, task) {
  const app = apAppById(req.appId);
  AP_AUDIT.push({ time: apStamp(), app: app ? app.name : req.appId, type, result, reason, task: task || '', outId: req.outId, site: req.site || (app && app.defaultSite) || '-', channel: req.channels.join('+') || '-', cat: req.cat });
  apRenderAudit(); apRenderQuota();
}

function apHintsHtml(hints) {
  if (!hints.length) return '<span class="v2-muted">无提示</span>';
  const lvName = { strong: '强提醒', mid: '提醒', tip: '建议' };
  return `<div class="v2-check-body" style="padding:0">${hints.map(h => `<div class="v2-ci ${h.lv}"><span class="dot-l"></span><div><b>${lvName[h.lv]} · ${h.item}</b>：${esc(h.msg)}</div></div>`).join('')}</div>`;
}

function apResultCard(kind, rows, extra = '') {
  const head = { accept: ['tag-success', '受理'], reject: ['tag-danger', '拒绝'], dup: ['tag-primary', '幂等命中 · 返回首次结果'], pre: ['tag-info', '预检完成'], query: ['tag-info', '查询结果'] }[kind];
  document.getElementById('dbgResult').innerHTML = `<div class="v2-flex" style="margin-bottom:8px"><span class="tag ${head[0]}">${head[1]}</span><span class="v2-hint">${apStamp()}</span></div>
    <div class="desc-list">${rows.map(([k, v]) => `<div class="desc-item"><span class="desc-label">${k}</span><span>${v}</span></div>`).join('')}</div>${extra}`;
  refreshIcons();
}

function apEtaText(req, site) {
  const n = req.mode === '任务式' ? apCount(req) : req.recipients.length;
  const sched = req.timing === '定时' && req.time ? new Date(req.time) : null;
  return req.channels.map(ch => {
    const e = apEta(site, ch, n, sched);
    if (!e) return `${ch}：-`;
    return `${ch}：预计 ${apFmtEta(e.start)} 开始、${apFmtEta(e.finish)} 完成 <span class="v2-pm">±${e.range} 分</span>${e.estimated ? '<span class="v2-est">估算</span>' : ''}`;
  }).join('<br>');
}

function apDoPrecheck() {
  const req = apReq();
  const v = apValidate(req, true);
  if (!v.ok) { apAddAudit('预检', '拒绝', `${v.code} ${v.msg}`, req); apResultCard('reject', [['原因码', `<code>${v.code}</code>`], ['说明', esc(v.msg)]]); return; }
  const hints = apPrecheck(req);
  apAddAudit('预检', '受理', '', req);
  apResultCard('pre', [['产品线', `${v.site} · ${plName(v.site)}${v.fallback ? ' <span class="tag tag-warning">缺失，已按默认产品线兜底</span>' : ''}`],
    ['预计开始 / 完成', apEtaText(req, v.site)], ['预检提示', apHintsHtml(hints)]],
    '<p class="v2-hint" style="margin-top:8px">预检结果只提示不阻断；频控预估、黑名单 / DND / DNC 预估、配额余量为 P1。</p>');
}

function apDoSend() {
  const req = apReq();
  const dupKey = `${req.appId}|${req.outId}`;
  const first = AP_OUTIDS[dupKey];
  if (first) {
    apAddAudit('发送', first.kind === 'accepted' ? '受理' : '拒绝', first.kind === 'accepted' ? '' : first.reason, req, first.taskId);
    apResultCard('dup', [['Out Id', `<code>${esc(req.outId)}</code>（24 小时内重复，未重复发送）`], ['首次受理时间', first.at],
      ['首次结果', first.kind === 'accepted' ? `受理 · 任务 ID <b>${first.taskId}</b>` : `拒绝 · ${esc(first.reason)}`],
      ...(first.kind === 'accepted' ? [['审批状态', v2Tag(V2_APPROVAL_STATUS, first.approval)], ['审批人', first.approverTxt || '-'], ['预计开始 / 完成', `${first.estStart} / ${first.estFinish}`]] : [])]);
    return;
  }
  const v = apValidate(req, false);
  if (!v.ok) {
    if (req.outId) AP_OUTIDS[dupKey] = { kind: 'rejected', reason: `${v.code} ${v.msg}`, at: apStamp() };
    apAddAudit('发送', '拒绝', `${v.code} ${v.msg}`, req);
    apResultCard('reject', [['原因码', `<code>${v.code}</code>`], ['说明', esc(v.msg)], ['Out Id', `<code>${esc(req.outId || '-')}</code>`]]);
    return;
  }
  const app = v.app;
  const taskId = req.mode === '单发' ? `E20261111-${app.appId.toUpperCase().replace(/_\d+$/, '')}-EVT` : `T20261111${++apSeq}`;
  const approval = req.mode !== '单发' && req.needAppr === '是' ? 'approved' : 'none';
  const approverTxt = approval === 'approved' ? `${esc(req.approver)} · ${req.apprTime.replace('T', ' ')}${req.apprRef ? ` · ${esc(req.apprRef)}` : ''}` : '无需审批';
  const hints = apPrecheck(req);
  const count = apCount(req) * req.channels.length;
  if (!req.test && !app.sandbox) app.usage += count;
  const msgIds = req.mode === '任务式' ? [] : req.recipients.map((r, i) => `M${Date.now().toString().slice(-8)}${i}`);
  AP_OUTIDS[dupKey] = { kind: 'accepted', taskId, approval, approverTxt, at: apStamp(), estStart: '-', estFinish: '-', hints };
  apAddAudit('发送', '受理', '', Object.assign({}, req, { site: v.site }), taskId);
  apResultCard('accept', [
    ['任务 ID', `<b>${taskId}</b>${req.mode === '单发' ? ' <span class="v2-hint">（当日该场景事件任务）</span>' : ''}`],
    ...(msgIds.length ? [['消息 ID', msgIds.slice(0, 5).join('、') + (msgIds.length > 5 ? ` 等 ${msgIds.length} 条` : '')]] : []),
    ['产品线', `${v.site} · ${plName(v.site)}${v.fallback ? ' <span class="tag tag-warning">缺失，已按默认产品线兜底</span>' : ''}`],
    ['审批状态', v2Tag(V2_APPROVAL_STATUS, approval) + ' <span class="v2-hint">上游传入</span>'],
    ['审批人', approverTxt],
    ['预计开始 / 完成', apEtaText(req, v.site)],
    ['计量', req.test || app.sandbox ? '测试消息，不计量' : `${fmtN(count)} 条计入今日用量（${fmtN(app.usage)} / ${fmtN(app.quota)}）`],
    ['预检提示', apHintsHtml(hints)],
  ], `<div style="margin-top:10px"><button class="btn btn-outline btn-sm" id="dbgAdvance"><i data-lucide="fast-forward"></i>模拟推进任务（产生回调）</button></div>`);
  apPushEvent(app, '任务级', '已创建', taskId, req.outId);
  if (req.mode !== '单发') apPushEvent(app, '任务级', req.timing === '定时' ? '待发送' : '排队中', taskId, req.outId);
  const steps = ['发送中', '执行统计快照', '已完成'];
  document.getElementById('dbgAdvance').addEventListener('click', e => {
    const s = steps.shift();
    if (!s) { showToast('任务已完成，无更多事件'); e.currentTarget.disabled = true; return; }
    apPushEvent(app, '任务级', s, taskId, req.outId);
    if (s === '已完成' && app.events.includes('msgFinal')) apPushEvent(app, '消息级', '已送达', msgIds[0] || `M${taskId.slice(-6)}0001`, req.outId);
  });
}

function apDoQuery() {
  const req = apReq();
  const first = AP_OUTIDS[`${req.appId}|${req.outId}`];
  apAddAudit('查询', first ? '受理' : '拒绝', first ? '' : 'NOT_FOUND 未找到该 Out Id', req, first && first.taskId);
  if (!first || first.kind !== 'accepted') { apResultCard('reject', [['原因码', '<code>NOT_FOUND</code>'], ['说明', `未找到 Out Id「${esc(req.outId)}」对应的任务`]]); return; }
  const t = v2Task(first.taskId);
  const f = t ? v2Funnel(t) : null;
  apResultCard('query', [['任务 ID', first.taskId], ['任务状态', t ? v2Tag(V2_TASK_STATUS, t.status) : v2Tag(V2_TASK_STATUS, 'queued')],
    ['审批状态', v2Tag(V2_APPROVAL_STATUS, t ? t.approval : first.approval)],
    ['审批人', t ? (t.approval === 'none' ? '无需审批' : '-') : (first.approverTxt || '-')],
    ['预计开始 / 完成', t ? `${t.estStart} / ${t.estFinish} <span class="v2-pm">±${t.range || 1} 分</span>` : `${first.estStart} / ${first.estFinish}`],
    ['执行统计', f ? `总数 ${fmtN(f.total)} · 可推送 ${fmtN(f.sendable)} · 已提交 ${fmtN(f.submitted)} · 已送达 ${fmtN(f.delivered)} · 未送达 ${fmtN(f.undelivered)}` : '尚未开始']]);
}

function apPushEvent(app, level, event, ref, outId) {
  const now = new Date();
  const fail = !app.callback ? null : (event === '执行统计快照' && Math.random() < .5);
  const ev = { id: 'EV-' + Math.random().toString(16).slice(2, 8).toUpperCase(), time: apHMS(now), level, event, ref, outId, delivery: !app.callback ? 'none' : fail ? 'retry' : 'ok', note: !app.callback ? '未配置回调地址' : fail ? '首次 HTTP 503，1 分钟后第 1 次重试成功' : 'HTTP 200' };
  AP_CB_EVENTS.unshift(ev);
  if (app.callback) {
    AP_AUDIT.push({ time: apStamp(now), app: app.name, type: '回调投递', result: '受理', reason: '', task: ref, outId, site: '-', channel: '-', cat: '-', event,
      retries: fail ? [['首次投递', apHMS(now), '失败 · HTTP 503'], ['第 1 次重试（+1 分钟）', apHM(new Date(now.getTime() + 60000)), '成功 · HTTP 200']] : [['首次投递', apHMS(now), '成功 · HTTP 200']] });
    apRenderAudit();
  }
  apRenderEvents();
}

function apRenderEvents() {
  const tag = { ok: '<span class="tag tag-success">投递成功</span>', retry: '<span class="tag tag-warning">重试后成功</span>', fail: '<span class="tag tag-danger">投递失败</span>', none: '<span class="tag tag-gray">不回调</span>' };
  document.getElementById('cbEvents').innerHTML = `<div class="table-scroll" style="max-height:300px"><table class="table stats-table">
    <thead><tr><th>事件 ID / 时间</th><th>事件</th><th>任务 / 消息 · Out Id</th><th>投递结果</th></tr></thead>
    <tbody>${AP_CB_EVENTS.map(e => `<tr><td><code>${e.id}</code><div class="v2-hint">${e.time}</div></td><td>${e.event}<div class="v2-hint">${e.level}</div></td><td>${e.ref}<div class="v2-hint">${esc(e.outId)}</div></td><td title="${esc(e.note)}">${tag[e.delivery]}</td></tr>`).join('')}</tbody></table></div>
    <p class="v2-hint" style="margin-top:8px">同一事件至少一次投递，接入方按事件 ID 去重；失败按 1 / 5 / 30 分钟重试 3 次，仍失败记入调用审计并通知负责人；不保证严格有序，带状态时间戳。</p>`;
}

/* 能力说明（6.7.3–6.7.6、6.7.8） */
function apRenderDocs() {
  const t = (heads, rows) => `<table class="table stats-table ap-doc-table"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  document.getElementById('apiDocs').innerHTML = `
  <section class="card"><h3 class="v2-section-title"><i data-lucide="book-open"></i>能力说明</h3>
    <div class="tabs" id="docTabs">
      <button class="tab active" data-doc="send">发送能力</button><button class="tab" data-doc="cb">状态回调与查询</button>
      <button class="tab" data-doc="pre">预检能力</button><button class="tab" data-doc="appr">审批（上游控制）</button>
      <button class="tab" data-doc="res">资源能力 <span class="tag tag-gray-outline">P1</span></button></div>
    <div data-docpane="send">
      ${t(['方式', '适用', '产生的任务', '说明'], [
        ['任务式', '批量营销：人群包 / 人群标签 / 上传文件 + 模板或内容 + 发送时机', '1 个任务', '上游审批通过 / 提交后调用；排队、ETA、检测与页面新建任务一致，触达不审批'],
        ['创建系统调用任务', 'H5 SDK 配置的内容：上游业务单审批通过 / 提交后调用，传任务code + 名称 + site id + 活动 + 审批信息', '1 个系统调用任务，创建即「发送中」', '通道与内容取该任务code 在 SDK 保存的配置；同一任务code 只能创建一个任务'],
        ['按任务code 调用', '已创建的系统调用任务：传任务code + 人群 + 发送时间（立即 / 定时）+ 变量；事件触发即立即', '归入该任务，每次调用一个发送批次', '通道与内容取任务配置；任务已终止 → 拒绝；每次调用不再审批'],
        ['批量', '一次提交 ≤ 5,000 个收件人，每人独立变量或独立内容', '1 个任务（来源 API）', '对应「分别配置」逐行内容；超过上限分多次或改任务式'],
        ['单发', '事件触发的一条消息（如注册欢迎）', '归入该接入方当日该场景的「事件任务」', '事件任务自动按天聚合，便于统计与终止']])}
      <h4 class="ap-h4">校验与受理</h4>
      ${t(['环节', '规则'], [['鉴权', 'AppId + 签名；失败拒绝'], ['范围', '产品线 / 通道 / 消息类别 / 配额 / 速率'], ['审批信息', '需要审批但缺审批人或审批时间 → 拒绝；只记录，不校验审批人在触达的权限'], ['幂等', 'Out Id 24 小时去重'],
        ['预检', '重复内容 / 长度 / 敏感词 → 以提示返回，不阻断（敏感词命中的消息按一期规则发送时失败）'],
        ['受理结果', '返回任务 ID（及消息 ID 列表）、审批状态、预计开始 / 完成（如可算）、预检提示'], ['拒绝', '返回明确原因码与说明（鉴权 / 产品线不合法 / 范围 / 配额 / 参数）']])}
      <h4 class="ap-h4">拒绝原因码（示意，协议由开发定）</h4>
      ${t(['原因码', '说明'], [['AUTH_FAILED', '鉴权失败'], ['APP_DISABLED', '接入方已停用'], ['SITE_MISSING', '缺少产品线（site id），不发送'], ['SITE_NOT_FOUND', '产品线不存在'], ['SITE_OFFLINE', '产品线已下线'], ['SITE_NOT_ALLOWED', '产品线不在允许范围'],
        ['CHANNEL_NOT_ALLOWED / CATEGORY_NOT_ALLOWED', '通道 / 消息类别不在允许范围'], ['TEMPLATE_MISMATCH', '模板与产品线 / 通道不匹配'], ['APPROVAL_INFO_MISSING', '声明需要审批但缺审批人或审批时间'],
        ['QUOTA_EXCEEDED / RATE_LIMITED', '超出日配额 / 速率上限'], ['PARAM_MISSING / PARAM_INVALID / BATCH_LIMIT / RECIPIENT_NOT_ALLOWED', '参数缺失或不合法']])}
    </div>
    <div data-docpane="cb" hidden>
      ${t(['级别', '事件', '触发'], [['任务级', '已创建（含审批状态与审批人）、排队中、发送中、已完成、已终止、失败', '任务状态变化'],
        ['任务级', '执行统计快照', '发送中每 5 分钟一次 + 完成时一次（漏斗各层数字）'], ['消息级', '已提交、提交失败、已送达、未送达、已过期、无回执、已拦截', '消息终态；「已提交」为可选中间态']])}
      <h4 class="ap-h4">回调规则</h4>
      ${t(['项', '规则'], [['投递', '推送到接入方回调地址；带签名与事件时间；同一事件至少一次，接入方按事件 ID 去重'], ['重试', '失败按 1 / 5 / 30 分钟重试 3 次；仍失败记入调用审计并通知负责人'],
        ['内容', '任务级带任务 ID、Out Id、状态、时间、统计快照；消息级带消息 ID、Out Id、收件人标识（脱敏）、状态、失败分类、原始码、最终供应商'], ['顺序', '不保证严格有序，带状态时间戳']])}
      <h4 class="ap-h4">查询能力</h4>
      ${t(['查询', '返回'], [['按任务 ID / Out Id 查任务', '任务状态、审批状态与审批人、预计开始 / 完成、执行统计（同 6.3.2 漏斗口径）'], ['按消息 ID / Out Id 查消息', '消息状态、失败分类与原始码、提交 / 回执时间、最终供应商'], ['按任务查失败明细', '分页返回失败消息（同 6.3.3 导出字段）']])}
    </div>
    <div data-docpane="pre" hidden>
      ${t(['检查项', '规则', '本期'], [['重复内容', '同一用户 + 同一通道 + 同一模板（或渲染后文本一致）24 小时内已发送 → 提示重复用户数与占比', 'P0'], ['长度', '按通道限制（短信 ≤ 160，变量按变量元数据最大长度估算）', 'P0'],
        ['敏感词', '命中一期敏感词库 → 提示命中词', 'P0'], ['邮件规则包', '促销词 / 图文比例 / Footer（6.9）', 'P0（邮件通道）'], ['频控预估', '本次人群预计被频控拦截的比例', 'P1'], ['黑名单 / DND / DNC 预估', '命中比例', 'P1'], ['配额余量', '接入方日配额、产品线额度', 'P1']])}
      <p class="v2-hint" style="margin-top:8px">预检可单独调用（配置阶段提示），也随发送调用一并返回；结果只提示不阻断。</p>
    </div>
    <div data-docpane="appr" hidden>
      <p class="v2-hint" style="margin:0 0 8px">触达不为接入方配置审批方式和审批人，也不审批接入方创建的任务（含 H5 SDK、任务式、批量、单发）。</p>
      ${t(['场景', '规则', '触达展示'], [['上游需要审批', '上游业务单审批通过后才调用触达，传审批人、审批时间（可带审批单号）', '审批状态 已通过；审批人 = 上游传入'],
        ['上游无需审批', '业务单提交后直接调用，传「无需审批」', '审批状态 无需审批；审批人显示「无需审批」'],
        ['拒绝 / 撤回', '上游审批拒绝或撤回业务单 → 不调用触达', '触达无任务、无记录'],
        ['改内容', '上游按任务code 重新打开配置弹窗修改，经上游审批后调用「更新任务内容」', '下一批注入起生效；触达不审批']])}
      <p class="v2-hint" style="margin-top:8px">接入方任务不进「我的审批」，不出现待审批 / 已拒绝；触达中心页面新建的任务仍走已上线的审批人配置。push 事件任务接入方化，是否审批由上游决定。</p>
    </div>
    <div data-docpane="res" hidden>
      ${t(['能力', '说明'], [['模板查询', '返回接入方允许范围内、已审批、按产品线与通道过滤的模板列表与变量说明'], ['人群包上传', '按《触达上传模板优化》的文件规范上传人群包，返回人群包 ID 供任务式发送引用'], ['产品线 / 通道可用性', '返回接入方当前允许的产品线（含状态）与通道']])}
    </div>
  </section>`;
  const tabs = document.querySelectorAll('#docTabs [data-doc]');
  tabs.forEach(b => b.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('[data-docpane]').forEach(p => { p.hidden = p.dataset.docpane !== b.dataset.doc; });
  }));
}

/* ================= 调用审计与配额 ================= */
let apAuditPage = 1;
const AP_PAGE_SIZE = 10;

function apRenderQuota() {
  const rejects = name => AP_AUDIT.filter(r => r.app === name && (r.result === '拒绝' || r.result === '限流')).length;
  const total = name => AP_AUDIT.filter(r => r.app === name).length;
  const cbFail = name => AP_AUDIT.filter(r => r.app === name && r.result === '回调失败').length;
  document.getElementById('quotaCards').innerHTML = AP_APPS.map(a => {
    const r = a.usage / a.quota;
    return `<div class="card ap-quota-card ${a.status !== '启用' ? 'is-off' : ''}">
      <div class="v2-flex-between"><b>${esc(a.name)}</b>${a.status === '启用' ? (r >= 1 ? '<span class="tag tag-danger">配额已用尽</span>' : r >= .8 ? '<span class="tag tag-warning">配额 ≥ 80%</span>' : '<span class="tag tag-success">正常</span>') : '<span class="tag tag-gray">停用</span>'}</div>
      <div class="ap-quota-num">${fmtN(a.usage)} <span>/ ${fmtN(a.quota)}</span></div>
      <div class="v2-prog"><i style="width:${Math.min(100, r * 100).toFixed(1)}%;${r >= .8 ? 'background:var(--warning)' : ''}"></i></div>
      <div class="ap-quota-meta"><span>当日用量 / 配额 ${pct(a.usage, a.quota)}</span><span>速率上限 ${a.rate} 请求 / 秒</span><span>今日拒绝 ${rejects(a.name)} / ${total(a.name)} 次</span><span>回调失败 ${cbFail(a.name)} 次</span></div>
    </div>`;
  }).join('');
  const alerts = [];
  AP_APPS.forEach(a => {
    const r = a.usage / a.quota;
    if (a.status === '启用' && r >= .8) alerts.push(`${a.name} 当日用量达 ${pct(a.usage, a.quota, 0)}，已通知负责人 ${a.owner}`);
    if (cbFail(a.name)) alerts.push(`${a.name} 回调连续失败（${cbFail(a.name)} 条事件 3 次重试仍失败），已通知负责人 ${a.owner}`);
  });
  document.getElementById('quotaAlerts').innerHTML = alerts.length ? `<div class="v2-callout warn" style="margin-bottom:16px"><i data-lucide="bell-ring"></i><div>${alerts.join('<br>')}<div class="v2-hint">告警规则：配额达 80% / 100%、拒绝率突增、回调连续失败 → 通知接入方负责人（复用 6.4.3 告警机制）</div></div></div>` : '';
  refreshIcons();
}

function apRenderAuditAppOptions() {
  const sel = document.getElementById('aApp');
  const cur = sel.value;
  sel.innerHTML = '<option value="">全部</option>' + AP_APPS.map(a => `<option ${a.name === cur ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
}

function apRenderAudit() {
  const f = { app: document.getElementById('aApp').value, type: document.getElementById('aType').value, result: document.getElementById('aResult').value, key: document.getElementById('aKey').value.trim() };
  const rows = AP_AUDIT.map((r, i) => Object.assign({ idx: i }, r)).filter(r => (!f.app || r.app === f.app) && (!f.type || r.type === f.type) && (!f.result || r.result === f.result) && (!f.key || (r.task + ' ' + r.outId).includes(f.key)))
    .sort((a, b) => b.time.localeCompare(a.time));
  const pages = Math.max(1, Math.ceil(rows.length / AP_PAGE_SIZE));
  apAuditPage = Math.min(apAuditPage, pages);
  const shown = rows.slice((apAuditPage - 1) * AP_PAGE_SIZE, apAuditPage * AP_PAGE_SIZE);
  const resTag = { 受理: 'tag-success', 拒绝: 'tag-danger', 限流: 'tag-warning', 回调失败: 'tag-danger' };
  document.getElementById('auditRows').innerHTML = shown.length ? shown.map(r => `<tr class="${r.result === '回调失败' ? 'v2-row-danger' : ''}">
    <td>${r.time}</td><td>${esc(r.app)}</td><td>${r.type}${r.event ? ` <span class="v2-hint">· ${r.event}</span>` : ''}</td><td><span class="tag ${resTag[r.result]}">${r.result}</span></td>
    <td class="ap-reason">${r.reason ? esc(r.reason) : '<span class="v2-muted">-</span>'}</td>
    <td>${r.task || '-'} / ${esc(r.outId || '-')}</td><td>${esc(r.site)} / ${esc(r.channel)} / ${esc(r.cat)}</td>
    <td>${r.retries ? `<button class="link-btn" data-retry="${r.idx}">投递记录</button>` : '<span class="v2-muted">-</span>'}</td></tr>`).join('')
    : '<tr><td colspan="8" class="v2-muted" style="text-align:center;padding:32px">暂无数据</td></tr>';
  document.querySelectorAll('[data-retry]').forEach(b => b.addEventListener('click', () => apShowRetries(AP_AUDIT[b.dataset.retry])));
  const pager = document.getElementById('auditPager');
  pager.innerHTML = `<span class="v2-hint" style="margin-right:8px">共 ${rows.length} 条</span><button class="page-btn" data-p="${apAuditPage - 1}" ${apAuditPage === 1 ? 'disabled' : ''}>‹</button>` +
    Array.from({ length: pages }, (_, i) => `<button class="page-btn ${i + 1 === apAuditPage ? 'active' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('') +
    `<button class="page-btn" data-p="${apAuditPage + 1}" ${apAuditPage === pages ? 'disabled' : ''}>›</button>`;
  pager.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { apAuditPage = Number(b.dataset.p); apRenderAudit(); }));
}

function apShowRetries(r) {
  v2Modal({
    title: '回调投递记录', okText: '关闭', hideCancel: true, width: 640,
    body: `<div class="desc-list">
      <div class="desc-item"><span class="desc-label">接入方</span><span>${esc(r.app)}</span></div>
      <div class="desc-item"><span class="desc-label">事件</span><span>${r.event || '-'}（${r.task} / ${esc(r.outId)}）</span></div>
      <div class="desc-item"><span class="desc-label">回调地址</span><span>${esc((apAppByName(r.app) || {}).callback || '-')}</span></div></div>
      <table class="table stats-table"><thead><tr><th>投递</th><th>时间</th><th>结果</th></tr></thead>
      <tbody>${r.retries.map(x => `<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2].startsWith('成功') ? `<span class="tag tag-success">${x[2]}</span>` : `<span class="tag tag-danger">${x[2]}</span>`}</td></tr>`).join('')}</tbody></table>
      <p class="v2-hint">失败按 1 / 5 / 30 分钟重试 3 次；仍失败记入调用审计并通知负责人。</p>`,
  });
}

/* ================= tab 与初始化 ================= */
let apShowTabFn = null;
function apShowTab(key) {
  if (!['list', 'api', 'audit'].includes(key)) key = 'list';
  apShowTabFn(key);
  history.replaceState(null, '', '#' + key);
}

function apBindStatic() {
  document.getElementById('createAppBtn').addEventListener('click', () => apOpenForm(null));
  document.getElementById('appSaveBtn').addEventListener('click', apSaveForm);
  document.getElementById('fQuery').addEventListener('click', () => { apFilter.name = document.getElementById('fName').value.trim(); apFilter.status = document.getElementById('fStatus').value; apRenderList(); });
  document.getElementById('fReset').addEventListener('click', () => {
    Object.assign(apFilter, { name: '', bls: [], status: '' });
    document.getElementById('fName').value = ''; document.getElementById('fStatus').value = '';
    apRenderBlFilter(); apRenderList();
  });
  document.addEventListener('click', () => document.querySelectorAll('.ap-msel-pop').forEach(p => { p.hidden = true; }));
  document.getElementById('dbgPrecheck').addEventListener('click', apDoPrecheck);
  document.getElementById('dbgSend').addEventListener('click', apDoSend);
  document.getElementById('dbgQuery').addEventListener('click', apDoQuery);
  document.getElementById('aQuery').addEventListener('click', () => { apAuditPage = 1; apRenderAudit(); });
  document.getElementById('aReset').addEventListener('click', () => { ['aApp', 'aType', 'aResult', 'aKey'].forEach(id => { document.getElementById(id).value = ''; }); apAuditPage = 1; apRenderAudit(); });
  document.getElementById('aExport').addEventListener('click', () => showToast('已导出（原型）'));
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-admin');
  renderTopbar();
  if (!hasPerm('admin')) {
    showToast('无权限访问「接入方管理」');
    setTimeout(() => { location.href = 'index.html'; }, 1200);
    refreshIcons();
    return;
  }
  document.getElementById('appsMain').hidden = false;
  apShowTabFn = v2BindTabs(document.getElementById('appsTabs'));
  apBindStatic();
  apRenderBlFilter();
  apRenderList();
  apRenderPresets();
  apRenderDebugForm();
  apRenderEvents();
  apRenderDocs();
  apRenderAuditAppOptions();
  apRenderQuota();
  apRenderAudit();
  apShowTab(location.hash.slice(1));
  window.addEventListener('hashchange', () => apShowTabFn(['list', 'api', 'audit'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'list'));
  refreshIcons();
  bindDrawerClose();
});

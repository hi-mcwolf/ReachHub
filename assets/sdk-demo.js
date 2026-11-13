/* H5 SDK 演示页（PRD 6.8）：上游系统「星灵」活动页嵌入触达 SDK
 * 组件：配置弹窗（6.8.3）、任务状态卡片（6.8.4）、任务详情抽屉（6.8.5）、任务列表组件（6.8.6 P1）
 * 全部为演示数据；SDK 区域用 .sdk-frame 标示为 iframe 嵌入组件 */

/* ================= 上下文与数据 ================= */
const SD_APP_BASE = V2_APPS.find(a => a.appId === 'xl_01');
const SD_CTX = { appId: 'xl_01', appName: '星灵', user: 'ken@', siteId: 'bp-growth', activityId: 'ACT202607001', activityName: '世界杯竞猜预热', lang: 'zh' };
/* 上游系统传参（6.8.2）：传了的字段在配置弹窗自动补全、只读 */
const SD_UPSTREAMS = {
  xl: { appId: 'xl_01', appName: '星灵', pass: {} },
  mms: { appId: 'mms_01', appName: 'MMS', pass: { activity: 'ACT202607001' } },
  oms: { appId: 'oms_rc', appName: 'OMS · 风控', pass: { site: 'bp-growth' } },
};
let SD_UP = 'xl';
const SD_DEMO = { approval: SD_APP_BASE.approval, appStatus: SD_APP_BASE.status };
const SD_ALLOWED_SITES = V2_PRODUCT_LINES.filter(p => p.bl === 'BP' && p.status === '启用').map(p => p.siteId); // 星灵：BP 全部
const SD_USER_SITES = SD_ALLOWED_SITES; // ken@ 数据权限：BP 全部
const SD_ALL_CH = ['SMS', '邮件', 'Push', 'Viber', 'Messenger', 'WhatsApp'];
const SD_LIMIT = { SMS: 160, Push: 200 };
const SD_POLL_MS = 30000;

const SD_TPLS = [
  { code: 'TPL-SMS-0012', channel: 'SMS', name: '世界杯竞猜预热', content: 'Only the best teams remain! Join the World Cup prediction on BingoPlus and win daily prizes. Reply STOP to opt out.' },
  { code: 'TPL-SMS-0020', channel: 'SMS', name: '周末充值提醒', content: 'Hi {nickname}, your weekend top-up reward is ready. Log in to BingoPlus to check it.' },
  { code: 'TPL-MAIL-0007', channel: '邮件', name: '本周赛事精选', subject: 'This week on BingoPlus: World Cup predictions', content: 'Hi {nickname},\nWorld Cup predictions are open. See the featured match lineup and make your picks before kick-off.' },
  { code: 'TPL-MAIL-0009', channel: '邮件', name: '竞猜奖励（促销版）', subject: 'Win Big! Claim your Free Bonus now', content: 'Exclusive offer for World Cup fans: bet on your team and win a jackpot bonus.' },
  { code: 'TPL-PUSH-0003', channel: 'Push', name: '竞猜开放', content: 'World Cup predictions are open. Tap to join.' },
];
const SD_CROWDS = [
  { id: 'CP-20261101-07', name: '世界杯活跃用户', n: 12800 },
  { id: 'CP-20261103-02', name: '近 30 天充值用户', n: 48000 },
  { id: 'TAG-VIP-ACTIVE', name: '标签：VIP 活跃', n: 3200 },
  { id: 'CP-20261105-11', name: '全量注册用户', n: 230000 },
];
const SD_MAIL_HIGH = ['casino', 'bet', 'bonus', 'free', 'win', 'jackpot', 'no deposit', 'claim now'];
const SD_MAIL_MID = ['offer', 'exclusive', 'limited', 'urgent', 'act now'];

const sdNow = () => new Date();
const SD_TASKS = V2_TASKS.filter(t => t.app === '星灵').map((t, i) => Object.assign({}, t, {
  channels: [t.channel], createdAt: new Date(Date.now() - (i + 1) * 3600e3 * (t.id === 'T20260713005' ? 20 : 2)),
  crowd: t.id === 'T20260713001' ? 'CP-20261101-07' : 'CP-20261103-02',
  contents: { SMS: { tpl: t.id === 'T20260713001' ? 'TPL-SMS-0012' : 'TPL-SMS-0020', content: (SD_TPLS.find(x => x.code === (t.id === 'T20260713001' ? 'TPL-SMS-0012' : 'TPL-SMS-0020')) || {}).content } },
  etaAt: sdNow(),
}));
let sdSeq = 200;
let sdReady = false;
let sdShowAll = false;

/* ================= 小工具 ================= */
function sdPad(n) { return String(n).padStart(2, '0'); }
function sdHM(d) { return `${sdPad(d.getHours())}:${sdPad(d.getMinutes())}`; }
function sdHMS(d) { return `${sdHM(d)}:${sdPad(d.getSeconds())}`; }
function sdFmt(d) { return d.toDateString() === sdNow().toDateString() ? sdHM(d) : `${sdPad(d.getMonth() + 1)}-${sdPad(d.getDate())} ${sdHM(d)}`; }
function sdTask(id) { return SD_TASKS.find(t => t.id === id); }
function sdIsSys(t) { return !!t.taskCode; }
/* 系统调用任务沿用一期：审批通过即「发送中」，等待上游按任务code 调用，直到终止 */
function sdStatusTag(t) { return v2Tag(V2_TASK_STATUS, t.status); }
function sdIsActive(t) { return ['pending', 'queued', 'sending'].includes(t.status); }
function sdChTags(t) { return `<span class="sd-ch-icons">${t.channels.map(c => `<span class="tag tag-gray-outline">${c}</span>`).join('')}</span>`; }

function sdLog(name, payload) {
  const el = document.getElementById('sdkLog');
  el.textContent += `[${sdHMS(sdNow())}] ${name} ${payload ? JSON.stringify(payload) : ''}\n`;
  el.scrollTop = el.scrollHeight;
}

/* ETA（6.6 口径：目标队列 = 业务线在该通道的账号，多账号取深度最小者；未接入调度标「估算」） */
function sdEtaFor(channel, n, schedAt) {
  const ch = { Viber: 'Viber Biz', Messenger: 'Messenger Bot' }[channel] || channel;
  const accs = V2_ACCOUNTS.filter(a => a.channel === ch && a.bl === 'BP' && a.mode !== 'otp');
  if (!accs.length) return null;
  const depth = a => V2_TASKS.filter(t => t.account === a.id && (t.status === 'queued' || t.status === 'sending')).reduce((s, t) => s + t.remaining, 0);
  const acc = accs.slice().sort((x, y) => depth(x) - depth(y))[0];
  const thr = acc.tps ? acc.tps * .85 : 300;
  const now = sdNow();
  const waitMin = depth(acc) / thr / 60;
  let start = new Date(now.getTime() + waitMin * 60000);
  if (schedAt && schedAt > start) start = schedAt;
  const durMin = Math.max(1, n * .92 / thr / 60);
  return { channel, start, finish: new Date(start.getTime() + durMin * 60000), waitMin: Math.max(0, Math.round(waitMin)), range: Math.max(1, Math.round(durMin * .1)), estimated: acc.mode === 'legacy', thr };
}

/* 漏斗：终止任务未发部分计入「已取消」 */
function sdFunnel(t) {
  if (t.status !== 'stopped') return v2Funnel(t);
  const f = v2Funnel(Object.assign({}, t, { status: 'sending' }));
  f.cancelled = f.queued; f.queued = 0;
  return f;
}
function sdProgress(t) {
  const f = sdFunnel(t);
  const done = f.sendable - f.queued - f.cancelled; // 已处理（已提交 + 提交失败）
  return { f, pct: f.sendable ? Math.floor(done / f.sendable * 100) : 0, failed: f.submitFail + f.undelivered + f.expired };
}

/* ================= 初始化（init） ================= */
function sdInit() {
  const up = SD_UPSTREAMS[SD_UP];
  SD_CTX.appId = up.appId; SD_CTX.appName = up.appName;
  const site = up.pass.site || (up.pass.activity ? 'bp-growth' : '');
  SD_CTX.siteId = site || 'bp-growth';
  document.getElementById('pSiteTxt').textContent = up.pass.site || (up.pass.activity ? '（不传，由活动带出）' : '（不传，弹窗内选择）');
  document.getElementById('pActTxt').textContent = up.pass.activity || '（不传，弹窗内选择）';
  SD_DEMO.approval = document.getElementById('pApproval').value;
  SD_DEMO.appStatus = document.getElementById('pAppStatus').value;
  sdLog('init', Object.assign({ appId: SD_CTX.appId, user: SD_CTX.user, lang: SD_CTX.lang }, up.pass.site ? { siteId: up.pass.site } : {}, up.pass.activity ? { activityId: up.pass.activity } : {}));
  if (SD_DEMO.appStatus !== '启用') {
    sdReady = false;
    sdLog('error', { code: 'APP_DISABLED', message: 'AppId 未启用，组件不可用' });
    const err = '<div class="sd-error"><i data-lucide="octagon-alert"></i>触达组件不可用：接入方 AppId（xl_01）未启用，请联系触达管理员。</div>';
    document.getElementById('sdkStatus').innerHTML = err;
    document.getElementById('sdkList').innerHTML = err;
    refreshIcons();
    return;
  }
  sdReady = true;
  sdLog('ready', { appId: SD_CTX.appId, approvalMode: SD_DEMO.approval });
  sdRenderStatus();
  sdRenderList();
}

/* ================= 配置弹窗（6.8.3） ================= */
let sdCfg = null;
let sdEtaTimer = null;

function sdNewCfg() {
  const per = {};
  SD_ALL_CH.forEach(c => { per[c] = { tpl: '', subject: '', content: '' }; });
  const t = SD_TPLS.find(x => x.code === 'TPL-SMS-0012');
  per.SMS = { tpl: t.code, subject: '', content: t.content }; // openConfig 预填：通道 SMS + 模板
  return { name: SD_CTX.activityName, type: 'manual', code: '', channels: ['SMS'], tab: 'SMS', cat: '营销', crowd: 'CP-20261101-07', per, timing: '立即', time: '', reserve: false, error: '' };
}

function sdOpenConfig() {
  if (!sdReady) { showToast('触达组件不可用'); return; }
  sdLog('openConfig', { prefill: { taskType: '手动发送（可传 系统调用）', channels: ['SMS'], template: 'TPL-SMS-0012', audience: 'CP-20261101-07', timing: '立即' } });
  sdCfg = sdNewCfg();
  sdRenderCfg();
  openDrawer('sdkConfigDrawer');
}

function sdCloseConfig(by) {
  if (!document.getElementById('sdkConfigDrawer').classList.contains('open')) return;
  closeDrawer('sdkConfigDrawer');
  if (by !== 'submitted') sdLog('closed', { by });
}

function sdSiteUsable() {
  const pl = V2_PRODUCT_LINES.find(p => p.siteId === SD_CTX.siteId);
  if (!pl) return `产品线 ${SD_CTX.siteId} 不存在`;
  if (pl.status !== '启用') return `产品线 ${pl.name}（${pl.siteId}）已下线`;
  if (!SD_ALLOWED_SITES.includes(pl.siteId)) return `产品线 ${pl.name}（${pl.siteId}）不在接入方允许范围`;
  return '';
}

function sdIsFree(c) {
  const p = sdCfg.per[c];
  if (!p.tpl) return true;
  const t = SD_TPLS.find(x => x.code === p.tpl);
  return !t || t.content !== p.content || (c === '邮件' && t.subject !== p.subject);
}

function sdDetect(c) {
  const p = sdCfg.per[c];
  const items = [];
  const lim = SD_LIMIT[c];
  if (lim && p.content.length > lim) items.push({ lv: 'mid', msg: `内容 ${p.content.length} 字，超过 ${c} 限制 ${lim}` });
  if (c === '邮件') {
    const scan = (text, list) => list.filter(w => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text));
    const firstPara = p.content.split(/\n/)[0].slice(0, 300);
    const hiS = scan(p.subject, SD_MAIL_HIGH), hiB = scan(firstPara, SD_MAIL_HIGH);
    const mid = [...new Set([...scan(p.subject, SD_MAIL_MID), ...scan(firstPara, SD_MAIL_MID)])];
    if (hiS.length) items.push({ lv: 'strong', msg: `主题含高风险促销词：${hiS.join(', ')}；建议改写为「This week's featured World Cup lineup」` });
    if (hiB.length) items.push({ lv: 'strong', msg: `首段含高风险促销词：${hiB.join(', ')}` });
    if (mid.length) items.push({ lv: 'mid', msg: `含中风险促销词：${mid.join(', ')}` });
    if ((p.subject.match(/!/g) || []).length >= 2 || /[$₱]/.test(p.subject)) items.push({ lv: 'tip', msg: '主题含多个感叹号或货币符号，建议去掉' });
  }
  return items;
}
function sdStrongCount() { return sdCfg.channels.reduce((s, c) => s + sdDetect(c).filter(i => i.lv === 'strong').length, 0); }

function sdHl(text) {
  let h = esc(text);
  SD_MAIL_HIGH.forEach(w => { h = h.replace(new RegExp(`(^|[^a-zA-Z>])(${w})(?=[^a-zA-Z]|$)`, 'gi'), '$1<span class="v2-hl">$2</span>'); });
  return h;
}

function sdRenderCfg() {
  const c = sdCfg;
  const unusable = sdSiteUsable();
  const body = document.getElementById('sdCfgBody');
  if (unusable) {
    body.innerHTML = `<div class="v2-callout danger"><i data-lucide="ban"></i><div><b>配置不可用</b><br>${esc(unusable)}，无法在此产品线下创建触达任务。</div></div>`;
    document.getElementById('sdSubmit').disabled = true;
    document.getElementById('sdSaveTpl').disabled = true;
    document.getElementById('sdStrongFlag').innerHTML = '';
    refreshIcons();
    return;
  }
  document.getElementById('sdSubmit').disabled = false;
  document.getElementById('sdSaveTpl').disabled = false;
  if (!c.channels.includes(c.tab)) c.tab = c.channels[0] || '';
  const pl = V2_PRODUCT_LINES.find(p => p.siteId === SD_CTX.siteId);
  const crowd = SD_CROWDS.find(x => x.id === c.crowd);
  body.innerHTML = `
    ${c.error ? `<div class="v2-callout danger" style="margin-bottom:14px"><i data-lucide="alert-circle"></i><div>${c.error}</div></div>` : ''}
    <div class="v2-form sd-form">
      <label>产品线</label><div class="sd-ro"><span><b>${pl.name}</b> <span class="v2-hint">（由上游带入，只读）</span></span>
        <span><span class="lab">活动</span>${SD_CTX.activityId} ${SD_CTX.activityName}</span></div>
      <label class="req">任务名称</label><input class="input" id="cfName" maxlength="50" placeholder="请输入任务名称" value="${esc(c.name)}" data-char-count="off">
      <label class="req">触达通道</label><div class="sd-chbtns">${SD_ALL_CH.map(ch => {
        const allowed = SD_APP_BASE.channels.includes(ch);
        return `<button type="button" class="chip ${c.channels.includes(ch) ? 'selected' : ''}" data-ch="${ch}" ${allowed ? '' : 'disabled title="接入方未开通该通道"'}>${ch}</button>`;
      }).join('')}</div>
      <label class="req">任务类型</label><div class="radio-group">
        <label><input type="radio" name="cfType" value="manual" ${c.type === 'manual' ? 'checked' : ''}>手动发送</label>
        <label><input type="radio" name="cfType" value="system" ${c.type === 'system' ? 'checked' : ''}>系统调用</label>
        <span class="v2-hint">${c.type === 'manual' ? '在此配置人群与发送时间，提交后由触达中心按时发送' : '只配置通道、内容和任务code；人群、发送时间由上游按任务code 调用时传入'}</span></div>
      ${c.type === 'system' ? `<label class="req">任务code</label><div><input class="input" id="cfCode" maxlength="64" style="max-width:340px" placeholder="字母、数字、下划线、中划线，接入方内唯一" value="${esc(c.code)}" data-char-count="off">
        <div class="v2-hint" style="margin-top:4px">上游调用 6.7.3 任务式接口时传此 code；同一接入方内唯一，保存后不可改</div></div>` : ''}
      ${c.type === 'manual' ? `<label class="req">人群</label><div class="v2-flex"><select class="select" id="cfCrowd" style="max-width:340px">${SD_CROWDS.map(x => `<option value="${x.id}" ${x.id === c.crowd ? 'selected' : ''}>${x.name}（${fmtN(x.n)}）</option>`).join('')}</select>
        <span class="v2-hint">预估人数 ${fmtN(crowd.n)}</span></div>` : ''}
      <label class="req">内容配置</label><div class="sd-content-box">${c.channels.length ? `
        <div class="tabs">${c.channels.map(ch => `<button type="button" class="tab ${ch === c.tab ? 'active' : ''}" data-ctab="${ch}">${ch}</button>`).join('')}</div>
        ${sdContentPane(c.tab)}` : '<p class="v2-hint" style="padding-top:14px">请先选择触达通道</p>'}</div>
      ${c.type === 'manual' ? `<label class="req">发送时间</label><div class="sd-timing">
        <div class="radio-group"><label><input type="radio" name="cfTiming" value="立即" ${c.timing === '立即' ? 'checked' : ''}>立即</label>
          <label><input type="radio" name="cfTiming" value="定时" ${c.timing === '定时' ? 'checked' : ''}>定时</label></div>
        ${c.timing === '定时' ? `<input class="input" type="datetime-local" id="cfTime" value="${c.time}">` : ''}
        ${hasPerm('reserve') ? `<span class="sd-reserve" title="定时任务到点自动插队（6.5.5）"><label class="v2-switch"><input type="checkbox" id="cfReserve" ${c.reserve ? 'checked' : ''} ${c.timing === '定时' ? '' : 'disabled'}><span></span></label>到点占位</span>` : ''}
      </div>
      <label></label><div id="cfEta"></div>` : `<label>人群 / 时间</label><div class="v2-hint" style="padding-top:6px">由上游调用时传入（用户 ID 列表或人群包、立即或定时）；如需到点占位，在触达中心「队列管理 → 计划占位」按星灵计划 ID 配置</div>`}
    </div>`;
  sdBindCfg();
  sdRenderEta(true);
  const n = sdStrongCount();
  document.getElementById('sdStrongFlag').innerHTML = n ? `<span class="tag tag-danger">强提醒 ${n}</span><span class="v2-hint">只提醒不阻断</span>` : '';
  refreshIcons();
}

function sdContentPane(ch) {
  const p = sdCfg.per[ch];
  const tpls = SD_TPLS.filter(t => t.channel === ch);
  const lim = SD_LIMIT[ch];
  const det = sdDetect(ch);
  const free = sdIsFree(ch);
  const lvName = { strong: '强提醒', mid: '提醒', tip: '建议' };
  return `<div class="v2-gap" style="gap:10px">
    <div class="sd-sub"><span>模板</span><div><select class="select" id="cfTpl" style="max-width:420px"><option value="">${tpls.length ? '请选择模板' : '该通道暂无已审批模板'}</option>${tpls.map(t => `<option value="${t.code}" ${p.tpl === t.code ? 'selected' : ''}>${t.code} · ${t.name}</option>`).join('')}</select>
      ${p.tpl && free ? '<div class="v2-hint" style="margin-top:4px;color:var(--warning)">已修改模板内容，将按自由文案处理</div>' : ''}
      ${!p.tpl && SD_DEMO.approval === '模板免审' ? '<div class="v2-hint" style="margin-top:4px">当前接入方为模板免审：须选择已审批模板</div>' : ''}</div></div>
    ${ch === '邮件' ? `<div class="sd-sub"><span>主题</span><input class="input" id="cfSubject" value="${esc(p.subject)}" placeholder="请输入邮件主题" data-char-count="off"></div>` : ''}
    <div class="sd-sub"><span>内容</span><div><textarea class="textarea" id="cfContent" rows="4" placeholder="请输入「${ch}」内容" data-char-count="off">${esc(p.content)}</textarea>
      <div class="sd-cnt ${lim && p.content.length > lim ? 'over' : ''}" id="cfCnt">${p.content.length}${lim ? ' / ' + lim : ''}</div></div></div>
    ${ch === '邮件' ? '<div class="sd-sub"><span>Footer</span><span class="v2-hint" style="padding-top:6px">系统 Footer v3 · BingoPlus（自动追加，不可删除）</span></div>' : ''}
    <div class="sd-check-line">${det.length ? det.map(i => `<div class="v2-ci ${i.lv}"><span class="dot-l"></span><div><b>${lvName[i.lv]}</b>：${esc(i.msg)}</div></div>`).join('')
      + (ch === '邮件' && p.subject ? `<div class="v2-hint">主题：${sdHl(p.subject)}</div>` : '')
      : '<div class="v2-ci pass"><span class="dot-l"></span><div>内容检测：无提醒</div></div>'}</div>
  </div>`;
}

function sdBindCfg() {
  const c = sdCfg;
  const $ = id => document.getElementById(id);
  $('cfName').addEventListener('input', e => { c.name = e.target.value; });
  document.querySelectorAll('#sdCfgBody [data-ch]').forEach(b => b.addEventListener('click', () => {
    const ch = b.dataset.ch;
    if (c.channels.includes(ch)) c.channels = c.channels.filter(x => x !== ch);
    else { c.channels.push(ch); c.tab = ch; }
    sdRenderCfg();
  }));
  document.querySelectorAll('[name=cfType]').forEach(r => r.addEventListener('change', () => { c.type = r.value; c.error = ''; if (c.type === 'system') c.reserve = false; sdRenderCfg(); }));
  if ($('cfCode')) $('cfCode').addEventListener('input', e => { c.code = e.target.value.trim(); });
  if ($('cfCrowd')) $('cfCrowd').addEventListener('change', e => { c.crowd = e.target.value; sdRenderCfg(); });
  document.querySelectorAll('#sdCfgBody [data-ctab]').forEach(b => b.addEventListener('click', () => { c.tab = b.dataset.ctab; sdRenderCfg(); }));
  const refreshDetect = () => {
    const pane = document.querySelector('#sdCfgBody .sd-content-box');
    const tabsHtml = pane.querySelector('.tabs').outerHTML;
    const pos = document.activeElement && document.activeElement.id;
    const sel = document.activeElement && document.activeElement.selectionStart;
    pane.innerHTML = tabsHtml + sdContentPane(c.tab);
    sdBindCfgContent();
    document.querySelectorAll('#sdCfgBody [data-ctab]').forEach(b => b.addEventListener('click', () => { c.tab = b.dataset.ctab; sdRenderCfg(); }));
    if (pos && $(pos)) { $(pos).focus(); try { $(pos).setSelectionRange(sel, sel); } catch (e) { /* ignore */ } }
    const n = sdStrongCount();
    $('sdStrongFlag').innerHTML = n ? `<span class="tag tag-danger">强提醒 ${n}</span><span class="v2-hint">只提醒不阻断</span>` : '';
  };
  sdCfg.refreshDetect = refreshDetect;
  sdBindCfgContent();
  document.querySelectorAll('[name=cfTiming]').forEach(r => r.addEventListener('change', () => { c.timing = r.value; if (r.value === '立即') c.reserve = false; sdRenderCfg(); }));
  if ($('cfTime')) $('cfTime').addEventListener('change', e => { c.time = e.target.value; sdRenderEta(); });
  if ($('cfReserve')) $('cfReserve').addEventListener('change', e => { c.reserve = e.target.checked; });
}

let sdDetectTimer = null;
function sdBindCfgContent() {
  const c = sdCfg;
  const p = c.per[c.tab];
  const ta = document.getElementById('cfContent');
  const sub = document.getElementById('cfSubject');
  const tpl = document.getElementById('cfTpl');
  if (tpl) tpl.addEventListener('change', () => {
    const t = SD_TPLS.find(x => x.code === tpl.value);
    p.tpl = tpl.value;
    if (t) { p.content = t.content; p.subject = t.subject || ''; }
    sdRenderCfg();
  });
  const onEdit = () => {
    const lim = SD_LIMIT[c.tab];
    const cnt = document.getElementById('cfCnt');
    if (cnt) { cnt.textContent = p.content.length + (lim ? ' / ' + lim : ''); cnt.classList.toggle('over', !!lim && p.content.length > lim); }
    clearTimeout(sdDetectTimer);
    sdDetectTimer = setTimeout(() => c.refreshDetect && c.refreshDetect(), 1000); // 促销词在输入停止 1 秒后标出（6.9.2）
  };
  if (ta) ta.addEventListener('input', () => { p.content = ta.value; onEdit(); });
  if (sub) sub.addEventListener('input', () => { p.subject = sub.value; onEdit(); });
}

function sdCfgEtas() {
  const c = sdCfg;
  const crowd = SD_CROWDS.find(x => x.id === c.crowd);
  const sched = c.timing === '定时' && c.time ? new Date(c.time) : null;
  return c.channels.map(ch => sdEtaFor(ch, crowd.n, sched)).filter(Boolean);
}

/* 提交前 ETA 预览（6.6.3）：防抖 500 ms */
function sdRenderEta(immediate) {
  clearTimeout(sdEtaTimer);
  const run = () => {
    const box = document.getElementById('cfEta');
    if (!box) return;
    const c = sdCfg;
    if (!c.channels.length) { box.innerHTML = ''; return; }
    if (c.timing === '定时' && !c.time) { box.innerHTML = '<div class="v2-hint">选择发送时间后显示预计开始 / 完成</div>'; return; }
    const crowd = SD_CROWDS.find(x => x.id === c.crowd);
    const lines = sdCfgEtas().map(e => {
      const est = e.estimated ? '<span class="v2-est" title="该通道未接入任务级调度，按消息队列深度估算">估算</span>' : '';
      if (c.timing === '定时') return `${e.channel}：预计 ${sdFmt(e.start)} 开始（计划时间与队列清空取较晚者）、${sdFmt(e.finish)} 完成 <span class="v2-pm">±${e.range} 分</span>${est}`;
      return `当前 ${e.channel} · BP 队列排队约 ${e.waitMin} 分钟；按预估人数 ${fmtN(crowd.n)} 推算：预计 ${sdFmt(e.start)} 开始、${sdFmt(e.finish)} 完成 <span class="v2-pm">±${e.range} 分</span>${est}`;
    });
    box.innerHTML = `<div class="v2-callout"><i data-lucide="info"></i><div>${lines.join('<br>')}${c.timing === '立即' ? '<br>如需更早送达可联系管理员或改为定时。' : ''}</div></div>`;
    refreshIcons();
  };
  if (immediate) run(); else sdEtaTimer = setTimeout(run, 500);
}

function sdSubmit() {
  const c = sdCfg;
  const errs = [];
  const name = c.name.trim();
  if (!name) errs.push('请输入任务名称');
  if (!c.channels.length) errs.push('请至少选择 1 个触达通道');
  c.channels.forEach(ch => {
    const p = c.per[ch];
    if (ch === '邮件' && !p.subject.trim()) errs.push('请输入「邮件」主题');
    if (!p.content.trim()) errs.push(`请输入「${ch}」内容`);
  });
  if (c.type === 'system') {
    if (!c.code) errs.push('请输入任务code');
    else if (!/^[A-Za-z0-9_-]{1,64}$/.test(c.code)) errs.push('任务code 只能包含字母、数字、下划线、中划线');
    else if (SD_TASKS.some(x => x.taskCode === c.code)) errs.push(`任务code「${c.code}」在本接入方内已存在`);
  }
  if (c.type === 'manual' && c.timing === '定时') {
    if (!c.time) errs.push('定时发送请选择发送时间');
    else if (new Date(c.time) <= sdNow()) errs.push('发送时间需晚于当前时间');
  }
  if (!errs.length && SD_DEMO.approval === '模板免审') {
    const free = c.channels.filter(sdIsFree);
    if (free.length) errs.push(`模板免审方式下必须使用模板（${free.join('、')} 未使用已审批模板或已修改模板内容）`);
  }
  const crowd = SD_CROWDS.find(x => x.id === c.crowd);
  const need = c.type === 'system' ? 0 : crowd.n * c.channels.length; // 系统调用按每次调用计配额
  if (!errs.length && need && SD_APP_BASE.usage + need > SD_APP_BASE.quota) errs.push(`超出接入方日配额：今日已用 ${fmtN(SD_APP_BASE.usage)}，本次约 ${fmtN(need)}，配额 ${fmtN(SD_APP_BASE.quota)}`);
  if (errs.length) {
    c.error = errs.join('；');
    sdRenderCfg();
    document.getElementById('sdCfgBody').scrollTop = 0;
    sdLog('submitFailed', { reason: c.error });
    return;
  }
  // 受理：走 6.7.3 校验与审批方式
  let finalName = name;
  let k = 2;
  while (SD_TASKS.some(t => t.name === finalName)) finalName = `${name}（${k++}）`;
  const approval = SD_DEMO.approval === '逐任务审批' ? 'pending' : 'none';
  const sys = c.type === 'system';
  const etas = sys ? [] : sdCfgEtas();
  const last = etas.slice().sort((a, b) => b.finish - a.finish)[0];
  const sched = !sys && c.timing === '定时' ? new Date(c.time) : null;
  const t = {
    id: `T20261111${++sdSeq}`, name: finalName, site: SD_CTX.siteId, channel: c.channels[0], channels: c.channels.slice(), account: '', source: 'API', app: '星灵',
    creator: SD_CTX.user, operator: SD_CTX.user, category: c.cat, status: sys ? (approval === 'pending' ? 'pending' : 'sending') : approval === 'pending' || sched ? 'pending' : 'queued', approval, taskCode: sys ? c.code : '',
    target: sys ? 0 : crowd.n, remaining: sys ? 0 : crowd.n, sched: sys ? '上游调用' : sched ? sdFmt(sched) : '立即', schedAt: sched, estStart: last ? sdFmt(last.start) : '-', estFinish: last ? sdFmt(last.finish) : '-',
    range: last ? last.range : 1, estimated: last && last.estimated, activity: SD_CTX.activityId, reserve: !sys && c.reserve, crowd: sys ? '' : c.crowd, createdAt: sdNow(), etaAt: sdNow(),
    contents: JSON.parse(JSON.stringify(Object.fromEntries(c.channels.map(ch => [ch, c.per[ch]])))),
  };
  SD_TASKS.unshift(t);
  SD_APP_BASE.usage += need;
  sdLog('submitted', { taskId: t.id, taskType: sys ? '系统调用' : '手动发送', taskCode: t.taskCode || undefined, approvalStatus: V2_APPROVAL_STATUS[approval].label, estStart: approval === 'pending' ? '审批通过后预计 3 分钟开始' : t.estStart, estFinish: approval === 'pending' ? '-' : t.estFinish });
  sdCloseConfig('submitted');
  showToast(sys ? `已保存系统调用任务：${t.code || t.taskCode} · ${V2_APPROVAL_STATUS[approval].label}` : `已提交：${t.id} · ${V2_APPROVAL_STATUS[approval].label}`);
  sdRenderStatus();
  sdRenderList();
}

/* ================= 任务状态卡片（6.8.4） ================= */
function sdEtaLine(t) {
  if (sdIsSys(t) && sdIsActive(t)) return t.approval === 'pending' ? '<b>审批通过后启用</b>，等待上游按任务code 调用' : `任务code <code>${esc(t.taskCode)}</code> · 已调用 <b>${fmtN(t.calls || 0)}</b> 次 · 最近调用 ${t.lastCall || '-'}`;
  if (t.status === 'done') return `完成时间 <b>${t.finishedAt || '-'}</b>`;
  if (t.status === 'stopped' || t.status === 'failed') return `<span class="v2-muted">${esc(t.stopReason || '')}</span>`;
  if (t.approval === 'pending') return '<b>审批通过后预计 3 分钟开始</b>';
  if (t.status === 'pending') return `预计开始 <b>${t.estStart}</b> · 预计完成 <b>${t.estFinish}</b> <span class="v2-pm">±${t.range || 1} 分</span>${t.estimated ? '<span class="v2-est">估算</span>' : ''}`;
  return `预计完成 <b>${t.estFinish}</b> <span class="v2-pm">±${t.range || 1} 分</span>${t.estimated ? '<span class="v2-est">估算</span>' : ''}`;
}

function sdScopeTasks() {
  return SD_TASKS.filter(t => t.app === SD_CTX.appName && SD_USER_SITES.includes(t.site)); // AppId ∩ 用户数据权限
}

function sdRenderStatus() {
  if (!sdReady) return;
  const list = sdScopeTasks().filter(t => !t.activity || t.activity === SD_CTX.activityId).sort((a, b) => b.createdAt - a.createdAt);
  const shown = sdShowAll ? list : list.slice(0, 3);
  const host = document.getElementById('sdkStatus');
  if (!list.length) { host.innerHTML = '<p class="v2-hint">本活动暂无触达任务，点「配置触达」创建。</p>'; return; }
  host.innerHTML = `<div class="sd-cards">${shown.map(t => {
    const { f, pct: p, failed } = sdProgress(t);
    return `<div class="sd-card ${t.approval === 'pending' && sdIsActive(t) ? 'is-wait' : ''}" data-task="${t.id}">
      <div class="sd-card-head"><b>触达任务 · ${esc(t.name)}</b><code>${t.id}</code>
        ${sdIsActive(t) ? '<span class="v2-live">每 30 秒刷新</span>' : '<span class="sd-static">已结束，不再刷新</span>'}</div>
      <div class="sd-card-row"><span>${sdChTags(t)} · ${plName(t.site)}</span>
        <span><span class="lab">类型</span>${sdIsSys(t) ? '系统调用' : '手动发送'}</span>
        <span><span class="lab">状态</span>${sdStatusTag(t)}</span>
        <span><span class="lab">审批</span>${v2Tag(V2_APPROVAL_STATUS, t.approval)}</span></div>
      ${sdIsSys(t) ? `<div class="sd-prog-row"><span>累计</span><span>调用 <b>${fmtN(t.calls || 0)}</b> 次</span><span>目标 <b>${fmtN(t.target || 0)}</b></span><span>已提交 <b>${fmtN(t.sentSum || 0)}</b></span><span class="v2-hint">每次调用的人群与时间由上游传入</span></div>` : `<div class="sd-prog-row"><span>进度</span><div class="v2-prog"><i style="width:${p}%"></i></div><b>${p}%</b>
        <span>已提交 <b>${fmtN(f.submitted)}</b> / ${fmtN(f.sendable)}</span><span>已送达 <b>${fmtN(f.delivered)}</b></span><span>失败 <b>${fmtN(failed)}</b></span></div>`}
      <div class="sd-card-foot"><span class="eta">${sdEtaLine(t)}</span>
        <span class="v2-flex"><button class="btn btn-outline btn-sm" data-view="${t.id}">查看详情</button>
        ${sdIsActive(t) ? `<button class="btn btn-outline btn-sm" data-stop="${t.id}">终止</button>` : ''}</span></div>
    </div>`;
  }).join('')}
  ${list.length > 3 ? `<div class="sd-more"><button class="link-btn" id="sdToggleAll">${sdShowAll ? '收起' : `展开全部（${list.length}）`}</button></div>` : ''}</div>`;
  host.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => sdOpenDetail(b.dataset.view)));
  host.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => sdTerminate(b.dataset.stop)));
  const tg = document.getElementById('sdToggleAll');
  if (tg) tg.addEventListener('click', () => { sdShowAll = !sdShowAll; sdRenderStatus(); });
}

function sdTerminate(id) {
  const t = sdTask(id);
  const { f } = sdProgress(t);
  v2Modal({
    title: '终止任务', okText: '确认终止', danger: true,
    body: `<p>确认终止「${esc(t.name)}」（${t.id}）？</p>
      <p class="v2-hint">终止后尚未发出的 ${fmtN(f.queued)} 条消息将取消，已提交的消息不受影响；终止不可恢复。</p>
      <div class="v2-form" style="grid-template-columns:70px minmax(0,1fr)"><label class="req">终止原因</label>
        <select class="select" id="sdStopSel"><option value="">请选择</option><option>活动调整 / 提前结束</option><option>内容有误</option><option>人群选错</option><option>其他</option></select>
        <label></label><textarea class="textarea" id="sdStopTxt" rows="2" placeholder="补充说明（选「其他」时必填）" data-char-count="off"></textarea></div>`,
    onOk: root => {
      const sel = root.querySelector('#sdStopSel').value;
      const txt = root.querySelector('#sdStopTxt').value.trim();
      if (!sel || (sel === '其他' && !txt)) { showToast('请填写终止原因'); return false; }
      const from = t.status;
      t.status = 'stopped';
      t.stopReason = `人工终止：${sel}${txt ? '，' + txt : ''}`;
      sdLog('statusChanged', { taskId: t.id, from: V2_TASK_STATUS[from].label, to: '已终止', reason: t.stopReason, operator: SD_CTX.user });
      showToast('任务已终止');
      sdRenderStatus(); sdRenderList();
      return true;
    },
  });
}

/* 30 秒轮询：模拟调度推进 */
function sdTick(manual) {
  if (!sdReady) return;
  let changed = 0;
  SD_TASKS.forEach(t => {
    if (!sdIsActive(t)) return;
    if (sdIsSys(t) && t.approval !== 'pending') { t.status = 'sending'; t.target += 12000; t.sentSum = (t.sentSum || 0) + 11640; t.calls = (t.calls || 0) + 1; t.lastCall = sdHMS(sdNow()); sdLog('called', { taskCode: t.taskCode, by: '星灵', audience: '上游传入 12,000', timing: '立即' }); changed++; return; }
    const prev = { status: t.status, approval: t.approval };
    if (t.approval === 'pending') {
      t.approval = 'approved';
      if (!t.schedAt) t.status = 'queued';
      const e = sdEtaFor(t.channels[0], t.target, t.schedAt);
      if (e) { t.estStart = sdFmt(e.start); t.estFinish = sdFmt(e.finish); t.range = e.range; }
    } else if (t.status === 'pending') {
      if (t.schedAt && t.schedAt <= sdNow()) t.status = 'queued';
    } else if (t.status === 'queued') {
      t.status = 'sending'; t.estStart = '已开始';
    } else if (t.status === 'sending') {
      t.remaining = Math.max(0, t.remaining - Math.ceil(t.target * .2));
      const e = sdEtaFor(t.channels[0], t.remaining, null);
      if (e) { t.estFinish = sdFmt(new Date(sdNow().getTime() + t.remaining * .92 / e.thr * 1000)); }
      if (!t.remaining) { t.status = 'done'; t.finishedAt = `${sdPad(sdNow().getMonth() + 1)}-${sdPad(sdNow().getDate())} ${sdHM(sdNow())}`; }
    }
    t.etaAt = sdNow();
    if (sdIsSys(t)) { t.status = t.approval === 'pending' ? 'pending' : 'sending'; t.estStart = '-'; t.estFinish = '-'; }
    if (prev.approval !== t.approval) { sdLog('approvalChanged', { taskId: t.id, from: V2_APPROVAL_STATUS[prev.approval].label, to: V2_APPROVAL_STATUS[t.approval].label }); changed++; }
    if (prev.status !== t.status) { sdLog('statusChanged', { taskId: t.id, from: V2_TASK_STATUS[prev.status].label, to: V2_TASK_STATUS[t.status].label }); changed++; }
  });
  if (manual && !changed) showToast('已刷新');
  sdRenderStatus(); sdRenderList();
  const d = document.getElementById('sdkDetailDrawer');
  if (d.classList.contains('open') && d.dataset.task) sdRenderDetail(d.dataset.task);
}

/* ================= 任务详情抽屉（6.8.5，只读） ================= */
function sdOpenDetail(id) {
  const d = document.getElementById('sdkDetailDrawer');
  d.dataset.task = id;
  sdRenderDetail(id);
  openDrawer('sdkDetailDrawer');
  sdLog('openDetail', { taskId: id });
}

function sdRenderDetail(id) {
  const t = sdTask(id);
  const f = sdFunnel(t);
  const crowd = SD_CROWDS.find(x => x.id === t.crowd) || { name: '-', n: t.target };
  const item = (k, v) => `<div class="desc-item"><span class="desc-label">${k}</span><span>${v}</span></div>`;
  const etaRow = sdIsSys(t) ? '' : sdIsActive(t)
    ? item('预计开始 / 完成', `${t.approval === 'pending' ? '审批通过后预计 3 分钟开始' : `${t.estStart} / ${t.estFinish} <span class="v2-pm">±${t.range || 1} 分</span>${t.estimated ? '<span class="v2-est">估算</span>' : ''}`} ${tipIcon('按当前通道吞吐推算，供参考；通道繁忙或供应商波动时会变化')}`) + item('更新于', sdHMS(t.etaAt || sdNow()))
    : item(t.status === 'done' ? '完成时间' : '结束说明', esc(t.status === 'done' ? (t.finishedAt || '-') : (t.stopReason || '-')));
  const row = (lab, v, base, cls = '') => `<div class="v2-fl ${cls}"><span class="lab">${lab}</span><span class="bar"><i style="width:${base ? Math.min(100, v / base * 100).toFixed(1) : 0}%"></i></span><span class="val">${fmtN(v)}</span><span class="rt">${pct(v, base)}</span></div>`;
  const filt = Object.entries(f.filters).filter(([, v]) => v).map(([k, v]) => `${k} ${fmtN(v)}`).join(' · ');
  const failTotal = f.submitFail + f.undelivered + f.expired;
  const contents = Object.entries(t.contents || {}).map(([ch, p]) => `<div class="v2-flex" style="margin-bottom:4px"><span class="tag tag-gray-outline">${ch}</span><span class="v2-hint">${p.tpl ? `模板 ${p.tpl}` : '自由文案'} · 当前文案版本 v1</span></div>
    <div class="sd-preview">${ch === '邮件' && p.subject ? `<b>主题：</b>${esc(p.subject)}\n` : ''}${esc(p.content)}</div>`).join('<div style="height:10px"></div>');
  document.getElementById('sdDetailBody').innerHTML = `
    <div class="sd-sec"><h4>基础信息</h4><div class="desc-list sd-desc-grid">
      ${item('任务 ID', t.id)}${item('任务名称', esc(t.name))}${item('接入方', `${SD_CTX.appName}（${SD_CTX.appId}）· H5 SDK`)}${item('产品线', plName(t.site))}
      ${item('通道', sdChTags(t))}${item('任务类型', sdIsSys(t) ? `系统调用 · 任务code <code>${esc(t.taskCode)}</code>` : '手动发送')}${item('活动', `${t.activity || '-'} ${t.activity === SD_CTX.activityId ? SD_CTX.activityName : ''}`)}${item('操作人', t.operator)}
      ${item('任务状态', v2Tag(V2_TASK_STATUS, t.status))}${item('审批状态', v2Tag(V2_APPROVAL_STATUS, t.approval))}${item('计划时间', t.sched)}${etaRow}
    </div></div>
    <div class="sd-sec"><h4>配置信息</h4><div class="desc-list sd-desc-grid">
      ${sdIsSys(t) ? item('人群 / 发送时机', '由上游每次调用时传入') + item('调用次数', `${fmtN(t.calls || 0)}（最近 ${t.lastCall || '-'}）`) : item('人群', `${crowd.name}（预估 ${fmtN(crowd.n)}）`) + item('发送时机', t.sched === '立即' ? '立即' : `定时 ${t.sched}`)}
      ${item('模板', Object.entries(t.contents || {}).map(([ch, p]) => `${ch}：${p.tpl || '自由文案'}`).join('；') || '-')}${item('创建时间', `${sdFmt(t.createdAt)}`)}
    </div></div>
    <div class="sd-sec"><h4>内容预览</h4>${contents || '<span class="v2-muted">-</span>'}</div>
    ${sdIsSys(t) ? `<div class="sd-sec"><h4>执行信息</h4><p class="v2-hint">系统调用任务按每次调用生成发送批次：累计调用 ${fmtN(t.calls || 0)} 次、目标 ${fmtN(t.target || 0)}、已提交 ${fmtN(t.sentSum || 0)}；每批的漏斗、预计完成见触达中心「任务记录 → 详情」。</p></div>` : `<div class="sd-sec"><h4>执行信息</h4><div class="v2-funnel">
      ${row('总数', f.total, f.total)}
      ${row('过滤排除', f.filtered, f.total, 'lv2 bad')}<div class="v2-fl-sub">${filt}</div>
      ${row('可推送', f.sendable, f.total)}
      ${row('排队待发', f.queued, f.sendable, 'lv2')}
      ${f.cancelled ? row('已取消', f.cancelled, f.sendable, 'lv2 bad') : ''}
      ${row('已提交', f.submitted, f.sendable)}
      ${row('提交失败', f.submitFail, f.sendable, 'lv2 bad')}
      ${row('已送达', f.delivered, f.submitted, 'lv2 ok')}
      ${row('未送达', f.undelivered, f.submitted, 'lv2 bad')}
      ${row('无回执', f.noReceipt, f.submitted, 'lv2')}
      ${row('待回执', f.waiting, f.submitted, 'lv2')}
    </div>
    <div class="v2-flex-between" style="margin-top:12px"><span class="v2-hint">可推送 = 总数 − 过滤排除；已提交 + 提交失败 + 排队待发${f.cancelled ? ' + 已取消' : ''} = 可推送</span>
      <button class="btn btn-outline btn-sm" id="sdFailBtn" ${failTotal ? '' : 'disabled'}><i data-lucide="list-x"></i>失败原因（${fmtN(failTotal)}）</button></div>
    <div id="sdFailBox"></div></div>`}`;
  const fb = document.getElementById('sdFailBtn');
  if (fb) fb.addEventListener('click', () => sdRenderFail(failTotal));
  refreshIcons();
}

function sdRenderFail(total) {
  const box = document.getElementById('sdFailBox');
  if (box.innerHTML) { box.innerHTML = ''; return; }
  const sum = V2_FAIL_ROWS.reduce((s, r) => s + r.count, 0);
  let left = total;
  const rows = V2_FAIL_ROWS.map((r, i) => {
    const n = i === V2_FAIL_ROWS.length - 1 ? left : Math.round(total * r.count / sum);
    left -= n;
    const cat = V2_FAIL_CATS.find(c => c.key === r.cat);
    return { cat, n, vendor: r.vendor, code: r.codes[0] };
  }).filter(r => r.n > 0);
  box.innerHTML = `<table class="table stats-table" style="margin-top:12px"><thead><tr><th>失败分类</th><th class="v2-num">条数</th><th class="v2-num">占比</th><th>主要原始码</th><th>建议动作</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${r.cat.label}</td><td class="v2-num">${fmtN(r.n)}</td><td class="v2-num">${pct(r.n, total)}</td><td><code>${r.code[0]}</code> ${esc(r.code[1])}</td><td>${r.cat.action}</td></tr>`).join('')}</tbody></table>
    <p class="v2-hint" style="margin-top:6px">本任务范围（6.3.3）；失败 = 提交失败 + 未送达 + 已过期。</p>`;
}

/* ================= 任务列表组件（6.8.6 P1） ================= */
const sdListF = { activity: '', site: '', status: '', time: '', page: 1 };
function sdRenderList() {
  if (!sdReady) return;
  const all = sdScopeTasks();
  const now = sdNow();
  const rows = all.filter(t => (!sdListF.activity || t.activity === sdListF.activity) && (!sdListF.site || t.site === sdListF.site) && (!sdListF.status || t.status === sdListF.status)
    && (!sdListF.time || (sdListF.time === 'today' ? t.createdAt.toDateString() === now.toDateString() : now - t.createdAt <= 7 * 86400e3)))
    .sort((a, b) => b.createdAt - a.createdAt);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  sdListF.page = Math.min(sdListF.page, pages);
  const shown = rows.slice((sdListF.page - 1) * 10, sdListF.page * 10);
  const acts = [...new Set(all.map(t => t.activity).filter(Boolean))];
  const sel = (id, opts, cur) => `<select class="select select-sm" id="${id}"><option value="">全部</option>${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  document.getElementById('sdkList').innerHTML = `
    <div class="sd-list-filter">
      <span>活动</span>${sel('lfAct', acts.map(a => [a, a]), sdListF.activity)}
      <span>产品线</span>${sel('lfSite', SD_USER_SITES.map(s => [s, plName(s)]), sdListF.site)}
      <span>任务状态</span>${sel('lfStatus', Object.entries(V2_TASK_STATUS).map(([k, v]) => [k, v.label]), sdListF.status)}
      <span>创建时间</span>${sel('lfTime', [['today', '今天'], ['7d', '近 7 天']], sdListF.time)}
    </div>
    <div class="table-scroll" style="max-height:none"><table class="table stats-table">
      <thead><tr><th>任务</th><th>任务类型</th><th>通道</th><th>产品线</th><th>任务状态</th><th>审批状态</th><th>进度</th><th>预计完成</th><th>操作</th></tr></thead>
      <tbody>${shown.length ? shown.map(t => {
        const { pct: p } = sdProgress(t);
        const eta = !sdIsActive(t) ? (t.status === 'done' ? `完成 ${t.finishedAt || '-'}` : '-') : t.approval === 'pending' ? '审批后约 3 分钟开始' : `${t.estFinish} <span class="v2-pm">±${t.range || 1} 分</span>${t.estimated ? '<span class="v2-est">估算</span>' : ''}`;
        return `<tr><td>${esc(t.name)}<div class="v2-hint">${t.id}</div></td><td>${sdIsSys(t) ? `系统调用<div class="v2-hint">${esc(t.taskCode)}</div>` : '手动发送'}</td><td>${sdChTags(t)}</td><td>${plName(t.site)}</td>
          <td>${sdStatusTag(t)}</td><td>${v2Tag(V2_APPROVAL_STATUS, t.approval)}</td>
          <td>${sdIsSys(t) ? `调用 ${fmtN(t.calls || 0)} 次` : `<span class="sd-mini-prog"><span class="v2-prog"><i style="width:${p}%"></i></span>${p}%</span>`}</td><td>${sdIsSys(t) ? '-' : eta}</td>
          <td><button class="link-btn" data-lview="${t.id}">详情</button>${sdIsActive(t) ? `<button class="link-btn link-btn-danger" data-lstop="${t.id}">终止</button>` : ''}</td></tr>`;
      }).join('') : '<tr><td colspan="9" class="v2-muted" style="text-align:center;padding:24px">暂无数据</td></tr>'}</tbody></table></div>
    <div class="table-footer"><div class="pagination"><span class="v2-hint" style="margin-right:8px">共 ${rows.length} 条 · 每页 10 条</span>
      ${Array.from({ length: pages }, (_, i) => `<button class="page-btn ${i + 1 === sdListF.page ? 'active' : ''}" data-lp="${i + 1}">${i + 1}</button>`).join('')}</div></div>`;
  [['lfAct', 'activity'], ['lfSite', 'site'], ['lfStatus', 'status'], ['lfTime', 'time']].forEach(([id, k]) =>
    document.getElementById(id).addEventListener('change', e => { sdListF[k] = e.target.value; sdListF.page = 1; sdRenderList(); }));
  document.querySelectorAll('[data-lview]').forEach(b => b.addEventListener('click', () => sdOpenDetail(b.dataset.lview)));
  document.querySelectorAll('[data-lstop]').forEach(b => b.addEventListener('click', () => sdTerminate(b.dataset.lstop)));
  document.querySelectorAll('[data-lp]').forEach(b => b.addEventListener('click', () => { sdListF.page = Number(b.dataset.lp); sdRenderList(); }));
}

/* ================= 配置弹窗（iframe 版） ================= */
function sdOpenFrame() {
  if (!sdReady) { showToast('触达组件不可用'); return; }
  const up = SD_UPSTREAMS[SD_UP];
  const qs = new URLSearchParams(Object.assign({ app: up.appName }, up.pass));
  sdLog('openConfig', Object.assign({ taskType: '系统调用（固定）' }, up.pass));
  document.getElementById('sdCfgFrame').src = `sdk-config.html?${qs}`;
  document.getElementById('sdCfgOverlay').hidden = false;
}
function sdCloseFrame() {
  document.getElementById('sdCfgOverlay').hidden = true;
  document.getElementById('sdCfgFrame').src = 'about:blank';
}
window.addEventListener('message', e => {
  const m = e.data;
  if (!m || m.src !== 'reach-sdk') return;
  if (m.type === 'closed') { sdLog('closed', {}); sdCloseFrame(); return; }
  if (m.type !== 'submitted') return;
  const d = m.data;
  const approval = SD_DEMO.approval === '逐任务审批' ? 'pending' : 'none';
  const chMap = {};
  const chs = d.channels.map(c => chMap[c] || c);
  const t = {
    id: `T20261112${++sdSeq}`, name: d.name, site: d.site, channel: chs[0], channels: chs, account: '', source: 'API', app: SD_CTX.appName,
    creator: SD_CTX.user, operator: SD_CTX.user, category: '营销', status: approval === 'pending' ? 'pending' : 'sending', approval, taskCode: d.taskCode,
    target: 0, remaining: 0, sched: '上游调用', schedAt: null, estStart: '-', estFinish: '-', range: 1, activity: d.activityId || '', crowd: '',
    createdAt: sdNow(), etaAt: sdNow(),
    contents: Object.fromEntries(chs.map((c, i) => [c, { tpl: '', subject: '', content: Object.values(d.contents)[i]?.text || '' }])),
  };
  SD_TASKS.unshift(t);
  sdLog('submitted', { taskId: t.id, taskType: '系统调用', taskCode: t.taskCode, siteId: t.site, activityId: t.activity || undefined, channels: chs, approvalStatus: V2_APPROVAL_STATUS[approval].label });
  sdCloseFrame();
  showToast(`已创建系统调用任务：${t.taskCode} · ${V2_APPROVAL_STATUS[approval].label}`);
  sdRenderStatus(); sdRenderList();
});

/* ================= 宿主页绑定 ================= */
function sdBindHost() {
  document.getElementById('pSite').innerHTML = V2_PRODUCT_LINES.map(p => `<option value="${p.siteId}" ${p.siteId === SD_CTX.siteId ? 'selected' : ''}>${p.siteId}${p.status !== '启用' ? '（已下线）' : ''}</option>`).join('');
  document.getElementById('hostConfigBtn').addEventListener('click', sdOpenFrame);
  document.getElementById('pUpstream').addEventListener('change', e => { SD_UP = e.target.value; sdInit(); showToast(`已切换上游：${SD_UPSTREAMS[SD_UP].appName}`); });
  document.getElementById('pReinit').addEventListener('click', () => { sdCloseConfig('reinit'); sdInit(); showToast('SDK 已重新初始化'); });
  document.getElementById('pTick').addEventListener('click', () => sdTick(true));
  document.getElementById('logClear').addEventListener('click', () => { document.getElementById('sdkLog').textContent = ''; });
  document.querySelectorAll('#sdkConfigDrawer [data-sd-close]').forEach(el => el.addEventListener('click', () => sdCloseConfig(el.classList.contains('drawer-mask') ? 'mask' : 'cancel')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') sdCloseConfig('esc'); });
  document.getElementById('sdSubmit').addEventListener('click', sdSubmit);
  document.getElementById('sdSaveTpl').addEventListener('click', () => showToast(`已提交模板审批：${sdCfg.tab} 内容（原型）`));
}

document.addEventListener('DOMContentLoaded', () => {
  sdBindHost();
  bindDrawerClose();
  sdInit();
  setInterval(() => sdTick(false), SD_POLL_MS);
  refreshIcons();
});

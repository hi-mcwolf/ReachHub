/* 系统管理（settings.html）：一个页面多 tab
 * #vendors 供应商档案（6.1.3）· #codes 失败码映射表（6.1.4）· #testers 测试账号白名单（6.1.5）
 * #approvers 审批人配置（6.10.4）· #footer 邮件 Footer / 退订（6.9.3）· #rules 检测词库与规则（6.9.4）
 * 全部为演示数据；产品线 / 账号 / 供应商 / 失败分类复用 v2-data.js */

const ST_ME = 'marvin@';
let stClock = 16 * 60 + 20;
function stNow() { stClock += 1; const h = Math.floor(stClock / 60) % 24, m = stClock % 60; return `2026-11-11 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }

/* ================= 通用小组件 ================= */
function stOpts(list, sel = '', allLabel = '') {
  const items = list.map(x => (typeof x === 'object' ? x : { v: x, l: x }));
  return (allLabel ? `<option value="">${allLabel}</option>` : '') +
    items.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(sel) ? 'selected' : ''}>${esc(o.l)}</option>`).join('');
}
function stSwitch(name, on, disabled = false) {
  return `<label class="v2-switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span></span></label>`;
}
function stMulti(name, options, selected = [], disabledVals = []) {
  return `<div class="st-multi" data-multi="${name}">${options.map(o => {
    const dis = disabledVals.includes(o.v);
    return `<label class="${dis ? 'disabled' : ''}"><input type="checkbox" value="${esc(o.v)}" ${selected.includes(o.v) ? 'checked' : ''} ${dis ? 'disabled' : ''}>${esc(o.l)}</label>`;
  }).join('')}</div>`;
}
function stMultiVal(root, name) { return [...root.querySelectorAll(`[data-multi="${name}"] input:checked`)].map(i => i.value); }
/* 表单行：label + 控件 + 错误 + 提示 */
function stRow(label, html, { req = false, hint = '', name = '' } = {}) {
  return `<label class="${req ? 'req' : ''}">${label}</label>
    <div class="st-ctl" data-f="${name}">${html}<div class="st-err"></div>${hint ? `<div class="v2-hint">${hint}</div>` : ''}</div>`;
}
function stVal(root, name) { const el = root.querySelector(`[name="${name}"]`); if (!el) return ''; return el.type === 'checkbox' ? el.checked : el.value.trim(); }
/* rules: [[name, msg|''], ...]；返回是否通过，并在字段下展示错误 */
function stCheck(root, rules) {
  root.querySelectorAll('.st-err').forEach(e => { e.textContent = ''; });
  root.querySelectorAll('.st-invalid').forEach(e => e.classList.remove('st-invalid'));
  let ok = true;
  rules.forEach(([name, msg]) => {
    if (!msg) return;
    ok = false;
    const box = root.querySelector(`[data-f="${name}"]`);
    if (!box) return;
    box.querySelector('.st-err').textContent = msg;
    const ctl = box.querySelector('.input, .select, .textarea');
    if (ctl) ctl.classList.add('st-invalid');
  });
  return ok;
}
function stStatusTag(s) { return `<span class="tag ${s === '启用' ? 'tag-success' : 'tag-gray'}">${s}</span>`; }
function stEmptyRow(cols) { return `<tr><td colspan="${cols}" class="st-empty">暂无数据</td></tr>`; }
function stFoot(n) { return `<div class="st-table-foot"><span>共 ${n} 条</span><div class="pagination"><button class="page-btn" disabled>‹</button><button class="page-btn active">1</button><button class="page-btn" disabled>›</button></div></div>`; }
function stFilterItem(label, html) { return `<div class="filter-item"><span class="filter-label">${label}</span>${html}</div>`; }
/* 停用 / 启用二次确认 */
function stConfirmToggle(item, what, extra, after) {
  const toOff = item.status === '启用';
  v2Modal({
    title: `${toOff ? '停用' : '启用'}${what}`,
    body: `<div>确认${toOff ? '停用' : '启用'}「${esc(item._label || '')}」？</div>${extra || ''}`,
    okText: toOff ? '确认停用' : '确认启用', danger: toOff, width: 520,
    onOk: () => { item.status = toOff ? '停用' : '启用'; item.updater = ST_ME; item.updated = stNow(); if (after) after(toOff); showToast(`已${toOff ? '停用' : '启用'}`); stRender(); },
  });
}
function stBlPls(bl) { return V2_PRODUCT_LINES.filter(p => p.bl === bl && p.status === '启用'); }
function stPlNames(sites) { return sites.map(plName).join('、'); }

/* ================= 6.1.3 供应商档案 ================= */
const ST_VENDOR_CHANNELS = { Smart: ['SMS'], Globe: ['SMS'], Mocean: ['SMS', 'IM'], DLink: ['SMS'], NXLink: ['SMS'], OneSignal: ['邮件'], 'Engagement Lab': ['Push'], PTX: ['IM'], Viber: ['IM'], Infobip: ['IM'], Meta: ['IM'] };
const ST_SENDER_TYPE = { SMS: 'Sender ID', 邮件: '发件人', Push: 'App', IM: '账号', 站内信: '-' };
const ST_SENDER_HINT = { SMS: '请输入 Sender ID', 邮件: '请输入发件地址', Push: '请输入 App 标识', IM: '请输入 IM 账号标识' };
const ST_BILLING = ['按条', '短信按段（GSM-7 160/153，UCS-2 70/67）'];
const ST_ALL_BP = ['bingoplus', 'arenaplus', 'gamezone', 'bp-vip'];
const ST_SENDER_PL = {
  BINGOPLUS: ['bingoplus'], ARENAPLUS: ['arenaplus'], GAMEZONE: ['gamezone'], BPVIP: ['bp-vip'], PERYA: ['perya'], PINOYPLAY: ['pinoyplay'],
  BPVERIFY: ST_ALL_BP, 'news@bingoplus.ph': ['bingoplus', 'gamezone'], 'hello@arenaplus.ph': ['arenaplus'], 'BP App': ST_ALL_BP, 'BingoPlus Viber': ['bingoplus'],
};
const ST_ACCOUNT_EXTRA = {
  'BP-01':   { key: 'bp_globe_01',     remark: 'Globe 联系人 rbabad@', updated: '2026-11-11 10:00' },
  'BP-02':   { key: 'bp_smart_01',     remark: 'Smart 合同 2026-03 续签', updated: '2026-11-10 18:20' },
  'GP-01':   { key: 'gp_dlink_01',     remark: '', updated: '2026-11-09 11:05' },
  'OTP-BP':  { key: 'bp_globe_otp',    remark: 'OTP 专用，不参与任务级调度', updated: '2026-11-08 09:30' },
  'BP-mail': { key: 'os_app_bp_7f3a',  remark: 'OneSignal 评分接口同账号', updated: '2026-11-07 15:12' },
  'BP-push': { key: 'el_bp_app',       remark: '', updated: '2026-11-05 10:40' },
  'BP-im':   { key: 'ptx_bp_viber_bm', remark: 'Viber BM', updated: '2026-11-03 14:00' },
  'BP-vbot': { key: 'viber_bp_bot', remark: 'Viber Bot（官方直连）', updated: '2026-11-03 14:00' },
  'BP-msg':  { key: 'infobip_bp_messenger', remark: 'Messenger Biz', updated: '2026-11-03 14:00' },
  'BP-msgbot': { key: 'meta_bp_page_bot', remark: 'Messenger Bot（官方直连）', updated: '2026-11-03 14:00' },
  'OTP-IM':  { key: 'mocean_bp_otp', remark: 'Viber / WhatsApp OTP', updated: '2026-11-03 14:00' },
};
const ST_ACCOUNTS = V2_ACCOUNTS.map(a => {
  const x = ST_ACCOUNT_EXTRA[a.id] || {};
  return {
    id: a.id, vendor: a.vendor, channel: a.channel, bl: a.bl, tps: a.tps, dailyCap: a.dailyCap, mode: a.mode,
    key: x.key || a.id.toLowerCase(), billing: a.channel === 'SMS' ? ST_BILLING[1] : ST_BILLING[0], receipt: 72,
    sched: a.mode === 'tasklevel', status: '启用', remark: x.remark || '', updated: x.updated || '2026-11-01 10:00', updater: ST_ME,
    senders: a.senders.map(v => ({ value: v, pls: [...(ST_SENDER_PL[v] || [])], status: '启用' })),
    logs: [{ time: '2026-10-28 10:00', user: 'system', target: '账号', content: '初始数据导入（研发按现网配置），管理员已确认' }],
  };
});
ST_ACCOUNTS.push({
  id: 'GP-02', vendor: 'NXLink', channel: 'SMS', bl: 'GP', tps: 20, dailyCap: null, mode: 'tasklevel', key: 'gp_nxlink_01', billing: ST_BILLING[1], receipt: 72,
  sched: true, status: '停用', remark: '试用期结束，暂停', updated: '2026-10-30 17:45', updater: ST_ME,
  senders: [{ value: 'PERYA', pls: ['perya'], status: '停用' }],
  logs: [{ time: '2026-10-30 17:45', user: ST_ME, target: '账号', content: '状态：启用 → 停用' }],
});
const stVendorState = { channel: '', vendor: '', bl: '', status: '', applied: {} };
const ST_IMPORT = { pending: ST_ACCOUNTS.length }; /* 初始数据导入结果待管理员确认（6.1.3） */

function stAccountRows() {
  const f = stVendorState.applied;
  const chOrder = ch => V2_CHANNELS.indexOf(ch);
  return ST_ACCOUNTS.filter(a => (!f.channel || a.channel === f.channel) && (!f.vendor || a.vendor === f.vendor) && (!f.bl || a.bl === f.bl) && (!f.status || a.status === f.status))
    .sort((a, b) => chOrder(a.channel) - chOrder(b.channel) || a.vendor.localeCompare(b.vendor) || b.updated.localeCompare(a.updated));
}
function stSchedTag(a) {
  if (a.channel !== 'SMS') return '<span class="tag tag-gray-outline">该通道暂不支持</span>';
  if (a.mode === 'otp') return '<span class="tag tag-gray-outline">OTP 独立</span>';
  return a.sched ? '<span class="tag tag-success">已开启</span>' : '<span class="tag tag-gray">已关闭</span>';
}
function stVendorsForChannel(ch) { return V2_VENDORS.filter(v => !ch || (ST_VENDOR_CHANNELS[v] || []).includes(ch)); }

function stRenderVendors(pane) {
  const s = stVendorState;
  pane.innerHTML = `
    ${ST_IMPORT.pending ? `<div class="v2-callout warn st-callout-row"><i data-lucide="alert-triangle"></i><div style="flex:1">初始数据导入结果待确认：研发按现网配置导入 ${ST_IMPORT.pending} 个账号，请核对后确认。</div><button class="btn btn-sm btn-primary" id="stImportOk">确认导入结果</button></div>` : ''}
    <section class="card filter-card"><div class="filter-row">
      ${stFilterItem('通道', `<select class="select" id="fvCh">${stOpts(V2_CHANNELS, s.channel, '全部')}</select>`)}
      ${stFilterItem('供应商', `<select class="select" id="fvVendor">${stOpts(stVendorsForChannel(s.channel), s.vendor, '全部')}</select>`)}
      ${stFilterItem('业务线', `<select class="select" id="fvBl">${stOpts(V2_BUSINESS_LINES.map(b => b.code), s.bl, '全部')}</select>`)}
      ${stFilterItem('状态', `<select class="select" id="fvStatus">${stOpts(['启用', '停用'], s.status, '全部')}</select>`)}
      <div class="filter-actions"><button class="btn btn-primary" id="fvQuery">查询</button><button class="btn btn-outline" id="fvReset">重置</button></div>
    </div></section>
    <section class="card table-card">
      <div class="table-card-head v2-flex-between"><h4 class="card-title">账号列表</h4><button class="btn btn-primary btn-sm" id="stNewAccount"><i data-lucide="plus"></i>新建账号</button></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>供应商</th><th>通道</th><th>账号名</th><th>业务线</th><th class="v2-num">TPS 上限</th><th class="v2-num">发送方标识数</th><th>任务级调度</th><th>状态</th><th>最近更新</th><th>操作</th></tr></thead>
        <tbody>${stAccountRows().map(a => `<tr>
          <td>${esc(a.vendor)}</td><td>${stChannelCell(a.channel)}</td>
          <td><button class="link-btn" data-view="${a.id}">${esc(a.id)}</button></td>
          <td><span class="tag tag-info">${a.bl}</span></td>
          <td class="v2-num">${a.tps ? fmtN(a.tps) : '-'}</td>
          <td class="v2-num">${a.senders.length}</td><td>${stSchedTag(a)}</td><td>${stStatusTag(a.status)}</td><td>${a.updated}</td>
          <td class="st-ops"><button class="link-btn" data-view="${a.id}">详情</button><button class="link-btn" data-edit="${a.id}">编辑</button><button class="link-btn ${a.status === '启用' ? 'link-btn-danger' : ''}" data-toggle="${a.id}">${a.status === '启用' ? '停用' : '启用'}</button></td>
        </tr>`).join('') || stEmptyRow(11)}</tbody>
      </table></div>
      ${stFoot(stAccountRows().length)}
    </section>`;
  const $ = id => pane.querySelector('#' + id);
  $('fvCh').addEventListener('change', e => { s.channel = e.target.value; s.vendor = ''; $('fvVendor').innerHTML = stOpts(stVendorsForChannel(s.channel), '', '全部'); });
  $('fvVendor').addEventListener('change', e => { s.vendor = e.target.value; });
  $('fvBl').addEventListener('change', e => { s.bl = e.target.value; });
  $('fvStatus').addEventListener('change', e => { s.status = e.target.value; });
  $('fvQuery').addEventListener('click', () => { s.applied = { channel: s.channel, vendor: s.vendor, bl: s.bl, status: s.status }; stRender(); });
  $('fvReset').addEventListener('click', () => { Object.assign(s, { channel: '', vendor: '', bl: '', status: '', applied: {} }); stRender(); });
  $('stNewAccount').addEventListener('click', () => stOpenAccountForm(null));
  if ($('stImportOk')) $('stImportOk').addEventListener('click', () => { ST_IMPORT.pending = 0; showToast('已确认初始数据导入结果'); stRender(); });
  pane.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => stOpenAccountDetail(b.dataset.view)));
  pane.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => stOpenAccountForm(b.dataset.edit)));
  pane.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => stToggleAccount(b.dataset.toggle)));
}
function stChannelCell(ch) {
  const icon = { SMS: 'message-square', 邮件: 'mail', Push: 'bell', 站内信: 'inbox', IM: 'message-circle' }[ch] || 'radio';
  return `<span class="v2-flex"><i data-lucide="${icon}" style="width:14px;height:14px;color:var(--text-3)"></i>${ch}</span>`;
}
function stToggleAccount(id) {
  const a = ST_ACCOUNTS.find(x => x.id === id);
  a._label = `${a.vendor} · ${a.id}`;
  const live = V2_TASKS.filter(t => t.account === id && ['pending', 'queued', 'sending'].includes(t.status));
  const extra = a.status === '启用'
    ? `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><div>停用后该账号不可被新任务选用，也不再出现在新建任务与筛选的可选项中；历史数据仍可查。<br>${live.length ? `当前有 ${live.length} 个待发送 / 排队中 / 发送中的任务（${live.map(t => t.id).join('、')}），队列中已有消息继续发完。` : '当前无进行中的任务。'}</div></div>`
    : '<div class="v2-hint">启用后账号重新出现在新建任务与筛选的可选项中。</div>';
  stConfirmToggle(a, '账号', extra, off => a.logs.unshift({ time: a.updated, user: ST_ME, target: '账号', content: `状态：${off ? '启用 → 停用' : '停用 → 启用'}` }));
}

/* 账号表单（抽屉） */
function stOpenAccountForm(id) {
  const a = id ? ST_ACCOUNTS.find(x => x.id === id) : null;
  const v = a || { vendor: '', channel: '', id: '', key: '', bl: '', tps: '', dailyCap: '', billing: ST_BILLING[0], receipt: 72, sched: true, status: '启用', remark: '', mode: 'tasklevel' };
  document.getElementById('stAccountDrawerTitle').textContent = a ? `编辑账号 · ${a.id}` : '新建账号';
  const body = document.getElementById('stAccountFormBody');
  body.innerHTML = `<div class="v2-form">
    ${stRow('供应商', `<select class="select" name="vendor" ${a ? 'disabled' : ''}>${stOpts(V2_VENDORS, v.vendor, '请选择供应商')}</select>`, { req: true, name: 'vendor', hint: a ? '创建后不可改' : '选中后通道自动带出；创建后不可改' })}
    ${stRow('通道', `<div id="stChBox"></div>`, { req: true, name: 'channel' })}
    ${stRow('账号名', `<input class="input" name="name" maxlength="50" placeholder="请输入账号名" value="${esc(v.id)}">`, { req: true, name: 'name', hint: '同供应商下唯一，≤ 50 字' })}
    ${stRow('账号标识', `<input class="input" name="key" maxlength="100" placeholder="供应商侧账号 / AppKey 标识" value="${esc(v.key)}" ${a ? 'disabled' : ''}>`, { req: true, name: 'key', hint: '创建后不可改；与发送层配置一致' })}
    ${stRow('业务线', `<select class="select" name="bl">${stOpts(V2_BUSINESS_LINES.map(b => b.code), v.bl, '请选择业务线')}</select>`, { req: true, name: 'bl', hint: '决定账号归属与队列边界' })}
    ${stRow('TPS 上限', `<div class="st-inline"><input class="input" type="number" name="tps" min="1" max="10000" value="${v.tps ?? ''}"><span class="st-unit">条 / 秒</span></div>`, { name: 'tps', hint: '1–10000；短信 / IM 必填；调度器按此分额度，修改后下一秒生效' })}

    ${stRow('计费拆分规则', `<select class="select" name="billing">${stOpts(ST_BILLING, v.billing)}</select>`, { req: true, name: 'billing', hint: '决定计费条数计算' })}
    ${stRow('回执等待窗口', `<div class="st-inline"><input class="input" type="number" name="receipt" min="1" max="168" value="${v.receipt}"><span class="st-unit">小时</span></div>`, { req: true, name: 'receipt', hint: '1–168；超窗口无回执的消息置「无回执」' })}
    ${stRow('任务级调度', `<div id="stSchedBox"></div>`, { name: 'sched' })}
    ${stRow('状态', `<div class="v2-flex">${stSwitch('status', v.status === '启用')}<span class="v2-hint">启用</span></div>`, { req: true, name: 'status' })}
    ${stRow('备注', `<textarea class="textarea" name="remark" maxlength="500" placeholder="联系人、合同等" style="min-height:72px">${esc(v.remark)}</textarea>`, { name: 'remark' })}
  </div>`;
  const vendorSel = body.querySelector('[name=vendor]');
  const paintChannel = () => {
    const vendor = vendorSel.value;
    const chs = ST_VENDOR_CHANNELS[vendor] || [];
    const box = body.querySelector('#stChBox');
    if (a) box.innerHTML = `<div class="st-readonly">${a.channel}</div>`;
    else if (chs.length > 1) box.innerHTML = `<select class="select" name="channel">${stOpts(chs, '', '请选择通道')}</select><div class="v2-hint">${vendor} 可选 ${chs.join(' 或 ')}，需手选</div>`;
    else box.innerHTML = `<div class="st-readonly">${chs[0] || '<span class="v2-muted">随供应商带出</span>'}</div><input type="hidden" name="channel" value="${chs[0] || ''}">`;
    body.querySelector('[name=billing]').value = (a ? a.billing : ((chs[0] === 'SMS') ? ST_BILLING[1] : ST_BILLING[0]));
    paintSched();
    const chSel = box.querySelector('select[name=channel]');
    if (chSel) chSel.addEventListener('change', paintSched);
  };
  const paintSched = () => {
    const ch = a ? a.channel : (body.querySelector('[name=channel]') || {}).value;
    const box = body.querySelector('#stSchedBox');
    if (ch !== 'SMS') box.innerHTML = `<div class="v2-flex">${stSwitch('sched', false, true)}<span class="v2-hint">${ch ? '该通道暂不支持（二期仅短信通道）' : '选择供应商后判断'}</span></div>`;
    else if (a && a.mode === 'otp') box.innerHTML = `<div class="v2-flex">${stSwitch('sched', false, true)}<span class="v2-hint">OTP 独立账号，不参与调度，只做态势监控</span></div>`;
    else box.innerHTML = `<div class="v2-flex">${stSwitch('sched', v.sched)}<span class="v2-hint">开启：任务级调度器按序注入；关闭：回到任务启动全量入队</span></div>`;
  };
  vendorSel.addEventListener('change', paintChannel);
  paintChannel();
  document.getElementById('stAccountSave').onclick = () => stSaveAccount(a, body);
  openDrawer('stAccountDrawer');
  refreshIcons();
}
function stSaveAccount(a, body) {
  const vendor = a ? a.vendor : stVal(body, 'vendor');
  const channel = a ? a.channel : stVal(body, 'channel');
  const name = stVal(body, 'name'), key = stVal(body, 'key'), bl = stVal(body, 'bl');
  const tps = stVal(body, 'tps'), daily = stVal(body, 'daily'), receipt = stVal(body, 'receipt');
  const dup = ST_ACCOUNTS.some(x => x !== a && x.vendor === vendor && x.id === name);
  const ok = stCheck(body, [
    ['vendor', !vendor ? '请选择供应商' : ''],
    ['channel', vendor && !channel ? '请选择通道' : ''],
    ['name', !name ? '请输入账号名' : dup ? `${vendor} 下已存在账号名「${name}」` : ''],
    ['key', !key ? '请输入账号标识' : ''],
    ['bl', !bl ? '请选择业务线' : ''],
    ['tps', (['SMS', 'IM'].includes(channel) && !tps) ? '短信 / IM 账号必填 TPS 上限' : (tps && (+tps < 1 || +tps > 10000 || !Number.isInteger(+tps))) ? 'TPS 上限需为 1–10000 的整数' : ''],
    ['receipt', (!receipt || +receipt < 1 || +receipt > 168) ? '回执等待窗口需为 1–168 小时' : ''],
  ]);
  if (!ok) return;
  const schedEl = body.querySelector('[name=sched]');
  const next = { id: name, bl, tps: tps ? +tps : null, dailyCap: daily ? +daily : null, billing: stVal(body, 'billing'), receipt: +receipt,
    sched: schedEl && !schedEl.disabled ? schedEl.checked : (a ? a.sched : false), status: stVal(body, 'status') ? '启用' : '停用', remark: stVal(body, 'remark') };
  const commit = () => {
    if (a) {
      const diff = [['账号名', a.id, next.id], ['业务线', a.bl, next.bl], ['TPS 上限', a.tps, next.tps], ['计费拆分规则', a.billing, next.billing], ['回执等待窗口', a.receipt, next.receipt],
        ['任务级调度', a.sched ? '开' : '关', next.sched ? '开' : '关'], ['状态', a.status, next.status], ['备注', a.remark, next.remark]]
        .filter(d => String(d[1] ?? '-') !== String(d[2] ?? '-')).map(d => `${d[0]}：${d[1] ?? '-'} → ${d[2] ?? '-'}`);
      Object.assign(a, next, { updated: stNow(), updater: ST_ME });
      if (diff.length) a.logs.unshift({ time: a.updated, user: ST_ME, target: '账号', content: diff.join('；') });
      showToast(diff.length ? '已保存，TPS下一秒生效' : '未做修改');
    } else {
      const acc = { ...next, vendor, channel, key, mode: channel === 'SMS' ? 'tasklevel' : 'legacy', senders: [], updated: stNow(), updater: ST_ME,
        logs: [{ time: '', user: ST_ME, target: '账号', content: '新建账号' }] };
      acc.logs[0].time = acc.updated;
      ST_ACCOUNTS.push(acc);
      showToast('账号已创建，请在详情中添加发送方标识');
      closeDrawer('stAccountDrawer');
      stRender();
      stOpenAccountDetail(acc.id, 'senders');
      return;
    }
    closeDrawer('stAccountDrawer');
    stRender();
  };
  if (a && a.sched && next.sched === false && a.channel === 'SMS') {
    v2Modal({ title: '关闭任务级调度', danger: true, okText: '确认关闭',
      body: `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><div>关闭后账号「${esc(a.id)}」回到任务启动全量入队的现状：排序 / 插队 / 占位、发送中改文案对该账号不可用；ETA 改为按队列深度估算。</div></div>`,
      onOk: commit });
  } else commit();
}

/* 账号详情（抽屉）：账号信息 / 发送方标识 / 变更记录 */
let stDetailTab = 'info';
function stOpenAccountDetail(id, tab) {
  if (tab) stDetailTab = tab; else stDetailTab = 'info';
  const a = ST_ACCOUNTS.find(x => x.id === id);
  document.getElementById('stDetailTitle').textContent = `账号详情 · ${a.vendor} · ${a.id}`;
  document.getElementById('stDetailEdit').onclick = () => { closeDrawer('stAccountDetail'); stOpenAccountForm(a.id); };
  stPaintDetail(a);
  openDrawer('stAccountDetail');
}
function stPaintDetail(a) {
  const body = document.getElementById('stDetailBody');
  const tabs = [['info', '账号信息'], ['senders', `发送方标识（${a.senders.length}）`], ['logs', '变更记录']];
  let html = `<div class="tabs st-sub-tabs">${tabs.map(([k, l]) => `<button class="tab ${k === stDetailTab ? 'active' : ''}" data-dt="${k}">${l}</button>`).join('')}</div>`;
  if (stDetailTab === 'info') {
    const d = [['供应商', a.vendor], ['通道', a.channel], ['账号名', a.id], ['账号标识', `<span class="st-mono">${esc(a.key)}</span>`], ['业务线', a.bl],
      ['TPS 上限', a.tps ? `${fmtN(a.tps)} 条 / 秒` : '-'], ['计费拆分规则', a.billing],
      ['回执等待窗口', `${a.receipt} 小时`], ['任务级调度', stSchedTag(a)], ['状态', stStatusTag(a.status)], ['备注', esc(a.remark) || '-'], ['最近更新', `${a.updated} · ${a.updater}`]];
    html += `<div class="st-detail-block"><div class="desc-list">${d.map(([k, v]) => `<div class="desc-item"><span class="desc-label">${k}</span><span>${v}</span></div>`).join('')}</div></div>`;
  } else if (stDetailTab === 'senders') {
    const type = ST_SENDER_TYPE[a.channel];
    html += `<div class="st-detail-block">
      <div class="v2-flex-between" style="margin-bottom:8px"><span class="v2-hint">关联产品线 ≥ 2 个自动标记「共用」；共用标识的消息归属以任务 site id 为准；非共用标识与任务 site id 不一致时消息打「归属不一致」标记并计入日报</span>
      <button class="btn btn-primary btn-sm" id="stAddSender"><i data-lucide="plus"></i>添加发送方标识</button></div>
      <table class="table stats-table"><thead><tr><th>标识</th><th>类型</th><th>关联产品线</th><th>共用</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${a.senders.map((s, i) => `<tr><td class="st-mono">${esc(s.value)}</td><td>${type}</td><td>${esc(stPlNames(s.pls))}</td>
        <td>${s.pls.length >= 2 ? '<span class="tag tag-primary">共用</span>' : '<span class="v2-muted">否</span>'}</td><td>${stStatusTag(s.status)}</td>
        <td class="st-ops"><button class="link-btn" data-se="${i}">编辑</button><button class="link-btn ${s.status === '启用' ? 'link-btn-danger' : ''}" data-st="${i}">${s.status === '启用' ? '停用' : '启用'}</button></td></tr>`).join('') || stEmptyRow(6)}</tbody></table></div>`;
  } else {
    html += `<div class="st-detail-block"><table class="table stats-table"><thead><tr><th>时间</th><th>操作人</th><th>对象</th><th>变更内容</th></tr></thead>
      <tbody>${a.logs.map(l => `<tr><td>${l.time}</td><td>${l.user}</td><td>${esc(l.target)}</td><td style="white-space:normal">${esc(l.content)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  body.innerHTML = html;
  body.querySelectorAll('[data-dt]').forEach(b => b.addEventListener('click', () => { stDetailTab = b.dataset.dt; stPaintDetail(a); }));
  const add = body.querySelector('#stAddSender');
  if (add) add.addEventListener('click', () => stOpenSenderForm(a, null));
  body.querySelectorAll('[data-se]').forEach(b => b.addEventListener('click', () => stOpenSenderForm(a, a.senders[+b.dataset.se])));
  body.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => {
    const s = a.senders[+b.dataset.st]; const off = s.status === '启用';
    v2Modal({ title: `${off ? '停用' : '启用'}发送方标识`, danger: off, okText: off ? '确认停用' : '确认启用',
      body: `<div>确认${off ? '停用' : '启用'}「${esc(s.value)}」？</div>${off ? '<div class="v2-hint">停用后该标识不可被新任务选用；队列中已有消息继续发完，历史数据仍可查。</div>' : ''}`,
      onOk: () => { s.status = off ? '停用' : '启用'; stLogAcc(a, `发送方标识 ${s.value}`, `状态：${off ? '启用 → 停用' : '停用 → 启用'}`); showToast(`已${off ? '停用' : '启用'}`); stPaintDetail(a); stRender(); } });
  }));
  refreshIcons();
}
function stLogAcc(a, target, content) { a.updated = stNow(); a.updater = ST_ME; a.logs.unshift({ time: a.updated, user: ST_ME, target, content }); }
function stOpenSenderForm(a, s) {
  const pls = stBlPls(a.bl).map(p => ({ v: p.siteId, l: p.name }));
  const cur = s || { value: '', pls: [], status: '启用' };
  const wide = ['邮件', 'Push'].includes(a.channel);
  v2Modal({
    title: s ? '编辑发送方标识' : '添加发送方标识', width: 600,
    body: `<div class="v2-form" id="stSenderForm">
      ${stRow('标识类型', `<div class="st-readonly">${ST_SENDER_TYPE[a.channel]}</div>`, { req: true, hint: '由账号通道决定' })}
      ${stRow('标识值', `<input class="input" name="sv" maxlength="100" placeholder="${ST_SENDER_HINT[a.channel] || '请输入'}" value="${esc(cur.value)}">`, { req: true, name: 'sv', hint: '同账号下唯一，≤ 100 字' })}
      ${stRow('关联产品线', stMulti('spl', pls, cur.pls), { req: true, name: 'spl', hint: `选择该标识服务的产品线（${a.bl} 业务线下 site id）；选 ≥ 2 个时自动勾选「共用」${wide ? '；邮件 / Push 可关联业务线下全部产品线' : ''}` })}
      ${stRow('共用', `<div class="st-readonly" id="stSharedRo"></div>`, { hint: '关联产品线 ≥ 2 为是；共用标识的消息归属以任务 site id 为准' })}
      ${stRow('状态', `<div class="v2-flex">${stSwitch('sst', cur.status === '启用')}<span class="v2-hint">启用</span></div>`, { req: true })}
    </div>`,
    onOk: root => {
      const f = root.querySelector('#stSenderForm');
      const val = stVal(f, 'sv'), sel = stMultiVal(f, 'spl');
      const dup = a.senders.some(x => x !== s && x.value === val);
      if (!stCheck(f, [['sv', !val ? '请输入标识值' : dup ? '该账号下已存在相同标识' : ''], ['spl', sel.length ? '' : '请选择关联产品线']])) return false;
      const status = stVal(f, 'sst') ? '启用' : '停用';
      if (s) {
        const changes = [];
        if (s.value !== val) changes.push(`标识值：${s.value} → ${val}`);
        if (s.pls.join() !== sel.join()) changes.push(`关联产品线：${stPlNames(s.pls)} → ${stPlNames(sel)}`);
        if (s.status !== status) changes.push(`状态：${s.status} → ${status}`);
        Object.assign(s, { value: val, pls: sel, status });
        if (changes.length) stLogAcc(a, `发送方标识 ${val}`, changes.join('；'));
      } else {
        a.senders.push({ value: val, pls: sel, status });
        stLogAcc(a, `发送方标识 ${val}`, `新增，关联 ${stPlNames(sel)}`);
      }
      showToast('发送方标识已保存');
      stPaintDetail(a); stRender();
      return true;
    },
  });
  const root = document.getElementById('v2ModalRoot');
  const paint = () => { const n = stMultiVal(root, 'spl').length; root.querySelector('#stSharedRo').innerHTML = n >= 2 ? '<span class="tag tag-primary">是</span>' : '<span class="v2-muted">否</span>'; };
  root.querySelectorAll('[data-multi="spl"] input').forEach(i => i.addEventListener('change', paint));
  paint();
}

/* ================= 6.1.4 失败码映射表 ================= */
const ST_STAGES = ['发送前拦截', '提交失败', '未送达', '过期无回执'];
const ST_CAT_SHORT = { invalid: '清洗名单', reject: '加入退订 / 屏蔽名单', content: '修改内容', carrier: '修改内容、检查发件信誉', vendor: '联系供应商 / 等待恢复', rate: '降低 TPS 或改时间', expired: '检查队列与供应商回执', unknown: '待归类' };
function stCat(key) { return V2_FAIL_CATS.find(c => c.key === key) || { label: key, action: '' }; }
const ST_CODES = [
  { vendor: 'Globe', channel: 'SMS', code: '0x0B', msg: 'Invalid destination address', stage: '未送达', cat: 'invalid', action: '清洗名单', retry: false, n30: 1357, source: '导入', status: '已确认', updater: ST_ME, updated: '2026-11-11 10:00' },
  { vendor: 'OneSignal', channel: '邮件', code: '550 5.1.1', msg: 'User unknown', stage: '未送达', cat: 'invalid', action: '清洗名单', retry: false, n30: 86, source: '导入', status: '已确认', updater: ST_ME, updated: '2026-11-10 15:20' },
  { vendor: 'Globe', channel: 'SMS', code: 'G-1102', msg: 'Invalid MSISDN', stage: '未送达', cat: 'invalid', action: '清洗名单', retry: false, n30: 980, source: '导入', status: '已确认', updater: ST_ME, updated: '2026-11-09 11:00' },
  { vendor: 'Globe', channel: 'SMS', code: 'G-1104', msg: 'Number not in service', stage: '未送达', cat: 'invalid', action: '清洗名单', retry: false, n30: 132, source: '导入', status: '已确认', updater: ST_ME, updated: '2026-11-09 11:00' },
  { vendor: 'Globe', channel: 'SMS', code: 'G-3301', msg: 'Blocked by carrier filter', stage: '未送达', cat: 'carrier', action: '修改内容、检查发件信誉', retry: false, n30: 268, source: '人工', status: '已确认', updater: 'ken@', updated: '2026-11-08 16:40' },
  { vendor: 'Globe', channel: 'SMS', code: 'G-2201', msg: 'Subscriber opted out', stage: '未送达', cat: 'reject', action: '加入退订 / 屏蔽名单', retry: false, n30: 96, source: '人工', status: '已确认', updater: 'ken@', updated: '2026-11-08 16:35' },
  { vendor: 'Smart', channel: 'SMS', code: 'S-451', msg: 'Message content rejected: keyword policy', stage: '提交失败', cat: 'content', action: '修改内容', retry: false, n30: 173, source: 'AI 建议', status: '已确认', updater: ST_ME, updated: '2026-11-07 10:12' },
  { vendor: 'Smart', channel: 'SMS', code: 'S-500', msg: 'Internal server error', stage: '提交失败', cat: 'vendor', action: '等待恢复，路由重试', retry: true, n30: 64, source: '导入', status: '已确认', updater: ST_ME, updated: '2026-11-06 09:00' },
  { vendor: 'DLink', channel: 'SMS', code: 'D-429', msg: 'Throttled', stage: '提交失败', cat: 'rate', action: '降低 TPS 或改时间', retry: true, n30: 31, source: '导入', status: '已确认', updater: ST_ME, updated: '2026-11-06 09:00' },
  { vendor: 'Globe', channel: 'SMS', code: 'EXPIRED', msg: 'Message validity period expired', stage: '过期无回执', cat: 'expired', action: '检查队列与供应商回执', retry: false, n30: 45, source: '导入', status: '已确认', updater: ST_ME, updated: '2026-11-06 09:00' },
  { vendor: 'OneSignal', channel: '邮件', code: '552 5.2.2', msg: 'Mailbox full', stage: '未送达', cat: 'expired', action: '稍后重试', retry: true, n30: 22, source: '人工', status: '已确认', updater: 'lily@', updated: '2026-11-05 14:00' },
  /* 未分类（含 AI 建议，P1） */
  { vendor: 'NXLink', channel: 'SMS', code: 'NX-77', msg: 'ERR_77 (unmapped)', stage: '未送达', cat: 'unknown', action: '待归类', retry: false, n30: 18, first: '2026-11-08 21:14', source: '人工', status: '待确认', ai: null, updater: 'system', updated: '2026-11-08 21:14' },
  { vendor: 'Smart', channel: 'SMS', code: 'S-612', msg: 'Destination barred by operator', stage: '未送达', cat: 'unknown', action: '待归类', retry: false, n30: 142, first: '2026-11-10 08:02', source: 'AI 建议', status: '待确认', ai: { cat: 'carrier', why: '描述含 barred by operator，与 G-3301 等运营商拦截类原始码语义一致' }, updater: 'system', updated: '2026-11-10 08:02' },
  { vendor: 'DLink', channel: 'SMS', code: 'D-1031', msg: 'Message flagged as spam content', stage: '提交失败', cat: 'unknown', action: '待归类', retry: false, n30: 57, first: '2026-11-09 19:30', source: 'AI 建议', status: '待确认', ai: { cat: 'content', why: '受理阶段因内容判定拒绝，属于内容被拦截' }, updater: 'system', updated: '2026-11-09 19:30' },
  { vendor: 'OneSignal', channel: '邮件', code: '554 5.7.1', msg: 'Message rejected due to local policy', stage: '未送达', cat: 'unknown', action: '待归类', retry: false, n30: 39, first: '2026-11-09 10:11', source: 'AI 建议', status: '待确认', ai: { cat: 'carrier', why: '5.7.1 为收件方策略拦截（信誉 / 垃圾判定），归运营商或平台拦截' }, updater: 'system', updated: '2026-11-09 10:11' },
  { vendor: 'Globe', channel: 'SMS', code: 'G-4290', msg: 'Rate limit exceeded for account', stage: '提交失败', cat: 'unknown', action: '待归类', retry: false, n30: 26, first: '2026-11-10 16:45', source: 'AI 建议', status: '待确认', ai: { cat: 'rate', why: '含 rate limit exceeded，与 D-429 Throttled 同类' }, updater: 'system', updated: '2026-11-10 16:45' },
  { vendor: 'Mocean', channel: 'IM', code: 'MC-1010', msg: 'Insufficient balance', stage: '提交失败', cat: 'unknown', action: '待归类', retry: false, n30: 12, first: '2026-11-11 09:20', source: 'AI 建议', status: '待确认', ai: { cat: 'vendor', why: '余额不足属供应商账号侧问题，需联系供应商 / 充值' }, updater: 'system', updated: '2026-11-11 09:20' },
  { vendor: 'Engagement Lab', channel: 'Push', code: 'EL-503', msg: 'Service temporarily unavailable', stage: '提交失败', cat: 'unknown', action: '待归类', retry: false, n30: 9, first: '2026-11-11 11:02', source: 'AI 建议', status: '待确认', ai: { cat: 'vendor', why: '5xx 网关不可用，等待恢复并路由重试' }, updater: 'system', updated: '2026-11-11 11:02' },
];
const stCodeState = { sub: 'mapped', f: {}, applied: {}, sel: new Set() };
const ST_UNCAT_THRESHOLD = 5;

function stIsUncat(c) { return c.cat === 'unknown' || c.status === '待确认'; }
function stCodeRows() {
  const f = stCodeState.applied;
  return ST_CODES.filter(c => (stCodeState.sub === 'mapped' ? !stIsUncat(c) : stIsUncat(c)))
    .filter(c => (!f.vendor || c.vendor === f.vendor) && (!f.channel || c.channel === f.channel) && (!f.stage || c.stage === f.stage) && (!f.cat || c.cat === f.cat) && (!f.code || c.code === f.code))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}
function stRenderCodes(pane) {
  const s = stCodeState, f = s.f;
  const uncat = ST_CODES.filter(stIsUncat);
  const total30 = ST_CODES.reduce((x, c) => x + c.n30, 0), unc30 = uncat.reduce((x, c) => x + c.n30, 0);
  const ratio = total30 ? unc30 / total30 * 100 : 0;
  const rows = stCodeRows();
  const isUn = s.sub === 'uncat';
  pane.innerHTML = `
    <div class="v2-callout ${ratio > ST_UNCAT_THRESHOLD ? 'warn' : ''} st-callout-row"><i data-lucide="${ratio > ST_UNCAT_THRESHOLD ? 'alert-triangle' : 'info'}"></i>
      <div>近 30 天未分类消息占比 <b>${ratio.toFixed(1)}%</b>（${fmtN(unc30)} / ${fmtN(total30)}），告警阈值 ${ST_UNCAT_THRESHOLD}%${ratio > ST_UNCAT_THRESHOLD ? '：已超阈值，请尽快归类' : ''}。未分类消息在报表中暂按「未分类」统计，归类保存后异步重算历史。</div></div>
    <section class="card v2-tabs-card st-tabs-card"><div class="tabs">
      <button class="tab ${!isUn ? 'active' : ''}" data-sub="mapped">已映射</button>
      <button class="tab ${isUn ? 'active' : ''}" data-sub="uncat">未分类 <span class="tag tag-danger st-count">${uncat.length}</span></button>
    </div></section>
    <section class="card filter-card"><div class="filter-row">
      ${stFilterItem('供应商', `<select class="select" data-ff="vendor">${stOpts(V2_VENDORS, f.vendor, '全部')}</select>`)}
      ${stFilterItem('通道', `<select class="select" data-ff="channel">${stOpts(V2_CHANNELS, f.channel, '全部')}</select>`)}
      ${stFilterItem('阶段', `<select class="select" data-ff="stage">${stOpts(ST_STAGES, f.stage, '全部')}</select>`)}
      ${stFilterItem('统一分类', `<select class="select" data-ff="cat">${stOpts(V2_FAIL_CATS.map(c => ({ v: c.key, l: c.label })), f.cat, '全部')}</select>`)}
      ${stFilterItem('原始码', `<input class="input" style="width:130px" data-ff="code" placeholder="输入原始码" value="${esc(f.code || '')}">`)}
      <div class="filter-actions"><button class="btn btn-primary" id="fcQuery">查询</button><button class="btn btn-outline" id="fcReset">重置</button></div>
    </div></section>
    <section class="card table-card">
      <div class="table-card-head"><h4 class="card-title">${isUn ? '未分类原始码' : '映射列表'}</h4>
        ${isUn ? `<div class="batch-bar" id="fcBatchBar" ${s.sel.size ? '' : 'hidden'}><span class="batch-count">已选 <b>${s.sel.size}</b> 项</span><button class="btn btn-outline btn-sm" id="fcBatch">批量归类</button><button class="btn btn-outline btn-sm" id="fcBatchAi">批量采纳 AI 建议 <span class="tag tag-gray-outline">P1</span></button></div>` : ''}
        <div class="v2-flex" style="margin-left:auto;margin-bottom:12px"><button class="btn btn-outline btn-sm" id="fcImport"><i data-lucide="upload"></i>导入</button><button class="btn btn-outline btn-sm" id="fcExport"><i data-lucide="download"></i>导出</button></div></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr>${isUn ? '<th class="col-check"><input type="checkbox" id="fcAll" aria-label="全选"></th>' : ''}<th>供应商 / 通道</th><th>原始码</th><th>原始描述</th><th>阶段</th><th>统一分类</th><th>建议动作</th><th>可重试</th><th class="v2-num">近 30 天</th>
          ${isUn ? '<th>首次出现</th><th>AI 建议分类 <span class="tag tag-gray-outline">P1</span></th>' : '<th>来源 / 状态</th><th>更新人 / 更新时间</th>'}<th>操作</th></tr></thead>
        <tbody>${rows.map(c => stCodeRow(c, isUn)).join('') || stEmptyRow(isUn ? 13 : 12)}</tbody>
      </table></div>
      ${stFoot(rows.length)}
    </section>`;
  pane.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => { s.sub = b.dataset.sub; s.sel.clear(); stRender(); }));
  pane.querySelectorAll('[data-ff]').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { f[el.dataset.ff] = el.value.trim(); }));
  pane.querySelector('#fcQuery').addEventListener('click', () => { s.applied = { ...f }; s.sel.clear(); stRender(); });
  pane.querySelector('#fcReset').addEventListener('click', () => { s.f = {}; s.applied = {}; s.sel.clear(); stRender(); });
  pane.querySelector('#fcExport').addEventListener('click', () => showToast('已导出（原型）'));
  pane.querySelector('#fcImport').addEventListener('click', stImportCodes);
  pane.querySelectorAll('[data-cedit]').forEach(b => b.addEventListener('click', () => stEditCodes([ST_CODES[+b.dataset.cedit]])));
  pane.querySelectorAll('[data-cai]').forEach(b => b.addEventListener('click', () => stAcceptAi([ST_CODES[+b.dataset.cai]])));
  pane.querySelectorAll('[data-csel]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? s.sel.add(+cb.dataset.csel) : s.sel.delete(+cb.dataset.csel); stRender(); }));
  const all = pane.querySelector('#fcAll');
  if (all) {
    all.checked = rows.length > 0 && rows.every(c => s.sel.has(ST_CODES.indexOf(c)));
    all.addEventListener('change', () => { rows.forEach(c => (all.checked ? s.sel.add(ST_CODES.indexOf(c)) : s.sel.delete(ST_CODES.indexOf(c)))); stRender(); });
  }
  const sel = () => [...s.sel].map(i => ST_CODES[i]);
  if (pane.querySelector('#fcBatch')) pane.querySelector('#fcBatch').addEventListener('click', () => stEditCodes(sel()));
  if (pane.querySelector('#fcBatchAi')) pane.querySelector('#fcBatchAi').addEventListener('click', () => {
    const list = sel().filter(c => c.ai);
    if (!list.length) { showToast('所选记录暂无 AI 建议'); return; }
    stAcceptAi(list);
  });
}
function stCodeRow(c, isUn) {
  const i = ST_CODES.indexOf(c);
  const cat = stCat(c.cat);
  const recalc = c.recalc === 'running' ? ' <span class="tag tag-orange">历史重算中</span>' : c.recalc === 'done' ? ' <span class="tag tag-success">已重算</span>' : '';
  const catCell = c.cat === 'unknown' ? '<span class="tag tag-gray">未分类</span>' : `<span title="${esc(cat.action)}">${esc(cat.label)}</span>`;
  const tail = isUn
    ? `<td class="st-2l">${c.first ? `${c.first.slice(0, 10)}<small>${c.first.slice(11)}</small>` : '-'}</td><td>${c.ai ? `<div class="st-ai"><span><span class="tag tag-ai"><i data-lucide="sparkles"></i>AI</span> ${esc(stCat(c.ai.cat).label)}</span><span class="why">${esc(c.ai.why)}</span></div>` : '<span class="v2-muted">暂无建议</span>'}</td>
       <td class="st-ops"><button class="link-btn" data-cedit="${i}">归类</button>${c.ai ? `<button class="link-btn" data-cai="${i}" title="一键采纳 AI 建议分类">采纳</button>` : ''}</td>`
    : `<td class="st-2l">${c.source}<small>${c.status}</small></td><td class="st-2l">${c.updater}<small>${c.updated}</small></td><td class="st-ops"><button class="link-btn" data-cedit="${i}">编辑</button></td>`;
  return `<tr>${isUn ? `<td class="col-check"><input type="checkbox" data-csel="${i}" ${stCodeState.sel.has(i) ? 'checked' : ''}></td>` : ''}
    <td class="st-2l">${esc(c.vendor)}<small>${c.channel}</small></td><td class="st-mono">${esc(c.code)}</td><td><span class="st-trunc" title="${esc(c.msg)}">${esc(c.msg)}</span></td>
    <td>${c.stage}</td><td>${catCell}${recalc}</td><td><span class="st-trunc" style="max-width:120px" title="${esc(c.action)}">${esc(c.action)}</span></td><td>${c.retry ? '是' : '否'}</td>
    <td class="v2-num">${fmtN(c.n30)}</td>${tail}</tr>`;
}
/* 编辑 / 归类 / 批量归类：保存后提示历史重算 */
function stEditCodes(list) {
  const one = list.length === 1 ? list[0] : null;
  const init = one && one.cat !== 'unknown' ? one : { stage: one ? one.stage : '未送达', cat: '', action: '', retry: false };
  const cats = V2_FAIL_CATS.filter(c => c.key !== 'unknown').map(c => ({ v: c.key, l: c.label }));
  v2Modal({
    title: one ? (one.cat === 'unknown' ? '归类原始码' : '编辑映射') : `批量归类（${list.length} 条）`, width: 620, okText: '保存',
    body: `${one ? `<div class="v2-note">${esc(one.vendor)} / ${one.channel} · <span class="st-mono">${esc(one.code)}</span> · ${esc(one.msg)}</div>` : `<div class="v2-note">${list.map(c => `${esc(c.vendor)} · ${esc(c.code)}`).join('；')}</div>`}
      ${one && one.ai ? `<div class="v2-callout"><i data-lucide="sparkles"></i><div>AI 建议：<b>${esc(stCat(one.ai.cat).label)}</b> — ${esc(one.ai.why)} <button class="link-btn" id="stUseAi">一键采纳</button></div></div>` : ''}
      <div class="v2-form" id="stCodeForm">
        ${stRow('阶段', `<select class="select" name="stage">${stOpts(ST_STAGES, init.stage)}</select>`, { req: true, name: 'stage' })}
        ${stRow('统一分类', `<select class="select" name="cat">${stOpts(cats, init.cat, '请选择统一分类')}</select>`, { req: true, name: 'cat' })}
        ${stRow('建议动作', `<input class="input" name="action" maxlength="100" value="${esc(init.action)}" placeholder="默认取分类默认动作">`, { req: true, name: 'action', hint: '≤ 100 字，默认取分类默认动作' })}
        ${stRow('可重试', `<div class="radio-group"><label><input type="radio" name="retry" value="1" ${init.retry ? 'checked' : ''}>是</label><label><input type="radio" name="retry" value="0" ${init.retry ? '' : 'checked'}>否</label></div>`, { hint: '供路由与运营参考' })}
      </div>
      <div class="v2-callout warn"><i data-lucide="refresh-cw"></i><div>保存后将对${one ? '该供应商该原始码' : `所选 ${list.length} 个原始码`}的全部历史消息重算失败分类（近 30 天 ${fmtN(list.reduce((x, c) => x + c.n30, 0))} 条），异步执行，完成后通知你；报表按重算后展示。</div></div>`,
    onOk: root => {
      const f = root.querySelector('#stCodeForm');
      const cat = stVal(f, 'cat'), action = stVal(f, 'action');
      if (!stCheck(f, [['cat', cat ? '' : '请选择统一分类'], ['action', action ? '' : '请输入建议动作']])) return false;
      const retry = f.querySelector('[name=retry]:checked').value === '1';
      const usedAi = root.dataset.usedAi === '1';
      list.forEach(c => Object.assign(c, { stage: stVal(f, 'stage'), cat, action, retry, status: '已确认', source: usedAi ? 'AI 建议' : '人工', updater: ST_ME, updated: stNow() }));
      stStartRecalc(list);
      return true;
    },
  });
  const root = document.getElementById('v2ModalRoot');
  const f = root.querySelector('#stCodeForm');
  const catSel = f.querySelector('[name=cat]');
  catSel.addEventListener('change', () => { f.querySelector('[name=action]').value = ST_CAT_SHORT[catSel.value] || ''; });
  const useAi = root.querySelector('#stUseAi');
  if (useAi) useAi.addEventListener('click', () => { catSel.value = one.ai.cat; f.querySelector('[name=action]').value = ST_CAT_SHORT[one.ai.cat]; root.dataset.usedAi = '1'; showToast('已填入 AI 建议，确认后保存'); });
}
function stAcceptAi(list) {
  v2Modal({
    title: `采纳 AI 建议（${list.length} 条）`, okText: '确认采纳', width: 600,
    body: `<table class="table stats-table"><thead><tr><th>供应商</th><th>原始码</th><th>AI 建议分类</th><th>建议动作</th></tr></thead><tbody>
      ${list.map(c => `<tr><td>${esc(c.vendor)}</td><td class="st-mono">${esc(c.code)}</td><td>${esc(stCat(c.ai.cat).label)}</td><td>${esc(ST_CAT_SHORT[c.ai.cat])}</td></tr>`).join('')}</tbody></table>
      <div class="v2-callout warn"><i data-lucide="refresh-cw"></i><div>采纳后记为「AI 建议 / 已确认」，并异步重算这些原始码的历史消息失败分类（近 30 天 ${fmtN(list.reduce((x, c) => x + c.n30, 0))} 条），完成后通知你。</div></div>`,
    onOk: () => {
      list.forEach(c => Object.assign(c, { cat: c.ai.cat, action: ST_CAT_SHORT[c.ai.cat], retry: c.ai.cat === 'vendor' || c.ai.cat === 'rate', source: 'AI 建议', status: '已确认', updater: ST_ME, updated: stNow() }));
      stStartRecalc(list);
    },
  });
}
function stStartRecalc(list) {
  list.forEach(c => { c.recalc = 'running'; });
  stCodeState.sel.clear();
  showToast(`已保存，历史重算已提交（${list.length} 个原始码，异步执行）`);
  stRender();
  setTimeout(() => {
    list.forEach(c => { c.recalc = 'done'; });
    showToast(`历史重算完成：${list.map(c => c.code).join('、')}，报表已更新`);
    if (stCurrentTab() === 'codes') stRender();
  }, 2500);
}
function stImportCodes() {
  v2Modal({
    title: '导入失败码映射', okText: '导入', width: 560,
    body: `<div class="v2-hint">CSV 列：供应商、通道、原始码、原始描述、阶段、分类、建议动作、可重试；以 供应商 + 通道 + 原始码 为唯一键，已存在的按导入覆盖。</div>
      <input type="file" accept=".csv" class="input" style="height:auto;padding:6px"><button class="link-btn" type="button" onclick="showToast('已下载模板（原型）')">下载 CSV 模板</button>`,
    onOk: () => { showToast('导入完成（原型）：新增 0 条，覆盖 0 条'); },
  });
}

/* ================= 6.1.5 测试账号白名单 ================= */
const ST_TESTER_TYPES = ['手机号', '邮箱', '用户 ID', '设备 token'];
const ST_TESTERS = [
  { type: '手机号', value: '09171234567', bls: ['BP'], remark: '运营 A 测试机', status: '启用', updater: ST_ME, updated: '2026-11-10 10:20' },
  { type: '手机号', value: '09281112233', bls: [], remark: 'QA 共用测试机', status: '启用', updater: 'ken@', updated: '2026-11-09 14:05' },
  { type: '邮箱', value: 'qa.reach@digiplus.ph', bls: [], remark: '邮件检测验收', status: '启用', updater: ST_ME, updated: '2026-11-08 09:40' },
  { type: '用户 ID', value: '100238841', bls: ['BP'], remark: 'lily@ 站内信测试', status: '启用', updater: 'lily@', updated: '2026-11-06 17:30' },
  { type: '设备 token', value: 'fcm:dK3x9Q2bR7tL0pVz8mWnYc', bls: ['BP'], remark: 'Push 测试 iPhone 13', status: '启用', updater: 'lily@', updated: '2026-11-05 11:00' },
  { type: '手机号', value: '09995550101', bls: ['GP'], remark: '已离职员工测试机', status: '停用', updater: ST_ME, updated: '2026-10-30 18:00' },
];
const stTesterState = { f: {}, applied: {} };
const ST_TESTER_RULE = {
  '手机号': [/^(09\d{9}|\+639\d{9})$/, '手机号格式错误，应为 09 开头 11 位或 +639 开头'],
  '邮箱': [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '邮箱格式错误'],
  '用户 ID': [/^\d{4,20}$/, '用户 ID 应为 4–20 位数字'],
  '设备 token': [/^\S{16,}$/, '设备 token 至少 16 位且不含空格'],
};
const ST_TESTER_PH = { '手机号': '如 09171234567', '邮箱': '如 qa@digiplus.ph', '用户 ID': '如 100238841', '设备 token': '粘贴设备 token' };
function stRenderTesters(pane) {
  const s = stTesterState, f = s.f, a = s.applied;
  const rows = ST_TESTERS.filter(t => (!a.type || t.type === a.type) && (!a.bl || !t.bls.length || t.bls.includes(a.bl)) && (!a.status || t.status === a.status) && (!a.kw || t.value.includes(a.kw)))
    .sort((x, y) => y.updated.localeCompare(x.updated));
  pane.innerHTML = `
    <section class="card filter-card"><div class="filter-row">
      ${stFilterItem('账号类型', `<select class="select" data-ff="type">${stOpts(ST_TESTER_TYPES, f.type, '全部')}</select>`)}
      ${stFilterItem('账号值', `<input class="input" style="width:180px" data-ff="kw" placeholder="请输入" value="${esc(f.kw || '')}">`)}
      ${stFilterItem('业务线', `<select class="select" data-ff="bl">${stOpts(V2_BUSINESS_LINES.map(b => b.code), f.bl, '全部')}</select>`)}
      ${stFilterItem('状态', `<select class="select" data-ff="status">${stOpts(['启用', '停用'], f.status, '全部')}</select>`)}
      <div class="filter-actions"><button class="btn btn-primary" data-q>查询</button><button class="btn btn-outline" data-r>重置</button></div>
    </div></section>
    <section class="card table-card">
      <div class="table-card-head v2-flex-between"><div><h4 class="card-title" style="margin-bottom:4px">测试账号</h4><div class="v2-hint" style="margin-bottom:12px">命中白名单的消息标记为测试消息：正常发送，但不计入报表、配额、额度与频控历史；对手动与 API 任务均生效。</div></div>
        <button class="btn btn-primary btn-sm" id="stNewTester"><i data-lucide="plus"></i>新建</button></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>账号类型</th><th>账号值</th><th>业务线</th><th>备注</th><th>状态</th><th>更新人</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>${rows.map(t => `<tr><td>${t.type}</td><td class="st-mono">${esc(t.value)}</td><td>${t.bls.length ? t.bls.map(b => `<span class="tag tag-info">${b}</span>`).join(' ') : '<span class="v2-muted">全部</span>'}</td>
          <td>${esc(t.remark) || '-'}</td><td>${stStatusTag(t.status)}</td><td>${t.updater}</td><td>${t.updated}</td>
          <td class="st-ops"><button class="link-btn" data-te="${ST_TESTERS.indexOf(t)}">编辑</button><button class="link-btn ${t.status === '启用' ? 'link-btn-danger' : ''}" data-tt="${ST_TESTERS.indexOf(t)}">${t.status === '启用' ? '停用' : '启用'}</button></td></tr>`).join('') || stEmptyRow(8)}</tbody>
      </table></div>${stFoot(rows.length)}
    </section>`;
  stBindSimpleFilter(pane, s);
  pane.querySelector('#stNewTester').addEventListener('click', () => stOpenTesterForm(null));
  pane.querySelectorAll('[data-te]').forEach(b => b.addEventListener('click', () => stOpenTesterForm(ST_TESTERS[+b.dataset.te])));
  pane.querySelectorAll('[data-tt]').forEach(b => b.addEventListener('click', () => {
    const t = ST_TESTERS[+b.dataset.tt]; t._label = `${t.type} ${t.value}`;
    stConfirmToggle(t, '测试账号', t.status === '启用' ? '<div class="v2-hint">停用后该账号的消息不再标记为测试消息，将正常计入报表、配额与频控历史。</div>' : '<div class="v2-hint">启用后该账号的消息标记为测试消息，不计入报表、配额与频控历史。</div>');
  }));
}
function stBindSimpleFilter(pane, s) {
  pane.querySelectorAll('[data-ff]').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { s.f[el.dataset.ff] = el.value.trim(); }));
  pane.querySelector('[data-q]').addEventListener('click', () => { s.applied = { ...s.f }; stRender(); });
  pane.querySelector('[data-r]').addEventListener('click', () => { s.f = {}; s.applied = {}; stRender(); });
}
function stOpenTesterForm(t) {
  const v = t || { type: '手机号', value: '', bls: [], remark: '', status: '启用' };
  v2Modal({
    title: t ? '编辑测试账号' : '新建测试账号', width: 580, okText: '保存',
    body: `<div class="v2-form" id="stTesterForm">
      ${stRow('账号类型', `<select class="select" name="type">${stOpts(ST_TESTER_TYPES, v.type)}</select>`, { req: true, name: 'type' })}
      ${stRow('账号值', `<input class="input" name="value" placeholder="${ST_TESTER_PH[v.type]}" value="${esc(v.value)}">`, { req: true, name: 'value', hint: '按类型校验格式；同类型下唯一' })}
      ${stRow('业务线', stMulti('bls', V2_BUSINESS_LINES.map(b => ({ v: b.code, l: b.code })), v.bls), { name: 'bls', hint: '留空对全部业务线生效' })}
      ${stRow('备注', `<input class="input" name="remark" maxlength="100" placeholder="使用人 / 用途" value="${esc(v.remark)}">`, { name: 'remark', hint: '≤ 100 字' })}
      ${stRow('状态', `<div class="v2-flex">${stSwitch('status', v.status === '启用')}<span class="v2-hint">启用</span></div>`, { req: true })}
    </div>`,
    onOk: root => {
      const f = root.querySelector('#stTesterForm');
      const type = stVal(f, 'type'), value = stVal(f, 'value');
      const [re, msg] = ST_TESTER_RULE[type];
      const dup = ST_TESTERS.some(x => x !== t && x.type === type && x.value === value);
      if (!stCheck(f, [['value', !value ? '请输入账号值' : !re.test(value) ? msg : dup ? `该${type}已在白名单中` : '']])) return false;
      const next = { type, value, bls: stMultiVal(f, 'bls'), remark: stVal(f, 'remark'), status: stVal(f, 'status') ? '启用' : '停用', updater: ST_ME, updated: stNow() };
      if (t) Object.assign(t, next); else ST_TESTERS.push(next);
      showToast('已保存'); stRender();
      return true;
    },
  });
  const f = document.querySelector('#stTesterForm');
  f.querySelector('[name=type]').addEventListener('change', e => { f.querySelector('[name=value]').placeholder = ST_TESTER_PH[e.target.value]; });
}

/* ================= 6.10.4 审批人配置 ================= */
const ST_USERS = ['marvin@', 'ken@', 'lily@', 'ann@', 'jay@', 'mia@', 'leo@'];
const ST_ALL_SITES = V2_PRODUCT_LINES.filter(p => p.status === '启用').map(p => p.siteId);
/* 用户数据权限（6.11）：可见 site id */
const ST_USER_SITES = {
  'marvin@': ST_ALL_SITES, 'ken@': ST_ALL_BP, 'lily@': ['bingoplus', 'arenaplus', 'bp-vip'], 'ann@': ['gamezone', 'perya', 'pinoyplay'],
  'jay@': ['bingoplus', 'perya', 'pinoyplay'], 'mia@': ['bingoplus'], 'leo@': ['perya'],
};
const ST_APPLIES = ['任务', '模板', '内容变更'];
const ST_APPROVERS = [
  { kind: '用户', applicant: 'lily@', sites: ['bingoplus'], approvers: ['marvin@', 'ken@'], applies: ['任务', '模板'], status: '启用', updater: ST_ME, updated: '2026-11-10 15:00' },
  { kind: '接入方', applicant: '星灵', sites: ['*'], approvers: ['lily@'], applies: ['任务'], status: '启用', updater: ST_ME, updated: '2026-11-09 10:30' },
  { kind: '用户', applicant: 'lily@', sites: ['arenaplus', 'bp-vip'], approvers: ['ken@'], applies: ['任务', '模板', '内容变更'], status: '启用', updater: ST_ME, updated: '2026-11-08 18:10' },
  { kind: '用户', applicant: 'ann@', sites: ['gamezone'], approvers: ['ken@'], applies: ['任务', '模板'], status: '启用', updater: ST_ME, updated: '2026-11-08 11:20' },
  { kind: '用户', applicant: 'ann@', sites: ['perya', 'pinoyplay'], approvers: ['jay@'], applies: ['任务', '模板'], status: '启用', updater: ST_ME, updated: '2026-11-07 09:50' },
  { kind: '接入方', applicant: '风控平台', sites: ['bingoplus'], approvers: ['marvin@', 'mia@'], applies: ['任务'], status: '启用', updater: ST_ME, updated: '2026-11-06 16:00' },
  { kind: '用户', applicant: 'ken@', sites: ['*'], approvers: ['marvin@'], applies: ['任务', '模板', '内容变更'], status: '停用', updater: ST_ME, updated: '2026-10-29 10:00' },
];
const stApprState = { f: {}, applied: {} };
function stApplicantSites(kind, name) {
  if (kind === '接入方') { const app = V2_APPS.find(x => x.name === name); return app ? V2_PRODUCT_LINES.filter(p => app.bls.includes(p.bl) && p.status === '启用').map(p => p.siteId) : []; }
  return ST_USER_SITES[name] || [];
}
function stScopeText(r) {
  if (r.sites[0] !== '*') return stPlNames(r.sites);
  if (r.kind === '接入方') { const app = V2_APPS.find(x => x.name === r.applicant); return app ? `${app.bls.join(' / ')} 全部` : '全部'; }
  return '全部（数据权限内）';
}
function stRenderApprovers(pane) {
  const s = stApprState, f = s.f, a = s.applied;
  const rows = ST_APPROVERS.filter(r => (!a.applicant || r.applicant.includes(a.applicant)) && (!a.approver || r.approvers.some(x => x.includes(a.approver)))
    && (!a.site || r.sites.includes(a.site) || (r.sites[0] === '*' && stApplicantSites(r.kind, r.applicant).includes(a.site))) && (!a.status || r.status === a.status))
    .sort((x, y) => y.updated.localeCompare(x.updated));
  pane.innerHTML = `
    <section class="card filter-card"><div class="filter-row">
      ${stFilterItem('申请人', `<input class="input" style="width:140px" data-ff="applicant" placeholder="用户或接入方" value="${esc(f.applicant || '')}">`)}
      ${stFilterItem('审批人', `<input class="input" style="width:140px" data-ff="approver" placeholder="请输入" value="${esc(f.approver || '')}">`)}
      ${stFilterItem('产品线', `<select class="select" data-ff="site">${stOpts(V2_PRODUCT_LINES.filter(p => p.status === '启用').map(p => ({ v: p.siteId, l: p.name })), f.site, '全部')}</select>`)}
      ${stFilterItem('状态', `<select class="select" data-ff="status">${stOpts(['启用', '停用'], f.status, '全部')}</select>`)}
      <div class="filter-actions"><button class="btn btn-primary" data-q>查询</button><button class="btn btn-outline" data-r>重置</button></div>
    </div></section>
    <section class="card table-card">
      <div class="table-card-head v2-flex-between"><div><h4 class="card-title" style="margin-bottom:4px">审批人配置</h4><div class="v2-hint" style="margin-bottom:12px">申请人无配置时不能提交，并提示联系管理员；修改审批人不影响已进入待审批的单据；首页审批信息区读取本配置。</div></div>
        <button class="btn btn-primary btn-sm" id="stNewAppr"><i data-lucide="plus"></i>新建</button></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>申请人</th><th>产品线范围</th><th>审批人（任一通过）</th><th>适用对象</th><th>状态</th><th>更新</th><th>操作</th></tr></thead>
        <tbody>${rows.map(r => { const i = ST_APPROVERS.indexOf(r); return `<tr>
          <td>${esc(r.applicant)}${r.kind === '接入方' ? ' <span class="tag tag-gray-outline">接入方</span>' : ''}</td>
          <td>${esc(stScopeText(r))}</td><td>${r.approvers.join(', ')}</td>
          <td>${r.applies.join(' · ')}${r.kind === '接入方' ? '<span class="v2-muted">（API）</span>' : ''}</td><td>${stStatusTag(r.status)}</td><td>${r.updater} · ${r.updated}</td>
          <td class="st-ops"><button class="link-btn" data-ae="${i}">编辑</button><button class="link-btn ${r.status === '启用' ? 'link-btn-danger' : ''}" data-at="${i}">${r.status === '启用' ? '停用' : '启用'}</button></td></tr>`; }).join('') || stEmptyRow(7)}</tbody>
      </table></div>${stFoot(rows.length)}
    </section>`;
  stBindSimpleFilter(pane, s);
  pane.querySelector('#stNewAppr').addEventListener('click', () => stOpenApprForm(null));
  pane.querySelectorAll('[data-ae]').forEach(b => b.addEventListener('click', () => stOpenApprForm(ST_APPROVERS[+b.dataset.ae])));
  pane.querySelectorAll('[data-at]').forEach(b => b.addEventListener('click', () => {
    const r = ST_APPROVERS[+b.dataset.at]; r._label = `${r.applicant} · ${stScopeText(r)}`;
    stConfirmToggle(r, '审批人配置', r.status === '启用'
      ? `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><div>停用后「${esc(r.applicant)}」在 ${esc(stScopeText(r))} 若无其他启用配置，将不能提交${r.applies.join(' / ')}（提示联系管理员）；已进入待审批的单据不受影响。</div></div>`
      : '<div class="v2-hint">启用后新提交的单据按本配置流转。</div>');
  }));
}
function stOpenApprForm(r) {
  const v = r || { kind: '用户', applicant: '', sites: ['*'], approvers: [], applies: ['任务', '模板'], status: '启用' };
  const appNames = V2_APPS.filter(x => x.status === '启用').map(x => x.name);
  v2Modal({
    title: r ? '编辑审批人配置' : '新建审批人配置', width: 660, okText: '保存',
    body: `<div class="v2-form" id="stApprForm">
      ${stRow('申请人', `<div class="st-inline"><select class="select" name="kind" style="width:110px;flex:none">${stOpts(['用户', '接入方'], v.kind)}</select><select class="select" name="applicant"></select></div>`, { req: true, name: 'applicant', hint: '选择用户或接入方；接入方的审批人配置与 6.7.2「审批人」同一份数据' })}
      ${stRow('产品线范围', `<div id="stApprSites"></div>`, { req: true, name: 'sites', hint: '申请人数据权限内 site id；申请人在不同产品线可配不同审批人' })}
      ${stRow('审批人', stMulti('approvers', ST_USERS.map(u => ({ v: u, l: u })), v.approvers), { req: true, name: 'approvers', hint: '任一通过即通过；审批人需有对应产品线数据权限' })}
      ${stRow('适用对象', stMulti('applies', ST_APPLIES.map(x => ({ v: x, l: x })), v.applies), { req: true, name: 'applies', hint: '内容变更 = 发送中改文案（6.10.2）' })}
      ${stRow('状态', `<div class="v2-flex">${stSwitch('status', v.status === '启用')}<span class="v2-hint">启用</span></div>`, { req: true })}
    </div>`,
    onOk: root => {
      const f = root.querySelector('#stApprForm');
      const kind = stVal(f, 'kind'), applicant = stVal(f, 'applicant');
      const sitesSel = stMultiVal(f, 'sites');
      const sites = sitesSel.includes('*') ? ['*'] : sitesSel;
      const approvers = stMultiVal(f, 'approvers'), applies = stMultiVal(f, 'applies');
      const scope = sites[0] === '*' ? stApplicantSites(kind, applicant) : sites;
      const lack = approvers.map(u => [u, scope.filter(s => !(ST_USER_SITES[u] || []).includes(s))]).filter(x => x[1].length);
      const self = kind === '用户' && approvers.includes(applicant);
      if (!stCheck(f, [
        ['applicant', applicant ? '' : '请选择申请人'], ['sites', sites.length ? '' : '请选择产品线范围'],
        ['approvers', !approvers.length ? '请选择审批人' : self ? '审批人不能是申请人本人' : lack.length ? lack.map(([u, ss]) => `${u} 无 ${stPlNames(ss)} 数据权限`).join('；') : ''],
        ['applies', applies.length ? '' : '请选择适用对象'],
      ])) return false;
      const next = { kind, applicant, sites, approvers, applies, status: stVal(f, 'status') ? '启用' : '停用', updater: ST_ME, updated: stNow() };
      if (r) Object.assign(r, next); else ST_APPROVERS.push(next);
      showToast(r ? '已保存；已进入待审批的单据不受影响' : '已新建'); stRender();
      return true;
    },
  });
  const f = document.querySelector('#stApprForm');
  const kindSel = f.querySelector('[name=kind]'), appSel = f.querySelector('[name=applicant]');
  const paintApplicant = keep => { const list = kindSel.value === '接入方' ? appNames : ST_USERS; appSel.innerHTML = stOpts(list, keep, kindSel.value === '接入方' ? '选择接入方' : '选择用户'); };
  const paintSites = keepSel => {
    const allowed = stApplicantSites(kindSel.value, appSel.value);
    const opts = [{ v: '*', l: '全部' }, ...allowed.map(s => ({ v: s, l: plName(s) }))];
    f.querySelector('#stApprSites').innerHTML = appSel.value ? stMulti('sites', opts, keepSel) : '<span class="v2-muted" style="font-size:13px">请先选择申请人</span>';
  };
  kindSel.addEventListener('change', () => { paintApplicant(''); paintSites(['*']); });
  appSel.addEventListener('change', () => paintSites(['*']));
  paintApplicant(v.applicant); paintSites(v.sites);
}

/* ================= 6.9.3 邮件 Footer 与退订名单 ================= */
const ST_FOOTER_BASE = {
  address: 'DigiPlus Interactive Corp., 11F Net Park Building, 5th Ave, Bonifacio Global City, Taguig 1634, Philippines',
  license: 'Licensed and regulated by PAGCOR. License No. PAGCOR-OGL-2024-0117.',
  rg: '18+ only. Play responsibly. Gambling can be addictive — know your limits and seek help at pagcor.ph/responsible-gaming.',
  unsub: 'Unsubscribe', entity: 'DigiPlus Interactive Corp.',
};
const ST_FOOTERS = [
  { site: 'bingoplus', name: 'v3 2026-11', ...ST_FOOTER_BASE, tpl: 18, status: '启用', updater: ST_ME, updated: '2026-11-10 14:00' },
  { site: 'bingoplus', name: 'v2 2026-08', ...ST_FOOTER_BASE, license: 'Licensed by PAGCOR. License No. PAGCOR-OGL-2023-0088.', tpl: 4, status: '停用', updater: ST_ME, updated: '2026-11-10 14:02' },
  { site: 'arenaplus', name: 'v2 2026-10', ...ST_FOOTER_BASE, rg: '18+. Bet responsibly. ArenaPlus promotes responsible gaming.', tpl: 9, status: '启用', updater: 'lily@', updated: '2026-10-21 10:00' },
  { site: 'gamezone', name: 'v1 2026-07', ...ST_FOOTER_BASE, tpl: 5, status: '启用', updater: 'ann@', updated: '2026-07-15 09:00' },
  { site: 'bp-vip', name: 'v1 2026-07', ...ST_FOOTER_BASE, tpl: 3, status: '启用', updater: 'lily@', updated: '2026-07-15 09:10' },
  { site: 'perya', name: 'v1 2026-07', ...ST_FOOTER_BASE, entity: 'Perya Game Entertainment Inc.', tpl: 6, status: '启用', updater: 'ann@', updated: '2026-07-16 11:00' },
  { site: 'pinoyplay', name: 'v1 2026-08', ...ST_FOOTER_BASE, entity: 'PinoyPlay Gaming Corp.', tpl: 2, status: '启用', updater: 'ann@', updated: '2026-08-02 16:00' },
];
const ST_UNSUBS = [
  { email: 'juan.dc@gmail.com', site: 'bingoplus', time: '2026-11-11 09:12', source: '退订链接', reason: 'Too many emails' },
  { email: 'maria.santos@yahoo.com', site: 'bingoplus', time: '2026-11-10 21:40', source: '退订链接', reason: '-' },
  { email: 'kevin_r@outlook.com', site: 'arenaplus', time: '2026-11-10 13:05', source: '退订链接', reason: 'Not interested' },
  { email: 'ana.reyes@gmail.com', site: 'gamezone', time: '2026-11-09 08:30', source: '手工导入', reason: '客服工单 #88213' },
  { email: 'paolo88@gmail.com', site: 'perya', time: '2026-11-08 19:22', source: '退订链接', reason: 'Never signed up' },
  { email: 'grace.l@icloud.com', site: 'bingoplus', time: '2026-11-07 10:00', source: '手工导入', reason: '合规名单同步' },
  { email: 'mark.t@gmail.com', site: 'pinoyplay', time: '2026-11-05 17:45', source: '退订链接', reason: '-' },
];
const stFooterState = { sub: 'versions', f: {}, applied: {}, uf: {}, uapplied: {}, lookup: null };
const ST_SITES_ON = () => V2_PRODUCT_LINES.filter(p => p.status === '启用').map(p => ({ v: p.siteId, l: p.name }));
function stFooterHtml(v) {
  return `<div class="st-mail-footer">${esc(v.entity)}\n${esc(v.address)}\n${esc(v.license)}\n<span class="rg">${esc(v.rg)}</span>\n<a href="javascript:void(0)">${esc(v.unsub || 'Unsubscribe')}</a></div>`;
}
function stRenderFooter(pane) {
  const s = stFooterState;
  const isV = s.sub === 'versions';
  pane.innerHTML = `<section class="card v2-tabs-card st-tabs-card"><div class="tabs">
      <button class="tab ${isV ? 'active' : ''}" data-sub="versions">Footer 版本</button><button class="tab ${!isV ? 'active' : ''}" data-sub="unsub">邮件退订名单</button></div></section>
    <div id="stFooterSub"></div>`;
  pane.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => { s.sub = b.dataset.sub; stRender(); }));
  const host = pane.querySelector('#stFooterSub');
  if (isV) stRenderFooterVersions(host); else stRenderUnsub(host);
}
function stRenderFooterVersions(host) {
  const s = stFooterState, f = s.f, a = s.applied;
  const rows = ST_FOOTERS.filter(x => (!a.site || x.site === a.site) && (!a.status || x.status === a.status))
    .sort((x, y) => V2_PRODUCT_LINES.findIndex(p => p.siteId === x.site) - V2_PRODUCT_LINES.findIndex(p => p.siteId === y.site) || y.updated.localeCompare(x.updated));
  host.innerHTML = `
    <section class="card filter-card"><div class="filter-row">
      ${stFilterItem('产品线', `<select class="select" data-ff="site">${stOpts(ST_SITES_ON(), f.site, '全部')}</select>`)}
      ${stFilterItem('状态', `<select class="select" data-ff="status">${stOpts(['启用', '停用'], f.status, '全部')}</select>`)}
      <div class="filter-actions"><button class="btn btn-primary" data-q>查询</button><button class="btn btn-outline" data-r>重置</button></div>
    </div></section>
    <section class="card table-card">
      <div class="table-card-head v2-flex-between"><div><h4 class="card-title" style="margin-bottom:4px">Footer 版本</h4><div class="v2-hint" style="margin-bottom:12px">新建邮件模板 / 任务时系统 Footer 默认插入正文末尾，不可删除，只可在该产品线启用版本间切换；每产品线至少一个启用版本。</div></div>
        <button class="btn btn-primary btn-sm" id="stNewFooter"><i data-lucide="plus"></i>新建版本</button></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>产品线</th><th>版本名</th><th>发件实体名</th><th>牌照信息</th><th>退订链接文案</th><th class="v2-num">引用模板数</th><th>状态</th><th>更新人 / 更新时间</th><th>操作</th></tr></thead>
        <tbody>${rows.map(x => { const i = ST_FOOTERS.indexOf(x); return `<tr><td>${plName(x.site)}</td><td>${esc(x.name)}</td><td>${esc(x.entity)}</td>
          <td><span class="st-trunc" title="${esc(x.license)}">${esc(x.license)}</span></td><td>${esc(x.unsub)}</td><td class="v2-num">${x.tpl}</td><td>${stStatusTag(x.status)}</td><td class="st-2l">${x.updater}<small>${x.updated}</small></td>
          <td class="st-ops"><button class="link-btn" data-fp="${i}">预览</button><button class="link-btn" data-fe="${i}">编辑</button><button class="link-btn ${x.status === '启用' ? 'link-btn-danger' : ''}" data-ft="${i}">${x.status === '启用' ? '停用' : '启用'}</button></td></tr>`; }).join('') || stEmptyRow(9)}</tbody>
      </table></div>${stFoot(rows.length)}
    </section>`;
  stBindSimpleFilter(host, s);
  host.querySelector('#stNewFooter').addEventListener('click', () => stOpenFooterForm(null));
  host.querySelectorAll('[data-fe]').forEach(b => b.addEventListener('click', () => stOpenFooterForm(ST_FOOTERS[+b.dataset.fe])));
  host.querySelectorAll('[data-fp]').forEach(b => b.addEventListener('click', () => {
    const x = ST_FOOTERS[+b.dataset.fp];
    v2Modal({ title: `预览 · ${plName(x.site)} · ${esc(x.name)}`, okText: '关闭', hideCancel: true, width: 520, body: stMailPreview(x) });
  }));
  host.querySelectorAll('[data-ft]').forEach(b => b.addEventListener('click', () => stToggleFooter(ST_FOOTERS[+b.dataset.ft])));
}
function stMailPreview(v) {
  return `<div class="st-mail"><div class="st-mail-body"><div class="ph" style="width:60%"></div><div class="ph"></div><div class="ph" style="width:85%"></div><div class="ph" style="width:40%"></div>${stFooterHtml(v)}</div></div>
    <div class="v2-hint">退订链接地址由系统按收件人生成唯一链接，点击进入英文退订确认页（可选原因）。</div>`;
}
function stToggleFooter(x) {
  x._label = `${plName(x.site)} · ${x.name}`;
  if (x.status === '启用') {
    const others = ST_FOOTERS.filter(y => y !== x && y.site === x.site && y.status === '启用');
    if (!others.length) {
      v2Modal({ title: '无法停用', okText: '知道了', hideCancel: true,
        body: `<div class="v2-callout danger"><i data-lucide="x-circle"></i><div>${plName(x.site)} 仅剩此一个启用版本，每产品线至少一个启用版本。请先新建或启用其他版本后再停用。</div></div>` });
      return;
    }
    stConfirmToggle(x, ' Footer 版本', `<div class="v2-callout warn"><i data-lucide="alert-triangle"></i><div>停用后该版本不可被新模板选用；已使用该版本的 ${x.tpl} 个模板将在内容检测中提醒更换（E3-2）。${plName(x.site)} 仍有启用版本：${others.map(y => esc(y.name)).join('、')}。</div></div>`);
  } else stConfirmToggle(x, ' Footer 版本', `<div class="v2-hint">启用后 ${plName(x.site)} 的新模板 / 任务可选用此版本。</div>`);
}
function stOpenFooterForm(x) {
  const v = x || { site: '', name: '', address: '', license: '', rg: '', unsub: 'Unsubscribe', entity: '', status: '启用' };
  document.getElementById('stFooterDrawerTitle').textContent = x ? `编辑 Footer 版本 · ${plName(x.site)} · ${x.name}` : '新建 Footer 版本';
  const body = document.getElementById('stFooterFormBody');
  body.innerHTML = `<div class="v2-form" id="stFooterForm">
      ${stRow('产品线', `<select class="select" name="site" ${x ? 'disabled' : ''}>${stOpts(ST_SITES_ON(), v.site, '请选择产品线')}</select>`, { req: true, name: 'site', hint: '每产品线至少一个启用版本' })}
      ${stRow('版本名', `<input class="input" name="name" maxlength="30" placeholder="请输入" value="${esc(v.name)}">`, { req: true, name: 'name', hint: '≤ 30 字，产品线内唯一，如 v3 2026-11' })}
      ${stRow('注册地址', `<textarea class="textarea" name="address" maxlength="300" placeholder="公司实体注册地址" style="min-height:64px">${esc(v.address)}</textarea>`, { req: true, name: 'address', hint: '≤ 300 字' })}
      ${stRow('牌照信息', `<textarea class="textarea" name="license" maxlength="300" placeholder="牌照机构与编号" style="min-height:64px">${esc(v.license)}</textarea>`, { req: true, name: 'license', hint: '≤ 300 字；文案由法务提供' })}
      ${stRow('18+ / 负责任博彩提示', `<textarea class="textarea" name="rg" maxlength="500" style="min-height:64px">${esc(v.rg)}</textarea>`, { req: true, name: 'rg', hint: '≤ 500 字' })}
      ${stRow('退订链接文案', `<input class="input" name="unsub" maxlength="50" value="${esc(v.unsub)}">`, { req: true, name: 'unsub', hint: '≤ 50 字；链接地址由系统按收件人生成' })}
      ${stRow('发件实体名', `<input class="input" name="entity" maxlength="100" value="${esc(v.entity)}">`, { req: true, name: 'entity', hint: '≤ 100 字' })}
      ${stRow('状态', `<div class="v2-flex">${stSwitch('status', v.status === '启用')}<span class="v2-hint">启用；停用版本不可被新模板选用</span></div>`, { req: true })}
    </div>
    <div class="st-preview-wrap"><div class="st-preview-cap">预览（按真实渲染）</div><div id="stFooterPreview"></div></div>`;
  const form = body.querySelector('#stFooterForm');
  const read = () => ({ address: stVal(form, 'address'), license: stVal(form, 'license'), rg: stVal(form, 'rg'), unsub: stVal(form, 'unsub'), entity: stVal(form, 'entity') });
  const paint = () => { body.querySelector('#stFooterPreview').innerHTML = stMailPreview(read()); };
  form.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', paint));
  paint();
  document.getElementById('stFooterSave').onclick = () => {
    const site = x ? x.site : stVal(form, 'site'), name = stVal(form, 'name'), d = read();
    const status = stVal(form, 'status') ? '启用' : '停用';
    const dup = ST_FOOTERS.some(y => y !== x && y.site === site && y.name === name);
    const lastOn = x && x.status === '启用' && status === '停用' && !ST_FOOTERS.some(y => y !== x && y.site === x.site && y.status === '启用');
    const noneOn = !x && status === '停用' && site && !ST_FOOTERS.some(y => y.site === site && y.status === '启用');
    if (!stCheck(form, [
      ['site', site ? '' : '请选择产品线'], ['name', !name ? '请输入版本名' : dup ? '该产品线下已存在同名版本' : ''],
      ['address', d.address ? '' : '请输入注册地址'], ['license', d.license ? '' : '请输入牌照信息'], ['rg', d.rg ? '' : '请输入 18+ / 负责任博彩提示'],
      ['unsub', d.unsub ? '' : '请输入退订链接文案'], ['entity', d.entity ? '' : '请输入发件实体名'],
    ])) return;
    if (lastOn || noneOn) { showToast('每产品线至少一个启用版本，不能保存为停用'); return; }
    const next = { site, name, ...d, status, updater: ST_ME, updated: stNow() };
    if (x) Object.assign(x, next); else ST_FOOTERS.push({ ...next, tpl: 0 });
    showToast('Footer 版本已保存'); closeDrawer('stFooterDrawer'); stRender();
  };
  openDrawer('stFooterDrawer');
  refreshIcons();
}
function stRenderUnsub(host) {
  const s = stFooterState, f = s.uf, a = s.uapplied;
  const rows = ST_UNSUBS.filter(u => (!a.site || u.site === a.site) && (!a.source || u.source === a.source) && (!a.email || u.email.includes(a.email.toLowerCase())))
    .sort((x, y) => y.time.localeCompare(x.time));
  const lk = s.lookup;
  host.innerHTML = `
    <section class="card filter-card"><div class="filter-row">
      ${stFilterItem('产品线', `<select class="select" data-uf="site">${stOpts(ST_SITES_ON(), f.site, '全部')}</select>`)}
      ${stFilterItem('邮箱', `<input class="input" style="width:220px" data-uf="email" placeholder="输入邮箱查询退订状态" value="${esc(f.email || '')}">`)}
      ${stFilterItem('来源', `<select class="select" data-uf="source">${stOpts(['退订链接', '手工导入'], f.source, '全部')}</select>`)}
      <div class="filter-actions"><button class="btn btn-primary" id="ufQuery">查询</button><button class="btn btn-outline" id="ufReset">重置</button>
        <button class="btn btn-outline" id="ufImport"><i data-lucide="upload"></i>导入</button><button class="btn btn-outline" id="ufExport"><i data-lucide="download"></i>导出</button></div>
    </div></section>
    ${lk ? `<div class="v2-callout ${lk.hits.length ? 'warn' : ''} st-callout-row"><i data-lucide="${lk.hits.length ? 'mail-x' : 'mail-check'}"></i><div><b>${esc(lk.email)}</b>：${lk.hits.length
      ? lk.hits.map(h => `${plName(h.site)} 已退订（${h.time}，来源 ${h.source}）`).join('；') + (lk.site ? '' : '；其他产品线未退订')
      : `${lk.site ? plName(lk.site) : '全部产品线'} 均未退订`}</div></div>` : ''}
    <section class="card table-card">
      <div class="table-card-head"><div><h4 class="card-title" style="margin-bottom:4px">邮件退订名单</h4><div class="v2-hint" style="margin-bottom:12px">按产品线维护，退订立即生效；营销类邮件按名单过滤（计入过滤排除「退订」），通知 / OTP 类不受影响；重新订阅需用户在站内操作（本期不做入口）。</div></div></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>邮箱</th><th>产品线</th><th>退订时间</th><th>来源</th><th>原因</th><th>状态</th></tr></thead>
        <tbody>${rows.map(u => `<tr><td>${esc(u.email)}</td><td>${plName(u.site)}</td><td>${u.time}</td><td>${u.source}</td><td>${esc(u.reason)}</td><td><span class="tag tag-danger">已退订</span></td></tr>`).join('') || stEmptyRow(6)}</tbody>
      </table></div>${stFoot(rows.length)}
    </section>`;
  host.querySelectorAll('[data-uf]').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { f[el.dataset.uf] = el.value.trim(); }));
  host.querySelector('#ufQuery').addEventListener('click', () => {
    s.uapplied = { ...f };
    const email = (f.email || '').toLowerCase();
    if (email.includes('@')) {
      const hits = ST_UNSUBS.filter(u => u.email === email && (!f.site || u.site === f.site));
      s.lookup = { email, site: f.site, hits };
    } else s.lookup = null;
    stRender();
  });
  host.querySelector('#ufReset').addEventListener('click', () => { s.uf = {}; s.uapplied = {}; s.lookup = null; stRender(); });
  host.querySelector('#ufExport').addEventListener('click', () => showToast('已导出（原型）'));
  host.querySelector('#ufImport').addEventListener('click', stImportUnsub);
}
function stImportUnsub() {
  v2Modal({
    title: '导入邮件退订名单', okText: '导入', width: 580,
    body: `<div class="v2-form" id="stUnsubForm">
      ${stRow('产品线', `<select class="select" name="site">${stOpts(ST_SITES_ON(), '', '请选择产品线')}</select>`, { req: true, name: 'site' })}
      ${stRow('邮箱', `<textarea class="textarea" name="emails" placeholder="每行一个邮箱；或上传 CSV" style="min-height:96px"></textarea>`, { req: true, name: 'emails', hint: '导入后立即生效' })}
      ${stRow('文件', `<input type="file" accept=".csv" class="input" style="height:auto;padding:6px">`, { hint: 'CSV：邮箱、原因（可选）' })}
      ${stRow('原因', `<input class="input" name="reason" placeholder="如 客服工单号 / 合规名单同步">`, {})}
    </div>`,
    onOk: root => {
      const f = root.querySelector('#stUnsubForm');
      const site = stVal(f, 'site');
      const list = stVal(f, 'emails').split(/[\s,;]+/).map(x => x.toLowerCase()).filter(Boolean);
      const bad = list.filter(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
      if (!stCheck(f, [['site', site ? '' : '请选择产品线'], ['emails', !list.length ? '请输入邮箱' : bad.length ? `格式错误：${bad.slice(0, 3).join('、')}` : '']])) return false;
      let added = 0;
      list.forEach(email => { if (!ST_UNSUBS.some(u => u.email === email && u.site === site)) { ST_UNSUBS.push({ email, site, time: stNow(), source: '手工导入', reason: stVal(f, 'reason') || '-' }); added += 1; } });
      showToast(`已导入 ${added} 条（重复 ${list.length - added} 条已跳过），立即生效`); stRender();
      return true;
    },
  });
}

/* ================= 6.9.4 检测词库与规则 ================= */
const ST_LEVELS = ['高风险', '中风险'];
const ST_LANGS = ['英文', '菲语', '中文'];
const ST_SCOPES = ['主题', '首段', '全文'];
const ST_TERMS = [
  { term: 'Free Money', regex: false, variant: true, level: '高风险', lang: '英文', scope: ['主题', '首段'], wl: [], status: '启用', updater: ST_ME, updated: '2026-11-11 10:00' },
  { term: 'Guaranteed win', regex: false, variant: true, level: '高风险', lang: '英文', scope: ['主题', '首段'], wl: [], status: '启用', updater: ST_ME, updated: '2026-11-11 10:00' },
  { term: '\\d{2,3}% ?bonus', regex: true, variant: false, level: '中风险', lang: '英文', scope: ['主题'], wl: [], status: '启用', updater: ST_ME, updated: '2026-11-10 16:30' },
  { term: 'Bingo', regex: false, variant: false, level: '中风险', lang: '英文', scope: ['主题', '首段'], wl: ['bingoplus'], status: '启用', updater: ST_ME, updated: '2026-11-10 16:20' },
  { term: 'Click here', regex: false, variant: true, level: '中风险', lang: '英文', scope: ['全文'], wl: [], status: '启用', updater: 'lily@', updated: '2026-11-09 11:00' },
  { term: 'Libre', regex: false, variant: true, level: '中风险', lang: '菲语', scope: ['主题', '首段'], wl: [], status: '启用', updater: 'ann@', updated: '2026-11-08 15:40' },
  { term: 'Panalo agad', regex: false, variant: true, level: '高风险', lang: '菲语', scope: ['主题', '首段'], wl: [], status: '启用', updater: 'ann@', updated: '2026-11-08 15:38' },
  { term: '稳赚', regex: false, variant: false, level: '高风险', lang: '中文', scope: ['全文'], wl: [], status: '启用', updater: ST_ME, updated: '2026-11-07 10:00' },
  { term: 'Act now', regex: false, variant: true, level: '中风险', lang: '英文', scope: ['主题'], wl: [], status: '停用', updater: ST_ME, updated: '2026-11-02 09:00' },
];
const ST_PARAMS = { ratio: 60, imgOnly: 10, first: 300, ai: true, rewrite: true, score: true };
const ST_RULE_VERSIONS = [
  { ver: 'R20261111-03', time: '2026-11-11 10:00', user: ST_ME, note: '词库：新增 Free Money、Guaranteed win' },
  { ver: 'R20261110-02', time: '2026-11-10 16:30', user: ST_ME, note: '词库：新增正则 \\d{2,3}% ?bonus；Bingo 白名单 BingoPlus' },
  { ver: 'R20261101-01', time: '2026-11-01 09:00', user: 'system', note: '初始词库导入（服务商建议词 + 常见垃圾邮件触发词，高 / 中两级）' },
];
const stRuleState = { f: {}, applied: {} };
function stBumpVersion(note) {
  const n = ST_RULE_VERSIONS.length + 1;
  const ver = `R20261111-${String(n).padStart(2, '0')}`;
  ST_RULE_VERSIONS.unshift({ ver, time: stNow(), user: ST_ME, note });
  return ver;
}
function stRenderRules(pane) {
  const s = stRuleState, f = s.f, a = s.applied;
  const rows = ST_TERMS.filter(t => (!a.kw || t.term.toLowerCase().includes(a.kw.toLowerCase())) && (!a.level || t.level === a.level) && (!a.lang || t.lang === a.lang) && (!a.status || t.status === a.status))
    .sort((x, y) => y.updated.localeCompare(x.updated));
  const p = ST_PARAMS;
  pane.innerHTML = `
    <div class="v2-callout st-callout-row"><i data-lucide="git-commit-horizontal"></i><div style="flex:1">当前规则版本 <b class="st-mono">${ST_RULE_VERSIONS[0].ver}</b>（${ST_RULE_VERSIONS[0].time} · ${ST_RULE_VERSIONS[0].user}）。每次词库或参数变更生成新版本号，检测结果存档引用版本。
      效果回看：<a class="link-btn" href="channel-daily.html">通道日报「检测不通过率 × 送达率」</a></div><button class="btn btn-outline btn-sm" id="stVerList">版本记录</button></div>
    <section class="card filter-card"><div class="filter-row">
      ${stFilterItem('词 / 模式', `<input class="input" style="width:160px" data-ff="kw" placeholder="请输入" value="${esc(f.kw || '')}">`)}
      ${stFilterItem('等级', `<select class="select" data-ff="level">${stOpts(ST_LEVELS, f.level, '全部')}</select>`)}
      ${stFilterItem('语言', `<select class="select" data-ff="lang">${stOpts(ST_LANGS, f.lang, '全部')}</select>`)}
      ${stFilterItem('状态', `<select class="select" data-ff="status">${stOpts(['启用', '停用'], f.status, '全部')}</select>`)}
      <div class="filter-actions"><button class="btn btn-primary" data-q>查询</button><button class="btn btn-outline" data-r>重置</button>
        <button class="btn btn-outline" id="stTermImport"><i data-lucide="upload"></i>导入</button><button class="btn btn-outline" id="stTermExport"><i data-lucide="download"></i>导出</button></div>
    </div></section>
    <section class="card table-card">
      <div class="table-card-head v2-flex-between"><h4 class="card-title">词库</h4><button class="btn btn-primary btn-sm" id="stNewTerm"><i data-lucide="plus"></i>新建词条</button></div>
      <div class="table-scroll"><table class="table stats-table">
        <thead><tr><th>词 / 模式</th><th>等级</th><th>语言</th><th>适用范围</th><th>白名单产品线</th><th>状态</th><th>更新人</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>${rows.map(t => { const i = ST_TERMS.indexOf(t); return `<tr>
          <td><span class="${t.regex ? 'st-mono' : ''}">${esc(t.term)}</span> ${t.regex ? '<span class="tag tag-gray-outline">正则</span>' : ''}${t.variant ? ' <span class="tag tag-info">变体匹配</span>' : ''}</td>
          <td><span class="tag ${t.level === '高风险' ? 'tag-danger' : 'tag-warning'}">${t.level}</span></td><td>${t.lang}</td><td>${t.scope.join(' + ')}</td>
          <td>${t.wl.length ? `${esc(stPlNames(t.wl))}<span class="v2-muted">（词 ${esc(t.term)}）</span>` : '<span class="v2-muted">-</span>'}</td><td>${stStatusTag(t.status)}</td><td>${t.updater}</td><td>${t.updated}</td>
          <td class="st-ops"><button class="link-btn" data-we="${i}">编辑</button><button class="link-btn ${t.status === '启用' ? 'link-btn-danger' : ''}" data-wt="${i}">${t.status === '启用' ? '停用' : '启用'}</button></td></tr>`; }).join('') || stEmptyRow(9)}</tbody>
      </table></div>${stFoot(rows.length)}
    </section>
    <section class="card st-section-gap">
      <h4 class="card-title">规则参数</h4>
      <div class="v2-form st-param-form" id="stParamForm">
        ${stRow('图文比例阈值', `<div class="st-inline"><input class="input" type="number" name="ratio" min="30" max="90" value="${p.ratio}"><span class="st-unit">%</span></div>`, { req: true, name: 'ratio', hint: '30–90%，默认 60%（E2-1）' })}
        ${stRow('纯图阈值', `<div class="st-inline"><input class="input" type="number" name="imgOnly" min="0" max="30" value="${p.imgOnly}"><span class="st-unit">%</span></div>`, { req: true, name: 'imgOnly', hint: '0–30%，默认 10%（E2-2）' })}
        ${stRow('首段范围', `<div class="st-inline"><input class="input" type="number" name="first" min="100" max="1000" value="${p.first}"><span class="st-unit">字符</span></div>`, { req: true, name: 'first', hint: '100–1000，默认 300（E1）' })}
        ${stRow('AI 语义检测', stSwitch('ai', p.ai), { req: true, hint: '默认开（E1-4）' })}
        ${stRow('AI 改写建议', stSwitch('rewrite', p.rewrite), { req: true, hint: '默认开' })}
        ${stRow('服务商评分', stSwitch('score', p.score), { req: true, hint: '默认开；接口未上线时自动显示暂无' })}
        <span></span><div class="v2-flex"><button class="btn btn-primary" id="stParamSave">保存参数</button><button class="btn btn-outline" id="stParamReset">恢复默认值</button></div>
      </div>
    </section>`;
  stBindSimpleFilter(pane, s);
  pane.querySelector('#stVerList').addEventListener('click', () => v2Modal({ title: '规则版本记录', okText: '关闭', hideCancel: true, width: 640,
    body: `<table class="table stats-table"><thead><tr><th>版本号</th><th>时间</th><th>操作人</th><th>变更</th></tr></thead><tbody>${ST_RULE_VERSIONS.map(v => `<tr><td class="st-mono">${v.ver}</td><td>${v.time}</td><td>${v.user}</td><td style="white-space:normal">${esc(v.note)}</td></tr>`).join('')}</tbody></table>` }));
  pane.querySelector('#stTermExport').addEventListener('click', () => showToast('已导出（原型）'));
  pane.querySelector('#stTermImport').addEventListener('click', () => v2Modal({ title: '导入词库', okText: '导入', width: 540,
    body: '<div class="v2-hint">CSV 列：词 / 模式、是否正则、变体匹配、等级（高风险 / 中风险）、语言、适用范围、白名单产品线；导入后生成新规则版本。</div><input type="file" accept=".csv" class="input" style="height:auto;padding:6px">',
    onOk: () => { const ver = stBumpVersion('词库：CSV 导入'); showToast(`导入完成（原型），已生成规则版本 ${ver}`); stRender(); } }));
  pane.querySelector('#stNewTerm').addEventListener('click', () => stOpenTermForm(null));
  pane.querySelectorAll('[data-we]').forEach(b => b.addEventListener('click', () => stOpenTermForm(ST_TERMS[+b.dataset.we])));
  pane.querySelectorAll('[data-wt]').forEach(b => b.addEventListener('click', () => {
    const t = ST_TERMS[+b.dataset.wt]; t._label = t.term;
    stConfirmToggle(t, '词条', `<div class="v2-hint">${t.status === '启用' ? '停用后检测不再命中该词' : '启用后检测将命中该词'}；保存后生成新规则版本，已存档的检测结果仍引用原版本。</div>`,
      off => stBumpVersion(`词库：${off ? '停用' : '启用'} ${t.term}`));
  }));
  const pf = pane.querySelector('#stParamForm');
  pane.querySelector('#stParamReset').addEventListener('click', () => {
    Object.entries({ ratio: 60, imgOnly: 10, first: 300 }).forEach(([k, v]) => { pf.querySelector(`[name=${k}]`).value = v; });
    ['ai', 'rewrite', 'score'].forEach(k => { pf.querySelector(`[name=${k}]`).checked = true; });
    showToast('已恢复默认值，保存后生效');
  });
  pane.querySelector('#stParamSave').addEventListener('click', () => {
    const n = k => Number(stVal(pf, k));
    const inR = (k, lo, hi) => stVal(pf, k) !== '' && Number.isInteger(n(k)) && n(k) >= lo && n(k) <= hi;
    if (!stCheck(pf, [['ratio', inR('ratio', 30, 90) ? '' : '图文比例阈值需在 30–90%'], ['imgOnly', inR('imgOnly', 0, 30) ? '' : '纯图阈值需在 0–30%'], ['first', inR('first', 100, 1000) ? '' : '首段范围需在 100–1000 字符']])) return;
    const next = { ratio: n('ratio'), imgOnly: n('imgOnly'), first: n('first'), ai: stVal(pf, 'ai'), rewrite: stVal(pf, 'rewrite'), score: stVal(pf, 'score') };
    const label = { ratio: '图文比例阈值', imgOnly: '纯图阈值', first: '首段范围', ai: 'AI 语义检测', rewrite: 'AI 改写建议', score: '服务商评分' };
    const fmt = v => (v === true ? '开' : v === false ? '关' : v);
    const diff = Object.keys(next).filter(k => next[k] !== ST_PARAMS[k]).map(k => `${label[k]}：${fmt(ST_PARAMS[k])} → ${fmt(next[k])}`);
    if (!diff.length) { showToast('参数未变化'); return; }
    v2Modal({ title: '保存规则参数', okText: '确认保存',
      body: `<div>${diff.map(esc).join('<br>')}</div><div class="v2-hint">保存后生成新规则版本，对之后的检测生效；已存档的检测结果仍引用原版本。</div>`,
      onOk: () => { Object.assign(ST_PARAMS, next); const ver = stBumpVersion(`参数：${diff.join('；')}`); showToast(`已保存，规则版本 ${ver}`); stRender(); } });
  });
}
function stOpenTermForm(t) {
  const v = t || { term: '', regex: false, variant: true, level: '中风险', lang: '英文', scope: ['主题', '首段'], wl: [], status: '启用' };
  v2Modal({
    title: t ? '编辑词条' : '新建词条', width: 640, okText: '保存',
    body: `<div class="v2-form" id="stTermForm">
      ${stRow('词 / 模式', `<input class="input" name="term" placeholder="词或正则" value="${esc(v.term)}">`, { req: true, name: 'term' })}
      ${stRow('匹配方式', `<div class="radio-group"><label><input type="radio" name="regex" value="0" ${v.regex ? '' : 'checked'}>词</label><label><input type="radio" name="regex" value="1" ${v.regex ? 'checked' : ''}>正则</label></div>`, {})}
      ${stRow('变体匹配', `<div class="v2-flex">${stSwitch('variant', v.variant)}<span class="v2-hint">匹配大小写、空格、符号替换等变体（如 Fr3e M0ney）</span></div>`, {})}
      ${stRow('等级', `<select class="select" name="level">${stOpts(ST_LEVELS, v.level)}</select>`, { req: true, hint: '决定分级' })}
      ${stRow('语言', `<select class="select" name="lang">${stOpts(ST_LANGS, v.lang)}</select>`, { req: true })}
      ${stRow('适用范围', stMulti('scope', ST_SCOPES.map(x => ({ v: x, l: x })), v.scope), { req: true, name: 'scope', hint: '默认主题 + 首段' })}
      ${stRow('白名单产品线', stMulti('wl', ST_SITES_ON(), v.wl), { name: 'wl', hint: '品牌名等例外，如 BingoPlus 对词 Bingo' })}
      ${stRow('状态', `<div class="v2-flex">${stSwitch('status', v.status === '启用')}<span class="v2-hint">启用</span></div>`, { req: true })}
    </div>
    <div class="v2-hint">保存后生成新规则版本。</div>`,
    onOk: root => {
      const f = root.querySelector('#stTermForm');
      const term = stVal(f, 'term'), regex = f.querySelector('[name=regex]:checked').value === '1', scope = stMultiVal(f, 'scope');
      let reErr = '';
      if (regex && term) { try { new RegExp(term); } catch (e) { reErr = '正则表达式无效'; } }
      const dup = ST_TERMS.some(x => x !== t && x.term.toLowerCase() === term.toLowerCase());
      if (!stCheck(f, [['term', !term ? '请输入词或模式' : reErr || (dup ? '词库中已存在该词' : '')], ['scope', scope.length ? '' : '请选择适用范围']])) return false;
      const next = { term, regex, variant: stVal(f, 'variant'), level: stVal(f, 'level'), lang: stVal(f, 'lang'), scope, wl: stMultiVal(f, 'wl'), status: stVal(f, 'status') ? '启用' : '停用', updater: ST_ME, updated: stNow() };
      if (t) Object.assign(t, next); else ST_TERMS.push(next);
      const ver = stBumpVersion(`词库：${t ? '编辑' : '新增'} ${term}`);
      showToast(`已保存，规则版本 ${ver}`); stRender();
      return true;
    },
  });
}

/* ================= 页面框架：tabs + hash ================= */
const ST_TABS = [
  { key: 'vendors', label: '供应商档案', desc: '维护供应商账号、发送方标识与产品线归属；调度器、报表、筛选级联从本档案读取 TPS 上限、计费规则、回执窗口与归属关系', render: stRenderVendors },
  { key: 'codes', label: '失败码映射表', desc: '供应商原始码 → 统一失败分类 → 建议动作；新原始码自动进入「未分类」待归类', render: stRenderCodes },
  { key: 'testers', label: '测试账号白名单', desc: '维护测试用手机号 / 邮箱 / 用户 ID / 设备 token', render: stRenderTesters },
  { key: 'approvers', label: '审批人配置', desc: '按申请人 × 产品线配置审批人，任一审批人通过即通过；仅管理员可维护', render: stRenderApprovers },
  { key: 'footer', label: '邮件 Footer / 退订', desc: '按产品线维护法务标准 Footer 版本与邮件退订名单', render: stRenderFooter },
  { key: 'rules', label: '检测词库与规则', desc: '邮件内容检测的词库与规则参数；只提醒与建议，不拦截', render: stRenderRules },
];
/* 供应商档案维护页（附录 C.5 后续）、测试账号白名单 / 审批人配置（已上线）本期不展示 */
const ST_HIDDEN = ['vendors', 'testers', 'approvers'];
ST_TABS.splice(0, ST_TABS.length, ...ST_TABS.filter(t => !ST_HIDDEN.includes(t.key)));
function stCurrentTab() { const k = (location.hash || '').slice(1); return ST_TABS.some(t => t.key === k) ? k : 'codes'; }
function stRender() {
  const key = stCurrentTab();
  const tab = ST_TABS.find(t => t.key === key);
  document.title = `${tab.label} · 系统管理 · 触达 · Digiplus`;
  document.getElementById('stTitle').textContent = tab.label;
  document.getElementById('stDesc').textContent = tab.desc;
  document.getElementById('stTabs').innerHTML = ST_TABS.map(t => `<button class="tab ${t.key === key ? 'active' : ''}" data-tab="${t.key}">${t.label}${t.key === 'codes' ? ` <span class="tag tag-danger st-count">${ST_CODES.filter(stIsUncat).length}</span>` : ''}</button>`).join('');
  document.querySelectorAll('#stTabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.tab === key) return;
    history.replaceState(null, '', '#' + b.dataset.tab);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }));
  tab.render(document.getElementById('stPane'));
  refreshIcons();
}

/* 字段修改后清除该字段的错误提示 */
['input', 'change'].forEach(ev => document.addEventListener(ev, e => {
  const box = e.target.closest && e.target.closest('.st-ctl');
  if (!box) return;
  const err = box.querySelector(':scope > .st-err'); if (err) err.textContent = '';
  box.querySelectorAll('.st-invalid').forEach(x => x.classList.remove('st-invalid'));
}));

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-admin');
  renderTopbar();
  if (!hasPerm('admin')) {
    showToast('无权限访问系统管理');
    setTimeout(() => { location.href = 'index.html'; }, 1200);
    refreshIcons();
    return;
  }
  document.getElementById('stMain').hidden = false;
  if (!ST_TABS.some(t => t.key === (location.hash || '').slice(1))) history.replaceState(null, '', '#codes');
  window.addEventListener('hashchange', () => { document.querySelectorAll('.drawer-root.open').forEach(r => closeDrawer(r.id)); stRender(); window.scrollTo(0, 0); });
  stRender();
  bindDrawerClose();
});

/* 计划占位（星灵）：星灵画布 / 计划到点才推任务，管理员提前按「星灵计划 ID + 生效窗口」配规则，
 * 窗口内到达、计划 ID 匹配的任务立即升为高优（PRD 6.5.5 计划占位）。依赖 queue.js。 */

const QP_RULES = [
  { id: 'PR-0001', planId: 'XL-CV-20261113-021', planName: '世界杯 1/4 决赛开赛提醒画布', site: 'bingoplus', channel: 'SMS',
    from: '18:30', to: '18:45', repeat: '仅当天', hitMode: '窗口内全部', est: 15000, hits: 0, status: '待匹配', creator: 'marvin@', remark: '开赛前 30 分钟必须送达' },
  { id: 'PR-0002', planId: 'XL-PL-20261101-007', planName: '每日签到提醒计划', site: '', channel: 'SMS',
    from: '09:00', to: '09:10', repeat: '每天', hitMode: '仅首个', est: null, hits: 6, status: '待匹配', creator: 'jay@', remark: '' },
  { id: 'PR-0003', planId: 'XL-CV-20261108-003', planName: '周末返利画布', site: 'gamezone', channel: 'SMS',
    from: '12:00', to: '12:15', repeat: '仅当天', hitMode: '窗口内全部', est: 8000, hits: 0, status: '已失效', creator: 'marvin@', remark: '' },
];
const QP_STATUS_TAG = { 待匹配: 'tag-primary', 已命中: 'tag-success', 已失效: 'tag-gray', 已取消: 'tag-gray-outline' };

/* 规则对队列的适用：同业务线的短信账号（命中后进入任务实际所在队列） */
function qpRulesFor(a) {
  return QP_RULES.filter(r => r.channel === a.channel && (!r.site || V2_PRODUCT_LINES.find(p => p.siteId === r.site)?.bl === a.bl) && (V2_APPS.find(x => x.name === '星灵')?.bls || []).includes(a.bl));
}

function qpSectionHtml(a) {
  const rules = qpRulesFor(a);
  const row = r => `<tr>
      <td><b>${esc(r.planId)}</b><div class="v2-hint">${esc(r.planName || '-')}</div></td>
      <td>${r.site ? plName(r.site) : '不限'}</td>
      <td>${r.from}–${r.to}<div class="v2-hint">${r.repeat}</div></td>
      <td>${r.hitMode}</td>
      <td class="v2-num">${r.est ? fmtN(r.est) : '-'}</td>
      <td><span class="tag ${QP_STATUS_TAG[r.status]}">${r.status}</span>${r.hits ? `<div class="v2-hint">累计命中 ${r.hits} 次</div>` : ''}</td>
      <td>${['待匹配', '已命中'].includes(r.status)
        ? `<a class="link-btn" data-qp-sim="${r.id}">模拟星灵推送</a><a class="link-btn" data-qp-edit="${r.id}">编辑</a><a class="link-btn link-btn-danger" data-qp-cancel="${r.id}">取消</a>`
        : '<span class="v2-muted">-</span>'}</td></tr>`;
  return `<section class="card table-card">
      <div class="table-card-head"><h4 class="card-title">计划占位 <span class="q-sub">星灵计划到点推送 · 窗口内匹配计划 ID 即插队</span></h4>
        <button class="btn btn-outline btn-sm" id="qpNew"><i data-lucide="plus"></i>新建计划占位</button></div>
      <table class="table stats-table">
        <thead><tr><th>星灵计划 ID / 名称</th><th>产品线</th><th>生效窗口</th><th>命中方式</th><th class="v2-num">预估量</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${rules.length ? rules.map(row).join('') : '<tr><td colspan="7" class="q-empty">暂无计划占位</td></tr>'}</tbody>
      </table>
      <div class="v2-hint" style="margin-top:8px">仅星灵接入方；窗口结束仍未命中自动失效并通知配置人。命中的任务按到达时间先后排在高优区。</div>
    </section>`;
}

function qpBind(host, a) {
  const nb = host.querySelector('#qpNew');
  if (nb) nb.addEventListener('click', () => qpForm(a));
  host.querySelectorAll('[data-qp-edit]').forEach(b => b.addEventListener('click', () => qpForm(a, QP_RULES.find(r => r.id === b.dataset.qpEdit))));
  host.querySelectorAll('[data-qp-cancel]').forEach(b => b.addEventListener('click', () => qpCancel(a, QP_RULES.find(r => r.id === b.dataset.qpCancel))));
  host.querySelectorAll('[data-qp-sim]').forEach(b => b.addEventListener('click', () => qpSimulate(a, QP_RULES.find(r => r.id === b.dataset.qpSim))));
}

function qpForm(a, r) {
  const v = r || { planId: '', planName: '', site: '', channel: 'SMS', from: '', to: '', repeat: '仅当天', hitMode: '窗口内全部', est: '', remark: '' };
  const sites = V2_PRODUCT_LINES.filter(p => p.bl === a.bl && p.status === '启用');
  v2Modal({
    title: r ? '编辑计划占位' : '新建计划占位', width: 600, okText: '保存',
    body: `<div class="v2-form">
      <label>接入方</label><div>星灵（xl_01）</div>
      <label class="req">星灵计划 ID</label><input class="input" id="qpPlan" value="${esc(v.planId)}" placeholder="星灵画布 / 计划 ID，如 XL-CV-20261113-021" ${r ? 'disabled' : ''}>
      <label>计划名称</label><input class="input" id="qpName" value="${esc(v.planName)}" placeholder="便于识别，选填">
      <label>产品线</label><select class="select" id="qpSite"><option value="">不限</option>${sites.map(p => `<option value="${p.siteId}" ${p.siteId === v.site ? 'selected' : ''}>${p.name}</option>`).join('')}</select>
      <label class="req">通道</label><select class="select" id="qpCh"><option>SMS</option></select>
      <span class="v2-hint">仅已接入任务级调度的通道（本期短信）</span>
      <label class="req">生效窗口</label><div class="v2-flex"><input class="input" type="time" id="qpFrom" value="${v.from}"><span>至</span><input class="input" type="time" id="qpTo" value="${v.to}">
        <select class="select" id="qpRepeat">${['仅当天', '每天'].map(x => `<option ${x === v.repeat ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <span class="v2-hint">窗口时长 ≤ 2 小时；建议覆盖星灵计划时间前后各 5–10 分钟</span>
      <label class="req">命中方式</label><select class="select" id="qpHit">${['窗口内全部', '仅首个'].map(x => `<option ${x === v.hitMode ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <label>预估量</label><input class="input" type="number" id="qpEst" value="${v.est || ''}" placeholder="条，选填；填写后未命中前也计入其他任务 ETA">
      <label>备注</label><input class="input" id="qpRemark" value="${esc(v.remark)}" placeholder="原因，≤ 200 字">
    </div>`,
    onOk: root => {
      const g = id => root.querySelector('#' + id).value.trim();
      const planId = g('qpPlan'), from = g('qpFrom'), to = g('qpTo');
      if (!planId) { showToast('请填写星灵计划 ID'); return false; }
      if (!from || !to) { showToast('请填写生效窗口'); return false; }
      const dur = qHmToSec(to) - qHmToSec(from);
      if (dur <= 0 || dur > 7200) { showToast('生效窗口需为 1 分钟–2 小时，且结束晚于开始'); return false; }
      if (!r && QP_RULES.some(x => x.planId === planId && ['待匹配', '已命中'].includes(x.status))) { showToast('该计划 ID 已有生效中的计划占位'); return false; }
      const est = Number(g('qpEst')) || null;
      const data = { planName: g('qpName'), site: g('qpSite'), channel: 'SMS', from, to, repeat: g('qpRepeat'), hitMode: g('qpHit'), est, remark: g('qpRemark') };
      if (r) { Object.assign(r, data); qAddAudit({ action: '计划占位设置', queue: a.id, task: '', change: `计划 ${r.planId} 规则修改：${from}–${to} · ${data.hitMode}`, affected: '', reason: data.remark }); }
      else {
        const id = 'PR-' + String(QP_RULES.length + 1).padStart(4, '0');
        QP_RULES.unshift({ id, planId, ...data, hits: 0, status: '待匹配', creator: QUEUE_ME });
        qAddAudit({ action: '计划占位设置', queue: a.id, task: '', change: `新建：星灵计划 ${planId} · ${from}–${to}（${data.repeat}）· ${data.hitMode}`, affected: '', reason: data.remark });
      }
      showToast('计划占位已保存');
      qRoute(true);
    },
  });
}

function qpCancel(a, r) {
  v2Modal({
    title: '取消计划占位', width: 520, okText: '确认取消', danger: true,
    body: `<div>取消星灵计划 <b>${esc(r.planId)}</b> 的计划占位。已命中的任务保持当前优先级，后续到达的任务按普通优先级排队。</div>${qReasonField(false)}`,
    onOk: root => {
      r.status = '已取消';
      qAddAudit({ action: '计划占位取消', queue: a.id, task: '', change: `星灵计划 ${r.planId} 待匹配 → 已取消`, affected: '', reason: qReadReason(root) });
      showToast('已取消计划占位'); qRoute(true);
    },
  });
}

/* 演示：星灵按计划推来一个任务（API · 模板免审 → 无需审批），命中规则即升高优 */
function qpSimulate(a, r) {
  const n = V2_TASKS.filter(t => t.planId).length + 1;
  const id = 'T2026071302' + n;
  const target = r.est || 12000;
  const t = { id, name: (r.planName || '星灵计划任务').replace(/画布|计划$/, '') + '（星灵）', site: r.site || 'bingoplus', channel: 'SMS', account: a.id,
    source: 'API', app: '星灵', creator: 'ken@', operator: 'ken@', category: '营销', status: 'queued', approval: 'none',
    target, remaining: target, sched: '立即', planId: r.planId,
    qReady: QS.now, qSeq: QS.now, qPrio: '普通', qHighAt: null };
  const before = qOrder(qQueueTasks(a.id));
  V2_TASKS.push(t);
  const hit = r.status === '待匹配';
  if (hit) {
    t.qPrio = '高'; t.qHighAt = QS.now; t.qSeq = Math.min(0, ...before.map(x => x.qSeq)) - 1;
    r.hits += 1;
    if (r.hitMode === '仅首个') r.status = '已命中';
    qAddAudit({ action: '占位生效', queue: a.id, task: id, change: `计划占位命中（星灵计划 ${r.planId}）：优先级 普通 → 高，置于高优区`, affected: before.map(x => x.id).join(', '), reason: '', op: '系统（计划占位）' });
    qPromote(a);
    showToast(`星灵推送 ${id}，命中计划占位，已置于队首`);
  } else {
    showToast(`星灵推送 ${id}；规则为「仅首个」且已命中，按普通优先级排队`);
  }
  qRoute(true);
}

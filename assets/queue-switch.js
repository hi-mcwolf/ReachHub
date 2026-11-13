/* 队列详情 · 切换供应商（PRD 6.5.4，Marvin 2026-11-12）
 * 营销短信按号码运营商分配到对应供应商队列；某队列拥堵时，把选中任务在本队列尚未发出的号码切到同产品线可用的其他供应商账号。
 * 支持单个 / 多选批量；Sender ID 只可选目标账号里配置给该任务产品线的；按原就绪时间入目标队列（不插队）；可切回；写审计；运营无感。
 * 依赖 queue.js（QS / qSimulate / qQueueTasks / qAddAudit / qRoute …）与 v2-data.js（V2_ACCOUNTS / V2_SENDER_PL）。 */

const QSW = { sel: new Set() };
/* 近 7 天目标供应商发该运营商号码的送达率（演示值） */
const QSW_DLR = { 'BP-02': 94.8, 'BP-04': 92.6 };
const QSW_CARRIER = { Globe: 'Globe', Smart: 'Smart', DLink: '聚合', NXLink: '聚合', Mocean: '聚合' };

function qsCanSwitch(t) { return !t.qsFrom && t.channel === 'SMS' && t.category !== 'OTP' && Math.round(t.remaining) > 0; }
function qsTargets(a, t) {
  return V2_ACCOUNTS.filter(x => x.id !== a.id && x.channel === 'SMS' && x.mode === 'tasklevel' && x.bl === a.bl && x.status !== '停用'
    && V2_PRODUCT_LINES.some(p => p.siteId === t.site && p.bl === x.bl));
}
function qsSenders(acct, site) { return (acct.senders || []).filter(s => (V2_SENDER_PL[s] || []).includes(site)); }

/* ---------- 表格挂点 ---------- */
function qsToolbarHtml(a) {
  return `<div class="v2-flex" style="margin-bottom:12px"><span class="v2-hint" id="qsSelHint">${QSW.sel.size ? `已选 ${QSW.sel.size} 个任务` : '勾选任务可批量切换供应商'}</span>
    <button class="btn btn-outline btn-sm" id="qsBatch" ${QSW.sel.size ? '' : 'disabled'}><i data-lucide="shuffle"></i>切换供应商</button></div>`;
}
function qsHeadCell() { return '<th style="width:32px"><input type="checkbox" id="qsAll" title="全选可切换任务"></th>'; }
function qsRowCell(t) {
  return qsCanSwitch(t) ? `<td><input type="checkbox" data-qs="${t.id}" ${QSW.sel.has(t.id) ? 'checked' : ''}></td>` : '<td></td>';
}
function qsRowOps(t) {
  const ops = [];
  if (qsCanSwitch(t)) ops.push(`<a class="link-btn" data-qsw="${t.id}">切换供应商</a>`);
  if (t.qsFrom) ops.push(`<a class="link-btn" data-qsback="${t.id}">切回</a>`);
  return ops;
}
function qsBind(host, a) {
  const ids = qQueueTasks(a.id).filter(qsCanSwitch).map(t => t.id);
  [...QSW.sel].forEach(id => { if (!ids.includes(id)) QSW.sel.delete(id); });
  const sync = () => {
    const hint = host.querySelector('#qsSelHint'); const btn = host.querySelector('#qsBatch'); const all = host.querySelector('#qsAll');
    if (hint) hint.textContent = QSW.sel.size ? `已选 ${QSW.sel.size} 个任务` : '勾选任务可批量切换供应商';
    if (btn) btn.disabled = !QSW.sel.size;
    if (all) { all.checked = ids.length && QSW.sel.size === ids.length; all.indeterminate = QSW.sel.size > 0 && QSW.sel.size < ids.length; }
  };
  host.querySelectorAll('[data-qs]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? QSW.sel.add(cb.dataset.qs) : QSW.sel.delete(cb.dataset.qs); sync(); }));
  const all = host.querySelector('#qsAll');
  if (all) all.addEventListener('change', () => { QSW.sel = new Set(all.checked ? ids : []); host.querySelectorAll('[data-qs]').forEach(cb => { cb.checked = all.checked; }); sync(); });
  host.querySelector('#qsBatch')?.addEventListener('click', () => qsOpen(a, [...QSW.sel]));
  host.querySelectorAll('[data-qsw]').forEach(b => b.addEventListener('click', () => qsOpen(a, [b.dataset.qsw])));
  host.querySelectorAll('[data-qsback]').forEach(b => b.addEventListener('click', () => qsBack(a, b.dataset.qsback)));
  sync();
}

/* ---------- 切换弹窗 ---------- */
function qsFinishOf(acct, list, id) {
  const sim = qSimulate(acct, list);
  const r = sim.res[id];
  return r && r.finish != null ? r.finish : null;
}
function qsOpen(a, ids) {
  const tasks = ids.map(id => V2_TASKS.find(t => t.id === id)).filter(Boolean);
  const targets = [...new Map(tasks.flatMap(t => qsTargets(a, t)).map(x => [x.id, x])).values()];
  if (!targets.length) { showToast('当前业务线没有其他可用的短信供应商账号'); return; }
  const st = { target: targets[0].id, pct: 100, senders: {} };
  const render = root => {
    const tg = qAcct(st.target);
    const ts = qAcctStats(tg);
    const rows = tasks.map(t => {
      const opts = qsSenders(tg, t.site);
      if (!opts.includes(st.senders[t.id])) st.senders[t.id] = opts[0] || '';
      const n = Math.round(Math.round(t.remaining) * st.pct / 100);
      return { t, opts, n };
    });
    const ok = rows.filter(r => r.opts.length && r.n > 0);
    /* ETA 预览：源队列移走、目标队列按原就绪时间加入 */
    const srcList = qQueueTasks(a.id).map(x => Object.assign({}, x));
    ok.forEach(r => { const c = srcList.find(x => x.id === r.t.id); c.remaining -= r.n; });
    const tgList = qQueueTasks(tg.id).map(x => Object.assign({}, x)).concat(ok.map(r => Object.assign({}, r.t, { id: r.t.id + '-SW', account: tg.id, remaining: r.n, target: r.n, status: 'queued', qPrio: '普通' })));
    const fmtF = s => s == null ? '-' : qClock(s);
    const body = rows.map(r => {
      const before = qsFinishOf(a, qQueueTasks(a.id), r.t.id);
      const afterSrc = r.n >= Math.round(r.t.remaining) ? null : qsFinishOf(a, srcList, r.t.id);
      const afterTg = r.opts.length && r.n ? qsFinishOf(tg, tgList, r.t.id + '-SW') : null;
      return `<tr class="${r.opts.length ? '' : 'v2-row-warn'}"><td class="q-wrap">${qShortId(r.t.id)} ${esc(r.t.name)}</td><td>${plName(r.t.site)}</td>
        <td class="v2-num">${fmtN(Math.round(r.t.remaining))}</td><td class="v2-num">${r.opts.length ? fmtN(r.n) : '-'}</td>
        <td>${r.opts.length ? `<select class="select select-sm" data-sender="${r.t.id}">${r.opts.map(s => `<option ${s === st.senders[r.t.id] ? 'selected' : ''}>${s}</option>`).join('')}</select>`
          : `<span class="tag tag-warning">不可切换</span><div class="v2-hint">${esc(tg.vendor)} · ${tg.id} 未配置 ${esc(plName(r.t.site))} 的 Sender ID</div>`}</td>
        <td style="white-space:normal;min-width:150px">${fmtF(before)} → ${r.opts.length ? `${afterSrc == null ? '' : `${a.vendor} ${fmtF(afterSrc)}<br>`}${tg.vendor} ${fmtF(afterTg)}` : '不变'}</td></tr>`;
    }).join('');
    root.querySelector('#qsBody').innerHTML = `
      <div class="v2-form" style="grid-template-columns:96px minmax(0,1fr);margin-bottom:12px">
        <label>源队列</label><div>${qQueueName(a)}（${a.bl}） · ${qStatusTag(qAcctStats(a).status, qAcctStats(a).reason)} <span class="v2-hint">切换的是选中任务在本队列尚未发出的 ${esc(QSW_CARRIER[a.vendor] || a.vendor)} 号码；已进缓冲的不动</span></div>
        <label class="req">目标供应商</label><div><select class="select" id="qsTarget" style="max-width:360px">${targets.map(x => `<option value="${x.id}" ${x.id === st.target ? 'selected' : ''}>${x.vendor} · ${x.id}</option>`).join('')}</select>
          <div class="v2-hint" style="margin-top:4px">状态 ${ts.status}${ts.reason ? '（' + ts.reason + '）' : ''} · 队列深度 ${fmtN(ts.depth)} · 预计清空 ${ts.drain} · 近 7 天发 ${esc(QSW_CARRIER[a.vendor] || a.vendor)} 号码送达率 ${QSW_DLR[tg.id] != null ? QSW_DLR[tg.id] + '%' : '-'}${ts.status === '拥堵' ? ' <span class="tag tag-danger">目标也拥堵</span>' : ''}</div></div>
        <label class="req">切换比例</label><div class="v2-flex"><input class="input" id="qsPct" type="number" min="1" max="100" value="${st.pct}" style="width:90px"> %
          <span class="v2-hint">按每个任务本队列剩余量计算，默认全部</span></div>
      </div>
      <div class="table-scroll" style="max-height:none"><table class="table stats-table"><thead><tr><th>任务</th><th>产品线</th><th class="v2-num">本队列剩余</th><th class="v2-num">切换条数</th>
        <th>Sender ID ${tipIcon('只列目标账号中配置给该任务产品线的 Sender ID（6.1.3）；没有则该任务不可切换')}</th><th>预计完成 ${tipIcon('当前 → 切换后（本队列剩余 / 目标队列）；目标队列按原就绪时间排序，不插队')}</th></tr></thead>
        <tbody>${body}</tbody></table></div>
      ${ok.length < rows.length ? `<div class="v2-callout warn" style="margin-top:10px"><i data-lucide="alert-triangle"></i><div>${rows.length - ok.length} 个任务因目标账号无对应产品线的 Sender ID 不可切换，确认后只切换其余 ${ok.length} 个。</div></div>` : ''}
      ${qReasonField(false)}`;
    root.querySelector('#qsTarget').addEventListener('change', e => { st.target = e.target.value; render(root); });
    root.querySelector('#qsPct').addEventListener('change', e => { st.pct = Math.min(100, Math.max(1, Number(e.target.value) || 100)); render(root); });
    root.querySelectorAll('[data-sender]').forEach(s => s.addEventListener('change', () => { st.senders[s.dataset.sender] = s.value; }));
    root._ok = ok;
    refreshIcons();
  };
  const mroot = v2Modal({
    title: tasks.length > 1 ? `批量切换供应商（${tasks.length} 个任务）` : '切换供应商',
    width: 980,
    body: '<div id="qsBody"></div>',
    okText: '确认切换',
    onOk: root => {
      const ok = root._ok || [];
      if (!ok.length) { showToast('没有可切换的任务'); return false; }
      const tg = qAcct(st.target);
      const reason = qReadReason(root);
      ok.forEach(r => {
        const t = r.t;
        t.remaining -= r.n;
        const sid = t.id + '-SW';
        const exist = V2_TASKS.find(x => x.id === sid && x.account === tg.id);
        if (exist) { exist.remaining += r.n; exist.target += r.n; }
        else V2_TASKS.push(Object.assign({}, t, { id: sid, account: tg.id, remaining: r.n, target: r.n, status: 'queued', qPrio: '普通', qHighAt: null, qReserve: false,
          qsFrom: a.id, qsSender: st.senders[t.id], name: `${t.name}（切自 ${a.vendor}）` }));
        if (t.remaining <= 0 && t.status === 'queued') t.remaining = 0;
        qAddAudit({ action: '切换供应商', queue: a.id, task: t.id, change: `${fmtN(r.n)} 条 ${a.vendor} · ${a.id} → ${tg.vendor} · ${tg.id}；Sender ID ${st.senders[t.id]}`, affected: '', reason });
      });
      QSW.sel.clear();
      showToast(`已切换 ${ok.length} 个任务到 ${tg.vendor} · ${tg.id}，ETA 已重算`);
      qRoute(true);
      return true;
    },
  });
  render(mroot);
}

/* ---------- 切回：目标队列中尚未发出的部分回到源队列 ---------- */
function qsBack(a, id) {
  const s = V2_TASKS.find(x => x.id === id);
  const src = qAcct(s.qsFrom);
  const orig = V2_TASKS.find(x => x.id === id.replace(/-SW$/, ''));
  const n = Math.round(s.remaining);
  v2Modal({
    title: '切回原供应商',
    body: `<div>将「${esc(orig ? orig.name : s.name)}」在 ${a.vendor} · ${a.id} 尚未发出的 <b>${fmtN(n)}</b> 条切回 ${src.vendor} · ${src.id}，按原就绪时间排队。</div>${qReasonField(false)}`,
    okText: '确认切回',
    onOk: root => {
      if (orig) orig.remaining += n;
      s.remaining = 0; s.status = 'done';
      qAddAudit({ action: '切回', queue: a.id, task: orig ? orig.id : id, change: `${fmtN(n)} 条 ${a.vendor} · ${a.id} → ${src.vendor} · ${src.id}`, affected: '', reason: qReadReason(root) });
      showToast('已切回，ETA 已重算');
      qRoute(true);
      return true;
    },
  });
}

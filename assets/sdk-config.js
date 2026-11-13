/* 触达 H5 SDK · 配置弹窗（iframe 页）— PRD 6.8.3
 * 复用触达「新建任务」弹出层（reach.js / content-editor.js），各通道内容编辑与触达一致（含 Viber 渠道 / 分类 / 账号）。
 * SDK 只建「系统调用」任务：不选任务类型、人群、发送时间；人群与时间由上游按任务code 调用时传入。
 * 上游 init 传入的上下文自动补全并只读：site id → 产品线；activity_id → 活动（及其产品线）；task_code → 任务code。
 */
(function () {
  const q = new URLSearchParams(location.search);
  const P = {
    app: q.get('app') || '星灵',
    site: q.get('site') || '',
    activity: q.get('activity') || '',
    code: q.get('code') || '',
    ch: q.get('ch') || 'sms',
  };
  /* 活动 → 产品线（MMS 活动自带产品线；原型取固定映射） */
  const ACT_SITE = { ACT202607001: 'bp-growth', ACT202607002: 'bp-growth', ACT202607003: 'bp-growth', ACT202607004: 'bp-growth',
    ACT202607005: 'bp-growth', ACT202607006: 'bp-growth', ACT202607007: 'bp-growth', ACT202607008: 'bp-growth' };
  const post = (type, data) => { if (window.parent !== window) window.parent.postMessage({ src: 'reach-sdk', type, data }, '*'); };

  function lockField(el, text) {
    if (!el) return;
    el.disabled = true;
    const field = el.closest('.field');
    if (field && !field.querySelector('.sdk-auto')) field.insertAdjacentHTML('beforeend', `<div class="v2-hint sdk-auto">${text}</div>`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindDrawerClose();
    initDraft(toDraftChannel(P.ch));
    draft.taskType = 'system';
    syncCategoryUi();
    syncTaskTypeUi();
    /* 任务类型固定系统调用：隐藏单选，标题说明 */
    const typeField = document.getElementById('ntTaskType')?.closest('.field');
    if (typeField) typeField.hidden = true;
    document.getElementById('taskDrawerTitle').innerHTML = `触达配置 <span class="tag tag-gray-outline" style="margin-left:8px">系统调用</span><span class="v2-hint" style="margin-left:8px;font-weight:400">人群、发送时间由 ${esc(P.app)} 按任务code 调用时传入</span>`;
    document.getElementById('createTaskBtn').textContent = '提交';

    const pl = document.getElementById('ntProductLine');
    const act = document.getElementById('ntActivity');
    const site = P.site || (P.activity && ACT_SITE[P.activity]) || '';
    if (P.activity && act) {
      act.value = P.activity;
      syncDraftActivityFromSelect();
      lockField(act, `由 ${esc(P.app)} 传入（activity_id）`);
    }
    if (site && pl) {
      pl.value = site;
      draft.productLine = rhCurrentSite();
      lockField(pl, P.site ? `由 ${esc(P.app)} 传入（site id）` : '由活动带出');
    }
    if (!document.getElementById('ntName').value) {
      const opt = act && act.selectedOptions[0];
      if (opt && opt.value) document.getElementById('ntName').value = opt.textContent.trim();
    }
    const code = document.getElementById('ntTaskCode');
    if (code) {
      code.placeholder = '上游调用时传此 code，接入方内唯一';
      if (P.code) { code.value = P.code; draft.taskCode = P.code; lockField(code, `由 ${esc(P.app)} 传入`); }
    }
    if (typeof syncPlMeta === 'function') syncPlMeta();
    renderRows();
    renderPreview();
    rhAfterRender();
    openDrawer('taskDrawer');
    openPanel('content');
    initCharCounters(document.getElementById('taskDrawer'));
    refreshIcons();

    /* 提交成功 = RUNNING_TASKS 新增一条后关闭抽屉 → 回调 submitted；否则回调 closed */
    const startLen = RUNNING_TASKS.length;
    const rawClose = closeDrawer;
    window.closeDrawer = function (id) {
      rawClose(id);
      if (id !== 'taskDrawer') return;
      if (RUNNING_TASKS.length > startLen) {
        const t = RUNNING_TASKS[0];
        post('submitted', {
          name: t.name, site: t.site, taskCode: t.taskCode, activityId: t.activityId, activityName: t.activityName,
          channels: draft.channels.map(c => rhChannelLabel(c)),
          contents: Object.fromEntries(draft.channels.map(c => [rhChannelLabel(c), { text: previewText(draft.perChannel[c].content) }])),
          emailCheck: t.emailCheck ? true : false,
        });
      } else if (!window.__sdkClosed) { window.__sdkClosed = true; post('closed', {}); }
    };
  });
})();

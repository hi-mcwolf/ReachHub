/* 触达 H5 SDK · 配置弹窗（iframe 页）— PRD 6.8.3
 * 复用触达「新建任务」弹出层（reach.js / content-editor.js），各通道内容编辑与触达一致（含 Viber 渠道 / 分类 / 账号）。
 * 弹窗只配任务code 与通道内容，「保存」按任务code 保存配置，不建任务；名称、产品线、活动由上游传入（产品线 / 活动只读）。
 * 上游业务单审批通过（或无需审批时提交）后，由上游服务端带任务code + 名称 + 审批信息创建系统调用任务（6.7.3）。
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
    document.getElementById('taskDrawerTitle').innerHTML = `触达配置 <span class="tag tag-gray-outline" style="margin-left:8px">系统调用</span><span class="v2-hint" style="margin-left:8px;font-weight:400">按任务code 保存；任务在 ${esc(P.app)} 业务单审批通过 / 提交后创建，人群与发送时间按任务code 调用时传入</span>`;
    document.getElementById('createTaskBtn').textContent = '保存';
    /* 名称由上游创建任务时传入：弹窗不显示 */
    const nameEl = document.getElementById('ntName');
    nameEl.value = '（上游传入）';
    nameEl.closest('.field').hidden = true;
    const rawToast = window.showToast;
    window.showToast = m => rawToast(String(m).replace(/^已提交审批.*/, '已保存配置'));

    const pl = document.getElementById('ntProductLine');
    const act = document.getElementById('ntActivity');
    const site = P.site || (P.activity && ACT_SITE[P.activity]) || '';
    if (P.activity && act) {
      act.value = P.activity;
      syncDraftActivityFromSelect();
      lockField(act, `由 ${esc(P.app)} 传入（activity_id）`);
    }
    if (!P.activity && act) act.closest('.field').hidden = true; /* 未传活动不显示 */
    if (site && pl) {
      pl.value = site;
      draft.productLine = rhCurrentSite();
      lockField(pl, P.site ? `由 ${esc(P.app)} 传入（site id）` : '由活动带出');
    }
    const code = document.getElementById('ntTaskCode');
    if (code) {
      code.placeholder = '上游调用时传此 code，接入方内唯一';
      if (P.code) { code.value = P.code; draft.taskCode = P.code; lockField(code, `由 ${esc(P.app)} 传入`); }
      else {
        /* 自动生成：{接入方前缀}_{yyyyMMdd}_{3 位序号}，可修改 */
        const pre = { '星灵': 'XL', 'MMS': 'MMS' }[P.app] || 'OMS';
        const d = new Date(), p2 = n => String(n).padStart(2, '0');
        const seq = String(Number(sessionStorage.getItem('sdkCodeSeq') || 0) + 1);
        sessionStorage.setItem('sdkCodeSeq', seq);
        code.value = `${pre}_${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${seq.padStart(3, '0')}`;
        draft.taskCode = code.value;
        const hint = document.createElement('span');
        hint.className = 'v2-hint'; hint.style.marginLeft = '8px'; hint.textContent = '已自动生成，可修改';
        code.insertAdjacentElement('afterend', hint);
      }
    }
    if (typeof syncPlMeta === 'function') syncPlMeta();
    renderRows();
    renderPreview();
    rhAfterRender();
    openDrawer('taskDrawer');
    openPanel('content');
    initCharCounters(document.getElementById('taskDrawer'));
    refreshIcons();

    /* 保存成功 = RUNNING_TASKS 新增一条后关闭抽屉 → 回调 saved（任务code）；否则回调 closed */
    const startLen = RUNNING_TASKS.length;
    const rawClose = closeDrawer;
    window.closeDrawer = function (id) {
      rawClose(id);
      if (id !== 'taskDrawer') return;
      if (RUNNING_TASKS.length > startLen) {
        const t = RUNNING_TASKS[0];
        post('saved', {
          site: t.site, taskCode: t.taskCode, activityId: t.activityId, activityName: t.activityName,
          channels: draft.channels.map(c => rhChannelLabel(c)),
          contents: Object.fromEntries(draft.channels.map(c => [rhChannelLabel(c), { text: previewText(draft.perChannel[c].content) }])),
          emailCheck: t.emailCheck ? true : false,
        });
      } else if (!window.__sdkClosed) { window.__sdkClosed = true; post('closed', {}); }
    };
  });
})();

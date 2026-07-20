/* 页面二：触达主页 + 新建任务抽屉 */

const CHANNELS = {
  sms:      { label: 'SMS',      tip: '短信',     icon: 'message-square' },
  email:    { label: '邮件',     tip: '邮件',     icon: 'mail' },
  push:     { label: 'Push',     tip: 'Push',     icon: 'bell' },
  viber:    { label: 'Viber',    tip: 'Viber',    icon: 'phone-call' },
  telegram: { label: 'Telegram', tip: 'Telegram', icon: 'send' },
  messenger:{ label: 'Messenger',tip: 'Messenger',icon: 'message-circle' },
};

const AUDIENCES = [
  { id: 'active',  name: '活跃用户',     count: 12800 },
  { id: 'vip',     name: 'VIP用户',      count: 2300 },
  { id: 'newreg',  name: '新注册用户',   count: 5600 },
  { id: 'churn',   name: '流失预警用户', count: 1800 },
  { id: 'high',    name: '高充值用户',   count: 960 },
  { id: 'silent',  name: '沉默用户',     count: 8400 },
];

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const tasks = [
  { name: '世界杯竞猜预热短信', channel: 'sms',   total: 12800, sent: 9632 },
  { name: '新用户充值召回邮件', channel: 'email', total: 5600,  sent: 2128 },
];

let draft = null;
let panelAudienceMsel = null;
let panelContentEditor = null;
let activePanel = null;
const CFG_ROWS = ['rowAudience', 'rowTiming', 'rowContent'];

function newChannelConfig() {
  return { timing: null, content: null };
}

function hasContent(content) {
  if (!content) return false;
  if (typeof content === 'string') return content.trim().length > 0;
  return contentSummary(content).trim().length > 0;
}

function previewText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content.text) return content.text;
  if (content.body) {
    const tmp = document.createElement('div');
    tmp.innerHTML = content.body;
    return tmp.textContent || '';
  }
  return content.title || '';
}

function initDraft(channel) {
  draft = {
    name: '',
    productLine: '',
    taskType: 'manual',
    audienceTags: [],
    audienceFiles: [],
    strategies: [],
    channels: [channel],
    active: channel,
    perChannel: { [channel]: newChannelConfig() },
  };
  document.getElementById('ntName').value = '';
  document.getElementById('ntProductLine').value = '';
  document.querySelectorAll('input[name="taskType"]').forEach(r => {
    r.checked = r.value === 'manual';
  });
  closePanel();
  renderTabs();
  renderRows();
  renderPreview();
}

function updateGreeting() {
  const greeting = document.getElementById('greeting');
  const greetSub = document.getElementById('greetSub');
  if (!greeting || !greetSub) return;
  const h = new Date().getHours();
  const part = h < 11 ? '早上' : h < 14 ? '中午' : '晚上';
  greeting.textContent = `${part}好，尊敬的 marvin@ 指挥官`;
  greetSub.innerHTML =
    `您当前共有 <b>${tasks.length}</b> 个任务在执行，您可以点击左侧展示区新建触达任务`;
}

function updatePhoneClock() {
  const phoneTime = document.getElementById('phoneTime');
  const phoneDate = document.getElementById('phoneDate');
  if (!phoneTime || !phoneDate) return;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  phoneTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  phoneDate.textContent =
    `${now.getMonth() + 1}月${now.getDate()}日 星期${'日一二三四五六'[now.getDay()]}`;
}

function bindPhoneScreen() {
  const screen = document.getElementById('phoneScreen');
  const tip = document.getElementById('cursorTip');
  if (!screen || !tip) return;
  screen.addEventListener('mousemove', e => {
    const item = e.target.closest('.app-item');
    tip.textContent = item
      ? `创建${CHANNELS[item.dataset.channel].tip}`
      : '点击APP图标创建任务';
    tip.style.display = 'block';
    tip.style.left = e.clientX + 'px';
    tip.style.top = e.clientY + 'px';
  });
  screen.addEventListener('mouseleave', () => { tip.style.display = 'none'; });

  screen.querySelectorAll('.app-item').forEach(item => {
    item.addEventListener('click', () => {
      tip.style.display = 'none';
      initDraft(item.dataset.channel);
      openDrawer('taskDrawer');
      initCharCounters(document.getElementById('taskDrawer'));
    });
  });
}

function renderTabs() {
  const host = document.getElementById('ntTabs');
  const remaining = Object.keys(CHANNELS).filter(c => !draft.channels.includes(c));
  host.innerHTML = `
    ${draft.channels.map(c => `
      <button type="button" class="tab${c === draft.active ? ' active' : ''}" data-tab="${c}">${CHANNELS[c].tip}</button>
    `).join('')}
    ${remaining.length ? '<button type="button" class="tab-add" id="tabAdd" title="添加通道"><i data-lucide="plus"></i></button>' : ''}
  `;

  host.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      draft.active = tab.dataset.tab;
      closePanel();
      renderTabs();
      renderRows();
      renderPreview();
    });
  });

  const addBtn = host.querySelector('#tabAdd');
  if (addBtn) {
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      const existing = host.querySelector('.popover');
      if (existing) { existing.remove(); return; }
      const pop = document.createElement('div');
      pop.className = 'popover';
      pop.innerHTML = remaining.map(c =>
        `<button type="button" class="popover-item" data-add="${c}">${CHANNELS[c].tip}</button>`
      ).join('');
      host.appendChild(pop);
      pop.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          const c = btn.dataset.add;
          draft.channels.push(c);
          draft.perChannel[c] = newChannelConfig();
          draft.active = c;
          closePanel();
          renderTabs();
          renderRows();
          renderPreview();
        });
      });
      const closePop = ev => {
        if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', closePop); }
      };
      setTimeout(() => document.addEventListener('click', closePop));
    });
  }
  refreshIcons();
}

function timingLabel(t) {
  if (!t) return null;
  if (t.type === 'now') return '审批通过后发送';
  if (t.type === 'scheduled') return `定时 · ${(t.datetime || '').replace('T', ' ')}`;
  if (t.type === 'recurring') {
    return t.freq === 'weekly'
      ? `循环 · 每周${(t.weekday || '周一').replace('周', '')} ${t.time}`
      : `循环 · 每天 ${t.time}`;
  }
  return null;
}

function renderRows() {
  const av = document.getElementById('audienceValue');
  const parts = [];
  if (draft.audienceTags.length) {
    parts.push(draft.audienceTags.map(id => AUDIENCES.find(a => a.id === id).name).join(' · '));
  }
  if (draft.audienceFiles.length) parts.push(`已上传 ${draft.audienceFiles.length} 个文件`);
  av.innerHTML = parts.length
    ? `<span class="cfg-summary">${parts.join(' ｜ ')}</span>`
    : '<span class="placeholder">请选择人群</span>';

  const cfg = draft.perChannel[draft.active];
  const tv = document.getElementById('timingValue');
  const tl = timingLabel(cfg.timing);
  tv.innerHTML = tl
    ? `<span class="tag tag-primary">${tl}</span>`
    : '<span class="placeholder">请选择发送时机</span>';

  const cv = document.getElementById('contentValue');
  if (hasContent(cfg.content)) {
    cv.innerHTML = `<span class="cfg-summary">${contentSummary(cfg.content)}</span>`;
  } else {
    cv.innerHTML = '<span class="placeholder">请配置发送内容</span>';
  }
}

function renderPreview() {
  const host = document.getElementById('ntPreview');
  const ch = draft.active;
  const content = draft.perChannel[ch].content;
  const text = previewText(content) || '您配置的内容将实时显示在这里…';
  const emptyCls = hasContent(content) ? '' : ' empty';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const emailSubject = (typeof content === 'object' && content?.subject)
    || draft.name || document.getElementById('ntName').value || '触达通知';
  const emailSender = (typeof content === 'object' && content?.sender) || 'marketing@bingoplus.com';
  const pushTitle = (typeof content === 'object' && content?.title) || 'BingoPlus';

  let inner = '';
  if (ch === 'sms') {
    inner = `
      <div class="pv-header">
        <div class="pv-avatar"><i data-lucide="message-square"></i></div>
        <div class="pv-sender">106 9013 3***</div>
      </div>
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
      <div class="pv-lock-time">
        <div class="t">${timeStr}</div>
        <div class="d">${now.getMonth() + 1}月${now.getDate()}日 星期${'日一二三四五六'[now.getDay()]}</div>
      </div>
      <div class="pv-notify">
        <div class="pv-app-icon"><i data-lucide="bell"></i></div>
        <div>
          <div class="pv-n-title">${pushTitle}</div>
          <div class="pv-n-body${emptyCls}">${text}</div>
        </div>
      </div>`;
  } else if (ch === 'viber' || ch === 'telegram' || ch === 'messenger') {
    inner = `
      <div class="pv-header">
        <div class="pv-avatar"><i data-lucide="${CHANNELS[ch].icon}"></i></div>
        <div class="pv-sender">BingoPlus 官方 · ${CHANNELS[ch].label}</div>
      </div>
      <div class="pv-bubble${emptyCls}">${text}</div>
      <div class="pv-time-hint">${timeStr}</div>`;
  }

  host.innerHTML = `<div class="pv-screen">${inner}</div>`;
  refreshIcons();
}

function closePanel() {
  panelAudienceMsel?.destroy();
  panelAudienceMsel = null;
  panelContentEditor?.destroy();
  panelContentEditor = null;
  activePanel = null;
  document.getElementById('ntPanel').innerHTML =
    '<div class="panel-empty">点击左侧配置项查看详情</div>';
  CFG_ROWS.forEach(id => document.getElementById(id).classList.remove('active'));
}

function openPanel(type) {
  panelAudienceMsel?.destroy();
  panelAudienceMsel = null;
  panelContentEditor?.destroy();
  panelContentEditor = null;
  activePanel = type;
  CFG_ROWS.forEach(id => document.getElementById(id).classList.remove('active'));

  const panel = document.getElementById('ntPanel');

  if (type === 'audience') {
    document.getElementById('rowAudience').classList.add('active');
    panel.innerHTML = `
      <div class="panel-title">选择人群</div>
      <p class="panel-hint">星灵标签与上传至少选择 1 项</p>
      <div class="tabs" id="audTabs">
        <button type="button" class="tab active" data-aud-tab="tags">星灵标签</button>
        <button type="button" class="tab" data-aud-tab="upload">上传</button>
      </div>
      <div class="tab-pane" id="audPaneTags">
        <div id="audTagMsel"></div>
      </div>
      <div class="tab-pane" hidden id="audPaneUpload">
        <div class="upload-area" tabindex="0">
          <div class="upload-btns">
            <button type="button" class="btn btn-outline btn-sm" id="uploadFileBtn"><i data-lucide="file-up"></i>上传文件</button>
            <button type="button" class="btn btn-outline btn-sm" id="uploadFolderBtn"><i data-lucide="folder-up"></i>上传文件夹</button>
            <a class="link-btn" id="downloadTplBtn"><i data-lucide="download"></i>模板下载</a>
          </div>
          <p class="upload-drop-hint">支持拖拽或粘贴文件、文件夹到此处上传</p>
          <input type="file" id="uploadFileInput" accept=".csv,.xlsx,.txt" hidden>
          <input type="file" id="uploadFolderInput" webkitdirectory hidden>
          <ul class="upload-list" id="uploadList"></ul>
        </div>
      </div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    const defaultAudTab = draft.audienceFiles.length && !draft.audienceTags.length ? 'upload' : 'tags';
    const switchAudTab = tab => {
      panel.querySelectorAll('#audTabs .tab').forEach(t => {
        t.classList.toggle('active', t.dataset.audTab === tab);
      });
      panel.querySelector('#audPaneTags').hidden = tab !== 'tags';
      panel.querySelector('#audPaneUpload').hidden = tab !== 'upload';
    };
    switchAudTab(defaultAudTab);
    panel.querySelectorAll('#audTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => switchAudTab(tab.dataset.audTab));
    });

    panelAudienceMsel = createSearchMultiSelect({
      container: panel.querySelector('#audTagMsel'),
      options: AUDIENCES.map(a => ({
        value: a.id,
        label: a.name,
        desc: `${a.count.toLocaleString()} 人`,
      })),
      selected: draft.audienceTags,
      placeholder: '请选择星灵标签',
      searchPlaceholder: '搜索标签…',
    });

    const pendingFiles = [...draft.audienceFiles];
    const renderUploadList = () => {
      panel.querySelector('#uploadList').innerHTML = pendingFiles.map((f, i) => `
        <li><i data-lucide="file-check-2"></i>${f}<button type="button" class="icon-btn" data-rm="${i}"><i data-lucide="x"></i></button></li>
      `).join('');
      panel.querySelectorAll('[data-rm]').forEach(btn => {
        btn.addEventListener('click', () => {
          pendingFiles.splice(Number(btn.dataset.rm), 1);
          renderUploadList();
        });
      });
      refreshIcons();
    };
    renderUploadList();

    const fileInput = panel.querySelector('#uploadFileInput');
    const folderInput = panel.querySelector('#uploadFolderInput');
    const uploadArea = panel.querySelector('.upload-area');
    const audienceAccept = '.csv,.xlsx,.txt';

    const addUploadedFiles = files => {
      files.forEach(f => pendingFiles.push(f.name));
      renderUploadList();
    };
    const addUploadedFolders = folders => {
      folders.forEach(({ name, count }) => pendingFiles.push(`${name}/（${count} 个文件）`));
      renderUploadList();
    };

    panel.querySelector('#uploadFileBtn').addEventListener('click', () => fileInput.click());
    panel.querySelector('#uploadFolderBtn').addEventListener('click', () => folderInput.click());
    fileInput.addEventListener('change', () => {
      addUploadedFiles([...fileInput.files].filter(f => matchFileAccept(f, audienceAccept)));
      fileInput.value = '';
    });
    folderInput.addEventListener('change', () => {
      if (folderInput.files.length) {
        const dir = folderInput.files[0].webkitRelativePath.split('/')[0];
        addUploadedFolders([{ name: dir, count: folderInput.files.length }]);
      }
      folderInput.value = '';
    });
    bindDropPasteUpload({
      zone: uploadArea,
      accept: audienceAccept,
      allowFolder: true,
      onFiles: addUploadedFiles,
      onFolders: addUploadedFolders,
    });
    panel.querySelector('#downloadTplBtn').addEventListener('click', () => showToast('人群上传模板已开始下载'));

    panel.querySelector('#panelOk').addEventListener('click', () => {
      const tags = panelAudienceMsel.getValue();
      if (!tags.length && !pendingFiles.length) {
        showToast('星灵标签与上传至少选择 1 项');
        return;
      }
      draft.audienceTags = tags;
      draft.audienceFiles = pendingFiles;
      closePanel();
      renderRows();
    });
  } else if (type === 'timing') {
    document.getElementById('rowTiming').classList.add('active');
    const t = draft.perChannel[draft.active].timing || {};
    const type0 = t.type || 'now';
    panel.innerHTML = `
      <div class="panel-title">发送时机 · ${CHANNELS[draft.active].tip}</div>
      <div class="field">
        <div class="radio-group">
          <label><input type="radio" name="ntTiming" value="now" ${type0 === 'now' ? 'checked' : ''}>审批通过后发送</label>
          <label><input type="radio" name="ntTiming" value="scheduled" ${type0 === 'scheduled' ? 'checked' : ''}>定时</label>
          <label><input type="radio" name="ntTiming" value="recurring" ${type0 === 'recurring' ? 'checked' : ''}>循环</label>
        </div>
      </div>
      <div class="send-config" id="ntScheduled" ${type0 !== 'scheduled' ? 'hidden' : ''}>
        <input type="datetime-local" class="input" id="ntDatetime" value="${t.datetime || '2026-07-15T10:00'}">
      </div>
      <div class="send-config" id="ntRecurring" ${type0 !== 'recurring' ? 'hidden' : ''}>
        <select class="select" id="ntFreq">
          <option value="daily" ${t.freq !== 'weekly' ? 'selected' : ''}>每天</option>
          <option value="weekly" ${t.freq === 'weekly' ? 'selected' : ''}>每周</option>
        </select>
        <select class="select" id="ntWeekday" ${t.freq !== 'weekly' ? 'hidden' : ''}>
          ${WEEKDAYS.map(w => `<option ${t.weekday === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
        <input type="time" class="input" id="ntTime" value="${t.time || '10:00'}">
      </div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    panel.querySelectorAll('input[name="ntTiming"]').forEach(r => {
      r.addEventListener('change', () => {
        panel.querySelector('#ntScheduled').hidden = r.value !== 'scheduled';
        panel.querySelector('#ntRecurring').hidden = r.value !== 'recurring';
      });
    });
    panel.querySelector('#ntFreq').addEventListener('change', e => {
      panel.querySelector('#ntWeekday').hidden = e.target.value !== 'weekly';
    });
    panel.querySelector('#panelOk').addEventListener('click', () => {
      const sel = panel.querySelector('input[name="ntTiming"]:checked').value;
      draft.perChannel[draft.active].timing = {
        type: sel,
        datetime: panel.querySelector('#ntDatetime').value,
        freq: panel.querySelector('#ntFreq').value,
        weekday: panel.querySelector('#ntWeekday').value,
        time: panel.querySelector('#ntTime').value,
      };
      closePanel();
      renderRows();
    });
  } else if (type === 'content') {
    document.getElementById('rowContent').classList.add('active');
    panel.innerHTML = `
      <div class="panel-title">发送内容 · ${CHANNELS[draft.active].tip}</div>
      <div id="ntContentEditor"></div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" id="panelCancel">取消</button>
        <button type="button" class="btn btn-primary" id="panelOk">确认</button>
      </div>`;

    const savedContent = draft.perChannel[draft.active].content;
    panelContentEditor = createContentEditor({
      container: panel.querySelector('#ntContentEditor'),
      channel: draft.active,
      value: savedContent,
      showTemplateTools: true,
      onChange: () => {
        const previewContent = panelContentEditor.getValue();
        draft.perChannel[draft.active].content = previewContent;
        renderPreview();
      },
    });

    panel.querySelector('#panelOk').addEventListener('click', () => {
      draft.perChannel[draft.active].content = panelContentEditor.getValue();
      closePanel();
      renderRows();
      renderPreview();
    });
  }

  panel.querySelector('#panelCancel')?.addEventListener('click', () => {
    closePanel();
    renderPreview();
  });
  enhanceSelects(panel);
  refreshIcons();
}

function createTask() {
  const name = document.getElementById('ntName').value.trim();
  if (!name) { showToast('请输入名称'); return; }
  if (!document.getElementById('ntProductLine').value) { showToast('请选择产品线'); return; }
  draft.taskType = document.querySelector('input[name="taskType"]:checked')?.value || 'manual';
  if (!draft.audienceTags.length && !draft.audienceFiles.length) {
    showToast('请选择人群（星灵标签或上传至少 1 项）');
    return;
  }
  const missing = draft.channels.find(c => !draft.perChannel[c].timing || !hasContent(draft.perChannel[c].content));
  if (missing) {
    showToast(`请完成「${CHANNELS[missing].tip}」通道的时机与内容配置`);
    return;
  }

  const total = draft.audienceTags.reduce((sum, id) => sum + AUDIENCES.find(a => a.id === id).count, 0)
    + draft.audienceFiles.length * 1000;
  draft.channels.forEach(c => {
    tasks.unshift({ name, channel: c, total, sent: 0 });
  });

  updateGreeting();
  closeDrawer('taskDrawer');
  showToast('已提交审批');
}

function bindTaskDrawer() {
  document.getElementById('rowAudience')?.addEventListener('click', () => openPanel('audience'));
  document.getElementById('rowTiming')?.addEventListener('click', () => openPanel('timing'));
  document.getElementById('rowContent')?.addEventListener('click', () => openPanel('content'));
  document.getElementById('ntName')?.addEventListener('input', () => {
    if (draft && draft.active === 'email') renderPreview();
  });
  document.querySelectorAll('input[name="taskType"]').forEach(r => {
    r.addEventListener('change', () => { if (draft) draft.taskType = r.value; });
  });
  document.getElementById('createTaskBtn')?.addEventListener('click', createTask);
}

document.addEventListener('DOMContentLoaded', () => {
  const isReachPage = !!document.getElementById('phoneScreen');

  if (isReachPage) {
    renderSidebar('reach', 'reach-task');
    renderTopbar('reach');
    bindDrawerClose();
    updateGreeting();
    updatePhoneClock();
    setInterval(updatePhoneClock, 30 * 1000);
    bindPhoneScreen();
    refreshIcons();
  }

  if (document.getElementById('taskDrawer')) {
    bindTaskDrawer();
  }
});

/* 共享内容编辑器：新建任务 / SDK 触达配置 */

const CONTENT_TPL_OPTIONS = [
  { id: 'quiz', name: '世界杯竞猜提醒', text: "Only the best teams remain! Warm up for the Quarterfinals with today's FREE World Cup Quiz. Visit bingoplus.com." },
  { id: 'recharge', name: '充值优惠通知', text: '尊敬的用户，本周充值满 500 即享 8% 加赠，活动今晚 24:00 截止，立即打开 App 参与吧！' },
  { id: 'recall', name: '流失召回话术', text: '您好，我们注意到您已有一段时间未登录。现为您专属保留了回归礼包，登录即可领取，期待您的回来！' },
];

const INBOX_MSG_TYPES = [
  { value: 'otp', label: 'OTP' },
  { value: 'deposit_withdraw', label: 'Deposit and withdraw' },
  { value: 'event_notification', label: 'event notifacation' },
];
const INBOX_JUMP_TYPES = [
  { value: 'inapp', label: '站内' },
  { value: 'outapp', label: '站外' },
  { value: 'game', label: '游戏' },
];

const VIBER_BIZ_CATEGORIES = ['活跃用户', '沉默用户', '新注册用户', '未订阅用户'];
const VIBER_BIZ_ACCOUNTS = ['BingoPlus Official', 'BPLUS Biz', 'BP VIP Biz'];
const VIBER_BOT_ACCOUNTS = ['@BPQuizBot', '@BPServiceBot', '@BPPromoBot'];
const VIBER_GAME_TYPES = ['电子游艺', '真人棋牌', '体育竞猜'];
const VIBER_GAME_PLATFORMS = ['PG Soft', 'JILI', 'Evolution'];
const VIBER_GAMES = ['Fortune Tiger', 'Money Coming', 'Crazy 777', 'Golden Empire'];

const MC_ACCOUNTS = {
  messenger: ['@BingoPlusBot', 'BingoPlus 官方主页'],
  telegram: ['@BingoPlusTGBot', 'BingoPlus 官方频道'],
};
const MC_TYPES = ['Text', 'Photo', 'Animation', 'Video', 'Media Group'];

const RTE_CHANNELS = new Set(['email', 'inbox', 'messenger', 'telegram']);

function normalizeChannel(ch) {
  const map = {
    SMS: 'sms', 邮件: 'email', Push: 'push', Viber: 'viber', Messenger: 'messenger',
    Telegram: 'telegram', Inbox: 'inbox', 站内信: 'inbox',
  };
  return map[ch] || (ch || '').toLowerCase();
}

function defaultContentValue(channel) {
  const ch = normalizeChannel(channel);
  if (ch === 'email') return { contentType: 'custom', subject: '', sender: 'marketing@bingoplus.com', body: '', htmlFile: null };
  if (ch === 'push') return { title: '', body: '', appIcon: null, image: null, androidUrl: '', iosUrl: '' };
  if (ch === 'sms') return { configMode: 'unified', text: '', shortLinkUrl: '', shortLinkResult: '', files: [] };
  if (ch === 'inbox') return { msgType: '', title: '', body: '', buttonText: '', jumpType: '', url: '', jumpParams: '' };
  if (ch === 'viber') {
    return {
      channel: 'biz',
      biz: { category: '', account: '', type: 'Text', body: '', buttonImage: null, linkType: 'internal', url: '' },
      bot: {
        account: '', content: 'single',
        gameType: '', gamePlatform: '', game: '',
        singleExtra: 'top_win', singleCustomBody: '',
        multiGames: [], customBody: '',
      },
    };
  }
  if (ch === 'messenger' || ch === 'telegram') {
    return {
      account: '', type: 'Text', body: '', image: null, thumbnail: null, buttonImage: null, url: '',
      mediaGroup: [{ type: 'Photo', file: null }, { type: 'Photo', file: null }],
    };
  }
  return { text: '' };
}

function ensureContentValue(channel, value) {
  const ch = normalizeChannel(channel);
  const base = defaultContentValue(ch);
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') return { ...base, text: value, body: value };
    return { ...base };
  }
  const merged = { ...base, ...value };
  if (base.biz) merged.biz = { ...base.biz, ...(value.biz || {}) };
  if (base.bot) merged.bot = { ...base.bot, ...(value.bot || {}) };
  if (base.mediaGroup) merged.mediaGroup = (value.mediaGroup && value.mediaGroup.length >= 2) ? value.mediaGroup : base.mediaGroup;
  return merged;
}

function loadQuillAssets() {
  if (window.Quill) return Promise.resolve();
  if (loadQuillAssets._promise) return loadQuillAssets._promise;
  loadQuillAssets._promise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return loadQuillAssets._promise;
}

function templateToolsHtml(showTemplateTools) {
  if (!showTemplateTools) return '';
  return `
    <div class="field-tools">
      <select class="select select-sm ce-tpl-select">
        <option value="">选择模板</option>
        ${CONTENT_TPL_OPTIONS.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
      </select>
      <button type="button" class="btn btn-outline btn-sm ce-save-tpl">保存为模板</button>
    </div>
    <div class="tpl-name-row ce-tpl-name-row" hidden>
      <input class="input ce-tpl-name" placeholder="请输入模板名称">
      <button type="button" class="btn btn-primary btn-sm ce-tpl-ok">保存</button>
      <button type="button" class="btn btn-outline btn-sm ce-tpl-cancel">取消</button>
    </div>`;
}

function bindTemplateTools(root, getText, setText) {
  const tplSelect = root.querySelector('.ce-tpl-select');
  const tplTools = root.querySelector('.field-tools');
  const tplRow = root.querySelector('.ce-tpl-name-row');
  if (!tplSelect) return;

  tplSelect.addEventListener('change', () => {
    const tpl = CONTENT_TPL_OPTIONS.find(t => t.id === tplSelect.value);
    if (tpl) setText(tpl.text);
  });

  root.querySelector('.ce-save-tpl')?.addEventListener('click', () => {
    if (!getText().trim()) { showToast('请先输入内容再保存为模板'); return; }
    if (tplTools) tplTools.hidden = true;
    tplRow.hidden = false;
    root.querySelector('.ce-tpl-name')?.focus();
    initCharCounters(tplRow);
  });
  root.querySelector('.ce-tpl-ok')?.addEventListener('click', () => {
    const name = root.querySelector('.ce-tpl-name')?.value.trim();
    if (!name) { showToast('请输入模板名称'); return; }
    tplRow.hidden = true;
    if (tplTools) tplTools.hidden = false;
    root.querySelector('.ce-tpl-name').value = '';
    showToast(`模板「${name}」已保存`);
  });
  root.querySelector('.ce-tpl-cancel')?.addEventListener('click', () => {
    tplRow.hidden = true;
    if (tplTools) tplTools.hidden = false;
    root.querySelector('.ce-tpl-name').value = '';
  });
}

function bindUpload(btn, input, preview, onChange, { accept = 'image/*' } = {}) {
  const zone = preview.closest('.upload-field') || preview;

  const applyFile = file => {
    if (!file || !matchFileAccept(file, accept)) return;
    preview.classList.add('has-file');
    preview.innerHTML = `<i data-lucide="image"></i><span>${file.name}</span>`;
    refreshIcons();
    onChange(file.name);
  };

  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    applyFile(input.files[0]);
    input.value = '';
  });
  bindDropPasteUpload({
    zone,
    accept,
    onFiles: files => applyFile(files[0]),
  });
}

function mockShortLink() {
  const id = Math.random().toString(36).slice(2, 8);
  return `https://bpl.us/${id}`;
}

function createContentEditor({ container, channel, value, onChange, showTemplateTools = true, showSmsConfigMode = true }) {
  const ch = normalizeChannel(channel);
  let data = ensureContentValue(ch, value);
  let quill = null;
  let sourceMode = false;
  let destroyed = false;
  let currentGetValue = () => data;
  let mcMediaGroupItems = (data.mediaGroup || []).map(item => ({ ...item }));

  const emit = () => { if (!destroyed && onChange) onChange(getValue()); };

  function getValue() {
    return currentGetValue();
  }

  function setPlainText(text) {
    const ta = container.querySelector('.ce-text');
    if (ta) {
      ta.value = text;
      ta.dispatchEvent(new Event('input'));
    } else if (quill) {
      quill.clipboard.dangerouslyPasteHTML(text);
      updateRteCounter();
    } else if (container.querySelector('.ce-source')) {
      const source = container.querySelector('.ce-source');
      source.value = text;
      source.dispatchEvent(new Event('input'));
    }
    emit();
  }

  function updateRteCounter() {
    const counter = container.querySelector('.ce-rte-counter');
    if (!counter) return;
    const sourceTa = container.querySelector('.ce-source');
    const len = sourceMode
      ? (sourceTa?.value.length ?? 0)
      : (quill ? quill.getText().trimEnd().length : 0);
    counter.textContent = formatCharCount(len, null);
  }

  function getRteHtml(fallback) {
    if (sourceMode) return container.querySelector('.ce-source')?.value ?? fallback;
    if (quill) return quill.root.innerHTML;
    return fallback;
  }

  /* 通用富文本挂载：邮件正文 / 站内信内容 / Messenger·Telegram 正文 共用 */
  function mountRte(initialHtml, { withVariable = true } = {}) {
    const quillHost = container.querySelector('.ce-quill');
    const sourceTa = container.querySelector('.ce-source');
    if (!quillHost || !sourceTa) return Promise.resolve(null);
    sourceTa.value = initialHtml || '';
    quill = null;
    sourceMode = false;

    return loadQuillAssets().then(() => {
      if (destroyed) return null;
      const toolbarOptions = [
        [{ font: [] }, { size: [] }],
        ['bold', 'italic', 'underline'],
        ['link', 'image'],
        ['clean'],
        withVariable ? ['source', 'variable'] : ['source'],
      ];
      quill = new Quill(quillHost, {
        theme: 'snow',
        modules: {
          toolbar: {
            container: toolbarOptions,
            handlers: {
              source() {
                sourceMode = !sourceMode;
                if (sourceMode) {
                  sourceTa.value = quill.root.innerHTML;
                  quillHost.hidden = true;
                  sourceTa.hidden = false;
                } else {
                  quill.clipboard.dangerouslyPasteHTML(sourceTa.value);
                  sourceTa.hidden = true;
                  quillHost.hidden = false;
                }
                updateRteCounter();
                emit();
              },
              variable() {
                insertVariableAtCursor();
              },
            },
          },
        },
      });

      const icons = Quill.import('ui/icons');
      icons.source = '<svg viewbox="0 0 18 18"><polyline points="5 7 3 9 5 11"/><polyline points="13 7 15 9 13 11"/><line x1="10" x2="8" y1="5" y2="13"/></svg>';
      icons.variable = '<svg viewbox="0 0 18 18"><text x="2" y="14" font-size="11" font-family="monospace">{x}</text></svg>';

      if (initialHtml) quill.clipboard.dangerouslyPasteHTML(initialHtml);
      quill.on('text-change', () => { updateRteCounter(); emit(); });
      sourceTa.addEventListener('input', () => { updateRteCounter(); emit(); });
      updateRteCounter();
      refreshIcons();
      return quill;
    });
  }

  function insertVariableAtCursor() {
    if (sourceMode) {
      const sourceTa = container.querySelector('.ce-source');
      if (!sourceTa) return;
      const pos = sourceTa.selectionStart ?? sourceTa.value.length;
      sourceTa.value = sourceTa.value.slice(0, pos) + '{{user_name}}' + sourceTa.value.slice(pos);
      sourceTa.dispatchEvent(new Event('input'));
    } else if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range.index, '{{user_name}}');
      emit();
    }
  }

  /* ---------------- 短信 ---------------- */
  function renderSms() {
    const mode = showSmsConfigMode ? (data.configMode || 'unified') : 'unified';
    const modeFieldHtml = showSmsConfigMode ? `
        <div class="field">
          <span class="field-label">内容配置方式</span>
          <div class="radio-group">
            <label><input type="radio" name="ceSmsMode" value="unified" ${mode === 'unified' ? 'checked' : ''}>统一配置${tipIcon('所有用户收到的内容一致')}</label>
            <label><input type="radio" name="ceSmsMode" value="separate" ${mode === 'separate' ? 'checked' : ''}>分别配置${tipIcon('用户收到的内容可分别配置')}</label>
          </div>
        </div>` : '';
    const separateHtml = showSmsConfigMode ? `
        <div class="ce-sms-separate" ${mode !== 'separate' ? 'hidden' : ''}>
          <div class="upload-area" tabindex="0">
            <div class="upload-btns">
              <button type="button" class="btn btn-outline btn-sm ce-sms-upload-file"><i data-lucide="file-up"></i>上传文件</button>
              <button type="button" class="btn btn-outline btn-sm ce-sms-upload-folder"><i data-lucide="folder-up"></i>上传文件夹</button>
              <a class="link-btn ce-sms-download-tpl"><i data-lucide="download"></i>模板下载</a>
            </div>
            <p class="upload-drop-hint">支持拖拽或粘贴文件、文件夹到此处上传</p>
            <p class="upload-hint-limit">单个文件不应超过500,000</p>
            <input type="file" class="ce-sms-file-input" accept=".csv,.xlsx,.txt" hidden>
            <input type="file" class="ce-sms-folder-input" webkitdirectory hidden>
            <ul class="upload-list ce-sms-file-list"></ul>
          </div>
        </div>` : '';
    container.innerHTML = `
      <div class="content-editor-wrap">
        ${modeFieldHtml}
        <div class="ce-sms-unified" ${mode !== 'unified' ? 'hidden' : ''}>
          <div class="field-label-row">
            <span class="field-label">内容编辑</span>
            ${templateToolsHtml(showTemplateTools)}
          </div>
          <button type="button" class="link-btn ce-insert-shortlink"><i data-lucide="link-2"></i>插入短链</button>
          <div class="shortlink-row ce-shortlink-row" hidden>
            <input class="input ce-shortlink-input" placeholder="请输入链接地址" value="${data.shortLinkUrl || ''}">
            <button type="button" class="btn btn-outline btn-sm ce-shortlink-convert">转换</button>
          </div>
          <p class="ce-shortlink-result" ${data.shortLinkResult ? '' : 'hidden'}>${data.shortLinkResult || ''}</p>
          <textarea class="textarea ce-text" data-char-max="160" rows="8" placeholder="请输入发送内容…">${data.text || ''}</textarea>
        </div>
        ${separateHtml}
      </div>`;

    const unifiedPane = container.querySelector('.ce-sms-unified');
    const separatePane = container.querySelector('.ce-sms-separate');
    container.querySelectorAll('input[name="ceSmsMode"]').forEach(r => {
      r.addEventListener('change', () => {
        unifiedPane.hidden = r.value !== 'unified';
        if (separatePane) separatePane.hidden = r.value !== 'separate';
        if (r.checked) emit();
      });
    });

    const ta = container.querySelector('.ce-text');
    initCharCounters(container);
    ta.addEventListener('input', emit);
    bindTemplateTools(container, () => ta.value, setPlainText);

    const shortlinkRow = container.querySelector('.ce-shortlink-row');
    const shortlinkResult = container.querySelector('.ce-shortlink-result');
    container.querySelector('.ce-insert-shortlink').addEventListener('click', () => {
      shortlinkRow.hidden = !shortlinkRow.hidden;
    });
    container.querySelector('.ce-shortlink-convert').addEventListener('click', () => {
      const url = container.querySelector('.ce-shortlink-input').value.trim();
      if (!url) { showToast('请先输入链接地址'); return; }
      const link = mockShortLink();
      shortlinkResult.hidden = false;
      shortlinkResult.textContent = `短链已生成：${link}`;
      emit();
    });

    let pendingFiles = [...(data.files || [])];
    if (showSmsConfigMode) {
      const renderFileList = () => {
        container.querySelector('.ce-sms-file-list').innerHTML = pendingFiles.map((f, i) => `
          <li><i data-lucide="file-check-2"></i>${f}<button type="button" class="icon-btn" data-sms-rm="${i}"><i data-lucide="x"></i></button></li>
        `).join('');
        container.querySelectorAll('[data-sms-rm]').forEach(btn => {
          btn.addEventListener('click', () => {
            pendingFiles.splice(Number(btn.dataset.smsRm), 1);
            renderFileList();
            emit();
          });
        });
        refreshIcons();
      };
      renderFileList();

      const smsAccept = '.csv,.xlsx,.txt';
      const fileInput = container.querySelector('.ce-sms-file-input');
      const folderInput = container.querySelector('.ce-sms-folder-input');
      const uploadArea = container.querySelector('.ce-sms-separate .upload-area');
      const addFiles = files => { files.forEach(f => pendingFiles.push(f.name)); renderFileList(); emit(); };
      const addFolders = folders => { folders.forEach(({ name, count }) => pendingFiles.push(`${name}/（${count} 个文件）`)); renderFileList(); emit(); };
      container.querySelector('.ce-sms-upload-file').addEventListener('click', () => fileInput.click());
      container.querySelector('.ce-sms-upload-folder').addEventListener('click', () => folderInput.click());
      fileInput.addEventListener('change', () => {
        addFiles([...fileInput.files].filter(f => matchFileAccept(f, smsAccept)));
        fileInput.value = '';
      });
      folderInput.addEventListener('change', () => {
        if (folderInput.files.length) {
          const dir = folderInput.files[0].webkitRelativePath.split('/')[0];
          addFolders([{ name: dir, count: folderInput.files.length }]);
        }
        folderInput.value = '';
      });
      bindDropPasteUpload({ zone: uploadArea, accept: smsAccept, allowFolder: true, onFiles: addFiles, onFolders: addFolders });
      container.querySelector('.ce-sms-download-tpl').addEventListener('click', () => showToast('短信上传模板已开始下载'));
    }

    currentGetValue = () => ({
      configMode: showSmsConfigMode
        ? (container.querySelector('input[name="ceSmsMode"]:checked')?.value || 'unified')
        : 'unified',
      text: ta.value,
      shortLinkUrl: container.querySelector('.ce-shortlink-input')?.value ?? data.shortLinkUrl,
      shortLinkResult: shortlinkResult.hidden ? '' : shortlinkResult.textContent,
      files: pendingFiles,
    });
  }

  /* ---------------- Push ---------------- */
  function renderPush() {
    container.innerHTML = `
      <div class="content-editor-wrap">
        <div class="field-label-row">
          <span class="field-label">内容编辑</span>
          ${templateToolsHtml(showTemplateTools)}
        </div>
        <div class="field"><span class="field-label">App Icon</span>
          <div class="upload-field">
            <button type="button" class="btn btn-outline btn-sm ce-upload-app"><i data-lucide="upload"></i>上传图标</button>
            <input type="file" class="ce-file-app" accept="image/*" hidden>
            <div class="upload-preview ce-preview-app"><i data-lucide="image"></i><span>未上传</span></div>
            <p class="upload-drop-hint">支持拖拽 / 粘贴上传</p>
          </div>
        </div>
        <div class="field"><span class="field-label">图片</span>
          <div class="upload-field">
            <button type="button" class="btn btn-outline btn-sm ce-upload-img"><i data-lucide="upload"></i>上传图片</button>
            <input type="file" class="ce-file-img" accept="image/*" hidden>
            <div class="upload-preview ce-preview-img"><i data-lucide="image"></i><span>未上传</span></div>
            <p class="upload-drop-hint">支持拖拽 / 粘贴上传</p>
          </div>
        </div>
        <div class="field"><span class="field-label">标题</span>
          <input class="input ce-title" value="${data.title || ''}" placeholder="Push 标题"></div>
        <div class="field"><span class="field-label">正文</span>
          <textarea class="textarea ce-text" rows="5" placeholder="Push 正文">${data.body || ''}</textarea></div>
        <div class="field-row-2">
          <div class="field"><span class="field-label">Android 跳转地址</span>
            <input class="input ce-android" value="${data.androidUrl || ''}" placeholder="非必填"></div>
          <div class="field"><span class="field-label">iOS 跳转地址</span>
            <input class="input ce-ios" value="${data.iosUrl || ''}" placeholder="非必填"></div>
        </div>
      </div>`;
    container.querySelectorAll('.ce-title, .ce-text, .ce-android, .ce-ios').forEach(el =>
      el.addEventListener('input', emit));
    bindUpload(container.querySelector('.ce-upload-app'), container.querySelector('.ce-file-app'),
      container.querySelector('.ce-preview-app'), name => { data.appIcon = name; emit(); });
    bindUpload(container.querySelector('.ce-upload-img'), container.querySelector('.ce-file-img'),
      container.querySelector('.ce-preview-img'), name => { data.image = name; emit(); });
    bindTemplateTools(container, () => container.querySelector('.ce-text').value, text => {
      container.querySelector('.ce-text').value = text;
      container.querySelector('.ce-text').dispatchEvent(new Event('input'));
      emit();
    });
    initCharCounters(container);
    refreshIcons();

    currentGetValue = () => ({
      title: container.querySelector('.ce-title')?.value ?? data.title,
      body: container.querySelector('.ce-text')?.value ?? data.body,
      appIcon: data.appIcon,
      image: data.image,
      androidUrl: container.querySelector('.ce-android')?.value ?? data.androidUrl,
      iosUrl: container.querySelector('.ce-ios')?.value ?? data.iosUrl,
    });
  }

  /* ---------------- 邮件 ---------------- */
  function renderEmail() {
    const contentType = data.contentType || 'custom';
    container.innerHTML = `
      <div class="content-editor-wrap">
        <div class="field-label-row">
          <span class="field-label">内容编辑</span>
          ${templateToolsHtml(showTemplateTools)}
        </div>
        <div class="field"><span class="field-label">标题</span>
          <input class="input ce-subject" value="${data.subject || ''}" placeholder="邮件标题"></div>
        <div class="field"><span class="field-label">发件人</span>
          <input class="input ce-sender" value="${data.sender || ''}" placeholder="发件人"></div>
        <div class="field">
          <span class="field-label">内容类型</span>
          <div class="radio-group">
            <label><input type="radio" name="ceEmailType" value="custom" ${contentType === 'custom' ? 'checked' : ''}>自定义</label>
            <label><input type="radio" name="ceEmailType" value="html" ${contentType === 'html' ? 'checked' : ''}>上传html文件</label>
          </div>
        </div>
        <div class="field ce-email-custom" ${contentType !== 'custom' ? 'hidden' : ''}>
          <div class="field-label-row">
            <span class="field-label">正文</span>
            <button type="button" class="link-btn ce-insert-var"><i data-lucide="braces"></i>插入变量</button>
          </div>
          <div class="rte-wrap">
            <div class="ce-quill"></div>
            <textarea class="rte-source ce-source" data-char-count="off" hidden></textarea>
            <span class="char-counter ce-rte-counter"></span>
          </div>
        </div>
        <div class="field ce-email-html" ${contentType !== 'html' ? 'hidden' : ''}>
          <span class="field-label">上传 html 文件</span>
          <div class="upload-field">
            <button type="button" class="btn btn-outline btn-sm ce-upload-html"><i data-lucide="upload"></i>上传文件</button>
            <input type="file" class="ce-file-html" accept=".html" hidden>
            <div class="upload-preview ce-preview-html">${data.htmlFile ? `<i data-lucide="file-code"></i><span>${data.htmlFile}</span>` : '<i data-lucide="file-code"></i><span>未上传</span>'}</div>
            <p class="upload-drop-hint">支持格式：html</p>
          </div>
        </div>
      </div>`;

    initCharCounters(container);
    container.querySelector('.ce-subject').addEventListener('input', emit);
    container.querySelector('.ce-sender').addEventListener('input', emit);

    const customPane = container.querySelector('.ce-email-custom');
    const htmlPane = container.querySelector('.ce-email-html');
    container.querySelectorAll('input[name="ceEmailType"]').forEach(r => {
      r.addEventListener('change', () => {
        customPane.hidden = r.value !== 'custom';
        htmlPane.hidden = r.value !== 'html';
        if (r.checked) emit();
      });
    });

    if (data.htmlFile) container.querySelector('.ce-preview-html').classList.add('has-file');
    bindUpload(container.querySelector('.ce-upload-html'), container.querySelector('.ce-file-html'),
      container.querySelector('.ce-preview-html'), name => { data.htmlFile = name; emit(); }, { accept: '.html' });

    container.querySelector('.ce-insert-var').addEventListener('click', () => insertVariableAtCursor());

    mountRte(data.body).then(() => {
      bindTemplateTools(container, () => quill.getText(), text => {
        quill.clipboard.dangerouslyPasteHTML(text);
        updateRteCounter();
        emit();
      });
    });

    currentGetValue = () => ({
      contentType: container.querySelector('input[name="ceEmailType"]:checked')?.value || contentType,
      subject: container.querySelector('.ce-subject')?.value ?? data.subject,
      sender: container.querySelector('.ce-sender')?.value ?? data.sender,
      body: getRteHtml(data.body),
      htmlFile: data.htmlFile,
    });
  }

  /* ---------------- 站内信 ---------------- */
  function renderInbox() {
    container.innerHTML = `
      <div class="content-editor-wrap">
        <div class="field-label-row">
          <span class="field-label">内容编辑</span>
          ${templateToolsHtml(showTemplateTools)}
        </div>
        <div class="field"><span class="field-label">消息类型<span class="req-mark">*</span></span>
          <select class="select ce-msg-type">
            <option value="">请选择消息类型</option>
            ${INBOX_MSG_TYPES.map(o => `<option value="${o.value}" ${data.msgType === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
        <div class="field"><span class="field-label">标题<span class="req-mark">*</span></span>
          <input class="input ce-title" value="${data.title || ''}" placeholder="请输入标题"></div>
        <div class="field">
          <span class="field-label">内容<span class="req-mark">*</span></span>
          <div class="rte-wrap">
            <div class="ce-quill"></div>
            <textarea class="rte-source ce-source" data-char-count="off" hidden></textarea>
            <span class="char-counter ce-rte-counter"></span>
          </div>
        </div>
        <div class="field"><span class="field-label">按钮名称</span>
          <input class="input ce-button-text" value="${data.buttonText || ''}" placeholder="非必填"></div>
        <div class="field"><span class="field-label">跳转类型</span>
          <select class="select ce-jump-type">
            <option value="">请选择跳转类型</option>
            ${INBOX_JUMP_TYPES.map(o => `<option value="${o.value}" ${data.jumpType === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
        <div class="field"><span class="field-label">URL</span>
          <input class="input ce-url" value="${data.url || ''}" placeholder="非必填"></div>
        <div class="field"><span class="field-label">跳转参数</span>
          <input class="input ce-jump-params" value="${data.jumpParams || ''}" placeholder="非必填"></div>
      </div>`;

    initCharCounters(container);
    container.querySelectorAll('.ce-msg-type, .ce-title, .ce-button-text, .ce-jump-type, .ce-url, .ce-jump-params')
      .forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', emit));

    mountRte(data.body).then(() => {
      bindTemplateTools(container, () => quill.getText(), text => {
        quill.clipboard.dangerouslyPasteHTML(text);
        updateRteCounter();
        emit();
      });
    });
    enhanceSelects(container);

    currentGetValue = () => ({
      msgType: container.querySelector('.ce-msg-type')?.value ?? data.msgType,
      title: container.querySelector('.ce-title')?.value ?? data.title,
      body: getRteHtml(data.body),
      buttonText: container.querySelector('.ce-button-text')?.value ?? data.buttonText,
      jumpType: container.querySelector('.ce-jump-type')?.value ?? data.jumpType,
      url: container.querySelector('.ce-url')?.value ?? data.url,
      jumpParams: container.querySelector('.ce-jump-params')?.value ?? data.jumpParams,
    });
  }

  /* ---------------- Viber ---------------- */
  function renderViber() {
    const channelSel = data.channel || 'biz';
    const biz = data.biz;
    const bot = data.bot;

    container.innerHTML = `
      <div class="content-editor-wrap">
        <div class="field"><span class="field-label">渠道</span>
          <select class="select ce-viber-channel">
            <option value="biz" ${channelSel === 'biz' ? 'selected' : ''}>Biz message</option>
            <option value="bot" ${channelSel === 'bot' ? 'selected' : ''}>Bot message</option>
          </select>
        </div>

        <div class="viber-subform ce-viber-biz" ${channelSel !== 'biz' ? 'hidden' : ''}>
          <div class="field"><span class="field-label">分类</span>
            <select class="select ce-viber-biz-category">
              <option value="">请选择分类</option>
              ${VIBER_BIZ_CATEGORIES.map(c => `<option ${biz.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="field"><span class="field-label">账号</span>
            <select class="select ce-viber-biz-account">
              <option value="">请选择账号</option>
              ${VIBER_BIZ_ACCOUNTS.map(a => `<option ${biz.account === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <span class="field-label">类型</span>
            <div class="radio-group">
              <label><input type="radio" name="ceViberBizType" value="Button" ${biz.type === 'Button' ? 'checked' : ''}>Button</label>
              <label><input type="radio" name="ceViberBizType" value="Image" ${biz.type === 'Image' ? 'checked' : ''}>Image</label>
              <label><input type="radio" name="ceViberBizType" value="Text" ${biz.type === 'Text' ? 'checked' : ''}>Text</label>
            </div>
          </div>
          <div class="field">
            <div class="field-label-row">
              <span class="field-label">内容</span>
              ${templateToolsHtml(showTemplateTools)}
            </div>
            <textarea class="textarea ce-viber-biz-body" rows="4" placeholder="请输入消息内容…">${biz.body || ''}</textarea>
          </div>
          <div class="field ce-viber-biz-image-field" ${biz.type === 'Text' ? 'hidden' : ''}>
            <span class="field-label">按钮图片</span>
            <div class="upload-field">
              <button type="button" class="btn btn-outline btn-sm ce-viber-biz-upload-img"><i data-lucide="upload"></i>上传图片</button>
              <input type="file" class="ce-viber-biz-file-img" accept="image/jpeg,image/jpg" hidden>
              <div class="upload-preview ce-viber-biz-preview-img">${biz.buttonImage ? `<i data-lucide="image"></i><span>${biz.buttonImage}</span>` : '<i data-lucide="image"></i><span>未上传</span>'}</div>
              <p class="upload-drop-hint">支持jpg/jpeg，≤100KB，400x400</p>
            </div>
          </div>
          <div class="field-row-2 ce-viber-biz-url-field" ${biz.type === 'Text' ? 'hidden' : ''}>
            <div class="field">
              <span class="field-label">链接类型</span>
              <div class="radio-group">
                <label><input type="radio" name="ceViberBizLinkType" value="internal" ${biz.linkType === 'internal' ? 'checked' : ''}>内部链接</label>
                <label><input type="radio" name="ceViberBizLinkType" value="external" ${biz.linkType === 'external' ? 'checked' : ''}>外部链接</label>
              </div>
            </div>
            <div class="field"><span class="field-label">URL</span>
              <input class="input ce-viber-biz-url" value="${biz.url || ''}" placeholder="请输入链接地址"></div>
          </div>
        </div>

        <div class="viber-subform ce-viber-bot" ${channelSel !== 'bot' ? 'hidden' : ''}>
          <div class="field"><span class="field-label">账号</span>
            <select class="select ce-viber-bot-account">
              <option value="">请选择账号</option>
              ${VIBER_BOT_ACCOUNTS.map(a => `<option ${bot.account === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
          <div class="field"><span class="field-label">类型</span><span class="tag tag-primary">Rich media</span></div>
          <div class="field">
            <span class="field-label">内容</span>
            <div class="radio-group">
              <label><input type="radio" name="ceViberBotContent" value="single" ${bot.content === 'single' ? 'checked' : ''}>单游戏</label>
              <label><input type="radio" name="ceViberBotContent" value="multi" ${bot.content === 'multi' ? 'checked' : ''}>多游戏</label>
              <label><input type="radio" name="ceViberBotContent" value="custom" ${bot.content === 'custom' ? 'checked' : ''}>自定义</label>
            </div>
          </div>
          <div class="ce-viber-bot-single" ${bot.content !== 'single' ? 'hidden' : ''}>
            <div class="field-row-2">
              <div class="field"><span class="field-label">游戏类型</span>
                <select class="select ce-viber-bot-gametype">
                  <option value="">请选择</option>
                  ${VIBER_GAME_TYPES.map(t => `<option ${bot.gameType === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </div>
              <div class="field"><span class="field-label">游戏平台</span>
                <select class="select ce-viber-bot-gameplatform">
                  <option value="">请选择</option>
                  ${VIBER_GAME_PLATFORMS.map(t => `<option ${bot.gamePlatform === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="field"><span class="field-label">游戏</span>
              <select class="select ce-viber-bot-game">
                <option value="">请选择</option>
                ${VIBER_GAMES.map(g => `<option ${bot.game === g ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <span class="field-label">其他</span>
              <div class="radio-group">
                <label><input type="radio" name="ceViberBotExtra" value="top_win" ${bot.singleExtra === 'top_win' ? 'checked' : ''}>Top Win</label>
                <label><input type="radio" name="ceViberBotExtra" value="top_win_rate" ${bot.singleExtra === 'top_win_rate' ? 'checked' : ''}>Top Win Rate</label>
                <label><input type="radio" name="ceViberBotExtra" value="custom" ${bot.singleExtra === 'custom' ? 'checked' : ''}>自定义内容</label>
              </div>
            </div>
            <div class="field ce-viber-bot-single-custom" ${bot.singleExtra !== 'custom' ? 'hidden' : ''}>
              <textarea class="textarea ce-viber-bot-single-custom-body" rows="4" placeholder="请输入自定义内容…">${bot.singleCustomBody || ''}</textarea>
            </div>
          </div>
          <div class="ce-viber-bot-multi" ${bot.content !== 'multi' ? 'hidden' : ''}>
            <div class="field"><span class="field-label">游戏（可多选）</span>
              <select class="select ce-viber-bot-multigames" multiple size="4">
                ${VIBER_GAMES.map(g => `<option ${(bot.multiGames || []).includes(g) ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field ce-viber-bot-custom" ${bot.content !== 'custom' ? 'hidden' : ''}>
            <textarea class="textarea ce-viber-bot-custom-body" rows="4" placeholder="请输入自定义内容…">${bot.customBody || ''}</textarea>
          </div>
        </div>
      </div>`;

    initCharCounters(container);
    bindTemplateTools(container, () => container.querySelector('.ce-viber-biz-body').value, text => {
      container.querySelector('.ce-viber-biz-body').value = text;
      container.querySelector('.ce-viber-biz-body').dispatchEvent(new Event('input'));
      emit();
    });

    const bizPane = container.querySelector('.ce-viber-biz');
    const botPane = container.querySelector('.ce-viber-bot');
    container.querySelector('.ce-viber-channel').addEventListener('change', e => {
      bizPane.hidden = e.target.value !== 'biz';
      botPane.hidden = e.target.value !== 'bot';
      emit();
    });

    const bizImageField = container.querySelector('.ce-viber-biz-image-field');
    const bizUrlField = container.querySelector('.ce-viber-biz-url-field');
    container.querySelectorAll('input[name="ceViberBizType"]').forEach(r => {
      r.addEventListener('change', () => {
        bizImageField.hidden = r.value === 'Text' ? true : (r.checked ? false : bizImageField.hidden);
        bizUrlField.hidden = r.value === 'Text' ? true : (r.checked ? false : bizUrlField.hidden);
        if (r.checked) emit();
      });
    });
    bindUpload(container.querySelector('.ce-viber-biz-upload-img'), container.querySelector('.ce-viber-biz-file-img'),
      container.querySelector('.ce-viber-biz-preview-img'), name => { biz.buttonImage = name; emit(); }, { accept: 'image/jpeg,image/jpg' });

    container.querySelectorAll('.ce-viber-biz-category, .ce-viber-biz-account, .ce-viber-biz-body, .ce-viber-biz-url')
      .forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', emit));
    container.querySelectorAll('input[name="ceViberBizLinkType"]').forEach(r => r.addEventListener('change', emit));

    const singlePane = container.querySelector('.ce-viber-bot-single');
    const multiPane = container.querySelector('.ce-viber-bot-multi');
    const customPane = container.querySelector('.ce-viber-bot-custom');
    container.querySelectorAll('input[name="ceViberBotContent"]').forEach(r => {
      r.addEventListener('change', () => {
        singlePane.hidden = r.value !== 'single';
        multiPane.hidden = r.value !== 'multi';
        customPane.hidden = r.value !== 'custom';
        if (r.checked) emit();
      });
    });
    const singleCustomField = container.querySelector('.ce-viber-bot-single-custom');
    container.querySelectorAll('input[name="ceViberBotExtra"]').forEach(r => {
      r.addEventListener('change', () => {
        singleCustomField.hidden = r.value !== 'custom';
        if (r.checked) emit();
      });
    });
    container.querySelectorAll('.ce-viber-bot-account, .ce-viber-bot-gametype, .ce-viber-bot-gameplatform, .ce-viber-bot-game, .ce-viber-bot-multigames, .ce-viber-bot-single-custom-body, .ce-viber-bot-custom-body')
      .forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', emit));

    enhanceSelects(container);
    refreshIcons();

    currentGetValue = () => {
      const nextBiz = {
        category: container.querySelector('.ce-viber-biz-category')?.value ?? biz.category,
        account: container.querySelector('.ce-viber-biz-account')?.value ?? biz.account,
        type: container.querySelector('input[name="ceViberBizType"]:checked')?.value || biz.type,
        body: container.querySelector('.ce-viber-biz-body')?.value ?? biz.body,
        buttonImage: biz.buttonImage,
        linkType: container.querySelector('input[name="ceViberBizLinkType"]:checked')?.value || biz.linkType,
        url: container.querySelector('.ce-viber-biz-url')?.value ?? biz.url,
      };
      const nextBot = {
        account: container.querySelector('.ce-viber-bot-account')?.value ?? bot.account,
        content: container.querySelector('input[name="ceViberBotContent"]:checked')?.value || bot.content,
        gameType: container.querySelector('.ce-viber-bot-gametype')?.value ?? bot.gameType,
        gamePlatform: container.querySelector('.ce-viber-bot-gameplatform')?.value ?? bot.gamePlatform,
        game: container.querySelector('.ce-viber-bot-game')?.value ?? bot.game,
        singleExtra: container.querySelector('input[name="ceViberBotExtra"]:checked')?.value || bot.singleExtra,
        singleCustomBody: container.querySelector('.ce-viber-bot-single-custom-body')?.value ?? bot.singleCustomBody,
        multiGames: container.querySelector('.ce-viber-bot-multigames')
          ? [...container.querySelector('.ce-viber-bot-multigames').selectedOptions].map(o => o.value)
          : bot.multiGames,
        customBody: container.querySelector('.ce-viber-bot-custom-body')?.value ?? bot.customBody,
      };
      const nextChannel = container.querySelector('.ce-viber-channel')?.value || channelSel;
      let text = '';
      if (nextChannel === 'biz') text = nextBiz.body;
      else if (nextBot.content === 'custom') text = nextBot.customBody;
      else if (nextBot.content === 'single') text = nextBot.singleExtra === 'custom' ? nextBot.singleCustomBody : `[单游戏] ${nextBot.game || ''}`;
      else text = `[多游戏] ${nextBot.multiGames.join('、')}`;
      return { channel: nextChannel, biz: nextBiz, bot: nextBot, text };
    };
  }

  /* ---------------- Messenger / Telegram ---------------- */
  function renderMediaChannel() {
    const accounts = MC_ACCOUNTS[ch] || [];
    const type = data.type || 'Text';
    const needsMedia = ['Photo', 'Animation', 'Video'].includes(type);
    const needsButton = ['Photo', 'Animation', 'Video'].includes(type);
    const isVideo = type === 'Video';
    const isMediaGroup = type === 'Media Group';
    const mediaAccept = type === 'Video' ? 'video/*' : type === 'Animation' ? 'image/gif,video/*' : 'image/*';
    const mediaLabel = type === 'Video' ? '视频' : type === 'Animation' ? '动图/视频' : '图片';

    container.innerHTML = `
      <div class="content-editor-wrap">
        <div class="field-label-row">
          <span class="field-label">内容编辑</span>
          ${templateToolsHtml(showTemplateTools)}
        </div>
        <div class="field"><span class="field-label">账号</span>
          <select class="select ce-mc-account">
            <option value="">请选择账号</option>
            ${accounts.map(a => `<option ${data.account === a ? 'selected' : ''}>${a}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <span class="field-label">类型</span>
          <div class="radio-group ce-mc-type-group">
            ${MC_TYPES.map(t => `<label><input type="radio" name="ceMcType" value="${t}" ${type === t ? 'checked' : ''}>${t}</label>`).join('')}
          </div>
        </div>
        <div class="field ce-mc-media-field" ${needsMedia ? '' : 'hidden'}>
          <span class="field-label ce-mc-media-label">${mediaLabel}</span>
          <div class="upload-field">
            <button type="button" class="btn btn-outline btn-sm ce-mc-upload-media"><i data-lucide="upload"></i>上传${mediaLabel}</button>
            <input type="file" class="ce-mc-file-media" accept="${mediaAccept}" hidden>
            <div class="upload-preview ce-mc-preview-media">${data.image ? `<i data-lucide="image"></i><span>${data.image}</span>` : '<i data-lucide="image"></i><span>未上传</span>'}</div>
            <p class="upload-drop-hint">支持拖拽 / 粘贴上传</p>
          </div>
        </div>
        <div class="field ce-mc-thumb-field" ${isVideo ? '' : 'hidden'}>
          <span class="field-label">Thumbnail (Optional)</span>
          <div class="upload-field">
            <button type="button" class="btn btn-outline btn-sm ce-mc-upload-thumb"><i data-lucide="upload"></i>上传缩略图</button>
            <input type="file" class="ce-mc-file-thumb" accept="image/*" hidden>
            <div class="upload-preview ce-mc-preview-thumb">${data.thumbnail ? `<i data-lucide="image"></i><span>${data.thumbnail}</span>` : '<i data-lucide="image"></i><span>未上传</span>'}</div>
          </div>
        </div>
        <div class="field ce-mc-media-group-field" ${isMediaGroup ? '' : 'hidden'}>
          <span class="field-label">Media Group（最少 2 组）</span>
          <div class="media-group-list ce-mc-media-group-list"></div>
          <button type="button" class="btn btn-outline btn-sm ce-mc-add-media-group"><i data-lucide="plus"></i>新增一组</button>
        </div>
        <div class="field">
          <span class="field-label">正文</span>
          <div class="rte-wrap">
            <div class="ce-quill"></div>
            <textarea class="rte-source ce-source" data-char-count="off" hidden></textarea>
            <span class="char-counter ce-rte-counter"></span>
          </div>
        </div>
        <div class="field-row-2 ce-mc-button-field" ${needsButton ? '' : 'hidden'}>
          <div class="field"><span class="field-label">按钮图片</span>
            <div class="upload-field">
              <button type="button" class="btn btn-outline btn-sm ce-mc-upload-btnimg"><i data-lucide="upload"></i>上传图片</button>
              <input type="file" class="ce-mc-file-btnimg" accept="image/*" hidden>
              <div class="upload-preview ce-mc-preview-btnimg">${data.buttonImage ? `<i data-lucide="image"></i><span>${data.buttonImage}</span>` : '<i data-lucide="image"></i><span>未上传</span>'}</div>
            </div>
          </div>
          <div class="field"><span class="field-label">URL</span>
            <input class="input ce-mc-url" value="${data.url || ''}" placeholder="请输入跳转链接"></div>
        </div>
      </div>`;

    initCharCounters(container);
    container.querySelector('.ce-mc-account').addEventListener('change', emit);
    container.querySelector('.ce-mc-url').addEventListener('input', emit);

    const mediaField = container.querySelector('.ce-mc-media-field');
    const mediaLabelEl = container.querySelector('.ce-mc-media-label');
    const thumbField = container.querySelector('.ce-mc-thumb-field');
    const mgField = container.querySelector('.ce-mc-media-group-field');
    const buttonField = container.querySelector('.ce-mc-button-field');
    const mediaFileInput = container.querySelector('.ce-mc-file-media');

    const syncTypeUI = t => {
      const media = ['Photo', 'Animation', 'Video'].includes(t);
      mediaField.hidden = !media;
      buttonField.hidden = !media;
      thumbField.hidden = t !== 'Video';
      mgField.hidden = t !== 'Media Group';
      if (media) {
        const label = t === 'Video' ? '视频' : t === 'Animation' ? '动图/视频' : '图片';
        mediaLabelEl.textContent = label;
        container.querySelector('.ce-mc-upload-media').innerHTML = `<i data-lucide="upload"></i>上传${label}`;
        mediaFileInput.accept = t === 'Video' ? 'video/*' : t === 'Animation' ? 'image/gif,video/*' : 'image/*';
        refreshIcons();
      }
    };
    container.querySelectorAll('input[name="ceMcType"]').forEach(r => {
      r.addEventListener('change', () => {
        if (r.checked) { syncTypeUI(r.value); emit(); }
      });
    });

    bindUpload(container.querySelector('.ce-mc-upload-media'), mediaFileInput,
      container.querySelector('.ce-mc-preview-media'), name => { data.image = name; emit(); },
      { accept: mediaFileInput.getAttribute('accept') });
    bindUpload(container.querySelector('.ce-mc-upload-thumb'), container.querySelector('.ce-mc-file-thumb'),
      container.querySelector('.ce-mc-preview-thumb'), name => { data.thumbnail = name; emit(); });
    bindUpload(container.querySelector('.ce-mc-upload-btnimg'), container.querySelector('.ce-mc-file-btnimg'),
      container.querySelector('.ce-mc-preview-btnimg'), name => { data.buttonImage = name; emit(); });

    if (mcMediaGroupItems.length < 2) {
      mcMediaGroupItems = [{ type: 'Photo', file: null }, { type: 'Photo', file: null }];
    }
    const mgListHost = container.querySelector('.ce-mc-media-group-list');
    const renderMediaGroupList = () => {
      mgListHost.innerHTML = mcMediaGroupItems.map((item, i) => `
        <div class="media-group-item">
          <select class="select select-sm ce-mg-type" data-idx="${i}">
            <option value="Photo" ${item.type === 'Photo' ? 'selected' : ''}>Photo</option>
            <option value="Video" ${item.type === 'Video' ? 'selected' : ''}>Video</option>
          </select>
          <div class="upload-field">
            <button type="button" class="btn btn-outline btn-sm ce-mg-upload" data-idx="${i}"><i data-lucide="upload"></i>${item.file ? '重新上传' : '上传文件'}</button>
            <input type="file" class="ce-mg-file" data-idx="${i}" accept="${item.type === 'Video' ? 'video/*' : 'image/*'}" hidden>
            <div class="upload-preview ce-mg-preview" data-idx="${i}">${item.file ? `<i data-lucide="${item.type === 'Video' ? 'video' : 'image'}"></i><span>${item.file}</span>` : '<i data-lucide="image"></i><span>未上传</span>'}</div>
          </div>
          <button type="button" class="icon-btn ce-mg-remove" data-idx="${i}" ${mcMediaGroupItems.length <= 2 ? 'disabled' : ''} title="移除"><i data-lucide="x"></i></button>
        </div>`).join('');

      mgListHost.querySelectorAll('.ce-mg-type').forEach(sel => {
        sel.addEventListener('change', () => {
          const idx = Number(sel.dataset.idx);
          mcMediaGroupItems[idx].type = sel.value;
          mcMediaGroupItems[idx].file = null;
          renderMediaGroupList();
          emit();
        });
      });
      mgListHost.querySelectorAll('.ce-mg-upload').forEach(btn => {
        const idx = Number(btn.dataset.idx);
        const input = mgListHost.querySelector(`.ce-mg-file[data-idx="${idx}"]`);
        btn.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
          const file = input.files[0];
          if (file) { mcMediaGroupItems[idx].file = file.name; renderMediaGroupList(); emit(); }
          input.value = '';
        });
      });
      mgListHost.querySelectorAll('.ce-mg-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          if (mcMediaGroupItems.length <= 2) return;
          mcMediaGroupItems.splice(Number(btn.dataset.idx), 1);
          renderMediaGroupList();
          emit();
        });
      });
      enhanceSelects(mgListHost);
      refreshIcons();
    };
    renderMediaGroupList();
    container.querySelector('.ce-mc-add-media-group').addEventListener('click', () => {
      mcMediaGroupItems.push({ type: 'Photo', file: null });
      renderMediaGroupList();
      emit();
    });

    mountRte(data.body).then(() => {
      bindTemplateTools(container, () => quill.getText(), text => {
        quill.clipboard.dangerouslyPasteHTML(text);
        updateRteCounter();
        emit();
      });
    });

    enhanceSelects(container);
    refreshIcons();

    currentGetValue = () => ({
      account: container.querySelector('.ce-mc-account')?.value ?? data.account,
      type: container.querySelector('input[name="ceMcType"]:checked')?.value || type,
      body: getRteHtml(data.body),
      image: data.image,
      thumbnail: data.thumbnail,
      buttonImage: data.buttonImage,
      url: container.querySelector('.ce-mc-url')?.value ?? data.url,
      mediaGroup: mcMediaGroupItems,
    });
  }

  function render() {
    container.innerHTML = '';
    quill = null;
    sourceMode = false;
    if (ch === 'sms') renderSms();
    else if (ch === 'push') renderPush();
    else if (ch === 'email') renderEmail();
    else if (ch === 'inbox') renderInbox();
    else if (ch === 'viber') renderViber();
    else if (ch === 'messenger' || ch === 'telegram') renderMediaChannel();
    else {
      container.innerHTML = `
        <div class="content-editor-wrap">
          <div class="field-label-row">
            <span class="field-label">内容编辑</span>
            ${templateToolsHtml(showTemplateTools)}
          </div>
          <textarea class="textarea ce-text" data-char-max="160" rows="8" placeholder="请输入发送内容…">${data.text || data.body || ''}</textarea>
        </div>`;
      const ta = container.querySelector('.ce-text');
      initCharCounters(container);
      ta.addEventListener('input', emit);
      bindTemplateTools(container, () => ta.value, setPlainText);
      currentGetValue = () => ({ text: ta.value });
    }
    refreshIcons();
  }

  render();

  return {
    getValue() {
      data = getValue();
      return data;
    },
    setValue(v) {
      data = ensureContentValue(ch, v);
      mcMediaGroupItems = (data.mediaGroup || []).map(item => ({ ...item }));
      render();
    },
    destroy() {
      destroyed = true;
      quill = null;
      container.innerHTML = '';
    },
    getPlainSummary() {
      const v = getValue();
      if (v.text) return v.text;
      if (v.body) {
        const tmp = document.createElement('div');
        tmp.innerHTML = v.body;
        return tmp.textContent || '';
      }
      return v.title || '';
    },
  };
}

function contentSummary(value, maxLen = 24) {
  const tmp = document.createElement('div');
  const text = typeof value === 'string'
    ? value
    : (value?.text || value?.body || value?.title || '');
  tmp.innerHTML = text;
  const plain = tmp.textContent || text;
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
}

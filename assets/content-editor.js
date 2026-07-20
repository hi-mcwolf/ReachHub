/* 共享内容编辑器：新建任务 / SDK 触达配置 */

const CONTENT_TPL_OPTIONS = [
  { id: 'quiz', name: '世界杯竞猜提醒', text: "Only the best teams remain! Warm up for the Quarterfinals with today's FREE World Cup Quiz. Visit bingoplus.com." },
  { id: 'recharge', name: '充值优惠通知', text: '尊敬的用户，本周充值满 500 即享 8% 加赠，活动今晚 24:00 截止，立即打开 App 参与吧！' },
  { id: 'recall', name: '流失召回话术', text: '您好，我们注意到您已有一段时间未登录。现为您专属保留了回归礼包，登录即可领取，期待您的回来！' },
];

const RTE_CHANNELS = new Set(['email', 'viber', 'telegram', 'messenger']);

function normalizeChannel(ch) {
  const map = { SMS: 'sms', 邮件: 'email', Push: 'push', Viber: 'viber', Telegram: 'telegram', Messenger: 'messenger' };
  return map[ch] || (ch || '').toLowerCase();
}

function defaultContentValue(channel) {
  const ch = normalizeChannel(channel);
  if (ch === 'email') return { subject: '', sender: 'marketing@bingoplus.com', body: '' };
  if (ch === 'push') return { title: '', body: '', appIcon: null, image: null, androidUrl: '', iosUrl: '' };
  if (RTE_CHANNELS.has(ch) && ch !== 'email') return { body: '', image: null };
  return { text: '' };
}

function ensureContentValue(channel, value) {
  const base = defaultContentValue(channel);
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') return { ...base, text: value, body: value };
    return { ...base };
  }
  return { ...base, ...value };
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
  const tplRow = root.querySelector('.ce-tpl-name-row');
  if (!tplSelect) return;

  tplSelect.addEventListener('change', () => {
    const tpl = CONTENT_TPL_OPTIONS.find(t => t.id === tplSelect.value);
    if (tpl) setText(tpl.text);
  });

  root.querySelector('.ce-save-tpl')?.addEventListener('click', () => {
    if (!getText().trim()) { showToast('请先输入内容再保存为模板'); return; }
    tplRow.hidden = false;
    root.querySelector('.ce-tpl-name')?.focus();
    initCharCounters(tplRow);
  });
  root.querySelector('.ce-tpl-ok')?.addEventListener('click', () => {
    const name = root.querySelector('.ce-tpl-name')?.value.trim();
    if (!name) { showToast('请输入模板名称'); return; }
    tplRow.hidden = true;
    root.querySelector('.ce-tpl-name').value = '';
    showToast(`模板「${name}」已保存`);
  });
  root.querySelector('.ce-tpl-cancel')?.addEventListener('click', () => {
    tplRow.hidden = true;
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

function createContentEditor({ container, channel, value, onChange, showTemplateTools = true }) {
  const ch = normalizeChannel(channel);
  let data = ensureContentValue(ch, value);
  let quill = null;
  let sourceMode = false;
  let destroyed = false;

  const emit = () => { if (!destroyed && onChange) onChange(getValue()); };

  function getValue() {
    if (ch === 'sms') {
      const ta = container.querySelector('.ce-text');
      return { text: ta ? ta.value : data.text };
    }
    if (ch === 'email') {
      const subject = container.querySelector('.ce-subject')?.value ?? data.subject;
      const sender = container.querySelector('.ce-sender')?.value ?? data.sender;
      let body = data.body;
      if (sourceMode) body = container.querySelector('.ce-source')?.value ?? body;
      else if (quill) body = quill.root.innerHTML;
      return { subject, sender, body };
    }
    if (ch === 'push') {
      return {
        title: container.querySelector('.ce-title')?.value ?? data.title,
        body: container.querySelector('.ce-text')?.value ?? data.body,
        appIcon: data.appIcon,
        image: data.image,
        androidUrl: container.querySelector('.ce-android')?.value ?? data.androidUrl,
        iosUrl: container.querySelector('.ce-ios')?.value ?? data.iosUrl,
      };
    }
    if (RTE_CHANNELS.has(ch) && ch !== 'email') {
      let body = data.body;
      if (sourceMode) body = container.querySelector('.ce-source')?.value ?? body;
      else if (quill) body = quill.root.innerHTML;
      return { body, image: data.image };
    }
    const ta = container.querySelector('.ce-text');
    return { text: ta ? ta.value : data.text };
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

  function renderSms() {
    container.innerHTML = `
      <div class="content-editor-wrap">
        <div class="field-label-row">
          <span class="field-label">内容编辑</span>
          ${templateToolsHtml(showTemplateTools)}
        </div>
        <textarea class="textarea ce-text" data-char-max="160" rows="8" placeholder="请输入发送内容…">${data.text || ''}</textarea>
      </div>`;
    const ta = container.querySelector('.ce-text');
    initCharCounters(container);
    ta.addEventListener('input', emit);
    bindTemplateTools(container, () => ta.value, setPlainText);
  }

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
  }

  function renderRte(extraImage = false) {
    container.innerHTML = `
      <div class="content-editor-wrap">
        <div class="field-label-row">
          <span class="field-label">内容编辑</span>
          ${templateToolsHtml(showTemplateTools)}
        </div>
        ${ch === 'email' ? `
          <div class="field"><span class="field-label">标题</span>
            <input class="input ce-subject" value="${data.subject || ''}" placeholder="邮件标题"></div>
          <div class="field"><span class="field-label">发件人</span>
            <input class="input ce-sender" value="${data.sender || ''}" placeholder="发件人"></div>` : ''}
        ${extraImage ? `
          <div class="field"><span class="field-label">图片</span>
            <div class="upload-field">
              <button type="button" class="btn btn-outline btn-sm ce-upload-img"><i data-lucide="upload"></i>上传图片</button>
              <input type="file" class="ce-file-img" accept="image/*" hidden>
              <div class="upload-preview ce-preview-img"><i data-lucide="image"></i><span>未上传</span></div>
              <p class="upload-drop-hint">支持拖拽 / 粘贴上传</p>
            </div>
          </div>` : ''}
        <div class="field">
          <span class="field-label">正文</span>
          <div class="rte-wrap">
            <div class="ce-quill"></div>
            <textarea class="rte-source ce-source" data-char-count="off" hidden></textarea>
            <span class="char-counter ce-rte-counter"></span>
          </div>
        </div>
      </div>`;

    initCharCounters(container);

    if (extraImage) {
      bindUpload(container.querySelector('.ce-upload-img'), container.querySelector('.ce-file-img'),
        container.querySelector('.ce-preview-img'), name => { data.image = name; emit(); });
    }

    container.querySelector('.ce-subject')?.addEventListener('input', emit);
    container.querySelector('.ce-sender')?.addEventListener('input', emit);

    const quillHost = container.querySelector('.ce-quill');
    const sourceTa = container.querySelector('.ce-source');
    sourceTa.value = data.body || '';

    return loadQuillAssets().then(() => {
      if (destroyed) return;
      const toolbarOptions = [
        [{ font: [] }, { size: [] }],
        ['bold', 'italic', 'underline'],
        ['link', 'image'],
        ['clean'],
        ['source', 'variable'],
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
                const range = quill.getSelection(true);
                quill.insertText(range.index, '{{user_name}}');
                emit();
              },
            },
          },
        },
      });

      const icons = Quill.import('ui/icons');
      icons.source = '<svg viewbox="0 0 18 18"><polyline points="5 7 3 9 5 11"/><polyline points="13 7 15 9 13 11"/><line x1="10" x2="8" y1="5" y2="13"/></svg>';
      icons.variable = '<svg viewbox="0 0 18 18"><text x="2" y="14" font-size="11" font-family="monospace">{x}</text></svg>';

      if (data.body) quill.clipboard.dangerouslyPasteHTML(data.body);
      quill.on('text-change', () => { updateRteCounter(); emit(); });
      sourceTa.addEventListener('input', () => { updateRteCounter(); emit(); });
      updateRteCounter();

      bindTemplateTools(container, () => quill.getText(), text => {
        quill.clipboard.dangerouslyPasteHTML(text);
        updateRteCounter();
        emit();
      });
      refreshIcons();
    });
  }

  function render() {
    container.innerHTML = '';
    if (ch === 'sms') renderSms();
    else if (ch === 'push') renderPush();
    else if (ch === 'email') renderRte(false);
    else if (RTE_CHANNELS.has(ch)) renderRte(true);
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

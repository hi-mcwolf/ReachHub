/* 公共逻辑：左侧菜单渲染、抽屉开关、Toast */

const REACH_NAV_ITEMS = [
  { key: 'reach-task', label: '触达任务', icon: 'send', href: 'index.html' },
  { key: 'reach-task-records', label: '任务记录', icon: 'clipboard-list', href: 'task-records.html' },
  { key: 'reach-send-records', label: '发送记录', icon: 'mail-check', href: 'send-records.html' },
  { key: 'reach-template', label: '模板管理', icon: 'file-text', href: 'templates.html' },
  { key: 'reach-strategy', label: '触达策略', icon: 'sliders-horizontal', href: 'strategy.html' },
  { key: 'reach-stats', label: '数据统计', icon: 'bar-chart-3', href: 'stats.html' },
];

const PRODUCT_LINES = [
  { value: 'BP-VIP', label: 'BP-VIP' },
  { value: 'BP-CONTENT OPERATION CENTER', label: 'BP-CONTENT OPERATION CENTER' },
  { value: 'BingoPlus', label: 'BingoPlus' },
];

const USER_ACCOUNT_SAMPLES = [
  'bingoplusjuan01', 'bingoplusmaria02', 'bingopluskevin03',
  'bingoplusana04', 'bingopluspaolo05', 'bingoplusgrace06',
];

function renderSidebar(module, activeKey, activeSubKey) {
  const host = document.getElementById('sidebar');
  if (!host) return;
  host.className = 'sidebar';

  const menuHtml = REACH_NAV_ITEMS.map(item =>
    `<a class="sb-item${item.key === activeKey ? ' active' : ''}" href="${item.href}">
      <i data-lucide="${item.icon}"></i>${item.label}
    </a>`
  ).join('');

  host.innerHTML = `
    <div class="sb-brand"><i data-lucide="layout-grid"></i>ReachHub</div>
    <nav class="sb-menu">${menuHtml}</nav>
  `;
}

function renderTopbar(activeModule = 'reach') {
  const host = document.getElementById('topbar');
  if (!host) return;
  host.className = 'topbar';
  host.innerHTML = `
    <nav class="topbar-menu">
      <a class="topbar-item active" href="index.html">触达中心</a>
    </nav>
    <div class="topbar-actions">
      <button class="btn btn-outline btn-sm" id="sdkBtn" type="button">SDK</button>
      <div class="topbar-user"><span class="avatar">M</span>marvin@</div>
    </div>
  `;
  const sdkBtn = host.querySelector('#sdkBtn');
  if (sdkBtn && !sdkBtn.dataset.bound) {
    sdkBtn.dataset.bound = '1';
    sdkBtn.addEventListener('click', () => {
      if (typeof initReachConfigDrawer === 'function') initReachConfigDrawer();
      openDrawer('reachDrawer');
    });
  }
}

function tipIcon(tipText) {
  return `<span class="tip-icon" data-tip="${tipText.replace(/"/g, '&quot;')}"><i data-lucide="help-circle"></i></span>`;
}

/* ---- 抽屉 ---- */
function openDrawer(id) {
  const root = document.getElementById(id);
  if (!root) return;
  root.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer(id) {
  const root = document.getElementById(id);
  if (!root) return;
  root.classList.remove('open');
  if (!document.querySelector('.drawer-root.open')) {
    document.body.style.overflow = '';
  }
}

function bindDrawerClose() {
  document.querySelectorAll('.drawer-root').forEach(root => {
    root.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => closeDrawer(root.id));
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.drawer-root.open').forEach(root => closeDrawer(root.id));
    }
  });
}

/* ---- Toast ---- */
let toastTimer = null;
function showToast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

/* ---- Lucide 图标刷新 ---- */
function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

/* ---- 字符数计数 ---- */
function shouldAttachCharCounter(el) {
  if (el.dataset.charCount === 'off') return false;
  if (el.closest('.filter-card')) return false;
  if (el.matches('.ssel-search, .msel-search')) return false;
  if (el.tagName === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type !== 'text' && type !== 'search') return false;
  }
  if (el.hidden) return false;
  if (el.closest('[hidden]')) return false;
  return true;
}

function getCharMax(el) {
  if (el.dataset.charMax) return Number(el.dataset.charMax);
  const ml = el.getAttribute('maxlength');
  if (ml && ml !== '-1') return Number(ml);
  return null;
}

function formatCharCount(len, max) {
  if (max != null && !Number.isNaN(max)) return `字数：${len} / ${max}`;
  return `字数：${len}`;
}

function updateCharCounterEl(el, counter) {
  const len = el.value?.length ?? 0;
  const max = getCharMax(el);
  counter.textContent = formatCharCount(len, max);
  counter.classList.toggle('over', max != null && len > max);
  const wrap = el.closest('.input-char-wrap');
  if (wrap) wrap.classList.toggle('input-char-wrap--has-max', max != null && !Number.isNaN(max));
}

function ensureCharCounterWrap(el) {
  let wrap = el.parentElement;
  if (wrap?.classList.contains('input-char-wrap')) return wrap;

  const orphanCounter = el.nextElementSibling?.classList.contains('char-counter')
    || el.nextElementSibling?.classList.contains('char-count')
    ? el.nextElementSibling : null;

  wrap = document.createElement('div');
  wrap.className = 'input-char-wrap';
  if (el.classList.contains('input-sm')) wrap.classList.add('input-char-wrap--sm');
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);
  if (orphanCounter) {
    orphanCounter.classList.remove('char-count');
    orphanCounter.classList.add('char-counter');
    wrap.appendChild(orphanCounter);
  }
  return wrap;
}

function getOrCreateCounter(wrap) {
  let counter = wrap.querySelector(':scope > .char-counter');
  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'char-counter';
    wrap.appendChild(counter);
  }
  return counter;
}

function initCharCounters(root = document) {
  root.querySelectorAll('input[type="text"], input:not([type]), textarea').forEach(el => {
    if (!shouldAttachCharCounter(el)) return;

    const wrap = ensureCharCounterWrap(el);
    const counter = getOrCreateCounter(wrap);
    updateCharCounterEl(el, counter);

    if (!el.dataset.charCountBound) {
      el.dataset.charCountBound = '1';
      el.addEventListener('input', () => updateCharCounterEl(el, counter));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => initCharCounters());

/* ---- 更多操作菜单（挂到 body，避免被表格 overflow / sticky 裁切） ---- */
let floatingMoreMenu = null;

function ensureFloatingMoreMenu() {
  if (floatingMoreMenu?.isConnected) return floatingMoreMenu;
  floatingMoreMenu = document.createElement('div');
  floatingMoreMenu.className = 'more-menu more-menu--fixed';
  floatingMoreMenu.hidden = true;
  floatingMoreMenu.addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(floatingMoreMenu);
  return floatingMoreMenu;
}

function closeAllMoreMenus() {
  if (floatingMoreMenu) {
    floatingMoreMenu.hidden = true;
    floatingMoreMenu.innerHTML = '';
    floatingMoreMenu.dataset.for = '';
    floatingMoreMenu.style.cssText = '';
  }
  document.querySelectorAll('.more-wrap .more-menu').forEach(m => { m.hidden = true; });
}

function positionMoreMenu(btn, menu) {
  const rect = btn.getBoundingClientRect();
  menu.classList.add('more-menu--fixed');
  menu.style.position = 'fixed';
  menu.style.visibility = 'hidden';
  menu.style.left = '0px';
  menu.style.top = '0px';
  menu.style.right = 'auto';
  menu.style.zIndex = '1000';

  const mw = menu.offsetWidth || 140;
  const mh = menu.offsetHeight || 0;
  let left = rect.right - mw;
  left = Math.min(Math.max(8, left), window.innerWidth - mw - 8);
  let top = rect.bottom + 4;
  if (top + mh > window.innerHeight - 8) {
    top = Math.max(8, rect.top - mh - 4);
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = 'visible';
}

function toggleMoreMenu(btn) {
  const source = btn.closest('.more-wrap')?.querySelector('.more-menu');
  if (!source) return;
  const menu = ensureFloatingMoreMenu();
  const opening = menu.hidden || menu.dataset.for !== btn.dataset.more;
  closeAllMoreMenus();
  if (!opening) return;

  menu.innerHTML = source.innerHTML;
  menu.dataset.for = btn.dataset.more;
  menu.hidden = false;
  positionMoreMenu(btn, menu);

  menu.querySelectorAll('.more-item').forEach(item => {
    item.addEventListener('click', () => {
      const act = item.dataset.act;
      const id = item.dataset.id;
      const orig = source.querySelector(`.more-item[data-act="${act}"][data-id="${id}"]`)
        || source.querySelector(`.more-item[data-act="${act}"]`);
      closeAllMoreMenus();
      orig?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  });
}

function bindMoreMenus(root = document) {
  root.querySelectorAll('[data-more]').forEach(btn => {
    if (btn.dataset.moreBound) return;
    btn.dataset.moreBound = '1';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleMoreMenu(btn);
    });
  });
}

/* ---------------- 拖拽 / 粘贴上传 ---------------- */

function matchFileAccept(file, accept) {
  if (!accept) return true;
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  return accept.split(',').map(s => s.trim()).filter(Boolean).some(rule => {
    if (rule.startsWith('.')) return name.endsWith(rule.toLowerCase());
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

async function readAllDirEntries(reader) {
  const entries = [];
  let batch;
  do {
    batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    entries.push(...batch);
  } while (batch.length);
  return entries;
}

async function countEntryFiles(entry) {
  if (entry.isFile) return 1;
  if (!entry.isDirectory) return 0;
  const children = await readAllDirEntries(entry.createReader());
  let count = 0;
  for (const child of children) count += await countEntryFiles(child);
  return count;
}

async function collectDroppedUploads(dataTransfer, { accept, allowFolder = false } = {}) {
  const files = [];
  const folders = [];
  const items = [...(dataTransfer?.items || [])];

  if (items.length) {
    for (const item of items) {
      if (item.kind !== 'file') continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        if (!allowFolder) continue;
        folders.push({ name: entry.name, count: await countEntryFiles(entry) });
      } else if (entry?.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        if (matchFileAccept(file, accept)) files.push(file);
      } else {
        const file = item.getAsFile();
        if (file && matchFileAccept(file, accept)) files.push(file);
      }
    }
  } else {
    [...(dataTransfer?.files || [])].forEach(file => {
      if (matchFileAccept(file, accept)) files.push(file);
    });
  }
  return { files, folders };
}

function collectPastedFiles(dataTransfer, accept) {
  const files = [];
  [...(dataTransfer?.items || [])].forEach(item => {
    if (item.kind !== 'file') return;
    const file = item.getAsFile();
    if (file && matchFileAccept(file, accept)) files.push(file);
  });
  return files;
}

function bindDropPasteUpload({
  zone,
  accept,
  allowFolder = false,
  allowPaste = true,
  onFiles,
  onFolders,
}) {
  if (!zone) return () => {};

  if (!zone.hasAttribute('tabindex')) zone.setAttribute('tabindex', '0');

  const prevent = e => { e.preventDefault(); e.stopPropagation(); };

  const onDragEnter = e => prevent(e);
  const onDragOver = e => {
    prevent(e);
    zone.classList.add('is-dragover');
  };
  const onDragLeave = e => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-dragover');
  };
  const onDrop = async e => {
    prevent(e);
    zone.classList.remove('is-dragover');
    const { files, folders } = await collectDroppedUploads(e.dataTransfer, { accept, allowFolder });
    if (files.length) onFiles?.(files);
    if (folders.length) onFolders?.(folders);
  };
  const onPaste = e => {
    const files = collectPastedFiles(e.clipboardData, accept);
    if (!files.length) return;
    e.preventDefault();
    onFiles?.(files);
  };

  zone.addEventListener('dragenter', onDragEnter);
  zone.addEventListener('dragover', onDragOver);
  zone.addEventListener('dragleave', onDragLeave);
  zone.addEventListener('drop', onDrop);
  if (allowPaste) zone.addEventListener('paste', onPaste);

  return () => {
    zone.removeEventListener('dragenter', onDragEnter);
    zone.removeEventListener('dragover', onDragOver);
    zone.removeEventListener('dragleave', onDragLeave);
    zone.removeEventListener('drop', onDrop);
    if (allowPaste) zone.removeEventListener('paste', onPaste);
    zone.classList.remove('is-dragover');
  };
}

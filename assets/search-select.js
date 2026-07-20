/* 可搜索单选下拉：增强原生 <select>，保持 .value / change / hidden / disabled 兼容 */

const _sselInstances = new Set();

function enhanceSelect(select) {
  if (!select || select.tagName !== 'SELECT' || select._ssel) return select?._ssel || null;

  const wrap = document.createElement('div');
  wrap.className = 'ssel' + (select.classList.contains('select-sm') ? ' ssel-sm' : '');
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add('ssel-native');

  const ui = document.createElement('div');
  ui.className = 'ssel-ui';
  ui.innerHTML = `
    <div class="ssel-trigger" tabindex="0" role="combobox" aria-expanded="false">
      <span class="ssel-value"></span>
      <i data-lucide="chevron-down" class="ssel-chevron"></i>
    </div>
    <div class="ssel-dropdown" hidden>
      <input type="text" class="input ssel-search" placeholder="搜索…" autocomplete="off">
      <div class="ssel-list"></div>
    </div>`;
  wrap.appendChild(ui);

  const trigger = ui.querySelector('.ssel-trigger');
  const dropdown = ui.querySelector('.ssel-dropdown');
  const searchInput = ui.querySelector('.ssel-search');
  const listHost = ui.querySelector('.ssel-list');
  const valueEl = ui.querySelector('.ssel-value');

  let query = '';
  let open = false;
  let syncing = false;

  function getOptions() {
    return [...select.options].map(o => ({
      value: o.value,
      label: o.textContent.trim(),
      disabled: o.disabled,
      selected: o.selected,
    }));
  }

  function currentLabel() {
    const opt = select.options[select.selectedIndex];
    return opt ? opt.textContent.trim() : '';
  }

  function renderValue() {
    const label = currentLabel();
    const empty = !select.value;
    valueEl.textContent = label || '请选择';
    valueEl.classList.toggle('is-placeholder', empty && !label);
    wrap.classList.toggle('is-disabled', select.disabled);
    trigger.tabIndex = select.disabled ? -1 : 0;
    syncVisibility();
  }

  function syncVisibility() {
    const hidden = select.hidden || select.getAttribute('hidden') !== null;
    wrap.hidden = hidden;
    if (hidden) closeDropdown();
  }

  function filteredOptions() {
    const q = query.trim().toLowerCase();
    const opts = getOptions();
    if (!q) return opts;
    return opts.filter(o =>
      o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }

  function renderList() {
    const opts = filteredOptions();
    if (!opts.length) {
      listHost.innerHTML = '<div class="ssel-empty">无匹配结果</div>';
      return;
    }
    listHost.innerHTML = opts.map(o => `
      <button type="button" class="ssel-option${o.value === select.value ? ' selected' : ''}${o.disabled ? ' disabled' : ''}"
        data-value="${escapeAttr(o.value)}" ${o.disabled ? 'disabled' : ''}>
        ${escapeHtml(o.label)}
      </button>`).join('');
    listHost.querySelectorAll('.ssel-option:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        pick(btn.dataset.value);
      });
    });
  }

  function pick(value) {
    if (select.disabled) return;
    const prev = select.value;
    syncing = true;
    select.value = value;
    syncing = false;
    renderValue();
    closeDropdown();
    if (prev !== select.value) {
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function pruneDisconnected() {
    _sselInstances.forEach(inst => {
      if (!inst.wrap?.isConnected) {
        inst.close();
        _sselInstances.delete(inst);
        if (inst.select) delete inst.select._ssel;
      }
    });
  }

  function openDropdown() {
    if (open || select.disabled || wrap.hidden) return;
    pruneDisconnected();
    _sselInstances.forEach(inst => { if (inst !== api) inst.close(); });
    open = true;
    dropdown.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrap.classList.add('open');
    query = '';
    searchInput.value = '';
    renderList();
    setTimeout(() => searchInput.focus(), 0);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
  }

  function closeDropdown() {
    if (!open) return;
    open = false;
    dropdown.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('open');
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onDocKey);
  }

  function onDocClick(e) {
    if (!wrap.contains(e.target)) closeDropdown();
  }

  function onDocKey(e) {
    if (e.key === 'Escape') closeDropdown();
  }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    open ? closeDropdown() : openDropdown();
  });

  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open ? closeDropdown() : openDropdown();
    }
  });

  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    renderList();
  });
  searchInput.addEventListener('click', e => e.stopPropagation());

  /* 兼容代码直接读写 select.value / selectedIndex */
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const indexDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

  Object.defineProperty(select, 'value', {
    configurable: true,
    enumerable: true,
    get() { return valueDesc.get.call(this); },
    set(v) {
      valueDesc.set.call(this, v);
      if (!syncing) {
        renderValue();
        if (open) renderList();
      }
    },
  });

  Object.defineProperty(select, 'selectedIndex', {
    configurable: true,
    enumerable: true,
    get() { return indexDesc.get.call(this); },
    set(v) {
      indexDesc.set.call(this, v);
      if (!syncing) {
        renderValue();
        if (open) renderList();
      }
    },
  });

  const disabledDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'disabled');
  Object.defineProperty(select, 'disabled', {
    configurable: true,
    enumerable: true,
    get() { return disabledDesc.get.call(this); },
    set(v) {
      disabledDesc.set.call(this, v);
      renderValue();
      if (v) closeDropdown();
    },
  });

  const attrObs = new MutationObserver(() => {
    renderValue();
    if (open) renderList();
  });
  attrObs.observe(select, {
    attributes: true,
    attributeFilter: ['hidden', 'disabled', 'class'],
    childList: true,
    subtree: true,
  });

  select.addEventListener('change', () => {
    if (!syncing) {
      renderValue();
      if (open) renderList();
    }
  });

  function destroy() {
    closeDropdown();
    attrObs.disconnect();
    _sselInstances.delete(api);
    delete select._ssel;
    wrap.parentNode?.insertBefore(select, wrap);
    wrap.remove();
    select.classList.remove('ssel-native');
  }

  const api = {
    refresh: () => { renderValue(); if (open) renderList(); },
    close: closeDropdown,
    destroy,
    select,
    wrap,
  };

  select._ssel = api;
  _sselInstances.add(api);
  renderValue();
  if (typeof refreshIcons === 'function') refreshIcons();
  return api;
}

function enhanceSelects(root = document) {
  root.querySelectorAll('select.select').forEach(enhanceSelect);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  // 等各页初始化（如动态填充 option）后再增强，避免漏选项
  queueMicrotask(() => enhanceSelects());
});

/* 可搜索多选下拉组件（营销触达配置 / 触达任务策略面板共用） */

function buildStrategyOptions(categoryIds) {
  return categoryIds.flatMap(catId => {
    const cat = strategyCategoryById(catId);
    const items = strategiesByCategory(catId).filter(s => s.status === 'active');
    return items.map(s => ({
      value: s.id,
      label: s.name,
      desc: s.summary,
      group: cat.name,
    }));
  });
}

function buildCategoryStrategyOptions(catId) {
  return strategiesByCategory(catId)
    .filter(s => s.status === 'active')
    .map(s => ({ value: s.id, label: s.name, desc: s.summary }));
}

function createSearchMultiSelect({
  container,
  options = [],
  selected = [],
  placeholder = '请选择',
  searchPlaceholder = '搜索…',
  onChange,
  onOpen,
}) {
  const root = container;
  root.classList.add('msel');
  root.innerHTML = `
    <div class="msel-trigger" tabindex="0" role="combobox" aria-expanded="false">
      <div class="msel-tags"></div>
      <span class="msel-placeholder">${placeholder}</span>
      <i data-lucide="chevron-down" class="msel-chevron"></i>
    </div>
    <div class="msel-dropdown" hidden>
      <input type="text" class="input msel-search" placeholder="${searchPlaceholder}" autocomplete="off">
      <div class="msel-list"></div>
    </div>`;

  const trigger = root.querySelector('.msel-trigger');
  const dropdown = root.querySelector('.msel-dropdown');
  const searchInput = root.querySelector('.msel-search');
  const listHost = root.querySelector('.msel-list');
  const tagsHost = root.querySelector('.msel-tags');
  const placeholderEl = root.querySelector('.msel-placeholder');

  let selectedIds = [...selected];
  let query = '';
  let open = false;

  function optionMap() {
    return new Map(options.map(o => [o.value, o]));
  }

  function filterOptions() {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.desc || '').toLowerCase().includes(q) ||
      (o.group || '').toLowerCase().includes(q)
    );
  }

  function renderTags() {
    const map = optionMap();
    tagsHost.innerHTML = selectedIds.map(id => {
      const opt = map.get(id);
      if (!opt) return '';
      return `<span class="msel-tag" data-value="${id}">
        ${opt.label}
        <button type="button" class="msel-tag-remove" aria-label="移除 ${opt.label}">&times;</button>
      </span>`;
    }).join('');
    placeholderEl.hidden = selectedIds.length > 0;
    tagsHost.querySelectorAll('.msel-tag-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleValue(btn.closest('.msel-tag').dataset.value, false);
      });
    });
  }

  function renderList() {
    const filtered = filterOptions();
    if (!filtered.length) {
      listHost.innerHTML = '<div class="msel-empty">无匹配结果</div>';
      return;
    }

    const showGroups = !query.trim();
    let html = '';

    if (showGroups) {
      const groups = new Map();
      filtered.forEach(o => {
        const g = o.group || '';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(o);
      });
      groups.forEach((items, group) => {
        if (group) html += `<div class="msel-group-label">${group}</div>`;
        items.forEach(o => { html += renderOption(o); });
      });
    } else {
      html = filtered.map(o => renderOption(o)).join('');
    }

    listHost.innerHTML = html;
    listHost.querySelectorAll('.msel-option').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const cb = el.querySelector('input[type="checkbox"]');
        if (e.target === cb) return;
        cb.checked = !cb.checked;
        toggleValue(el.dataset.value, cb.checked);
      });
      el.querySelector('input[type="checkbox"]').addEventListener('change', e => {
        e.stopPropagation();
        toggleValue(el.dataset.value, e.target.checked);
      });
    });
  }

  function renderOption(o) {
    const checked = selectedIds.includes(o.value);
    return `<label class="msel-option" data-value="${o.value}">
      <input type="checkbox" value="${o.value}" ${checked ? 'checked' : ''}>
      <span class="msel-option-body">
        <span class="msel-option-label">${o.label}</span>
        ${o.desc ? `<span class="msel-option-desc">${o.desc}</span>` : ''}
      </span>
    </label>`;
  }

  function toggleValue(value, add) {
    if (add && !selectedIds.includes(value)) {
      selectedIds.push(value);
    } else if (!add) {
      selectedIds = selectedIds.filter(id => id !== value);
    } else {
      return;
    }
    renderTags();
    renderList();
    onChange?.(getValue());
  }

  function openDropdown() {
    if (open) return;
    onOpen?.();
    open = true;
    dropdown.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('open');
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
    root.classList.remove('open');
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onDocKey);
  }

  function onDocClick(e) {
    if (!root.contains(e.target)) closeDropdown();
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

  function getValue() {
    return [...selectedIds];
  }

  function setValue(ids) {
    selectedIds = [...ids];
    renderTags();
    if (open) renderList();
    onChange?.(getValue());
  }

  function destroy() {
    closeDropdown();
    root.innerHTML = '';
    root.classList.remove('msel', 'open');
  }

  renderTags();
  if (typeof refreshIcons === 'function') refreshIcons();

  return { getValue, setValue, destroy, open: openDropdown, close: closeDropdown };
}

/** 按策略分类渲染多个可搜索多选下拉框 */
function createStrategyMultiSelectGroup({
  container,
  categoryIds,
  selected = [],
  searchPlaceholder = '搜索策略…',
  onChange,
}) {
  const instances = [];
  const catHosts = [];

  container.classList.add('strategy-msel-group');
  container.innerHTML = categoryIds.map(catId => {
    const cat = strategyCategoryById(catId);
    const options = buildCategoryStrategyOptions(catId);
    if (!options.length) return '';
    return `
      <div class="field strategy-msel-field" data-category="${catId}">
        <span class="field-label strategy-msel-label">
          <i data-lucide="${cat.icon}"></i>${cat.name}
        </span>
        <div class="msel" data-msel-cat="${catId}"></div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-msel-cat]').forEach(el => {
    const catId = el.dataset.mselCat;
    const cat = strategyCategoryById(catId);
    const options = buildCategoryStrategyOptions(catId);
    const selectedInCat = selected.filter(id => options.some(o => o.value === id));
    let inst;
    inst = createSearchMultiSelect({
      container: el,
      options,
      selected: selectedInCat,
      placeholder: `请选择${cat.name}`,
      searchPlaceholder: searchPlaceholder || `搜索${cat.name}…`,
      onChange: () => onChange?.(getValue()),
      onOpen: () => instances.forEach(other => { if (other !== inst) other.close(); }),
    });
    instances.push(inst);
    catHosts.push({ catId, inst, options });
  });

  function getValue() {
    return instances.flatMap(i => i.getValue());
  }

  function setValue(ids) {
    catHosts.forEach(({ inst, options }) => {
      inst.setValue(ids.filter(id => options.some(o => o.value === id)));
    });
  }

  function destroy() {
    instances.forEach(i => i.destroy());
    container.innerHTML = '';
    container.classList.remove('strategy-msel-group');
  }

  function closeAll() {
    instances.forEach(i => i.close());
  }

  if (typeof refreshIcons === 'function') refreshIcons();

  return { getValue, setValue, destroy, closeAll };
}

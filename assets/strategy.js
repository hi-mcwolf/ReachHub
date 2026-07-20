/* 触达策略页：左侧分类导航 + 中间总览/列表 + 右侧详情抽屉 */

let activeCategory = 'overview';
let currentDetailId = null;

/* ---------------- 左侧导航 ---------------- */
function renderNav() {
  const host = document.getElementById('strategyNav');
  const overviewItem = `
    <button class="strategy-nav-item${activeCategory === 'overview' ? ' active' : ''}" data-cat="overview">
      <i data-lucide="layout-dashboard"></i>策略总览
    </button>`;
  host.innerHTML = overviewItem + visibleStrategyCategories().map(c => `
    <button class="strategy-nav-item${activeCategory === c.id ? ' active' : ''}" data-cat="${c.id}">
      <i data-lucide="${c.icon}"></i>${c.name}
      ${c.badge ? `<span class="nav-badge nav-badge-${c.badge.type}">${c.badge.text}</span>` : ''}
    </button>`).join('');

  host.querySelectorAll('.strategy-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderNav();
      renderMain();
    });
  });
  refreshIcons();
}

/* ---------------- 中间：总览 ---------------- */
function renderOverview() {
  const strategies = visibleReachStrategies();
  const categories = visibleStrategyCategories();
  const active = strategies.filter(s => s.status === 'active');
  const recent = [...strategies]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const top5 = [...strategies].sort((a, b) => b.hits - a.hits).slice(0, 5);
  const newIn7d = strategies.filter(s => s.createdAt >= '2026-07-06').length;
  const warnings = categories.filter(c => c.badge && c.badge.type === 'warning').length;

  const counts = categories.map(c => ({
    name: c.name,
    count: strategiesByCategory(c.id).length,
  }));
  const maxCount = Math.max(...counts.map(c => c.count), 1);

  return `
    <div class="strategy-head">
      <div>
        <h1 class="page-title">策略总览</h1>
        <p class="page-desc">统一管理触达相关的各类策略规则，查看整体运行情况</p>
      </div>
    </div>

    <section class="kpi-grid kpi-grid-4">
      <div class="kpi-card"><div class="kpi-title">生效中策略总数</div><div class="kpi-body"><span class="kpi-value kpi-green">${active.length}</span></div></div>
      <div class="kpi-card"><div class="kpi-title">策略分类数</div><div class="kpi-body"><span class="kpi-value">${categories.length}</span></div></div>
      <div class="kpi-card"><div class="kpi-title">最近7天新增策略</div><div class="kpi-body"><span class="kpi-value kpi-blue">${newIn7d}</span></div></div>
      <div class="kpi-card"><div class="kpi-title">当前预警策略</div><div class="kpi-body"><span class="kpi-value kpi-red">${warnings}</span></div></div>
    </section>

    <div class="overview-grid">
      <section class="card">
        <h4 class="card-title">各分类策略数量</h4>
        <div class="bar-list">
          ${counts.map(c => `
            <div class="bar-row" data-goto="${categories.find(x => x.name === c.name)?.id || ''}">
              <span class="bar-label">${c.name}</span>
              <span class="bar-track"><span class="bar-fill" style="width:${Math.round(c.count / maxCount * 100)}%"></span></span>
              <span class="bar-count">${c.count}</span>
            </div>`).join('')}
        </div>
      </section>

      <div class="overview-col">
        <section class="card">
          <h4 class="card-title">命中次数 TOP 5</h4>
          <ol class="top-strategy-list">
            ${top5.map((s, i) => `
              <li data-detail="${s.id}">
                <span class="top-rank">${i + 1}</span>
                <span class="top-name">${s.name}</span>
                <span class="top-hits">${s.hits.toLocaleString()} 次</span>
              </li>`).join('')}
          </ol>
        </section>

        <section class="card">
          <h4 class="card-title">最近修改记录</h4>
          <ul class="recent-list">
            ${recent.map(s => `
              <li data-detail="${s.id}">
                <span class="recent-name">${s.name}</span>
                <span class="recent-meta">${s.updatedBy} · ${s.updatedAt}</span>
              </li>`).join('')}
          </ul>
        </section>
      </div>
    </div>`;
}

/* ---------------- 中间：分类列表 ---------------- */
function renderCategoryList(catId) {
  if (!VISIBLE_STRATEGY_CATEGORY_IDS.includes(catId)) {
    activeCategory = 'overview';
    return renderOverview();
  }
  const cat = strategyCategoryById(catId);
  const items = strategiesByCategory(catId);

  const cards = items.length ? items.map(s => {
    const st = STRATEGY_STATUS[s.status];
    return `
      <div class="strategy-card card" data-detail="${s.id}">
        <div class="sc-head">
          <span class="sc-name">${s.name}</span>
          <span class="tag ${st.cls}">${st.label}</span>
        </div>
        <p class="sc-summary">${s.summary}</p>
        <div class="sc-tags">
          ${s.tags.map(t => `<span class="tag${t === '高优先级' ? ' tag-warning' : t === '生效中' ? ' tag-success' : t === 'A/B中' ? ' tag-ai' : ''}">${t}</span>`).join('')}
        </div>
        <div class="sc-meta">
          <span><i data-lucide="target"></i>生效范围：${s.scope}</span>
          <span><i data-lucide="arrow-up-narrow-wide"></i>优先级：${s.priority}</span>
          <span><i data-lucide="clock"></i>${s.updatedAt} · ${s.updatedBy}</span>
        </div>
        <div class="sc-ops">
          <button class="link-btn" data-detail-btn="${s.id}">查看详情</button>
          <button class="link-btn" data-edit="${s.id}">编辑</button>
          <button class="link-btn" data-toggle="${s.id}">${s.status === 'active' ? '停用' : '启用'}</button>
          <button class="link-btn" data-copy="${s.id}">复制</button>
        </div>
      </div>`;
  }).join('') : '<div class="panel-empty">该分类下暂无策略，点击右上角「新建策略」创建</div>';

  return `
    <div class="strategy-head">
      <div>
        <h1 class="page-title">${cat.name}</h1>
        <p class="page-desc">${cat.desc}</p>
      </div>
      <div class="stats-header-actions">
        <button class="btn btn-outline" id="batchToggleBtn"><i data-lucide="toggle-left"></i>批量启停</button>
        <button class="btn btn-outline" id="exportCfgBtn"><i data-lucide="download"></i>导出配置</button>
        <button class="btn btn-primary" id="newStrategyBtn"><i data-lucide="plus"></i>新建策略</button>
      </div>
    </div>

    <section class="card filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">策略状态</span>
          <select class="select" id="fStatus">
            <option value="">全部</option><option value="active">生效中</option>
            <option value="disabled">已停用</option><option value="draft">草稿</option>
          </select>
        </div>
        <div class="filter-item">
          <span class="filter-label">生效范围</span>
          <select class="select" id="fScope">
            <option value="">全部</option><option>全局</option><option>指定渠道</option>
            <option>指定业务线</option><option>指定活动</option>
          </select>
        </div>
        <div class="filter-item">
          <span class="filter-label">更新时间</span>
          <select class="select" id="fUpdated">
            <option value="">最近7天</option><option>最近30天</option><option>自定义</option>
          </select>
        </div>
        <div class="filter-item">
          <span class="filter-label">创建人</span>
          <select class="select" id="fCreator">
            <option value="">全部创建人</option><option>marvin@</option><option>lily@</option><option>ken@</option>
          </select>
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary" id="queryBtn">查询</button>
          <button class="btn btn-outline" id="resetBtn">重置</button>
        </div>
      </div>
    </section>

    <div class="strategy-card-list" id="strategyCardList">${cards}</div>`;
}

function renderMain() {
  const host = document.getElementById('strategyMain');
  host.innerHTML = activeCategory === 'overview' ? renderOverview() : renderCategoryList(activeCategory);
  bindMainEvents(host);
  enhanceSelects(host);
  refreshIcons();
}

function bindMainEvents(host) {
  // 打开详情（卡片 / 总览列表项）
  host.querySelectorAll('[data-detail]').forEach(el => {
    el.addEventListener('click', () => openStrategyDetail(el.dataset.detail));
  });
  host.querySelectorAll('[data-detail-btn]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openStrategyDetail(btn.dataset.detailBtn); });
  });
  // 总览条形图跳转分类
  host.querySelectorAll('[data-goto]').forEach(row => {
    row.addEventListener('click', () => {
      activeCategory = row.dataset.goto;
      renderNav();
      renderMain();
    });
  });
  // 卡片操作
  host.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showToast(`编辑策略「${strategyById(btn.dataset.edit).name}」（原型演示）`);
    }));
  host.querySelectorAll('[data-copy]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showToast(`已复制策略「${strategyById(btn.dataset.copy).name}」为草稿`);
    }));
  host.querySelectorAll('[data-toggle]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const s = strategyById(btn.dataset.toggle);
      s.status = s.status === 'active' ? 'disabled' : 'active';
      showToast(`策略「${s.name}」已${s.status === 'active' ? '启用' : '停用'}`);
      renderMain();
    }));

  // 分类页头部与筛选
  const q = id => host.querySelector('#' + id);
  if (q('newStrategyBtn')) {
    q('newStrategyBtn').addEventListener('click', () => showToast('新建策略（原型演示）'));
    q('batchToggleBtn').addEventListener('click', () => showToast('批量启停（原型演示）'));
    q('exportCfgBtn').addEventListener('click', () => showToast('策略配置导出中…'));
    q('queryBtn').addEventListener('click', () => applyCategoryFilter(host));
    q('resetBtn').addEventListener('click', () => {
      ['fStatus', 'fScope', 'fUpdated', 'fCreator'].forEach(id => q(id).value = '');
      applyCategoryFilter(host);
    });
  }
}

function applyCategoryFilter(host) {
  const status = host.querySelector('#fStatus').value;
  const creator = host.querySelector('#fCreator').value;
  const listHost = host.querySelector('#strategyCardList');
  const items = strategiesByCategory(activeCategory).filter(s =>
    (!status || s.status === status) && (!creator || s.creator === creator));

  listHost.querySelectorAll('.strategy-card').forEach(card => {
    card.style.display = items.some(s => s.id === card.dataset.detail) ? '' : 'none';
  });
  showToast(`筛选出 ${items.length} 条策略`);
}

/* ---------------- 右侧详情抽屉 ---------------- */
function openStrategyDetail(id) {
  const s = strategyById(id);
  if (!s) return;
  currentDetailId = id;
  const st = STRATEGY_STATUS[s.status];
  const cat = strategyCategoryById(s.category);

  document.getElementById('strategyDetailTitle').innerHTML =
    `策略详情 · ${s.name} <span class="tag ${st.cls}">${st.label}</span>`;

  document.getElementById('strategyDetailBody').innerHTML = `
    <section class="card detail-group">
      <h4 class="card-title">基础信息</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">策略名称</span><span>${s.name}</span></div>
        <div class="desc-item"><span class="desc-label">策略类型</span><span>${cat.name}</span></div>
        <div class="desc-item"><span class="desc-label">状态</span><span class="tag ${st.cls}">${st.label}</span></div>
        <div class="desc-item"><span class="desc-label">创建人</span><span>${s.creator}</span></div>
        <div class="desc-item"><span class="desc-label">更新时间</span><span>${s.updatedAt}（${s.updatedBy}）</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">规则配置</h4>
      <div class="desc-list">
        ${s.rules.map(r => `
          <div class="desc-item"><span class="desc-label">${r.label}</span><span>${r.value}</span></div>`).join('')}
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">生效范围</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">业务线</span><span>BingoPlus</span></div>
        <div class="desc-item"><span class="desc-label">活动范围</span><span>${s.scope}</span></div>
        <div class="desc-item"><span class="desc-label">通道范围</span><span>${s.scope.includes('通道') || s.scope.includes('SMS') || s.scope.includes('邮件') ? s.scope : '全部通道'}</span></div>
        <div class="desc-item"><span class="desc-label">国家/地区</span><span>${s.scope.includes('PH') ? '菲律宾' : '不限'}</span></div>
        <div class="desc-item"><span class="desc-label">人群范围</span><span>${s.category === 'audience' ? (s.rules[0]?.value || '不限') : '不限'}</span></div>
      </div>
    </section>
    <section class="card detail-group">
      <h4 class="card-title">执行说明</h4>
      <div class="desc-list">
        <div class="desc-item"><span class="desc-label">命中逻辑</span><span>任务发送前逐条校验，命中即应用本策略规则（累计命中 ${s.hits.toLocaleString()} 次）</span></div>
        <div class="desc-item"><span class="desc-label">冲突处理方式</span><span>同类策略冲突时按优先级高者生效</span></div>
        <div class="desc-item"><span class="desc-label">优先级说明</span><span>${s.priority}（同类中${s.priority === '高' ? '优先执行' : '按顺序执行'}）</span></div>
        <div class="desc-item"><span class="desc-label">关联策略</span><span>${cat.name}下其余 ${Math.max(strategiesByCategory(s.category).length - 1, 0)} 条策略</span></div>
      </div>
    </section>`;

  document.getElementById('detailToggleBtn').textContent = s.status === 'active' ? '停用' : '启用';

  openDrawer('strategyDetailDrawer');
  refreshIcons();
}

/* ---------------- 初始化 ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('reach', 'reach-strategy');
  renderTopbar('reach');
  bindDrawerClose();

  document.getElementById('detailEditBtn').addEventListener('click', () => showToast('编辑策略（原型演示）'));
  document.getElementById('detailCopyBtn').addEventListener('click', () => {
    const s = strategyById(currentDetailId);
    showToast(`已复制策略「${s.name}」为草稿`);
  });
  document.getElementById('detailToggleBtn').addEventListener('click', () => {
    const s = strategyById(currentDetailId);
    s.status = s.status === 'active' ? 'disabled' : 'active';
    showToast(`策略「${s.name}」已${s.status === 'active' ? '启用' : '停用'}`);
    closeDrawer('strategyDetailDrawer');
    renderMain();
  });

  renderNav();
  renderMain();
  refreshIcons();
});

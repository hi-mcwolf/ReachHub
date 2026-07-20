/* SDK 触达配置抽屉（全局挂载，由 topbar SDK 按钮打开） */

const RC_TEMPLATES = {
  quiz: "Only the best teams remain! Warm up for the Quarterfinals with today's FREE World Cup Quiz. Visit bingoplus.com.",
  recharge: '尊敬的用户，本周充值满 500 即享 8% 加赠，活动今晚 24:00 截止，立即打开 App 参与吧！',
  recall: '您好，我们注意到您已有一段时间未登录。现为您专属保留了回归礼包，登录即可领取，期待您的回来！',
};

const RC_CHANNEL_LABELS = {
  sms: 'SMS', email: '邮件', push: 'Push',
  viber: 'Viber', telegram: 'Telegram',
};

const rcChannelContents = {};
let rcActiveChannel = null;

function selectedRcChannels() {
  return [...document.querySelectorAll('#reachDrawer #channelChips .chip.selected')].map(c => c.dataset.channel);
}

function saveRcActiveContent() {
  if (rcActiveChannel) {
    const ta = document.getElementById('contentText');
    if (ta) rcChannelContents[rcActiveChannel] = ta.value;
  }
}

function renderRcContentTabs() {
  const channels = selectedRcChannels();
  const tabsHost = document.getElementById('contentTabs');
  const empty = document.getElementById('contentTabsEmpty');
  const ta = document.getElementById('contentText');

  if (!tabsHost || !empty || !ta) return;

  if (!channels.length) {
    rcActiveChannel = null;
    tabsHost.innerHTML = '';
    empty.hidden = false;
    ta.hidden = true;
    return;
  }

  if (!channels.includes(rcActiveChannel)) rcActiveChannel = channels[0];
  empty.hidden = true;
  ta.hidden = false;
  ta.value = rcChannelContents[rcActiveChannel] || '';
  ta.placeholder = `请输入「${RC_CHANNEL_LABELS[rcActiveChannel]}」通道的触达文案内容…`;

  tabsHost.innerHTML = channels.map(c =>
    `<button type="button" class="tab${c === rcActiveChannel ? ' active' : ''}" data-content-tab="${c}">${RC_CHANNEL_LABELS[c]}</button>`
  ).join('');

  tabsHost.querySelectorAll('[data-content-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      saveRcActiveContent();
      rcActiveChannel = tab.dataset.contentTab;
      renderRcContentTabs();
    });
  });
}

function reachConfigDrawerHtml() {
  return `
  <div class="drawer-root" id="reachDrawer">
    <div class="drawer-mask" data-close></div>
    <aside class="drawer drawer-md">
      <header class="drawer-header">
        <h3>触达配置</h3>
        <button class="icon-btn" data-close aria-label="关闭"><i data-lucide="x"></i></button>
      </header>
      <div class="drawer-body drawer-body--gray">
        <section class="card">
          <h4 class="card-title">触达通道及内容配置</h4>
          <div class="field">
            <span class="field-label">触达通道</span>
            <div class="chip-group" id="channelChips">
              <button type="button" class="chip" data-channel="sms">SMS</button>
              <button type="button" class="chip" data-channel="email">邮件</button>
              <button type="button" class="chip" data-channel="push">Push</button>
              <button type="button" class="chip" data-channel="viber">Viber</button>
              <button type="button" class="chip" data-channel="telegram">Telegram</button>
            </div>
          </div>
          <div class="field">
            <div class="field-label-row">
              <span class="field-label">内容配置</span>
              <div class="field-tools">
                <select class="select select-sm" id="tplSelect">
                  <option value="">选择模板</option>
                  <option value="quiz">世界杯竞猜提醒</option>
                  <option value="recharge">充值优惠通知</option>
                  <option value="recall">流失召回话术</option>
                </select>
                <button type="button" class="btn btn-outline btn-sm" id="saveTplBtn">保存为模板</button>
              </div>
            </div>
            <div class="tpl-name-row" id="tplNameRow" hidden>
              <input class="input" id="tplNameInput" placeholder="请输入模板名称">
              <button type="button" class="btn btn-primary btn-sm" id="tplNameOk">保存</button>
              <button type="button" class="btn btn-outline btn-sm" id="tplNameCancel">取消</button>
            </div>
            <div class="tabs content-tabs" id="contentTabs"></div>
            <p class="content-tabs-empty" id="contentTabsEmpty">请先在上方选择触达通道，再为每个通道单独配置内容</p>
            <textarea class="textarea" id="contentText" rows="5" placeholder="请输入触达文案内容…" hidden></textarea>
          </div>
        </section>
      </div>
      <footer class="drawer-footer">
        <button type="button" class="btn btn-outline" data-close>取消</button>
        <button type="button" class="btn btn-primary" id="confirmReach">确认</button>
      </footer>
    </aside>
  </div>`;
}

function bindReachConfigEvents() {
  document.querySelectorAll('#reachDrawer #channelChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      saveRcActiveContent();
      chip.classList.toggle('selected');
      renderRcContentTabs();
    });
  });

  document.getElementById('tplSelect').addEventListener('change', e => {
    const tpl = RC_TEMPLATES[e.target.value];
    if (!tpl) return;
    if (!rcActiveChannel) { showToast('请先选择触达通道'); e.target.value = ''; return; }
    document.getElementById('contentText').value = tpl;
    rcChannelContents[rcActiveChannel] = tpl;
  });

  const tplNameRow = document.getElementById('tplNameRow');
  document.getElementById('saveTplBtn').addEventListener('click', () => {
    const content = document.getElementById('contentText').value.trim();
    if (!rcActiveChannel || !content) { showToast('请先输入内容再保存为模板'); return; }
    tplNameRow.hidden = false;
    document.getElementById('tplNameInput').focus();
  });
  document.getElementById('tplNameOk').addEventListener('click', () => {
    const name = document.getElementById('tplNameInput').value.trim();
    if (!name) { showToast('请输入模板名称'); return; }
    tplNameRow.hidden = true;
    document.getElementById('tplNameInput').value = '';
    showToast(`模板「${name}」已保存`);
  });
  document.getElementById('tplNameCancel').addEventListener('click', () => {
    tplNameRow.hidden = true;
    document.getElementById('tplNameInput').value = '';
  });

  document.getElementById('contentText').addEventListener('input', saveRcActiveContent);

  document.getElementById('confirmReach').addEventListener('click', () => {
    saveRcActiveContent();
    const channels = selectedRcChannels();
    if (!channels.length) { showToast('请至少选择一个触达通道'); return; }
    const missing = channels.find(c => !(rcChannelContents[c] || '').trim());
    if (missing) { showToast(`请配置「${RC_CHANNEL_LABELS[missing]}」通道的发送内容`); return; }
    closeDrawer('reachDrawer');
    showToast('触达配置已保存');
  });
}

let rcInitialized = false;

function initReachConfigDrawer() {
  if (rcInitialized) return;
  rcInitialized = true;
  document.body.insertAdjacentHTML('beforeend', reachConfigDrawerHtml());
  bindDrawerClose();
  bindReachConfigEvents();
  refreshIcons();
  initCharCounters(document.getElementById('reachDrawer'));
}

document.addEventListener('DOMContentLoaded', () => {
  initReachConfigDrawer();
});

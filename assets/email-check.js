/* 邮件内容检测结果面板（PRD 6.9.2）——新建任务 / 编辑任务 / 模板编辑 / 审批详情共用
 * 用法：
 *   const ec = renderEmailCheck(container, { subject, preheader, bodyHtml, site, readOnly, records, onApply, onIgnore, onFooterChange });
 *   ec.update({ subject, bodyHtml, ... });  // 实时：字数、图文比例；促销词高亮在停止输入 1 秒后刷新
 *   ec.runFull();                            // 全量：含 AI 语义与服务商评分（保存模板 / 提交任务时）
 *   ec.getResult();                          // 存档结构：规则版本、命中项、分级、评分、采纳 / 忽略记录
 *   ecAnalyze(input, { full })               // 纯函数，无面板时也可调用（提交时存档）
 * 只提醒不阻断：任何分级都不影响保存 / 提交。 */

const EC_RULE_VERSION = 'R2026.11-03';
const EC_TEXT_RATIO_MIN = 60;   // E2-1 图文比例阈值（6.9.4 默认 60%）
const EC_IMAGE_ONLY_MAX = 10;   // E2-2 纯图阈值（默认 10%）
const EC_FIRST_PARA_LEN = 300;  // E1 首段范围（字符）

/* 词库（6.9.4 初始词库示意，分高 / 中两级） */
const EC_WORDS = {
  high: ['Free Money', 'Win Big', 'No Deposit', 'Claim Now', 'Casino', 'Bet', 'Bonus', 'Jackpot', 'Win', 'Free', '$$$', '免费', '中大奖', '稳赚'],
  mid: ['Act now', 'Offer', 'Exclusive', 'Limited', 'Urgent', '限时', '加赠', '独家'],
};
/* 一期敏感词（规则不变：命中则该消息发送时失败） */
const EC_SENSITIVE = ['shabu', '代充', '套现', '洗钱'];
/* AI 语义诱导（E1-4，示意：无关键词命中时的补充判定） */
const EC_AI_PATTERNS = [/guarantee/i, /easy money/i, /100% (?:win|sure)/i, /必中/, /包赢/];

/* 系统 Footer 版本（按产品线维护，见 6.9.3；停用版本触发 E3-2） */
const EC_FOOTERS = [
  { site: 'bingoplus', ver: 'v3 2026-11', status: '启用' },
  { site: 'bingoplus', ver: 'v2 2026-06', status: '停用' },
  { site: 'arenaplus', ver: 'v2 2026-10', status: '启用' },
  { site: 'bp-vip', ver: 'v1 2026-09', status: '启用' },
  { site: 'gamezone', ver: 'v1 2026-09', status: '启用' },
  { site: 'perya', ver: 'v1 2026-08', status: '启用' },
  { site: 'pinoyplay', ver: 'v1 2026-08', status: '启用' },
];
function ecFootersOf(site) {
  const list = EC_FOOTERS.filter(f => f.site === site);
  return list.length ? list : [{ site: site || '-', ver: 'v1 默认', status: '启用' }];
}
function ecDefaultFooter(site) { return ecFootersOf(site).find(f => f.status === '启用')?.ver || ecFootersOf(site)[0].ver; }

const ecEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ecNowStr = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

/* 变体匹配：大小写、符号替换（3→e、0→o、1/!→i、@/4→a、$/5→s）、复数 */
const EC_SUBS = { a: '[a@4]', e: '[e3]', i: '[i1!]', o: '[o0]', s: '[s$5]' };
function ecWordRegex(w) {
  if (/[\u4e00-\u9fa5]/.test(w)) return new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (w === '$$$') return /\${3,}/g;
  const body = w.split('').map(ch => {
    if (ch === ' ') return '\\s+';
    const lo = ch.toLowerCase();
    return EC_SUBS[lo] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return new RegExp(`(?<![A-Za-z0-9_])${body}(?:s|es)?(?![A-Za-z0-9_])`, 'gi');
}

/* 在一段文本里找促销词，返回 [{start,end,word,level}]（长词优先、不重叠） */
function ecFindWords(text) {
  const hits = [];
  const taken = [];
  /* 变量占位符 {{...}} 不参与检测 */
  const varRe = /\{\{[^}]*\}\}/g;
  let vm;
  while ((vm = varRe.exec(text))) taken.push([vm.index, vm.index + vm[0].length]);
  ['high', 'mid'].forEach(level => {
    [...EC_WORDS[level]].sort((a, b) => b.length - a.length).forEach(w => {
      const re = ecWordRegex(w);
      let m;
      while ((m = re.exec(text))) {
        const s = m.index, e = s + m[0].length;
        if (!m[0].length) { re.lastIndex++; continue; }
        if (taken.some(([a, b]) => s < b && e > a)) continue;
        taken.push([s, e]);
        hits.push({ start: s, end: e, word: m[0], level });
      }
    });
  });
  return hits.sort((a, b) => a.start - b.start);
}

function ecHighlight(text, hits) {
  if (!text) return '<span class="ec-empty">（空）</span>';
  let out = '', pos = 0;
  hits.forEach(h => {
    out += ecEsc(text.slice(pos, h.start));
    out += `<mark class="v2-hl${h.level === 'mid' ? ' mid' : ''}" title="${h.level === 'high' ? '高风险促销词' : '中风险促销词'}">${ecEsc(text.slice(h.start, h.end))}</mark>`;
    pos = h.end;
  });
  return out + ecEsc(text.slice(pos));
}

/* 正文解析：首段、其余部分、纯文本字数、图片（面积折算字符数）与缺 alt */
function ecParseBody(bodyHtml) {
  const html = String(bodyHtml || '');
  const tmp = document.createElement('div');
  tmp.innerHTML = /<[a-z][\s\S]*>/i.test(html) ? html : ecEsc(html).replace(/\n/g, '<br>');
  const imgs = [...tmp.querySelectorAll('img')].map(img => {
    const w = Number(img.getAttribute('width')) || Number(img.dataset.w) || 1200;
    const h = Number(img.getAttribute('height')) || Number(img.dataset.h) || 600;
    return { w, h, alt: (img.getAttribute('alt') || '').trim() };
  });
  const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  const firstBlock = [...tmp.querySelectorAll('p, div, h1, h2, h3, li')].map(el => (el.textContent || '').trim()).find(Boolean);
  const firstPara = (firstBlock || text).slice(0, EC_FIRST_PARA_LEN);
  const idx = text.indexOf(firstPara);
  const rest = idx >= 0 ? (text.slice(0, idx) + ' ' + text.slice(idx + firstPara.length)).trim() : text;
  const imgChars = imgs.reduce((s, i) => s + Math.round(i.w * i.h / 1000), 0);
  return { text, firstPara, rest, imgs, chars: text.length, imgChars };
}

/* 模拟 AI 改写：保留活动信息与变量占位符、去掉诱导词、长度不超过原文 120% */
const EC_REWRITE_MAP = [
  [/free money/gi, 'rewards'], [/win big/gi, 'enjoy more'], [/no deposit/gi, ''], [/claim now/gi, 'view details'],
  [/casino/gi, 'games'], [/jackpot/gi, 'top prize'], [/bonus(es)?/gi, 'reward'], [/\bbet(s)?\b/gi, 'play'],
  [/\bwin(s)?\b/gi, 'enjoy'], [/\bfree\b/gi, ''], [/exclusive/gi, 'featured'], [/\boffer(s)?\b/gi, 'update'],
  [/limited/gi, ''], [/urgent/gi, ''], [/act now/gi, 'learn more'], [/免费/g, ''], [/中大奖/g, '参与活动'], [/稳赚/g, ''],
  [/限时/g, ''], [/加赠/g, '回馈'], [/独家/g, '精选'],
];
const EC_REWRITE_FIXED = {
  'exclusive $50 offer: bet & win!': "Explore this week's featured event lineup",
  "don't miss the biggest jackpot of the week": "See what's happening this week",
};
function ecRewrite(text) {
  const src = String(text || '').trim();
  if (!src) return '';
  const fixed = EC_REWRITE_FIXED[src.toLowerCase()];
  if (fixed) return fixed;
  /* 保护变量占位符：改写前替换为标记，改写后还原 */
  const vars = [];
  let out = src.replace(/\{\{[^}]*\}\}/g, m => { vars.push(m); return `\u0000${vars.length - 1}\u0000`; });
  out = out.replace(/[$₱]\s?\d[\d,]*/g, '').replace(/\${2,}/g, '');
  EC_REWRITE_MAP.forEach(([re, rep]) => { out = out.replace(re, rep); });
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => vars[Number(i)]);
  out = out.replace(/!+/g, '.').replace(/\s*&\s*/g, ' and ').replace(/\s{2,}/g, ' ').replace(/\s+([,.:;])/g, '$1')
    .replace(/^[\s,.:;-]+|[\s,:;-]+$/g, '').replace(/(and\s*)+$/i, '').trim();
  if (out.length < 6) out = "See what's new this week";
  const max = Math.floor(src.length * 1.2);
  if (out.length > max) out = out.slice(0, max).trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/* 检测（纯函数）：返回 { items, counts, ratio, highlights, score, ruleVersion, full } */
function ecAnalyze(input = {}, { full = false } = {}) {
  const subject = String(input.subject || '');
  const preheader = String(input.preheader || '');
  const body = ecParseBody(input.bodyHtml ?? input.bodyText ?? '');
  const items = [];
  const push = (it) => items.push(it);
  const words = hits => [...new Set(hits.map(h => h.word))].join(', ');

  const scopes = [
    { key: 'subject', label: '主题', text: subject, applicable: true },
    { key: 'preheader', label: '预览文本', text: preheader, applicable: false },
    { key: 'firstPara', label: '首段', text: body.firstPara, applicable: true },
  ];
  const highlights = {};
  let anyHit = false;
  scopes.forEach(sc => {
    const hits = ecFindWords(sc.text);
    highlights[sc.key] = { text: sc.text, hits };
    const hi = hits.filter(h => h.level === 'high');
    const mi = hits.filter(h => h.level === 'mid');
    if (hits.length) anyHit = true;
    const rewrite = sc.applicable ? ecRewrite(sc.text) : '';
    if (hi.length) {
      push({ code: 'E1-1', level: 'strong', field: sc.key, text: `${sc.label}含高风险促销词：${words(hi)}`, rewrite });
    }
    if (mi.length) {
      push({ code: 'E1-2', level: 'mid', field: sc.key, text: `${sc.label}含中风险促销词：${words(mi)}`, rewrite: hi.length ? '' : rewrite });
    }
  });
  const restHits = ecFindWords(body.rest);
  if (restHits.length) push({ code: 'E1-3', level: 'tip', text: `正文其余部分含促销词：${words(restHits)}，建议弱化表述` });

  if (full && !anyHit && EC_AI_PATTERNS.some(re => re.test(subject + ' ' + body.firstPara))) {
    push({ code: 'E1-4', level: 'mid', field: 'firstPara', text: 'AI 语义判定：主题 / 首段含诱导性促销表述', rewrite: ecRewrite(body.firstPara) });
  }

  if (subject) {
    const letters = subject.replace(/[^A-Za-z]/g, '');
    const upper = subject.replace(/[^A-Z]/g, '').length;
    const forms = [];
    if (letters.length >= 6 && upper / letters.length > 0.5) forms.push('全大写占比过高');
    if ((subject.match(/!/g) || []).length >= 2) forms.push('感叹号 ≥ 2');
    else if (/!/.test(subject)) forms.push('含感叹号');
    if (/[$₱€£]/.test(subject)) forms.push('含货币符号');
    if (subject.length > 60) forms.push('长度超过 60 字符');
    if (forms.length) push({ code: 'E1-5', level: 'tip', text: `主题形式：${forms.join('、')}，建议去掉` });
  }

  /* E2 图文比例 */
  let ratio = null;
  const hasBody = body.chars > 0 || body.imgs.length > 0;
  if (typeof input.imageRatio === 'number') ratio = input.imageRatio;
  else if (hasBody) ratio = Math.round(body.chars / (body.chars + body.imgChars) * 100);
  if (ratio !== null || subject) {
    if (ratio === null || ratio < EC_IMAGE_ONLY_MAX || body.chars === 0) {
      push({ code: 'E2-2', level: 'strong', text: `纯图邮件：文本占比 ${ratio === null ? 0 : ratio}%（或正文无可读文本），易被判垃圾邮件，建议把图上文字改为 HTML 文本` });
    } else if (ratio < EC_TEXT_RATIO_MIN) {
      push({ code: 'E2-1', level: 'mid', text: `图文比例 ${ratio}%，低于 ${EC_TEXT_RATIO_MIN}%` });
    }
  }
  const noAlt = body.imgs.filter(i => !i.alt).length;
  if (noAlt) push({ code: 'E2-3', level: 'tip', text: `${noAlt} 张图片缺少 alt 文本` });

  /* E3 Footer（系统 Footer 强制带入，要素齐全；停用版本提醒） */
  const footers = ecFootersOf(input.site);
  const footerVer = input.footerVersion || ecDefaultFooter(input.site);
  const footer = footers.find(f => f.ver === footerVer) || footers[0];
  if (footer.status === '停用') push({ code: 'E3-2', level: 'mid', text: `Footer 版本 ${footer.ver} 已停用，请换为启用版本` });
  push({ code: 'E3-1', level: 'pass', text: 'Footer 要素齐全（地址 · 牌照 · 18+ · 退订）' });

  /* S 一期敏感词 */
  const all = `${subject} ${preheader} ${body.text}`.toLowerCase();
  const sens = EC_SENSITIVE.filter(w => all.includes(w.toLowerCase()));
  if (sens.length) push({ code: 'S', level: 'strong', text: `命中一期敏感词：${sens.join(', ')}（按一期规则：命中则该消息发送时失败）` });

  const counts = { strong: 0, mid: 0, tip: 0 };
  items.forEach(i => { if (counts[i.level] !== undefined) counts[i.level]++; });
  return {
    items, counts, ratio, chars: body.chars, imgCount: body.imgs.length, highlights,
    footer: { site: input.site || '', ver: footer.ver, status: footer.status },
    score: null, /* E4：OneSignal 评分接口未上线时显示「暂无」 */
    ruleVersion: EC_RULE_VERSION, full, checkedAt: ecNowStr(),
  };
}

/* 用改写替换正文首段（保留其余结构） */
function ecReplaceFirstPara(bodyHtml, newText) {
  const html = String(bodyHtml || '');
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    const parts = html.split(/\n/);
    parts[0] = newText;
    return parts.join('\n');
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const el = [...tmp.querySelectorAll('p, div, h1, h2, h3, li')].find(e => (e.textContent || '').trim() && !e.querySelector('p, div'));
  if (el) el.textContent = newText;
  else tmp.insertAdjacentHTML('afterbegin', `<p>${ecEsc(newText)}</p>`);
  return tmp.innerHTML;
}

const EC_LEVEL = { strong: '强提醒', mid: '提醒', tip: '建议', pass: '通过' };
const EC_FIELD_LABEL = { subject: '主题', preheader: '预览文本', firstPara: '首段' };

function ecSummaryHtml(counts) {
  return `<span class="ec-count strong">强提醒 ${counts.strong}</span><span class="ec-sep">·</span><span class="ec-count mid">提醒 ${counts.mid}</span><span class="ec-sep">·</span><span class="ec-count tip">建议 ${counts.tip}</span>`;
}

/* 面板渲染 */
function renderEmailCheck(container, opts = {}) {
  if (!container) return null;
  let input = { subject: '', preheader: '', bodyHtml: '', site: '', footerVersion: '', imageRatio: undefined, ...opts };
  const readOnly = !!opts.readOnly;
  let records = Array.isArray(opts.records) ? opts.records.map(r => ({ ...r })) : [];
  let ignored = records.some(r => r.action === '已忽略');
  let full = !!opts.full;
  let result = ecAnalyze(input, { full });
  let hlResult = result;       // 促销词高亮：停止输入 1 秒后刷新
  let hlTimer = null;
  container.classList.add('ec-host');

  function itemHtml(it, idx) {
    const canApply = !readOnly && it.rewrite && (it.field === 'subject' || it.field === 'firstPara');
    const adopted = records.find(r => r.action === '已采纳' && r.code === it.code && r.field === it.field && r.after === it.rewrite);
    return `<div class="v2-ci ${it.level}">
      <span class="dot-l"></span>
      <div class="ec-ci-main">
        <div><span class="ec-lv ${it.level}">${EC_LEVEL[it.level]}</span><span class="ec-code">${it.code}</span>${ecEsc(it.text)}</div>
        ${it.rewrite ? `<div class="sugg"><span class="ec-sugg-label">AI 改写建议（${EC_FIELD_LABEL[it.field] || ''}）</span>${ecEsc(it.rewrite)}
          ${canApply ? `<button type="button" class="btn btn-outline btn-sm ec-apply" data-ec-apply="${idx}">${it.field === 'firstPara' ? '采纳改写' : '采纳'}</button>` : ''}
          ${adopted ? '<span class="tag tag-success ec-adopted">已采纳</span>' : ''}</div>` : ''}
      </div>
    </div>`;
  }

  function hlRow(label, key) {
    const h = hlResult.highlights[key];
    return `<div class="ec-hl-row"><span class="ec-hl-label">${label}</span><span class="ec-hl-text">${ecHighlight(h?.text || '', h?.hits || [])}</span></div>`;
  }

  function render() {
    const c = result.counts;
    const ratio = result.ratio;
    const ratioCls = ratio === null ? '' : ratio < EC_IMAGE_ONLY_MAX ? 'danger' : ratio < EC_TEXT_RATIO_MIN ? 'warn' : 'ok';
    const footers = ecFootersOf(input.site).filter(f => f.status === '启用');
    const empty = !input.subject && !result.chars && !result.imgCount;
    const order = { strong: 0, mid: 1, tip: 2, pass: 3 };
    const items = result.items.map((it, i) => ({ it, i })).sort((a, b) => order[a.it.level] - order[b.it.level]);
    container.innerHTML = `
      <div class="v2-check ec-panel${readOnly ? ' is-readonly' : ''}">
        <div class="v2-check-head">
          <span class="ec-title"><i data-lucide="shield-check"></i>检测结果${readOnly ? '<span class="tag tag-gray-outline">只读</span>' : ''}</span>
          <span class="ec-head-right">${ecSummaryHtml(c)}<span class="ec-score" title="OneSignal 评分接口未上线时显示暂无">评分 暂无</span></span>
        </div>
        <div class="v2-check-body">
          ${empty && !readOnly ? '<div class="v2-hint">填写主题与正文后实时检测；保存 / 提交时执行全量检测（含 AI 语义与服务商评分）</div>' : ''}
          <div class="ec-block">
            <div class="ec-block-title">促销词高亮 <span class="ec-legend"><mark class="v2-hl">高风险</mark><mark class="v2-hl mid">中风险</mark></span></div>
            ${hlRow('主题', 'subject')}${hlRow('预览文本', 'preheader')}${hlRow('首段', 'firstPara')}
          </div>
          <div class="ec-block">
            <div class="ec-block-title">图文比例 <span class="v2-hint">文本占比，建议 ≥ ${EC_TEXT_RATIO_MIN}%；正文 ${result.chars} 字 · 图片 ${result.imgCount} 张</span></div>
            <div class="ec-ratio-row">
              <div class="v2-ratio ec-ratio ${ratioCls}"><i style="width:${ratio ?? 0}%"></i><b class="ec-ratio-mark" style="left:${EC_TEXT_RATIO_MIN}%"></b></div>
              <span class="ec-ratio-val ${ratioCls}">${ratio === null ? '—' : ratio + '%'}</span>
            </div>
          </div>
          <div class="ec-block ec-footer-row">
            <span class="ec-block-title">Footer</span>
            <span class="tag tag-info">系统 Footer ${ecEsc(result.footer.ver)} · ${ecEsc(typeof plName === 'function' ? plName(input.site) : input.site) || '-'}</span>
            ${result.footer.status === '停用' ? '<span class="tag tag-danger">已停用</span>' : ''}
            ${!readOnly ? `<select class="ec-footer-sel" title="换版本">${footers.map(f => `<option value="${ecEsc(f.ver)}" ${f.ver === result.footer.ver ? 'selected' : ''}>换版本：${ecEsc(f.ver)}</option>`).join('')}</select>` : ''}
            <span class="v2-hint">系统 Footer 自动追加在正文末尾，不可删除</span>
          </div>
          <div class="ec-items">${items.map(({ it, i }) => itemHtml(it, i)).join('')}
            <div class="v2-ci tip"><span class="dot-l"></span><div class="ec-ci-main"><span class="ec-lv tip">评分</span><span class="ec-code">E4</span>OneSignal 评分：暂无</div></div>
          </div>
          <div class="ec-meta v2-hint">规则版本 ${result.ruleVersion} · ${result.full ? '全量检测' : '实时检测'}于 ${result.checkedAt}${result.full ? '' : '（AI 语义与评分在保存 / 提交时执行）'} · 只提醒不阻断</div>
          ${records.length ? `<div class="ec-block"><div class="ec-block-title">采纳 / 忽略记录</div>
            <ul class="ec-records">${records.map(r => `<li><span class="tag ${r.action === '已采纳' ? 'tag-success' : 'tag-gray'}">${r.action}</span>${ecEsc(r.desc)}<span class="v2-hint">${ecEsc(r.by || '')} ${ecEsc(r.time || '')}</span></li>`).join('')}</ul></div>` : ''}
          ${!readOnly ? `<div class="ec-actions">
            <button type="button" class="btn btn-outline btn-sm ec-recheck"><i data-lucide="refresh-cw"></i>重新检测</button>
            <button type="button" class="btn btn-outline btn-sm ec-ignore" ${ignored ? 'disabled' : ''}>${ignored ? '已忽略全部提醒' : '忽略全部提醒并继续'}</button>
          </div>` : ''}
        </div>
      </div>`;
    bind();
    if (typeof refreshIcons === 'function') refreshIcons();
  }

  function bind() {
    container.querySelectorAll('[data-ec-apply]').forEach(btn => btn.addEventListener('click', () => {
      const it = result.items[Number(btn.dataset.ecApply)];
      if (!it) return;
      const before = it.field === 'subject' ? input.subject : (ecParseBody(input.bodyHtml).firstPara);
      records.push({ action: '已采纳', code: it.code, field: it.field, before, after: it.rewrite, desc: `${it.code} ${EC_FIELD_LABEL[it.field]}改写：${it.rewrite}`, by: 'marvin@', time: ecNowStr() });
      if (it.field === 'subject') input.subject = it.rewrite;
      else input.bodyHtml = ecReplaceFirstPara(input.bodyHtml, it.rewrite);
      opts.onApply?.(it.field, it.field === 'subject' ? it.rewrite : input.bodyHtml, it);
      recompute(true);
      if (typeof showToast === 'function') showToast(`已采纳改写建议（${EC_FIELD_LABEL[it.field]}），可再编辑`);
    }));
    container.querySelector('.ec-recheck')?.addEventListener('click', () => {
      api.runFull();
      if (typeof showToast === 'function') showToast(`检测完成：强提醒 ${result.counts.strong} · 提醒 ${result.counts.mid} · 建议 ${result.counts.tip}`);
    });
    container.querySelector('.ec-ignore')?.addEventListener('click', () => {
      ignored = true;
      records.push({ action: '已忽略', desc: `忽略全部提醒（强提醒 ${result.counts.strong} · 提醒 ${result.counts.mid} · 建议 ${result.counts.tip}）`, by: 'marvin@', time: ecNowStr() });
      render();
      opts.onIgnore?.(api.getResult());
      if (typeof showToast === 'function') showToast('已记录「已忽略」，可继续保存 / 提交');
    });
    container.querySelector('.ec-footer-sel')?.addEventListener('change', e => {
      input.footerVersion = e.target.value;
      records.push({ action: '已采纳', code: 'E3', desc: `Footer 换版本为 ${e.target.value}`, by: 'marvin@', time: ecNowStr() });
      opts.onFooterChange?.(e.target.value);
      recompute(true);
    });
  }

  function recompute(immediateHl) {
    result = ecAnalyze(input, { full });
    if (immediateHl) { hlResult = result; render(); return; }
    render();
    clearTimeout(hlTimer);
    hlTimer = setTimeout(() => { hlResult = result; render(); }, 1000);
  }

  const api = {
    update(partial = {}) { input = { ...input, ...partial }; full = false; recompute(false); },
    runFull() { full = true; result = ecAnalyze(input, { full: true }); hlResult = result; render(); return api.getResult(); },
    getResult() { return { ...result, records: records.map(r => ({ ...r })), ignored, footerVersion: result.footer.ver }; },
    getInput() { return { ...input }; },
    destroy() { clearTimeout(hlTimer); container.innerHTML = ''; container.classList.remove('ec-host'); },
  };
  hlResult = result;
  render();
  return api;
}

/* 从内容编辑器的邮件值取检测输入 */
function ecInputFromContent(content, site) {
  const c = content || {};
  return {
    subject: c.subject || '',
    preheader: c.preheader ?? c.subtitle ?? '',
    bodyHtml: c.contentType === 'html' && c.htmlFile ? (c.htmlBody || '') : (c.body || ''),
    imageRatio: typeof c.imageRatio === 'number' ? c.imageRatio : undefined,
    footerVersion: c.footerVersion || '',
    site: site || '',
  };
}

/* 提交按钮旁的「强提醒 N」徽标 */
function ecBadgeHtml(counts) {
  if (!counts) return '';
  return counts.strong ? `<span class="ec-badge strong" title="邮件内容检测：只提醒不阻断">强提醒 ${counts.strong}</span>`
    : (counts.mid ? `<span class="ec-badge mid" title="邮件内容检测：只提醒不阻断">提醒 ${counts.mid}</span>` : '');
}

const HISTORY_KEY = 'translatorHistory';
const READING_KEY = 'translatorReadingArea';
const VARIANTS_KEY = 'translatorTranslationVariants';
const READER_PREFS_KEY = 'translatorReaderPreferences';
const READER_DRAFTS_KEY = 'translatorReaderDrafts';
const VALID_MODES = new Set(['dual', 'source', 'translated']);
const VALID_THEMES = new Set(['paper', 'snow', 'sepia', 'graphite', 'midnight', 'forest']);
const VALID_FONTS = new Set(['serif', 'sans', 'kai', 'system']);
const state = {
  item: null,
  mode: 'dual',
  theme: 'paper',
  fontFamily: 'serif',
  fontSize: 18
};
const uiMessage = (key, fallback, substitutions) => {
  try {
    return globalThis.AnwaraI18n?.t(key, fallback, substitutions) || fallback || key;
  } catch {
    return fallback || key;
  }
};
const uiText = (value) => globalThis.AnwaraI18n?.text(value) || value;

const titleEl = document.getElementById('readerTitle');
const sourceLinkEl = document.getElementById('sourceLink');
const metaEl = document.getElementById('readerMeta');
const statusEl = document.getElementById('readerStatus');
const contentEl = document.getElementById('readerContent');
const fontSizeLabelEl = document.getElementById('fontSizeLabel');
const tocToggleBtn = document.getElementById('tocToggleBtn');
const tocCloseBtn = document.getElementById('tocCloseBtn');
const tocPanel = document.getElementById('tocPanel');
const tocBackdrop = document.getElementById('tocBackdrop');
const tocList = document.getElementById('tocList');
const readerBackBtn = document.getElementById('readerBackBtn');
const readerTopBtn = document.getElementById('readerTopBtn');
const readerReadingBtn = document.getElementById('readerReadingBtn');
const retranslateBtn = document.getElementById('retranslateBtn');
const retranslateMenu = document.getElementById('retranslateMenu');
const retranslateOptions = Array.from(document.querySelectorAll('.reader-engine-option'));
const fontFamilySelect = document.getElementById('fontFamilySelect');
const themeButtons = Array.from(document.querySelectorAll('.theme-swatch'));
const modeTabs = Array.from(document.querySelectorAll('.mode-tab'));
const readerSearchInput = document.getElementById('readerSearchInput');
const readerSearchPrevBtn = document.getElementById('readerSearchPrevBtn');
const readerSearchNextBtn = document.getElementById('readerSearchNextBtn');
const readerSearchCount = document.getElementById('readerSearchCount');
const readerProgressEl = document.getElementById('readerProgress');
let tocOpen = false;
let tocCloseTimer = null;
let linkChoiceEl = null;
let linkChoiceAnchor = null;
let linkChoiceDismissHandler = null;
let readerScrollStack = [];
let retranslateBusy = false;
let localReaderTranslator = null;
let localReaderTranslatorPair = '';
const TRANSLATION_ONLINE_PROVIDER_KEY = 'translatorOnlineProvider';
const TRANSLATION_LLM_PROVIDER_KEY = 'translatorLlmProvider';
const TRANSLATION_TARGET_LANGUAGE_KEY = 'autoTranslateTargetLang';
const TRANSLATION_VARIANT_LIMIT = 6;
const READER_POSITIONS_KEY = 'translatorReaderPositions';
const READER_PROVIDER_PROFILES_KEY = 'translatorProviderProfiles';
const READER_PROVIDER_CREDENTIALS_KEY = 'translatorProviderCredentials';
const READER_PROVIDER_ACTIVE_PROFILE_KEY = 'translatorProviderActiveProfileIds';
let readerSearchMatches = [];
let readerSearchIndex = -1;
let readerPositionTimer = null;
let readerReadingBusy = false;
const READER_PROVIDER_REQUIREMENTS = {
  google: { needsKey: true }, microsoft: { needsKey: true }, deepl: { needsKey: true }, deeplx: { allowHttp: true },
  xiaoniu: { needsKey: true }, youdao: { credentials: true }, tencent: { credentials: true },
  openai: { needsKey: true, llm: true }, deepseek: { needsKey: true, llm: true }, tongyi: { needsKey: true, llm: true },
  zhipu: { needsKey: true, llm: true }, moonshot: { needsKey: true, llm: true }, gemini: { needsKey: true, llm: true },
  claude: { needsKey: true, llm: true }, custom: { needsKey: true, llm: true, allowHttp: true }
};

const PROVIDER_LABELS = {
  google: 'Google Cloud', microsoft: 'Microsoft', deepl: 'DeepL', deeplx: 'DeepLX', xiaoniu: '小牛', youdao: '有道', tencent: '腾讯云',
  openai: 'OpenAI', deepseek: 'DeepSeek', tongyi: '通义', zhipu: '智谱', moonshot: 'Kimi', gemini: 'Gemini', claude: 'Claude', custom: '自定义接口'
};

const LANGUAGE_LABELS = {
  auto: '自动检测',
  en: '英语',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁体中文',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ru: '俄语',
  it: '意大利语',
  pt: '葡萄牙语'
};

function normalizeText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function languageLabel(code) {
  return uiText(LANGUAGE_LABELS[code] || code || '未知语言');
}

function normalizeReaderLanguage(code) {
  return code === 'zh' ? 'zh-Hans' : code;
}

function normalizeChineseReaderPunctuation(text, targetLanguage) {
  if (!['zh-Hans', 'zh-Hant'].includes(normalizeReaderLanguage(targetLanguage))) return String(text || '');
  const han = '\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
  return String(text || '')
    .replace(new RegExp(`([${han}])\\s*,\\s*`, 'g'), '$1，')
    .replace(new RegExp(`([${han}])\\s*;\\s*`, 'g'), '$1；')
    .replace(new RegExp(`([${han}])\\s*:\\s*`, 'g'), '$1：')
    .replace(new RegExp(`([${han}])\\s*!\\s*(?=\\s|$|[”）】])`, 'g'), '$1！')
    .replace(new RegExp(`([${han}])\\s*\\?\\s*(?=\\s|$|[”）】])`, 'g'), '$1？')
    .replace(new RegExp(`([${han}])\\s*\\.\\s*(?=\\s|$|[”）】])`, 'g'), '$1。');
}

function readerEngineLabel(engineId, providerId = '') {
  if (engineId === 'online') return uiMessage('onlineTranslation', '在线翻译') + (providerId ? ' · ' + (PROVIDER_LABELS[providerId] || providerId) : '');
  if (engineId === 'llm') return uiMessage('llmTranslation', '大模型翻译') + (providerId ? ' · ' + (PROVIDER_LABELS[providerId] || providerId) : '');
  return uiMessage('localTranslation', '本地翻译');
}

function formatTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function splitUnits(value) {
  const text = normalizeText(value);
  if (!text) return [];
  return text
    .split(/\n+|(?<=[。！？!?；;])\s*|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getPairs(item) {
  const sourceUnits = splitUnits(item.sourceText);
  const translatedUnits = splitUnits(item.translatedText);
  const aligned = sourceUnits.length > 1 && sourceUnits.length === translatedUnits.length;
  if (aligned) {
    return {
      aligned: true,
      pairs: sourceUnits.map((source, index) => ({
        source,
        translated: translatedUnits[index]
      }))
    };
  }
  return {
    aligned: false,
    pairs: [{
      source: normalizeText(item.sourceText),
      translated: normalizeText(item.translatedText)
    }]
  };
}

function getStructuredBlocks(item) {
  if (Array.isArray(item?.structuredBlocks) && item.structuredBlocks.length) return item.structuredBlocks;
  if (Array.isArray(item?.document?.blocks) && item.document.blocks.length) return item.document.blocks;
  return null;
}

function citationTargetId(value) {
  const key = normalizeCitationKey(value);
  const slug = key.replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return slug ? `reader-citation-${slug}` : '';
}

function collectCitationKeys(block, output = []) {
  if (!block || typeof block !== 'object') return output;
  (block.links || []).forEach((link) => {
    const key = normalizeCitationKey(link?.citationKey || link?.text);
    if (key && !output.includes(key)) output.push(key);
  });
  if (block.type === 'list') {
    (block.items || []).forEach((item) => collectCitationKeys(item, output));
    return output;
  }
  if (block.type === 'table') {
    (block.rows || []).forEach((row) => row.forEach((cell) => collectCitationKeys(cell, output)));
    return output;
  }
  const sourceParts = normalizeText(block.sourceText).split(/\n+/);
  sourceParts.forEach((part) => {
    const key = normalizeCitationKey(part);
    if (key && hasCitationPrefix(part, key) && !output.includes(key)) output.push(key);
  });
  return output;
}

function decorateRenderedCitations(root, block) {
  const keys = collectCitationKeys(block);
  if (!keys.length) return;
  const candidates = Array.from(root.querySelectorAll('.reader-source, .reader-translated'));
  for (const key of keys) {
    const targetId = citationTargetId(key);
    if (!targetId || document.getElementById(targetId)) continue;
    const target = candidates.find((element) => hasCitationPrefix(element.textContent, key));
    if (!target) continue;
    target.id = targetId;
    target.dataset.citationKey = key;
  }
}

function findCitationTarget(key) {
  const targetId = citationTargetId(key);
  if (!targetId || !contentEl) return null;
  const direct = document.getElementById(targetId);
  if (direct && contentEl.contains(direct)) return direct;
  return Array.from(contentEl.querySelectorAll('.reader-source, .reader-translated'))
    .find((candidate) => hasCitationPrefix(candidate.textContent, normalizeCitationKey(key))) || null;
}

function findReferenceTarget(link) {
  if (!contentEl || !link) return null;
  const anchorId = String(link.targetAnchorId || link.targetId || link.targetBlockId || link.readerTargetId || '').replace(/^#/, '');
  if (anchorId) {
    const direct = document.getElementById(anchorId);
    if (direct && contentEl.contains(direct)) return direct;
    const mapped = Array.from(contentEl.querySelectorAll('[data-source-anchor-id]'))
      .find((element) => element.dataset.sourceAnchorId === anchorId);
    if (mapped) return mapped;
  }
  return findCitationTarget(link.citationKey);
}

function decorateSourceAnchorTarget(root, block) {
  const anchorId = String(block?.sourceAnchorId || '').trim();
  if (anchorId && root?.dataset) root.dataset.sourceAnchorId = anchorId;
}

function appendReaderPair(parent, source, translated, links = []) {
  if (state.mode === 'source') {
    appendTextBlocks(parent, 'reader-source', source, links);
  } else if (state.mode === 'translated') {
    appendTextBlocks(parent, 'reader-translated', translated);
  } else {
    appendTextBlocks(parent, 'reader-source', source, links);
    appendTextBlocks(parent, 'reader-translated', translated);
  }
}

function renderStructuredBlock(block) {
  const type = block?.type || 'paragraph';
  if (type === 'list') {
    const section = document.createElement('section');
    section.className = 'reader-structure-block reader-block-list';
    const list = document.createElement(block.ordered ? 'ol' : 'ul');
    for (const item of block.items || []) {
      const listItem = document.createElement('li');
      decorateSourceAnchorTarget(listItem, item);
      appendReaderPair(listItem, item.sourceText, item.translatedText, item.links);
      list.appendChild(listItem);
    }
    section.appendChild(list);
    return section;
  }

  if (type === 'table') {
    const section = document.createElement('section');
    section.className = 'reader-structure-block reader-block-table';
    const table = document.createElement('table');
    const body = document.createElement('tbody');
    for (const row of block.rows || []) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        decorateSourceAnchorTarget(td, cell);
        appendReaderPair(td, cell.sourceText, cell.translatedText, cell.links);
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  if (type === 'heading') {
    const section = document.createElement('section');
    section.className = 'reader-structure-block reader-block-heading';
    const level = Math.max(1, Math.min(6, Number(block.level) || 2));
    if (state.mode !== 'translated') {
      const sourceHeading = document.createElement(`h${level}`);
      sourceHeading.className = 'reader-source';
      appendLinkedText(sourceHeading, block.sourceText, block.links);
      section.appendChild(sourceHeading);
    }
    if (state.mode !== 'source') {
      const translatedHeading = document.createElement(`h${level}`);
      translatedHeading.className = 'reader-translated';
      translatedHeading.textContent = block.translatedText || '';
      section.appendChild(translatedHeading);
    }
    return section;
  }

  if (type === 'meta') {
    const section = document.createElement('section');
    section.className = 'reader-structure-block reader-block-meta';
    appendReaderPair(section, block.sourceText, block.translatedText);
    return section;
  }

  if (type === 'code') {
    const section = document.createElement('section');
    section.className = 'reader-structure-block reader-block-code';
    const sourceText = block.sourceText || '';
    const translatedText = block.translatedText || sourceText;
    const isDuplicateInDualMode = state.mode === 'dual' && normalizeText(sourceText) === normalizeText(translatedText);
    if (state.mode !== 'translated') {
      const source = document.createElement('pre');
      source.className = 'reader-source';
      source.textContent = sourceText;
      section.appendChild(source);
    }
    if (state.mode !== 'source' && !isDuplicateInDualMode) {
      const translated = document.createElement('pre');
      translated.className = 'reader-translated';
      translated.textContent = translatedText;
      section.appendChild(translated);
    }
    return section;
  }

  if (type === 'quote') {
    const section = document.createElement('blockquote');
    section.className = 'reader-structure-block reader-block-quote';
    appendReaderPair(section, block.sourceText, block.translatedText, block.links);
    return section;
  }

  const section = document.createElement('section');
  section.className = 'reader-structure-block reader-block-paragraph';
  appendReaderPair(section, block.sourceText, block.translatedText, block.links);
  return section;
}

function normalizeCitationKey(value) {
  const text = normalizeText(value).replace(/[\u200b\u200c\u200d\ufeff]/g, '');
  const bracketed = text.match(/^[\[【(（]\s*([^\]】)）\s]+?)\s*[\]】)）]/);
  if (bracketed) return bracketed[1].trim();
  const numeric = text.match(/^\d+(?=\s|[:：、,，.。]|$)/);
  return numeric ? numeric[0] : '';
}

function hasCitationPrefix(value, key) {
  const text = normalizeText(value);
  const variants = [key, `[${key}]`, `【${key}】`, `(${key})`, `（${key}）`];
  return variants.some((variant) => {
    if (!text.startsWith(variant)) return false;
    const rest = text.slice(variant.length);
    return !rest || /^[\s:：、,，.。]/.test(rest);
  });
}

function getCurrentPageTarget(anchor, link) {
  if (!contentEl) return null;
  const citationKey = normalizeCitationKey(link?.citationKey || anchor.dataset.citationKey || link?.text || anchor.textContent);
  const explicitTarget = String(link?.targetAnchorId || link?.targetId || link?.targetBlockId || link?.readerTargetId || anchor.dataset.targetId || (citationKey ? citationTargetId(citationKey) : '')).replace(/^#/, '');
  if (explicitTarget) {
    const explicitElement = document.getElementById(explicitTarget);
    if (explicitElement && contentEl.contains(explicitElement)) return explicitElement;
    const mappedElement = Array.from(contentEl.querySelectorAll('[data-source-anchor-id]'))
      .find((element) => element.dataset.sourceAnchorId === explicitTarget);
    if (mappedElement) return mappedElement;
  }

  let href = '';
  try {
    const url = new URL(String(link?.href || anchor.href), location.href);
    const hash = decodeURIComponent(url.hash.replace(/^#/, ''));
    if (hash) {
      const hashElement = document.getElementById(hash);
      if (hashElement && contentEl.contains(hashElement)) return hashElement;
    }
    href = url.href;
  } catch {}

  const sameLink = Array.from(contentEl.querySelectorAll('a[href]'))
    .find((candidate) => candidate !== anchor && candidate.href === href);
  if (sameLink) return sameLink.closest('.reader-structure-block') || sameLink;

  if (citationKey) {
    const citationText = Array.from(contentEl.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, blockquote'))
      .find((element) => element !== anchor && !element.contains(anchor) && hasCitationPrefix(element.textContent, citationKey));
    if (citationText) return citationText;
  }

  const label = normalizeText(anchor.textContent);
  if (!label) return null;
  const textMatch = Array.from(contentEl.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, blockquote'))
    .find((element) => {
      if (element.contains(anchor)) return false;
      const textContent = normalizeText(element.textContent);
      return textContent === label || textContent.startsWith(`${label} `) || textContent.startsWith(`${label}\\n`);
    });
  return textMatch || null;
}

function closeLinkChoice() {
  if (linkChoiceDismissHandler) {
    document.removeEventListener('pointerdown', linkChoiceDismissHandler, true);
    document.removeEventListener('keydown', linkChoiceDismissHandler);
    window.removeEventListener('resize', linkChoiceDismissHandler);
    window.removeEventListener('scroll', linkChoiceDismissHandler, true);
  }
  linkChoiceDismissHandler = null;
  linkChoiceEl?.remove();
  linkChoiceEl = null;
  linkChoiceAnchor = null;
}

function updateReaderBackButton() {
  if (!readerBackBtn) return;
  readerBackBtn.hidden = readerScrollStack.length === 0;
  readerBackBtn.disabled = readerScrollStack.length === 0;
}

function rememberReaderPosition() {
  readerScrollStack.push({
    left: window.scrollX || document.documentElement.scrollLeft || 0,
    top: window.scrollY || document.documentElement.scrollTop || 0
  });
  updateReaderBackButton();
}

function returnToReaderPosition() {
  const position = readerScrollStack.pop();
  if (!position) return;
  window.scrollTo({ left: position.left, top: position.top, behavior: 'smooth' });
  updateReaderBackButton();
}

function showLinkChoice(anchor, href, link) {
  closeLinkChoice();
  const currentTarget = getCurrentPageTarget(anchor, link);
  const panel = document.createElement('div');
  panel.className = 'reader-link-choice';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '选择链接打开方式');

  const title = document.createElement('div');
  title.className = 'reader-link-choice-title';
  title.textContent = link?.citationKey ? `引用 ${link.citationKey}` : '打开链接';
  panel.appendChild(title);

  const currentButton = document.createElement('button');
  currentButton.type = 'button';
  currentButton.className = 'reader-link-choice-button';
  currentButton.textContent = '当前阅读页';
  currentButton.disabled = !currentTarget;
  currentButton.title = currentTarget ? '跳转到当前阅读页对应位置' : '当前阅读页没有找到对应位置';
  currentButton.addEventListener('click', () => {
    if (!currentTarget) return;
    rememberReaderPosition();
    closeLinkChoice();
    currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    currentTarget.classList.add('reader-link-target-highlight');
    window.setTimeout(() => currentTarget.classList.remove('reader-link-target-highlight'), 1200);
    setStatus('已跳转到当前阅读页对应位置。', 'ok');
  });
  panel.appendChild(currentButton);

  const originalButton = document.createElement('button');
  originalButton.type = 'button';
  originalButton.className = 'reader-link-choice-button is-primary';
  originalButton.textContent = '打开原链接';
  originalButton.title = '在新标签页打开原文链接';
  originalButton.addEventListener('click', () => {
    closeLinkChoice();
    window.open(href, '_blank', 'noopener,noreferrer');
  });
  panel.appendChild(originalButton);

  document.body.appendChild(panel);
  linkChoiceEl = panel;
  linkChoiceAnchor = anchor;
  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const rightLeft = anchorRect.right + 10;
  const fitsRight = rightLeft + panelRect.width <= window.innerWidth - 12;
  const left = fitsRight
    ? rightLeft
    : Math.max(12, Math.min(anchorRect.left, window.innerWidth - panelRect.width - 12));
  const belowTop = anchorRect.bottom + 8;
  const top = fitsRight
    ? Math.max(12, Math.min(anchorRect.top, window.innerHeight - panelRect.height - 12))
    : belowTop + panelRect.height <= window.innerHeight - 12
      ? belowTop
      : Math.max(12, anchorRect.top - panelRect.height - 8);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;

  linkChoiceDismissHandler = (event) => {
    if (event.type === 'keydown') {
      if (event.key === 'Escape') closeLinkChoice();
      return;
    }
    if (linkChoiceEl?.contains(event.target) || linkChoiceAnchor?.contains(event.target)) return;
    closeLinkChoice();
  };
  document.addEventListener('pointerdown', linkChoiceDismissHandler, true);
  document.addEventListener('keydown', linkChoiceDismissHandler);
  window.addEventListener('resize', linkChoiceDismissHandler);
  window.addEventListener('scroll', linkChoiceDismissHandler, true);
}

function appendLinkedText(parent, value, links = []) {
  const text = String(value ?? '');
  if (!Array.isArray(links) || links.length === 0) {
    parent.textContent = text;
    return;
  }

  let cursor = 0;
  for (const link of links) {
    const label = normalizeText(link?.text);
    const href = String(link?.href || '').trim();
    if (!label || !href || /^(?:javascript|data):/i.test(href)) continue;
    let resolvedHref = href;
    try { resolvedHref = new URL(href, location.href).href; } catch {}
    const index = text.indexOf(label, cursor);
    if (index < 0) continue;
    if (index > cursor) parent.appendChild(document.createTextNode(text.slice(cursor, index)));
    const anchor = document.createElement('a');
    anchor.href = resolvedHref;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = label;
    const citationKey = normalizeCitationKey(link?.citationKey || label);
    if (link?.referenceId) anchor.dataset.referenceId = link.referenceId;
    if (citationKey) {
      anchor.dataset.citationKey = citationKey;
      anchor.dataset.targetId = citationTargetId(citationKey);
      const targetId = citationTargetId(citationKey);
      anchor.title = `当前阅读页引用 ${citationKey}；点击选择去向`;
    } else {
      anchor.title = '点击选择打开方式';
    }
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showLinkChoice(anchor, resolvedHref, link);
    });
    parent.appendChild(anchor);
    cursor = index + label.length;
  }
  if (cursor < text.length) parent.appendChild(document.createTextNode(text.slice(cursor)));
}

function appendTextBlocks(parent, className, value, links = []) {
  const text = normalizeText(value);
  if (Array.isArray(links) && links.length) {
    const paragraph = document.createElement('p');
    paragraph.className = className;
    appendLinkedText(paragraph, text, links);
    parent.appendChild(paragraph);
    return;
  }
  const blocks = text ? text.split(/\n{2,}/).filter(Boolean) : [''];
  blocks.forEach((block) => {
    const paragraph = document.createElement('p');
    paragraph.className = className;
    paragraph.textContent = block;
    parent.appendChild(paragraph);
  });
}

async function loadReaderCurrentTargetLanguage() {
  try {
    const settings = await chrome.storage.sync.get([TRANSLATION_TARGET_LANGUAGE_KEY]);
    return normalizeReaderLanguage(settings[TRANSLATION_TARGET_LANGUAGE_KEY] || 'zh-Hans');
  } catch {
    return 'zh-Hans';
  }
}

async function resolveReaderProviderId(engineId) {
  if (engineId === 'local') return 'browser-translator';
  const key = engineId === 'online' ? TRANSLATION_ONLINE_PROVIDER_KEY : TRANSLATION_LLM_PROVIDER_KEY;
  const fallback = engineId === 'online' ? 'google' : 'openai';
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] || fallback;
  } catch {
    return fallback;
  }
}

async function resolveReaderProviderProfileKey(providerId) {
  if (!providerId || providerId === 'browser-translator') return '';
  try {
    const result = await chrome.storage.local.get([READER_PROVIDER_ACTIVE_PROFILE_KEY]);
    return result[READER_PROVIDER_ACTIVE_PROFILE_KEY]?.[providerId] || '';
  } catch {
    return '';
  }
}

function getReaderVariantKey(engineId, providerId, providerProfileKey, sourceLang, targetLang) {
  return [engineId, providerId || 'browser-translator', providerProfileKey || 'default', sourceLang || 'auto', targetLang || 'zh-Hans']
    .map((value) => String(value).trim())
    .join('|');
}

async function mapReaderWithConcurrency(items, worker, concurrency = 2) {
  const list = Array.isArray(items) ? items : [];
  const output = new Array(list.length);
  let nextIndex = 0;
  const run = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= list.length) return;
      output[index] = await worker(list[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), list.length || 1) }, () => run()));
  return output;
}

async function translateReaderText(text, engineId, providerId, providerProfileKey, sourceLang, targetLang) {
  const value = String(text ?? '');
  if (!value.trim()) return value;
  if (sourceLang && targetLang && normalizeReaderLanguage(sourceLang) === normalizeReaderLanguage(targetLang)) return value;

  if (engineId === 'local') {
    if (typeof window.Translator === 'undefined') throw new Error('当前阅读页无法使用本地 Translator API。');
    const pair = sourceLang + '->' + targetLang;
    if (!localReaderTranslator || localReaderTranslatorPair !== pair) {
      try { localReaderTranslator?.destroy?.(); } catch {}
      localReaderTranslator = await window.Translator.create({ sourceLanguage: sourceLang, targetLanguage: targetLang });
      localReaderTranslatorPair = pair;
    }
    return normalizeChineseReaderPunctuation(await localReaderTranslator.translate(value), targetLang);
  }

  const response = await chrome.runtime.sendMessage({ type: 'TRANSLATE_WITH_PROVIDER', text: value, sourceLang, targetLang, providerId, profileKey: providerProfileKey });
  if (!response?.ok) throw new Error(response?.error || '翻译服务请求失败');
  return normalizeChineseReaderPunctuation(response.translation || value, targetLang);
}

async function translateReaderBlocks(blocks, engineId, providerId, providerProfileKey, sourceLang, targetLang) {
  const translateUnit = (value) => translateReaderText(value, engineId, providerId, providerProfileKey, sourceLang, targetLang);
  return mapReaderWithConcurrency(blocks, async (block) => {
    if (block?.type === 'code') return { ...block, translatedText: block.sourceText || '' };
    if (block?.type === 'list') {
      const items = await mapReaderWithConcurrency(block.items || [], async (item) => ({ ...item, translatedText: await translateUnit(item.sourceText) }));
      return { ...block, items };
    }
    if (block?.type === 'table') {
      const rows = await mapReaderWithConcurrency(block.rows || [], (row) => mapReaderWithConcurrency(row, async (cell) => ({ ...cell, translatedText: await translateUnit(cell.sourceText) })));
      return { ...block, rows };
    }
    return { ...block, translatedText: await translateUnit(block?.sourceText || '') };
  });
}

async function persistReaderItem() {
  if (!state.item?.id) return;
  if (state.item.readerDraftMode === 'transient-reader') {
    if (!chrome.storage.session) return;
    const result = await chrome.storage.session.get([READER_DRAFTS_KEY]);
    const drafts = result[READER_DRAFTS_KEY] && typeof result[READER_DRAFTS_KEY] === 'object'
      ? { ...result[READER_DRAFTS_KEY] }
      : {};
    drafts[state.item.id] = { ...state.item, readerDraftMode: 'transient-reader', updatedAt: Date.now() };
    await chrome.storage.session.set({ [READER_DRAFTS_KEY]: drafts });
    return;
  }
  const result = await chrome.storage.local.get([HISTORY_KEY, READING_KEY, VARIANTS_KEY]);
  const history = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
  const readingItems = Array.isArray(result[READING_KEY]) ? result[READING_KEY] : [];
  const storedVariants = result[VARIANTS_KEY] && typeof result[VARIANTS_KEY] === 'object' ? result[VARIANTS_KEY] : {};
  const { translationVariants, ...persistedItem } = state.item;
  let changed = false;
  const replace = (items, isReadingStore) => items.map((item) => {
    if (item?.id !== state.item.id) return item;
    changed = true;
    // Alternative translations live outside the duplicated history/reading
    // records so long structured articles do not multiply local-storage use.
    return {
      ...persistedItem,
      // Membership is owned by the store itself. Preserve the history copy's
      // flag and never let opening one view erase the other view's marker.
      inReadingArea: isReadingStore ? true : item.inReadingArea
    };
  });
  const nextHistory = replace(history, false);
  const nextReading = replace(readingItems, true);
  const nextVariants = { ...storedVariants };
  if (translationVariants && typeof translationVariants === 'object') nextVariants[state.item.id] = translationVariants;
  if (changed || nextVariants[state.item.id]) {
    const patch = { [VARIANTS_KEY]: nextVariants };
    if (changed) {
      patch[HISTORY_KEY] = nextHistory;
      patch[READING_KEY] = nextReading;
    }
    await chrome.storage.local.set(patch);
  }
}

function updateReaderReadingButton() {
  if (!readerReadingBtn) return;
  const available = Boolean(state.item?.id);
  const saved = state.item?.inReadingArea === true;
  readerReadingBtn.disabled = !available || readerReadingBusy;
  readerReadingBtn.textContent = readerReadingBusy ? '保存中…' : (saved ? '移出阅读区' : '加入阅读区');
  readerReadingBtn.title = readerReadingBusy ? '正在保存阅读区' : (saved ? '从阅读区移出' : '加入阅读区');
  readerReadingBtn.classList.toggle('is-active', saved);
}

async function removeReaderDraft(recordId) {
  if (!recordId || !chrome.storage.session) return;
  try {
    const result = await chrome.storage.session.get([READER_DRAFTS_KEY]);
    const drafts = result[READER_DRAFTS_KEY] && typeof result[READER_DRAFTS_KEY] === 'object'
      ? { ...result[READER_DRAFTS_KEY] }
      : {};
    if (!drafts[recordId]) return;
    delete drafts[recordId];
    await chrome.storage.session.set({ [READER_DRAFTS_KEY]: drafts });
  } catch {}
}

async function toggleReaderReadingArea() {
  if (!state.item?.id || readerReadingBusy) return;
  const next = state.item.inReadingArea !== true;
  readerReadingBusy = true;
  updateReaderReadingButton();
  try {
    const result = await chrome.storage.local.get([HISTORY_KEY, READING_KEY, VARIANTS_KEY]);
    const history = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
    const readingItems = Array.isArray(result[READING_KEY]) ? result[READING_KEY] : [];
    const variants = result[VARIANTS_KEY] && typeof result[VARIANTS_KEY] === 'object' ? { ...result[VARIANTS_KEY] } : {};
    const { translationVariants, readerDraftMode, ...plainItem } = state.item;
    const persistedItem = { ...plainItem, inReadingArea: next };
    const historyIndex = history.findIndex((item) => item?.id === state.item.id);
    const nextHistory = historyIndex >= 0
      ? history.map((item) => item?.id === state.item.id ? { ...item, ...persistedItem, inReadingArea: next } : item)
      : history;
    const nextReading = next
      ? [persistedItem, ...readingItems.filter((item) => item?.id !== state.item.id)].slice(0, 500)
      : readingItems.filter((item) => item?.id !== state.item.id);
    const patch = { [READING_KEY]: nextReading };
    if (historyIndex >= 0) patch[HISTORY_KEY] = nextHistory;
    if (translationVariants && typeof translationVariants === 'object' && Object.keys(translationVariants).length) {
      variants[state.item.id] = translationVariants;
      patch[VARIANTS_KEY] = variants;
    }
    await chrome.storage.local.set(patch);
    state.item = { ...persistedItem, translationVariants: translationVariants || {} };
    await removeReaderDraft(state.item.id);
    setStatus(next ? '已加入阅读区。' : '已移出阅读区。', 'ok');
  } catch (error) {
    setStatus('阅读区保存失败：' + String(error?.message || error || ''), 'err');
  } finally {
    readerReadingBusy = false;
    updateReaderReadingButton();
  }
}

function setRetranslateMenuOpen(open) {
  if (!retranslateMenu || !retranslateBtn) return;
  const visible = Boolean(open);
  retranslateMenu.hidden = !visible;
  retranslateBtn.setAttribute('aria-expanded', String(visible));
}

async function retranslateCurrentItem(engineId) {
  if (retranslateBusy || !state.item) return;
  const sourceLang = state.item.sourceLang || 'auto';
  const targetLang = await loadReaderCurrentTargetLanguage();
  if (!sourceLang || sourceLang === 'auto') {
    setStatus('当前记录没有确定的原文语言，无法重新翻译。', 'err');
    return;
  }

  retranslateBusy = true;
  if (retranslateBtn) retranslateBtn.disabled = true;
  retranslateOptions.forEach((button) => { button.disabled = true; });
  setRetranslateMenuOpen(false);

  try {
    const providerId = await resolveReaderProviderId(engineId);
    const providerProfileKey = await resolveReaderProviderProfileKey(providerId);
    const variantKey = getReaderVariantKey(engineId, providerId, providerProfileKey, sourceLang, targetLang);
    const cached = state.item.translationVariants?.[variantKey];
    setStatus(cached ? '正在读取' + readerEngineLabel(engineId, providerId) + '缓存…' : '正在使用' + readerEngineLabel(engineId, providerId) + '重新翻译…', 'note');

    let variant = cached;
    if (!variant) {
      const structuredBlocks = getStructuredBlocks(state.item);
      const translatedBlocks = structuredBlocks ? await translateReaderBlocks(structuredBlocks, engineId, providerId, providerProfileKey, sourceLang, targetLang) : null;
      const translatedText = translatedBlocks
        ? translatedBlocks.map((block) => {
          if (block.type === 'list') return (block.items || []).map((item) => item.translatedText || '').join('\n');
          if (block.type === 'table') return (block.rows || []).map((row) => row.map((cell) => cell.translatedText || '').join(' | ')).join('\n');
          return block.translatedText || '';
        }).filter(Boolean).join('\n\n')
        : await translateReaderText(state.item.sourceText, engineId, providerId, providerProfileKey, sourceLang, targetLang);
      variant = { translatedText, structuredBlocks: translatedBlocks, engineId, engineStage: engineId, providerId, providerProfileKey, translatedAt: Date.now() };
    }

    const variants = { ...(state.item.translationVariants || {}), [variantKey]: variant };
    const keys = Object.keys(variants);
    while (keys.length > TRANSLATION_VARIANT_LIMIT) delete variants[keys.shift()];
    state.item = { ...state.item, translatedText: variant.translatedText, structuredBlocks: variant.structuredBlocks || state.item.structuredBlocks, engineId: variant.engineId || engineId, engineStage: variant.engineStage || engineId, providerId: variant.providerId || providerId, providerProfileKey: variant.providerProfileKey || providerProfileKey, translationVariants: variants, updatedAt: Date.now() };
    await persistReaderItem();
    renderMeta();
    renderContent();
    setStatus('已重新翻译，当前引擎：' + readerEngineLabel(engineId, providerId) + '。', 'ok');
  } catch (error) {
    setStatus('重新翻译失败：' + String(error?.message || error || ''), 'err');
  } finally {
    retranslateBusy = false;
    if (retranslateBtn) retranslateBtn.disabled = false;
    retranslateOptions.forEach((button) => { button.disabled = false; });
  }
}

function setStatus(message, kind = '') {
  if (!statusEl) return;
  statusEl.textContent = uiText(message);
  statusEl.dataset.kind = kind;
}

function setTocOpen(open) {
  tocOpen = Boolean(open);
  if (!tocPanel || !tocBackdrop) return;
  if (tocCloseTimer) {
    clearTimeout(tocCloseTimer);
    tocCloseTimer = null;
  }

  if (tocOpen) {
    tocPanel.hidden = false;
    tocBackdrop.hidden = false;
    tocPanel.setAttribute('aria-hidden', 'false');
    tocToggleBtn?.setAttribute('aria-expanded', 'true');
    tocToggleBtn?.setAttribute('title', '关闭目录');
    tocToggleBtn?.setAttribute('aria-label', '关闭目录');
    requestAnimationFrame(() => {
      if (!tocOpen) return;
      tocPanel.classList.add('is-open');
      tocBackdrop.classList.add('is-open');
    });
    return;
  }

  tocPanel.classList.remove('is-open');
  tocBackdrop.classList.remove('is-open');
  tocPanel.setAttribute('aria-hidden', 'true');
  tocToggleBtn?.setAttribute('aria-expanded', 'false');
  tocToggleBtn?.setAttribute('title', '打开目录');
  tocToggleBtn?.setAttribute('aria-label', '打开目录');
  tocCloseTimer = window.setTimeout(() => {
    if (tocOpen) return;
    tocPanel.hidden = true;
    tocBackdrop.hidden = true;
  }, 180);
}

function collectReferenceLinks(blocks) {
  const entries = [];
  const seen = new Set();
  const visit = (block) => {
    if (!block || typeof block !== 'object') return;
    for (const link of block.links || []) {
      const key = normalizeCitationKey(link?.citationKey);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      entries.push(link);
    }
    if (block.type === 'list') (block.items || []).forEach(visit);
    if (block.type === 'table') (block.rows || []).forEach((row) => row.forEach(visit));
  };
  (blocks || []).forEach(visit);
  return entries;
}

function renderTableOfContents(blocks) {
  if (!tocList) return;
  tocList.textContent = '';
  const headings = Array.isArray(blocks)
    ? blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block?.type === 'heading' && normalizeText(block.sourceText || block.translatedText))
    : [];
  const references = collectReferenceLinks(blocks);

  if (!headings.length && !references.length) {
    const empty = document.createElement('div');
    empty.className = 'toc-empty';
    empty.textContent = '当前记录没有可用目录。';
    tocList.appendChild(empty);
    return;
  }

  headings.forEach(({ block, index }) => {
    const entry = document.createElement('button');
    entry.type = 'button';
    entry.className = 'toc-entry';
    entry.dataset.level = String(Math.max(1, Math.min(6, Number(block.level) || 2)));
    entry.dataset.targetId = `reader-block-${index}`;
    entry.textContent = normalizeText(
      state.mode === 'source'
        ? block.sourceText
        : state.mode === 'translated'
          ? block.translatedText || block.sourceText
          : block.sourceText || block.translatedText
    );
    entry.addEventListener('click', () => {
      const target = document.getElementById(entry.dataset.targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTocOpen(false);
    });
    tocList.appendChild(entry);
  });

  if (references.length) {
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'toc-section-title';
    sectionTitle.textContent = '引用目录';
    tocList.appendChild(sectionTitle);
    references.forEach((link) => {
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = 'toc-entry toc-reference';
      entry.dataset.targetId = citationTargetId(link.citationKey);
      entry.textContent = `引用 ${link.citationKey}`;
      entry.title = normalizeText(link.text) || `引用 ${link.citationKey}`;
      entry.addEventListener('click', () => {
        const target = findReferenceTarget(link);
        if (!target) {
          setStatus(`当前页没有找到引用 ${link.citationKey}。`, 'note');
          return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('reader-link-target-highlight');
        window.setTimeout(() => target.classList.remove('reader-link-target-highlight'), 1200);
        setTocOpen(false);
      });
      tocList.appendChild(entry);
    });
  }
}

function setTheme(theme) {
  state.theme = VALID_THEMES.has(theme) ? theme : 'paper';
  document.body.dataset.theme = state.theme;
  themeButtons.forEach((button) => {
    const active = button.dataset.theme === state.theme;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  savePreferences();
}

function setFontFamily(fontFamily) {
  state.fontFamily = VALID_FONTS.has(fontFamily) ? fontFamily : 'serif';
  document.body.dataset.font = state.fontFamily;
  if (fontFamilySelect && fontFamilySelect.value !== state.fontFamily) fontFamilySelect.value = state.fontFamily;
  savePreferences();
}

function setMode(mode) {
  state.mode = VALID_MODES.has(mode) ? mode : 'dual';
  modeTabs.forEach((tab) => {
    const active = tab.dataset.mode === state.mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  renderContent();
  savePreferences();
}


function normalizeSearchText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function updateReaderSearchCount() {
  if (!readerSearchCount) return;
  readerSearchCount.textContent = readerSearchMatches.length
    ? `${readerSearchIndex + 1}/${readerSearchMatches.length}`
    : '0/0';
}

function applyReaderSearch() {
  const query = normalizeSearchText(readerSearchInput?.value);
  const candidates = Array.from(contentEl?.querySelectorAll('.reader-pair, .reader-single, .reader-structured-block, .reader-content section') || []);
  candidates.forEach((element) => element.classList.remove('reader-search-match', 'reader-search-current'));
  readerSearchMatches = query ? candidates.filter((element) => normalizeSearchText(element.textContent).includes(query)) : [];
  readerSearchIndex = readerSearchMatches.length ? Math.min(Math.max(readerSearchIndex, 0), readerSearchMatches.length - 1) : -1;
  if (readerSearchIndex >= 0) readerSearchMatches[readerSearchIndex].classList.add('reader-search-current');
  readerSearchMatches.forEach((element) => element.classList.add('reader-search-match'));
  updateReaderSearchCount();
}

function moveReaderSearch(delta) {
  if (!readerSearchMatches.length) return;
  readerSearchMatches[readerSearchIndex]?.classList.remove('reader-search-current');
  readerSearchIndex = (readerSearchIndex + delta + readerSearchMatches.length) % readerSearchMatches.length;
  const current = readerSearchMatches[readerSearchIndex];
  current.classList.add('reader-search-current');
  current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateReaderSearchCount();
}

function updateReaderProgress() {
  const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  if (readerProgressEl) readerProgressEl.textContent = `${Math.round(Math.min(1, Math.max(0, window.scrollY / maximum)) * 100)}%`;
  if (readerTopBtn) readerTopBtn.disabled = window.scrollY < 80;
}

async function saveReaderPosition() {
  if (!state.item?.id) return;
  try {
    const result = await chrome.storage.local.get([READER_POSITIONS_KEY]);
    const positions = result[READER_POSITIONS_KEY] && typeof result[READER_POSITIONS_KEY] === 'object' ? { ...result[READER_POSITIONS_KEY] } : {};
    positions[state.item.id] = { scrollY: Math.max(0, Math.round(window.scrollY)), updatedAt: Date.now() };
    const retained = Object.entries(positions).sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0)).slice(0, 100);
    await chrome.storage.local.set({ [READER_POSITIONS_KEY]: Object.fromEntries(retained) });
  } catch {}
}

function scheduleReaderPositionSave() {
  updateReaderProgress();
  if (!state.item?.id || readerPositionTimer) return;
  readerPositionTimer = window.setTimeout(() => {
    readerPositionTimer = null;
    void saveReaderPosition();
  }, 500);
}

function flushReaderPosition() {
  if (readerPositionTimer) {
    window.clearTimeout(readerPositionTimer);
    readerPositionTimer = null;
  }
  void saveReaderPosition();
}

async function restoreReaderPosition() {
  if (!state.item?.id) return;
  try {
    const result = await chrome.storage.local.get([READER_POSITIONS_KEY]);
    const y = Number(result[READER_POSITIONS_KEY]?.[state.item.id]?.scrollY || 0);
    if (y > 0) {
      const restore = () => window.scrollTo({ top: y, behavior: 'auto' });
      requestAnimationFrame(() => requestAnimationFrame(restore));
      window.setTimeout(restore, 120);
    }
  } catch {}
  updateReaderProgress();
}

function isSafeReaderProviderUrl(value, allowHttp) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol === 'https:') return true;
    if (url.protocol !== 'http:') return false;
    return Boolean(allowHttp) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

async function refreshRetranslateOptions() {
  let stored = {};
  try { stored = await chrome.storage.local.get([READER_PROVIDER_PROFILES_KEY, READER_PROVIDER_CREDENTIALS_KEY, READER_PROVIDER_ACTIVE_PROFILE_KEY]); } catch {}
  const profiles = stored[READER_PROVIDER_PROFILES_KEY] && typeof stored[READER_PROVIDER_PROFILES_KEY] === 'object' ? stored[READER_PROVIDER_PROFILES_KEY] : {};
  const credentials = stored[READER_PROVIDER_CREDENTIALS_KEY] && typeof stored[READER_PROVIDER_CREDENTIALS_KEY] === 'object' ? stored[READER_PROVIDER_CREDENTIALS_KEY] : {};
  const activeProfiles = stored[READER_PROVIDER_ACTIVE_PROFILE_KEY] && typeof stored[READER_PROVIDER_ACTIVE_PROFILE_KEY] === 'object' ? stored[READER_PROVIDER_ACTIVE_PROFILE_KEY] : {};
  for (const button of retranslateOptions) {
    const engine = button.dataset.engine;
    if (engine === 'local') { button.disabled = false; button.title = '使用浏览器本地 Translator API'; continue; }
    const providerId = await resolveReaderProviderId(engine);
    const profileStorageKey = activeProfiles[providerId] || '';
    const profile = profileStorageKey
      ? { ...(profiles[profileStorageKey] || {}), ...(credentials[profileStorageKey] || {}) }
      : { ...(profiles[providerId] || {}), ...(credentials[providerId] || {}) };
    const rules = READER_PROVIDER_REQUIREMENTS[providerId] || { needsKey: true, llm: engine === 'llm' };
    const explicitEndpoint = String(profile.baseUrl || '').trim();
    const needsExplicitModel = providerId === 'custom';
    const configured = (!rules.needsKey || Boolean(String(profile.apiKey || '').trim()))
      && (!rules.credentials || (Boolean(String(profile.appId || '').trim()) && Boolean(String(profile.appSecret || '').trim())))
      && (!needsExplicitModel || Boolean(String(profile.model || '').trim()))
      && (!explicitEndpoint || isSafeReaderProviderUrl(explicitEndpoint, rules.allowHttp));
    button.disabled = !configured;
    button.title = configured
      ? `使用 ${readerEngineLabel(engine, providerId)} 重新翻译`
      : '尚未配置，请从工具栏打开 Anwara Translator → 设置';
  }
}

function renderContent() {
  if (!contentEl) return;
  contentEl.textContent = '';
  renderTableOfContents([]);
  if (!state.item) {
    const empty = document.createElement('div');
    empty.className = 'reader-empty';
    empty.textContent = '没有找到这条历史翻译。';
    contentEl.appendChild(empty);
    return;
  }

  const structuredBlocks = getStructuredBlocks(state.item);
  if (structuredBlocks) {
    setStatus(`已保留 ${structuredBlocks.length} 个结构块；译文按原文结构显示。`, 'ok');
    structuredBlocks.forEach((block, index) => {
      const element = renderStructuredBlock(block);
      element.id = `reader-block-${index}`;
      decorateSourceAnchorTarget(element, block);
      contentEl.appendChild(element);
      decorateRenderedCitations(element, block);
    });
    renderTableOfContents(structuredBlocks);
    applyReaderSearch();
    return;
  }

  const { aligned, pairs } = getPairs(state.item);
  setStatus(
    aligned
      ? '已按句子启发式对齐；原文和译文来自同一条历史记录。'
      : '当前记录无法可靠逐句对齐，已退回整段双语显示。',
    aligned ? 'ok' : 'note'
  );

  pairs.forEach((pair) => {
    if (state.mode === 'dual') {
      const block = document.createElement('section');
      block.className = 'reader-pair';
      appendTextBlocks(block, 'reader-source', pair.source);
      appendTextBlocks(block, 'reader-translated', pair.translated);
      contentEl.appendChild(block);
      return;
    }

    const block = document.createElement('section');
    block.className = 'reader-single';
    appendTextBlocks(block, state.mode === 'source' ? 'reader-source' : 'reader-translated', state.mode === 'source' ? pair.source : pair.translated);
    contentEl.appendChild(block);
  });
  applyReaderSearch();
}

function renderMeta() {
  if (!state.item) return;
  const item = state.item;
  const title = item.pageTitle || item.pageUrl || '未命名记录';
  if (titleEl) titleEl.textContent = title;
  if (sourceLinkEl) {
    const validUrl = /^https?:\/\//i.test(item.pageUrl || '');
    sourceLinkEl.textContent = validUrl ? item.pageUrl : '';
    sourceLinkEl.href = validUrl ? item.pageUrl : '#';
    sourceLinkEl.hidden = !validUrl;
  }
  if (metaEl) {
    const engine = readerEngineLabel(item.engineId || (item.engineStage === 'online' ? 'online' : item.engineStage === 'llm' ? 'llm' : 'local'), item.providerId);
    metaEl.textContent = `${formatTime(item.createdAt)} · ${languageLabel(item.sourceLang)} → ${languageLabel(item.targetLang)} · ${engine}`;
  }
}

function applyFontSize() {
  state.fontSize = Math.max(14, Math.min(30, Number(state.fontSize) || 18));
  if (contentEl) contentEl.style.fontSize = `${state.fontSize}px`;
  if (fontSizeLabelEl) fontSizeLabelEl.textContent = String(state.fontSize);
}

async function loadPreferences() {
  try {
    const result = await chrome.storage.local.get([READER_PREFS_KEY]);
    const prefs = result[READER_PREFS_KEY] || {};
    if (VALID_MODES.has(prefs.mode)) state.mode = prefs.mode;
    if (VALID_THEMES.has(prefs.theme)) state.theme = prefs.theme;
    if (VALID_FONTS.has(prefs.fontFamily)) state.fontFamily = prefs.fontFamily;
    if (Number.isFinite(prefs.fontSize)) state.fontSize = prefs.fontSize;
  } catch {}
  setTheme(state.theme);
  setFontFamily(state.fontFamily);
  modeTabs.forEach((tab) => {
    const active = tab.dataset.mode === state.mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  applyFontSize();
}

function savePreferences() {
  chrome.storage.local.set({
    [READER_PREFS_KEY]: {
      mode: state.mode,
      theme: state.theme,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize
    }
  }).catch(() => {});
}

async function loadHistoryItem() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    titleEl.textContent = '没有指定历史记录';
    setStatus('请从历史翻译列表打开一条记录。', 'err');
    renderContent();
    return;
  }

  try {
    const [result, sessionResult] = await Promise.all([
      chrome.storage.local.get([HISTORY_KEY, READING_KEY, VARIANTS_KEY]),
      chrome.storage.session?.get([READER_DRAFTS_KEY]) || Promise.resolve({})
    ]);
    const history = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
    const readingItems = Array.isArray(result[READING_KEY]) ? result[READING_KEY] : [];
    const drafts = sessionResult[READER_DRAFTS_KEY] && typeof sessionResult[READER_DRAFTS_KEY] === 'object'
      ? sessionResult[READER_DRAFTS_KEY]
      : {};
    const storedItem = drafts[id]
      ? { ...drafts[id], readerDraftMode: 'transient-reader' }
      : readingItems.find((item) => item?.id === id) || history.find((item) => item?.id === id) || null;
    const variantsStore = result[VARIANTS_KEY] && typeof result[VARIANTS_KEY] === 'object' ? result[VARIANTS_KEY] : {};
    const legacyVariants = storedItem?.translationVariants && typeof storedItem.translationVariants === 'object'
      ? storedItem.translationVariants
      : {};
    const externalVariants = variantsStore[id] && typeof variantsStore[id] === 'object' ? variantsStore[id] : {};
    state.item = storedItem
      ? { ...storedItem, translationVariants: { ...legacyVariants, ...externalVariants } }
      : null;
    if (!state.item) {
      titleEl.textContent = '历史记录不存在';
      setStatus('这条记录可能已被清理。', 'err');
    } else {
      // Migrate old records once, removing embedded variants from both copies.
      if (Object.keys(legacyVariants).length && !Object.keys(externalVariants).length) await persistReaderItem();
      renderMeta();
      updateReaderReadingButton();
    }
    renderContent();
  } catch (error) {
    titleEl.textContent = '读取历史记录失败';
    setStatus(`无法读取本地历史：${String(error?.message || error)}`, 'err');
    renderContent();
  }
}

async function runPendingReaderTranslation() {
  const engineId = String(state.item?.pendingTranslationEngineId || '');
  if (!['local', 'online', 'llm'].includes(engineId)) return;

  const { pendingTranslationEngineId, ...readyItem } = state.item;
  state.item = readyItem;
  await persistReaderItem();
  await retranslateCurrentItem(engineId);
}

async function copyTranslated() {
  if (!state.item) return;
  const text = normalizeText(state.item.translatedText);
  try {
    await navigator.clipboard.writeText(text);
    setStatus('译文已复制。', 'ok');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    setStatus('译文已复制。', 'ok');
  }
}

let closeRequested = false;
async function closeReader() {
  if (closeRequested) return;
  closeRequested = true;
  await saveReaderPosition();
  try {
    chrome.runtime.sendMessage({ type: 'CLOSE_READER_TAB' }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) window.close();
    });
    setTimeout(() => window.close(), 700);
  } catch {
    window.close();
  }
}

themeButtons.forEach((button) => {
  button.addEventListener('click', () => setTheme(button.dataset.theme));
});
fontFamilySelect?.addEventListener('change', (event) => setFontFamily(event.target.value));
modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});
document.getElementById('fontDecreaseBtn')?.addEventListener('click', () => {
  state.fontSize -= 1;
  applyFontSize();
  savePreferences();
});
document.getElementById('fontIncreaseBtn')?.addEventListener('click', () => {
  state.fontSize += 1;
  applyFontSize();
  savePreferences();
});
document.getElementById('copyTranslatedBtn')?.addEventListener('click', copyTranslated);
readerReadingBtn?.addEventListener('click', () => void toggleReaderReadingArea());
document.getElementById('closeReaderBtn')?.addEventListener('click', closeReader);
retranslateBtn?.addEventListener('click', async () => {
  await refreshRetranslateOptions();
  setRetranslateMenuOpen(retranslateMenu?.hidden);
});
retranslateOptions.forEach((button) => {
  button.addEventListener('click', () => retranslateCurrentItem(button.dataset.engine));
});
document.addEventListener('pointerdown', (event) => {
  if (!retranslateMenu?.hidden && !retranslateMenu.contains(event.target) && event.target !== retranslateBtn) setRetranslateMenuOpen(false);
});
readerBackBtn?.addEventListener('click', returnToReaderPosition);
readerSearchInput?.addEventListener('input', () => { readerSearchIndex = 0; applyReaderSearch(); });
readerSearchInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); moveReaderSearch(event.shiftKey ? -1 : 1); }
});
readerSearchPrevBtn?.addEventListener('click', () => moveReaderSearch(-1));
readerSearchNextBtn?.addEventListener('click', () => moveReaderSearch(1));
readerTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', scheduleReaderPositionSave, { passive: true });
window.addEventListener('pagehide', flushReaderPosition);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushReaderPosition();
});
updateReaderBackButton();
tocToggleBtn?.addEventListener('click', () => setTocOpen(!tocOpen));
tocCloseBtn?.addEventListener('click', () => setTocOpen(false));
tocBackdrop?.addEventListener('click', () => setTocOpen(false));
tocList?.addEventListener('wheel', (event) => {
  const maxScrollTop = tocList.scrollHeight - tocList.clientHeight;
  const atTop = tocList.scrollTop <= 0 && event.deltaY < 0;
  const atBottom = tocList.scrollTop >= maxScrollTop - 1 && event.deltaY > 0;
  if (maxScrollTop <= 0 || atTop || atBottom) event.preventDefault();
}, { passive: false });
tocPanel?.addEventListener('wheel', (event) => {
  if (!event.target.closest?.('.toc-list')) event.preventDefault();
}, { passive: false });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && tocOpen) setTocOpen(false);
});

(async function init() {
  await loadPreferences();
  await loadHistoryItem();
  await refreshRetranslateOptions();
  await runPendingReaderTranslation();
  await restoreReaderPosition();
})();

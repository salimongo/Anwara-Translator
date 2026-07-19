// popup.js - MV3 popup script using Translator and LanguageDetector APIs

const uiMessage = (key, fallback, substitutions) => {
  try {
    return globalThis.AnwaraI18n?.t(key, fallback, substitutions) || fallback || key;
  } catch {
    return fallback || key;
  }
};
const uiText = (value) => globalThis.AnwaraI18n?.text(value) || value;

const sourceSelect = document.getElementById("sourceLang");
const targetSelect = document.getElementById("targetLang");
const inputEl = document.getElementById("inputText");
const outputEl = document.getElementById("output");
const charCountEl = document.getElementById("charCount");
const clearInputBtn = document.getElementById('clearInputBtn');

const statusEl = document.getElementById("status");
const translateBtn = document.getElementById("translateBtn");
const swapBtn = document.getElementById("swapBtn");
const copyBtn = document.getElementById("copyBtn");
const speakBtn = document.getElementById("speakBtn");
const autoToggle = document.getElementById("autoToggle");
const selectionToggle = document.getElementById("selectionToggle");
const floatingToggle = document.getElementById("floatingToggle");
const selectionBilingualToggle = document.getElementById("selectionBilingualToggle");
const selectionSourceToggle = document.getElementById("selectionSourceToggle");
const autoToggleStatus = document.getElementById("autoToggleStatus");
const selectionToggleStatus = document.getElementById("selectionToggleStatus");
const floatingToggleStatus = document.getElementById("floatingToggleStatus");
const selectionBilingualToggleStatus = document.getElementById("selectionBilingualToggleStatus");
const selectionSourceToggleStatus = document.getElementById("selectionSourceToggleStatus");
const sameLanguageModeSelect = document.getElementById('sameLanguageModeSelect');
const sameLanguageModeStatus = document.getElementById('sameLanguageModeStatus');
const defaultEngineSelect = document.getElementById('defaultEngineSelect');
const defaultEngineStatus = document.getElementById('defaultEngineStatus');
const setSiteEngineBtn = document.getElementById('setSiteEngineBtn');
const clearSiteEngineBtn = document.getElementById('clearSiteEngineBtn');
const engineScopeStatus = document.getElementById('engineScopeStatus');
const llmBaseUrlInput = document.getElementById('llmBaseUrl');
const llmModelInput = document.getElementById('llmModel');
const llmApiKeyInput = document.getElementById('llmApiKey');
const saveLlmProfileBtn = document.getElementById('saveLlmProfileBtn');
const llmProfileStatus = document.getElementById('llmProfileStatus');
const providerStageSelect = document.getElementById('providerStageSelect');
const providerSelect = document.getElementById('providerSelect');
const providerBaseUrlInput = document.getElementById('providerBaseUrl');
const providerApiKeyInput = document.getElementById('providerApiKey');
const providerModelInput = document.getElementById('providerModel');
const providerRegionInput = document.getElementById('providerRegion');
const providerAppIdInput = document.getElementById('providerAppId');
const providerAppSecretInput = document.getElementById('providerAppSecret');
const providerSystemPromptInput = document.getElementById('providerSystemPrompt');
const providerUserPromptInput = document.getElementById('providerUserPrompt');
const providerCredentialHint = document.getElementById('providerCredentialHint');
const saveProviderProfileBtn = document.getElementById('saveProviderProfileBtn');
const testProviderBtn = document.getElementById('testProviderBtn');
const providerProfileStatus = document.getElementById('providerProfileStatus');

const SELECTION_SHOW_BILINGUAL_KEY = 'translatorSelectionShowBilingual';
const SELECTION_SHOW_SOURCE_KEY = 'translatorSelectionShowSource';
const SAME_LANGUAGE_MODE_KEY = 'translatorSameLanguageMode';
const TRANSLATION_ENGINE_KEY = 'translatorDefaultEngine';
const TRANSLATION_SITE_ENGINES_KEY = 'translatorSiteDefaultEngines';
const TRANSLATION_ENGINE_LOCAL = 'local';
const LLM_PROFILE_KEY = 'translatorLlmProfile';
const PROVIDER_PROFILES_KEY = 'translatorProviderProfiles';
const ONLINE_PROVIDER_KEY = 'translatorOnlineProvider';
const LLM_PROVIDER_KEY = 'translatorLlmProvider';

const PROVIDER_DEFINITIONS = [
  { id: 'google', stage: 'online', label: 'Google Cloud 翻译', baseUrl: 'https://translation.googleapis.com/language/translate/v2', needsKey: true, credentialUrl: 'https://console.cloud.google.com/apis/credentials', credentialLabel: '获取 Google Cloud API Key' },
  { id: 'microsoft', stage: 'online', label: 'Microsoft 翻译', baseUrl: 'https://api.cognitive.microsofttranslator.com/translate', needsKey: true, region: true, credentialUrl: 'https://learn.microsoft.com/azure/ai-services/translator/how-to/create-translator-resource', credentialLabel: '创建 Translator 资源并获取 Key' },
  { id: 'deepl', stage: 'online', label: 'DeepL', baseUrl: 'https://api-free.deepl.com/v2/translate', needsKey: true, credentialUrl: 'https://developers.deepl.com/docs/getting-started/managing-api-keys', credentialLabel: '管理 DeepL API Key' },
  { id: 'deeplx', stage: 'online', label: 'DeepLX', baseUrl: 'http://localhost:1188/translate', needsKey: false, allowHttp: true, credentialNote: '无需 Key：请先启动本地 DeepLX 服务' },
  { id: 'xiaoniu', stage: 'online', label: '小牛翻译', baseUrl: 'https://api.niutrans.com/NiuTransServer/translation', needsKey: true, credentialUrl: 'https://niutrans.com/', credentialLabel: '前往小牛翻译平台获取 Key' },
  { id: 'youdao', stage: 'online', label: '有道翻译', baseUrl: 'https://openapi.youdao.com/api', credentials: true, credentialUrl: 'https://ai.youdao.com/', credentialLabel: '前往有道智云申请应用凭证' },
  { id: 'tencent', stage: 'online', label: '腾讯云翻译', baseUrl: 'https://tmt.tencentcloudapi.com/', credentials: true, region: true, credentialUrl: 'https://console.cloud.tencent.com/cam/capi', credentialLabel: '前往腾讯云获取 SecretId / SecretKey' },
  { id: 'openai', stage: 'llm', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1/chat/completions', needsKey: true, model: 'gpt-4o-mini' },
  { id: 'deepseek', stage: 'llm', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/chat/completions', needsKey: true, model: 'deepseek-chat' },
  { id: 'tongyi', stage: 'llm', label: '阿里通义', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', needsKey: true, model: 'qwen-plus' },
  { id: 'zhipu', stage: 'llm', label: '智谱清言', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', needsKey: true, model: 'glm-4-flash' },
  { id: 'moonshot', stage: 'llm', label: 'Kimi / Moonshot', baseUrl: 'https://api.moonshot.cn/v1/chat/completions', needsKey: true, model: 'moonshot-v1-8k' },
  { id: 'baichuan', stage: 'llm', label: '百川智能', baseUrl: 'https://api.baichuan-ai.com/v1/chat/completions', needsKey: true, model: 'Baichuan4-Air' },
  { id: 'lingyi', stage: 'llm', label: '零一万物', baseUrl: 'https://api.lingyiwanwu.com/v1/chat/completions', needsKey: true, model: 'yi-lightning' },
  { id: 'stepfun', stage: 'llm', label: '阶跃星辰', baseUrl: 'https://api.stepfun.com/v1/chat/completions', needsKey: true, model: 'step-1-8k' },
  { id: 'hunyuan', stage: 'llm', label: '腾讯混元', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', needsKey: true, model: 'hunyuan-turbos-latest' },
  { id: 'doubao', stage: 'llm', label: '字节豆包', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', needsKey: true, model: '' },
  { id: 'infini', stage: 'llm', label: '无问芯穹', baseUrl: 'https://cloud.infini-ai.com/maas/v1/chat/completions', needsKey: true, model: 'qwen2.5-14b-instruct' },
  { id: 'siliconflow', stage: 'llm', label: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1/chat/completions', needsKey: true, model: 'Qwen/Qwen2.5-7B-Instruct' },
  { id: 'openrouter', stage: 'llm', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1/chat/completions', needsKey: true, model: 'openai/gpt-4o-mini' },
  { id: 'groq', stage: 'llm', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1/chat/completions', needsKey: true, model: 'llama-3.3-70b-versatile' },
  { id: 'xai', stage: 'llm', label: 'Grok / xAI', baseUrl: 'https://api.x.ai/v1/chat/completions', needsKey: true, model: 'grok-3-mini' },
  { id: 'gemini', stage: 'llm', label: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com', needsKey: true, model: 'gemini-2.5-flash' },
  { id: 'claude', stage: 'llm', label: 'Claude', baseUrl: 'https://api.anthropic.com/v1/messages', needsKey: true, model: 'claude-3-5-haiku-latest' },
  { id: 'newapi', stage: 'llm', label: 'New API / 聚合接口', baseUrl: 'http://localhost:3000/v1/chat/completions', needsKey: true, model: 'gpt-4o-mini', allowHttp: true },
  { id: 'custom', stage: 'llm', label: '自定义 OpenAI 兼容接口', baseUrl: 'http://localhost:11434/v1/chat/completions', needsKey: false, model: 'llama3.2', allowHttp: true }
];
let providerProfiles = {};
let activeOnlineProvider = 'google';
let activeLlmProvider = 'openai';
let pendingGlobalEngineSelection = null;
let lastGlobalEngine = TRANSLATION_ENGINE_LOCAL;

const manualPageBtn = document.getElementById("manualPageBtn");
const structuredPageBtn = document.getElementById("structuredPageBtn");
const restorePageBtn = document.getElementById("restorePageBtn");
const feedbackBtn = document.getElementById("feedbackBtn");
const emailFeedbackBtn = document.getElementById("emailFeedbackBtn");

// 白名单相关元素
const whitelistInput = document.getElementById("whitelistInput");
const addWhitelistBtn = document.getElementById("addWhitelistBtn");
const addCurrentPageBtn = document.getElementById("addCurrentPageBtn");
const whitelistContainer = document.getElementById("whitelistContainer");
const whitelistCount = document.getElementById("whitelistCount");
const emptyWhitelist = document.getElementById("emptyWhitelist");


const downloadSection = document.getElementById("downloadSection");
const historyEnabledToggle = document.getElementById('historyEnabledToggle');
const autoReadingToggle = document.getElementById('autoReadingToggle');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const historyManageBtn = document.getElementById('historyManageBtn');
const historyTools = document.getElementById('historyTools');
const historyViewSelect = document.getElementById('historyViewSelect');
const historySelectAllBtn = document.getElementById('historySelectAllBtn');
const historyFromDate = document.getElementById('historyFromDate');
const historyToDate = document.getElementById('historyToDate');
const deleteSelectedHistoryBtn = document.getElementById('deleteSelectedHistoryBtn');
const deleteDateHistoryBtn = document.getElementById('deleteDateHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyStatus = document.getElementById('historyStatus');
const historyList = document.getElementById('historyList');
const HISTORY_KEY = 'translatorHistory';
const READING_KEY = 'translatorReadingArea';
const VARIANTS_KEY = 'translatorTranslationVariants';
const HISTORY_ENABLED_KEY = 'translatorHistoryEnabled';
const AUTO_READING_KEY = 'translatorAutoAddToReading';
let historyItems = [];
let readingItems = [];
let historyLoaded = false;
let historyLoadPromise = null;
let historyRenderLimit = 40;
const HISTORY_RENDER_BATCH = 40;

function normalizeStoredItems(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim()
  ));
}

const archiveTabs = Array.from(document.querySelectorAll('.archive-tab'));
const readerModeTabs = Array.from(document.querySelectorAll('.reader-mode-tab'));
const historySection = document.getElementById('historySection');
const readerSection = document.getElementById('readerSection');
const readerBackBtn = document.getElementById('readerBackBtn');
const readerTitle = document.getElementById('readerTitle');
const readerContent = document.getElementById('readerContent');
const readerAlignmentStatus = document.getElementById('readerAlignmentStatus');
const readerFontDecreaseBtn = document.getElementById('readerFontDecreaseBtn');
const readerFontIncreaseBtn = document.getElementById('readerFontIncreaseBtn');
const readerFontSizeLabel = document.getElementById('readerFontSizeLabel');
let activeReaderItem = null;
let readerReturnView = 'reading';
let readerFontSize = 17;
let readerMode = 'dual';

function syncArchiveTabs(view) {
  const activeView = view === 'reading' ? 'reading' : 'all';
  if (historyViewSelect) historyViewSelect.value = activeView;
  archiveTabs.forEach((tab) => {
    const isActive = tab.dataset.historyView === activeView;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  if (clearHistoryBtn) clearHistoryBtn.textContent = activeView === 'reading'
    ? uiMessage('clearReading', '清空阅读区')
    : uiMessage('clearHistory', '清空历史');
}

function setHistoryToolsOpen(open) {
  const isOpen = Boolean(open);
  historyTools?.classList.toggle('hidden', !isOpen);
  historyManageBtn?.setAttribute('aria-expanded', String(isOpen));
  if (historyManageBtn) historyManageBtn.textContent = isOpen ? '收起' : '管理';
}

function splitReaderUnits(text) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];
  return normalized
    .split(/\n+|(?<=[。！？!?；;])\s*|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getReaderPairs(item) {
  const sourceUnits = splitReaderUnits(item.sourceText);
  const translatedUnits = splitReaderUnits(item.translatedText);
  const aligned = sourceUnits.length > 1 && sourceUnits.length === translatedUnits.length;
  if (aligned) {
    return {
      aligned: true,
      pairs: sourceUnits.map((source, index) => ({ source, translated: translatedUnits[index] }))
    };
  }
  return {
    aligned: false,
    pairs: [{ source: String(item.sourceText || '').trim(), translated: String(item.translatedText || '').trim() }]
  };
}

function renderReaderContent() {
  if (!activeReaderItem || !readerContent) return;
  const { aligned, pairs } = getReaderPairs(activeReaderItem);
  readerContent.textContent = '';
  readerContent.style.fontSize = `${readerFontSize}px`;
  if (readerFontSizeLabel) readerFontSizeLabel.textContent = String(readerFontSize);
  if (readerAlignmentStatus) {
    readerAlignmentStatus.textContent = aligned
      ? '已按句子启发式对齐；原文和译文来自同一条历史记录。'
      : '当前记录无法可靠逐句对齐，已退回整段双语显示。';
  }

  for (const pair of pairs) {
    if (readerMode === 'dual') {
      const block = document.createElement('div');
      block.className = 'reader-pair';
      const source = document.createElement('div');
      source.className = 'reader-source';
      source.textContent = pair.source;
      const translated = document.createElement('div');
      translated.className = 'reader-translated';
      translated.textContent = pair.translated;
      block.appendChild(source);
      block.appendChild(translated);
      readerContent.appendChild(block);
    } else {
      const block = document.createElement('div');
      block.className = 'reader-single';
      block.textContent = readerMode === 'source' ? pair.source : pair.translated;
      readerContent.appendChild(block);
    }
  }
}

function openInlineReader(item, returnView = historyViewSelect?.value || 'reading') {
  activeReaderItem = item;
  readerReturnView = returnView === 'all' ? 'all' : 'reading';
  syncArchiveTabs('reading');
  if (historySection) historySection.classList.add('reader-open');
  readerSection?.classList.remove('hidden');
  if (readerTitle) readerTitle.textContent = item.pageTitle || item.pageUrl || '未命名记录';
  if (readerBackBtn) readerBackBtn.textContent = readerReturnView === 'all' ? '返回历史' : '返回阅读区';
  renderReaderContent();
  readerSection?.scrollIntoView?.({ block: 'nearest' });
}

function openReader(item, returnView = historyViewSelect?.value || 'reading') {
  if (!item?.id || !chrome?.tabs?.create) {
    openInlineReader(item, returnView);
    return;
  }

  const readerUrl = chrome.runtime.getURL(`reader.html?id=${encodeURIComponent(item.id)}`);
  chrome.tabs.create({ url: readerUrl }, () => {
    if (chrome.runtime.lastError) openInlineReader(item, returnView);
  });
}

function closeReader() {
  activeReaderItem = null;
  setHistoryToolsOpen(false);
  historySection?.classList.remove('reader-open');
  readerSection?.classList.add('hidden');
  if (readerContent) readerContent.textContent = '';
}

function closeReaderAndReturn() {
  const returnView = readerReturnView;
  closeReader();
  setHistoryView(returnView);
}

function setHistoryView(view) {
  closeReader();
  syncArchiveTabs(view);
  renderHistoryList();
}

function setReaderMode(mode) {
  readerMode = ['dual', 'source', 'translated'].includes(mode) ? mode : 'dual';
  readerModeTabs.forEach((tab) => {
    const isActive = tab.dataset.readerMode === readerMode;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  renderReaderContent();
}

function adjustReaderFont(delta) {
  readerFontSize = Math.max(13, Math.min(28, readerFontSize + delta));
  renderReaderContent();
}

function setHistoryStatus(message, kind = '') {
  if (!historyStatus) return;
  historyStatus.textContent = uiText(message);
  historyStatus.style.color = kind === 'err' ? '#b91c1c' : kind === 'ok' ? '#047857' : 'var(--muted)';
}

function formatHistoryTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function getFilteredHistoryItems() {
  const sourceItems = getActiveArchiveItems();
  const from = historyFromDate?.value ? new Date(`${historyFromDate.value}T00:00:00`).getTime() : null;
  const to = historyToDate?.value ? new Date(`${historyToDate.value}T23:59:59.999`).getTime() : null;
  return sourceItems.filter((item) => {
    if (from !== null && item.createdAt < from) return false;
    if (to !== null && item.createdAt > to) return false;
    return true;
  });
}

function getActiveArchiveView() {
  return historyViewSelect?.value === 'reading' ? 'reading' : 'all';
}

function getActiveArchiveItems() {
  return getActiveArchiveView() === 'reading' ? readingItems : historyItems;
}

function getActiveArchiveLabel() {
  return getActiveArchiveView() === 'reading' ? '阅读区' : '历史翻译';
}

function createHistoryButton(label, action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'history-action btn';
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  button.style.cssText = 'width:auto;padding:4px 6px;font-size:10px;background:#fff;border:1px solid #dbe2ea;color:#475569;border-radius:6px;white-space:nowrap;';
  return button;
}

function renderHistoryList(options = {}) {
  if (!historyList) return;
  if (!options.preserveLimit) historyRenderLimit = HISTORY_RENDER_BATCH;
  historyList.textContent = '';
  const visibleItems = getFilteredHistoryItems();
  if (!visibleItems.length) {
    const empty = document.createElement('div');
    empty.className = 'small';
    empty.textContent = `暂无符合条件的${getActiveArchiveLabel()}记录`;
    empty.style.cssText = 'padding:14px;text-align:center;color:var(--muted);';
    historyList.appendChild(empty);
    setHistoryStatus(`共 ${getActiveArchiveItems().length} 条${getActiveArchiveLabel()}记录`);
    return;
  }

  const itemsToRender = visibleItems.slice(0, historyRenderLimit);
  const fragment = document.createDocumentFragment();
  for (const item of itemsToRender) {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.style.cssText = 'padding:8px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;';

    const header = document.createElement('div');
    header.className = 'history-card-header';
    header.style.cssText = 'display:flex;align-items:flex-start;gap:6px;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'history-select';
    checkbox.dataset.id = item.id;
    checkbox.style.cssText = 'margin-top:3px;';
    header.appendChild(checkbox);

    const body = document.createElement('div');
    body.className = 'history-card-body';
    body.style.cssText = 'min-width:0;flex:1;';
    const source = document.createElement('div');
    source.className = 'history-card-source';
    source.textContent = truncateHistoryPreview(item.sourceText);
    source.title = '展开阅读可查看完整原文';
    source.style.cssText = 'font-size:11px;line-height:1.4;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere;max-height:58px;overflow:auto;';
    const translated = document.createElement('div');
    translated.className = 'history-card-translated';
    translated.textContent = truncateHistoryPreview(item.translatedText);
    translated.title = '展开阅读可查看完整译文';
    translated.style.cssText = 'margin-top:4px;font-size:11px;line-height:1.45;color:#0f766e;white-space:pre-wrap;overflow-wrap:anywhere;max-height:72px;overflow:auto;';
    const meta = document.createElement('div');
    meta.className = 'history-card-meta';
    const inReadingArea = isInReadingArea(item.id);
    meta.textContent = `${formatHistoryTime(item.createdAt)} · ${item.pageTitle || item.pageUrl || ''}${inReadingArea ? ' · 阅读区' : ''}`;
    meta.style.cssText = 'margin-top:5px;font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    body.appendChild(source);
    body.appendChild(translated);
    body.appendChild(meta);
    header.appendChild(body);
    card.appendChild(header);

    const actions = document.createElement('div');
    actions.className = 'history-card-actions';
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:5px;margin-top:6px;';
    actions.appendChild(createHistoryButton(inReadingArea ? '移出阅读区' : '加入阅读区', 'reading', item.id));
    actions.appendChild(createHistoryButton('展开阅读', 'reader', item.id));
    actions.appendChild(createHistoryButton('删除', 'delete', item.id));
    card.appendChild(actions);
    fragment.appendChild(card);
  }
  historyList.appendChild(fragment);
  if (visibleItems.length > itemsToRender.length) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'history-load-more btn';
    more.dataset.action = 'more';
    more.textContent = `加载更多（已显示 ${itemsToRender.length}/${visibleItems.length}）`;
    more.style.cssText = 'width:100%;margin-top:6px;padding:7px;font-size:10px;background:#25252a;border:1px solid #4a4a50;color:#a9d9ff;border-radius:6px;';
    historyList.appendChild(more);
  }
  setHistoryStatus(`显示 ${itemsToRender.length}/${visibleItems.length} 条，共 ${getActiveArchiveItems().length} 条${getActiveArchiveLabel()}记录`);
}

function isInReadingArea(id) {
  return Boolean(id) && readingItems.some((item) => item?.id === id);
}

async function loadHistoryState(options = {}) {
  if (historyLoaded && !options.force) return;
  if (historyLoadPromise && !options.force) return historyLoadPromise;
  historyLoadPromise = (async () => {
    try {
      const result = await chrome.storage.local.get([HISTORY_KEY, READING_KEY, HISTORY_ENABLED_KEY, AUTO_READING_KEY]);
      historyItems = normalizeStoredItems(result[HISTORY_KEY]);
      const hasReadingStore = Array.isArray(result[READING_KEY]);
      readingItems = hasReadingStore
        ? normalizeStoredItems(result[READING_KEY])
        : historyItems.filter((item) => item?.inReadingArea === true).map((item) => ({ ...item, inReadingArea: true }));
      if (!hasReadingStore) {
        await chrome.storage.local.set({ [READING_KEY]: readingItems });
      }
      historyLoaded = true;
      if (historyEnabledToggle) historyEnabledToggle.checked = result[HISTORY_ENABLED_KEY] !== false;
      if (autoReadingToggle) autoReadingToggle.checked = result[AUTO_READING_KEY] === true;
      renderHistoryList();
    } catch (e) {
      historyItems = [];
      readingItems = [];
      historyLoaded = true;
      renderHistoryList();
      setHistoryStatus('历史记录读取失败', 'err');
    }
  })();
  try {
    await historyLoadPromise;
  } finally {
    historyLoadPromise = null;
  }
}

async function saveHistoryItems() {
  historyItems = normalizeStoredItems(historyItems);
  await chrome.storage.local.set({ [HISTORY_KEY]: historyItems });
  await pruneTranslationVariants();
  if (historyLoaded) renderHistoryList();
}

async function saveReadingItems() {
  readingItems = normalizeStoredItems(readingItems);
  await chrome.storage.local.set({ [READING_KEY]: readingItems });
  await pruneTranslationVariants();
  if (historyLoaded) renderHistoryList();
}

async function pruneTranslationVariants() {
  try {
    const result = await chrome.storage.local.get([HISTORY_KEY, READING_KEY, VARIANTS_KEY]);
    const variants = result[VARIANTS_KEY] && typeof result[VARIANTS_KEY] === 'object' ? result[VARIANTS_KEY] : {};
    const liveIds = new Set([
      ...(Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : []),
      ...(Array.isArray(result[READING_KEY]) ? result[READING_KEY] : [])
    ].map((item) => item?.id).filter(Boolean));
    const next = Object.fromEntries(Object.entries(variants).filter(([id]) => liveIds.has(id)));
    if (Object.keys(next).length !== Object.keys(variants).length) {
      await chrome.storage.local.set({ [VARIANTS_KEY]: next });
    }
  } catch (error) {
    console.warn('清理孤立翻译缓存失败:', error);
  }
}

async function recordManualTranslationHistory(sourceText, translatedText, sourceLang, targetLang, metadata = {}) {
  try {
    const settings = await chrome.storage.local.get([HISTORY_ENABLED_KEY, AUTO_READING_KEY]);
    if (settings[HISTORY_ENABLED_KEY] === false) return;
    const result = await chrome.storage.local.get([HISTORY_KEY, READING_KEY]);
    const stored = normalizeStoredItems(result[HISTORY_KEY]);
    const storedReading = normalizeStoredItems(result[READING_KEY]);
    const item = {
      id: `translation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceText: String(sourceText || '').replace(/\r\n?/g, '\n'),
      translatedText: String(translatedText || '').replace(/\r\n?/g, '\n'),
      sourceLang: sourceLang || 'auto',
      targetLang: targetLang || 'zh-Hans',
      pageUrl: '',
      pageTitle: '主功能区翻译',
      createdAt: Date.now(),
      engineId: metadata.engineId || 'local',
      engineStage: metadata.engineStage || 'local',
      providerId: metadata.providerId || 'browser-translator',
      inReadingArea: settings[AUTO_READING_KEY] === true
    };
    stored.unshift(item);
    stored.splice(500);
    historyItems = stored;
    if (!historyLoaded) readingItems = storedReading;
    await chrome.storage.local.set({ [HISTORY_KEY]: stored });
    if (item.inReadingArea) {
      readingItems = [item, ...readingItems.filter((entry) => entry.id !== item.id)].slice(0, 500);
      await chrome.storage.local.set({ [READING_KEY]: readingItems });
    }
    if (historyLoaded) renderHistoryList();
  } catch (e) {
    console.warn('保存主功能区翻译历史失败:', e);
  }
}

function getSelectedHistoryIds() {
  return new Set(Array.from(historyList?.querySelectorAll('.history-select:checked') || []).map((el) => el.dataset.id));
}

historyList?.addEventListener('click', async (event) => {
  const button = event.target.closest?.('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'more') {
    historyRenderLimit += HISTORY_RENDER_BATCH;
    renderHistoryList({ preserveLimit: true });
    return;
  }
  const id = button.dataset.id;
  const index = historyItems.findIndex((item) => item.id === id);
  const readingIndex = readingItems.findIndex((item) => item.id === id);
  if (index < 0 && readingIndex < 0) return;
  if (button.dataset.action === 'delete') {
    if (getActiveArchiveView() === 'reading') {
      if (readingIndex < 0) return;
      readingItems.splice(readingIndex, 1);
      await saveReadingItems();
      setHistoryStatus('已删除 1 条阅读区记录', 'ok');
      return;
    }
    if (index < 0) return;
    historyItems.splice(index, 1);
    await saveHistoryItems();
    setHistoryStatus('已删除 1 条历史翻译', 'ok');
  } else if (button.dataset.action === 'reading') {
    const item = historyItems[index] || readingItems.find((entry) => entry.id === id);
    if (!item) return;
    if (isInReadingArea(id)) {
      readingItems = readingItems.filter((entry) => entry.id !== id);
      await saveReadingItems();
      setHistoryStatus('已移出阅读区', 'ok');
    } else {
      readingItems = [{ ...item, inReadingArea: true }, ...readingItems.filter((entry) => entry.id !== id)].slice(0, 500);
      await saveReadingItems();
      setHistoryStatus('已加入阅读区', 'ok');
    }
  } else if (button.dataset.action === 'reader') {
    openReader(historyItems[index] || readingItems.find((entry) => entry.id === id), historyViewSelect?.value || 'all');
  }
});

refreshHistoryBtn?.addEventListener('click', () => loadHistoryState({ force: true }));
historyManageBtn?.addEventListener('click', () => setHistoryToolsOpen(historyTools?.classList.contains('hidden')));
historyViewSelect?.addEventListener('change', () => setHistoryView(historyViewSelect.value));
archiveTabs.forEach((tab) => {
  tab.addEventListener('click', () => setHistoryView(tab.dataset.historyView));
});
readerModeTabs.forEach((tab) => {
  tab.addEventListener('click', () => setReaderMode(tab.dataset.readerMode));
});
readerBackBtn?.addEventListener('click', closeReaderAndReturn);
readerFontDecreaseBtn?.addEventListener('click', () => adjustReaderFont(-1));
readerFontIncreaseBtn?.addEventListener('click', () => adjustReaderFont(1));
historyFromDate?.addEventListener('change', renderHistoryList);
historyToDate?.addEventListener('change', renderHistoryList);
historySelectAllBtn?.addEventListener('click', () => {
  historyList?.querySelectorAll('.history-select').forEach((input) => { input.checked = true; });
});
deleteSelectedHistoryBtn?.addEventListener('click', async () => {
  const selected = getSelectedHistoryIds();
  if (!selected.size) {
    setHistoryStatus('请先选择要删除的记录', 'err');
    return;
  }
  if (getActiveArchiveView() === 'reading') {
    readingItems = readingItems.filter((item) => !selected.has(item.id));
    await saveReadingItems();
    setHistoryStatus(`已删除 ${selected.size} 条阅读区记录`, 'ok');
  } else {
    historyItems = historyItems.filter((item) => !selected.has(item.id));
    await saveHistoryItems();
    setHistoryStatus(`已删除 ${selected.size} 条历史翻译`, 'ok');
  }
});
deleteDateHistoryBtn?.addEventListener('click', async () => {
  const from = historyFromDate?.value ? new Date(`${historyFromDate.value}T00:00:00`).getTime() : null;
  const to = historyToDate?.value ? new Date(`${historyToDate.value}T23:59:59.999`).getTime() : null;
  if (from !== null && to !== null && from > to) {
    setHistoryStatus('开始日期不能晚于结束日期', 'err');
    return;
  }
  if (from === null && to === null) {
    setHistoryStatus('请先选择日期范围', 'err');
    return;
  }
  const view = getActiveArchiveView();
  const sourceItems = getActiveArchiveItems();
  const nextItems = sourceItems.filter((item) => {
    if (from !== null && item.createdAt < from) return true;
    if (to !== null && item.createdAt > to) return true;
    return false;
  });
  const removed = sourceItems.length - nextItems.length;
  if (removed && window.confirm(`确定删除日期范围内的 ${removed} 条记录吗？`)) {
    if (view === 'reading') {
      readingItems = nextItems;
      await saveReadingItems();
    } else {
      historyItems = nextItems;
      await saveHistoryItems();
    }
    setHistoryStatus(`已删除 ${removed} 条${getActiveArchiveLabel()}记录`, 'ok');
  } else if (removed) {
    setHistoryStatus('已取消删除');
  } else {
    setHistoryStatus('该日期范围没有记录');
  }
});
clearHistoryBtn?.addEventListener('click', async () => {
  const view = getActiveArchiveView();
  const currentItems = getActiveArchiveItems();
  if (!currentItems.length) {
    await chrome.storage.local.set({ [CONSOLE_TAB_KEY]: 'translation' }).catch(() => {});
    setConsoleTab('translation', false);
    closeReader();
    setHistoryToolsOpen(false);
    renderHistoryList();
    return;
  }
  if (!window.confirm(`确定清空全部 ${currentItems.length} 条${getActiveArchiveLabel()}记录吗？`)) return;

  const previousItems = [...currentItems];
  if (view === 'reading') readingItems = [];
  else historyItems = [];
  closeReader();
  setHistoryToolsOpen(false);
  try {
    if (view === 'reading') await saveReadingItems();
    else await saveHistoryItems();
    await chrome.storage.local.set({ [CONSOLE_TAB_KEY]: 'translation' });
    setConsoleTab('translation', false);
    renderHistoryList();
    setHistoryStatus(`${getActiveArchiveLabel()}已清空`, 'ok');
  } catch (error) {
    if (view === 'reading') readingItems = previousItems;
    else historyItems = previousItems;
    renderHistoryList();
    setHistoryStatus(`清空${getActiveArchiveLabel()}失败：` + String(error?.message || error || ''), 'err');
  }
});
historyEnabledToggle?.addEventListener('change', async () => {
  await chrome.storage.local.set({ [HISTORY_ENABLED_KEY]: historyEnabledToggle.checked });
  setHistoryStatus(historyEnabledToggle.checked ? '已开启历史记录' : '已关闭历史记录', 'ok');
});
autoReadingToggle?.addEventListener('change', async () => {
  await chrome.storage.local.set({ [AUTO_READING_KEY]: autoReadingToggle.checked });
  setHistoryStatus(autoReadingToggle.checked ? '新翻译会自动加入阅读区' : '新翻译不会自动加入阅读区', 'ok');
});

function updateCharCount() {
  if (!charCountEl) return;
  const len = inputEl.value.length;
  charCountEl.textContent = `字数：${len}`;

  // Update character count styling based on length
  charCountEl.className = 'char-count';
  if (len > 1000) {
    charCountEl.classList.add('danger');
  } else if (len > 500) {
    charCountEl.classList.add('warning');
  }
  if (clearInputBtn) clearInputBtn.disabled = len === 0;
}

inputEl.addEventListener("input", updateCharCount);
clearInputBtn?.addEventListener('click', () => {
  inputEl.value = '';
  updateCharCount();
  inputEl.focus();
  setStatus('', '');
});
updateCharCount();

const downloadProgress = document.getElementById("downloadProgress");
const downloadPct = document.getElementById("downloadPct");
function setSpeakEnabled(enabled) {
  if (speakBtn) speakBtn.disabled = !enabled;
}
setSpeakEnabled(false);

function speakOutput() {
  const text = (outputEl.textContent || "").trim();
  if (!text) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    // 根据目标语言设置语音语言，尽可能匹配
    const lang = targetSelect.value || "zh-Hans";
    utter.lang = lang.startsWith("zh") ? "zh-CN" : lang;
    utter.rate = 1.0;
    utter.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn("朗读失败", e);
    setStatus("朗读失败，可能浏览器不支持语音合成。", "warn");
  }
}


function setCopyEnabled(enabled) {
  if (copyBtn) copyBtn.disabled = !enabled;
}
setCopyEnabled(false);

async function copyOutput() {
  const text = (outputEl.textContent || "").trim();
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setStatus("已复制到剪贴板。", "ok");
    if (copyBtn) {
      const prev = copyBtn.textContent;
      copyBtn.textContent = "已复制";
      setTimeout(() => { if (copyBtn) copyBtn.textContent = prev || "复制"; }, 1000);
    }
  } catch (e) {
    console.warn("复制失败", e);
    setStatus("复制失败，请手动复制。", "warn");
  }
}


// A simple list of BCP-47 codes for demo purposes. Browsers may support a subset.
const LANGS = [
  ["auto", uiMessage('languageAuto', "自动检测")],
  ["en", uiMessage('languageEnglish', "英语")],
  ["zh-Hans", `${uiMessage('languageZhHans', "简体中文")} (zh-Hans)`],
  ["zh-Hant", `${uiMessage('languageZhHant', "繁体中文")} (zh-Hant)`],
  ["ja", uiMessage('languageJapanese', "日语")],
  ["ko", uiMessage('languageKorean', "韩语")],
  ["fr", uiMessage('languageFrench', "法语")],
  ["de", uiMessage('languageGerman', "德语")],
  ["es", uiMessage('languageSpanish', "西班牙语")],
  ["ru", uiMessage('languageRussian', "俄语")],
  ["it", uiMessage('languageItalian', "意大利语")],
  ["pt", uiMessage('languagePortuguese', "葡萄牙语")],
];

function populateLangSelects() {
  sourceSelect.innerHTML = "";
  targetSelect.innerHTML = "";

  for (const [code, label] of LANGS) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = label;
    if (code === "auto") sourceSelect.appendChild(opt);
    else sourceSelect.appendChild(opt.cloneNode(true));
  }

  for (const [code, label] of LANGS) {
    if (code === "auto") continue; // target can't be auto
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = label;
    targetSelect.appendChild(opt);
  }

  // Defaults
  sourceSelect.value = "auto";
  targetSelect.value = "zh-Hans";
}

function setStatus(msg, cls = "") {
  statusEl.textContent = uiText(msg);
  statusEl.className = `hint small ${cls}`.trim();
}

function getSiteKeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin && parsed.origin !== 'null' ? parsed.origin : parsed.href;
  } catch {
    return null;
  }
}

async function getActiveTranslationSiteKey() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return getSiteKeyFromUrl(tab?.url || '');
}

function isValidLlmBaseUrl(value) {
  return isAllowedProviderUrl(value, true);
}

function isLlmProfileReady(profile) {
  return providerProfileIsReady('openai', profile);
}

function getProviderDefinition(providerId) {
  return PROVIDER_DEFINITIONS.find((item) => item.id === providerId) || null;
}

function isAllowedProviderUrl(value, allowHttp = false) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' || (allowHttp && url.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname));
  } catch {
    return false;
  }
}

function providerProfileIsReady(providerId, profile = providerProfiles[providerId] || {}) {
  const definition = getProviderDefinition(providerId);
  if (!definition || !isAllowedProviderUrl(profile.baseUrl || definition.baseUrl, definition.allowHttp === true)) return false;
  if (definition.needsKey && !String(profile.apiKey || '').trim()) return false;
  if (definition.credentials && (!String(profile.appId || '').trim() || !String(profile.appSecret || '').trim())) return false;
  if (definition.stage === 'llm' && !String(profile.model || definition.model || '').trim()) return false;
  return true;
}

function providerProfileDefaults(definition) {
  return {
    baseUrl: definition?.baseUrl || '',
    apiKey: '',
    model: definition?.model || '',
    region: '',
    appId: '',
    appSecret: '',
    systemPrompt: 'You are a professional translation engine. Translate only. Preserve paragraph breaks, line breaks, numbering, citation markers, URLs, and code. Do not add explanations or omit content.',
    userPrompt: 'Translate the following text into {{to}}. Return only the translation.\n\n{{origin}}'
  };
}

function currentProviderId() {
  return providerSelect?.value || (providerStageSelect?.value === 'online' ? 'google' : 'openai');
}

function currentProviderStorageKey() {
  return providerStageSelect?.value === 'online' ? ONLINE_PROVIDER_KEY : LLM_PROVIDER_KEY;
}

function setProviderProfileStatus(message, tone = 'neutral') {
  if (!providerProfileStatus) return;
  providerProfileStatus.textContent = message;
  providerProfileStatus.dataset.tone = tone;
}

function renderProviderOptions(selectedId = '') {
  if (!providerSelect) return;
  const stage = providerStageSelect?.value || 'online';
  providerSelect.textContent = '';
  for (const definition of PROVIDER_DEFINITIONS.filter((item) => item.stage === stage)) {
    const option = document.createElement('option');
    option.value = definition.id;
    option.textContent = definition.label;
    providerSelect.appendChild(option);
  }
  const fallback = PROVIDER_DEFINITIONS.find((item) => item.stage === stage)?.id || '';
  providerSelect.value = PROVIDER_DEFINITIONS.some((item) => item.id === selectedId && item.stage === stage) ? selectedId : fallback;
}

function setProviderFieldVisible(selector, visible) {
  document.querySelectorAll(selector).forEach((element) => {
    element.style.display = visible ? '' : 'none';
  });
}

function truncateHistoryPreview(text, maxLength = 240) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

function renderProviderFieldVisibility(definition) {
  const isLlm = definition?.stage === 'llm';
  setProviderFieldVisible('.provider-field-url', true);
  setProviderFieldVisible('.provider-field-model', isLlm);
  setProviderFieldVisible('.provider-field-key', Boolean(definition?.needsKey));
  setProviderFieldVisible('.provider-field-region', Boolean(definition?.region));
  setProviderFieldVisible('.provider-field-appid', Boolean(definition?.credentials));
  setProviderFieldVisible('.provider-field-secret', Boolean(definition?.credentials));
  setProviderFieldVisible('.provider-field-prompt', isLlm);

  if (!providerCredentialHint) return;
  providerCredentialHint.replaceChildren();
  if (definition?.credentialUrl) {
    const link = document.createElement('a');
    link.href = definition.credentialUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = definition.credentialLabel || '获取服务凭证';
    providerCredentialHint.appendChild(link);
    providerCredentialHint.style.display = '';
  } else if (definition?.credentialNote) {
    providerCredentialHint.textContent = definition.credentialNote;
    providerCredentialHint.style.display = '';
  } else {
    providerCredentialHint.style.display = 'none';
  }
}

function applyProviderProfileToInputs() {
  const definition = getProviderDefinition(currentProviderId());
  const profile = { ...providerProfileDefaults(definition), ...(providerProfiles[currentProviderId()] || {}) };
  if (providerBaseUrlInput) providerBaseUrlInput.value = profile.baseUrl;
  if (providerApiKeyInput) providerApiKeyInput.value = profile.apiKey;
  if (providerModelInput) providerModelInput.value = profile.model;
  if (providerRegionInput) providerRegionInput.value = profile.region;
  if (providerAppIdInput) providerAppIdInput.value = profile.appId;
  if (providerAppSecretInput) providerAppSecretInput.value = profile.appSecret;
  if (providerSystemPromptInput) providerSystemPromptInput.value = profile.systemPrompt;
  if (providerUserPromptInput) providerUserPromptInput.value = profile.userPrompt;
  renderProviderFieldVisibility(definition);
  if (providerApiKeyInput) {
    providerApiKeyInput.placeholder = definition?.id === 'newapi'
      ? uiMessage('newApiKeyPlaceholder', '粘贴 New API 控制台中的 API Key')
      : definition?.needsKey ? uiMessage('providerKeyPlaceholder', '粘贴该服务的 API Key / Token') : uiMessage('providerKeyOptional', '此服务可不填 Key');
  }
  setProviderProfileStatus(providerProfileIsReady(currentProviderId(), profile) ? '可用' : '待配置', providerProfileIsReady(currentProviderId(), profile) ? 'ok' : 'neutral');
}

function readProviderProfileFromInputs() {
  return {
    baseUrl: String(providerBaseUrlInput?.value || '').trim().replace(/\/+$/, ''),
    apiKey: String(providerApiKeyInput?.value || '').trim(),
    model: String(providerModelInput?.value || '').trim(),
    region: String(providerRegionInput?.value || '').trim(),
    appId: String(providerAppIdInput?.value || '').trim(),
    appSecret: String(providerAppSecretInput?.value || '').trim(),
    systemPrompt: String(providerSystemPromptInput?.value || '').trim(),
    userPrompt: String(providerUserPromptInput?.value || '').trim()
  };
}

async function loadProviderProfiles() {
  const settings = await chrome.storage.local.get([PROVIDER_PROFILES_KEY, LLM_PROFILE_KEY, ONLINE_PROVIDER_KEY, LLM_PROVIDER_KEY, TRANSLATION_ENGINE_KEY]);
  providerProfiles = settings[PROVIDER_PROFILES_KEY] && typeof settings[PROVIDER_PROFILES_KEY] === 'object'
    ? { ...settings[PROVIDER_PROFILES_KEY] } : {};
  if (!providerProfiles.openai && settings[LLM_PROFILE_KEY]) providerProfiles.openai = { ...settings[LLM_PROFILE_KEY] };
  activeOnlineProvider = settings[ONLINE_PROVIDER_KEY] || 'google';
  activeLlmProvider = settings[LLM_PROVIDER_KEY] || 'openai';
  const stageKey = providerStageSelect?.value === 'online' ? ONLINE_PROVIDER_KEY : LLM_PROVIDER_KEY;
  const fallback = providerStageSelect?.value === 'online' ? activeOnlineProvider : activeLlmProvider;
  const selected = settings[stageKey] || fallback;
  renderProviderOptions(selected);
  applyProviderProfileToInputs();
  return { settings, onlineProvider: activeOnlineProvider, llmProvider: activeLlmProvider };
}

function translationEngineLabel(engineId) {
  if (engineId === 'online') return `${uiMessage('onlineTranslation', '在线翻译')}（${uiText(getProviderDefinition(activeOnlineProvider)?.label || uiMessage('providerGoogleCloud', 'Google Cloud 翻译'))}）`;
  if (engineId === 'llm') return `${uiMessage('llmTranslation', '大模型翻译')}（${uiText(getProviderDefinition(activeLlmProvider)?.label || 'OpenAI')}）`;
  return uiMessage('localTranslation', '本地翻译');
}

function translationEngineStatusLabel(engineId, onlineReady, llmReady) {
  if (engineId === 'online' && !onlineReady) return `${translationEngineLabel(engineId)}（待配置）`;
  if (engineId === 'llm' && !llmReady) return `${translationEngineLabel(engineId)}（待配置）`;
  return translationEngineLabel(engineId);
}

async function loadTranslationEngineSettings() {
  const [providerState, siteKey] = await Promise.all([
    loadProviderProfiles(),
    getActiveTranslationSiteKey().catch(() => null)
  ]);
  const settings = providerState.settings;
  const onlineProfile = providerProfiles[providerState.onlineProvider] || {};
  const llmProfile = providerProfiles[providerState.llmProvider] || {};
  const onlineReady = providerProfileIsReady(providerState.onlineProvider, onlineProfile);
  const llmReady = providerProfileIsReady(providerState.llmProvider, llmProfile);
  const siteEngines = settings[TRANSLATION_SITE_ENGINES_KEY];
  const siteEngine = siteKey && siteEngines && typeof siteEngines === 'object' ? siteEngines[siteKey] : null;
  // Older builds briefly stored this preference in sync storage. Prefer the
  // local value, but migrate a valid legacy value so reopening the popup does
  // not silently fall back to local translation.
  let legacySyncEngine = null;
  if (!['local', 'online', 'llm'].includes(settings[TRANSLATION_ENGINE_KEY])) {
    try {
      const legacy = await chrome.storage.sync.get([TRANSLATION_ENGINE_KEY]);
      legacySyncEngine = legacy[TRANSLATION_ENGINE_KEY];
      if (['local', 'online', 'llm'].includes(legacySyncEngine)) {
        await chrome.storage.local.set({ [TRANSLATION_ENGINE_KEY]: legacySyncEngine });
      }
    } catch {}
  }
  const storedGlobalEngine = ['local', 'online', 'llm'].includes(settings[TRANSLATION_ENGINE_KEY])
    ? settings[TRANSLATION_ENGINE_KEY]
    : legacySyncEngine;
  const persistedGlobalEngine = ['local', 'online', 'llm'].includes(storedGlobalEngine) ? storedGlobalEngine : TRANSLATION_ENGINE_LOCAL;
  const globalEngine = pendingGlobalEngineSelection || persistedGlobalEngine;
  lastGlobalEngine = globalEngine;
  const effectiveEngine = ['local', 'online', 'llm'].includes(siteEngine) ? siteEngine : globalEngine;

  if (llmBaseUrlInput) llmBaseUrlInput.value = llmProfile.baseUrl || '';
  if (llmModelInput) llmModelInput.value = llmProfile.model || '';
  if (llmApiKeyInput) llmApiKeyInput.value = llmProfile.apiKey || '';
  if (llmProfileStatus) llmProfileStatus.textContent = llmReady
    ? uiMessage('configuredModel', `已配置：${llmProfile.model || providerState.llmProvider}`, [llmProfile.model || providerState.llmProvider])
    : uiMessage('notConfigured', '未配置');
  const onlineOption = defaultEngineSelect?.querySelector('option[value="online"]');
  const llmOption = defaultEngineSelect?.querySelector('option[value="llm"]');
  if (onlineOption) onlineOption.disabled = false;
  if (llmOption) llmOption.disabled = false;
  if (defaultEngineSelect) defaultEngineSelect.value = globalEngine;
  if (defaultEngineStatus) defaultEngineStatus.textContent = uiMessage(
    'globalEngineStatus',
    `全局：${translationEngineStatusLabel(globalEngine, onlineReady, llmReady)}`,
    [translationEngineStatusLabel(globalEngine, onlineReady, llmReady)]
  );
  if (engineScopeStatus) {
    engineScopeStatus.textContent = siteKey && ['local', 'online', 'llm'].includes(siteEngine)
      ? uiMessage('siteEngineStatus', `当前网站默认：${translationEngineStatusLabel(siteEngine, onlineReady, llmReady)}`, [translationEngineStatusLabel(siteEngine, onlineReady, llmReady)])
      : siteKey
        ? uiMessage('siteFollowsGlobalStatus', `当前网站跟随全局默认（${translationEngineStatusLabel(effectiveEngine, onlineReady, llmReady)}）`, [translationEngineStatusLabel(effectiveEngine, onlineReady, llmReady)])
        : uiMessage('siteDefaultUnsupported', '当前页面不支持网站级默认设置');
  }
}

async function saveGlobalTranslationEngine(engineId) {
  if (!['local', 'online', 'llm'].includes(engineId)) throw new Error('未知翻译引擎');
  await chrome.storage.local.set({ [TRANSLATION_ENGINE_KEY]: engineId });
  const stored = await chrome.storage.local.get([TRANSLATION_ENGINE_KEY]);
  if (stored[TRANSLATION_ENGINE_KEY] !== engineId) throw new Error('全局默认翻译保存后校验失败');
  // Remove the legacy copy so two storage areas cannot disagree later.
  try { await chrome.storage.sync.remove([TRANSLATION_ENGINE_KEY]); } catch {}
}

async function saveLlmProfile() {
  const profile = {
    baseUrl: String(llmBaseUrlInput?.value || '').trim().replace(/\/+$/, ''),
    model: String(llmModelInput?.value || '').trim(),
    apiKey: String(llmApiKeyInput?.value || '').trim()
  };
  if (!isLlmProfileReady(profile)) throw new Error('请填写有效的 HTTPS API 地址和模型名称');
  await chrome.storage.local.set({ [LLM_PROFILE_KEY]: profile });
  if (llmProfileStatus) llmProfileStatus.textContent = uiMessage('configuredModel', `已配置：${profile.model}`, [profile.model]);
  await loadTranslationEngineSettings();
}

async function saveProviderProfile() {
  const providerId = currentProviderId();
  const profile = readProviderProfileFromInputs();
  if (!providerProfileIsReady(providerId, profile)) {
    throw new Error('请补齐该服务所需的地址、密钥、模型或账号字段');
  }
  providerProfiles = { ...providerProfiles, [providerId]: profile };
  const stageKey = currentProviderStorageKey();
  const patch = { [PROVIDER_PROFILES_KEY]: providerProfiles, [stageKey]: providerId };
  if (providerId === 'openai') patch[LLM_PROFILE_KEY] = { baseUrl: profile.baseUrl, model: profile.model, apiKey: profile.apiKey };
  await chrome.storage.local.set(patch);
  activeOnlineProvider = stageKey === ONLINE_PROVIDER_KEY ? providerId : activeOnlineProvider;
  activeLlmProvider = stageKey === LLM_PROVIDER_KEY ? providerId : activeLlmProvider;
  await loadTranslationEngineSettings();
  setProviderProfileStatus('已保存', 'ok');
}

async function testProviderProfile() {
  const providerId = currentProviderId();
  const profile = readProviderProfileFromInputs();
  if (!providerProfileIsReady(providerId, profile)) throw new Error('请先补齐服务配置');
  const storedBefore = await chrome.storage.local.get([PROVIDER_PROFILES_KEY]);
  const previousProfiles = storedBefore[PROVIDER_PROFILES_KEY] && typeof storedBefore[PROVIDER_PROFILES_KEY] === 'object'
    ? { ...storedBefore[PROVIDER_PROFILES_KEY] }
    : {};
  providerProfiles = { ...providerProfiles, [providerId]: profile };
  await chrome.storage.local.set({ [PROVIDER_PROFILES_KEY]: providerProfiles });
  try {
    const response = await chrome.runtime.sendMessage({ type: 'TEST_TRANSLATION_PROVIDER', providerId, targetLang: targetSelect?.value || 'zh-Hans' });
    if (!response?.ok) throw new Error(response?.error || '测试请求失败');
    setProviderProfileStatus('连接成功', 'ok');
  } finally {
    providerProfiles = previousProfiles;
    await chrome.storage.local.set({ [PROVIDER_PROFILES_KEY]: previousProfiles });
  }
}

async function setCurrentSiteTranslationEngine(engineId) {
  const siteKey = await getActiveTranslationSiteKey();
  if (!siteKey) throw new Error('当前页面不支持网站级默认设置');
  const result = await chrome.storage.local.get([TRANSLATION_SITE_ENGINES_KEY]);
  const siteEngines = result[TRANSLATION_SITE_ENGINES_KEY] && typeof result[TRANSLATION_SITE_ENGINES_KEY] === 'object'
    ? { ...result[TRANSLATION_SITE_ENGINES_KEY] }
    : {};
  siteEngines[siteKey] = engineId;
  await chrome.storage.local.set({ [TRANSLATION_SITE_ENGINES_KEY]: siteEngines });
}

async function clearCurrentSiteTranslationEngine() {
  const siteKey = await getActiveTranslationSiteKey();
  if (!siteKey) throw new Error('当前页面不支持网站级默认设置');
  const result = await chrome.storage.local.get([TRANSLATION_SITE_ENGINES_KEY]);
  const siteEngines = result[TRANSLATION_SITE_ENGINES_KEY] && typeof result[TRANSLATION_SITE_ENGINES_KEY] === 'object'
    ? { ...result[TRANSLATION_SITE_ENGINES_KEY] }
    : {};
  delete siteEngines[siteKey];
  await chrome.storage.local.set({ [TRANSLATION_SITE_ENGINES_KEY]: siteEngines });
}

// 白名单管理函数
let whitelistPatterns = [];

// 加载白名单
async function loadWhitelist() {
  try {
    const result = await chrome.storage.sync.get(['whitelistPatterns']);
    whitelistPatterns = result.whitelistPatterns || [];
    updateWhitelistDisplay();
  } catch (e) {
    console.warn('加载白名单失败:', e);
    whitelistPatterns = [];
  }
}

// 保存白名单
async function saveWhitelist() {
  try {
    await chrome.storage.sync.set({ whitelistPatterns });
  } catch (e) {
    console.warn('保存白名单失败:', e);
    setStatus('保存白名单失败', 'err');
  }
}

// 验证输入的网址或路径
function validateInput(input) {
  // 基本的输入验证，确保不是空字符串且不包含危险字符
  if (!input || input.trim().length === 0) return false;
  
  const trimmed = input.trim();
  // 禁止一些危险字符，但允许通配符 *
  const dangerousChars = ['<', '>', '"', "'", '&'];
  if (dangerousChars.some(char => trimmed.includes(char))) {
    return false;
  }
  
  // 验证通配符语法
  if (trimmed.includes('*')) {
    // 检查通配符是否合法
    try {
      const regexPattern = trimmed
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      new RegExp('^' + regexPattern + '$');
      return true;
    } catch (e) {
      return false;
    }
  }
  
  return true;
}

// 添加白名单项
async function addWhitelistItem(pattern) {
  if (!pattern || !pattern.trim()) {
    setStatus('请输入有效的网址或路径', 'warn');
    return;
  }
  
  const trimmedPattern = pattern.trim();
  
  // 检查是否已存在
  if (whitelistPatterns.includes(trimmedPattern)) {
    setStatus('该网址已存在于白名单中', 'warn');
    return;
  }
  
  // 验证输入
  if (!validateInput(trimmedPattern)) {
    setStatus('输入包含无效字符', 'err');
    return;
  }
  
  whitelistPatterns.push(trimmedPattern);
  await saveWhitelist();
  updateWhitelistDisplay();
  whitelistInput.value = '';
  setStatus('已添加到白名单', 'ok');
}

// 删除白名单项
async function removeWhitelistItem(pattern) {
  const index = whitelistPatterns.indexOf(pattern);
  if (index > -1) {
    whitelistPatterns.splice(index, 1);
    await saveWhitelist();
    updateWhitelistDisplay();
    setStatus('已从白名单中删除', 'ok');
  }
}

// 更新白名单显示
function updateWhitelistDisplay() {
  whitelistCount.textContent = whitelistPatterns.length;
  
  if (whitelistPatterns.length === 0) {
    whitelistContainer.innerHTML = '<div id="emptyWhitelist" class="small" style="padding:16px;text-align:center;color:var(--muted);font-style:italic;">暂无白名单网址</div>';
    return;
  }
  
  const listHtml = whitelistPatterns.map((pattern, index) => `
    <div class="whitelist-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;${index < whitelistPatterns.length - 1 ? 'border-bottom:1px solid #f0f0f0;' : ''}background:#ffffff;transition:background 0.2s ease;" onmouseover="this.style.background='#f8f9fa';" onmouseout="this.style.background='#ffffff';">
      <div style="flex:1;min-width:0;margin-right:8px;">
        <div class="small" style="color:#1d1d1f;font-family:SF Mono,-apple-system-monospace,Monaco,monospace;font-size:11px;line-height:1.4;word-break:break-all;">${escapeHtml(pattern)}</div>
      </div>
      <button class="remove-whitelist-btn" data-pattern="${escapeHtml(pattern)}" style="width:20px;height:20px;padding:0;background:#ff3b30;border:none;border-radius:10px;cursor:pointer;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;flex-shrink:0;" onmouseover="this.style.background='#d70015';this.style.transform='scale(1.1)';" onmouseout="this.style.background='#ff3b30';this.style.transform='scale(1)';" title="删除">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');
  
  whitelistContainer.innerHTML = listHtml;
  
  // 绑定删除按钮事件
  whitelistContainer.querySelectorAll('.remove-whitelist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pattern = btn.getAttribute('data-pattern');
      removeWhitelistItem(pattern);
    });
  });
}

// 添加当前网页到白名单
async function addCurrentPageToWhitelist() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      setStatus('无法获取当前网页信息', 'err');
      return;
    }
    
    const url = tab.url;
    
    // 检查是否为支持的协议
    if (!/^https?:/.test(url)) {
      setStatus('仅支持 HTTP/HTTPS 网页', 'warn');
      return;
    }
    
    // 提取域名和路径
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // 生成匹配模式
    let suggestionPattern;
    if (pathname === '/' || pathname === '') {
      // 如果是首页，使用精确域名匹配
      suggestionPattern = hostname;
    } else {
      // 如果有路径，使用域名+路径匹配
      suggestionPattern = hostname + pathname;
    }
    
    // 检查是否已存在
    if (whitelistPatterns.includes(suggestionPattern)) {
      setStatus(`该模式已在白名单中：${suggestionPattern}`, 'warn');
      return;
    }
    
    // 添加到白名单
    whitelistPatterns.push(suggestionPattern);
    await saveWhitelist();
    updateWhitelistDisplay();
    
    setStatus(`已添加到白名单：${suggestionPattern}`, 'ok');
    
  } catch (e) {
    console.error('添加当前网页到白名单失败:', e);
    setStatus('添加失败：' + String(e?.message || e || ''), 'err');
  }
}

// HTML转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 更新开关状态文本
function updateToggleStatus(toggleElement, statusElement, enabled) {
  if (statusElement) {
    statusElement.textContent = enabled ? '已开启' : '已关闭';
    statusElement.style.color = enabled ? '#10b981' : '#6b7280';
  }
}

// Unified check for unsupported/invalid language pair errors across Chrome versions
function isPairUnsupported(msg) {
  const s = String(msg || "");
  return /Unable to create translator|requested language options are not supported|source and target language|language conflict/i.test(s);
}


// Normalize language code for Translator API (e.g., map 'zh' -> 'zh-Hans')
function normalizeLang(code) {
  if (!code) return code;
  if (code === "zh") return "zh-Hans";
  return code;
}



function featureDetect() {
  const hasTranslator = typeof window.Translator !== "undefined";
  const hasDetector = typeof window.LanguageDetector !== "undefined";
  return { hasTranslator, hasDetector };
}

async function checkAvailability(sourceLanguage, targetLanguage) {
  if (!window.Translator || !Translator.availability) return null;
  try {
    return await Translator.availability({
      sourceLanguage: normalizeLang(sourceLanguage),
      targetLanguage: normalizeLang(targetLanguage),
    });
  } catch (e) {
    return null;
  }
}

async function detectLanguageIfNeeded(text, hasDetector) {
  if (!text || !hasDetector) return null;
  try {
    const detector = await LanguageDetector.create({ expectedInputLanguages: LANGS.filter(l => l[0] !== "auto").map(l => l[0]) });
    const results = await detector.detect(text);
    detector.destroy?.();
    if (Array.isArray(results) && results.length > 0) {
      // results are likely sorted by confidence
      return results[0].detectedLanguage || null;
    }
  } catch (e) {
    console.warn("Language detection failed", e);
  }
  return null;
}
function getNextTargetLang(current) {
async function translateWithAutoFallback(sourceLanguage, initialTarget, text) {
  const codes = LANGS.map(l => l[0]).filter(c => c !== "auto");
  let usedTarget = initialTarget;
  const startIdx = Math.max(0, codes.indexOf(initialTarget));
  let translator = null;

  for (let step = 0; step < codes.length; step++) {
    if (step > 0) {
      usedTarget = codes[(startIdx + step) % codes.length];
      // 避免与来源语言完全一致的目标语言
      if (usedTarget === sourceLanguage) {
        continue;
      }
      targetSelect.value = usedTarget;
      setStatus("目标语言与来源语言冲突，已自动顺延为：" + usedTarget + "，正在重试...", "warn");
    }

    // 每次尝试前销毁上一实例
    translator?.destroy?.();


	    // 保护：即使是第一次循环也避免与来源语言相同
	    if (usedTarget === sourceLanguage) {
	      continue;
	    }

    const avail = await checkAvailability(sourceLanguage, usedTarget);
    const needMonitor = avail === "downloadable" || avail === "downloading";

    let progressShown = false;
    let showTimer = null;
    try {
      if (needMonitor) {
        translator = await Translator.create({
          sourceLanguage: normalizeLang(sourceLanguage),
          targetLanguage: normalizeLang(usedTarget),
          monitor(monitor) {
            monitor.addEventListener("downloadprogress", (e) => {
              const pct = Math.floor((e.loaded || 0) * 100);
              if (!progressShown) {
                if (pct >= 100) return;
                showTimer = setTimeout(() => {
                  downloadSection.classList.remove("hidden");
                  progressShown = true;
                  downloadProgress.value = pct;
                  downloadPct.textContent = `${pct}%`;
                }, 150);
              } else {
                downloadProgress.value = pct;
                downloadPct.textContent = `${pct}%`;
              }
            });
          },
        });
      } else {
        translator = await Translator.create({ sourceLanguage: normalizeLang(sourceLanguage), targetLanguage: normalizeLang(usedTarget) });
      }

      const translation = await translator.translate(text);
      return { translation, translator, usedTarget };
    } catch (e) {
      const msg = String(e?.message || e || "");
      // 仅在语言冲突时报错时继续顺延
      if (isPairUnsupported(msg)) {
        // 顺延到下一轮尝试
        continue;
      }
      // 非语言冲突错误，直接抛出
      throw e;
    } finally {
      if (typeof showTimer !== "undefined" && showTimer) clearTimeout(showTimer);
    }
  }

  // 全部尝试失败
  throw new Error("Unable to create translator for the given source and target language (after trying alternatives)");
}

  const codes = LANGS.map(l => l[0]).filter(c => c !== "auto");
  const idx = codes.indexOf(current);
  if (idx < 0) return codes[0] || null;
  return codes[(idx + 1) % codes.length] || null;
}


async function doTranslate() {
  outputEl.textContent = "";
  const text = inputEl.value.trim();
  if (!text) {
    setStatus("请输入要翻译的文本。", "warn");
    return;
  }

  const { hasTranslator, hasDetector } = featureDetect();
  const engineSettings = await chrome.storage.local.get([TRANSLATION_ENGINE_KEY, ONLINE_PROVIDER_KEY, LLM_PROVIDER_KEY]);
  const storedEngine = engineSettings[TRANSLATION_ENGINE_KEY];
  const selectedEngine = ['local', 'online', 'llm'].includes(storedEngine)
    ? storedEngine
    : (defaultEngineSelect?.value || TRANSLATION_ENGINE_LOCAL);
  const providerId = selectedEngine === 'online'
    ? (engineSettings[ONLINE_PROVIDER_KEY] || 'google')
    : selectedEngine === 'llm'
      ? (engineSettings[LLM_PROVIDER_KEY] || 'openai')
      : 'browser-translator';
  if (selectedEngine === TRANSLATION_ENGINE_LOCAL && !hasTranslator) {
    setStatus("当前浏览器不支持 Translator API（需要 Chrome 138+ 且安全上下文）。", "err");
    return;
  }

  translateBtn.disabled = true;
  translateBtn.classList.add('loading');
  setCopyEnabled(false);
  setStatus("正在准备翻译...", "");

  let sourceLanguage = sourceSelect.value;
  let targetLanguage = targetSelect.value;

  try {
    if (sourceLanguage === "auto") {
      const detected = await detectLanguageIfNeeded(text, hasDetector);
      if (detected) {
        sourceLanguage = detected;
        setStatus(`检测到来源语言：${detected}`, "ok");
      } else {
        setStatus("自动检测不可用；将回退为英文作为来源。", "warn");
        sourceLanguage = "en";
      }
    }

    const sameLanguageMode = (await chrome.storage.sync.get([SAME_LANGUAGE_MODE_KEY]))[SAME_LANGUAGE_MODE_KEY] === 'translate' ? 'translate' : 'skip';
    if (normalizeLang(sourceLanguage) === normalizeLang(targetLanguage)) {
      if (sameLanguageMode === 'skip') {
        outputEl.textContent = text;
        setCopyEnabled(true);
        setSpeakEnabled(true);
        setStatus("来源语言与目标语言相同，已保留原文。", "ok");
        return;
      }
      targetLanguage = getNextTargetLang(targetLanguage) || targetLanguage;
      targetSelect.value = targetLanguage;
      setStatus("来源语言与目标语言相同，已按设置顺延翻译。", "warn");
    }

    if (selectedEngine !== TRANSLATION_ENGINE_LOCAL) {
      setStatus(`正在使用${translationEngineLabel(selectedEngine)}...`, '');
      const response = await chrome.runtime.sendMessage({ type: 'TRANSLATE_WITH_PROVIDER', text, sourceLang: sourceLanguage, targetLang: targetLanguage, providerId });
      if (!response?.ok) throw new Error(response?.error || 'PROVIDER_TRANSLATION_FAILED');
      const translation = String(response.translation || '');
      if (!translation.trim()) throw new Error('PROVIDER_EMPTY_RESPONSE');
      outputEl.textContent = translation;
      setCopyEnabled(true);
      setSpeakEnabled(true);
      await recordManualTranslationHistory(text, translation, sourceLanguage, targetLanguage, { engineId: selectedEngine, engineStage: selectedEngine, providerId });
      setStatus(`完成：${translationEngineLabel(selectedEngine)}`, 'ok');
      return;
    }

    const availability = await checkAvailability(sourceLanguage, targetLanguage);
    if (availability && availability !== "available") {
      setStatus(`模型可用性：${availability}。`, "warn");
    }

    // 如需下载模型时才显示进度条（避免已缓存时闪现100%）
    let translator;
    const needMonitor = availability === "downloadable" || availability === "downloading";
    let progressShown = false;

    let showTimer = null;
    let usedTarget = targetLanguage;

	    // 避免来源语言与目标语言相同导致不支持的语言对
	    if (sourceLanguage === usedTarget) {
	      const next = getNextTargetLang(usedTarget);
	      if (next && next !== usedTarget) {
	        usedTarget = next;
	        targetSelect.value = next;
	        setStatus("目标语言与来源语言相同，已自动顺延为：" + next + "，正在重试...", "warn");
	      } else {
	        throw new Error("The requested language options are not supported.");
	      }
	    }

    try {
      if (needMonitor) {
        translator = await Translator.create({
          sourceLanguage: normalizeLang(sourceLanguage),
          targetLanguage: normalizeLang(usedTarget),
          monitor(monitor) {
            monitor.addEventListener("downloadprogress", (e) => {
              const pct = Math.floor((e.loaded || 0) * 100);
              if (!progressShown) {
                if (pct >= 100) {
                  // 已经在本地或瞬时完成，不显示进度UI
                  return;
                }
                // 防止过快闪烁，延迟显示
                showTimer = setTimeout(() => {
                  downloadSection.classList.remove("hidden");
                  progressShown = true;
                  downloadProgress.value = pct;
                  downloadPct.textContent = `${pct}%`;
                }, 150);
              } else {
                downloadProgress.value = pct;
                downloadPct.textContent = `${pct}%`;
              }
            });
          },
        });
      } else {
        translator = await Translator.create({ sourceLanguage: normalizeLang(sourceLanguage), targetLanguage: normalizeLang(usedTarget) });
      }
    } catch (e) {
      const msg = String(e?.message || e || "");
      if (isPairUnsupported(msg)) {
        const next = getNextTargetLang(usedTarget);
        if (next && next !== usedTarget) {
          usedTarget = next;
          targetSelect.value = next;
          setStatus("目标语言与来源语言冲突，已自动顺延为：" + next + "，正在重试...", "warn");
          // 为简化，顺延重试不启用进度监控
          translator = await Translator.create({ sourceLanguage, targetLanguage: usedTarget });
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }

    // 简单模式：翻译完成后隐藏进度

    let translation;
    try {
      translation = await translator.translate(text);
    } catch (e) {
      const msg = String(e?.message || e || "");
      if (isPairUnsupported(msg)) {
        // 顺延目标语言并重试一次
        const next = getNextTargetLang(targetLanguage);
        if (next && next !== targetLanguage) {
          targetSelect.value = next;
          setStatus("目标语言与来源语言冲突，已自动顺延为：" + next + "，正在重试...", "warn");
          // 重建 translator 并重试
          const avail2 = await checkAvailability(sourceLanguage, next);
          if (avail2 === "downloadable" || avail2 === "downloading") {
            translator = await Translator.create({ sourceLanguage: normalizeLang(sourceLanguage), targetLanguage: normalizeLang(next) });
          } else {
            translator = await Translator.create({ sourceLanguage: normalizeLang(sourceLanguage), targetLanguage: normalizeLang(next) });
          }
          translation = await translator.translate(text);
        } else {
          throw e;
        }

      // 绑定复制按钮（若存在）
      // avoid duplicate listener on retry
      copyBtn?.removeEventListener("click", copyOutput);
      copyBtn?.addEventListener("click", copyOutput);

      } else {
        throw e;
      }
    }

    outputEl.textContent = translation;
    const hasText = !!(translation && translation.trim());
    setCopyEnabled(hasText);
    if (hasText) {
      await recordManualTranslationHistory(text, translation, sourceLanguage, usedTarget, {
        engineId: selectedEngine,
        engineStage: selectedEngine,
        providerId
      });
    }

    // 绑定朗读与复制按钮（若存在）
    // avoid duplicate listeners
    speakBtn?.removeEventListener("click", speakOutput);
    speakBtn?.addEventListener("click", speakOutput);
    copyBtn?.removeEventListener("click", copyOutput);
    copyBtn?.addEventListener("click", copyOutput);

    setSpeakEnabled(hasText);

    const quota = translator.inputQuota;
    if (quota) {
      setStatus(`完成。剩余输入配额：${quota.remaining ?? "?"}/${quota.limit ?? "?"}`, "ok");
    } else {
      setStatus("完成。", "ok");
    }

    translator.destroy?.();

  } catch (err) {
    const msg = String(err?.message || err || "");
    if (isPairUnsupported(msg)) {
      setStatus("语言冲突，请更改为其他目标语言", "err");
    } else {
      setStatus(`错误：${msg}`, "err");
    }
  } finally {
    // 清理延迟显示定时器，隐藏/复位进度条
    if (typeof showTimer !== "undefined" && showTimer) clearTimeout(showTimer);
    downloadSection.classList.add("hidden");
    downloadProgress.value = 0;
    downloadPct.textContent = "0%";

    translateBtn.disabled = false;
    translateBtn.classList.remove('loading');
  }
}

populateLangSelects();
translateBtn.addEventListener("click", doTranslate);
// 交换来源与目标语言（若来源为自动检测，则目标在中英间切换，来源保持自动）
swapBtn?.addEventListener("click", () => {
  const prevSource = sourceSelect.value;
  const prevTarget = targetSelect.value;
  if (prevSource === "auto") {
    targetSelect.value = prevTarget === "zh-Hans" ? "en" : "zh-Hans";
  } else {
    sourceSelect.value = prevTarget;
    targetSelect.value = prevSource;
  }
  updateHints();
});

// 初始化：加载设置并同步 UI
(async () => {
  try {
    const s = await chrome.storage.sync.get([
      'autoTranslateEnabled',
      'selectionTranslateEnabled',
      'floatingButtonEnabled',
      'autoTranslateTargetLang',
      SELECTION_SHOW_BILINGUAL_KEY,
      SELECTION_SHOW_SOURCE_KEY,
      SAME_LANGUAGE_MODE_KEY
    ]);
    const autoEnabled = !!s.autoTranslateEnabled;
    const selectionEnabled = !!s.selectionTranslateEnabled;
    const floatingEnabled = !!s.floatingButtonEnabled;
    const showBilingual = s[SELECTION_SHOW_BILINGUAL_KEY] !== false;
    const showSource = s[SELECTION_SHOW_SOURCE_KEY] !== false;
    const sameLanguageMode = s[SAME_LANGUAGE_MODE_KEY] === 'translate' ? 'translate' : 'skip';

    if (autoToggle) {
      autoToggle.checked = autoEnabled;
      updateToggleStatus(autoToggle, autoToggleStatus, autoEnabled);
    }
    if (selectionToggle) {
      selectionToggle.checked = selectionEnabled;
      updateToggleStatus(selectionToggle, selectionToggleStatus, selectionEnabled);
    }
    if (floatingToggle) {
      floatingToggle.checked = floatingEnabled;
      updateToggleStatus(floatingToggle, floatingToggleStatus, floatingEnabled);
    }
    if (selectionBilingualToggle) {
      selectionBilingualToggle.checked = showBilingual;
      updateToggleStatus(selectionBilingualToggle, selectionBilingualToggleStatus, showBilingual);
    }
    if (selectionSourceToggle) {
      selectionSourceToggle.checked = showSource;
      updateToggleStatus(selectionSourceToggle, selectionSourceToggleStatus, showSource);
    }
    if (sameLanguageModeSelect) sameLanguageModeSelect.value = sameLanguageMode;
    if (sameLanguageModeStatus) sameLanguageModeStatus.textContent = sameLanguageMode === 'translate'
      ? uiMessage('sameLanguageContinue', '同语言时继续翻译')
      : uiMessage('sameLanguageKeepOriginal', '同语言时保留原文');
    if (s.autoTranslateTargetLang) targetSelect.value = s.autoTranslateTargetLang;
    
    // 加载白名单和默认引擎；历史记录切到历史页时再按需加载
    await loadWhitelist();
    await loadTranslationEngineSettings();
  } catch (error) {
    setStatus('设置加载失败：' + String(error?.message || error || ''), 'err');
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["contentScript.js"] });
      } catch {}
    }
  } catch {}
})();

// 白名单交互事件
addWhitelistBtn?.addEventListener('click', () => {
  const pattern = whitelistInput.value.trim();
  addWhitelistItem(pattern);
});

// 添加当前网页按钮事件
addCurrentPageBtn?.addEventListener('click', addCurrentPageToWhitelist);

// 白名单输入框回车键事件
whitelistInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const pattern = whitelistInput.value.trim();
    addWhitelistItem(pattern);
  }
});

// 白名单输入框实时验证
whitelistInput?.addEventListener('input', () => {
  const pattern = whitelistInput.value.trim();
  if (pattern && !validateInput(pattern)) {
    whitelistInput.style.borderColor = '#ff3b30';
    whitelistInput.title = '输入包含无效字符';
  } else {
    whitelistInput.style.borderColor = '#d1d1d6';
    whitelistInput.title = '';
  }
});

// 自动翻译开关：持久化并提示
autoToggle?.addEventListener('change', async (e) => {
  const enabled = !!e.target.checked;
  await chrome.storage.sync.set({ autoTranslateEnabled: enabled, autoTranslateTargetLang: targetSelect.value });
  updateToggleStatus(autoToggle, autoToggleStatus, enabled);
  setStatus(enabled ? '已开启：自动翻译网页' : '已关闭：自动翻译网页', enabled ? 'ok' : '');
});

// 选中翻译开关：持久化并通知content script

selectionToggle?.addEventListener('change', async (e) => {
  const enabled = !!e.target.checked;
  await chrome.storage.sync.set({ selectionTranslateEnabled: enabled });
  updateToggleStatus(selectionToggle, selectionToggleStatus, enabled);
  setStatus(enabled ? '已开启：选中文本翻译' : '已关闭：选中文本翻译', enabled ? 'ok' : '');

  // 通知当前标签页的content script更新选中翻译状态
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_SELECTION_TRANSLATION',
        enabled: enabled
      });
    }
  } catch (e) {
    // 忽略错误（可能是页面不支持或其他原因）
    console.warn('Failed to notify content script about selection translation toggle:', e);
  }
});

// 确保当前标签页已经有内容脚本，返回漂浮按钮状态
async function ensureFloatingButtonContentScript(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: 'QUERY_FLOATING_BUTTON' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] });
    return await chrome.tabs.sendMessage(tabId, { type: 'QUERY_FLOATING_BUTTON' });
  }
}

// 漂浮翻译按钮开关：先确认页面可用，再持久化并通知 content script
floatingToggle?.addEventListener('change', async (e) => {
  const enabled = !!e.target.checked;
  const previous = !enabled;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('没有可操作的当前标签页');
    await ensureFloatingButtonContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_FLOATING_BUTTON',
      enabled
    });
    if (!response?.ok) {
      throw new Error(response?.error || '页面没有确认漂浮按钮状态');
    }
    await chrome.storage.sync.set({ floatingButtonEnabled: enabled });
    updateToggleStatus(floatingToggle, floatingToggleStatus, enabled);
    setStatus(enabled ? '已开启：漂浮翻译按钮' : '已关闭：漂浮翻译按钮', enabled ? 'ok' : '');
  } catch (error) {
    e.target.checked = previous;
    updateToggleStatus(floatingToggle, floatingToggleStatus, previous);
    setStatus('当前页面无法切换漂浮按钮：' + String(error?.message || error || ''), 'err');
    console.warn('Failed to toggle floating button:', error);
  }
});

function bindSelectionDisplayToggle(toggle, status, key, label) {
  toggle?.addEventListener('change', async (e) => {
    const enabled = !!e.target.checked;
    try {
      await chrome.storage.sync.set({ [key]: enabled });
      updateToggleStatus(toggle, status, enabled);
      setStatus(`${enabled ? '已开启' : '已关闭'}：${label}`, enabled ? 'ok' : '');
    } catch (error) {
      e.target.checked = !enabled;
      updateToggleStatus(toggle, status, !enabled);
      setStatus(`${label}设置失败：${String(error?.message || error || '')}`, 'err');
    }
  });
}

bindSelectionDisplayToggle(selectionBilingualToggle, selectionBilingualToggleStatus, SELECTION_SHOW_BILINGUAL_KEY, '面板显示双语');
bindSelectionDisplayToggle(selectionSourceToggle, selectionSourceToggleStatus, SELECTION_SHOW_SOURCE_KEY, '显示翻译来源');
sameLanguageModeSelect?.addEventListener('change', async (event) => {
  const previous = event.target.value === 'translate' ? 'skip' : 'translate';
  const mode = event.target.value === 'translate' ? 'translate' : 'skip';
  try {
    await chrome.storage.sync.set({ [SAME_LANGUAGE_MODE_KEY]: mode });
    if (sameLanguageModeStatus) sameLanguageModeStatus.textContent = mode === 'translate'
      ? uiMessage('sameLanguageContinue', '同语言时继续翻译')
      : uiMessage('sameLanguageKeepOriginal', '同语言时保留原文');
    setStatus(mode === 'translate' ? uiMessage('sameLanguageContinueStatus', '同语言时将继续翻译') : uiMessage('sameLanguageKeepOriginal', '同语言时保留原文'), 'ok');
  } catch (error) {
    event.target.value = previous;
    setStatus('同语言处理设置失败：' + String(error?.message || error || ''), 'err');
  }
});

defaultEngineSelect?.addEventListener('change', async () => {
  const selectedEngine = defaultEngineSelect.value;
  const previousEngine = lastGlobalEngine;
  pendingGlobalEngineSelection = selectedEngine;
  try {
    await saveGlobalTranslationEngine(selectedEngine);
    await loadTranslationEngineSettings();
    if (pendingGlobalEngineSelection === selectedEngine) pendingGlobalEngineSelection = null;
    lastGlobalEngine = selectedEngine;
    setStatus(`已更新全局默认翻译：${translationEngineLabel(selectedEngine)}`, 'ok');
  } catch (error) {
    if (pendingGlobalEngineSelection === selectedEngine) pendingGlobalEngineSelection = null;
    defaultEngineSelect.value = previousEngine;
    setStatus('默认翻译设置失败：' + String(error?.message || error || ''), 'err');
  }
});

saveLlmProfileBtn?.addEventListener('click', async () => {
  try {
    await saveLlmProfile();
    setStatus('大模型接口配置已保存，可在默认翻译引擎中选择大模型翻译', 'ok');
  } catch (error) {
    if (llmProfileStatus) llmProfileStatus.textContent = '配置无效';
    setStatus('大模型配置失败：' + String(error?.message || error || ''), 'err');
  }
});

providerStageSelect?.addEventListener('change', async () => {
  const selectedId = providerStageSelect.value === 'online' ? activeOnlineProvider : activeLlmProvider;
  renderProviderOptions(selectedId);
  applyProviderProfileToInputs();
});

providerSelect?.addEventListener('change', () => {
  applyProviderProfileToInputs();
});

saveProviderProfileBtn?.addEventListener('click', async () => {
  const previous = saveProviderProfileBtn.textContent;
  const actionButtons = [saveProviderProfileBtn, testProviderBtn].filter(Boolean);
  actionButtons.forEach((button) => { button.disabled = true; });
  saveProviderProfileBtn.classList.add('loading');
  saveProviderProfileBtn.setAttribute('aria-busy', 'true');
  setProviderProfileStatus('正在保存…', 'neutral');
  try {
    await saveProviderProfile();
    setStatus(`已保存：${getProviderDefinition(currentProviderId())?.label || currentProviderId()}`, 'ok');
  } catch (error) {
    setProviderProfileStatus('配置不完整', 'error');
    setStatus('翻译服务配置失败：' + String(error?.message || error || ''), 'err');
  } finally {
    actionButtons.forEach((button) => { button.disabled = false; });
    saveProviderProfileBtn.classList.remove('loading');
    saveProviderProfileBtn.removeAttribute('aria-busy');
    saveProviderProfileBtn.textContent = previous || '保存服务配置';
  }
});

testProviderBtn?.addEventListener('click', async () => {
  const previous = testProviderBtn.textContent;
  const actionButtons = [saveProviderProfileBtn, testProviderBtn].filter(Boolean);
  actionButtons.forEach((button) => { button.disabled = true; });
  testProviderBtn.classList.add('loading');
  testProviderBtn.setAttribute('aria-busy', 'true');
  testProviderBtn.textContent = '测试中…';
  setProviderProfileStatus('正在连接…', 'neutral');
  try {
    await testProviderProfile();
    setStatus('翻译服务连接测试成功', 'ok');
  } catch (error) {
    setProviderProfileStatus('连接失败', 'error');
    setStatus('翻译服务测试失败：' + String(error?.message || error || ''), 'err');
  } finally {
    actionButtons.forEach((button) => { button.disabled = false; });
    testProviderBtn.classList.remove('loading');
    testProviderBtn.removeAttribute('aria-busy');
    testProviderBtn.textContent = previous || '测试连接';
  }
});

setSiteEngineBtn?.addEventListener('click', async () => {
  try {
    const engineId = defaultEngineSelect?.value || TRANSLATION_ENGINE_LOCAL;
    await setCurrentSiteTranslationEngine(engineId);
    await loadTranslationEngineSettings();
    setStatus(uiMessage('setSiteEngineSuccess', `已将${translationEngineLabel(engineId)}设为当前网站默认`, [translationEngineLabel(engineId)]), 'ok');
  } catch (error) {
    setStatus('网站默认设置失败：' + String(error?.message || error || ''), 'err');
  }
});

clearSiteEngineBtn?.addEventListener('click', async () => {
  try {
    await clearCurrentSiteTranslationEngine();
    await loadTranslationEngineSettings();
    setStatus(uiMessage('siteDefaultCleared', '已清除当前网站默认，跟随全局设置'), 'ok');
  } catch (error) {
    setStatus('清除网站默认失败：' + String(error?.message || error || ''), 'err');
  }
});

// 手动：翻译当前网页
manualPageBtn?.addEventListener('click', async () => {
  try {
    await chrome.storage.sync.set({ autoTranslateTargetLang: targetSelect.value });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["contentScript.js"] });
    await chrome.tabs.sendMessage(tab.id, { type: 'START_PAGE_TRANSLATION', targetLang: targetSelect.value });
    setStatus('已翻译当前网页', 'ok');
  } catch (e) {
    setStatus('网页翻译失败：' + String(e?.message || e || ''), 'err');
  }
});

// 手动：结构化翻译当前网页并打开独立阅读页
structuredPageBtn?.addEventListener('click', async () => {
  if (structuredPageBtn) structuredPageBtn.disabled = true;
  try {
    await chrome.storage.sync.set({ autoTranslateTargetLang: targetSelect.value });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['contentScript.js'] });
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'OPEN_STRUCTURED_PAGE_READER',
      targetLang: targetSelect.value,
      engineId: defaultEngineSelect?.value || TRANSLATION_ENGINE_LOCAL
    });
    if (!response?.ok) throw new Error(response?.error || '结构化阅读未启动');
    setStatus('已打开结构化双语阅读页', 'ok');
  } catch (e) {
    setStatus('结构化阅读失败：' + String(e?.message || e || ''), 'err');
  } finally {
    if (structuredPageBtn) structuredPageBtn.disabled = false;
  }
});

// 手动：恢复原状
restorePageBtn?.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'STOP_PAGE_TRANSLATION' });
    setStatus('已恢复原状', '');
  } catch (e) {
    setStatus('恢复失败：' + String(e?.message || e || ''), 'err');
  }
});

// 当目标语言改变时，保存设置；只有在自动翻译开启且页面已翻译时才实时切换
targetSelect?.addEventListener('change', async () => {
  await chrome.storage.sync.set({ autoTranslateTargetLang: targetSelect.value });

  // 只有在自动翻译开启时才自动翻译页面
  try {
    const settings = await chrome.storage.sync.get(['autoTranslateEnabled']);
    if (!settings.autoTranslateEnabled) {
      return; // 自动翻译未开启，不执行翻译
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // 检查页面是否已经在翻译状态
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'QUERY_STATUS' });
    if (response?.enabled) {
      // 页面已翻译，切换目标语言
      await chrome.tabs.sendMessage(tab.id, { type: 'START_PAGE_TRANSLATION', targetLang: targetSelect.value });
    }
  } catch (e) {
    // 忽略错误（可能是页面不支持或其他原因）
  }
});

// 反馈按钮：打开GitHub Issues页面
feedbackBtn?.addEventListener('click', () => {
  const feedbackUrl = 'https://github.com/salimongo/Anwara-Translator/issues';
  chrome.tabs.create({ url: feedbackUrl });
  setStatus('已打开GitHub反馈页面，感谢您的反馈！', 'ok');
});

// 项目仓库按钮
emailFeedbackBtn?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/salimongo/Anwara-Translator' });
  setStatus('已打开 Anwara Translator 项目仓库', 'ok');
});

// 白名单测试函数（调试用）
function testWhitelistMatching() {
  const testUrls = [
    'https://google.com',
    'https://www.google.com',
    'https://translate.google.com',
    'https://google.com/search',
    'https://www.google.com/admin/index',
    'https://github.com',
    'https://www.github.com',
    'https://api.github.com'
  ];
  
  const testPatterns = [
    'google.com',          // 精确匹配 google.com
    '*.google.com',        // 匹配所有 google.com 子域名
    'google.com/search',   // 精确匹配特定路径
    'github.com'           // 精确匹配 github.com
  ];
  
  console.log('白名单精确匹配测试结果：');
  
  testPatterns.forEach(pattern => {
    console.log(`\n匹配模式: ${pattern}`);
    testUrls.forEach(url => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;
        const fullPath = hostname + pathname;
        
        let matches = false;
        
        if (pattern.includes('*')) {
          // 通配符匹配
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          const regex = new RegExp('^' + regexPattern + '$');
          matches = regex.test(hostname) || regex.test(fullPath);
        } else {
          // 精确匹配
          matches = hostname === pattern || fullPath === pattern;
        }
        
        console.log(`  ${url}: ${matches ? '✓ 匹配' : '✗ 不匹配'}`);
      } catch (e) {
        console.log(`  ${url}: 错误 - ${e.message}`);
      }
    });
  });
}

// Optional: update availability hint when selects change
async function updateHints() {
  const src = sourceSelect.value === "auto" ? "en" : sourceSelect.value; // best-effort for hint
  const tgt = targetSelect.value;
  const avail = await checkAvailability(src, tgt);
  if (avail) setStatus(`模型可用性：${avail}`, "");
}
sourceSelect.addEventListener("change", updateHints);
targetSelect.addEventListener("change", updateHints);

const CONSOLE_TAB_KEY = 'translatorConsoleTab';
const consoleTabs = Array.from(document.querySelectorAll('.console-tab'));
function setConsoleTab(tabName, persist = true) {
  const activeTab = ['translation', 'settings', 'archive'].includes(tabName)
    ? tabName
    : 'translation';
  document.body.dataset.activeTab = activeTab;
  consoleTabs.forEach((tab) => {
    const isActive = tab.dataset.tab === activeTab;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  if (activeTab === 'archive') {
    void loadHistoryState();
  }
  if (persist) {
    chrome.storage.local.set({ [CONSOLE_TAB_KEY]: activeTab }).catch(() => {});
  }
}
consoleTabs.forEach((tab) => {
  tab.addEventListener('click', () => setConsoleTab(tab.dataset.tab));
});
void (async () => {
  try {
    const result = await chrome.storage.local.get([CONSOLE_TAB_KEY]);
    const requestedTab = ['translation', 'settings', 'archive'].includes(result[CONSOLE_TAB_KEY])
      ? result[CONSOLE_TAB_KEY]
      : 'translation';
    if (requestedTab !== 'archive') {
      setConsoleTab(requestedTab, false);
      return;
    }

    // Keep the popup usable while an empty or damaged archive is being recovered.
    setConsoleTab('translation', false);
    await loadHistoryState();
    if (historyItems.length || readingItems.length) setConsoleTab('archive', false);
  } catch {
    setConsoleTab('translation', false);
  }
})();


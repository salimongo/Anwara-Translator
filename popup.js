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
const selectionPanelDefaultWidthInput = document.getElementById('selectionPanelDefaultWidth');
const selectionPanelDefaultHeightInput = document.getElementById('selectionPanelDefaultHeight');
const selectionPanelDefaultSizeSaveBtn = document.getElementById('selectionPanelDefaultSizeSaveBtn');
const selectionPanelDefaultSizeResetBtn = document.getElementById('selectionPanelDefaultSizeResetBtn');
const selectionPanelUseGlobalSizeToggle = document.getElementById('selectionPanelUseGlobalSizeToggle');
const selectionPanelRememberSiteSizeToggle = document.getElementById('selectionPanelRememberSiteSizeToggle');
const openPanelSizeTunerBtn = document.getElementById('openPanelSizeTunerBtn');
const openFullConsoleBtn = document.getElementById('openFullConsoleBtn');
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
const providerProfileList = document.getElementById('providerProfileList');
const providerProfileNameInput = document.getElementById('providerProfileName');
const newProviderProfileBtn = document.getElementById('newProviderProfileBtn');
const duplicateProviderProfileBtn = document.getElementById('duplicateProviderProfileBtn');
const deleteProviderProfileBtn = document.getElementById('deleteProviderProfileBtn');
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
const SELECTION_PANEL_DEFAULT_SIZE_KEY = 'translatorSelectionPanelDefaultSize';
const SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY = 'translatorSelectionPanelUseGlobalDefaultSize';
const SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY = 'translatorSelectionPanelRememberSiteSize';
const MIN_SELECTION_PANEL_WIDTH = 240;
const MIN_SELECTION_PANEL_HEIGHT = 180;
const MAX_SELECTION_PANEL_WIDTH = 1600;
const MAX_SELECTION_PANEL_HEIGHT = 1200;
const DEFAULT_SELECTION_PANEL_WIDTH = 360;
const DEFAULT_SELECTION_PANEL_HEIGHT = 220;
const CONTENT_SCRIPT_VERSION = '1.6.18';
const TRANSLATION_ENGINE_KEY = 'translatorDefaultEngine';
const TRANSLATION_SITE_ENGINES_KEY = 'translatorSiteDefaultEngines';
const TRANSLATION_ENGINE_LOCAL = 'local';
const LLM_PROFILE_KEY = 'translatorLlmProfile';
const PROVIDER_PROFILES_KEY = 'translatorProviderProfiles';
const PROVIDER_CREDENTIALS_KEY = 'translatorProviderCredentials';
const PROVIDER_ACTIVE_PROFILE_KEY = 'translatorProviderActiveProfileIds';
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
let providerProfileConfigs = {};
let providerCredentials = {};
let providerActiveProfileIds = {};
let editingProviderProfileIds = {};
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
const historySearchInput = document.getElementById('historySearchInput');
const historyEngineFilter = document.getElementById('historyEngineFilter');
const historySiteFilter = document.getElementById('historySiteFilter');
const historyDedupeToggle = document.getElementById('historyDedupeToggle');
const historyUndoBtn = document.getElementById('historyUndoBtn');
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
let clearConfirmView = null;
let clearConfirmTimer = null;
let dateDeleteSignature = null;
let dateDeleteConfirmTimer = null;
let archiveUndo = null;
let archiveUndoTimer = null;

function normalizeStoredItems(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim()
  ));
}

function getClearLabel(view) {
  return view === 'reading'
    ? uiMessage('clearReading', '清空阅读区')
    : uiMessage('clearHistory', '清空历史');
}

function resetClearConfirmation() {
  if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
  clearConfirmTimer = null;
  clearConfirmView = null;
  if (clearHistoryBtn) clearHistoryBtn.textContent = getClearLabel(getActiveArchiveView());
}

function armClearConfirmation(view, count) {
  if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
  clearConfirmView = view;
  if (clearHistoryBtn) clearHistoryBtn.textContent = '再次点击确认';
  setHistoryStatus(`再点击一次“${getClearLabel(view)}”以清空 ${count} 条记录`, 'err');
  clearConfirmTimer = setTimeout(() => {
    resetClearConfirmation();
    setHistoryStatus('');
  }, 3500);
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
  if (clearHistoryBtn) clearHistoryBtn.textContent = clearConfirmView === activeView
    ? '再次点击确认'
    : getClearLabel(activeView);
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
  if (!item?.id || !chrome?.runtime?.sendMessage) {
    openInlineReader(item, returnView);
    return;
  }
  chrome.runtime.sendMessage({ type: 'OPEN_READER_TAB', recordId: item.id }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) openInlineReader(item, returnView);
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
  resetClearConfirmation();
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

function getHistoryDedupeKey(item) {
  return [item?.sourceText, item?.sourceLang, item?.targetLang, item?.engineId || item?.engineStage, item?.pageUrl]
    .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
    .join('␟');
}

function getFilteredHistoryItems() {
  const sourceItems = getActiveArchiveItems();
  const from = historyFromDate?.value ? new Date(`${historyFromDate.value}T00:00:00`).getTime() : null;
  const to = historyToDate?.value ? new Date(`${historyToDate.value}T23:59:59.999`).getTime() : null;
  const query = [historySearchInput?.value, historySiteFilter?.value].filter(Boolean).join(' ').trim().toLocaleLowerCase();
  const engine = historyEngineFilter?.value || '';
  const seen = new Set();
  return sourceItems.filter((item) => {
    if (from !== null && item.createdAt < from) return false;
    if (to !== null && item.createdAt > to) return false;
    if (engine && (item.engineId || item.engineStage || 'local') !== engine) return false;
    if (query) {
      const haystack = [item.sourceText, item.translatedText, item.pageTitle, item.pageUrl, item.engineId, item.engineStage, item.providerId]
        .map((value) => String(value || '').toLocaleLowerCase()).join('\n');
      if (!haystack.includes(query)) return false;
    }
    if (historyDedupeToggle?.checked) {
      const key = getHistoryDedupeKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });
}


function resetDateDeleteConfirmation() {
  if (dateDeleteConfirmTimer) clearTimeout(dateDeleteConfirmTimer);
  dateDeleteConfirmTimer = null;
  dateDeleteSignature = null;
  if (deleteDateHistoryBtn) deleteDateHistoryBtn.textContent = '删日期范围';
}

function updateArchiveUndoButton() {
  if (!historyUndoBtn) return;
  historyUndoBtn.classList.toggle('hidden', !archiveUndo);
  historyUndoBtn.textContent = archiveUndo ? '撤销（8秒）' : '撤销';
}

function clearArchiveUndo({ prune = true } = {}) {
  if (archiveUndoTimer) clearTimeout(archiveUndoTimer);
  archiveUndoTimer = null;
  archiveUndo = null;
  updateArchiveUndoButton();
  if (prune) pruneTranslationVariants().catch(() => {});
}

function armArchiveUndo(description) {
  if (archiveUndoTimer) clearTimeout(archiveUndoTimer);
  archiveUndo = {
    historyItems: historyItems.map((item) => ({ ...item })),
    readingItems: readingItems.map((item) => ({ ...item })),
    description
  };
  updateArchiveUndoButton();
  archiveUndoTimer = setTimeout(() => clearArchiveUndo({ prune: true }), 8000);
}

async function persistArchiveState(options = {}) {
  historyItems = normalizeStoredItems(historyItems);
  readingItems = normalizeStoredItems(readingItems);
  await chrome.storage.local.set({ [HISTORY_KEY]: historyItems, [READING_KEY]: readingItems });
  if (historyLoaded) renderHistoryList(options);
}

async function restoreArchiveUndo() {
  if (!archiveUndo) return;
  const snapshot = archiveUndo;
  clearArchiveUndo({ prune: false });
  historyItems = snapshot.historyItems.map((item) => ({ ...item }));
  readingItems = snapshot.readingItems.map((item) => ({ ...item }));
  try {
    await persistArchiveState();
    setHistoryStatus('已撤销：' + snapshot.description, 'ok');
  } catch (error) {
    setHistoryStatus('撤销失败：' + String(error?.message || error || ''), 'err');
  }
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

function syncHistorySelectionControls() {
  if (!historySelectAllBtn) return;
  const selections = Array.from(historyList?.querySelectorAll('.history-select') || []);
  const allSelected = selections.length > 0 && selections.every((input) => input.checked);
  historySelectAllBtn.disabled = selections.length === 0;
  historySelectAllBtn.textContent = allSelected ? '取消全选' : '全选';
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
    syncHistorySelectionControls();
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
  syncHistorySelectionControls();
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
      providerProfileKey: metadata.providerProfileKey || '',
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
    const view = getActiveArchiveView();
    if (view === 'reading' && readingIndex < 0) return;
    if (view !== 'reading' && index < 0) return;
    armArchiveUndo('删除记录');
    if (view === 'reading') readingItems.splice(readingIndex, 1);
    else historyItems.splice(index, 1);
    try {
      await persistArchiveState();
      setHistoryStatus(`已删除 1 条${view === 'reading' ? '阅读区' : '历史翻译'}记录，可在 8 秒内撤销`, 'ok');
    } catch (error) {
      await restoreArchiveUndo();
      setHistoryStatus('删除失败：' + String(error?.message || error || ''), 'err');
    }
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
historyFromDate?.addEventListener('change', () => { resetDateDeleteConfirmation(); renderHistoryList(); });
historyToDate?.addEventListener('change', () => { resetDateDeleteConfirmation(); renderHistoryList(); });
historySearchInput?.addEventListener('input', renderHistoryList);
historyEngineFilter?.addEventListener('change', renderHistoryList);
historySiteFilter?.addEventListener('input', renderHistoryList);
historyDedupeToggle?.addEventListener('change', renderHistoryList);
historyList?.addEventListener('change', (event) => {
  if (event.target?.matches?.('.history-select')) syncHistorySelectionControls();
});
historySelectAllBtn?.addEventListener('click', () => {
  const selections = Array.from(historyList?.querySelectorAll('.history-select') || []);
  const shouldSelect = selections.some((input) => !input.checked);
  selections.forEach((input) => { input.checked = shouldSelect; });
  syncHistorySelectionControls();
});
deleteSelectedHistoryBtn?.addEventListener('click', async () => {
  const selected = getSelectedHistoryIds();
  if (!selected.size) {
    setHistoryStatus('请先选择要删除的记录', 'err');
    return;
  }
  armArchiveUndo('批量删除记录');
  if (getActiveArchiveView() === 'reading') {
    readingItems = readingItems.filter((item) => !selected.has(item.id));
  } else {
    historyItems = historyItems.filter((item) => !selected.has(item.id));
  }
  try {
    await persistArchiveState();
    setHistoryStatus(`已删除 ${selected.size} 条${getActiveArchiveLabel()}记录，可在 8 秒内撤销`, 'ok');
  } catch (error) {
    await restoreArchiveUndo();
    setHistoryStatus('删除失败：' + String(error?.message || error || ''), 'err');
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
  const nextItems = sourceItems.filter((item) => !((from === null || item.createdAt >= from) && (to === null || item.createdAt <= to)));
  const removed = sourceItems.length - nextItems.length;
  if (!removed) {
    resetDateDeleteConfirmation();
    setHistoryStatus('该日期范围没有记录');
    return;
  }
  const signature = [view, from || '', to || '', removed].join('|');
  if (dateDeleteSignature !== signature) {
    resetDateDeleteConfirmation();
    dateDeleteSignature = signature;
    if (deleteDateHistoryBtn) deleteDateHistoryBtn.textContent = '再次点击确认';
    setHistoryStatus(`再次点击删除日期范围内的 ${removed} 条记录`, 'err');
    dateDeleteConfirmTimer = setTimeout(() => {
      resetDateDeleteConfirmation();
      setHistoryStatus('');
    }, 3500);
    return;
  }
  resetDateDeleteConfirmation();
  armArchiveUndo('按日期删除记录');
  if (view === 'reading') readingItems = nextItems;
  else historyItems = nextItems;
  try {
    await persistArchiveState();
    setHistoryStatus(`已删除 ${removed} 条${getActiveArchiveLabel()}记录，可在 8 秒内撤销`, 'ok');
  } catch (error) {
    await restoreArchiveUndo();
    setHistoryStatus('删除失败：' + String(error?.message || error || ''), 'err');
  }
});
historyUndoBtn?.addEventListener('click', restoreArchiveUndo);
clearHistoryBtn?.addEventListener('click', async () => {
  const view = getActiveArchiveView();
  const currentItems = getActiveArchiveItems();
  if (!currentItems.length) {
    resetClearConfirmation();
    renderHistoryList();
    setHistoryStatus(`没有可清空的${getActiveArchiveLabel()}记录`);
    return;
  }
  if (clearConfirmView !== view) {
    armClearConfirmation(view, currentItems.length);
    return;
  }
  resetClearConfirmation();
  armArchiveUndo(`清空${getActiveArchiveLabel()}记录`);

  try {
    const clearPatch = view === 'reading'
      ? { [READING_KEY]: [] }
      : { [HISTORY_KEY]: [] };
    await chrome.storage.local.set(clearPatch);
    if (view === 'reading') readingItems = [];
    else historyItems = [];
    renderHistoryList();
    setHistoryStatus(`${getActiveArchiveLabel()}已清空，可在 8 秒内撤销`, 'ok');
  } catch (error) {
    await restoreArchiveUndo();
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

function builtInSelectionPanelDefaultSize() {
  return { width: DEFAULT_SELECTION_PANEL_WIDTH, height: DEFAULT_SELECTION_PANEL_HEIGHT };
}

function normalizeSelectionPanelDefaultSize(value) {
  const width = Math.round(Number(value?.width));
  const height = Math.round(Number(value?.height));
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width < MIN_SELECTION_PANEL_WIDTH || width > MAX_SELECTION_PANEL_WIDTH) return null;
  if (height < MIN_SELECTION_PANEL_HEIGHT || height > MAX_SELECTION_PANEL_HEIGHT) return null;
  return { width, height };
}

function renderSelectionPanelDefaultSize(size) {
  const normalized = normalizeSelectionPanelDefaultSize(size) || builtInSelectionPanelDefaultSize();
  if (selectionPanelDefaultWidthInput) selectionPanelDefaultWidthInput.value = String(normalized.width);
  if (selectionPanelDefaultHeightInput) selectionPanelDefaultHeightInput.value = String(normalized.height);
}

async function loadSelectionPanelDefaultSize() {
  const stored = await chrome.storage.local.get([SELECTION_PANEL_DEFAULT_SIZE_KEY, SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY, SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY]);
  renderSelectionPanelDefaultSize(stored[SELECTION_PANEL_DEFAULT_SIZE_KEY]);
  const useGlobalSize = stored[SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY] === true;
  if (selectionPanelUseGlobalSizeToggle) selectionPanelUseGlobalSizeToggle.checked = useGlobalSize;
  if (selectionPanelRememberSiteSizeToggle) selectionPanelRememberSiteSizeToggle.checked = stored[SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY] !== false;
  updateSelectionPanelSizeScopeUi(useGlobalSize);
}

async function saveSelectionPanelDefaultSize(sizeOverride = null) {
  const size = normalizeSelectionPanelDefaultSize(sizeOverride || {
    width: selectionPanelDefaultWidthInput?.value,
    height: selectionPanelDefaultHeightInput?.value
  });
  if (!size) {
    setStatus('面板大小无效：宽度 240-1600 px，高度 180-1200 px', 'err');
    return;
  }
  await chrome.storage.local.set({ [SELECTION_PANEL_DEFAULT_SIZE_KEY]: size });
  const stored = await chrome.storage.local.get([SELECTION_PANEL_DEFAULT_SIZE_KEY]);
  const verified = normalizeSelectionPanelDefaultSize(stored[SELECTION_PANEL_DEFAULT_SIZE_KEY]);
  if (!verified || verified.width !== size.width || verified.height !== size.height) {
    throw new Error('默认面板大小保存后校验失败');
  }
  renderSelectionPanelDefaultSize(verified);
  setStatus('默认面板大小已保存', 'ok');
}

async function resetSelectionPanelDefaultSize() {
  await chrome.storage.local.remove([SELECTION_PANEL_DEFAULT_SIZE_KEY]);
  renderSelectionPanelDefaultSize(builtInSelectionPanelDefaultSize());
  setStatus('已恢复默认面板大小', 'ok');
}

function openConsolePanelSizeTuner() {
  const existing = document.getElementById('consolePanelSizeTuner');
  if (existing) return;

  let size = normalizeSelectionPanelDefaultSize({
    width: selectionPanelDefaultWidthInput?.value,
    height: selectionPanelDefaultHeightInput?.value
  }) || builtInSelectionPanelDefaultSize();
  let position = { left: 24, top: 24 };
  const overlay = document.createElement('div');
  overlay.id = 'consolePanelSizeTuner';
  overlay.className = 'console-size-tuner-backdrop';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '选句翻译面板尺寸预览');
  overlay.innerHTML = `
    <section class="console-size-tuner">
      <header class="console-size-tuner-header">
        <div class="console-size-tuner-title">
          <strong>选句翻译</strong>
          <span class="console-size-tuner-dimensions"></span>
        </div>
        <button class="console-size-tuner-close" type="button" aria-label="关闭尺寸预览" title="关闭">×</button>
      </header>
      <div class="console-size-tuner-body">
        <p class="console-size-tuner-source">Every small choice shapes the road ahead.</p>
        <div class="console-size-tuner-divider"></div>
        <p class="console-size-tuner-translation">每一个微小的选择，都会塑造前方的道路。</p>
      </div>
      <footer class="console-size-tuner-footer">
        <span class="console-size-tuner-meta">本地翻译 · 英语 → 简体中文</span>
        <span class="console-size-tuner-status small" aria-live="polite"></span>
        <button class="btn console-size-tuner-save" type="button" title="保存为全局大小">保存</button>
      </footer>
      <span class="console-size-tuner-handle" aria-hidden="true"></span>
    </section>`;

  const panel = overlay.querySelector('.console-size-tuner');
  const header = overlay.querySelector('.console-size-tuner-header');
  const dimensions = overlay.querySelector('.console-size-tuner-dimensions');
  const handle = overlay.querySelector('.console-size-tuner-handle');
  const closeButton = overlay.querySelector('.console-size-tuner-close');
  const saveButton = overlay.querySelector('.console-size-tuner-save');
  const localStatus = overlay.querySelector('.console-size-tuner-status');
  const clampPosition = () => {
    position.left = Math.max(12, Math.min(position.left, Math.max(12, window.innerWidth - size.width - 12)));
    position.top = Math.max(12, Math.min(position.top, Math.max(12, window.innerHeight - size.height - 12)));
  };
  const render = () => {
    clampPosition();
    panel.style.width = `${size.width}px`;
    panel.style.height = `${size.height}px`;
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
    dimensions.textContent = `${size.width} × ${size.height}`;
  };
  const close = () => overlay.remove();
  const bindDrag = (trigger, onMove) => {
    trigger.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      const start = { x: event.clientX, y: event.clientY, left: position.left, top: position.top, width: size.width, height: size.height };
      const move = (moveEvent) => onMove(start, moveEvent);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
    });
  };

  bindDrag(header, (start, event) => {
    position = { left: start.left + event.clientX - start.x, top: start.top + event.clientY - start.y };
    render();
  });
  bindDrag(handle, (start, event) => {
    size = {
      width: Math.min(MAX_SELECTION_PANEL_WIDTH, Math.max(MIN_SELECTION_PANEL_WIDTH, Math.round(start.width + event.clientX - start.x))),
      height: Math.min(MAX_SELECTION_PANEL_HEIGHT, Math.max(MIN_SELECTION_PANEL_HEIGHT, Math.round(start.height + event.clientY - start.y)))
    };
    render();
  });
  closeButton.addEventListener('click', close);
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    try {
      await saveSelectionPanelDefaultSize(size);
      localStatus.textContent = '已保存';
    } catch (error) {
      localStatus.textContent = '保存失败';
    } finally {
      saveButton.disabled = false;
    }
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  document.body.appendChild(overlay);
  position = { left: Math.round((window.innerWidth - size.width) / 2), top: Math.round((window.innerHeight - size.height) / 2) };
  render();
  closeButton.focus();
}

function getSiteKeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.origin && parsed.origin !== 'null' ? parsed.origin : null;
  } catch {
    return null;
  }
}

async function getActiveTranslationSiteKey() {
  const tab = await getOperationalTab();
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

const PROVIDER_SECRET_FIELDS = ['apiKey', 'appId', 'appSecret'];
const DEFAULT_PROVIDER_PROFILE_ID = 'default';

function makeProviderProfileStorageKey(providerId, profileId) {
  return `${providerId}::${profileId}`;
}

function makeProviderProfileId() {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitProviderProfile(profile = {}) {
  const config = { ...profile };
  const credentials = {};
  for (const field of PROVIDER_SECRET_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(config, field)) {
      credentials[field] = String(config[field] ?? '');
      delete config[field];
    }
  }
  return { config, credentials };
}

function mergeProviderProfile(config = {}, credentials = {}) {
  return { ...config, ...credentials };
}

function normalizeProfileName(value, fallback = '默认配置') {
  return String(value || '').trim().slice(0, 48) || fallback;
}

function getProviderProfileEntries(providerId) {
  return Object.entries(providerProfileConfigs)
    .filter(([, profile]) => profile?.providerId === providerId)
    .map(([storageKey, profile]) => ({ storageKey, ...profile }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function getActiveProviderProfileStorageKey(providerId) {
  const requested = providerActiveProfileIds[providerId];
  if (requested && providerProfileConfigs[requested]?.providerId === providerId) return requested;
  return getProviderProfileEntries(providerId)[0]?.storageKey || '';
}

function getEditingProviderProfileStorageKey(providerId) {
  const requested = editingProviderProfileIds[providerId];
  if (requested && providerProfileConfigs[requested]?.providerId === providerId) return requested;
  return getActiveProviderProfileStorageKey(providerId);
}

function getMergedProviderProfileByStorageKey(storageKey) {
  return mergeProviderProfile(providerProfileConfigs[storageKey] || {}, providerCredentials[storageKey] || {});
}

function refreshActiveProviderProfiles() {
  providerProfiles = {};
  for (const definition of PROVIDER_DEFINITIONS) {
    const storageKey = getActiveProviderProfileStorageKey(definition.id);
    if (storageKey) providerProfiles[definition.id] = getMergedProviderProfileByStorageKey(storageKey);
  }
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
    const sensitiveShell = element.closest('.sensitive-input-shell');
    if (sensitiveShell) sensitiveShell.style.display = visible ? '' : 'none';
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

function renderProviderProfileList() {
  if (!providerProfileList) return;
  const providerId = currentProviderId();
  const entries = getProviderProfileEntries(providerId);
  const activeStorageKey = getActiveProviderProfileStorageKey(providerId);
  const editingStorageKey = getEditingProviderProfileStorageKey(providerId);
  providerProfileList.textContent = '';
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'provider-profile-empty';
    empty.textContent = '尚未创建配置档案';
    providerProfileList.appendChild(empty);
    return;
  }
  entries.forEach((entry) => {
    const row = document.createElement('div');
    const isActive = entry.storageKey === activeStorageKey;
    row.className = 'provider-profile-row' + (entry.storageKey === editingStorageKey ? ' is-editing' : '') + (isActive ? ' is-active' : '');

    const useLabel = document.createElement('label');
    useLabel.className = 'provider-profile-use';
    useLabel.title = isActive ? '当前翻译将使用此配置' : '设为当前翻译配置';
    const use = document.createElement('input');
    use.type = 'radio';
    use.name = `active-provider-profile-${providerId}`;
    use.checked = isActive;
    use.setAttribute('aria-label', `使用配置：${entry.name || '未命名配置'}`);
    use.addEventListener('change', () => {
      if (use.checked) void activateProviderProfile(entry.storageKey);
    });
    useLabel.appendChild(use);

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'provider-profile-select';
    const name = document.createElement('span');
    name.className = 'provider-profile-name';
    name.textContent = entry.name || '未命名配置';
    const meta = document.createElement('span');
    meta.className = 'provider-profile-meta';
    const ready = providerProfileIsReady(providerId, getMergedProviderProfileByStorageKey(entry.storageKey));
    meta.textContent = isActive
      ? (ready ? '当前使用 · 已配置' : '当前使用 · 待配置')
      : (ready ? '已配置' : '待配置');
    select.title = `${entry.name || '未命名配置'}：${meta.textContent}`;
    select.append(name, meta);
    select.addEventListener('click', () => {
      editingProviderProfileIds[providerId] = entry.storageKey;
      renderProviderProfileList();
      applyProviderProfileToInputs();
    });
    row.append(useLabel, select);
    providerProfileList.appendChild(row);
  });
}

function applyProviderProfileToInputs() {
  const providerId = currentProviderId();
  const definition = getProviderDefinition(providerId);
  const storageKey = getEditingProviderProfileStorageKey(providerId);
  const profile = { ...providerProfileDefaults(definition), ...(storageKey ? getMergedProviderProfileByStorageKey(storageKey) : {}) };
  if (providerProfileNameInput) providerProfileNameInput.value = profile.name || '默认配置';
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
  renderProviderProfileList();
  const ready = providerProfileIsReady(providerId, profile);
  setProviderProfileStatus(storageKey ? (ready ? '当前档案可用' : '当前档案待配置') : '新建档案后保存', ready ? 'ok' : 'neutral');
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
  const settings = await chrome.storage.local.get([
    PROVIDER_PROFILES_KEY,
    PROVIDER_CREDENTIALS_KEY,
    PROVIDER_ACTIVE_PROFILE_KEY,
    LLM_PROFILE_KEY,
    ONLINE_PROVIDER_KEY,
    LLM_PROVIDER_KEY,
    TRANSLATION_ENGINE_KEY
  ]);
  const storedConfigs = settings[PROVIDER_PROFILES_KEY] && typeof settings[PROVIDER_PROFILES_KEY] === 'object'
    ? { ...settings[PROVIDER_PROFILES_KEY] } : {};
  const storedCredentials = settings[PROVIDER_CREDENTIALS_KEY] && typeof settings[PROVIDER_CREDENTIALS_KEY] === 'object'
    ? { ...settings[PROVIDER_CREDENTIALS_KEY] } : {};
  const storedActive = settings[PROVIDER_ACTIVE_PROFILE_KEY] && typeof settings[PROVIDER_ACTIVE_PROFILE_KEY] === 'object'
    ? { ...settings[PROVIDER_ACTIVE_PROFILE_KEY] } : {};
  const legacyOpenAi = settings[LLM_PROFILE_KEY] && typeof settings[LLM_PROFILE_KEY] === 'object'
    ? settings[LLM_PROFILE_KEY]
    : null;

  let migrated = Boolean(legacyOpenAi);
  providerProfileConfigs = {};
  providerCredentials = {};
  const legacyEntries = { ...storedConfigs };
  if (legacyOpenAi && !Object.values(legacyEntries).some((profile) => profile?.providerId === 'openai')) {
    legacyEntries.openai = { ...legacyOpenAi, ...(legacyEntries.openai || {}) };
  }

  for (const [storedKey, rawProfile] of Object.entries(legacyEntries)) {
    if (!rawProfile || typeof rawProfile !== 'object') continue;
    const isNewRecord = Boolean(rawProfile.providerId && rawProfile.profileId);
    const providerId = isNewRecord ? rawProfile.providerId : storedKey;
    const profileId = isNewRecord ? rawProfile.profileId : DEFAULT_PROVIDER_PROFILE_ID;
    const storageKey = isNewRecord ? storedKey : makeProviderProfileStorageKey(providerId, profileId);
    const { config, credentials } = splitProviderProfile(rawProfile);
    const profileConfig = {
      ...config,
      providerId,
      profileId,
      name: normalizeProfileName(config.name, profileId === DEFAULT_PROVIDER_PROFILE_ID ? '默认配置' : '未命名配置'),
      createdAt: Number(config.createdAt) || Date.now(),
      updatedAt: Number(config.updatedAt) || Date.now()
    };
    providerProfileConfigs[storageKey] = profileConfig;
    const storedCredential = storedCredentials[storageKey] || storedCredentials[providerId] || {};
    providerCredentials[storageKey] = { ...credentials, ...storedCredential };
    if (!isNewRecord || storedCredentials[providerId]) migrated = true;
  }

  providerActiveProfileIds = {};
  for (const definition of PROVIDER_DEFINITIONS) {
    const entries = getProviderProfileEntries(definition.id);
    if (!entries.length) continue;
    const requested = storedActive[definition.id];
    const activeStorageKey = requested && providerProfileConfigs[requested]?.providerId === definition.id
      ? requested
      : entries[0].storageKey;
    providerActiveProfileIds[definition.id] = activeStorageKey;
    if (requested !== activeStorageKey) migrated = true;
    editingProviderProfileIds[definition.id] = activeStorageKey;
  }
  refreshActiveProviderProfiles();

  if (migrated) {
    await chrome.storage.local.set({
      [PROVIDER_PROFILES_KEY]: providerProfileConfigs,
      [PROVIDER_CREDENTIALS_KEY]: providerCredentials,
      [PROVIDER_ACTIVE_PROFILE_KEY]: providerActiveProfileIds
    });
    if (legacyOpenAi) await chrome.storage.local.remove([LLM_PROFILE_KEY]);
  }

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
  const siteScopedActionsAvailable = Boolean(siteKey) && !isFullConsole;
  [setSiteEngineBtn, clearSiteEngineBtn].filter(Boolean).forEach((button) => {
    button.disabled = !siteScopedActionsAvailable;
    button.title = siteScopedActionsAvailable ? '' : isFullConsole
      ? '完整控制台中不能设置当前网站默认'
      : '仅支持 HTTP/HTTPS 网页';
  });
  if (isFullConsole && engineScopeStatus) {
    engineScopeStatus.textContent = '完整控制台中不能设置当前网站默认';
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

async function persistProviderProfile(providerId, profile, options = {}) {
  const profileId = options.profileId || providerProfileConfigs[getEditingProviderProfileStorageKey(providerId)]?.profileId || makeProviderProfileId();
  const storageKey = makeProviderProfileStorageKey(providerId, profileId);
  const existing = providerProfileConfigs[storageKey] || {};
  const name = normalizeProfileName(options.name ?? providerProfileNameInput?.value, existing.name || '新配置');
  if (!options.allowIncomplete && !providerProfileIsReady(providerId, profile)) {
    throw new Error('请补齐该服务所需的地址、密钥、模型或账号字段');
  }
  const { config, credentials } = splitProviderProfile(profile);
  providerProfileConfigs = {
    ...providerProfileConfigs,
    [storageKey]: {
      ...config,
      providerId,
      profileId,
      name,
      createdAt: existing.createdAt || Date.now(),
      updatedAt: Date.now()
    }
  };
  providerCredentials = { ...providerCredentials, [storageKey]: credentials };
  editingProviderProfileIds[providerId] = storageKey;
  const shouldActivate = options.activate === true || !getActiveProviderProfileStorageKey(providerId);
  if (shouldActivate) providerActiveProfileIds = { ...providerActiveProfileIds, [providerId]: storageKey };
  refreshActiveProviderProfiles();
  const stageKey = options.stageKey || currentProviderStorageKey();
  const patch = {
    [PROVIDER_PROFILES_KEY]: providerProfileConfigs,
    [PROVIDER_CREDENTIALS_KEY]: providerCredentials,
    [PROVIDER_ACTIVE_PROFILE_KEY]: providerActiveProfileIds
  };
  if (options.updateStage !== false) patch[stageKey] = providerId;
  await chrome.storage.local.set(patch);
  if (providerId === 'openai') await chrome.storage.local.remove([LLM_PROFILE_KEY]);
  if (options.updateStage !== false) {
    activeOnlineProvider = stageKey === ONLINE_PROVIDER_KEY ? providerId : activeOnlineProvider;
    activeLlmProvider = stageKey === LLM_PROVIDER_KEY ? providerId : activeLlmProvider;
  }
  return storageKey;
}

async function activateProviderProfile(storageKey) {
  const profile = providerProfileConfigs[storageKey];
  if (!profile) return;
  const merged = getMergedProviderProfileByStorageKey(storageKey);
  if (!providerProfileIsReady(profile.providerId, merged)) {
    editingProviderProfileIds[profile.providerId] = storageKey;
    applyProviderProfileToInputs();
    setProviderProfileStatus('请先补齐此档案再设为当前使用', 'error');
    return;
  }
  providerActiveProfileIds = { ...providerActiveProfileIds, [profile.providerId]: storageKey };
  editingProviderProfileIds[profile.providerId] = storageKey;
  refreshActiveProviderProfiles();
  const stageKey = getProviderDefinition(profile.providerId)?.stage === 'online' ? ONLINE_PROVIDER_KEY : LLM_PROVIDER_KEY;
  await chrome.storage.local.set({
    [PROVIDER_ACTIVE_PROFILE_KEY]: providerActiveProfileIds,
    [stageKey]: profile.providerId
  });
  if (stageKey === ONLINE_PROVIDER_KEY) activeOnlineProvider = profile.providerId;
  else activeLlmProvider = profile.providerId;
  renderProviderProfileList();
  applyProviderProfileToInputs();
  setProviderProfileStatus('已设为当前使用', 'ok');
}

async function createProviderProfile(copyCurrent = false) {
  const providerId = currentProviderId();
  const definition = getProviderDefinition(providerId);
  const currentStorageKey = getEditingProviderProfileStorageKey(providerId);
  const current = copyCurrent && currentStorageKey
    ? getMergedProviderProfileByStorageKey(currentStorageKey)
    : providerProfileDefaults(definition);
  const name = copyCurrent
    ? `${normalizeProfileName(current.name, '配置')} 副本`
    : '新配置';
  const storageKey = await persistProviderProfile(providerId, { ...current, name }, {
    profileId: makeProviderProfileId(),
    name,
    allowIncomplete: true,
    activate: false
  });
  editingProviderProfileIds[providerId] = storageKey;
  renderProviderProfileList();
  applyProviderProfileToInputs();
  setProviderProfileStatus(copyCurrent ? '已创建配置副本' : '已创建新配置', 'neutral');
}

async function deleteCurrentProviderProfile() {
  const providerId = currentProviderId();
  const storageKey = getEditingProviderProfileStorageKey(providerId);
  const entries = getProviderProfileEntries(providerId);
  if (!storageKey || entries.length <= 1) {
    setProviderProfileStatus('每个服务至少保留一个配置档案', 'error');
    return;
  }
  const name = providerProfileConfigs[storageKey]?.name || '当前配置';
  if (!window.confirm(`确定删除“${name}”吗？此操作会同时删除其本机凭证。`)) return;
  const nextConfigs = { ...providerProfileConfigs };
  const nextCredentials = { ...providerCredentials };
  delete nextConfigs[storageKey];
  delete nextCredentials[storageKey];
  const fallback = entries.find((entry) => entry.storageKey !== storageKey)?.storageKey || '';
  providerProfileConfigs = nextConfigs;
  providerCredentials = nextCredentials;
  editingProviderProfileIds[providerId] = fallback;
  if (providerActiveProfileIds[providerId] === storageKey) providerActiveProfileIds = { ...providerActiveProfileIds, [providerId]: fallback };
  refreshActiveProviderProfiles();
  await chrome.storage.local.set({
    [PROVIDER_PROFILES_KEY]: providerProfileConfigs,
    [PROVIDER_CREDENTIALS_KEY]: providerCredentials,
    [PROVIDER_ACTIVE_PROFILE_KEY]: providerActiveProfileIds
  });
  renderProviderProfileList();
  applyProviderProfileToInputs();
  setProviderProfileStatus('已删除配置档案', 'ok');
}

async function saveLlmProfile() {
  const profile = {
    baseUrl: String(llmBaseUrlInput?.value || '').trim().replace(/\/+$/, ''),
    model: String(llmModelInput?.value || '').trim(),
    apiKey: String(llmApiKeyInput?.value || '').trim()
  };
  if (!isLlmProfileReady(profile)) throw new Error('请填写有效的 HTTPS API 地址和模型名称');
  await persistProviderProfile('openai', profile, { profileId: DEFAULT_PROVIDER_PROFILE_ID, name: '默认配置', activate: true, stageKey: LLM_PROVIDER_KEY });
  if (llmProfileStatus) llmProfileStatus.textContent = uiMessage('configuredModel', `已配置：${profile.model}`, [profile.model]);
  await loadTranslationEngineSettings();
}

async function saveProviderProfile() {
  const providerId = currentProviderId();
  await persistProviderProfile(providerId, readProviderProfileFromInputs(), { name: providerProfileNameInput?.value });
  await loadTranslationEngineSettings();
  setProviderProfileStatus('已保存到本机凭证存储', 'ok');
}

async function testProviderProfile() {
  const providerId = currentProviderId();
  const profileId = providerProfileConfigs[getEditingProviderProfileStorageKey(providerId)]?.profileId || '';
  const storageKey = await persistProviderProfile(providerId, readProviderProfileFromInputs(), { profileId, name: providerProfileNameInput?.value });
  const response = await chrome.runtime.sendMessage({ type: 'TEST_TRANSLATION_PROVIDER', providerId, profileKey: storageKey, targetLang: targetSelect?.value || 'zh-Hans' });
  if (!response?.ok) throw new Error(response?.error || '测试请求失败');
  setProviderProfileStatus('连接成功，配置已保存', 'ok');
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
    const tab = await getOperationalTab();
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
      const providerProfileKey = getActiveProviderProfileStorageKey(providerId);
      const response = await chrome.runtime.sendMessage({ type: 'TRANSLATE_WITH_PROVIDER', text, sourceLang: sourceLanguage, targetLang: targetLanguage, providerId, profileKey: providerProfileKey });
      if (!response?.ok) throw new Error(response?.error || 'PROVIDER_TRANSLATION_FAILED');
      const translation = String(response.translation || '');
      if (!translation.trim()) throw new Error('PROVIDER_EMPTY_RESPONSE');
      outputEl.textContent = translation;
      setCopyEnabled(true);
      setSpeakEnabled(true);
      await recordManualTranslationHistory(text, translation, sourceLanguage, targetLanguage, { engineId: selectedEngine, engineStage: selectedEngine, providerId, providerProfileKey });
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
    await loadSelectionPanelDefaultSize();
    
    // 加载白名单和默认引擎；历史记录切到历史页时再按需加载
    await loadWhitelist();
    await loadTranslationEngineSettings();
  } catch (error) {
    setStatus('设置加载失败：' + String(error?.message || error || ''), 'err');
  }

  try {
    const tab = await getOperationalTab();
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
  const previous = !enabled;
  try {
    await chrome.storage.sync.set({ autoTranslateEnabled: enabled, autoTranslateTargetLang: targetSelect.value });
    updateToggleStatus(autoToggle, autoToggleStatus, enabled);
    setStatus(enabled ? '已开启：自动翻译网页' : '已关闭：自动翻译网页', enabled ? 'ok' : '');
  } catch (error) {
    e.target.checked = previous;
    updateToggleStatus(autoToggle, autoToggleStatus, previous);
    setStatus('自动翻译设置失败：' + String(error?.message || error || ''), 'err');
  }
});

async function ensureSelectionTranslationContentScript(tabId) {
  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tabId, { type: 'QUERY_STATUS' });
  } catch {}
  if (status?.version === CONTENT_SCRIPT_VERSION) return status;
  await chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] });
  status = await chrome.tabs.sendMessage(tabId, { type: 'QUERY_STATUS' });
  if (status?.version !== CONTENT_SCRIPT_VERSION) throw new Error('当前网页仍在运行旧版划词逻辑，请刷新页面后再开启。');
  return status;
}

selectionToggle?.addEventListener('change', async (e) => {
  const enabled = !!e.target.checked;
  const previous = !enabled;
  try {
    const tab = await getOperationalTab();
    if (!tab?.id) throw new Error('没有可操作的当前标签页');
    await ensureSelectionTranslationContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SELECTION_TRANSLATION', enabled });
    if (!response?.ok) throw new Error(response?.error || '页面没有确认选中翻译状态');
    await chrome.storage.sync.set({ selectionTranslateEnabled: enabled });
    updateToggleStatus(selectionToggle, selectionToggleStatus, enabled);
    setStatus(enabled ? '已开启：选中文本翻译' : '已关闭：选中文本翻译', enabled ? 'ok' : '');
  } catch (error) {
    e.target.checked = previous;
    updateToggleStatus(selectionToggle, selectionToggleStatus, previous);
    setStatus('当前页面无法切换选中翻译：' + String(error?.message || error || ''), 'err');
  }
});

// 确保当前标签页已经有内容脚本，返回漂浮按钮状态
function isInjectableWebTab(tab) {
  return /^https?:/i.test(String(tab?.url || ''));
}

async function ensureFloatingButtonContentScript(tabId) {
  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tabId, { type: 'QUERY_STATUS' });
  } catch {}
  if (status?.version === CONTENT_SCRIPT_VERSION) return status;

  await chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] });
  status = await chrome.tabs.sendMessage(tabId, { type: 'QUERY_STATUS' });
  if (status?.version !== CONTENT_SCRIPT_VERSION) {
    throw new Error('当前网页仍在运行旧版脚本，请刷新页面后再开启。');
  }
  return status;
}

// The preference is global. A local extension page cannot host the button, but
// it must not prevent the user from enabling it for normal web pages.
floatingToggle?.addEventListener('change', async (e) => {
  const enabled = !!e.target.checked;
  const previous = !enabled;
  let pageUpdated = false;
  let pageError = null;
  try {
    const tab = await getOperationalTab();
    if (isInjectableWebTab(tab) && tab?.id) {
      try {
        await ensureFloatingButtonContentScript(tab.id);
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'TOGGLE_FLOATING_BUTTON',
          enabled
        });
        if (!response?.ok) throw new Error(response?.error || '页面没有确认漂浮按钮状态');
        pageUpdated = true;
      } catch (error) {
        pageError = error;
      }
    }

    await chrome.storage.sync.set({ floatingButtonEnabled: enabled });
    updateToggleStatus(floatingToggle, floatingToggleStatus, enabled);
    if (!enabled) {
      setStatus('已关闭：漂浮翻译按钮', '');
    } else if (pageUpdated) {
      setStatus('已开启：漂浮翻译按钮', 'ok');
    } else {
      setStatus('已开启：进入或刷新普通网页后显示', 'ok');
      if (pageError) console.warn('Floating button will appear after page refresh:', pageError);
    }
  } catch (error) {
    e.target.checked = previous;
    updateToggleStatus(floatingToggle, floatingToggleStatus, previous);
    setStatus('漂浮按钮设置保存失败：' + String(error?.message || error || ''), 'err');
    console.warn('Failed to save floating button preference:', error);
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
selectionPanelDefaultSizeSaveBtn?.addEventListener('click', async () => {
  try {
    await saveSelectionPanelDefaultSize();
  } catch (error) {
    setStatus('默认面板大小保存失败：' + String(error?.message || error || ''), 'err');
  }
});
selectionPanelRememberSiteSizeToggle?.addEventListener('change', async (event) => {
  await chrome.storage.local.set({ [SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY]: !!event.target.checked });
  setStatus(event.target.checked ? '已开启：记忆网站面板大小' : '已关闭：仅记忆网站面板位置', 'ok');
});
function updateSelectionPanelSizeScopeUi(useGlobalSize) {
  if (!selectionPanelRememberSiteSizeToggle) return;
  selectionPanelRememberSiteSizeToggle.disabled = useGlobalSize;
  const item = selectionPanelRememberSiteSizeToggle.closest('.switch-item');
  if (item) {
    item.style.opacity = useGlobalSize ? '0.52' : '';
    item.title = useGlobalSize ? '已被所有网页使用全局面板大小覆盖' : '';
  }
}

selectionPanelUseGlobalSizeToggle?.addEventListener('change', async (event) => {
  try {
    const useGlobalSize = !!event.target.checked;
    await chrome.storage.local.set({ [SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY]: useGlobalSize });
    updateSelectionPanelSizeScopeUi(useGlobalSize);
    setStatus(useGlobalSize ? '已开启：所有网页使用全局面板大小' : '已关闭：沿用网站记忆的面板大小', 'ok');
  } catch (error) {
    event.target.checked = !event.target.checked;
    setStatus('全局面板大小设置失败：' + String(error?.message || error || ''), 'err');
  }
});
openPanelSizeTunerBtn?.addEventListener('click', async () => {
  if (isFullConsole) {
    openConsolePanelSizeTuner();
    setStatus('已打开本地尺寸预览，保存后应用到所有网页', 'ok');
    return;
  }

  let tab = null;
  try {
    tab = await getOperationalTab();
    if (!isInjectableWebTab(tab) || !tab?.id) {
      await openFullConsoleForSizeTuner(tab);
      window.close();
      return;
    }
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_SELECTION_PANEL_SIZE_TUNER' });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['contentScript.js'] });
      response = await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_SELECTION_PANEL_SIZE_TUNER' });
    }
    if (!response?.ok) throw new Error(response?.error || '无法打开调试面板');
    setStatus('已打开尺寸调试面板，拖动后在面板内保存', 'ok');
  } catch (error) {
    try {
      await openFullConsoleForSizeTuner(tab);
      window.close();
    } catch (fallbackError) {
      setStatus('无法打开尺寸调试面板：' + String(fallbackError?.message || fallbackError || error || ''), 'err');
    }
  }
});
selectionPanelDefaultSizeResetBtn?.addEventListener('click', async () => {
  try {
    await resetSelectionPanelDefaultSize();
  } catch (error) {
    setStatus('默认面板大小恢复失败：' + String(error?.message || error || ''), 'err');
  }
});
[selectionPanelDefaultWidthInput, selectionPanelDefaultHeightInput].forEach((input) => input?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  selectionPanelDefaultSizeSaveBtn?.click();
}));
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
  const providerId = currentProviderId();
  editingProviderProfileIds[providerId] = getActiveProviderProfileStorageKey(providerId);
  applyProviderProfileToInputs();
});

providerSelect?.addEventListener('change', () => {
  const providerId = currentProviderId();
  editingProviderProfileIds[providerId] = getActiveProviderProfileStorageKey(providerId);
  applyProviderProfileToInputs();
});
newProviderProfileBtn?.addEventListener('click', () => void createProviderProfile(false));
duplicateProviderProfileBtn?.addEventListener('click', () => void createProviderProfile(true));
deleteProviderProfileBtn?.addEventListener('click', () => void deleteCurrentProviderProfile());
[
  providerProfileNameInput,
  providerBaseUrlInput,
  providerApiKeyInput,
  providerModelInput,
  providerRegionInput,
  providerAppIdInput,
  providerAppSecretInput,
  providerSystemPromptInput,
  providerUserPromptInput
].filter(Boolean).forEach((input) => {
  input.addEventListener('input', () => setProviderProfileStatus('有未保存的更改', 'neutral'));
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
    testProviderBtn.textContent = previous || '保存并测试';
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
    const tab = await getOperationalTab();
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
    const tab = await getOperationalTab();
    if (!tab?.id) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['contentScript.js'] });
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'OPEN_STRUCTURED_PAGE_READER',
      targetLang: targetSelect.value
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
    const tab = await getOperationalTab();
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

    const tab = await getOperationalTab();
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

function prepareSensitiveInputPrivacy() {
  const sensitiveInputs = [
    providerBaseUrlInput,
    providerApiKeyInput,
    providerAppSecretInput,
    llmBaseUrlInput,
    llmApiKeyInput
  ].filter(Boolean);
  const hideTimers = new WeakMap();

  const hide = (input, button) => {
    window.clearTimeout(hideTimers.get(input));
    input.type = 'password';
    button.setAttribute('aria-pressed', 'false');
    button.title = `临时显示${input.dataset.sensitiveLabel}`;
    button.setAttribute('aria-label', `临时显示${input.dataset.sensitiveLabel}`);
  };
  const scheduleHide = (input, button) => {
    window.clearTimeout(hideTimers.get(input));
    hideTimers.set(input, window.setTimeout(() => hide(input, button), 8000));
  };

  sensitiveInputs.forEach((input) => {
    if (input.closest('.sensitive-input-shell')) return;
    const label = input.labels?.[0]?.textContent?.trim() || '敏感内容';
    const restoreType = input.type === 'password' ? 'text' : input.type;
    const shell = document.createElement('span');
    shell.className = 'sensitive-input-shell';
    input.dataset.sensitiveLabel = label;
    input.dataset.sensitiveRestoreType = restoreType;
    input.before(shell);
    shell.appendChild(input);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sensitive-input-toggle';
    button.setAttribute('aria-pressed', 'false');
    button.title = `临时显示${label}`;
    button.setAttribute('aria-label', `临时显示${label}`);
    button.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path>
        <circle cx="12" cy="12" r="2.5"></circle>
      </svg>`;
    shell.appendChild(button);

    button.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      if (!isHidden) {
        hide(input, button);
        return;
      }
      input.type = input.dataset.sensitiveRestoreType || 'text';
      button.setAttribute('aria-pressed', 'true');
      button.title = `${label}将在 8 秒后重新遮蔽`;
      button.setAttribute('aria-label', `${label}将在 8 秒后重新遮蔽`);
      scheduleHide(input, button);
    });
    input.addEventListener('blur', () => window.setTimeout(() => {
      if (!shell.contains(document.activeElement)) hide(input, button);
    }, 120));
    input.addEventListener('input', () => {
      if (input.type !== 'password') scheduleHide(input, button);
    });
    input.type = 'password';
  });
}

prepareSensitiveInputPrivacy();

const fullConsoleParams = new URLSearchParams(location.search);
const isFullConsole = fullConsoleParams.get('mode') === 'full';
const fullConsoleSourceTabId = Number(fullConsoleParams.get('sourceTabId'));
const fullConsoleInitialTab = fullConsoleParams.get('tab');
const fullConsoleOpenPanelSizeTuner = fullConsoleParams.get('sizeTuner') === '1';
const fullConsoleTabTitles = Object.freeze({
  translation: '翻译',
  archive: '历史与阅读',
  settings: '设置',
});
const fullConsoleRequestedTab = Object.hasOwn(fullConsoleTabTitles, fullConsoleInitialTab)
  ? fullConsoleInitialTab
  : 'translation';

function prepareFullConsoleSettingsGroups(workspace) {
  const settingsSection = workspace.querySelector('.switches-section[data-console-section="settings"]');
  if (!settingsSection || settingsSection.dataset.fullConsoleGrouped === 'true') return;

  const controls = Array.from(settingsSection.children)
    .find((child) => child.querySelector?.('#autoToggle'));
  if (!controls) return;

  const items = Array.from(controls.children);
  const supplementalSections = Array.from(workspace.children)
    .filter((child) => child !== settingsSection && child.dataset?.consoleSection === 'settings');
  const whitelistSection = supplementalSections.find((section) => section.querySelector?.('#whitelistContainer'));
  const supportSections = supplementalSections.filter((section) => (
    section.querySelector?.('#feedbackBtn') || section.querySelector?.('#emailFeedbackBtn')
  ));

  const groups = [
    { id: 'behavior', label: '网页行为', items: items.slice(0, 3) },
    { id: 'panel', label: '选句面板', items: items.slice(3, 8) },
    { id: 'rules', label: '翻译规则', items: items.slice(8, 10) },
    { id: 'services', label: '服务配置', items: items.slice(10) },
    { id: 'site-rules', label: '网站规则', items: whitelistSection ? [whitelistSection] : [] },
    { id: 'support', label: '项目与支持', items: supportSections },
  ].filter((group) => group.items.length > 0);
  if (groups.length === 0) return;

  const title = Array.from(settingsSection.children)
    .find((child) => child.classList?.contains('section-title'));
  title?.remove();

  const nav = document.createElement('nav');
  nav.className = 'settings-subnav';
  nav.dataset.consoleSection = 'settings';
  nav.setAttribute('aria-label', '设置分区');
  const groupButtons = [];
  const activateGroup = (activeButton) => {
    groupButtons.forEach((button) => {
      const isActive = button === activeButton;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };
  const highlightArrival = (section) => {
    section.classList.remove('is-navigation-target');
    void section.offsetWidth;
    section.classList.add('is-navigation-target');
    section.addEventListener('animationend', () => section.classList.remove('is-navigation-target'), { once: true });
  };

  const fragments = groups.map((group) => {
    const section = document.createElement('section');
    section.className = 'settings-section-group';
    section.id = `fullSettingsGroup-${group.id}`;
    const heading = document.createElement('h2');
    heading.className = 'settings-section-heading';
    heading.textContent = group.label;
    const body = document.createElement('div');
    body.className = 'settings-group-body';
    group.items.forEach((item) => body.appendChild(item));
    section.append(heading, body);

    const button = document.createElement('button');
    button.className = 'settings-subnav-button';
    button.type = 'button';
    button.textContent = group.label;
    button.addEventListener('click', () => {
      activateGroup(button);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => highlightArrival(section), 260);
    });
    nav.appendChild(button);
    groupButtons.push(button);
    return section;
  });

  controls.remove();
  settingsSection.replaceChildren(...fragments);
  workspace.insertBefore(nav, settingsSection);
  settingsSection.dataset.fullConsoleGrouped = 'true';
  if (groupButtons[0]) activateGroup(groupButtons[0]);
}

function prepareFullConsoleProviderProfileLayout(workspace) {
  const grid = workspace.querySelector('#providerProfileDetails .provider-profile-grid');
  const profileLabel = grid?.querySelector('.provider-profile-section-label');
  const profileManager = grid?.querySelector('.provider-profile-manager');
  if (!grid || !profileLabel || !profileManager || grid.dataset.fullConsoleSplit === 'true') return;

  const editor = document.createElement('div');
  editor.className = 'provider-profile-editor';
  const library = document.createElement('aside');
  library.className = 'provider-profile-library';
  library.setAttribute('aria-label', '服务配置档案');

  for (const child of Array.from(grid.children)) {
    if (child === profileLabel || child === profileManager) {
      library.appendChild(child);
    } else {
      editor.appendChild(child);
    }
  }

  grid.replaceChildren(editor, library);
  grid.classList.add('provider-profile-split');
  grid.dataset.fullConsoleSplit = 'true';
}

function prepareFullConsoleProjectLink(tabs, workspace) {
  if (!tabs || tabs.querySelector('.console-sidebar-footer')) return;

  const sourceLink = workspace.querySelector('a[href="https://github.com/salimongo/Anwara-Translator"]');
  const sourceSection = sourceLink?.closest('[data-console-section="settings"]');
  if (!sourceLink || !sourceSection) return;

  const footer = document.createElement('div');
  footer.className = 'console-sidebar-footer';
  const projectLink = document.createElement('a');
  projectLink.className = 'console-project-link';
  projectLink.href = sourceLink.href;
  projectLink.target = sourceLink.target || '_blank';
  projectLink.rel = sourceLink.rel || 'noopener noreferrer';
  projectLink.title = '打开 Anwara Translator 项目仓库';
  projectLink.innerHTML = `
    <span>项目仓库</span>
    <svg class="console-project-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 3h7v7"></path>
      <path d="M10 14 21 3"></path>
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path>
    </svg>`;
  footer.appendChild(projectLink);
  tabs.appendChild(footer);
  sourceSection.dataset.fullConsoleProjectLink = 'true';
}

function prepareFullConsoleLayout() {
  const card = document.querySelector('.card');
  const header = card?.querySelector('.console-header');
  const tabs = card?.querySelector('.console-tabs');
  if (!card || !header || !tabs || Array.from(card.children).some((child) => child.classList?.contains('console-workspace'))) return;

  const workspace = document.createElement('main');
  workspace.className = 'console-workspace';
  const workspaceHeading = document.createElement('header');
  workspaceHeading.className = 'console-workspace-heading';
  const workspaceTitle = document.createElement('h1');
  workspaceTitle.id = 'consoleWorkspaceTitle';
  workspaceTitle.textContent = fullConsoleTabTitles[fullConsoleRequestedTab];
  workspaceHeading.appendChild(workspaceTitle);
  workspace.appendChild(workspaceHeading);
  for (const child of Array.from(card.children)) {
    if (child !== header && child !== tabs) workspace.appendChild(child);
  }
  prepareFullConsoleSettingsGroups(workspace);
  prepareFullConsoleProviderProfileLayout(workspace);
  prepareFullConsoleProjectLink(tabs, workspace);
  card.appendChild(workspace);
}

function updateFullConsoleTitle(tabName) {
  if (!isFullConsole) return;
  const title = document.getElementById('consoleWorkspaceTitle');
  if (title) title.textContent = fullConsoleTabTitles[tabName] || fullConsoleTabTitles.translation;
}

if (isFullConsole) {
  document.documentElement.classList.add('full-console');
  document.body.classList.add('full-console');
  document.body.dataset.activeTab = fullConsoleRequestedTab;
  prepareFullConsoleLayout();
}

async function getOperationalTab() {
  if (Number.isInteger(fullConsoleSourceTabId) && fullConsoleSourceTabId >= 0) {
    try {
      const sourceTab = await chrome.tabs.get(fullConsoleSourceTabId);
      if (typeof sourceTab?.id === 'number') return sourceTab;
    } catch {
      // The source tab was closed. Fall back to the active tab for popup mode.
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

const CONSOLE_TAB_KEY = 'translatorConsoleTab';
const consoleTabs = Array.from(document.querySelectorAll('.console-tab'));
function setConsoleTab(tabName, persist = true) {
  const activeTab = ['translation', 'settings', 'archive'].includes(tabName)
    ? tabName
    : 'translation';
  document.body.dataset.activeTab = activeTab;
  updateFullConsoleTitle(activeTab);
  consoleTabs.forEach((tab) => {
    const isActive = tab.dataset.tab === activeTab;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  if (activeTab === 'archive') {
    void loadHistoryState();
  }
  if (isFullConsole) {
    const url = new URL(location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
      history.replaceState(null, '', url);
    }
  }
  if (persist) {
    chrome.storage.local.set({ [CONSOLE_TAB_KEY]: activeTab }).catch(() => {});
  }
}
consoleTabs.forEach((tab) => {
  tab.addEventListener('click', () => setConsoleTab(tab.dataset.tab));
});
function createFullConsoleUrl({ tabName = 'translation', sourceTab = null, sizeTuner = false } = {}) {
  const url = new URL(chrome.runtime.getURL('popup.html'));
  url.searchParams.set('mode', 'full');
  url.searchParams.set('tab', tabName);
  if (typeof sourceTab?.id === 'number') url.searchParams.set('sourceTabId', String(sourceTab.id));
  if (sizeTuner) url.searchParams.set('sizeTuner', '1');
  return url;
}

async function openOrFocusFullConsole(options = {}) {
  const url = createFullConsoleUrl(options);
  const fullConsolePrefix = `${chrome.runtime.getURL('popup.html')}?mode=full`;
  let existing = null;
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    existing = tabs.find((tab) => typeof tab?.url === 'string' && tab.url.startsWith(fullConsolePrefix)) || null;
  } catch {
    // Creating a new extension tab remains a valid fallback when tab enumeration is unavailable.
  }
  if (typeof existing?.id === 'number') {
    try {
      await chrome.tabs.update(existing.id, { active: true, url: url.toString() });
      return;
    } catch {
      // The tab may have closed between query and update; create a fresh console below.
    }
  }
  await chrome.tabs.create({ url: url.toString() });
}

async function openFullConsoleForSizeTuner(sourceTab = null) {
  await openOrFocusFullConsole({ tabName: 'settings', sourceTab, sizeTuner: true });
}

openFullConsoleBtn?.addEventListener('click', async () => {
  let sourceTab = null;
  try {
    sourceTab = await getOperationalTab();
  } catch {
    // The full console can open without a source tab.
  }
  try {
    await openOrFocusFullConsole({
      tabName: document.body.dataset.activeTab || 'translation',
      sourceTab
    });
    window.close();
  } catch (error) {
    setStatus('无法打开完整控制台：' + String(error?.message || error || ''), 'err');
  }
});
void (async () => {
  try {
    if (isFullConsole && fullConsoleOpenPanelSizeTuner) {
      setConsoleTab('settings', false);
      requestAnimationFrame(() => {
        openConsolePanelSizeTuner();
        setStatus('已打开本地尺寸预览，保存后应用到所有网页', 'ok');
      });
      return;
    }
    const result = await chrome.storage.local.get([CONSOLE_TAB_KEY]);
    const requestedTab = ['translation', 'settings', 'archive'].includes(fullConsoleInitialTab)
      ? fullConsoleInitialTab
      : ['translation', 'settings', 'archive'].includes(result[CONSOLE_TAB_KEY])
        ? result[CONSOLE_TAB_KEY]
        : 'translation';
    if (requestedTab !== 'archive') {
      setConsoleTab(requestedTab, false);
      return;
    }

    if (isFullConsole) {
      setConsoleTab('archive', false);
      return;
    }

    // Keep the small popup usable while an empty or damaged archive is being recovered.
    setConsoleTab('translation', false);
    await loadHistoryState();
    if (historyItems.length || readingItems.length) setConsoleTab('archive', false);
  } catch {
    setConsoleTab('translation', false);
  }
})();


// contentScript.js - Translate page text in-place using Chrome Translator API, preserving layout

(() => {
  const CONTENT_SCRIPT_VERSION = '1.6.22';
  // Existing pages keep their old listeners. Tell the user the safe refresh boundary.
  if (window.translatorContentScriptLoaded) {
    if (window.translatorContentScriptVersion !== CONTENT_SCRIPT_VERSION && !document.getElementById('anwara-translator-refresh-notice')) {
      const notice = document.createElement('div');
      notice.id = 'anwara-translator-refresh-notice';
      notice.textContent = '当前网页仍在运行旧版划词逻辑，翻译结果可能不会写入历史。刷新此页面后继续。';
      notice.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:min(360px,calc(100vw - 32px));padding:10px 12px;border:1px solid rgba(147,197,253,.7);border-radius:8px;background:#172033;color:#e0f2fe;font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.32);';
      document.documentElement.appendChild(notice);
    }
    return;
  }
  window.translatorContentScriptLoaded = true;
  window.translatorContentScriptVersion = CONTENT_SCRIPT_VERSION;
  const localizedMessage = (key, fallback, substitutions) => {
    try {
      return window.AnwaraI18n?.t(key, fallback, substitutions) || fallback || key;
    } catch {
      return fallback || key;
    }
  };

  // State for page translation
  let enabled = false;
  let translator = null;
  let currentSourceLang = null;
  let currentTargetLang = 'zh-Hans';
  const originalText = new Map(); // Text node -> original string (Map so we can iterate/restore)
  let observer = null;

  // State for selection translation
  let selectionTranslator = null;
  let selectionSourceLang = null;
  let selectionTargetLang = 'zh-Hans';
  let translationTooltip = null;
  let selectionTimeout = null;
  let isTranslatingSelection = false;
  let lastTranslatedText = null; // Track last translated text to avoid duplicates
  let lastSelectionRequest = null; // Allows retry after browser selection has vanished.
  let isInitialized = false; // Prevent multiple initializations
  let selectionTranslateEnabled = false; // Control whether selection translation is enabled
  const SELECTION_SHOW_BILINGUAL_KEY = 'translatorSelectionShowBilingual';
  const SELECTION_SHOW_SOURCE_KEY = 'translatorSelectionShowSource';
  const SAME_LANGUAGE_MODE_KEY = 'translatorSameLanguageMode';
  let selectionIndicator = null;
  let selectionIndicatorAnchor = null;
  let selectionPanelHideTimer = null;
  let selectionPanelPosition = null;
  let selectionPanelSize = null;
  let selectionPanelDefaultSize = null;
  let selectionPanelUseGlobalDefaultSize = false;
  let selectionPanelRememberSiteSize = true;
  let selectionPanelDrag = null;
  let selectionPanelResize = null;
  let selectionPanelInteractionUntil = 0;
  const translationPanels = new Map();
  let nextTranslationPanelId = 1;
  const SELECTION_PANEL_POSITIONS_KEY = 'translatorSelectionPanelPositions';
  const SELECTION_PANEL_DEFAULT_SIZE_KEY = 'translatorSelectionPanelDefaultSize';
  const SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY = 'translatorSelectionPanelUseGlobalDefaultSize';
  const SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY = 'translatorSelectionPanelRememberSiteSize';
  const TRANSLATION_HISTORY_KEY = 'translatorHistory';
  const TRANSLATION_READING_KEY = 'translatorReadingArea';
  const TRANSLATION_HISTORY_ENABLED_KEY = 'translatorHistoryEnabled';
  const TRANSLATION_AUTO_READING_KEY = 'translatorAutoAddToReading';
  const MAX_HISTORY_RECORDS = 500;
  const MIN_PANEL_WIDTH = 240;
  const MIN_PANEL_HEIGHT = 180;
  const DEFAULT_PANEL_WIDTH = 360;
  const DEFAULT_PANEL_HEIGHT = 220;
  const MAX_PANEL_WIDTH = 1600;
  const MAX_PANEL_HEIGHT = 1200;
  // 2000 个字符覆盖普通多行选区，同时避免误选整页造成大段翻译。
  const MAX_SELECTION_TRANSLATE_LENGTH = 12000;
  const MAX_STRUCTURED_BLOCKS = 80;
  const MAX_STRUCTURED_BLOCK_TEXT_LENGTH = 6000;
  const STRUCTURED_TRANSLATION_CONCURRENCY = 2;
  const TRANSLATION_ENGINE_KEY = 'translatorDefaultEngine';
  const TRANSLATION_SITE_ENGINES_KEY = 'translatorSiteDefaultEngines';
  const TRANSLATION_ONLINE_PROVIDER_KEY = 'translatorOnlineProvider';
  const TRANSLATION_LLM_PROVIDER_KEY = 'translatorLlmProvider';
  const TRANSLATION_PROVIDER_ACTIVE_PROFILE_KEY = 'translatorProviderActiveProfileIds';
  const TRANSLATION_PROVIDER_PROFILES_KEY = 'translatorProviderProfiles';
  const TRANSLATION_ENGINE_LOCAL = 'local';
  const DETECTION_EXPECTED_LANGUAGES = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'it', 'pt'];
  const DETECTION_MIN_CONFIDENCE = 0.65;
  const DETECTION_MIN_MARGIN = 0.14;
  const TRANSLATION_ENGINE_META = {
    local: {
      id: TRANSLATION_ENGINE_LOCAL,
      stage: 'local',
      providerId: 'browser-translator',
      label: localizedMessage('localTranslation', '本地翻译')
    },
    llm: {
      id: 'llm',
      stage: 'llm',
      providerId: 'openai',
      label: localizedMessage('llmTranslation', '大模型翻译')
    },
    online: {
      id: 'online',
      stage: 'online',
      providerId: 'google',
      label: localizedMessage('onlineTranslation', '在线翻译')
    }
  };
  let currentPageEngineId = TRANSLATION_ENGINE_LOCAL;
  const TRANSLATION_PROVIDER_LABELS = {
    google: 'Google Cloud', microsoft: 'Microsoft', deepl: 'DeepL', deeplx: 'DeepLX', xiaoniu: '小牛', youdao: '有道', tencent: '腾讯云',
    openai: 'OpenAI', deepseek: 'DeepSeek', tongyi: '通义', zhipu: '智谱', moonshot: 'Kimi', gemini: 'Gemini', claude: 'Claude', custom: '自定义接口'
  };
  const TRANSLATION_PROVIDER_MESSAGE_KEYS = {
    google: 'providerGoogleCloud', microsoft: 'providerMicrosoft', xiaoniu: 'providerNiu', youdao: 'providerYoudao', tencent: 'providerTencent',
    tongyi: 'providerTongyi', zhipu: 'providerZhipu', baichuan: 'providerBaichuan', lingyi: 'providerLingyi', stepfun: 'providerStepfun',
    hunyuan: 'providerHunyuan', doubao: 'providerDoubao', infini: 'providerInfini', newapi: 'providerNewApi', custom: 'providerCustom'
  };

  function getTranslationEngineSourceLabel(engineId, providerId = '') {
    const metadata = getTranslationEngineMetadata(engineId);
    if (metadata.id === TRANSLATION_ENGINE_LOCAL) return metadata.label;
    const fallbackProviderLabel = TRANSLATION_PROVIDER_LABELS[providerId] || providerId;
    const providerLabel = TRANSLATION_PROVIDER_MESSAGE_KEYS[providerId]
      ? localizedMessage(TRANSLATION_PROVIDER_MESSAGE_KEYS[providerId], fallbackProviderLabel)
      : fallbackProviderLabel;
    return metadata.label + (providerLabel ? ' · ' + providerLabel : '');
  }

  function updatePageTranslationState(nextEnabled) {
    enabled = Boolean(nextEnabled);
    try {
      chrome.runtime.sendMessage({
        type: 'PAGE_TRANSLATION_STATE',
        enabled,
        targetLang: currentTargetLang
      });
    } catch {}
  }

  // State for floating button
  let floatingButton = null;
  let floatingButtonEnabled = false;
  let isDragging = false;
  let floatingDragMoved = false;
  let suppressFloatingClickUntil = 0;
  let dragOffset = { x: 0, y: 0 };

  // Simple inline overlay for status/progress
  let overlayEl = null;
  let overlayHideTimer = null;
  const OVERLAY_MAX_VISIBLE_MS = 30000;
  function showOverlay(msg) {
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.style.cssText = [
        'position:fixed',
        'right:12px',
        'bottom:12px',
        'max-width:40vw',
        'z-index:2147483647',
        'background:#111827',
        'color:#fff',
        'padding:8px 10px',
        'border-radius:8px',
        'font:12px/1.4 -apple-system,system-ui,Segoe UI,Roboto,sans-serif',
        'box-shadow:0 6px 20px rgba(0,0,0,.25)',
        'opacity:.95',
        'pointer-events:none',
      ].join(';');
      document.documentElement.appendChild(overlayEl);
    }
    overlayEl.textContent = window.AnwaraI18n?.text(String(msg || '')) || String(msg || '');
    if (overlayHideTimer) clearTimeout(overlayHideTimer);
    overlayHideTimer = setTimeout(() => hideOverlay(), OVERLAY_MAX_VISIBLE_MS);
  }
  function hideOverlay() {
    if (overlayHideTimer) clearTimeout(overlayHideTimer);
    overlayHideTimer = null;
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
  }

  function normalizeTranslationLayout(text) {
    return String(text ?? '').replace(/\r\n?/g, '\n');
  }

  function normalizeTranslationEngine(engineId) {
    return TRANSLATION_ENGINE_META[engineId] ? engineId : TRANSLATION_ENGINE_LOCAL;
  }

  function resolveRequestedTranslationEngine(engineId) {
    const candidate = typeof engineId === 'string' ? engineId.trim() : '';
    return TRANSLATION_ENGINE_META[candidate] ? candidate : TRANSLATION_ENGINE_LOCAL;
  }

  function getTranslationEngineMetadata(engineId) {
    const resolved = resolveRequestedTranslationEngine(engineId);
    return TRANSLATION_ENGINE_META[resolved] || {
      id: resolved,
      stage: resolved,
      providerId: resolved,
      label: resolved
    };
  }

  function getTranslationSiteKey() {
    return location.origin && location.origin !== 'null' ? location.origin : location.href;
  }

  async function loadEffectiveTranslationEngine() {
    try {
      const settings = await chrome.storage.local.get([
        TRANSLATION_ENGINE_KEY,
        TRANSLATION_SITE_ENGINES_KEY
      ]);
      const siteEngines = settings[TRANSLATION_SITE_ENGINES_KEY];
      const siteEngine = siteEngines && typeof siteEngines === 'object'
        ? siteEngines[getTranslationSiteKey()]
        : null;
      return normalizeTranslationEngine(siteEngine || settings[TRANSLATION_ENGINE_KEY]);
    } catch {
      return TRANSLATION_ENGINE_LOCAL;
    }
  }

  async function loadEffectiveTranslationProvider(engineId) {
    const stage = getTranslationEngineMetadata(engineId).stage;
    const key = stage === 'online' ? TRANSLATION_ONLINE_PROVIDER_KEY : TRANSLATION_LLM_PROVIDER_KEY;
    const fallback = stage === 'online' ? 'google' : 'openai';
    try {
      const settings = await chrome.storage.local.get([key]);
      return typeof settings[key] === 'string' && settings[key].trim() ? settings[key].trim() : fallback;
    } catch {
      return fallback;
    }
  }

  async function resolveTranslationProviderId(engineId) {
    const normalized = resolveRequestedTranslationEngine(engineId);
    return normalized === TRANSLATION_ENGINE_LOCAL
      ? TRANSLATION_ENGINE_META[TRANSLATION_ENGINE_LOCAL].providerId
      : loadEffectiveTranslationProvider(normalized);
  }

  async function resolveTranslationProviderProfileKey(providerId) {
    if (!providerId || providerId === 'browser-translator') return '';
    try {
      const settings = await chrome.storage.local.get([TRANSLATION_PROVIDER_ACTIVE_PROFILE_KEY]);
      return settings[TRANSLATION_PROVIDER_ACTIVE_PROFILE_KEY]?.[providerId] || '';
    } catch {
      return '';
    }
  }

  async function resolveTranslationProviderProfileName(providerId, providerProfileKey) {
    if (!providerId || !providerProfileKey) return '';
    try {
      const settings = await chrome.storage.local.get([TRANSLATION_PROVIDER_PROFILES_KEY]);
      const profile = settings[TRANSLATION_PROVIDER_PROFILES_KEY]?.[providerProfileKey];
      return profile?.providerId === providerId ? String(profile.name || '').trim().slice(0, 48) : '';
    } catch {
      return '';
    }
  }

  const TRANSLATION_CACHE_KEY = 'translatorTranslationCache';
  const MAX_TRANSLATION_CACHE_ENTRIES = 300;
  const MAX_TRANSLATION_CACHE_TEXT_LENGTH = 12000;
  const MAX_TRANSLATION_CACHE_BYTES = 2_000_000;
  const translationCache = new Map();
  let translationCacheLoadPromise = null;
  let translationCacheWriteTimer = null;

  function getTranslationCacheKey(text, sourceLang, targetLang, engineId, providerId = '', providerProfileKey = '') {
    const normalizedText = normalizeTranslationLayout(text).trim();
    if (!normalizedText || normalizedText.length > MAX_TRANSLATION_CACHE_TEXT_LENGTH) return null;
    return JSON.stringify([
      resolveRequestedTranslationEngine(engineId),
      providerId || '',
      providerProfileKey || '',
      normalizeLang(sourceLang),
      normalizeLang(targetLang),
      normalizedText
    ]);
  }

  async function ensureTranslationCacheLoaded() {
    if (translationCacheLoadPromise) return translationCacheLoadPromise;
    translationCacheLoadPromise = chrome.storage.local.get([TRANSLATION_CACHE_KEY])
      .then((result) => {
        translationCache.clear();
        const stored = result?.[TRANSLATION_CACHE_KEY];
        const entries = Array.isArray(stored)
          ? stored
          : stored && typeof stored === 'object'
            ? Object.entries(stored).map(([key, value]) => [key, value])
            : [];
        for (const entry of entries) {
          if (!Array.isArray(entry) || entry.length !== 2) continue;
          const [key, value] = entry;
          if (!key || !value || typeof value.value !== 'string') continue;
          translationCache.set(key, {
            value: value.value,
            lastUsedAt: Number(value.lastUsedAt) || 0
          });
        }
      })
      .catch((error) => {
        console.warn('Translation cache load failed:', error);
        translationCache.clear();
      });
    return translationCacheLoadPromise;
  }

  function getTranslationCacheSize() {
    let size = 0;
    for (const [key, entry] of translationCache) {
      size += key.length + String(entry?.value || '').length * 2 + 48;
    }
    return size;
  }

  function trimTranslationCache() {
    while (translationCache.size > MAX_TRANSLATION_CACHE_ENTRIES || getTranslationCacheSize() > MAX_TRANSLATION_CACHE_BYTES) {
      const oldest = [...translationCache.entries()]
        .sort((a, b) => (a[1]?.lastUsedAt || 0) - (b[1]?.lastUsedAt || 0))[0];
      if (!oldest) break;
      translationCache.delete(oldest[0]);
    }
  }

  function scheduleTranslationCacheWrite() {
    clearTimeout(translationCacheWriteTimer);
    translationCacheWriteTimer = setTimeout(() => {
      translationCacheWriteTimer = null;
      const payload = [...translationCache.entries()];
      chrome.storage.local.set({ [TRANSLATION_CACHE_KEY]: payload }).catch((error) => {
        console.warn('Translation cache save failed:', error);
      });
    }, 500);
  }

  async function readTranslationCache(text, sourceLang, targetLang, engineId, providerId = '', providerProfileKey = '') {
    const key = getTranslationCacheKey(text, sourceLang, targetLang, engineId, providerId, providerProfileKey);
    if (!key) return null;
    await ensureTranslationCacheLoaded();
    const entry = translationCache.get(key);
    if (!entry) return null;
    entry.lastUsedAt = Date.now();
    return entry.value;
  }

  async function writeTranslationCache(text, sourceLang, targetLang, engineId, translation, providerId = '', providerProfileKey = '') {
    if (typeof translation !== 'string' || !translation.trim()) return;
    const key = getTranslationCacheKey(text, sourceLang, targetLang, engineId, providerId, providerProfileKey);
    if (!key) return;
    await ensureTranslationCacheLoaded();
    translationCache.set(key, { value: translation, lastUsedAt: Date.now() });
    trimTranslationCache();
    scheduleTranslationCacheWrite();
  }

  function getLanguageLabel(code) {
    const labels = {
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
      pt: '葡萄牙语',
      ar: '阿拉伯语'
    };
    const normalized = normalizeLang(code);
    const labelKeys = {
      auto: 'languageAuto', en: 'languageEnglish', 'zh-Hans': 'languageZhHans', 'zh-Hant': 'languageZhHant', ja: 'languageJapanese',
      ko: 'languageKorean', fr: 'languageFrench', de: 'languageGerman', es: 'languageSpanish', ru: 'languageRussian',
      it: 'languageItalian', pt: 'languagePortuguese', ar: 'languageArabic'
    };
    return labelKeys[normalized]
      ? localizedMessage(labelKeys[normalized], labels[normalized])
      : localizedMessage('unknownLanguage', code || '未知语言');
  }

  function formatTranslationSource(sourceLang, targetLang) {
    return `${getLanguageLabel(sourceLang)} → ${getLanguageLabel(targetLang)}`;
  }

  async function loadSelectionDisplaySettings() {
    try {
      const settings = await chrome.storage.sync.get([
        SELECTION_SHOW_BILINGUAL_KEY,
        SELECTION_SHOW_SOURCE_KEY
      ]);
      return {
        showBilingual: settings[SELECTION_SHOW_BILINGUAL_KEY] !== false,
        showSource: settings[SELECTION_SHOW_SOURCE_KEY] !== false
      };
    } catch {
      return { showBilingual: true, showSource: true };
    }
  }

  async function loadSameLanguageMode() {
    try {
      const settings = await chrome.storage.sync.get([SAME_LANGUAGE_MODE_KEY]);
      return settings[SAME_LANGUAGE_MODE_KEY] === 'translate' ? 'translate' : 'skip';
    } catch {
      return 'skip';
    }
  }

  function ensureTranslationPanelScrollbarStyle() {
    if (document.getElementById('translator-selection-scrollbar-style')) return;
    const style = document.createElement('style');
    style.id = 'translator-selection-scrollbar-style';
    style.textContent = `
      .translator-selection-text {
        scrollbar-width: thin;
        scrollbar-color: rgba(148,163,184,.62) transparent;
      }
      .translator-selection-text::-webkit-scrollbar {
        width: 7px;
        height: 7px;
      }
      .translator-selection-text::-webkit-scrollbar-track {
        background: transparent;
        margin: 8px 2px;
      }
      .translator-selection-text::-webkit-scrollbar-thumb {
        background: rgba(148,163,184,.58);
        border: 2px solid transparent;
        background-clip: padding-box;
        border-radius: 999px;
      }
      .translator-selection-text::-webkit-scrollbar-thumb:hover {
        background: rgba(191,219,254,.82);
        border-width: 1px;
      }
    `;
    document.documentElement.appendChild(style);
  }

  // Translation tooltip for selected text
  function createTranslationTooltip() {
    ensureTranslationPanelScrollbarStyle();
    const tooltip = document.createElement('div');
    tooltip.id = 'translator-selection-panel';
    tooltip.style.cssText = [
      'position:fixed',
      'top:40px',
      'right:14px',
      'z-index:2147483647',
      'width:360px',
      'height:220px',
      'max-height:260px',
      'overflow:hidden',
      'box-sizing:border-box',
      'background:#111827',
      'color:#fff',
      'padding:10px 12px',
      'border-radius:8px',
      'font:13px/1.5 -apple-system,system-ui,Segoe UI,Roboto,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,0.38)',
      'word-wrap:break-word',
      'min-width:240px',
      'min-height:180px',
      'max-width:calc(100vw - 20px)',
      'max-height:calc(100vh - 20px)',
      'opacity:0',
      'transform:translateY(-4px)',
      'transition:opacity 0.16s ease, transform 0.16s ease',
      'pointer-events:none',
      'border:1px solid rgba(255,255,255,0.14)',
      'display:flex',
      'flex-direction:column',
      'gap:8px'
    ].join(';');

    // Translation panel drag handle and text container
    const dragHandle = document.createElement('div');
    dragHandle.title = localizedMessage('dragTranslationPanel', '拖动翻译窗口');
    dragHandle.style.cssText = [
      'width:100%',
      'height:24px',
      'flex:none',
      'align-self:stretch',
      'box-sizing:border-box',
      'border:1px solid transparent',
      'border-radius:6px',
      'background:transparent',
      'cursor:grab',
      'touch-action:none',
      'display:grid',
      'place-items:center',
      'transition:background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
    ].join(';');
    const dragGrip = document.createElement('span');
    dragGrip.setAttribute('aria-hidden', 'true');
    dragGrip.style.cssText = [
      'width:48px',
      'height:4px',
      'border-radius:999px',
      'background:rgba(191,219,254,0.72)',
      'box-shadow:0 0 9px rgba(96,165,250,0.72)'
    ].join(';');
    dragHandle.appendChild(dragGrip);
    dragHandle.addEventListener('mouseenter', () => {
      dragHandle.style.background = 'rgba(147,197,253,0.07)';
      dragHandle.style.borderColor = 'rgba(147,197,253,0.18)';
      dragHandle.style.boxShadow = '0 0 10px rgba(96,165,250,0.18)';
    });
    dragHandle.addEventListener('mouseleave', () => {
      dragHandle.style.background = 'transparent';
      dragHandle.style.borderColor = 'transparent';
      dragHandle.style.boxShadow = 'none';
    });
    dragHandle.addEventListener('pointerdown', startSelectionPanelDrag);
    dragHandle.addEventListener('pointermove', moveSelectionPanelDrag);
    dragHandle.addEventListener('pointerup', finishSelectionPanelDrag);
    dragHandle.addEventListener('pointercancel', finishSelectionPanelDrag);

    const textContainer = document.createElement('div');
    textContainer.className = 'translator-selection-text';
    textContainer.style.cssText = [
      'flex:1 1 auto',
      'min-height:0',
      'overflow:auto',
      'overscroll-behavior:contain',
      'padding-right:4px',
      'word-wrap:break-word',
      'overflow-wrap:anywhere',
      'white-space:pre-wrap',
      'tab-size:4',
      'user-select:text',
      'scrollbar-width:thin',
      'scrollbar-color:rgba(148,163,184,.62) transparent'
    ].join(';');
    textContainer.addEventListener('wheel', (event) => {
      event.stopPropagation();
      const atTop = textContainer.scrollTop <= 0;
      const atBottom = textContainer.scrollTop + textContainer.clientHeight >= textContainer.scrollHeight - 1;
      const pushingPastTop = event.deltaY < 0 && atTop;
      const pushingPastBottom = event.deltaY > 0 && atBottom;
      if (pushingPastTop || pushingPastBottom) event.preventDefault();
    }, { passive: false });

    // Copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = '⧉';
    copyButton.title = localizedMessage('copy', '复制');
    copyButton.style.cssText = [
      'background:#374151',
      'color:#fff',
      'border:1px solid rgba(255,255,255,0.2)',
      'border-radius:4px',
      'width:28px',
      'height:26px',
      'padding:0',
      'font-size:14px',
      'line-height:1',
      'white-space:nowrap',
      'flex:0 0 28px',
      'display:grid',
      'place-items:center',
      'cursor:pointer',
      'transition:background 0.2s ease',
      'align-self:flex-end'
    ].join(';');

    // Copy button hover effect
    copyButton.addEventListener('mouseenter', () => {
      copyButton.style.background = '#4b5563';
    });
    copyButton.addEventListener('mouseleave', () => {
      copyButton.style.background = '#374151';
    });

    // Copy functionality
    copyButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      const textToCopy = tooltip._copyText || textContainer.textContent;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        // Visual feedback
        const originalText = copyButton.textContent;
        copyButton.textContent = localizedMessage('copied', '已复制');
        copyButton.style.background = '#10b981';
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.background = '#374151';
        }, 1000);
      } catch (err) {
        console.warn('复制失败:', err);
        copyButton.textContent = localizedMessage('copyFailed', '复制失败');
        copyButton.style.background = '#ef4444';
        setTimeout(() => {
          copyButton.textContent = '⧉';
          copyButton.style.background = '#374151';
        }, 1000);
      }
    });

    const pinButton = document.createElement('button');
    const readingButton = document.createElement('button');
    const retranslateButton = document.createElement('button');
    const closeButton = document.createElement('button');
    const panelActionButtonStyle = [
      'background:#374151',
      'color:#fff',
      'border:1px solid rgba(255,255,255,0.2)',
      'border-radius:4px',
      'width:28px',
      'height:26px',
      'padding:0',
      'font-size:14px',
      'line-height:1',
      'white-space:nowrap',
      'flex:0 0 28px',
      'display:grid',
      'place-items:center',
      'cursor:pointer'
    ].join(';');
    for (const button of [pinButton, readingButton, retranslateButton, closeButton]) {
      button.style.cssText = panelActionButtonStyle;
      button.type = 'button';
    }
    closeButton.style.background = '#4b5563';
    const resizeHandle = document.createElement('div');
    resizeHandle.title = localizedMessage('resizePanel', '调整面板大小');
    resizeHandle.style.cssText = 'position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 0 45%,rgba(255,255,255,.55) 46% 52%,transparent 53% 64%,rgba(255,255,255,.55) 65% 71%,transparent 72%);';
    resizeHandle.addEventListener('pointerdown', startSelectionPanelResize);
    resizeHandle.addEventListener('pointermove', moveSelectionPanelResize);
    resizeHandle.addEventListener('pointerup', finishSelectionPanelResize);
    resizeHandle.addEventListener('pointercancel', finishSelectionPanelResize);
    const actionBar = document.createElement('div');
    actionBar.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:4px;flex:none;flex-wrap:nowrap;min-width:0;overflow:hidden;white-space:nowrap;margin-left:2px;padding-left:8px;border-left:1px solid rgba(148,163,184,.16);';
    actionBar.appendChild(copyButton);
    actionBar.appendChild(pinButton);
    actionBar.appendChild(readingButton);
    actionBar.appendChild(retranslateButton);
    actionBar.appendChild(closeButton);

    const retranslateMenu = document.createElement('div');
    retranslateMenu.hidden = true;
    retranslateMenu.style.cssText = 'position:absolute;right:10px;bottom:42px;display:none;align-items:center;gap:5px;padding:5px;border:1px solid rgba(148,163,184,.26);border-radius:6px;background:#172235;box-shadow:0 8px 20px rgba(0,0,0,.28);transform-origin:right bottom;z-index:1;';
    for (const [engineId, label] of [[TRANSLATION_ENGINE_LOCAL, '本地'], ['online', '在线'], ['llm', '模型']]) {
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = label;
      option.title = `使用${label}翻译重新翻译`;
      option.style.cssText = 'height:25px;padding:0 7px;border:1px solid rgba(255,255,255,.2);border-radius:4px;background:#243247;color:#e5edf7;font-size:11px;line-height:1;white-space:nowrap;cursor:pointer;';
      option.addEventListener('click', (event) => {
        event.stopPropagation();
        const panel = tooltip._panel;
        if (panel) void retranslatePanelWithEngine(panel, engineId);
      });
      retranslateMenu.appendChild(option);
    }

    const footerBar = document.createElement('div');
    footerBar.style.cssText = 'display:flex;align-items:center;gap:8px;min-height:27px;padding-top:6px;border-top:1px solid rgba(148,163,184,.16);flex:none;min-width:0;';
    const sourceMeta = document.createElement('span');
    sourceMeta.style.cssText = 'display:none;align-items:center;gap:6px;flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;color:#aab8c9;font-size:10px;line-height:1.2;letter-spacing:0;padding-right:2px;';
    footerBar.append(sourceMeta, actionBar);

    pinButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = tooltip._panel;
      if (!panel) return;
      panel.pinned = !panel.pinned;
      updateTranslationPanelButtons(panel);
      saveSelectionPanelPosition(panel);
    });
    readingButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = tooltip._panel;
      if (panel) void togglePanelReading(panel);
    });
    retranslateButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const panel = tooltip._panel;
      if (!panel) return;
      const opening = retranslateMenu.hidden;
      retranslateMenu.hidden = !opening;
      retranslateMenu.style.display = opening ? 'flex' : 'none';
      retranslateButton.setAttribute('aria-expanded', String(opening));
      markSelectionPanelInteraction();
    });
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = tooltip._panel;
      if (panel) removeTranslationPanel(panel.id);
    });

    tooltip.appendChild(dragHandle);
    tooltip.appendChild(textContainer);
    tooltip.appendChild(footerBar);
    tooltip.appendChild(retranslateMenu);
    tooltip.appendChild(resizeHandle);

    // Store references for easy access
    tooltip._textContainer = textContainer;
    tooltip._copyButton = copyButton;
    tooltip._pinButton = pinButton;
    tooltip._readingButton = readingButton;
    tooltip._retranslateButton = retranslateButton;
    tooltip._retranslateMenu = retranslateMenu;
    tooltip._closeButton = closeButton;
    tooltip._actionBar = actionBar;
    tooltip._footerBar = footerBar;
    tooltip._sourceMeta = sourceMeta;
    tooltip._resizeHandle = resizeHandle;
    tooltip.addEventListener('mouseenter', cancelSelectionPanelHide);
    tooltip.addEventListener('mouseleave', scheduleSelectionPanelHide);
    for (const eventName of ['pointerdown', 'mousedown', 'click']) {
      tooltip.addEventListener(eventName, (e) => {
        markSelectionPanelInteraction();
        e.stopPropagation();
      });
    }

    return tooltip;
  }

  function getSelectionPanelStorageKey() {
    return location.origin && location.origin !== 'null' ? location.origin : location.href;
  }

  function isTranslatorUiNode(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return !!element?.closest?.('#translator-selection-panel, #translator-selection-indicator, #translator-floating-button');
  }

  function isSelectionInsideTranslatorUi(selection = window.getSelection()) {
    if (!selection || selection.rangeCount === 0) return false;
    return isTranslatorUiNode(selection.anchorNode) || isTranslatorUiNode(selection.focusNode);
  }

  function markSelectionPanelInteraction() {
    selectionPanelInteractionUntil = Date.now() + 900;
  }

  function normalizeSelectionPanelSize(size, fallback = { width: DEFAULT_PANEL_WIDTH, height: DEFAULT_PANEL_HEIGHT }) {
    const fallbackWidth = Number.isFinite(Number(fallback.width)) ? Number(fallback.width) : DEFAULT_PANEL_WIDTH;
    const fallbackHeight = Number.isFinite(Number(fallback.height)) ? Number(fallback.height) : DEFAULT_PANEL_HEIGHT;
    const requestedWidth = Number(size?.width);
    const requestedHeight = Number(size?.height);
    return {
      width: Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Number.isFinite(requestedWidth) ? Math.round(requestedWidth) : fallbackWidth)),
      height: Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, Number.isFinite(requestedHeight) ? Math.round(requestedHeight) : fallbackHeight))
    };
  }

  function getViewportBoundedSelectionPanelSize(size) {
    const normalized = normalizeSelectionPanelSize(size);
    return {
      width: Math.min(Math.max(MIN_PANEL_WIDTH, window.innerWidth - 20), normalized.width),
      height: Math.min(Math.max(MIN_PANEL_HEIGHT, window.innerHeight - 20), normalized.height)
    };
  }

  async function loadSelectionPanelPosition() {
    try {
      const result = await chrome.storage.local.get([SELECTION_PANEL_POSITIONS_KEY, SELECTION_PANEL_DEFAULT_SIZE_KEY, SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY, SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY]);
      const layouts = result[SELECTION_PANEL_POSITIONS_KEY] || {};
      const saved = layouts[getSelectionPanelStorageKey()];
      selectionPanelDefaultSize = normalizeSelectionPanelSize(result[SELECTION_PANEL_DEFAULT_SIZE_KEY]);
      selectionPanelUseGlobalDefaultSize = result[SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY] === true;
      selectionPanelRememberSiteSize = result[SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY] !== false;
      if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
        selectionPanelPosition = {
          left: Number(saved.left),
          top: Number(saved.top)
        };
      }
      if (selectionPanelRememberSiteSize && saved && Number.isFinite(Number(saved.width)) && Number.isFinite(Number(saved.height))) {
        selectionPanelSize = normalizeSelectionPanelSize(saved);
      }
    } catch (e) {
      selectionPanelDefaultSize = normalizeSelectionPanelSize(null);
      console.warn('Failed to load selection panel layout:', e);
    }
  }

  function getInitialPanelLayout() {
    const fallback = {
      left: Math.max(10, window.innerWidth - 374),
      top: 40
    };
    const base = selectionPanelPosition || fallback;
    const offset = (translationPanels.size % 6) * 22;
    const requestedSize = selectionPanelUseGlobalDefaultSize
      ? (selectionPanelDefaultSize || { width: DEFAULT_PANEL_WIDTH, height: DEFAULT_PANEL_HEIGHT })
      : (selectionPanelSize || selectionPanelDefaultSize || { width: DEFAULT_PANEL_WIDTH, height: DEFAULT_PANEL_HEIGHT });
    return {
      position: { left: base.left + offset, top: base.top + offset },
      size: getViewportBoundedSelectionPanelSize(requestedSize)
    };
  }

  async function saveSelectionPanelPosition(panel = translationTooltip?._panel) {
    if (panel?.isSizeTuner) return;
    const position = panel?.position || selectionPanelPosition;
    const size = panel?.size || selectionPanelSize;
    if (!position) return;
    selectionPanelPosition = {
      left: Number(position.left),
      top: Number(position.top)
    };
    if (size) {
      selectionPanelSize = {
        width: Number(size.width),
        height: Number(size.height)
      };
    }
    try {
      const result = await chrome.storage.local.get([SELECTION_PANEL_POSITIONS_KEY]);
      const layouts = { ...(result[SELECTION_PANEL_POSITIONS_KEY] || {}) };
      layouts[getSelectionPanelStorageKey()] = {
        left: Math.round(position.left),
        top: Math.round(position.top),
        ...(selectionPanelRememberSiteSize && size ? { width: Math.round(size.width), height: Math.round(size.height) } : {})
      };
      await chrome.storage.local.set({ [SELECTION_PANEL_POSITIONS_KEY]: layouts });
    } catch (e) {
      console.warn('Failed to save selection panel layout:', e);
    }
  }

  function applySelectionPanelPosition(tooltip = translationTooltip, options = {}) {
    const panel = tooltip?._panel;
    if (!tooltip || !panel || !panel.position) return;
    const rect = tooltip.getBoundingClientRect();
    const margin = 10;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const left = Math.max(margin, Math.min(panel.position.left, maxLeft));
    const top = Math.max(margin, Math.min(panel.position.top, maxTop));
    panel.position = { left, top };
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.right = 'auto';
    if (panel.size && options.applySize !== false) {
      tooltip.style.width = `${Math.max(MIN_PANEL_WIDTH, panel.size.width)}px`;
      tooltip.style.height = `${Math.max(MIN_PANEL_HEIGHT, panel.size.height)}px`;
    }
  }

  function startSelectionPanelResize(event) {
    if (event.button !== 0) return;
    const tooltip = event.currentTarget.closest?.('#translator-selection-panel');
    const panel = tooltip?._panel;
    if (!tooltip || !panel) return;
    const rect = tooltip.getBoundingClientRect();
    selectionPanelResize = {
      pointerId: event.pointerId,
      panel,
      tooltip,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height
    };
    markSelectionPanelInteraction();
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveSelectionPanelResize(event) {
    if (!selectionPanelResize || event.pointerId !== selectionPanelResize.pointerId) return;
    const { panel, tooltip } = selectionPanelResize;
    const maxWidth = Math.max(MIN_PANEL_WIDTH, window.innerWidth - 20);
    const maxHeight = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - 20);
    panel.size = {
      width: Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, selectionPanelResize.startWidth + event.clientX - selectionPanelResize.startX)),
      height: Math.max(MIN_PANEL_HEIGHT, Math.min(maxHeight, selectionPanelResize.startHeight + event.clientY - selectionPanelResize.startY))
    };
    if (!panel.isSizeTuner) selectionPanelSize = { ...panel.size };
    tooltip.style.width = `${panel.size.width}px`;
    tooltip.style.height = `${panel.size.height}px`;
    updateSizeTunerPreview(panel);
    event.preventDefault();
  }

  function finishSelectionPanelResize(event) {
    if (!selectionPanelResize || event.pointerId !== selectionPanelResize.pointerId) return;
    const { panel } = selectionPanelResize;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    selectionPanelResize = null;
    saveSelectionPanelPosition(panel);
  }

  function startSelectionPanelDrag(event) {
    if (event.button !== 0) return;
    const tooltip = event.currentTarget.closest?.('#translator-selection-panel');
    const panel = tooltip?._panel;
    if (!tooltip || !panel) return;
    const rect = tooltip.getBoundingClientRect();
    selectionPanelDrag = {
      pointerId: event.pointerId,
      panel,
      tooltip,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    tooltip.style.cursor = 'grabbing';
  }

  function moveSelectionPanelDrag(event) {
    if (!selectionPanelDrag || event.pointerId !== selectionPanelDrag.pointerId) return;
    const { panel, tooltip } = selectionPanelDrag;
    event.preventDefault();
    panel.position = {
      left: event.clientX - selectionPanelDrag.offsetX,
      top: event.clientY - selectionPanelDrag.offsetY
    };
    applySelectionPanelPosition(tooltip, { applySize: false });
  }

  function finishSelectionPanelDrag(event) {
    if (!selectionPanelDrag || event.pointerId !== selectionPanelDrag.pointerId) return;
    const { panel, tooltip } = selectionPanelDrag;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    selectionPanelDrag = null;
    tooltip.style.cursor = 'default';
    saveSelectionPanelPosition(panel);
  }

  function getSelectionAnchorRect(selection) {
    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width || rect.height);
    const rect = rects[rects.length - 1] || range.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  function positionSelectionIndicator() {
    if (!selectionIndicator || !selectionIndicatorAnchor) return;
    const size = 14;
    const gap = 7;
    const margin = 6;
    const anchor = selectionIndicatorAnchor;
    const height = Math.max(anchor.height || 0, size);
    let left = anchor.right + gap;
    let top = anchor.top + (height - size) / 2;
    if (left + size > window.innerWidth - margin) {
      left = anchor.left - size - gap;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - size - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - size - margin));
    selectionIndicator.style.left = `${left}px`;
    selectionIndicator.style.top = `${top}px`;
  }

  function refreshSelectionIndicatorPosition() {
    if (!selectionIndicator) return;
    const selection = window.getSelection();
    if (isSelectionInsideTranslatorUi(selection)) {
      selectionIndicator.style.display = 'none';
      return;
    }
    if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
      selectionIndicatorAnchor = getSelectionAnchorRect(selection);
    }
    positionSelectionIndicator();
  }

  function createSelectionIndicator() {
    if (selectionIndicator) return selectionIndicator;

    const indicator = document.createElement('button');
    indicator.id = 'translator-selection-indicator';
    indicator.type = 'button';
    indicator.setAttribute('aria-label', '打开翻译结果');
    indicator.title = '打开翻译结果';
    indicator.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'width:14px',
      'height:14px',
      'padding:0',
      'box-sizing:border-box',
      'border:1px solid rgba(255,255,255,0.9)',
      'border-radius:50%',
      'background:#ef4444',
      'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
      'cursor:pointer',
      'display:none',
      'opacity:0',
      'transition:transform 0.12s ease, opacity 0.12s ease'
    ].join(';');
    indicator.addEventListener('mouseenter', () => {
      markSelectionPanelInteraction();
      cancelSelectionPanelHide();
      openSelectionPanel();
    });
    indicator.addEventListener('mouseleave', scheduleSelectionPanelHide);
    indicator.addEventListener('pointerdown', markSelectionPanelInteraction);
    indicator.addEventListener('click', (e) => {
      markSelectionPanelInteraction();
      e.preventDefault();
      e.stopPropagation();
      openSelectionPanel();
    });
    document.documentElement.appendChild(indicator);
    selectionIndicator = indicator;
    return indicator;
  }

  function cancelSelectionPanelHide() {
    if (selectionPanelHideTimer) {
      clearTimeout(selectionPanelHideTimer);
      selectionPanelHideTimer = null;
    }
  }

  function getLatestTranslationPanel() {
    const panels = Array.from(translationPanels.values());
    return panels.length ? panels[panels.length - 1] : null;
  }

  function setPanelIcon(button, pathMarkup, title, active = false) {
    button.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pathMarkup}</svg>`;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.style.color = active ? '#fbbf24' : '#fff';
  }

  function updateTranslationPanelButtons(panel) {
    if (!panel?.tooltip) return;
    setPanelIcon(
      panel.tooltip._pinButton,
      '<path d="M8 3h8l1 6 3 3v1H4v-1l3-3 1-6Z"/><path d="M12 13v8"/>',
      panel.pinned ? '取消固定面板' : '固定面板',
      panel.pinned
    );
    panel.tooltip._readingButton.disabled = panel.readingPending === true;
    panel.tooltip._readingButton.textContent = panel.readingPending ? '…' : (panel.readingError ? '!' : (panel.inReadingArea ? '✓' : '▤'));
    panel.tooltip._readingButton.title = panel.readingPending ? '正在保存阅读区' : (panel.readingError ? '保存失败，点击重试' : (panel.inReadingArea ? '从阅读区移出' : '加入阅读区'));
    setPanelIcon(
      panel.tooltip._retranslateButton,
      '<path d="M19 8V4h-4"/><path d="M5 16v4h4"/><path d="M5.5 8.5A7 7 0 0 1 17 6l2 2"/><path d="M18.5 15.5A7 7 0 0 1 7 18l-2-2"/>',
      '选择翻译方式重新翻译'
    );
    panel.tooltip._closeButton.textContent = '×';
    panel.tooltip._closeButton.title = '关闭面板';
  }

  function getTranslationVariantKey(engineId, providerId, providerProfileKey, sourceLang, targetLang) {
    return [
      resolveRequestedTranslationEngine(engineId),
      providerId || 'browser-translator',
      providerProfileKey || 'default',
      sourceLang || 'auto',
      targetLang || 'zh-Hans'
    ].map((value) => String(value).trim()).join('|');
  }

  function createTranslationRecord(data, inReadingArea = false) {
    const engineId = resolveRequestedTranslationEngine(data.engineId);
    const providerId = data.providerId || getTranslationEngineMetadata(data.engineId).providerId;
    const providerProfileKey = data.providerProfileKey || '';
    const sourceText = normalizeTranslationLayout(data.sourceText);
    const translatedText = normalizeTranslationLayout(data.translatedText);
    const sourceLang = data.sourceLang || 'auto';
    const targetLang = data.targetLang || 'zh-Hans';
    const structuredBlocks = Array.isArray(data.structuredBlocks) ? data.structuredBlocks : null;
    const translationVariants = data.translationVariants && typeof data.translationVariants === 'object'
      ? { ...data.translationVariants }
      : {};
    const variantKey = getTranslationVariantKey(engineId, providerId, providerProfileKey, sourceLang, targetLang);
    if (!translationVariants[variantKey]) {
      translationVariants[variantKey] = {
        translatedText,
        structuredBlocks,
        engineId,
        engineStage: data.engineStage || getTranslationEngineMetadata(data.engineId).stage,
        providerId,
        providerProfileKey,
        translatedAt: Date.now()
      };
    }
    return {
      id: `translation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      pageUrl: location.href,
      pageTitle: document.title || location.hostname,
      createdAt: Date.now(),
      engineId,
      engineStage: data.engineStage || getTranslationEngineMetadata(data.engineId).stage,
      providerId,
      providerProfileKey,
      structuredBlocks,
      translationVariants,
      inReadingArea
    };
  }

  async function saveTranslationHistory(data, options = {}) {
    const {
      writeHistory = true,
      writeReading = false,
      forceHistory = false,
      transientReader = false,
      userApprovedReading = false,
      throwOnError = false
    } = options;
    if (transientReader) return createTranslationRecord(data, false);
    try {
      const settings = await chrome.storage.local.get([
        TRANSLATION_HISTORY_ENABLED_KEY,
        TRANSLATION_AUTO_READING_KEY
      ]);
      const historyEnabled = settings[TRANSLATION_HISTORY_ENABLED_KEY] !== false;
      const shouldWriteHistory = writeHistory && (forceHistory || historyEnabled);
      const structuredReadingBlocked = Array.isArray(data?.structuredBlocks) && !userApprovedReading;
      const shouldWriteReading = !structuredReadingBlocked && (
        writeReading || (shouldWriteHistory && settings[TRANSLATION_AUTO_READING_KEY] === true)
      );
      if (!shouldWriteHistory && !shouldWriteReading) return null;

      const result = await chrome.storage.local.get([TRANSLATION_HISTORY_KEY, TRANSLATION_READING_KEY]);
      const history = Array.isArray(result[TRANSLATION_HISTORY_KEY]) ? result[TRANSLATION_HISTORY_KEY] : [];
      const readingItems = Array.isArray(result[TRANSLATION_READING_KEY])
        ? result[TRANSLATION_READING_KEY]
        : history.filter((entry) => entry?.inReadingArea === true);
      const item = createTranslationRecord(data, shouldWriteReading);
      const nextHistory = shouldWriteHistory
        ? [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, MAX_HISTORY_RECORDS)
        : history;
      const nextReadingItems = shouldWriteReading
        ? [item, ...readingItems.filter((entry) => entry.id !== item.id)].slice(0, MAX_HISTORY_RECORDS)
        : readingItems;
      const patch = {};
      if (shouldWriteHistory) patch[TRANSLATION_HISTORY_KEY] = nextHistory;
      if (shouldWriteReading) patch[TRANSLATION_READING_KEY] = nextReadingItems;
      await chrome.storage.local.set(patch);
      return item;
    } catch (e) {
      console.warn('Failed to save translation record:', e);
      if (throwOnError) throw e;
      return null;
    }
  }

  async function retryPanelHistorySave(panel) {
    if (!panel?.historyData || panel.historySavePending) return;
    panel.historySavePending = true;
    panel.historySaveError = false;
    if (panel.tooltip?._historyRetryButton) {
      panel.tooltip._historyRetryButton.disabled = true;
      panel.tooltip._historyRetryButton.textContent = '保存中';
    }
    try {
      const record = await saveTranslationHistory(panel.historyData, { forceHistory: true, throwOnError: true });
      if (!record?.id) throw new Error('HISTORY_SAVE_SKIPPED');
      panel.historyId = record.id;
      panel.inReadingArea = record.inReadingArea === true;
      panel.historySaveError = false;
      panel.tooltip?._historyRetryButton?.remove?.();
      panel.tooltip._historyRetryButton = null;
    } catch (error) {
      panel.historySaveError = true;
      if (panel.tooltip?._historyRetryButton) {
        panel.tooltip._historyRetryButton.disabled = false;
        panel.tooltip._historyRetryButton.textContent = '重试保存';
        panel.tooltip._historyRetryButton.title = '历史保存失败，点击重试';
      }
      console.warn('Failed to retry selection history save:', error);
    } finally {
      panel.historySavePending = false;
      updateTranslationPanelButtons(panel);
    }
  }

  async function retranslatePanelWithEngine(panel, engineId) {
    if (!panel?.tooltip || panel.retranslateBusy) return;
    panel.retranslateBusy = true;
    panel.tooltip._retranslateButton.disabled = true;
    panel.tooltip._retranslateMenu.hidden = true;
    panel.tooltip._retranslateMenu.style.display = 'none';
    panel.tooltip._retranslateButton.setAttribute('aria-expanded', 'false');
    const request = {
      force: true,
      allowUi: true,
      preferText: true,
      openImmediately: true,
      text: panel.sourceText,
      sourceLang: panel.sourceLang,
      structuredBlocks: panel.structuredBlocks || [],
      anchor: panel.anchor,
      engineId
    };
    panel.pinned = false;
    try {
      await handleTextSelection(request);
    } finally {
      panel.retranslateBusy = false;
    }
  }

  async function updateHistoryEntry(id, patch) {
    if (!id) return;
    try {
      const result = await chrome.storage.local.get([TRANSLATION_HISTORY_KEY]);
      const history = Array.isArray(result[TRANSLATION_HISTORY_KEY])
        ? result[TRANSLATION_HISTORY_KEY]
        : [];
      const index = history.findIndex((item) => item.id === id);
      if (index < 0) return;
      history[index] = { ...history[index], ...patch };
      await chrome.storage.local.set({ [TRANSLATION_HISTORY_KEY]: history });
    } catch (e) {
      console.warn('Failed to update translation history:', e);
    }
  }

  async function updateReadingAreaRecord(id, record, enabled, options = {}) {
    const { throwOnError = false } = options;
    if (!id && !record) return;
    try {
      const result = await chrome.storage.local.get([TRANSLATION_READING_KEY, TRANSLATION_HISTORY_KEY]);
      const history = Array.isArray(result[TRANSLATION_HISTORY_KEY]) ? result[TRANSLATION_HISTORY_KEY] : [];
      let readingItems = Array.isArray(result[TRANSLATION_READING_KEY])
        ? result[TRANSLATION_READING_KEY]
        : history.filter((entry) => entry?.inReadingArea === true);
      const recordId = id || record?.id;
      if (enabled) {
        const source = record || history.find((entry) => entry.id === recordId);
        if (source) readingItems = [{ ...source, inReadingArea: true }, ...readingItems.filter((entry) => entry.id !== recordId)].slice(0, MAX_HISTORY_RECORDS);
      } else {
        readingItems = readingItems.filter((entry) => entry.id !== recordId);
      }
      await chrome.storage.local.set({ [TRANSLATION_READING_KEY]: readingItems });
      return readingItems;
    } catch (e) {
      console.warn('Failed to update reading area:', e);
      if (throwOnError) throw e;
      return null;
    }
  }

  async function togglePanelReading(panel) {
    if (!panel || panel.readingPending) return;
    const previous = panel.inReadingArea === true;
    const next = !previous;
    const recordData = {
      id: panel.historyId,
      sourceText: panel.sourceText,
      translatedText: panel.translatedText,
      sourceLang: panel.sourceLang,
      targetLang: panel.targetLang,
      structuredBlocks: panel.structuredBlocks,
      engineId: panel.engineId,
      engineStage: getTranslationEngineMetadata(panel.engineId).stage,
      providerId: panel.providerId,
      providerProfileKey: panel.providerProfileKey,
      pageUrl: location.href,
      pageTitle: document.title || location.hostname,
      createdAt: Date.now()
    };
    panel.readingPending = true;
    updateTranslationPanelButtons(panel);
    try {
      if (next && !panel.historyId) {
        const record = await saveTranslationHistory(recordData, { writeHistory: false, writeReading: true, userApprovedReading: true, throwOnError: true });
        if (!record?.id) throw new Error('READING_SAVE_FAILED');
        panel.historyId = record.id;
      } else {
        await updateReadingAreaRecord(panel.historyId, recordData, next, { throwOnError: true });
      }
      panel.inReadingArea = next;
      panel.readingError = false;
    } catch (error) {
      panel.inReadingArea = previous;
      panel.readingError = true;
      console.warn('Failed to update reading-area state:', error);
    } finally {
      panel.readingPending = false;
      updateTranslationPanelButtons(panel);
    }
  }

  function removeTranslationPanel(id) {
    const panel = translationPanels.get(id);
    if (!panel) return;
    panel.resizeObserver?.disconnect?.();
    panel.tooltip?.remove?.();
    translationPanels.delete(id);
    if (translationTooltip === panel.tooltip) {
      const latest = getLatestTranslationPanel();
      translationTooltip = latest?.tooltip || null;
    }
    if (!translationPanels.size && selectionIndicator) {
      selectionIndicator.remove();
      selectionIndicator = null;
      selectionIndicatorAnchor = null;
    }
  }

  function clearAllTranslationPanels() {
    cancelSelectionPanelHide();
    selectionPanelDrag = null;
    selectionPanelResize = null;
    for (const panel of translationPanels.values()) {
      panel.resizeObserver?.disconnect?.();
      panel.tooltip?.remove?.();
    }
    translationPanels.clear();
    translationTooltip = null;
    if (selectionIndicator) selectionIndicator.remove();
    selectionIndicator = null;
    selectionIndicatorAnchor = null;
  }

  function hideTranslationTooltip() {
    cancelSelectionPanelHide();
    selectionPanelDrag = null;
    selectionPanelResize = null;
    for (const panel of Array.from(translationPanels.values())) {
      if (!panel.pinned) removeTranslationPanel(panel.id);
    }
    const latest = getLatestTranslationPanel();
    translationTooltip = latest?.tooltip || null;
    if (!translationTooltip && selectionIndicator) {
      selectionIndicator.remove();
      selectionIndicator = null;
      selectionIndicatorAnchor = null;
    }
  }

  function collapseSelectionPanel() {
    cancelSelectionPanelHide();
    const panel = translationTooltip?._panel;
    if (!panel || panel.pinned) return;
    if (panel.openImmediately) {
      panel.openImmediately = false;
      openSelectionPanel();
      return;
    }
    translationTooltip.style.opacity = '0';
    translationTooltip.style.transform = 'translateY(-4px)';
    translationTooltip.style.pointerEvents = 'none';
  }

  function openSelectionPanel() {
    cancelSelectionPanelHide();
    if (!translationTooltip) return;
    translationTooltip.style.pointerEvents = 'auto';
    requestAnimationFrame(() => {
      if (translationTooltip) {
        translationTooltip.style.opacity = '1';
        translationTooltip.style.transform = 'translateY(0)';
      }
    });
  }

  function scheduleSelectionPanelHide() {
    cancelSelectionPanelHide();
    if (translationTooltip?._panel?.pinned) return;
    selectionPanelHideTimer = setTimeout(collapseSelectionPanel, 450);
  }

  function setSelectionIndicatorState(state = 'ready') {
    if (!selectionIndicator) return;
    const colors = {
      loading: '#f59e0b',
      ready: '#ef4444',
      error: '#dc2626'
    };
    const titles = {
      loading: '翻译中...',
      ready: '打开翻译结果',
      error: '翻译失败，打开详情'
    };
    selectionIndicator.style.background = colors[state] || colors.ready;
    selectionIndicator.title = localizedMessage(
      state === 'loading' ? 'translating' : state === 'error' ? 'openTranslationError' : 'openTranslationResult',
      titles[state] || titles.ready
    );
    selectionIndicator.setAttribute('aria-label', selectionIndicator.title);
  }

  function showSelectionIndicator(state = 'ready', anchor = null) {
    const indicator = createSelectionIndicator();
    if (anchor) selectionIndicatorAnchor = anchor;
    setSelectionIndicatorState(state);
    indicator.style.display = 'block';
    positionSelectionIndicator();
    requestAnimationFrame(() => {
      if (selectionIndicator) selectionIndicator.style.opacity = '1';
    });
  }

  function createTranslationPanel(text, anchor, options = {}) {
    hideTranslationTooltip();
    const tooltip = createTranslationTooltip();
    const layout = getInitialPanelLayout();
    const historyRecord = options.historyRecord || null;
    const panel = {
      id: `panel-${nextTranslationPanelId++}`,
      tooltip,
      sourceText: options.sourceText || '',
      translatedText: text,
      sourceLang: options.sourceLang || 'auto',
      targetLang: options.targetLang || 'zh-Hans',
      structuredBlocks: Array.isArray(options.structuredBlocks) ? options.structuredBlocks : null,
      historyData: options.historyData || null,
      historyId: historyRecord?.id || null,
      historySaveError: options.historySaveError === true,
      historySavePending: false,
      inReadingArea: historyRecord?.inReadingArea === true,
      pinned: false,
      position: layout.position,
      size: layout.size,
      initializing: true,
      status: options.status || 'ready',
      engineId: resolveRequestedTranslationEngine(options.engineId),
      providerId: options.providerId || getTranslationEngineMetadata(options.engineId).providerId,
      providerProfileKey: options.providerProfileKey || '',
      providerProfileName: options.providerProfileName || '',
      cacheTrace: options.cacheTrace || null,
      anchor,
      retranslateBusy: false,
      openImmediately: options.openImmediately === true
    };
    tooltip._panel = panel;
    const normalizedText = normalizeTranslationLayout(text);
    tooltip._copyText = normalizedText;
    if (options.status === 'loading' || options.status === 'error' || !options.sourceText) {
      tooltip._textContainer.textContent = normalizedText;
    } else {
      tooltip._textContainer.textContent = '';
      if (options.showSource !== false) {
        const sourceBadge = tooltip._sourceMeta;
        const engineLabel = getTranslationEngineSourceLabel(panel.engineId, panel.providerId);
        const providerLabel = panel.engineId === TRANSLATION_ENGINE_LOCAL
          ? engineLabel
          : (TRANSLATION_PROVIDER_LABELS[panel.providerId] || panel.providerId || engineLabel);
        const cacheLabel = panel.cacheTrace
          ? (panel.cacheTrace.hits > 0 && panel.cacheTrace.misses === 0
            ? '缓存命中'
            : panel.cacheTrace.hits > 0
              ? `缓存 ${panel.cacheTrace.hits}/${panel.cacheTrace.hits + panel.cacheTrace.misses}`
              : '已请求')
          : '';
        if (sourceBadge) {
          sourceBadge.style.display = 'flex';
          sourceBadge.textContent = '';
          const details = document.createElement('span');
          details.style.cssText = 'min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          details.textContent = [providerLabel, panel.providerProfileName].filter(Boolean).join(' / ');
          const state = document.createElement('span');
          state.style.cssText = `flex:none;color:${cacheLabel === '缓存命中' ? '#7bd8a2' : cacheLabel === '已请求' ? '#91c9ff' : '#c4ccd6'};font-weight:600;`;
          state.textContent = cacheLabel;
          sourceBadge.append(details, state);
          sourceBadge.title = [engineLabel, panel.providerProfileName, cacheLabel, formatTranslationSource(panel.sourceLang, panel.targetLang)].filter(Boolean).join(' · ');
          sourceBadge.setAttribute('aria-label', sourceBadge.title);
        }
      }
      if (options.showBilingual !== false) {
        const sourceBlock = document.createElement('div');
        sourceBlock.textContent = normalizeTranslationLayout(panel.sourceText);
        sourceBlock.style.cssText = 'color:#cbd5e1;font-size:12px;font-weight:400;line-height:1.65;margin-bottom:10px;white-space:pre-wrap;';
        tooltip._textContainer.appendChild(sourceBlock);
      }
      const translatedBlock = document.createElement('div');
      translatedBlock.textContent = normalizedText;
      translatedBlock.style.cssText = `color:#fff;font-size:13px;font-weight:${panel.targetLang === 'zh-Hans' || panel.targetLang === 'zh-Hant' ? '600' : '500'};line-height:1.6;white-space:pre-wrap;`;
      tooltip._textContainer.appendChild(translatedBlock);
    }
    if (panel.historySaveError) {
      const retryHistoryButton = document.createElement('button');
      retryHistoryButton.type = 'button';
      retryHistoryButton.textContent = '重试保存';
      retryHistoryButton.title = '历史保存失败，点击重试';
      retryHistoryButton.style.cssText = 'height:25px;padding:0 7px;border:1px solid rgba(255,255,255,.24);border-radius:4px;background:#7f1d1d;color:#fff;font-size:11px;line-height:1;white-space:nowrap;cursor:pointer;';
      retryHistoryButton.addEventListener('click', (event) => { event.stopPropagation(); void retryPanelHistorySave(panel); });
      tooltip._actionBar.insertBefore(retryHistoryButton, tooltip._closeButton);
      tooltip._historyRetryButton = retryHistoryButton;
    }
    if (options.status === 'loading') tooltip._actionBar.style.display = 'none';
    if (options.background) tooltip.style.background = options.background;
    document.body.appendChild(tooltip);
    translationPanels.set(panel.id, panel);
    translationTooltip = tooltip;
    updateTranslationPanelButtons(panel);
    applySelectionPanelPosition(tooltip);
    showSelectionIndicator(options.status === 'loading' ? 'loading' : options.status === 'error' ? 'error' : 'ready', anchor);
    collapseSelectionPanel();
    requestAnimationFrame(() => {
      panel.initializing = false;
    });
    return panel;
  }

  function showTranslationTooltip(text, anchor, options = {}) {
    return createTranslationPanel(text, anchor, options);
  }

  function updateSizeTunerPreview(panel) {
    const label = panel?.tooltip?._sizeTunerPreviewLabel;
    if (!label || !panel.size) return;
    label.textContent = `${Math.round(panel.size.width)} × ${Math.round(panel.size.height)} px`;
  }

  function openSelectionPanelSizeTuner() {
    const existing = [...translationPanels.values()].find((panel) => panel.isSizeTuner);
    if (existing?.tooltip?.isConnected) {
      existing.tooltip.style.display = 'block';
      // Preserve the user's in-progress dimensions when the popup asks to reveal it again.
      applySelectionPanelPosition(existing.tooltip, { applySize: false });
      updateSizeTunerPreview(existing);
      return existing;
    }
    const panel = createTranslationPanel('这是调试译文。拖动右下角调整大小，满意后再保存。', null, {
      sourceText: 'This is a size tuning panel. It does not translate or enter history.',
      sourceLang: 'en',
      targetLang: 'zh-Hans',
      showBilingual: false,
      showSource: false,
      openImmediately: true
    });
    panel.isSizeTuner = true;
    panel.pinned = true;
    const { tooltip } = panel;
    tooltip._textContainer.textContent = '';
    tooltip._textContainer.style.cssText = 'position:absolute;top:42px;left:12px;right:12px;bottom:50px;display:block;overflow:hidden;';
    tooltip._footerBar.style.cssText += 'position:absolute;left:12px;right:12px;bottom:10px;margin:0;box-sizing:border-box;';
    const previewSurface = document.createElement('div');
    previewSurface.style.cssText = 'display:flex;width:100%;height:100%;box-sizing:border-box;align-items:center;justify-content:center;border:1px dashed rgba(147,197,253,.32);border-radius:4px;background:repeating-linear-gradient(0deg,transparent 0 18px,rgba(147,197,253,.06) 18px 19px),repeating-linear-gradient(90deg,transparent 0 18px,rgba(147,197,253,.06) 18px 19px);';
    const previewLabel = document.createElement('span');
    previewLabel.style.cssText = 'padding:4px 7px;border-radius:3px;background:rgba(15,23,42,.72);color:#bfdbfe;font-size:11px;font-variant-numeric:tabular-nums;';
    previewSurface.appendChild(previewLabel);
    tooltip._textContainer.appendChild(previewSurface);
    tooltip._sizeTunerPreviewLabel = previewLabel;
    tooltip._copyButton.style.display = 'none';
    tooltip._readingButton.style.display = 'none';
    tooltip._pinButton.style.display = 'none';
    tooltip._retranslateButton.style.display = 'none';
    tooltip._retranslateMenu.style.display = 'none';
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = '保存为全局大小';
    saveButton.style.cssText = 'height:25px;padding:0 8px;border:1px solid #4b9ff0;border-radius:4px;background:#1d4f78;color:#eaf6ff;font-size:11px;white-space:nowrap;cursor:pointer;';
    saveButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const size = normalizeSelectionPanelSize(panel.size);
      await chrome.storage.local.set({ [SELECTION_PANEL_DEFAULT_SIZE_KEY]: size });
      selectionPanelDefaultSize = size;
      saveButton.textContent = '已保存';
      setTimeout(() => { if (saveButton.isConnected) saveButton.textContent = '保存为全局大小'; }, 1200);
    });
    tooltip._actionBar.insertBefore(saveButton, tooltip._closeButton);
    updateSizeTunerPreview(panel);
    return panel;
  }

  function showLoadingTooltip(anchor, options = {}) {
    return createTranslationPanel('翻译中...', anchor, {
      status: 'loading',
      background: '#374151',
      openImmediately: options.openImmediately === true
    });
  }

  function addErrorPanelActions(panel, retryRequest) {
    if (!panel?.tooltip || !retryRequest) return;
    const tooltip = panel.tooltip;
    tooltip._actionBar.style.display = 'flex';
    tooltip._copyButton.style.display = 'none';
    tooltip._pinButton.style.display = 'none';
    tooltip._readingButton.style.display = 'none';
    tooltip._retryActions?.remove?.();
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:4px;min-width:0;';
    for (const [engineId, label] of [['', '重试'], [TRANSLATION_ENGINE_LOCAL, '本地'], ['online', '在线'], ['llm', '大模型']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.title = engineId ? '使用' + label + '翻译' : '按原方式重试';
      button.style.cssText = 'height:25px;padding:0 7px;border:1px solid rgba(255,255,255,.24);border-radius:4px;background:#374151;color:#fff;font-size:11px;line-height:1;white-space:nowrap;cursor:pointer;';
      button.addEventListener('click', (event) => { event.stopPropagation(); void handleTextSelection({ ...retryRequest, force: true, allowUi: true, engineId: engineId || retryRequest.engineId }); });
      actions.appendChild(button);
    }
    tooltip._actionBar.insertBefore(actions, tooltip._closeButton);
    tooltip._retryActions = actions;
  }

  function showErrorTooltip(message, anchor, retryRequest = null) {
    const panel = createTranslationPanel(message, anchor, { status: 'error', background: '#dc2626' });
    addErrorPanelActions(panel, retryRequest);
    return panel;
  }

  const EXCLUDED = new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','CANVAS','SVG','CODE','PRE','TEXTAREA','INPUT','BUTTON','SELECT']);

  function* walkTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node) return NodeFilter.FILTER_REJECT;
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const pe = node.parentElement;
        
        // 排除基本标签
        if (EXCLUDED.has(pe.tagName)) return NodeFilter.FILTER_REJECT;
        
        // 排除漂浮翻译按钮及其子元素
        let element = pe;
        while (element) {
          if (element.id === 'translator-floating-button') {
            return NodeFilter.FILTER_REJECT;
          }
          element = element.parentElement;
        }
        
        // 排除翻译提示框和可能的其他翻译工具元素
        element = pe;
        while (element) {
          if (element.id && (
            element.id.includes('translator') || 
            element.id.includes('translation') ||
            element.classList?.contains('translator-overlay') ||
            element.classList?.contains('translation-tooltip')
          )) {
            return NodeFilter.FILTER_REJECT;
          }
          element = element.parentElement;
        }
        
        const txt = node.nodeValue || '';
        if (!txt.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let cur;
    while ((cur = walker.nextNode())) {
      yield cur;
    }
  }

  const STRUCTURED_ROOT_TAGS = new Set([
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'CODE', 'TABLE'
  ]);
  const STRUCTURED_SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CANVAS',
    'FORM', 'NAV', 'FOOTER', 'ASIDE', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'
  ]);
  const READER_FLOW_BREAK_TAG = 'BR';
  const READER_HARD_BREAK_TAG = 'HR';
  const DECORATIVE_READER_TEXT = /^[\s\-–—=*_>»→·•]+$/;

  function isDecorativeReaderText(value) {
    const text = String(value || '').replace(/\u00a0/g, ' ').trim();
    return !text || DECORATIVE_READER_TEXT.test(text);
  }

  function normalizeReaderFlowText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function extractStructuredCitationKey(value) {
    const text = String(value || '')
      .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
      .trim();
    const bracketed = text.match(/^[\[【(（]\s*([^\]】)）\s]+?)\s*[\]】)）]/);
    if (bracketed) return bracketed[1].trim();
    const numeric = text.match(/^\d+(?=\s|[:：、,，.。]|$)/);
    return numeric ? numeric[0] : '';
  }

  function stableStructuredHash(value) {
    let hash = 2166136261;
    for (const char of String(value || '')) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function makeStructuredReferenceId(href, text) {
    return `ref-${stableStructuredHash(`${href}|${text}`)}`;
  }

  function getStructuredSourceAnchorId(element) {
    return String(element?.id || element?.getAttribute?.('name') || '').trim();
  }

  function decorateStructuredBlock(block) {
    if (!block || typeof block !== 'object') return block;
    if (block.type === 'list') {
      return {
        ...block,
        items: (block.items || []).map((item) => decorateStructuredBlock(item))
      };
    }
    if (block.type === 'table') {
      return {
        ...block,
        rows: (block.rows || []).map((row) => row.map((cell) => decorateStructuredBlock(cell)))
      };
    }
    const citationKey = extractStructuredCitationKey(block.sourceText);
    return citationKey ? { ...block, citationKey } : block;
  }

  function getStructuredLinks(node) {
    const links = [];
    const visit = (current) => {
      if (!current || current.nodeType !== Node.ELEMENT_NODE) return;
      if (current.tagName === 'A') {
        const rawHref = current.getAttribute('href') || current.href || '';
        const text = getStructuredNodeText(current);
        if (!rawHref || !text) return;
        try {
          const url = new URL(rawHref, document.baseURI || window.location.href);
          const href = url.href;
          const samePage = url.origin === location.origin;
          if (/^(?:https?:|mailto:)/i.test(href) || (samePage && url.hash)) {
            const citationKey = extractStructuredCitationKey(text);
            const link = {
              href,
              text,
              referenceId: makeStructuredReferenceId(href, text)
            };
            if (citationKey) link.citationKey = citationKey;
            if (url.hash) link.targetAnchorId = decodeURIComponent(url.hash.slice(1));
            links.push(link);
          }
        } catch {}
        return;
      }
      for (const child of current.childNodes || []) visit(child);
    };
    visit(node);
    return links.slice(0, 64);
  }

  function getStructuredNodeText(node) {
    let result = '';
    const visit = (current) => {
      if (!current) return;
      if (current.nodeType === Node.TEXT_NODE) {
        result += current.nodeValue || '';
        return;
      }
      if (current.nodeType !== Node.ELEMENT_NODE) return;
      if (current.tagName === 'BR') {
        result += '\n';
        return;
      }
      for (const child of current.childNodes || []) visit(child);
    };
    visit(node);
    return normalizeTranslationLayout(result)
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function createStructuredBlock(element) {
    const tag = element.tagName;
    const className = String(element.className || '').toLowerCase();
    const sourceText = getStructuredNodeText(element).slice(0, MAX_STRUCTURED_BLOCK_TEXT_LENGTH);
    if (!sourceText && !['TABLE', 'UL', 'OL'].includes(tag)) return null;

    if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(element.children)
        .filter((child) => child.tagName === 'LI')
        .map((child) => ({
          sourceText: getStructuredNodeText(child).slice(0, MAX_STRUCTURED_BLOCK_TEXT_LENGTH),
          translatedText: '',
          links: getStructuredLinks(child),
          sourceAnchorId: getStructuredSourceAnchorId(child)
        }))
        .filter((item) => item.sourceText && !isDecorativeReaderText(item.sourceText));
      return items.length ? decorateStructuredBlock({ type: 'list', ordered: tag === 'OL', items }) : null;
    }

    if (tag === 'TABLE') {
      const rows = Array.from(element.rows || []).map((row) =>
        Array.from(row.cells || [])
          .map((cell) => ({
            sourceText: getStructuredNodeText(cell).slice(0, MAX_STRUCTURED_BLOCK_TEXT_LENGTH),
            translatedText: '',
            links: getStructuredLinks(cell),
            sourceAnchorId: getStructuredSourceAnchorId(cell)
          }))
          .filter((cell) => cell.sourceText)
      ).filter((row) => row.length);
      return rows.length ? decorateStructuredBlock({ type: 'table', rows }) : null;
    }

    const isTitleClass = tag === 'P' && /(?:^|\s)title\d*(?:\s|$)/.test(className);
    const isDateClass = tag === 'P' && /(?:^|\s)date(?:\s|$)/.test(className);
    const headingMatch = tag.match(/^H([1-6])$/);
    const type = headingMatch || isTitleClass
      ? 'heading'
      : isDateClass
        ? 'meta'
        : tag === 'BLOCKQUOTE'
          ? 'quote'
          : tag === 'PRE' || tag === 'CODE'
            ? 'code'
            : tag === 'LI'
              ? 'listItem'
              : 'paragraph';
    const block = {
      type,
      level: type === 'heading' ? (headingMatch ? Number(headingMatch[1]) : 1) : undefined,
      sourceText,
      translatedText: '',
      sourceAnchorId: getStructuredSourceAnchorId(element)
    };
    const links = getStructuredLinks(element);
    if (links.length) block.links = links;
    return decorateStructuredBlock(block);
  }

  function extractStructuredBlocksFromFragment(fragment) {
    const blocks = [];
    let pendingInlineText = '';
    let pendingInlineLinks = [];
    let consecutiveBreaks = 0;

    const pushParagraph = (value, links = []) => {
      const sourceText = normalizeReaderFlowText(value).slice(0, MAX_STRUCTURED_BLOCK_TEXT_LENGTH);
      if (!sourceText || isDecorativeReaderText(sourceText)) return;
      const block = { type: 'paragraph', sourceText, translatedText: '' };
      if (links.length) block.links = links.slice(0, 64);
      blocks.push(decorateStructuredBlock(block));
    };
    const flushPending = () => {
      pushParagraph(pendingInlineText, pendingInlineLinks);
      pendingInlineText = '';
      pendingInlineLinks = [];
      consecutiveBreaks = 0;
    };
    const visit = (node) => {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        pendingInlineText += node.nodeValue || '';
        consecutiveBreaks = 0;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (STRUCTURED_SKIP_TAGS.has(node.tagName)) return;
      if (node.tagName === 'A') {
        pendingInlineLinks.push(...getStructuredLinks(node));
        for (const child of node.childNodes || []) visit(child);
        return;
      }
      if (node.tagName === READER_FLOW_BREAK_TAG) {
        consecutiveBreaks += 1;
        pendingInlineText = pendingInlineText.replace(/[ \t]+$/g, '');
        pendingInlineText += '\n';
        if (consecutiveBreaks >= 2) flushPending();
        return;
      }
      if (node.tagName === READER_HARD_BREAK_TAG) {
        flushPending();
        return;
      }
      if (STRUCTURED_ROOT_TAGS.has(node.tagName)) {
        flushPending();
        const block = createStructuredBlock(node);
        if (block && !isDecorativeReaderText(block.sourceText)) blocks.push(block);
        return;
      }
      for (const child of node.childNodes || []) visit(child);
    };
    for (const child of fragment.childNodes || []) visit(child);
    flushPending();
    return blocks.slice(0, MAX_STRUCTURED_BLOCKS);
  }

  function extractStructuredBlocksFromSelection(selection) {
    if (!selection || selection.rangeCount === 0) return [];
    try {
      return extractStructuredBlocksFromFragment(selection.getRangeAt(0).cloneContents());
    } catch {
      return [];
    }
  }

  const READER_NEGATIVE_HINTS = /(?:^|[-_ ])(?:nav|menu|sidebar|side-bar|footer|header|comment|comments|recommend|related|social|share|advert|promo|breadcrumb|toolbar|widget)(?:$|[-_ ])/i;
  const READER_POSITIVE_HINTS = /(?:^|[-_ ])(?:article|content|post|entry|main|read|body|story|正文|文章|内容)(?:$|[-_ ])/i;

  function scoreReadableCandidate(element) {
    if (!element || STRUCTURED_SKIP_TAGS.has(element.tagName)) return null;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return null;

    const text = getStructuredNodeText(element);
    const textLength = text.length;
    if (textLength < 180) return null;

    const paragraphs = element.querySelectorAll('p').length;
    const headings = element.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
    const listItems = element.querySelectorAll('li').length;
    const linkTextLength = Array.from(element.querySelectorAll('a'))
      .reduce((total, link) => total + getStructuredNodeText(link).length, 0);
    const linkDensity = linkTextLength / Math.max(textLength, 1);
    const punctuationCount = (text.match(/[。！？!?；;，,.:：]/g) || []).length;
    const hint = `${element.id || ''} ${element.className || ''} ${element.getAttribute('role') || ''}`;

    let score = Math.min(textLength, 30000) * 0.08;
    score += Math.min(paragraphs, 80) * 22;
    score += Math.min(headings, 12) * 24;
    score += Math.min(listItems, 80) * 2;
    score += Math.min(punctuationCount, 500) * 0.7;
    score -= linkDensity * 280;
    if (READER_POSITIVE_HINTS.test(hint)) score += 120;
    if (READER_NEGATIVE_HINTS.test(hint)) score -= 260;
    if (element.tagName === 'ARTICLE') score += 260;
    if (element.tagName === 'MAIN') score += 180;
    if (element.getAttribute('role') === 'main') score += 160;
    if (element === document.body) score -= 180;
    if (paragraphs === 0 && textLength > 1200) score -= 90;
    if (textLength > 120000) score -= 180;

    return { element, score, textLength, paragraphs, linkDensity };
  }

  function getReadablePageRoot() {
    const semanticCandidates = Array.from(document.querySelectorAll('article, main, [role="main"]'));
    const genericCandidates = Array.from(document.querySelectorAll('section, div'))
      .sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0))
      .slice(0, 160);
    const candidates = Array.from(new Set([
      ...semanticCandidates,
      ...genericCandidates,
      document.body,
      document.documentElement
    ]));
    const scored = candidates.map(scoreReadableCandidate).filter(Boolean);
    const best = scored.sort((a, b) => b.score - a.score)[0];
    if (best) {
      console.info('Structured reader root selected:', {
        tag: best.element.tagName,
        id: best.element.id || '',
        score: Math.round(best.score),
        textLength: best.textLength,
        paragraphs: best.paragraphs,
        linkDensity: Number(best.linkDensity.toFixed(3))
      });
      return best.element;
    }
    return document.body || document.documentElement;
  }

  function trimReaderPreamble(root) {
    if (!root || !root.childNodes) return;
    const children = Array.from(root.childNodes);
    const hrIndex = children.findIndex((node) => node.nodeType === Node.ELEMENT_NODE && node.tagName === READER_HARD_BREAK_TAG);
    if (hrIndex <= 0) return;

    const before = children.slice(0, hrIndex);
    const hasStructuredContent = before.some((node) =>
      node.nodeType === Node.ELEMENT_NODE && STRUCTURED_ROOT_TAGS.has(node.tagName)
    );
    if (hasStructuredContent) return;

    const beforeText = normalizeReaderFlowText(before.map((node) => node.textContent || '').join(' '));
    const linkCount = before.reduce((count, node) => count + (
      node.nodeType === Node.ELEMENT_NODE
        ? (node.matches('a') ? 1 : node.querySelectorAll('a').length)
        : 0
    ), 0);
    const looksLikeNavigation = linkCount > 0 || /(?:相关链接|related links|->|→)/i.test(beforeText);
    if (!looksLikeNavigation || beforeText.length > 1800) return;

    before.forEach((node) => node.remove());
    children[hrIndex].remove();
  }

  function extractStructuredBlocksFromPage() {
    const root = getReadablePageRoot();
    if (!root) return [];
    const clone = root.cloneNode(true);
    clone.querySelectorAll('[hidden], [aria-hidden="true"], script, style, noscript, iframe, svg, canvas, form, nav, footer, aside, button, input, textarea, select')
      .forEach((element) => element.remove());
    trimReaderPreamble(clone);
    return extractStructuredBlocksFromFragment(clone);
  }

  function getStructuredBlockText(block, field = 'sourceText') {
    if (!block) return '';
    if (block.type === 'list') {
      return (block.items || []).map((item) => item[field] || '').filter(Boolean).join('\n');
    }
    if (block.type === 'table') {
      return (block.rows || []).map((row) => row.map((cell) => cell[field] || '').join(' | ')).filter(Boolean).join('\n');
    }
    return block[field] || '';
  }

  function formatStructuredBlocks(blocks, field = 'sourceText') {
    return (blocks || []).map((block) => {
      const text = getStructuredBlockText(block, field);
      if (block.type === 'list') return text.split('\n').map((item) => `• ${item}`).join('\n');
      return text;
    }).filter(Boolean).join('\n\n');
  }

  async function mapWithConcurrency(items, worker, concurrency = STRUCTURED_TRANSLATION_CONCURRENCY) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return [];
    const output = new Array(list.length);
    let nextIndex = 0;
    const run = async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= list.length) return;
        output[index] = await worker(list[index], index);
      }
    };
    const workerCount = Math.min(Math.max(1, concurrency), list.length);
    await Promise.all(Array.from({ length: workerCount }, () => run()));
    return output;
  }

  function countStructuredTranslationUnits(blocks) {
    return (blocks || []).reduce((total, block) => {
      if (block.type === 'code') return total;
      if (block.type === 'list') return total + (block.items || []).length;
      if (block.type === 'table') return total + (block.rows || []).reduce((rowTotal, row) => rowTotal + row.length, 0);
      return total + 1;
    }, 0);
  }

  async function translateStructuredBlocks(blocks, sourceLang, targetLang, engineId, providerProfileKey = '', cacheTrace = null) {
    const total = countStructuredTranslationUnits(blocks);
    let completed = 0;
    const translateOne = async (text) => {
      const translatedText = await translateSelectedText(text, sourceLang, targetLang, 3, engineId, providerProfileKey, cacheTrace);
      completed += 1;
      showOverlay(`正在翻译结构化内容 (${completed}/${total})...`);
      if (completed >= total) setTimeout(hideOverlay, 900);
      return translatedText;
    };

    return mapWithConcurrency(blocks || [], async (block) => {
      if (block.type === 'code') return { ...block, translatedText: block.sourceText };
      if (block.type === 'list') {
        const items = await mapWithConcurrency(block.items || [], async (item) => ({
          ...item,
          translatedText: await translateOne(item.sourceText)
        }));
        return { ...block, items };
      }
      if (block.type === 'table') {
        const rows = await mapWithConcurrency(block.rows || [], (row) => mapWithConcurrency(row, async (cell) => ({
          ...cell,
          translatedText: await translateOne(cell.sourceText)
        })));
        return { ...block, rows };
      }
      return {
        ...block,
        translatedText: await translateOne(block.sourceText)
      };
    });
  }

  function copyStructuredBlocksAsOriginal(blocks) {
    return (blocks || []).map((block) => {
      if (block.type === 'list') {
        return {
          ...block,
          items: (block.items || []).map((item) => ({
            ...item,
            translatedText: item.sourceText
          }))
        };
      }
      if (block.type === 'table') {
        return {
          ...block,
          rows: (block.rows || []).map((row) => row.map((cell) => ({
            ...cell,
            translatedText: cell.sourceText
          })))
        };
      }
      return { ...block, translatedText: block.sourceText };
    });
  }

  async function buildStructuredPageHistory(targetLang, engineId) {
    const blocks = extractStructuredBlocksFromPage();
    if (!blocks.length) throw new Error('页面没有可读取的结构化正文。');

    const sourceText = formatStructuredBlocks(blocks, 'sourceText');
    if (!sourceText.trim()) throw new Error('页面正文为空。');
    showOverlay(`正在提取网页结构 (${blocks.length} 个内容块)...`);

    const sourceLang = await detectSourceLanguage(targetLang);
    if (!sourceLang) throw new Error('无法判断网页原文语言。');
    const sameLanguage = normalizeLang(sourceLang) === normalizeLang(targetLang);
    const sameLanguageMode = await loadSameLanguageMode();
    const translateSameLanguage = sameLanguage && sameLanguageMode === 'translate';
    const effectiveTargetLang = translateSameLanguage
      ? (getNextTargetLanguage(targetLang) || targetLang)
      : targetLang;
    const providerId = await resolveTranslationProviderId(engineId);
    const providerProfileKey = await resolveTranslationProviderProfileKey(providerId);
    const translatedBlocks = sameLanguage && !translateSameLanguage
      ? copyStructuredBlocksAsOriginal(blocks)
      : await translateStructuredBlocks(blocks, sourceLang, effectiveTargetLang, engineId, providerProfileKey);
    const translatedText = sameLanguage && !translateSameLanguage
      ? sourceText
      : formatStructuredBlocks(translatedBlocks, 'translatedText');
    if (sameLanguage && !translateSameLanguage) showOverlay('检测到页面已经是目标语言，保留原文结构');
    const metadata = getTranslationEngineMetadata(engineId);
    hideOverlay();
    return saveTranslationHistory({
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      engineId,
      engineStage: metadata.stage,
      providerId,
      providerProfileKey,
      structuredBlocks: translatedBlocks
    }, { transientReader: true });
  }

  function getTextScriptStats(text) {
    const stats = { letters: 0, cjk: 0, kana: 0, hangul: 0, latin: 0, cyrillic: 0, arabic: 0, digits: 0 };
    for (const char of String(text ?? '')) {
      const code = char.codePointAt(0);
      if (code >= 0x30 && code <= 0x39) {
        stats.digits++;
        continue;
      }
      const isCjk = (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x4e00 && code <= 0x9fff) || (code >= 0xf900 && code <= 0xfaff);
      const isKana = (code >= 0x3040 && code <= 0x30ff) || (code >= 0x31f0 && code <= 0x31ff);
      const isHangul = (code >= 0xac00 && code <= 0xd7af) || (code >= 0x1100 && code <= 0x11ff);
      const isLatin = (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a) || (code >= 0x00c0 && code <= 0x024f);
      const isCyrillic = code >= 0x0400 && code <= 0x052f;
      const isArabic = code >= 0x0600 && code <= 0x06ff;
      if (isCjk) stats.cjk++;
      if (isKana) stats.kana++;
      if (isHangul) stats.hangul++;
      if (isLatin) stats.latin++;
      if (isCyrillic) stats.cyrillic++;
      if (isArabic) stats.arabic++;
      if (isCjk || isKana || isHangul || isLatin || isCyrillic || isArabic) stats.letters++;
    }
    return stats;
  }

  function isContentText(text) {
    const value = String(text ?? '').trim();
    if (!value || value.length < 2) return false;
    if (/^(?:https?:\/\/|ftp:\/\/|www\.|mailto:)/i.test(value)) return false;
    if (/^[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}$/.test(value)) return false;
    const stats = getTextScriptStats(value);
    if (stats.letters < 2) return false;
    if (stats.digits > stats.letters * 2 && stats.letters < 6) return false;
    return true;
  }

  function inferLanguageFromText(text) {
    const stats = getTextScriptStats(text);
    if (stats.letters < 2) return null;
    if (stats.hangul >= 2 && stats.hangul >= stats.cjk) return 'ko';
    if (stats.kana >= 1) return 'ja';
    if (stats.cjk >= 2 && stats.cjk >= stats.latin) return 'zh-Hans';
    if (stats.cyrillic >= 2 && stats.cyrillic >= stats.latin) return 'ru';
    if (stats.arabic >= 2 && stats.arabic >= stats.latin) return 'ar';
    if (stats.latin >= 2) return 'en';
    return null;
  }

  function shouldTranslateText(text, targetLang) {
    const value = String(text ?? '').trim();
    if (!isContentText(value)) return false;
    const target = normalizeLang(targetLang || currentTargetLang);
    const stats = getTextScriptStats(value);
    if ((target === 'zh-Hans' || target === 'zh-Hant') && stats.cjk >= 2 && stats.kana === 0 && stats.hangul === 0) return false;
    if (target === 'ja' && stats.kana >= 1) return false;
    if (target === 'ko' && stats.hangul >= 2) return false;
    if (target === 'ru' && stats.cyrillic >= 2) return false;
    if (target === 'ar' && stats.arabic >= 2) return false;
    return true;
  }

  function samplePageText(maxLen = 2000) {
    const candidates = [];
    for (const tn of walkTextNodes(document.body || document.documentElement)) {
      const value = (tn.nodeValue || '').trim();
      if (isContentText(value)) candidates.push(value);
    }
    candidates.sort((a, b) => b.length - a.length);
    let acc = '';
    for (const value of candidates.slice(0, 24)) {
      if (acc.length + value.length + 1 > maxLen) continue;
      acc += (acc ? '\n' : '') + value;
      if (acc.length >= maxLen) break;
    }
    return acc;
  }

  function normalizeLang(code) {
    if (!code) return code;
    if (code === 'zh') return 'zh-Hans';
    return code;
  }

  function normalizeChineseTranslatedPunctuation(text, targetLanguage) {
    if (!['zh-Hans', 'zh-Hant'].includes(normalizeLang(targetLanguage))) return String(text || '');
    const han = '\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
    return String(text || '')
      .replace(new RegExp(`([${han}])\\s*,\\s*`, 'g'), '$1，')
      .replace(new RegExp(`([${han}])\\s*;\\s*`, 'g'), '$1；')
      .replace(new RegExp(`([${han}])\\s*:\\s*`, 'g'), '$1：')
      .replace(new RegExp(`([${han}])\\s*!\\s*(?=\\s|$|[”）】])`, 'g'), '$1！')
      .replace(new RegExp(`([${han}])\\s*\\?\\s*(?=\\s|$|[”）】])`, 'g'), '$1？')
      .replace(new RegExp(`([${han}])\\s*\\.\\s*(?=\\s|$|[”）】])`, 'g'), '$1。');
  }

  function normalizeDetectedLanguage(code) {
    const value = String(code || '').trim();
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower === 'zh' || lower === 'zh-hans' || lower.startsWith('zh-cn') || lower.startsWith('zh-sg')) return 'zh-Hans';
    if (lower === 'zh-hant' || lower.startsWith('zh-tw') || lower.startsWith('zh-hk')) return 'zh-Hant';
    const base = lower.split('-')[0];
    return DETECTION_EXPECTED_LANGUAGES.includes(base) ? base : null;
  }

  function getDocumentLanguageHint() {
    return normalizeDetectedLanguage(document.documentElement?.lang || '');
  }

  function getDetectionSamples(text, maxLength = 900) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value) return [];
    if (value.length <= maxLength) return [value];

    const offsets = [0, Math.floor((value.length - maxLength) / 2), value.length - maxLength];
    return [...new Set(offsets.map((offset) => value.slice(offset, offset + maxLength).trim()).filter(Boolean))];
  }

  function chooseDetectedLanguage(resultGroups) {
    const scores = new Map();
    for (const results of resultGroups) {
      for (const [rank, result] of (Array.isArray(results) ? results.slice(0, 3) : []).entries()) {
        const language = normalizeDetectedLanguage(result?.detectedLanguage);
        const confidence = Number(result?.confidence);
        if (!language || !Number.isFinite(confidence) || confidence <= 0) continue;
        const rankWeight = rank === 0 ? 1 : rank === 1 ? 0.35 : 0.15;
        scores.set(language, (scores.get(language) || 0) + confidence * rankWeight);
      }
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [winner, winnerScore] = ranked[0] || [];
    const runnerUpScore = ranked[1]?.[1] || 0;
    const sampleCount = Math.max(1, resultGroups.length);
    if (!winner) return null;
    if (winnerScore / sampleCount < DETECTION_MIN_CONFIDENCE) return null;
    if ((winnerScore - runnerUpScore) / sampleCount < DETECTION_MIN_MARGIN) return null;
    return winner;
  }

  function resolveDetectedLanguage(text, resultGroups, options = {}) {
    const scriptHint = inferLanguageFromText(text);
    // Kana, Hangul, Cyrillic, and Arabic are reliable visual evidence. CJK alone is not: Japanese can be Kanji-only.
    if (['ja', 'ko', 'ru', 'ar'].includes(scriptHint)) return scriptHint;
    const detected = chooseDetectedLanguage(resultGroups);
    if (detected) return detected;
    const documentHint = options.documentHint ? getDocumentLanguageHint() : null;
    return documentHint || scriptHint || null;
  }

  // Get next target language when source and target are the same
  function getNextTargetLanguage(currentLang) {
    const languages = ['zh-Hans', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'it', 'pt', 'zh-Hant'];
    const currentIndex = languages.indexOf(currentLang);
    if (currentIndex === -1) {
      return 'zh-Hans'; // Default fallback
    }
    // Return next language in the list, wrap around to beginning if at end
    return languages[(currentIndex + 1) % languages.length];
  }

  async function detectSourceLanguage(targetLang = null) {
    const text = samplePageText();
    if (!text) return null;
    if (['ja', 'ko', 'ru', 'ar'].includes(inferLanguageFromText(text))) return inferLanguageFromText(text);

    let detector = null;
    try {
      if (typeof window.LanguageDetector === 'undefined') return resolveDetectedLanguage(text, [], { documentHint: true });
      detector = await window.LanguageDetector.create({ expectedInputLanguages: DETECTION_EXPECTED_LANGUAGES });
      const resultGroups = [];
      for (const sample of getDetectionSamples(text)) {
        resultGroups.push(await detector.detect(sample));
      }
      return resolveDetectedLanguage(text, resultGroups, { documentHint: true });
    } catch (e) {
      console.warn('Page language detection failed; using script or document hint:', e);
      return resolveDetectedLanguage(text, [], { documentHint: true });
    } finally {
      detector?.destroy?.();
    }
  }

  // Detect language for selected text. This remains request-local and is never persisted as a global source setting.
  async function detectTextLanguage(text) {
    if (!text || text.trim().length < 2) return null;
    if (['ja', 'ko', 'ru', 'ar'].includes(inferLanguageFromText(text))) return inferLanguageFromText(text);

    let detector = null;
    try {
      if (!isTranslatorAPIAvailable()) return inferLanguageFromText(text);
      detector = await window.LanguageDetector.create({ expectedInputLanguages: DETECTION_EXPECTED_LANGUAGES });
      const resultGroups = [];
      for (const sample of getDetectionSamples(text)) {
        resultGroups.push(await detector.detect(sample));
      }
      return resolveDetectedLanguage(text, resultGroups);
    } catch (e) {
      console.warn('Language detection failed; using script hint:', e);
      return inferLanguageFromText(text);
    } finally {
      detector?.destroy?.();
    }
  }

  async function ensureTranslator(sourceLang, targetLang) {
    const src = normalizeLang(sourceLang);
    const tgt = normalizeLang(targetLang || 'zh-Hans');
    if (!src) throw new Error('无法判断网页原文语言，已跳过自动翻译。');
    if (translator && currentSourceLang === src && currentTargetLang === tgt) return translator;
    if (typeof window.Translator === 'undefined') {
      throw new Error('此页面上下文不支持 Translator API（需要 Chrome 138+ 且安全上下文）。');
    }
    if (translator) {
      try { translator.destroy?.(); } catch {}
    }
    translator = await window.Translator.create({ sourceLanguage: src, targetLanguage: tgt });
    currentSourceLang = src;
    currentTargetLang = tgt;
    return translator;
  }

  // Check if Translator API is available
  function isTranslatorAPIAvailable() {
    return typeof window.Translator !== 'undefined' &&
           typeof window.LanguageDetector !== 'undefined' &&
           window.isSecureContext;
  }

  async function ensureTranslationEngine(engineId, sourceLang, targetLang, channel = 'selection') {
    const normalizedEngine = resolveRequestedTranslationEngine(engineId);
    if (normalizedEngine !== TRANSLATION_ENGINE_LOCAL) return null;
    return channel === 'page'
      ? ensureTranslator(sourceLang, targetLang)
      : ensureSelectionTranslator(sourceLang, targetLang);
  }

  async function translateWithEngine(text, sourceLang, targetLang, options = {}) {
    const engineId = resolveRequestedTranslationEngine(options.engineId);
    const providerId = engineId === TRANSLATION_ENGINE_LOCAL
      ? ''
      : (options.providerId || await loadEffectiveTranslationProvider(engineId));
    const providerProfileKey = engineId === TRANSLATION_ENGINE_LOCAL
      ? ''
      : (options.providerProfileKey || await resolveTranslationProviderProfileKey(providerId));
    const cached = await readTranslationCache(text, sourceLang, targetLang, engineId, providerId, providerProfileKey);
    if (cached !== null) {
      if (options.cacheTrace) options.cacheTrace.hits += 1;
      return cached;
    }
    if (options.cacheTrace) options.cacheTrace.misses += 1;

    let translation;
    if (engineId !== TRANSLATION_ENGINE_LOCAL) {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_WITH_PROVIDER',
        text,
        sourceLang,
        targetLang,
        providerId,
        profileKey: providerProfileKey
      });
      if (!response?.ok) throw new Error(response?.error || 'PROVIDER_TRANSLATION_FAILED');
      translation = response.translation;
    } else {
      const channel = options.channel || 'selection';
      const engine = await ensureTranslationEngine(engineId, sourceLang, targetLang, channel);
      translation = await engine.translate(text);
    }

    translation = normalizeChineseTranslatedPunctuation(translation, targetLang);
    await writeTranslationCache(text, sourceLang, targetLang, engineId, translation, providerId, providerProfileKey);
    return translation;
  }

  // Ensure translator for selection translation
  async function ensureSelectionTranslator(sourceLang, targetLang) {
    const src = normalizeLang(sourceLang);
    const tgt = normalizeLang(targetLang || 'zh-Hans');
    if (!src) throw new Error('无法判断选中文本的原文语言。');

    // Check if we can reuse the existing translator
    if (selectionTranslator && selectionSourceLang === src && selectionTargetLang === tgt) {
      return selectionTranslator;
    }

    if (!isTranslatorAPIAvailable()) {
      throw new Error('TRANSLATOR_API_NOT_AVAILABLE');
    }

    // Destroy existing translator if any
    if (selectionTranslator) {
      try { selectionTranslator.destroy?.(); } catch {}
    }

    console.log(`Creating new translator: ${src} -> ${tgt}`);
    selectionTranslator = await window.Translator.create({ sourceLanguage: src, targetLanguage: tgt });
    selectionSourceLang = src;
    selectionTargetLang = tgt;
    return selectionTranslator;
  }

  // Translate selected text with automatic fallback for unsupported language pairs
  async function translateSelectedText(text, sourceLang, targetLang, maxRetries = 3, engineId = null, providerProfileKey = '', cacheTrace = null) {
    const selectedEngineId = resolveRequestedTranslationEngine(engineId || await loadEffectiveTranslationEngine());
    const sameLanguageMode = await loadSameLanguageMode();
    let currentTargetLang = targetLang;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Same-language behavior is explicit in settings; default is to keep the original.
        if (normalizeLang(sourceLang) === normalizeLang(currentTargetLang)) {
          if (sameLanguageMode === 'skip') return text;
          currentTargetLang = getNextTargetLanguage(currentTargetLang);
          console.log(`Source equals target (${sourceLang}), switching to ${currentTargetLang}`);
          continue;
        }

        const translation = await translateWithEngine(text, sourceLang, currentTargetLang, {
          engineId: selectedEngineId,
          channel: 'selection',
          providerProfileKey,
          cacheTrace
        });

        // If we had to switch languages, log it
        if (currentTargetLang !== targetLang) {
          console.log(`Successfully translated using fallback language: ${sourceLang} -> ${currentTargetLang}`);
        }

        return translation;
      } catch (e) {
        console.warn(`Translation failed (${sourceLang} -> ${currentTargetLang}):`, e);

        // Handle specific error types
        if (e.message === 'TRANSLATOR_API_NOT_AVAILABLE') {
          throw new Error('API_NOT_AVAILABLE');
        }

        // Check if it's an unsupported language pair error
        const isUnsupportedPair = e.message?.includes('language pair is unsupported') ||
                                 e.message?.includes('Unable to create translator') ||
                                 e.name === 'NotSupportedError';

        if (isUnsupportedPair && retryCount < maxRetries - 1) {
          // Try next target language
          const nextLang = getNextTargetLanguage(currentTargetLang);
          console.log(`Language pair ${sourceLang}->${currentTargetLang} unsupported, trying ${sourceLang}->${nextLang}`);
          currentTargetLang = nextLang;
          retryCount++;

          // Clear the failed translator
          if (selectionTranslator) {
            try { selectionTranslator.destroy?.(); } catch {}
            selectionTranslator = null;
            selectionSourceLang = null;
            selectionTargetLang = null;
          }

          continue;
        }

        // Handle other DOMException and API errors
        if (e instanceof DOMException || e.name === 'DOMException') {
          throw new Error('API_ERROR');
        }

        // If we've exhausted retries or it's not a language pair issue, throw the error
        throw e;
      }
    }

    // If we get here, all retries failed
    throw new Error(`Failed to translate after ${maxRetries} attempts with different target languages`);
  }

  async function translateTextNodes(targetLang, engineId = null) {
    const normalizedTarget = normalizeLang(targetLang || 'zh-Hans');
    const selectedEngineId = resolveRequestedTranslationEngine(engineId || await loadEffectiveTranslationEngine());
    currentPageEngineId = selectedEngineId;
    showOverlay('正在准备页面翻译...');

    const sourceLang = await detectSourceLanguage(normalizedTarget);
    if (!sourceLang) {
      hideOverlay();
      throw new Error('无法判断网页原文语言，已跳过自动翻译。');
    }
    if (normalizeLang(sourceLang) === normalizedTarget) {
      hideOverlay();
      showOverlay('检测到网页已经是目标语言，未执行翻译');
      setTimeout(hideOverlay, 1600);
      updatePageTranslationState(false);
      updateFloatingButtonAppearance();
      return;
    }

    await ensureTranslationEngine(selectedEngineId, sourceLang, normalizedTarget, 'page');
    currentSourceLang = sourceLang;
    currentTargetLang = normalizedTarget;
    updatePageTranslationState(true);

    const nodes = Array.from(walkTextNodes(document.body || document.documentElement))
      .filter((tn) => shouldTranslateText(tn.nodeValue || '', normalizedTarget));
    const total = nodes.length;
    if (total === 0) {
      updatePageTranslationState(false);
      hideOverlay();
      showOverlay('未找到可翻译的正文');
      setTimeout(hideOverlay, 1600);
      updateFloatingButtonAppearance();
      return;
    }
    let done = 0;

    showOverlay(`正在翻译页面 (${done}/${total})...`);

    for (const tn of nodes) {
      if (!enabled) break; // interrupted
      const orig = tn.nodeValue || '';
      if (!shouldTranslateText(orig, normalizedTarget)) { done++; continue; }
      if (!originalText.has(tn)) originalText.set(tn, orig);
      try {
        const translated = await translateWithEngine(orig, sourceLang, normalizedTarget, {
          engineId: selectedEngineId,
          channel: 'page'
        });
        // only replace if unchanged to reduce race effects
        if (enabled && (tn.nodeValue === orig || !tn.nodeValue)) {
          tn.nodeValue = translated;
        }
      } catch (e) {
        // Skip on error
      } finally {
        done++;
        if (done % 20 === 0 || done === total) {
          showOverlay(`正在翻译页面 (${done}/${total})...`);
        }
      }
    }

    showOverlay('页面翻译完成');
    setTimeout(hideOverlay, 1200);

    updateFloatingButtonAppearance();

    // Observe dynamic changes
    setupObserver();
  }

  function setupObserver() {
    cleanupObserver();
    observer = new MutationObserver(async (mutations) => {
      if (!enabled || !currentPageEngineId || !currentSourceLang || !currentTargetLang) return;
      const newTextNodes = [];
      for (const m of mutations) {
        for (const node of m.addedNodes || []) {
          if (node.nodeType === Node.TEXT_NODE) {
            newTextNodes.push(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (const tn of walkTextNodes(node)) newTextNodes.push(tn);
          }
        }
      }
      if (newTextNodes.length === 0) return;
      for (const tn of newTextNodes) {
        const orig = tn.nodeValue || '';
        if (!shouldTranslateText(orig, currentTargetLang)) continue;
        if (!originalText.has(tn)) originalText.set(tn, orig);
        try {
          const translated = await translateWithEngine(orig, currentSourceLang, currentTargetLang, {
            engineId: currentPageEngineId,
            channel: 'page'
          });
          if (enabled && (tn.nodeValue === orig || !tn.nodeValue)) tn.nodeValue = translated;
        } catch {}
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function cleanupObserver() {
    observer?.disconnect();
    observer = null;
  }

  function restorePage() {
    console.log('restorePage: Starting page restoration, current enabled:', enabled);
    updatePageTranslationState(false);
    cleanupObserver();
    hideOverlay();
    for (const [tn, orig] of originalText.entries()) {
      try {
        if (tn && tn.nodeType === Node.TEXT_NODE) tn.nodeValue = orig;
      } catch {}
    }
    originalText.clear();
    currentPageEngineId = TRANSLATION_ENGINE_LOCAL;
    try { translator?.destroy?.(); } catch {}
    translator = null;
    currentSourceLang = null;
    updateFloatingButtonAppearance();
    console.log('restorePage: Page restoration completed');
  }

  // Handle text selection for translation
  async function handleTextSelection(options = {}) {
    const timestamp = Date.now();
    const force = options.force === true;
    if (isSelectionInsideTranslatorUi() && !options.allowUi) {
      if (selectionIndicator) selectionIndicator.style.display = 'none';
      markSelectionPanelInteraction();
      return;
    }

    // Automatic selection translation respects the setting; explicit context-menu requests do not.
    if (!selectionTranslateEnabled && !force) {
      hideTranslationTooltip();
      return;
    }

    if (isTranslatingSelection) {
      console.log(`[${timestamp}] Translation already in progress, skipping...`);
      return;
    }

    const requestedEngineId = resolveRequestedTranslationEngine(options.engineId || await loadEffectiveTranslationEngine());
    if (requestedEngineId === TRANSLATION_ENGINE_LOCAL && !isTranslatorAPIAvailable()) {
      return; // Silently skip if the local API is unavailable.
    }

    const selection = window.getSelection();
    const preferredText = options.preferText === true ? normalizeTranslationLayout(options.text || '').trim() : '';
    const hasLiveSelection = !preferredText && Boolean(selection && selection.rangeCount > 0 && selection.toString().trim());
    const forcedText = preferredText || (hasLiveSelection ? '' : normalizeTranslationLayout(options.text || '').trim());
    if (!hasLiveSelection && !forcedText) {
      if (Date.now() < selectionPanelInteractionUntil) return;
      hideTranslationTooltip();
      lastTranslatedText = null;
      return;
    }

    const selectedText = forcedText || normalizeTranslationLayout(selection.toString()).trim();
    const structuredBlocks = Array.isArray(options.structuredBlocks)
      ? options.structuredBlocks
      : (!forcedText ? extractStructuredBlocksFromSelection(selection) : []);
    const displaySourceText = structuredBlocks.length
      ? formatStructuredBlocks(structuredBlocks, 'sourceText')
      : selectedText;
    if (!selectedText || selectedText.length < 2) {
      if (Date.now() < selectionPanelInteractionUntil) return;
      hideTranslationTooltip();
      lastTranslatedText = null;
      return;
    }

    // Skip if this is the same text we just translated
    if (!force && selectedText === lastTranslatedText) {
      console.log(`[${timestamp}] Same text as last translation, skipping...`);
      return;
    }

    // Keep the indicator visible for oversized selections instead of silently dropping the action.
    if (selectedText.length > MAX_SELECTION_TRANSLATE_LENGTH) {
      const overflowAnchor = selection && selection.rangeCount > 0
        ? getSelectionAnchorRect(selection)
        : null;
      const overflowPanel = showErrorTooltip('选区过长，请缩小范围或使用结构化阅读', overflowAnchor);
      setTimeout(() => {
        if (translationTooltip === overflowPanel?.tooltip) hideTranslationTooltip();
      }, 5000);
      return;
    }

    // Skip if text contains mostly numbers or special characters
    if (!/[a-zA-Z\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(selectedText)) {
      hideTranslationTooltip();
      return;
    }

    // Global lock to prevent multiple instances from translating simultaneously
    if (window.translatorGlobalLock) {
      console.log(`[${timestamp}] Global translation lock active, skipping...`);
      return;
    }
    window.translatorGlobalLock = true;

    // Anchor to the selection when available; explicit context-menu requests can fall back to the viewport.
    const selectionAnchor = options.anchor || (selection && selection.rangeCount > 0
      ? getSelectionAnchorRect(selection)
      : new DOMRect(Math.max(12, window.innerWidth / 2 - 8), Math.max(12, window.innerHeight / 2 - 8), 16, 16));

    isTranslatingSelection = true;

    try {
      // Show loading indicator beside the selection.
      showLoadingTooltip(selectionAnchor, { openImmediately: options.openImmediately === true });

      // Reuse the previous language pair on retry; ordinary selection follows the default.
      let targetLang = normalizeLang(options.targetLang) || 'zh-Hans';
      if (!options.targetLang) {
        try {
          const result = await chrome.storage.sync.get(['autoTranslateTargetLang']);
          if (result.autoTranslateTargetLang) targetLang = result.autoTranslateTargetLang;
        } catch (e) {
          console.warn('Failed to get target language from storage, using default:', e);
        }
      }

      // Detect source language
      const detectedLang = options.sourceLang || await detectTextLanguage(selectedText);
      const sourceLang = normalizeLang(detectedLang || inferLanguageFromText(selectedText));
      if (!sourceLang) throw new Error('无法判断选中文本的原文语言。');

      const sameLanguageMode = await loadSameLanguageMode();
      if (normalizeLang(sourceLang) === normalizeLang(targetLang)) {
        if (sameLanguageMode === 'skip') {
          hideTranslationTooltip();
          lastTranslatedText = selectedText;
          return;
        }
        targetLang = getNextTargetLanguage(targetLang) || targetLang;
      }

      lastSelectionRequest = { text: selectedText, sourceLang, targetLang, anchor: selectionAnchor, structuredBlocks, engineId: requestedEngineId };
      console.log(`[${timestamp}] Translating: "${selectedText}" (${sourceLang} -> ${targetLang})`);

      // Translate block-by-block when the selection still has recoverable structure.
      const engineId = requestedEngineId;
      const engineMetadata = getTranslationEngineMetadata(engineId);
      const providerId = await resolveTranslationProviderId(engineId);
      const providerProfileKey = await resolveTranslationProviderProfileKey(providerId);
      console.log(`[${timestamp}] Engine: ${engineMetadata.stage}/${engineMetadata.providerId}`);
      const cacheTrace = { hits: 0, misses: 0 };
      let translatedStructuredBlocks = null;
      const translation = structuredBlocks.length
        ? formatStructuredBlocks(
            translatedStructuredBlocks = await translateStructuredBlocks(structuredBlocks, sourceLang, targetLang, engineId, providerProfileKey, cacheTrace),
            'translatedText'
          )
        : await translateSelectedText(selectedText, sourceLang, targetLang, 3, engineId, providerProfileKey, cacheTrace);

      if (translation && translation !== selectedText) {
        // Store the translated text to avoid duplicates
        lastTranslatedText = selectedText;

        // Persist before showing panel actions. A storage failure remains visible and retryable.
        const historyData = {
          sourceText: displaySourceText,
          translatedText: translation,
          sourceLang,
          targetLang,
          engineId,
          engineStage: engineMetadata.stage,
          providerId,
          providerProfileKey,
          structuredBlocks: translatedStructuredBlocks
        };
        let historyRecord = null;
        let historySaveError = false;
        try {
          historyRecord = await saveTranslationHistory(historyData, { throwOnError: true });
        } catch (historyError) {
          historySaveError = true;
          console.warn('Selection translation rendered but history save failed:', historyError);
        }
        const [displaySettings, providerProfileName] = await Promise.all([
          loadSelectionDisplaySettings(),
          resolveTranslationProviderProfileName(providerId, providerProfileKey)
        ]);
        showTranslationTooltip(translation, selectionAnchor, {
          openImmediately: options.openImmediately === true,
          sourceText: displaySourceText,
          sourceLang,
          targetLang,
          historyRecord,
          historyData,
          historySaveError,
          structuredBlocks: translatedStructuredBlocks,
          engineId,
          providerId,
          providerProfileKey,
          providerProfileName,
          cacheTrace,
          ...displaySettings
        });
        // Make sure copy button is visible
        if (translationTooltip && translationTooltip._copyButton) {
          translationTooltip._copyButton.style.display = 'block';
          translationTooltip.style.background = '#1f2937'; // Reset background color
        }

        console.log(`[${timestamp}] Translation completed: "${selectedText}" -> "${translation}"`);
      } else {
        hideTranslationTooltip();
        lastTranslatedText = null;
      }
    } catch (e) {
      console.warn(`[${timestamp}] Selection translation failed:`, e);

      const unsupported = e.message?.includes('Failed to translate after') || e.message?.includes('language pair is unsupported');
      showErrorTooltip(
        unsupported ? '该语言对不支持翻译，可改用其他方式重试。' : '翻译失败，可重试或切换翻译方式。',
        selectionAnchor,
        lastSelectionRequest
      );

      lastTranslatedText = null;
    } finally {
      isTranslatingSelection = false;
      window.translatorGlobalLock = false; // Release global lock
    }
  }

  // Debounced selection handler
  function onSelectionChange() {
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }
    if (isSelectionInsideTranslatorUi()) {
      if (selectionIndicator) selectionIndicator.style.display = 'none';
      markSelectionPanelInteraction();
      return;
    }

    selectionTimeout = setTimeout(() => {
      selectionTimeout = null;
      handleTextSelection();
    }, 500); // Increased debounce to 500ms to reduce duplicate triggers
  }

  // Initialize selection translation
  async function initSelectionTranslation() {
    // Prevent multiple initializations
    if (isInitialized) {
      console.log('Selection translation already initialized, skipping...');
      return;
    }

    // Check if we should enable selection translation
    if (!isTranslatorAPIAvailable()) {
      console.info('Translator API not available on this page. Selection translation disabled.');
      return;
    }

    // Load selection translation setting from storage
    try {
      const result = await chrome.storage.sync.get(['selectionTranslateEnabled']);
      selectionTranslateEnabled = !!result.selectionTranslateEnabled;
      console.info(`Selection translation ${selectionTranslateEnabled ? 'enabled' : 'disabled'} from storage.`);
    } catch (e) {
      console.warn('Failed to load selection translation setting, using defaults:', e);
      selectionTranslateEnabled = false;
    }

    await loadSelectionPanelPosition();
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes[SELECTION_PANEL_DEFAULT_SIZE_KEY]) selectionPanelDefaultSize = normalizeSelectionPanelSize(changes[SELECTION_PANEL_DEFAULT_SIZE_KEY].newValue);
      if (changes[SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY]) selectionPanelUseGlobalDefaultSize = changes[SELECTION_PANEL_USE_GLOBAL_DEFAULT_SIZE_KEY].newValue === true;
      if (changes[SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY]) selectionPanelRememberSiteSize = changes[SELECTION_PANEL_REMEMBER_SITE_SIZE_KEY].newValue !== false;
    });
    console.info('Translator API available. Selection translation initialized.');

    // Listen for selection changes
    document.addEventListener('selectionchange', onSelectionChange);

    // Keep panel clicks separate from page clicks and selection clearing.
    document.addEventListener('click', (event) => {
      const path = event.composedPath?.() || [];
      const isPanelEvent = path.some((target) => target?.id === 'translator-selection-indicator' || target?.id === 'translator-selection-panel');
      if (isPanelEvent) {
        markSelectionPanelInteraction();
        return;
      }
      setTimeout(() => {
        if (Date.now() < selectionPanelInteractionUntil) return;
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
          hideTranslationTooltip();
          lastTranslatedText = null;
        }
      }, 100);
    });

    // Scrolling collapses the panel but keeps the result and follows the selection.
    document.addEventListener('scroll', () => {
      collapseSelectionPanel();
      refreshSelectionIndicatorPosition();
    }, { passive: true });
    window.addEventListener('resize', () => {
      collapseSelectionPanel();
      applySelectionPanelPosition();
      refreshSelectionIndicatorPosition();
    });

    isInitialized = true;
    console.log('Selection translation initialized successfully');
  }

  // Initialize floating button (independent of API availability)
  async function initFloatingButton() {
    console.log('initFloatingButton: Starting initialization...');
    
    // Check if document.body is available
    if (!document.body) {
      console.warn('initFloatingButton: document.body not available, will retry after DOM load');
      // Wait for body to be available
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          console.log('initFloatingButton: document.body now available, retrying...');
          initFloatingButton();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return;
    }
    
    try {
      console.log('initFloatingButton: Loading settings from storage...');
      const result = await chrome.storage.sync.get(['floatingButtonEnabled']);
      floatingButtonEnabled = !!result.floatingButtonEnabled;
      console.info(`Floating button ${floatingButtonEnabled ? 'enabled' : 'disabled'} from storage.`);
      
      // Show floating button if enabled
      if (floatingButtonEnabled) {
        console.log('initFloatingButton: Showing floating button...');
        showFloatingButton();
      } else {
        console.log('initFloatingButton: Floating button disabled, not showing');
      }
    } catch (e) {
      console.warn('Failed to load floating button setting, using defaults:', e);
      floatingButtonEnabled = false;
    }
    
    console.log('initFloatingButton: Initialization completed');
  }

  // Cleanup selection translation
  function cleanupSelectionTranslation() {
    document.removeEventListener('selectionchange', onSelectionChange);
    clearAllTranslationPanels();
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }
    try { selectionTranslator?.destroy?.(); } catch {}
    selectionTranslator = null;
    selectionSourceLang = null;
    selectionTargetLang = null;
    lastTranslatedText = null;
    isInitialized = false;
    window.translatorGlobalLock = false; // Release global lock
    console.log('Selection translation cleaned up');
  }

  // Floating button functions
  function updateFloatingButtonAppearance() {
    if (!floatingButton || !floatingButtonEnabled) return;
    const translating = !enabled;
    floatingButton.innerHTML = translating
      ? '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8M8 3v2M6 5c.8 3 2.4 5.3 5 7"/><path d="M5 12c2.2-1.1 4-3 5-5"/><path d="M14 4h6M17 4v2l-3.5 8M15 10h5"/></svg>'
      : '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7 4 12l5 5"/><path d="M4 12h10a5 5 0 0 1 5 5v1"/></svg>';
    floatingButton.title = translating
      ? localizedMessage('clickToTranslatePage', '点击翻译当前网页')
      : localizedMessage('clickToRestorePage', '点击恢复原始网页');
    floatingButton.setAttribute('aria-label', floatingButton.title);
    floatingButton.style.color = translating ? '#dbeafe' : '#fbbf24';
  }

  const FLOATING_BUTTON_SIZE = 44;
  const FLOATING_BUTTON_MARGIN = 20;
  const FLOATING_DRAG_THRESHOLD = 6;

  function clampFloatingCoordinate(value, max) {
    return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, max));
  }

  function applyFloatingButtonPosition(button, position = {}) {
    const width = button.offsetWidth || FLOATING_BUTTON_SIZE;
    const height = button.offsetHeight || FLOATING_BUTTON_SIZE;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    const leftRatio = Number(position.leftRatio);
    const topRatio = Number(position.topRatio);

    let left;
    if (Number.isFinite(leftRatio)) {
      left = maxX * clampFloatingCoordinate(leftRatio, 1);
    } else if (Number.isFinite(Number(position.left))) {
      left = Number(position.left);
    } else if (Number.isFinite(Number(position.right))) {
      left = maxX - Number(position.right);
    } else {
      left = maxX - FLOATING_BUTTON_MARGIN;
    }

    let top;
    if (Number.isFinite(topRatio)) {
      top = maxY * clampFloatingCoordinate(topRatio, 1);
    } else if (position.useTranslateY) {
      top = maxY / 2;
    } else if (Number.isFinite(Number(position.top))) {
      top = Number(position.top);
    } else {
      top = maxY / 2;
    }

    button.style.left = clampFloatingCoordinate(left, maxX) + 'px';
    button.style.right = 'auto';
    button.style.top = clampFloatingCoordinate(top, maxY) + 'px';
    button.style.bottom = 'auto';
    button.style.transform = 'scale(1)';
  }

  function saveFloatingButtonPosition(button) {
    const rect = button.getBoundingClientRect();
    const width = button.offsetWidth || FLOATING_BUTTON_SIZE;
    const height = button.offsetHeight || FLOATING_BUTTON_SIZE;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    const left = clampFloatingCoordinate(rect.left, maxX);
    const top = clampFloatingCoordinate(rect.top, maxY);

    return chrome.storage.sync.set({
      floatingButtonPosition: {
        version: 2,
        left,
        top,
        leftRatio: maxX ? left / maxX : 0,
        topRatio: maxY ? top / maxY : 0
      }
    }).catch(() => {});
  }

  function createFloatingButton() {
    console.log('createFloatingButton: Called, existing button:', !!floatingButton);
    
    if (floatingButton) {
      console.log('createFloatingButton: Returning existing button');
      return floatingButton;
    }

    console.log('createFloatingButton: Creating new button...');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'translator-floating-button';
    button.title = localizedMessage('clickToTranslatePage', '点击翻译当前网页');
    button.setAttribute('aria-label', button.title);
    
    console.log('createFloatingButton: Applying styles...');
    // Keep layout coordinates separate from hover/drag transforms.
    button.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'right: auto',
      `width: ${FLOATING_BUTTON_SIZE}px`,
      `height: ${FLOATING_BUTTON_SIZE}px`,
      'padding: 0',
      'background: #20252a',
      'color: #dbeafe',
      'border: 1px solid rgba(169,218,255,0.34)',
      'border-radius: 12px',
      'font-size: 0',
      'line-height: 1',
      'cursor: pointer',
      'z-index: 2147483647',
      'box-shadow: 0 6px 18px rgba(0,0,0,0.32), 0 0 12px rgba(118,189,233,0.16)',
      'user-select: none',
      'touch-action: none',
      'will-change: transform',
      'backdrop-filter: blur(12px)',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'appearance: none',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'transition: transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease',
      'opacity: 0',
      'visibility: hidden'
    ].join(';');

    console.log('createFloatingButton: Adding event listeners...');
    
    button.addEventListener('mouseenter', () => {
      if (!isDragging) {
        button.style.transform = 'scale(1.05)';
        button.style.background = '#2f3b49';
        button.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4), 0 0 16px rgba(118,189,233,0.28)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!isDragging) {
        button.style.transform = 'scale(1)';
        button.style.background = '#20252a';
        button.style.boxShadow = '0 6px 18px rgba(0,0,0,0.32), 0 0 12px rgba(118,189,233,0.16)';
      }
    });

    let dragState = null;

    function startPointerDrag(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      button.style.transform = 'scale(1)';
      const rect = button.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false
      };
      isDragging = true;
      floatingDragMoved = false;
      button.style.cursor = 'grabbing';
      button.style.transition = 'none';
      button.style.transform = 'scale(0.96)';
      button.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }

    function movePointerDrag(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(deltaX, deltaY) < FLOATING_DRAG_THRESHOLD) return;

      dragState.moved = true;
      floatingDragMoved = true;
      const width = button.offsetWidth || FLOATING_BUTTON_SIZE;
      const height = button.offsetHeight || FLOATING_BUTTON_SIZE;
      const maxX = Math.max(0, window.innerWidth - width);
      const maxY = Math.max(0, window.innerHeight - height);
      const left = clampFloatingCoordinate(event.clientX - dragState.offsetX, maxX);
      const top = clampFloatingCoordinate(event.clientY - dragState.offsetY, maxY);

      button.style.left = left + 'px';
      button.style.right = 'auto';
      button.style.top = top + 'px';
      button.style.transform = 'scale(0.96)';
      event.preventDefault();
    }

    function finishPointerDrag(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const moved = dragState.moved;
      if (button.hasPointerCapture?.(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
      dragState = null;
      isDragging = false;
      button.style.cursor = 'pointer';
      button.style.transition = 'none';
      button.style.transform = 'scale(1)';

      if (moved) {
        suppressFloatingClickUntil = Date.now() + 300;
        saveFloatingButtonPosition(button);
      }

      button.style.transition = 'transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease';
    }

    button.addEventListener('pointerdown', startPointerDrag);
    button.addEventListener('pointermove', movePointerDrag);
    button.addEventListener('pointerup', finishPointerDrag);
    button.addEventListener('pointercancel', finishPointerDrag);

    // Click handler for translation - 点击切换翻译/恢复状态
    button.addEventListener('click', async (e) => {
      if (isDragging || floatingDragMoved || Date.now() < suppressFloatingClickUntil) {
        floatingDragMoved = false;
        return;
      }
      floatingDragMoved = false;
      e.stopPropagation();
      e.preventDefault();
      
      console.log('FloatingButton: Click detected, current enabled state:', enabled);
      
      try {
        // Check if Translator API is available first
        if (!isTranslatorAPIAvailable()) {
          showOverlay('此页面不支持翻译功能（需要 Chrome 138+ 且安全上下文）');
          setTimeout(hideOverlay, 3000);
          return;
        }
        
        // 切换翻译状态：如果已翻译则恢复，如果未翻译则翻译
        if (enabled) {
          // 当前已翻译，点击恢复
          console.log('FloatingButton: Page is translated, calling restorePage()');
          restorePage(); // restorePage函数内部已经处理了按钮状态更新
        } else {
          // 当前未翻译，点击翻译
          console.log('FloatingButton: Page is not translated, calling translateTextNodes()');
          // Get current target language from storage or use default
          let targetLang = 'zh-Hans';
          try {
            const result = await chrome.storage.sync.get(['autoTranslateTargetLang']);
            if (result.autoTranslateTargetLang) {
              targetLang = result.autoTranslateTargetLang;
            }
          } catch {}
          
          await translateTextNodes(targetLang); // translateTextNodes函数内部已经处理了按钮状态更新
        }
        console.log('FloatingButton: Click processing completed, new enabled state:', enabled);
      } catch (error) {
        console.warn('Floating button translation failed:', error);
        showOverlay('翻译失败：' + (error?.message || error || ''));
        setTimeout(hideOverlay, 2000);
      }
    });

    console.log('createFloatingButton: Button created successfully, assigning to floatingButton variable');
    floatingButton = button;
    console.log('createFloatingButton: Returning button, ID:', button.id);
    return button;
  }

  function showFloatingButton() {
    console.log('showFloatingButton: Called with floatingButtonEnabled =', floatingButtonEnabled);
    
    if (!floatingButtonEnabled) {
      console.log('showFloatingButton: Floating button disabled, returning');
      return;
    }
    
    if (!document.body) {
      console.warn('showFloatingButton: document.body not available');
      return;
    }
    
    console.log('showFloatingButton: Creating button...');
    const button = createFloatingButton();
    
    if (!button) {
      console.error('showFloatingButton: Failed to create button');
      return;
    }
    
    if (button.parentNode) {
      console.log('showFloatingButton: Button already in DOM, skipping');
      return;
    }
    
    console.log('showFloatingButton: Adding button to DOM...');
    
    // Restore saved position after the button has a real layout box.
    chrome.storage.sync.get(['floatingButtonPosition']).then(result => {
      applyFloatingButtonPosition(button, result.floatingButtonPosition || {});
      button.style.opacity = '1';
      button.style.visibility = 'visible';
    }).catch(e => {
      console.warn('showFloatingButton: Error restoring position:', e);
      applyFloatingButtonPosition(button);
      button.style.opacity = '1';
      button.style.visibility = 'visible';
    });
    
    try {
      document.body.appendChild(button);
      console.log('showFloatingButton: Button added to DOM successfully');
      
      updateFloatingButtonAppearance();
      
      console.log('showFloatingButton: Button waiting for saved position before display');
    } catch (error) {
      console.error('showFloatingButton: Error adding button to DOM:', error);
    }
  }

  function hideFloatingButton() {
    if (!floatingButton) return;
    floatingButton.style.opacity = '0';
    floatingButton.style.visibility = 'hidden';
    if (floatingButton.parentNode) floatingButton.remove();
  }

  // Messaging
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg && msg.type === 'OPEN_STRUCTURED_PAGE_READER') {
          const targetLang = msg.targetLang || 'zh-Hans';
          const engineId = resolveRequestedTranslationEngine(msg.engineId || await loadEffectiveTranslationEngine());
          hideOverlay();
          try {
            const record = await buildStructuredPageHistory(targetLang, engineId);
            if (!record?.id) throw new Error('结构化翻译没有生成历史记录。');
            await chrome.runtime.sendMessage({ type: 'OPEN_READER_TAB', record });
            sendResponse({ ok: true, recordId: record.id });
          } finally {
            hideOverlay();
          }
          return;
        }
        if (msg && msg.type === 'START_PAGE_TRANSLATION') {
          const lang = msg.targetLang || 'zh-Hans';
          const engineId = resolveRequestedTranslationEngine(msg.engineId || await loadEffectiveTranslationEngine());
          if (!enabled) {
            await translateTextNodes(lang, engineId);
          } else if (currentTargetLang !== normalizeLang(lang) || currentPageEngineId !== engineId) {
            const engineChanged = currentPageEngineId !== engineId;
            showOverlay(engineChanged ? '正在切换翻译引擎并重新翻译...' : '正在切换目标语言...');
            restorePage();
            await translateTextNodes(lang, engineId);
          }
          sendResponse({ ok: true, enabled, targetLang: currentTargetLang, engineId: currentPageEngineId });
          return;
        }
        if (msg && msg.type === 'TRANSLATE_SELECTION') {
          await handleTextSelection({
            force: true,
            text: msg.text || '',
            engineId: msg.engineId
          });
          sendResponse({ ok: true, engineId: resolveRequestedTranslationEngine(msg.engineId) });
          return;
        }
        if (msg && msg.type === 'STOP_PAGE_TRANSLATION') {
          restorePage();
          sendResponse({ ok: true });
          return;
        }
        if (msg && msg.type === 'OPEN_SELECTION_PANEL_SIZE_TUNER') {
          const panel = openSelectionPanelSizeTuner();
          sendResponse({ ok: true, width: panel.size.width, height: panel.size.height });
          return;
        }
        if (msg && msg.type === 'QUERY_STATUS') {
          sendResponse({ ok: true, enabled, targetLang: currentTargetLang, version: CONTENT_SCRIPT_VERSION });
          return;
        }
        if (msg && msg.type === 'TOGGLE_SELECTION_TRANSLATION') {
          const selectionEnabled = !!msg.enabled;
          selectionTranslateEnabled = selectionEnabled;
          console.log(`Selection translation ${selectionEnabled ? 'enabled' : 'disabled'} via message.`);

          // If disabled, hide any existing tooltip
          if (!selectionEnabled) {
            clearAllTranslationPanels();
            lastTranslatedText = null;
          }

          sendResponse({ ok: true, selectionTranslateEnabled: selectionEnabled });
          return;
        }
        if (msg && msg.type === 'QUERY_FLOATING_BUTTON') {
          sendResponse({
            ok: true,
            floatingButtonEnabled,
            visible: !!(floatingButton && floatingButton.isConnected),
            translated: enabled
          });
          return;
        }
        if (msg && msg.type === 'TOGGLE_FLOATING_BUTTON') {
          const toggleEnabled = !!msg.enabled;
          floatingButtonEnabled = toggleEnabled;
          console.log(`Floating button ${toggleEnabled ? 'enabled' : 'disabled'} via message.`);

          if (toggleEnabled) {
            showFloatingButton();
          } else {
            hideFloatingButton();
          }

          sendResponse({ ok: true, floatingButtonEnabled: toggleEnabled });
          return;
        }
        if (msg && msg.type === 'FORCE_SHOW_FLOATING_BUTTON') {
          console.log('Force showing floating button for debugging...');
          floatingButtonEnabled = true;
          showFloatingButton();
          sendResponse({ ok: true, forced: true });
          return;
        }
      } catch (e) {
        showOverlay(String(e?.message || e || 'Error'));
        setTimeout(hideOverlay, 2000);
        sendResponse({ ok: false, error: String(e?.message || e || 'Error') });
        return;
      }
    })();
    return true; // keep channel open for async
  });

  // Initialize when script loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded: Initializing...');
      setTimeout(() => {
        initSelectionTranslation();
        initFloatingButton();
      }, 100); // Small delay to ensure everything is ready
    });
  } else {
    console.log('Document already loaded, initializing immediately...');
    setTimeout(() => {
      initSelectionTranslation();
      initFloatingButton();
    }, 100); // Small delay to ensure everything is ready
  }
  
  // Additional safety check - force initialization after 1 second if needed
  setTimeout(() => {
    console.log('Safety check: Ensuring floating button is initialized...');
    if (!floatingButton) {
      console.log('Safety check: Floating button not created, forcing initialization...');
      initFloatingButton();
    } else if (floatingButtonEnabled && !floatingButton.parentNode) {
      console.log('Safety check: Floating button enabled but not in DOM, showing...');
      showFloatingButton();
    }
  }, 1000);

  // Cleanup when page unloads
  window.addEventListener('beforeunload', () => {
    cleanupSelectionTranslation();
    hideFloatingButton();
    try { translator?.destroy?.(); } catch {}
    try { selectionTranslator?.destroy?.(); } catch {}
  });
})();





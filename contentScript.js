// contentScript.js - Translate page text in-place using Chrome Translator API, preserving layout

(() => {
  // Check if this script has already been loaded to prevent multiple instances
  if (window.translatorContentScriptLoaded) {
    console.log('Translator content script already loaded, skipping...');
    return;
  }
  window.translatorContentScriptLoaded = true;

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
  let isInitialized = false; // Prevent multiple initializations
  let selectionTranslateEnabled = false; // Control whether selection translation is enabled
  const SELECTION_SHOW_BILINGUAL_KEY = 'translatorSelectionShowBilingual';
  const SELECTION_SHOW_SOURCE_KEY = 'translatorSelectionShowSource';
  let selectionIndicator = null;
  let selectionIndicatorAnchor = null;
  let selectionPanelHideTimer = null;
  let selectionPanelPosition = null;
  let selectionPanelSize = null;
  let selectionPanelDrag = null;
  let selectionPanelResize = null;
  let selectionPanelInteractionUntil = 0;
  const translationPanels = new Map();
  let nextTranslationPanelId = 1;
  const SELECTION_PANEL_POSITIONS_KEY = 'translatorSelectionPanelPositions';
  const TRANSLATION_HISTORY_KEY = 'translatorHistory';
  const TRANSLATION_HISTORY_ENABLED_KEY = 'translatorHistoryEnabled';
  const TRANSLATION_AUTO_READING_KEY = 'translatorAutoAddToReading';
  const MAX_HISTORY_RECORDS = 500;
  const MIN_PANEL_WIDTH = 240;
  const MIN_PANEL_HEIGHT = 180;
  const DEFAULT_PANEL_WIDTH = 360;
  const DEFAULT_PANEL_HEIGHT = 220;
  // 2000 个字符覆盖普通多行选区，同时避免误选整页造成大段翻译。
  const MAX_SELECTION_TRANSLATE_LENGTH = 2000;

  // State for floating button
  let floatingButton = null;
  let floatingButtonEnabled = false;
  let isDragging = false;
  let floatingDragMoved = false;
  let suppressFloatingClickUntil = 0;
  let dragOffset = { x: 0, y: 0 };

  // Simple inline overlay for status/progress
  let overlayEl = null;
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
    overlayEl.textContent = String(msg || '');
  }
  function hideOverlay() {
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
  }

  function normalizeTranslationLayout(text) {
    return String(text ?? '').replace(/\r\n?/g, '\n');
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
    return labels[normalizeLang(code)] || code || '未知语言';
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

  // Translation tooltip for selected text
  function createTranslationTooltip() {
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
      'overflow:auto',
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
    dragHandle.title = '拖动翻译窗口';
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
    textContainer.style.cssText = [
      'flex:1',
      'word-wrap:break-word',
      'overflow-wrap:anywhere',
      'white-space:pre-wrap',
      'tab-size:4',
      'user-select:text'
    ].join(';');

    // Copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = '⧉';
    copyButton.title = '复制';
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
        copyButton.textContent = '已复制';
        copyButton.style.background = '#10b981';
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.background = '#374151';
        }, 1000);
      } catch (err) {
        console.warn('复制失败:', err);
        copyButton.textContent = '复制失败';
        copyButton.style.background = '#ef4444';
        setTimeout(() => {
          copyButton.textContent = '⧉';
          copyButton.style.background = '#374151';
        }, 1000);
      }
    });

    const pinButton = document.createElement('button');
    const readingButton = document.createElement('button');
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
    for (const button of [pinButton, readingButton, closeButton]) {
      button.style.cssText = panelActionButtonStyle;
      button.type = 'button';
    }
    closeButton.style.background = '#4b5563';
    const resizeHandle = document.createElement('div');
    resizeHandle.title = '调整面板大小';
    resizeHandle.style.cssText = 'position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 0 45%,rgba(255,255,255,.55) 46% 52%,transparent 53% 64%,rgba(255,255,255,.55) 65% 71%,transparent 72%);';
    resizeHandle.addEventListener('pointerdown', startSelectionPanelResize);
    resizeHandle.addEventListener('pointermove', moveSelectionPanelResize);
    resizeHandle.addEventListener('pointerup', finishSelectionPanelResize);
    resizeHandle.addEventListener('pointercancel', finishSelectionPanelResize);
    const actionBar = document.createElement('div');
    actionBar.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:4px;flex:none;flex-wrap:nowrap;min-width:0;overflow:hidden;white-space:nowrap;';
    actionBar.appendChild(copyButton);
    actionBar.appendChild(pinButton);
    actionBar.appendChild(readingButton);
    actionBar.appendChild(closeButton);

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
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = tooltip._panel;
      if (panel) removeTranslationPanel(panel.id);
    });

    tooltip.appendChild(dragHandle);
    tooltip.appendChild(textContainer);
    tooltip.appendChild(actionBar);
    tooltip.appendChild(resizeHandle);

    // Store references for easy access
    tooltip._textContainer = textContainer;
    tooltip._copyButton = copyButton;
    tooltip._pinButton = pinButton;
    tooltip._readingButton = readingButton;
    tooltip._closeButton = closeButton;
    tooltip._actionBar = actionBar;
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

  async function loadSelectionPanelPosition() {
    try {
      const result = await chrome.storage.local.get([SELECTION_PANEL_POSITIONS_KEY]);
      const layouts = result[SELECTION_PANEL_POSITIONS_KEY] || {};
      const saved = layouts[getSelectionPanelStorageKey()];
      if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
        selectionPanelPosition = {
          left: Number(saved.left),
          top: Number(saved.top)
        };
      }
      if (saved && Number.isFinite(Number(saved.width)) && Number.isFinite(Number(saved.height))) {
        selectionPanelSize = {
          width: Math.max(240, Number(saved.width)),
          height: Math.max(MIN_PANEL_HEIGHT, Number(saved.height))
        };
      }
    } catch (e) {
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
    return {
      position: { left: base.left + offset, top: base.top + offset },
      size: selectionPanelSize ? {
        width: Math.max(MIN_PANEL_WIDTH, selectionPanelSize.width),
        height: Math.max(MIN_PANEL_HEIGHT, selectionPanelSize.height)
      } : {
        width: DEFAULT_PANEL_WIDTH,
        height: DEFAULT_PANEL_HEIGHT
      }
    };
  }

  async function saveSelectionPanelPosition(panel = translationTooltip?._panel) {
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
        ...(size ? { width: Math.round(size.width), height: Math.round(size.height) } : {})
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
    selectionPanelSize = { ...panel.size };
    tooltip.style.width = `${panel.size.width}px`;
    tooltip.style.height = `${panel.size.height}px`;
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
    panel.tooltip._readingButton.textContent = panel.inReadingArea ? '✓' : '▤';
    panel.tooltip._readingButton.title = panel.inReadingArea ? '从阅读区移出' : '加入阅读区';
    panel.tooltip._closeButton.textContent = '×';
    panel.tooltip._closeButton.title = '关闭面板';
  }

  async function saveTranslationHistory(data, force = false) {
    try {
      const settings = await chrome.storage.local.get([
        TRANSLATION_HISTORY_ENABLED_KEY,
        TRANSLATION_AUTO_READING_KEY
      ]);
      if (!force && settings[TRANSLATION_HISTORY_ENABLED_KEY] === false) return null;
      const result = await chrome.storage.local.get([TRANSLATION_HISTORY_KEY]);
      const history = Array.isArray(result[TRANSLATION_HISTORY_KEY])
        ? result[TRANSLATION_HISTORY_KEY]
        : [];
      const item = {
        id: `translation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourceText: normalizeTranslationLayout(data.sourceText),
        translatedText: normalizeTranslationLayout(data.translatedText),
        sourceLang: data.sourceLang || 'auto',
        targetLang: data.targetLang || 'zh-Hans',
        pageUrl: location.href,
        pageTitle: document.title || location.hostname,
        createdAt: Date.now(),
        inReadingArea: settings[TRANSLATION_AUTO_READING_KEY] === true
      };
      history.unshift(item);
      history.splice(MAX_HISTORY_RECORDS);
      await chrome.storage.local.set({ [TRANSLATION_HISTORY_KEY]: history });
      return item;
    } catch (e) {
      console.warn('Failed to save translation history:', e);
      return null;
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

  async function togglePanelReading(panel) {
    panel.inReadingArea = !panel.inReadingArea;
    if (panel.inReadingArea && !panel.historyId) {
      const record = await saveTranslationHistory({
        sourceText: panel.sourceText,
        translatedText: panel.translatedText,
        sourceLang: panel.sourceLang,
        targetLang: panel.targetLang
      }, true);
      panel.historyId = record?.id || null;
      if (!record) panel.inReadingArea = false;
    }
    updateTranslationPanelButtons(panel);
    await updateHistoryEntry(panel.historyId, { inReadingArea: panel.inReadingArea });
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
    selectionIndicator.title = titles[state] || titles.ready;
    selectionIndicator.setAttribute('aria-label', titles[state] || titles.ready);
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
      historyId: historyRecord?.id || null,
      inReadingArea: historyRecord?.inReadingArea === true,
      pinned: false,
      position: layout.position,
      size: layout.size,
      initializing: true,
      status: options.status || 'ready'
    };
    tooltip._panel = panel;
    const normalizedText = normalizeTranslationLayout(text);
    tooltip._copyText = normalizedText;
    if (options.status === 'loading' || options.status === 'error' || !options.sourceText) {
      tooltip._textContainer.textContent = normalizedText;
    } else {
      tooltip._textContainer.textContent = '';
      if (options.showSource !== false) {
        tooltip._textContainer.style.paddingBottom = '16px';
        const sourceBadge = document.createElement('span');
        sourceBadge.textContent = 'Translator API';
        sourceBadge.title = formatTranslationSource(panel.sourceLang, panel.targetLang);
        sourceBadge.setAttribute('aria-label', sourceBadge.title);
        sourceBadge.style.cssText = 'position:absolute;left:12px;bottom:6px;color:#8290a4;font-size:9px;line-height:1;letter-spacing:.1px;cursor:help;opacity:.82;user-select:none;';
        tooltip.appendChild(sourceBadge);
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
    if (options.status === 'loading' || options.status === 'error') {
      tooltip._actionBar.style.display = 'none';
    }
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

  function showLoadingTooltip(anchor) {
    return createTranslationPanel('翻译中...', anchor, {
      status: 'loading',
      background: '#374151'
    });
  }

  function showErrorTooltip(message, anchor) {
    return createTranslationPanel(message, anchor, {
      status: 'error',
      background: '#dc2626'
    });
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
    const scriptHint = inferLanguageFromText(text);
    try {
      if (typeof window.LanguageDetector === 'undefined') return scriptHint;
      const detector = await window.LanguageDetector.create({ expectedInputLanguages: ['en','zh-Hans','zh-Hant','ja','ko','fr','de','es','ru','it','pt'] });
      const results = await detector.detect(text);
      detector.destroy?.();
      if (Array.isArray(results) && results.length > 0) {
        return normalizeLang(results[0].detectedLanguage || scriptHint);
      }
    } catch (e) {
      console.warn('Page language detection failed; using script hint:', e);
    }
    return scriptHint;
  }

  // Detect language for selected text
  async function detectTextLanguage(text) {
    try {
      if (!isTranslatorAPIAvailable()) return null;
      if (!text || text.trim().length < 2) return null;

      const detector = await window.LanguageDetector.create({
        expectedInputLanguages: ['en','zh-Hans','zh-Hant','ja','ko','fr','de','es','ru','it','pt']
      });
      const results = await detector.detect(text);
      detector.destroy?.();

      if (Array.isArray(results) && results.length > 0) {
        return results[0].detectedLanguage || null;
      }
    } catch (e) {
      console.warn('Language detection failed:', e);
    }
    return null;
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
  async function translateSelectedText(text, sourceLang, targetLang, maxRetries = 3) {
    let currentTargetLang = targetLang;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Skip if source and target are the same
        if (sourceLang === currentTargetLang) {
          currentTargetLang = getNextTargetLanguage(currentTargetLang);
          console.log(`Source equals target (${sourceLang}), switching to ${currentTargetLang}`);
          continue;
        }

        const translator = await ensureSelectionTranslator(sourceLang, currentTargetLang);
        const translation = await translator.translate(text);

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

  async function translateTextNodes(targetLang) {
    const normalizedTarget = normalizeLang(targetLang || 'zh-Hans');
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
      enabled = false;
      updateFloatingButtonAppearance();
      return;
    }

    await ensureTranslator(sourceLang, normalizedTarget);
    enabled = true;

    const nodes = Array.from(walkTextNodes(document.body || document.documentElement))
      .filter((tn) => shouldTranslateText(tn.nodeValue || '', normalizedTarget));
    const total = nodes.length;
    if (total === 0) {
      enabled = false;
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
        const translated = await translator.translate(orig);
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
      if (!enabled || !translator) return;
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
          const translated = await translator.translate(orig);
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
    enabled = false;
    cleanupObserver();
    hideOverlay();
    for (const [tn, orig] of originalText.entries()) {
      try {
        if (tn && tn.nodeType === Node.TEXT_NODE) tn.nodeValue = orig;
      } catch {}
    }
    originalText.clear();
    try { translator?.destroy?.(); } catch {}
    translator = null;
    currentSourceLang = null;
    updateFloatingButtonAppearance();
    console.log('restorePage: Page restoration completed');
  }

  // Handle text selection for translation
  async function handleTextSelection() {
    const timestamp = Date.now();
    if (isSelectionInsideTranslatorUi()) {
      if (selectionIndicator) selectionIndicator.style.display = 'none';
      markSelectionPanelInteraction();
      return;
    }

    // Check if selection translation is enabled
    if (!selectionTranslateEnabled) {
      hideTranslationTooltip();
      return;
    }

    if (isTranslatingSelection) {
      console.log(`[${timestamp}] Translation already in progress, skipping...`);
      return;
    }

    // Check if API is available first
    if (!isTranslatorAPIAvailable()) {
      return; // Silently skip if API is not available
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      if (Date.now() < selectionPanelInteractionUntil) return;
      hideTranslationTooltip();
      lastTranslatedText = null;
      return;
    }

    const selectedText = normalizeTranslationLayout(selection.toString()).trim();
    if (!selectedText || selectedText.length < 2) {
      if (Date.now() < selectionPanelInteractionUntil) return;
      hideTranslationTooltip();
      lastTranslatedText = null;
      return;
    }

    // Skip if this is the same text we just translated
    if (selectedText === lastTranslatedText) {
      console.log(`[${timestamp}] Same text as last translation, skipping...`);
      return;
    }

    // Allow normal multi-line selections while still avoiding accidental full-page translation.
    if (selectedText.length > MAX_SELECTION_TRANSLATE_LENGTH) {
      hideTranslationTooltip();
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

    // Anchor the indicator to the last visible line of the selection.
    const selectionAnchor = getSelectionAnchorRect(selection);

    isTranslatingSelection = true;

    try {
      // Show loading indicator beside the selection.
      showLoadingTooltip(selectionAnchor);

      // Get target language from storage or use default
      let targetLang = 'zh-Hans'; // Keep selection translation consistent with the extension default
      try {
        const result = await chrome.storage.sync.get(['autoTranslateTargetLang']);
        if (result.autoTranslateTargetLang) {
          targetLang = result.autoTranslateTargetLang;
        }
      } catch (e) {
        // Use default if storage access fails
        console.warn('Failed to get target language from storage, using default:', e);
      }

      // Detect source language
      const detectedLang = await detectTextLanguage(selectedText);
      const sourceLang = normalizeLang(detectedLang || inferLanguageFromText(selectedText));
      if (!sourceLang) throw new Error('无法判断选中文本的原文语言。');

      console.log(`[${timestamp}] Translating: "${selectedText}" (${sourceLang} -> ${targetLang})`);

      // Translate the text (with automatic fallback for unsupported language pairs)
      const translation = await translateSelectedText(selectedText, sourceLang, targetLang);

      if (translation && translation !== selectedText) {
        // Store the translated text to avoid duplicates
        lastTranslatedText = selectedText;

        // Save the successful translation once, then expose panel actions for it.
        const historyRecord = await saveTranslationHistory({
          sourceText: selectedText,
          translatedText: translation,
          sourceLang,
          targetLang
        });
        const displaySettings = await loadSelectionDisplaySettings();
        showTranslationTooltip(translation, selectionAnchor, {
          sourceText: selectedText,
          sourceLang,
          targetLang,
          historyRecord,
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

      // Show user-friendly error message for unsupported language pairs
      if (e.message?.includes('Failed to translate after') ||
          e.message?.includes('language pair is unsupported')) {
        showErrorTooltip('该语言对不支持翻译', selectionAnchor);
        setTimeout(hideTranslationTooltip, 3000); // Auto-hide after 3 seconds
      } else {
        hideTranslationTooltip();
      }

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
    floatingButton.title = translating ? '点击翻译当前网页' : '点击恢复原始网页';
    floatingButton.setAttribute('aria-label', floatingButton.title);
    floatingButton.style.color = translating ? '#dbeafe' : '#fbbf24';
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
    button.title = '点击翻译当前网页';
    button.setAttribute('aria-label', button.title);
    
    console.log('createFloatingButton: Applying styles...');
    // Apply styles - 长方形按钮样式
    button.style.cssText = [
      'position: fixed',
      'top: 50%',
      'right: 20px',
      'transform: translateY(-50%)',
      'width: 44px',
      'height: 44px',
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
      'backdrop-filter: blur(12px)',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'appearance: none',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'transition: transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease'
    ].join(';');

    console.log('createFloatingButton: Adding event listeners...');
    
    // Helper function to get current base transform (position-related)
    function getBaseTransform() {
      const currentTransform = button.style.transform;
      if (currentTransform.includes('translateY(-50%)')) {
        return 'translateY(-50%)';
      } else {
        return 'none';
      }
    }
    
    // Hover effects - 适配长方形按钮
    button.addEventListener('mouseenter', () => {
      if (!isDragging) {
        button.style.transition = 'all 0.2s ease'; // 为悬停效果添加过渡
        const baseTransform = getBaseTransform();
        if (baseTransform === 'translateY(-50%)') {
          button.style.transform = 'translateY(-50%) scale(1.05)';
        } else {
          button.style.transform = 'scale(1.05)';
        }
        button.style.background = '#2f3b49';
        button.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4), 0 0 16px rgba(118,189,233,0.28)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!isDragging) {
        button.style.transition = 'all 0.2s ease'; // 为悬停效果添加过渡
        const baseTransform = getBaseTransform();
        if (baseTransform === 'translateY(-50%)') {
          button.style.transform = 'translateY(-50%) scale(1)';
        } else {
          button.style.transform = 'scale(1)';
        }
        button.style.background = '#20252a';
        button.style.boxShadow = '0 6px 18px rgba(0,0,0,0.32), 0 0 12px rgba(118,189,233,0.16)';
        // 悬停效果结束后移除 transition，防止影响位置设置
        setTimeout(() => {
          button.style.transition = '';
        }, 200);
      }
    });

    // Make it draggable
    let startX, startY, initialX, initialY;

    function startDrag(e) {
      isDragging = true;
      floatingDragMoved = false;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      startX = clientX;
      startY = clientY;
      initialX = button.offsetLeft;
      initialY = button.offsetTop;
      
      button.style.cursor = 'grabbing';
      
      // 保持垂直居中的同时缩小
      const baseTransform = getBaseTransform();
      if (baseTransform === 'translateY(-50%)') {
        button.style.transform = 'translateY(-50%) scale(0.95)';
      } else {
        button.style.transform = 'scale(0.95)';
      }
      
      // 不在按下时阻止默认行为，否则浏览器可能不再派发 click。
    }

    function drag(e) {
      if (!isDragging) return;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) floatingDragMoved = true;
      
      let newX = initialX + deltaX;
      let newY = initialY + deltaY;
      
      // Constrain to viewport - 适配图标按钮尺寸 (44x44)
      const maxX = window.innerWidth - 44;
      const maxY = window.innerHeight - 44;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      // 清除两个定位属性，然后设置新的位置
      button.style.left = newX + 'px';
      button.style.right = 'auto';
      button.style.top = newY + 'px';
      button.style.transform = 'none'; // 拖动时移除 translateY 变换
      
      e.preventDefault();
    }

    function endDrag(e) {
      if (!isDragging) return;
      
      if (floatingDragMoved) suppressFloatingClickUntil = Date.now() + 350;
      isDragging = false;
      button.style.cursor = 'pointer';
      // 检查按钮是否仍在垂直居中位置，如果不是则不使用 translateY
      const currentTop = parseInt(button.style.top);
      const windowHeight = window.innerHeight;
      const buttonHeight = 44;
      const isNearCenter = Math.abs(currentTop - (windowHeight - buttonHeight) / 2) < 50;
      
      if (isNearCenter) {
        button.style.transform = 'translateY(-50%) scale(1)'; // 恢复垂直居中
        button.style.top = '50%'; // 设置为垂直居中
      } else {
        button.style.transform = 'scale(1)'; // 不在中间时不使用 translateY
      }
      
      // Save position to storage
      const rect = button.getBoundingClientRect();
      const positionData = {
        top: rect.top,
        useTranslateY: isNearCenter // 记录是否使用 translateY
      };
      
      // 检查按钮是在右侧还是左侧，保存对应的属性
      const windowWidth = window.innerWidth;
      const buttonWidth = 44;
      const isOnRight = rect.left > windowWidth / 2;
      
      if (isOnRight) {
        positionData.right = windowWidth - rect.right;
      } else {
        positionData.left = rect.left;
      }
      
      chrome.storage.sync.set({
        floatingButtonPosition: positionData
      }).catch(() => {}); // Ignore errors
      
      // 仅在实际移动过程中阻止默认行为，保留普通点击事件。
    }

    // Mouse events
    button.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // Touch events for mobile support
    button.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag, { passive: false });

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
    
    // Restore saved position
    chrome.storage.sync.get(['floatingButtonPosition']).then(result => {
      if (result.floatingButtonPosition) {
        const pos = result.floatingButtonPosition;
        // Ensure position is still within viewport - 适配长方形按钮尺寸 (60x32)
        const maxX = window.innerWidth - 44;
        const maxY = window.innerHeight - 44;
        
        // 处理位置恢复，支持 left 和 right 属性
        if (pos.right !== undefined) {
          // 使用 right 属性
          const x = Math.max(0, Math.min(pos.right, maxX));
          console.log('showFloatingButton: Restoring position to right:', x);
          button.style.right = x + 'px';
          button.style.left = 'auto'; // 清除 left 属性
        } else if (pos.left !== undefined) {
          // 兼容旧的 left 属性
          const x = Math.max(0, Math.min(pos.left, maxX));
          console.log('showFloatingButton: Restoring position to left:', x);
          button.style.left = x + 'px';
          button.style.right = 'auto'; // 清除 right 属性
        }
        
        const y = Math.max(0, Math.min(pos.top, maxY));
        
        // 根据保存的设置决定是否使用 translateY
        if (pos.useTranslateY) {
          button.style.top = '50%';
          button.style.transform = 'translateY(-50%)';
        } else {
          button.style.top = y + 'px';
          button.style.transform = 'none';
        }
      } else {
        console.log('showFloatingButton: No saved position, using default (right center)');
        // 默认位置：右侧中间
        button.style.right = '20px';
        button.style.left = 'auto';
        button.style.top = '50%';
        button.style.transform = 'translateY(-50%)';
      }
    }).catch(e => {
      console.warn('showFloatingButton: Error restoring position:', e);
      // 错误时使用默认位置
      button.style.right = '20px';
      button.style.left = 'auto';
      button.style.top = '50%';
      button.style.transform = 'translateY(-50%)';
    });
    
    try {
      document.body.appendChild(button);
      console.log('showFloatingButton: Button added to DOM successfully');
      
      updateFloatingButtonAppearance();
      
      // 按钮直接显示，无动画效果
      button.style.opacity = '1';
      button.style.visibility = 'visible';
      console.log('showFloatingButton: Button displayed directly without animation');
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
        if (msg && msg.type === 'START_PAGE_TRANSLATION') {
          const lang = msg.targetLang || 'zh-Hans';
          if (!enabled) {
            await translateTextNodes(lang);
          } else if (currentTargetLang !== normalizeLang(lang)) {
            // Retarget: re-translate current page to new target
            enabled = true;
            showOverlay('正在切换目标语言...');
            const sourceLang = await detectSourceLanguage(lang);
            if (!sourceLang) throw new Error('无法判断网页原文语言，已跳过切换。');
            if (normalizeLang(sourceLang) === normalizeLang(lang)) {
              restorePage();
              showOverlay('检测到网页已经是目标语言，已恢复原文');
              setTimeout(hideOverlay, 1600);
              sendResponse({ ok: true, enabled, targetLang: currentTargetLang });
              return;
            }
            await ensureTranslator(sourceLang, lang);
            // Re-run over current text nodes only (no restore)
            const nodes = Array.from(walkTextNodes(document.body || document.documentElement));
            for (const tn of nodes) {
              const now = tn.nodeValue || '';
              const original = originalText.get(tn) ?? now;
              if (!shouldTranslateText(original, lang)) continue;
              try {
                const translated = await translator.translate(originalText.get(tn) ?? now);
                if (enabled) tn.nodeValue = translated;
              } catch {}
            }
            showOverlay('切换完成');
            setTimeout(hideOverlay, 1000);
            
            updateFloatingButtonAppearance();
          }
          sendResponse({ ok: true, enabled, targetLang: currentTargetLang });
          return;
        }
        if (msg && msg.type === 'STOP_PAGE_TRANSLATION') {
          restorePage();
          sendResponse({ ok: true });
          return;
        }
        if (msg && msg.type === 'QUERY_STATUS') {
          sendResponse({ ok: true, enabled, targetLang: currentTargetLang });
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





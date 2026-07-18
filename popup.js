// popup.js - MV3 popup script using Translator and LanguageDetector APIs

const sourceSelect = document.getElementById("sourceLang");
const targetSelect = document.getElementById("targetLang");
const inputEl = document.getElementById("inputText");
const outputEl = document.getElementById("output");
const charCountEl = document.getElementById("charCount");

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

const SELECTION_SHOW_BILINGUAL_KEY = 'translatorSelectionShowBilingual';
const SELECTION_SHOW_SOURCE_KEY = 'translatorSelectionShowSource';

const manualPageBtn = document.getElementById("manualPageBtn");
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
const HISTORY_ENABLED_KEY = 'translatorHistoryEnabled';
const AUTO_READING_KEY = 'translatorAutoAddToReading';
let historyItems = [];
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

function openReader(item, returnView = historyViewSelect?.value || 'reading') {
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
  historyStatus.textContent = message;
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
  const view = historyViewSelect?.value || 'all';
  const from = historyFromDate?.value ? new Date(`${historyFromDate.value}T00:00:00`).getTime() : null;
  const to = historyToDate?.value ? new Date(`${historyToDate.value}T23:59:59.999`).getTime() : null;
  return historyItems.filter((item) => {
    if (view === 'reading' && !item.inReadingArea) return false;
    if (from !== null && item.createdAt < from) return false;
    if (to !== null && item.createdAt > to) return false;
    return true;
  });
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

function renderHistoryList() {
  if (!historyList) return;
  historyList.textContent = '';
  const visibleItems = getFilteredHistoryItems();
  if (!visibleItems.length) {
    const empty = document.createElement('div');
    empty.className = 'small';
    empty.textContent = '暂无符合条件的历史翻译';
    empty.style.cssText = 'padding:14px;text-align:center;color:var(--muted);';
    historyList.appendChild(empty);
    setHistoryStatus(`共 ${historyItems.length} 条记录`);
    return;
  }

  for (const item of visibleItems) {
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
    source.textContent = item.sourceText || '';
    source.title = item.sourceText || '';
    source.style.cssText = 'font-size:11px;line-height:1.4;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere;max-height:58px;overflow:auto;';
    const translated = document.createElement('div');
    translated.className = 'history-card-translated';
    translated.textContent = item.translatedText || '';
    translated.title = item.translatedText || '';
    translated.style.cssText = 'margin-top:4px;font-size:11px;line-height:1.45;color:#0f766e;white-space:pre-wrap;overflow-wrap:anywhere;max-height:72px;overflow:auto;';
    const meta = document.createElement('div');
    meta.className = 'history-card-meta';
    meta.textContent = `${formatHistoryTime(item.createdAt)} · ${item.pageTitle || item.pageUrl || ''}${item.inReadingArea ? ' · 阅读区' : ''}`;
    meta.style.cssText = 'margin-top:5px;font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    body.appendChild(source);
    body.appendChild(translated);
    body.appendChild(meta);
    header.appendChild(body);
    card.appendChild(header);

    const actions = document.createElement('div');
    actions.className = 'history-card-actions';
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:5px;margin-top:6px;';
    actions.appendChild(createHistoryButton(item.inReadingArea ? '移出阅读区' : '加入阅读区', 'reading', item.id));
    actions.appendChild(createHistoryButton('展开阅读', 'reader', item.id));
    actions.appendChild(createHistoryButton('删除', 'delete', item.id));
    card.appendChild(actions);
    historyList.appendChild(card);
  }
  setHistoryStatus(`显示 ${visibleItems.length} 条，共 ${historyItems.length} 条记录`);
}

async function loadHistoryState() {
  try {
    const result = await chrome.storage.local.get([HISTORY_KEY, HISTORY_ENABLED_KEY, AUTO_READING_KEY]);
    historyItems = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
    if (historyEnabledToggle) historyEnabledToggle.checked = result[HISTORY_ENABLED_KEY] !== false;
    if (autoReadingToggle) autoReadingToggle.checked = result[AUTO_READING_KEY] === true;
    renderHistoryList();
  } catch (e) {
    historyItems = [];
    setHistoryStatus('历史记录读取失败', 'err');
  }
}

async function saveHistoryItems() {
  await chrome.storage.local.set({ [HISTORY_KEY]: historyItems });
  renderHistoryList();
}

async function recordManualTranslationHistory(sourceText, translatedText, sourceLang, targetLang) {
  try {
    const settings = await chrome.storage.local.get([HISTORY_ENABLED_KEY, AUTO_READING_KEY]);
    if (settings[HISTORY_ENABLED_KEY] === false) return;
    const result = await chrome.storage.local.get([HISTORY_KEY]);
    const stored = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
    stored.unshift({
      id: `translation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceText: String(sourceText || '').replace(/\r\n?/g, '\n'),
      translatedText: String(translatedText || '').replace(/\r\n?/g, '\n'),
      sourceLang: sourceLang || 'auto',
      targetLang: targetLang || 'zh-Hans',
      pageUrl: '',
      pageTitle: '主功能区翻译',
      createdAt: Date.now(),
      inReadingArea: settings[AUTO_READING_KEY] === true
    });
    stored.splice(500);
    historyItems = stored;
    await chrome.storage.local.set({ [HISTORY_KEY]: stored });
    renderHistoryList();
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
  const id = button.dataset.id;
  const index = historyItems.findIndex((item) => item.id === id);
  if (index < 0) return;
  if (button.dataset.action === 'delete') {
    historyItems.splice(index, 1);
    await saveHistoryItems();
    setHistoryStatus('已删除 1 条历史翻译', 'ok');
  } else if (button.dataset.action === 'reading') {
    historyItems[index].inReadingArea = !historyItems[index].inReadingArea;
    await saveHistoryItems();
    setHistoryStatus(historyItems[index].inReadingArea ? '已加入阅读区' : '已移出阅读区', 'ok');
  } else if (button.dataset.action === 'reader') {
    openReader(historyItems[index], historyViewSelect?.value || 'all');
  }
});

refreshHistoryBtn?.addEventListener('click', loadHistoryState);
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
  historyItems = historyItems.filter((item) => !selected.has(item.id));
  await saveHistoryItems();
  setHistoryStatus(`已删除 ${selected.size} 条历史翻译`, 'ok');
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
  const before = historyItems.length;
  historyItems = historyItems.filter((item) => {
    if (from !== null && item.createdAt < from) return true;
    if (to !== null && item.createdAt > to) return true;
    return false;
  });
  const removed = before - historyItems.length;
  if (removed && window.confirm(`确定删除日期范围内的 ${removed} 条记录吗？`)) {
    await saveHistoryItems();
    setHistoryStatus(`已删除 ${removed} 条历史翻译`, 'ok');
  } else if (removed) {
    await loadHistoryState();
    setHistoryStatus('已取消删除');
  } else {
    setHistoryStatus('该日期范围没有记录');
  }
});
clearHistoryBtn?.addEventListener('click', async () => {
  if (!historyItems.length) {
    closeReader();
    setHistoryToolsOpen(false);
    syncArchiveTabs('all');
    renderHistoryList();
    return;
  }
  if (!window.confirm(`确定清空全部 ${historyItems.length} 条历史翻译吗？`)) return;

  const previousItems = historyItems;
  historyItems = [];
  closeReader();
  setHistoryToolsOpen(false);
  syncArchiveTabs('all');
  try {
    await chrome.storage.local.set({ [HISTORY_KEY]: [] });
    renderHistoryList();
    setHistoryStatus('历史翻译已清空', 'ok');
  } catch (error) {
    historyItems = previousItems;
    renderHistoryList();
    setHistoryStatus('清空历史翻译失败：' + String(error?.message || error || ''), 'err');
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
}

inputEl.addEventListener("input", updateCharCount);
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
  ["auto", "自动检测"],

  ["en", "英语"],
  ["zh-Hans", "中文（简体 zh-Hans）"],
  ["zh-Hant", "中文（繁体 zh-Hant）"],
  ["ja", "日语"],
  ["ko", "韩语"],
  ["fr", "法语"],
  ["de", "德语"],
  ["es", "西班牙语"],
  ["ru", "俄语"],
  ["it", "意大利语"],
  ["pt", "葡萄牙语"],
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
  statusEl.textContent = msg;
  statusEl.className = `hint small ${cls}`.trim();
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
  if (!hasTranslator) {
    setStatus("当前浏览器不支持 Translator API（需要 Chrome 138+ 且安全上下文）。", "err");
    return;
  }

  translateBtn.disabled = true;
  translateBtn.classList.add('loading');
  setCopyEnabled(false);
  setStatus("正在准备翻译...", "");

  let sourceLanguage = sourceSelect.value;
  const targetLanguage = targetSelect.value;

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
      await recordManualTranslationHistory(text, translation, sourceLanguage, usedTarget);
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
      SELECTION_SHOW_SOURCE_KEY
    ]);
    const autoEnabled = !!s.autoTranslateEnabled;
    const selectionEnabled = !!s.selectionTranslateEnabled;
    const floatingEnabled = !!s.floatingButtonEnabled;
    const showBilingual = s[SELECTION_SHOW_BILINGUAL_KEY] !== false;
    const showSource = s[SELECTION_SHOW_SOURCE_KEY] !== false;

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
    if (s.autoTranslateTargetLang) targetSelect.value = s.autoTranslateTargetLang;
    
    // 加载白名单和历史翻译
    await loadWhitelist();
    await loadHistoryState();
  } catch {}

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

const consoleTabs = Array.from(document.querySelectorAll('.console-tab'));
function setConsoleTab(tabName) {
  const activeTab = tabName || 'translation';
  document.body.dataset.activeTab = activeTab;
  consoleTabs.forEach((tab) => {
    const isActive = tab.dataset.tab === activeTab;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  if (activeTab === 'archive') {
    void loadHistoryState();
  }
}
consoleTabs.forEach((tab) => {
  tab.addEventListener('click', () => setConsoleTab(tab.dataset.tab));
});
setConsoleTab('translation');


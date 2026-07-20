// Shared Chrome extension localization helper.
// Extension pages opt in with data-anwara-extension-page; content scripts only use t().
(() => {
  const TEXT_KEYS = Object.freeze({
    '翻译': 'tabTranslation', '历史 / 阅读区': 'tabArchive', '设置': 'tabSettings',
    '翻译当前网页': 'translateCurrentPage', '结构化阅读': 'structuredReader', '恢复原状': 'restorePage',
    '来源语言': 'sourceLanguage', '目标语言': 'targetLanguage', '交换来源与目标语言': 'swapLanguages',
    '输入文本': 'inputText', '清空输入': 'clearInput', '开始翻译': 'startTranslation',
    '模型下载进度': 'modelDownloadProgress', '翻译结果': 'translationResult', '朗读': 'speak', '复制': 'copy', '翻译结果将显示在这里...': 'outputPlaceholder',
    '历史翻译与阅读区': 'archiveTitle', '历史记录与阅读区分开管理': 'archiveDescription',
    '历史翻译': 'history', '阅读区': 'readingArea', '刷新': 'refresh', '管理': 'manage', '收起': 'collapse',
    '全部历史': 'allHistory', '记录历史翻译': 'recordHistory', '新翻译自动加入阅读区': 'autoAddReading',
    '批量操作': 'batchActions', '全选': 'selectAll', '删除选中': 'deleteSelected', '删日期范围': 'deleteDateRange',
    '清空全部': 'clearAll', '暂无历史翻译': 'noHistory', '轻量阅读': 'lightReader', '返回列表': 'returnList',
    '在线翻译': 'onlineTranslation', '大模型翻译': 'llmTranslation', '本地翻译': 'localTranslation',
    '大模型配置': 'llmConfig', '翻译服务配置': 'providerConfig', '服务阶段': 'serviceStage',
    '翻译服务': 'translationService', '接口地址': 'endpoint', '模型名称': 'modelName', '区域（可选）': 'regionOptional',
    '保存服务配置': 'saveProviderConfig', '测试连接': 'testConnection', '未配置': 'notConfigured',
    '白名单管理': 'whitelistManagement', '添加网址或路径': 'addUrlOrPath', '添加': 'add',
    '添加当前网页到白名单': 'addCurrentPageWhitelist', '暂无白名单网址': 'noWhitelist',
    '遇到问题？': 'havingProblems', '选择反馈方式': 'feedbackDescription', '仓库': 'repository', '项目仓库': 'projectRepository',
    '目录': 'toc', '复制译文': 'copyTranslation', '双语阅读': 'bilingualReading', '重新翻译': 'retranslate',
    '从原文重新生成': 'regenerateFromSource', '双语': 'dual', '原文': 'source', '译文': 'translated',
    '纸张': 'paper', '雪白': 'snow', '暖棕': 'sepia', '石墨': 'graphite', '午夜': 'midnight', '森林': 'forest',
    '阅读字体': 'readingFont', '衬线': 'serif', '黑体': 'sans', '楷体': 'kai', '系统': 'system',
    '减小字号': 'decreaseFont', '增大字号': 'increaseFont', '正在读取历史记录': 'loadingHistory',
    '打开目录': 'openToc', '关闭目录': 'closeToc', '关闭阅读页': 'closeReader', '返回跳转前位置': 'returnPreviousPosition',
    '文章目录': 'articleToc', '选择重新翻译方式': 'chooseRetranslation', '阅读模式': 'readingMode',
    '阅读主题': 'readingTheme', '字号调整': 'fontSizeAdjust', '打开翻译结果': 'openTranslationResult',
    '关闭面板': 'closePanel', '固定面板': 'pinPanel', '取消固定面板': 'unpinPanel', '加入阅读区': 'addToReading',
    '从阅读区移出': 'removeFromReading', '展开阅读': 'openReader', '删除': 'delete', '刷新历史记录': 'refreshHistory',
    '复制翻译结果': 'copyTranslationResult', '朗读翻译结果': 'speakTranslationResult', '拖动翻译窗口': 'dragTranslationPanel',
    '调整面板大小': 'resizePanel', '默认选句面板大小': 'selectionPanelDefaultSize', '新网页使用此尺寸；已单独调整过的网站保持自己的尺寸': 'selectionPanelDefaultSizeHint',
    '宽度': 'width', '高度': 'height', '默认面板宽度': 'defaultPanelWidth', '默认面板高度': 'defaultPanelHeight',
    '保存大小': 'savePanelSize', '恢复默认': 'restoreDefault', '恢复内置默认大小（360 × 220）': 'restoreBuiltInPanelSize',
    '默认面板大小已保存': 'selectionPanelDefaultSizeSaved', '已恢复默认面板大小': 'selectionPanelDefaultSizeRestored', '面板大小无效：宽度 240-1600 px，高度 180-1200 px': 'selectionPanelDefaultSizeInvalid',
    '点击翻译当前网页': 'clickToTranslatePage', '点击恢复原始网页': 'clickToRestorePage',
    '保留网页段落和标题，打开双语阅读页': 'structuredReaderTitle', '请输入需要翻译的文本...': 'inputPlaceholder',
    '仅保存在本机扩展存储': 'localOnlyPlaceholder', '例如 ap-beijing': 'regionPlaceholder', '系统提示词': 'systemPrompt',
    '支持 {{to}}、{{from}}、{{origin}}': 'userPromptPlaceholder', '服务接口地址': 'serviceEndpointPlaceholder',
    '模型 ID': 'modelIdPlaceholder', '获取 Google Cloud API Key': 'getGoogleKey', '例如：google.com 或 *.google.com': 'whitelistInputPlaceholder',
    '创建 Translator 资源并获取 Key': 'getMicrosoftKey', '管理 DeepL API Key': 'manageDeepLKey',
    '无需 Key：请先启动本地 DeepLX 服务': 'deepLXNoKey', '前往小牛翻译平台获取 Key': 'getNiuKey',
    '前往有道智云申请应用凭证': 'getYoudaoCredentials', '前往腾讯云获取 SecretId / SecretKey': 'getTencentCredentials',
    '自动检测': 'languageAuto', '英语': 'languageEnglish', '简体中文': 'languageZhHans', '繁体中文': 'languageZhHant',
    '日语': 'languageJapanese', '韩语': 'languageKorean', '法语': 'languageFrench', '德语': 'languageGerman',
    '西班牙语': 'languageSpanish', '俄语': 'languageRussian', '意大利语': 'languageItalian', '葡萄牙语': 'languagePortuguese', '阿拉伯语': 'languageArabic',
    'Google Cloud 翻译': 'providerGoogleCloud', 'Microsoft 翻译': 'providerMicrosoft', '小牛翻译': 'providerNiu', '有道翻译': 'providerYoudao', '腾讯云翻译': 'providerTencent',
    '阿里通义': 'providerTongyi', '智谱清言': 'providerZhipu', '百川智能': 'providerBaichuan', '零一万物': 'providerLingyi', '阶跃星辰': 'providerStepfun', '腾讯混元': 'providerHunyuan', '字节豆包': 'providerDoubao', '无问芯穹': 'providerInfini',
    'New API / 聚合接口': 'providerNewApi', '自定义 OpenAI 兼容接口': 'providerCustom', '未知语言': 'unknownLanguage',
    '同语言时保留原文': 'sameLanguageKeepOriginal', '同语言时继续翻译': 'sameLanguageContinue', '同语言时将继续翻译': 'sameLanguageContinueStatus'
    , '功能设置': 'settingsTitle', '自动翻译网页': 'autoTranslatePage', '选中文本翻译': 'selectionTranslate',
    '漂浮翻译按钮': 'floatingTranslateButton', '面板显示双语': 'panelShowBilingual', '显示翻译来源': 'showTranslationSource',
    '同语言时的处理': 'sameLanguageHandling', '不翻译，保留原文': 'keepOriginal', '继续翻译': 'continueTranslation',
    '默认翻译引擎': 'defaultEngine', '选择后自动保存为全局默认': 'globalEngineAutoSave', '全局默认翻译引擎': 'globalDefaultEngine',
    '设为当前网站默认': 'setSiteDefault', '清除网站默认': 'clearSiteDefault', '当前网站跟随全局默认': 'siteFollowsGlobal',
    '当前页面不支持网站级默认设置': 'siteDefaultUnsupported', '大模型接口配置': 'llmEndpointConfig',
    'OpenAI 兼容 API 地址': 'openAiCompatibleEndpoint', 'API Key（可选，保存在本机扩展存储）': 'optionalApiKeyLocal',
    '保存大模型配置': 'saveLlmConfig', '当前白名单（': 'currentWhitelistPrefix', '条）': 'whitelistEntriesSuffix',
    '提示：输入 google.com 只匹配精确域名，输入 *.google.com 匹配所有子域名，输入 google.com/admin 只匹配特定路径': 'whitelistHint',
    '项目 Issues 反馈': 'issuesFeedback', '打开项目仓库': 'openRepository', '获取服务凭证': 'getServiceCredentials',
    '可用': 'available', '待配置': 'needsConfiguration', '已配置': 'configured', '已保存': 'saved', '连接成功': 'connectionSuccess',
    '连接失败': 'connectionFailed', '测试中…': 'testing', '正在保存…': 'saving', '配置不完整': 'incompleteConfiguration',
    '粘贴 New API 控制台中的 API Key': 'newApiKeyPlaceholder', '粘贴该服务的 API Key / Token': 'providerKeyPlaceholder',
    '此服务可不填 Key': 'providerKeyOptional', '已开启': 'enabled', '已关闭': 'disabled',
    '正在翻译页面': 'translatingPage', '正在翻译结构化内容': 'translatingStructured', '正在提取网页结构': 'extractingStructure',
    '检测到页面已经是目标语言，保留原文结构': 'sameLanguageStructured', '正在准备页面翻译...': 'preparingPageTranslation',
    '检测到网页已经是目标语言，未执行翻译': 'sameLanguagePageSkipped', '未找到可翻译的正文': 'noTranslatableBody',
    '页面翻译完成': 'pageTranslationComplete', '此页面不支持翻译功能（需要 Chrome 138+ 且安全上下文）': 'translatorUnsupportedContext',
    '正在切换翻译引擎并重新翻译...': 'switchingTranslationEngine', '正在切换目标语言...': 'switchingTargetLanguage',
    '在本页查找': 'pageSearch', '上一处': 'previousMatch', '下一处': 'nextMatch', '阅读进度': 'readingProgress',
    '搜索原文、译文或标题': 'historySearchPlaceholder', '全部方式': 'allEngines', '合并重复': 'mergeDuplicates', '撤销': 'undo',
    '重试翻译': 'retryTranslation', '请刷新当前页面后重试': 'refreshPageNotice', '尚未配置，请从工具栏打开 Anwara Translator → 设置': 'engineNotConfigured'
  });

  function message(key, fallback, substitutions) {
    try {
      const value = chrome.i18n.getMessage(key, substitutions);
      return value || fallback || key;
    } catch {
      return fallback || key;
    }
  }

  function text(value, substitutions) {
    const raw = String(value ?? '');
    const trimmed = raw.trim();
    const key = TEXT_KEYS[trimmed];
    let localized;
    if (key) localized = message(key, trimmed, substitutions);
    else {
      const characterCount = trimmed.match(/^字数：([0-9]+)$/);
      const archiveCount = trimmed.match(/^共 ([0-9]+) 条(历史翻译|阅读区)记录$/);
      const emptyArchive = trimmed.match(/^暂无符合条件的(历史翻译|阅读区)记录$/);
      const structuredProgress = trimmed.match(/^正在翻译结构化内容 \(([0-9]+)\/([0-9]+)\)\.\.\.$/);
      const extractionProgress = trimmed.match(/^正在提取网页结构 \(([0-9]+) 个内容块\)\.\.\.$/);
      const pageProgress = trimmed.match(/^正在翻译页面 \(([0-9]+)\/([0-9]+)\)\.\.\.$/);
      if (characterCount) localized = message('characterCount', trimmed, [characterCount[1]]);
      else if (archiveCount) {
        const labelKey = archiveCount[2] === '阅读区' ? 'readingArea' : 'history';
        localized = message('archiveCount', trimmed, [archiveCount[1], message(labelKey, archiveCount[2])]);
      } else if (emptyArchive) {
        const labelKey = emptyArchive[1] === '阅读区' ? 'readingArea' : 'history';
        localized = message('emptyArchive', trimmed, [message(labelKey, emptyArchive[1])]);
      } else if (structuredProgress) localized = message('structuredProgress', trimmed, structuredProgress.slice(1));
      else if (extractionProgress) localized = message('extractionProgress', trimmed, [extractionProgress[1]]);
      else if (pageProgress) localized = message('pageProgress', trimmed, pageProgress.slice(1));
      else return raw;
    }
    const start = raw.indexOf(trimmed);
    return raw.slice(0, start) + localized + raw.slice(start + trimmed.length);
  }

  function localizeAttributes(element) {
    for (const attribute of ['title', 'aria-label', 'placeholder']) {
      if (!element.hasAttribute(attribute)) continue;
      const value = element.getAttribute(attribute);
      const localized = text(value);
      if (localized !== value) element.setAttribute(attribute, localized);
    }
  }

  function isUserTextNode(node) {
    const element = node?.parentElement;
    return Boolean(element?.closest?.('#readerContent, #output, #readerTitle, #sourceLink, #readerMeta, .reader-content, .reader-source, .reader-translated, .history-card-source, .history-card-translated'));
  }

  function localizeElement(root) {
    if (!root || typeof Node === 'undefined') return;
    const element = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
    if (element) {
      localizeAttributes(element);
      element.querySelectorAll?.('[title], [aria-label], [placeholder]').forEach(localizeAttributes);
    }
    const walkRoot = root.nodeType === Node.TEXT_NODE ? root.parentNode : root;
    if (!walkRoot) return;
    const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.filter((textNode) => !isUserTextNode(textNode)).forEach((textNode) => {
      const localized = text(textNode.nodeValue);
      if (localized !== textNode.nodeValue) textNode.nodeValue = localized;
    });
  }

  function localizeDocument() {
    if (document.documentElement?.dataset.anwaraExtensionPage !== 'true') return;
    const uiLocale = chrome.i18n.getUILanguage?.() || 'zh-CN';
    document.documentElement.lang = /^en(?:-|$)/i.test(uiLocale) ? 'en' : 'zh-CN';
    document.documentElement.style.setProperty('--translation-result-placeholder', JSON.stringify(message('outputPlaceholder', '翻译结果将显示在这里...')));
    localizeElement(document.body);
    if (document.body && !document.body.dataset.anwaraI18nObserver) {
      const observer = new MutationObserver((records) => records.forEach((record) => {
        record.addedNodes.forEach((node) => localizeElement(node));
        if (record.type === 'characterData') localizeElement(record.target);
      }));
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      document.body.dataset.anwaraI18nObserver = 'true';
    }
  }

  globalThis.AnwaraI18n = Object.freeze({
    t: message,
    text,
    localize: localizeDocument,
    locale: chrome.i18n.getUILanguage?.() || 'zh-CN'
  });

  if (document.documentElement?.dataset.anwaraExtensionPage === 'true') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', localizeDocument, { once: true });
    else localizeDocument();
  }
})();

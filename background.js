// background.js - MV3 service worker to support auto-translate on tab load

const KEY = {
  auto: 'autoTranslateEnabled',
  target: 'autoTranslateTargetLang',
  whitelist: 'whitelistPatterns',
  contextVocabulary: 'contextVocabularyEnabled',
};

const CONTENT_SCRIPT_VERSION = '1.6.22';
const CONTEXT_MENU_ROOT_ID = 'translator-context-root';
const CONTEXT_MENU_STRUCTURED_READER_ID = 'translator-structured-reader';
const CONTEXT_MENU_SAVE_VOCABULARY_ID = 'translator-save-selection-vocabulary';
const CONTEXT_MENU_RESTORE_ID = 'translator-restore-page';
const CONTEXT_ENGINE_MENU_IDS = {
  local: 'translator-translate-local',
  online: 'translator-translate-online',
  llm: 'translator-translate-llm'
};
function localizedMessage(key, fallback, substitutions) {
  try {
    return chrome.i18n.getMessage(key, substitutions) || fallback || key;
  } catch {
    return fallback || key;
  }
}
const CONTEXT_ENGINE_LABELS = {
  local: localizedMessage('localTranslation', '本地翻译'),
  online: localizedMessage('onlineTranslation', '在线翻译'),
  llm: localizedMessage('llmTranslation', '大模型翻译')
};

let contextMenuBuildPromise = null;
let vocabularyMenuMutationPromise = Promise.resolve();
const LLM_PROFILE_KEY = 'translatorLlmProfile';
const PROVIDER_PROFILES_KEY = 'translatorProviderProfiles';
const PROVIDER_CREDENTIALS_KEY = 'translatorProviderCredentials';
const PROVIDER_ACTIVE_PROFILE_KEY = 'translatorProviderActiveProfileIds';
const READER_DRAFTS_KEY = 'translatorReaderDrafts';
const VOCABULARY_KEY = 'translatorVocabulary';
const VOCABULARY_LIMIT = 1000;
const readerDraftTabs = new Map();

// Provider registry follows FluentRead's service/token/model/custom-url split,
// while keeping secrets in chrome.storage.local and requests in the worker.
const PROVIDER_DEFINITIONS = Object.freeze({
  google: { stage: 'online', kind: 'google-cloud', label: 'Google Cloud 翻译', baseUrl: 'https://translation.googleapis.com/language/translate/v2' },
  microsoft: { stage: 'online', kind: 'microsoft', label: 'Microsoft 翻译', baseUrl: 'https://api.cognitive.microsofttranslator.com/translate' },
  deepl: { stage: 'online', kind: 'deepl', label: 'DeepL', baseUrl: 'https://api-free.deepl.com/v2/translate' },
  deeplx: { stage: 'online', kind: 'deeplx', label: 'DeepLX', baseUrl: 'http://localhost:1188/translate', allowHttp: true },
  xiaoniu: { stage: 'online', kind: 'xiaoniu', label: '小牛翻译', baseUrl: 'https://api.niutrans.com/NiuTransServer/translation' },
  youdao: { stage: 'online', kind: 'youdao', label: '有道翻译', baseUrl: 'https://openapi.youdao.com/api' },
  tencent: { stage: 'online', kind: 'tencent', label: '腾讯云翻译', baseUrl: 'https://tmt.tencentcloudapi.com/' },
  openai: { stage: 'llm', kind: 'openai-compatible', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  deepseek: { stage: 'llm', kind: 'openai-compatible', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
  tongyi: { stage: 'llm', kind: 'openai-compatible', label: '阿里通义', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  zhipu: { stage: 'llm', kind: 'openai-compatible', label: '智谱清言', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  moonshot: { stage: 'llm', kind: 'openai-compatible', label: 'Kimi / Moonshot', baseUrl: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
  baichuan: { stage: 'llm', kind: 'openai-compatible', label: '百川智能', baseUrl: 'https://api.baichuan-ai.com/v1/chat/completions', model: 'Baichuan4-Air' },
  lingyi: { stage: 'llm', kind: 'openai-compatible', label: '零一万物', baseUrl: 'https://api.lingyiwanwu.com/v1/chat/completions', model: 'yi-lightning' },
  stepfun: { stage: 'llm', kind: 'openai-compatible', label: '阶跃星辰', baseUrl: 'https://api.stepfun.com/v1/chat/completions', model: 'step-1-8k' },
  hunyuan: { stage: 'llm', kind: 'openai-compatible', label: '腾讯混元', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-turbos-latest' },
  doubao: { stage: 'llm', kind: 'openai-compatible', label: '字节豆包', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: '' },
  infini: { stage: 'llm', kind: 'openai-compatible', label: '无问芯穹', baseUrl: 'https://cloud.infini-ai.com/maas/v1/chat/completions', model: 'qwen2.5-14b-instruct' },
  siliconflow: { stage: 'llm', kind: 'openai-compatible', label: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen2.5-7B-Instruct' },
  openrouter: { stage: 'llm', kind: 'openai-compatible', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini' },
  groq: { stage: 'llm', kind: 'openai-compatible', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
  xai: { stage: 'llm', kind: 'openai-compatible', label: 'Grok / xAI', baseUrl: 'https://api.x.ai/v1/chat/completions', model: 'grok-3-mini' },
  gemini: { stage: 'llm', kind: 'gemini', label: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash' },
  claude: { stage: 'llm', kind: 'claude', label: 'Claude', baseUrl: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-haiku-latest' },
  newapi: { stage: 'llm', kind: 'openai-compatible', label: 'New API / 聚合接口', baseUrl: 'http://localhost:3000/v1/chat/completions', model: 'gpt-4o-mini', allowHttp: true },
  custom: { stage: 'llm', kind: 'openai-compatible', label: '自定义 OpenAI 兼容接口', baseUrl: 'http://localhost:11434/v1/chat/completions', model: 'llama3.2', allowHttp: true }
});

const DEFAULT_TRANSLATION_SYSTEM_PROMPT = 'You are a professional translation engine. Translate only. Preserve paragraph breaks, line breaks, numbering, citation markers, URLs, and code. Do not add explanations or omit content.';
const DEFAULT_TRANSLATION_USER_PROMPT = 'Translate the following text into {{to}}. Return only the translation.\n\n{{origin}}';

function getProviderDefinition(providerId) {
  return PROVIDER_DEFINITIONS[providerId] || null;
}

function normalizeProviderProfile(providerId, profile = {}) {
  const definition = getProviderDefinition(providerId) || {};
  return {
    baseUrl: String(profile.baseUrl || definition.baseUrl || '').trim().replace(/\/+$/, ''),
    apiKey: String(profile.apiKey || '').trim(),
    model: String(profile.model || definition.model || '').trim(),
    region: String(profile.region || '').trim(),
    appId: String(profile.appId || '').trim(),
    appSecret: String(profile.appSecret || '').trim(),
    systemPrompt: String(profile.systemPrompt || DEFAULT_TRANSLATION_SYSTEM_PROMPT),
    userPrompt: String(profile.userPrompt || DEFAULT_TRANSLATION_USER_PROMPT)
  };
}

function isAllowedProviderUrl(value, allowHttp = false) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' || (allowHttp && url.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname));
  } catch {
    return false;
  }
}

function interpolatePrompt(template, sourceLang, targetLang, text) {
  return String(template || DEFAULT_TRANSLATION_USER_PROMPT)
    .replace(/\{\{to\}\}/g, targetLang || 'zh-Hans')
    .replace(/\{\{from\}\}/g, sourceLang || 'auto')
    .replace(/\{\{origin\}\}/g, String(text || ''));
}

function providerRequiresKey(providerId) {
  return !['deeplx', 'youdao', 'tencent', 'custom'].includes(providerId);
}

function validateProviderProfile(providerId, profile) {
  const definition = getProviderDefinition(providerId);
  if (!definition) throw new Error('PROVIDER_UNKNOWN');
  const normalized = normalizeProviderProfile(providerId, profile);
  if (!isAllowedProviderUrl(normalized.baseUrl, definition.allowHttp === true)) throw new Error('PROVIDER_URL_INVALID');
  if (providerRequiresKey(providerId) && !normalized.apiKey && !['youdao', 'tencent'].includes(providerId)) throw new Error('PROVIDER_KEY_REQUIRED');
  if (['youdao', 'tencent'].includes(providerId) && (!normalized.appId || !normalized.appSecret)) throw new Error('PROVIDER_CREDENTIALS_REQUIRED');
  if (definition.stage === 'llm' && !normalized.model) throw new Error('PROVIDER_MODEL_REQUIRED');
  return normalized;
}

async function fetchProviderResponse(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    return payload ?? text;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('PROVIDER_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mapTargetLanguage(language) {
  return ({ 'zh-Hans': 'zh', 'zh-Hant': 'zh-TW' }[language] || language || 'zh');
}

function mapYoudaoLanguage(language) {
  return ({ 'zh-Hans': 'zh-CHS', 'zh-Hant': 'zh-CHT' }[language] || language || 'auto');
}

function hexFromBuffer(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  return hexFromBuffer(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function hmacSha256(key, message) {
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

function resolveStoredProviderProfile(settings, providerId, requestedProfileKey = '') {
  const storedProfiles = settings[PROVIDER_PROFILES_KEY] && typeof settings[PROVIDER_PROFILES_KEY] === 'object'
    ? settings[PROVIDER_PROFILES_KEY] : {};
  const storedCredentials = settings[PROVIDER_CREDENTIALS_KEY] && typeof settings[PROVIDER_CREDENTIALS_KEY] === 'object'
    ? settings[PROVIDER_CREDENTIALS_KEY] : {};
  const activeProfiles = settings[PROVIDER_ACTIVE_PROFILE_KEY] && typeof settings[PROVIDER_ACTIVE_PROFILE_KEY] === 'object'
    ? settings[PROVIDER_ACTIVE_PROFILE_KEY] : {};
  const preferredKey = requestedProfileKey || activeProfiles[providerId] || '';
  let storageKey = preferredKey && storedProfiles[preferredKey]?.providerId === providerId ? preferredKey : '';
  if (!storageKey) {
    storageKey = Object.entries(storedProfiles)
      .find(([, profile]) => profile?.providerId === providerId)?.[0] || '';
  }
  if (storageKey) {
    return {
      profileKey: storageKey,
      profile: { ...storedProfiles[storageKey], ...(storedCredentials[storageKey] || {}) }
    };
  }
  const legacyProfile = {
    ...(providerId === 'openai' && settings[LLM_PROFILE_KEY] ? settings[LLM_PROFILE_KEY] : {}),
    ...(storedProfiles[providerId] || {}),
    ...(storedCredentials[providerId] || {})
  };
  return { profileKey: '', profile: legacyProfile };
}

async function translateWithProvider(text, sourceLang, targetLang, providerId, profileKey = '') {
  const input = String(text || '').trim();
  if (!input) return '';
  const settings = await chrome.storage.local.get([PROVIDER_PROFILES_KEY, PROVIDER_CREDENTIALS_KEY, PROVIDER_ACTIVE_PROFILE_KEY, LLM_PROFILE_KEY]);
  const { profile: rawProfile } = resolveStoredProviderProfile(settings, providerId, profileKey);
  const profile = validateProviderProfile(providerId, rawProfile);
  const definition = getProviderDefinition(providerId);
  const source = sourceLang || 'auto';
  const target = targetLang || 'zh-Hans';
  const system = profile.systemPrompt || DEFAULT_TRANSLATION_SYSTEM_PROMPT;
  const user = interpolatePrompt(profile.userPrompt, source, target, input);

  if (definition.kind === 'google-cloud') {
    const body = { q: [input], target: mapTargetLanguage(target), format: 'text' };
    if (source !== 'auto') body.source = source;
    const result = await fetchProviderResponse(profile.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': profile.apiKey },
      body: JSON.stringify(body)
    });
    return result?.data?.translations?.[0]?.translatedText || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  if (definition.kind === 'deeplx') {
    const result = await fetchProviderResponse(profile.baseUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(profile.apiKey ? { Authorization: `Bearer ${profile.apiKey}` } : {}) },
      body: JSON.stringify({ text: input, source_lang: source.toUpperCase(), target_lang: mapTargetLanguage(target).toUpperCase() })
    });
    if (result?.data) return result.data;
    throw new Error('PROVIDER_EMPTY_RESPONSE');
  }

  if (definition.kind === 'deepl') {
    const result = await fetchProviderResponse(profile.baseUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${profile.apiKey}` },
      body: JSON.stringify({ text: [input], target_lang: mapTargetLanguage(target).toUpperCase(), tag_handling: 'html', preserve_formatting: true })
    });
    return result?.translations?.[0]?.text || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  if (definition.kind === 'microsoft') {
    const params = new URLSearchParams({ 'api-version': '3.0', to: mapTargetLanguage(target) });
    if (source !== 'auto') params.set('from', source);
    const headers = { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': profile.apiKey };
    if (profile.region) headers['Ocp-Apim-Subscription-Region'] = profile.region;
    const result = await fetchProviderResponse(`${profile.baseUrl}?${params.toString()}`, { method: 'POST', headers, body: JSON.stringify([{ Text: input }]) });
    return result?.[0]?.translations?.[0]?.text || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  if (definition.kind === 'xiaoniu') {
    const body = new URLSearchParams({ from: source, to: mapTargetLanguage(target), apikey: profile.apiKey, src_text: input });
    const result = await fetchProviderResponse(profile.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    return result?.tgt_text || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  if (definition.kind === 'youdao') {
    const salt = String(Date.now());
    const curtime = String(Math.floor(Date.now() / 1000));
    const truncated = input.length <= 20 ? input : `${input.slice(0, 10)}${input.length}${input.slice(-10)}`;
    const sign = await sha256Hex(profile.appId + truncated + salt + curtime + profile.appSecret);
    const body = new URLSearchParams({ q: input, from: mapYoudaoLanguage(source), to: mapYoudaoLanguage(target), appKey: profile.appId, salt, sign, signType: 'v3', curtime });
    const result = await fetchProviderResponse(profile.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    if (result?.errorCode && result.errorCode !== '0') throw new Error(`PROVIDER_YOUDAO_${result.errorCode}`);
    return result?.translation?.join(' ') || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  if (definition.kind === 'tencent') {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify({ SourceText: input, Source: source === 'auto' ? 'auto' : source, Target: mapTargetLanguage(target), ProjectId: 0 });
    const hashedPayload = await sha256Hex(payload);
    const canonical = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:tmt.tencentcloudapi.com\n\ncontent-type;host\n${hashedPayload}`;
    const scope = `${date}/tmt/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${scope}\n${await sha256Hex(canonical)}`;
    const kDate = await hmacSha256(`TC3${profile.appSecret}`, date);
    const kService = await hmacSha256(kDate, 'tmt');
    const kSigning = await hmacSha256(kService, 'tc3_request');
    const signature = hexFromBuffer(await hmacSha256(kSigning, stringToSign));
    const authorization = `TC3-HMAC-SHA256 Credential=${profile.appId}/${scope}, SignedHeaders=content-type;host, Signature=${signature}`;
    const result = await fetchProviderResponse(profile.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: authorization, 'X-TC-Action': 'TextTranslate', 'X-TC-Version': '2018-03-21', 'X-TC-Region': profile.region || 'ap-beijing', 'X-TC-Timestamp': String(timestamp) },
      body: payload
    });
    if (result?.Response?.Error) throw new Error(`PROVIDER_TENCENT_${result.Response.Error.Code}`);
    return result?.Response?.TargetText || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  if (definition.kind === 'gemini') {
    const base = profile.baseUrl.replace(/\/+$/, '');
    const url = `${base}/v1beta/models/${encodeURIComponent(profile.model)}:generateContent?key=${encodeURIComponent(profile.apiKey)}`;
    const result = await fetchProviderResponse(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }] }) });
    return result?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('') || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  if (definition.kind === 'claude') {
    const result = await fetchProviderResponse(profile.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': profile.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: profile.model, max_tokens: 4096, system, messages: [{ role: 'user', content: user }] }) });
    return result?.content?.map((part) => part?.text || '').join('') || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
  }

  const result = await fetchProviderResponse(profile.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(profile.apiKey ? { Authorization: `Bearer ${profile.apiKey}` } : {}), ...(providerId === 'openrouter' ? { 'HTTP-Referer': 'https://github.com/salimongo/Anwara-Translator', 'X-Title': 'Anwara Translator' } : {}) },
    body: JSON.stringify({ model: profile.model, temperature: 0.15, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
  });
  return result?.choices?.[0]?.message?.content || result?.choices?.[0]?.text || (() => { throw new Error('PROVIDER_EMPTY_RESPONSE'); })();
}

function getLlmChatCompletionsUrl(baseUrl) {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`;
}

function isAllowedLlmUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' || (url.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname));
  } catch {
    return false;
  }
}

function validateLlmProfile(profile) {
  const baseUrl = String(profile?.baseUrl || '').trim().replace(/\/+$/, '');
  const model = String(profile?.model || '').trim();
  if (!isAllowedLlmUrl(baseUrl) || !model) throw new Error('LLM_NOT_CONFIGURED');
  return {
    baseUrl,
    model,
    apiKey: String(profile?.apiKey || '').trim()
  };
}

async function translateWithLlm(text, sourceLang, targetLang) {
  const input = String(text || '').trim();
  if (!input) return '';
  const settings = await chrome.storage.local.get([LLM_PROFILE_KEY]);
  const profile = validateLlmProfile(settings[LLM_PROFILE_KEY]);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (profile.apiKey) headers.Authorization = `Bearer ${profile.apiKey}`;
    const response = await fetch(getLlmChatCompletionsUrl(profile.baseUrl), {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: profile.model,
        temperature: 0.15,
        messages: [
          {
            role: 'system',
            content: 'You are a translation engine. Translate only. Preserve paragraph breaks, line breaks, numbering, citation markers, URLs, and code. Do not add explanations or omit content.'
          },
          {
            role: 'user',
            content: `Source language: ${sourceLang || 'auto'}\nTarget language: ${targetLang || 'zh-Hans'}\n\nText:\n${input}`
          }
        ]
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
    const translation = payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text;
    if (typeof translation !== 'string' || !translation.trim()) throw new Error('LLM_EMPTY_RESPONSE');
    return translation.trim();
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('LLM_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function createContextMenus() {
  if (contextMenuBuildPromise) return contextMenuBuildPromise;

  const definitions = [
    {
      id: CONTEXT_MENU_ROOT_ID,
      title: localizedMessage('appName', 'Anwara Translator'),
      contexts: ['page', 'selection']
    },
    ...Object.entries(CONTEXT_ENGINE_MENU_IDS).map(([engineId, menuId]) => ({
      id: menuId,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: CONTEXT_ENGINE_LABELS[engineId],
      contexts: ['page', 'selection']
    })),
    createVocabularyContextMenuDefinition(),
    {
      id: CONTEXT_MENU_STRUCTURED_READER_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: localizedMessage('structuredReader', '结构化阅读'),
      contexts: ['page']
    },
    {
      id: CONTEXT_MENU_RESTORE_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: localizedMessage('restorePage', '恢复原状'),
      contexts: ['page', 'selection'],
      enabled: false
    }
  ];

  contextMenuBuildPromise = new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      const clearError = chrome.runtime.lastError;
      if (clearError) {
        console.warn('Failed to clear translator context menus:', clearError.message);
      }

      let index = 0;
      const createNext = () => {
        if (index >= definitions.length) {
          console.info('Anwara Translator context menus rebuilt');
          resolve();
          return;
        }

        const definition = definitions[index++];
        chrome.contextMenus.create(definition, () => {
          const createError = chrome.runtime.lastError;
          if (createError) {
            console.warn(`Failed to create context menu ${definition.id}:`, createError.message);
          }
          createNext();
        });
      };

      createNext();
    });
  }).finally(() => {
    contextMenuBuildPromise = null;
  });

  return contextMenuBuildPromise;
}

function setRestoreMenuEnabled(enabled) {
  chrome.contextMenus.update(CONTEXT_MENU_RESTORE_ID, { enabled: Boolean(enabled) }, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.warn('Failed to update restore context menu:', error.message);
    }
  });
}

function createVocabularyContextMenuDefinition() {
  return {
    id: CONTEXT_MENU_SAVE_VOCABULARY_ID,
    parentId: CONTEXT_MENU_ROOT_ID,
    title: localizedMessage('addToVocabulary', '添加到词汇'),
    contexts: ['selection']
  };
}

function setVocabularyContextMenuVisible(enabled) {
  const shouldShow = Boolean(enabled);
  vocabularyMenuMutationPromise = vocabularyMenuMutationPromise
    .catch(() => undefined)
    .then(() => new Promise((resolve) => {
      chrome.contextMenus.remove(CONTEXT_MENU_SAVE_VOCABULARY_ID, () => {
        // The item can already be absent after a full menu rebuild.
        void chrome.runtime.lastError;
        if (!shouldShow) {
          resolve();
          return;
        }
        chrome.contextMenus.create(createVocabularyContextMenuDefinition(), () => {
          const error = chrome.runtime.lastError;
          if (error) console.warn('Failed to create vocabulary context menu:', error.message);
          resolve();
        });
      });
    }));
  return vocabularyMenuMutationPromise;
}

async function syncVocabularyContextMenuVisibility() {
  try {
    const settings = await chrome.storage.sync.get([KEY.contextVocabulary]);
    setVocabularyContextMenuVisible(settings[KEY.contextVocabulary] !== false);
  } catch (error) {
    console.warn('Failed to sync vocabulary context-menu visibility:', error);
  }
}

async function setRestoreMenuForTab(tabId, enabled) {
  try {
    const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTabs[0]?.id !== tabId) return;
  } catch {
    return;
  }
  setRestoreMenuEnabled(enabled);
}

async function syncRestoreMenuForTab(tabId) {
  if (!tabId) return;

  try {
    const status = await chrome.tabs.sendMessage(tabId, { type: 'QUERY_STATUS' });
    await setRestoreMenuForTab(tabId, status?.enabled === true);
  } catch {
    await setRestoreMenuForTab(tabId, false);
  }
}

async function storeReaderDraft(record) {
  if (!record?.id || !chrome.storage.session) throw new Error('READER_SESSION_STORAGE_UNAVAILABLE');
  const result = await chrome.storage.session.get([READER_DRAFTS_KEY]);
  const drafts = result[READER_DRAFTS_KEY] && typeof result[READER_DRAFTS_KEY] === 'object'
    ? { ...result[READER_DRAFTS_KEY] }
    : {};
  drafts[record.id] = { ...record, readerDraftMode: 'transient-reader', createdAt: Date.now() };
  await chrome.storage.session.set({ [READER_DRAFTS_KEY]: drafts });
  return record.id;
}

async function removeReaderDraft(recordId) {
  if (!recordId || !chrome.storage.session) return;
  const result = await chrome.storage.session.get([READER_DRAFTS_KEY]);
  const drafts = result[READER_DRAFTS_KEY] && typeof result[READER_DRAFTS_KEY] === 'object'
    ? { ...result[READER_DRAFTS_KEY] }
    : {};
  if (!drafts[recordId]) return;
  delete drafts[recordId];
  await chrome.storage.session.set({ [READER_DRAFTS_KEY]: drafts });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  const recordId = readerDraftTabs.get(tabId);
  readerDraftTabs.delete(tabId);
  if (recordId) removeReaderDraft(recordId).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'OPEN_READER_TAB' && (message.recordId || message.record?.id)) {
    (async () => {
      const recordId = message.record?.id ? await storeReaderDraft(message.record) : message.recordId;
      const url = chrome.runtime.getURL(`reader.html?id=${encodeURIComponent(recordId)}`);
      const tabs = await chrome.tabs.query({});
      const existing = tabs.find((tab) => {
        try {
          const candidate = new URL(tab.url || '');
          return candidate.origin === new URL(url).origin
            && candidate.pathname.endsWith('/reader.html')
            && candidate.searchParams.get('id') === recordId;
        } catch {
          return false;
        }
      });
      if (existing?.id) {
        await chrome.tabs.update(existing.id, { active: true });
        if (existing.windowId) await chrome.windows.update(existing.windowId, { focused: true });
        sendResponse({ ok: true, reused: true, tabId: existing.id, recordId });
        return;
      }
      const tab = await chrome.tabs.create({ url });
      if (message.record?.id && tab?.id) readerDraftTabs.set(tab.id, recordId);
      sendResponse({ ok: true, reused: false, tabId: tab?.id || null, recordId });
    })().catch((error) => {
      if (message.record?.id) removeReaderDraft(message.record.id).catch(() => {});
      sendResponse({ ok: false, error: error?.message || 'READER_OPEN_FAILED' });
    });
    return true;
  }

  if (message?.type === 'CLOSE_READER_TAB' && sender.tab?.id) {
    const draftId = readerDraftTabs.get(sender.tab.id);
    readerDraftTabs.delete(sender.tab.id);
    if (draftId) removeReaderDraft(draftId).catch(() => {});
    chrome.tabs.remove(sender.tab.id, () => {
      const error = chrome.runtime.lastError;
      sendResponse(error ? { ok: false, error: error.message } : { ok: true });
    });
    return true;
  }

  if (message?.type === 'TRANSLATE_WITH_LLM') {
    translateWithProvider(message.text, message.sourceLang, message.targetLang, 'openai')
      .then((translation) => sendResponse({ ok: true, translation }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'LLM_TRANSLATION_FAILED' }));
    return true;
  }

  if (message?.type === 'TRANSLATE_WITH_PROVIDER') {
    translateWithProvider(message.text, message.sourceLang, message.targetLang, message.providerId, message.profileKey || message.profileId)
      .then((translation) => sendResponse({ ok: true, translation }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'PROVIDER_TRANSLATION_FAILED' }));
    return true;
  }

  if (message?.type === 'TEST_TRANSLATION_PROVIDER') {
    translateWithProvider('Hello, this is a provider connection test.', 'en', message.targetLang || 'zh-Hans', message.providerId, message.profileKey || message.profileId)
      .then((translation) => sendResponse({ ok: true, translation }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'PROVIDER_TEST_FAILED' }));
    return true;
  }

  if (message?.type !== 'PAGE_TRANSLATION_STATE' || !sender.tab?.id) return;
  setRestoreMenuForTab(sender.tab.id, message.enabled === true);
});

// Rebuild immediately after a service-worker or extension reload.
createContextMenus().then(async () => {
  try {
    const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTabs[0]?.id) {
      await ensureContentScript(activeTabs[0].id).catch(() => {});
      await syncRestoreMenuForTab(activeTabs[0].id);
    }
  } catch {}
});

async function ensureContentScript(tabId) {
  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tabId, { type: 'QUERY_STATUS' });
    if (status?.ok && status.version === CONTENT_SCRIPT_VERSION) return { ...status, ready: true };
  } catch {}
  await chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] });
  try {
    status = await chrome.tabs.sendMessage(tabId, { type: 'QUERY_STATUS' });
  } catch {}
  return { ...status, ready: status?.version === CONTENT_SCRIPT_VERSION, refreshRequired: status?.ok === true && status?.version !== CONTENT_SCRIPT_VERSION };
}

// 检查URL是否在白名单中
function isUrlInWhitelist(url, patterns) {
  if (!patterns || patterns.length === 0) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const fullPath = hostname + pathname;
    
    for (const pattern of patterns) {
      try {
        // 支持通配符匹配
        if (pattern.includes('*')) {
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          const regex = new RegExp('^' + regexPattern + '$');
          
          // 检查域名匹配
          if (regex.test(hostname)) {
            return true;
          }
          // 检查完整路径匹配
          if (regex.test(fullPath)) {
            return true;
          }
        } else {
          // 精确匹配：检查域名是否完全匹配或者完整路径匹配
          if (hostname === pattern || fullPath === pattern) {
            return true;
          }
        }
      } catch (e) {
        // 忽略无效的模式
        console.warn('无效的白名单模式:', pattern, e);
      }
    }
  } catch (e) {
    console.warn('URL解析失败:', url, e);
  }
  
  return false;
}

chrome.runtime.onInstalled.addListener(async () => {
  await createContextMenus();
  const s = await chrome.storage.sync.get([KEY.auto, KEY.target, KEY.whitelist, KEY.contextVocabulary]);
  if (typeof s[KEY.auto] === 'undefined') {
    await chrome.storage.sync.set({ [KEY.auto]: false });
  }
  if (typeof s[KEY.target] === 'undefined') {
    await chrome.storage.sync.set({ [KEY.target]: 'zh-Hans' });
  }
  if (typeof s[KEY.whitelist] === 'undefined') {
    await chrome.storage.sync.set({ [KEY.whitelist]: [] });
  }
  if (typeof s[KEY.contextVocabulary] === 'undefined') {
    await chrome.storage.sync.set({ [KEY.contextVocabulary]: true });
  }
  setVocabularyContextMenuVisible(s[KEY.contextVocabulary] !== false);
});

chrome.runtime.onStartup.addListener(async () => {
  await createContextMenus();
  await syncVocabularyContextMenuVisibility();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes[KEY.contextVocabulary]) return;
  setVocabularyContextMenuVisible(changes[KEY.contextVocabulary].newValue !== false);
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  syncRestoreMenuForTab(tabId);
});

function getContextEngineId(menuItemId) {
  return Object.entries(CONTEXT_ENGINE_MENU_IDS)
    .find(([, id]) => id === menuItemId)?.[0] || null;
}

function normalizeVocabularyValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getVocabularyDedupKey(entry) {
  return [entry?.term, entry?.sourceText, entry?.pageUrl || entry?.pageTitle]
    .map((value) => normalizeVocabularyValue(value).toLocaleLowerCase())
    .join('␟');
}

async function saveContextSelectionToVocabulary(info, tab) {
  const term = normalizeVocabularyValue(info.selectionText);
  if (!term) return { ok: false, reason: 'EMPTY_SELECTION' };

  const entry = {
    id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    term,
    sourceText: term,
    translatedText: '',
    pageTitle: String(tab?.title || '').trim(),
    pageUrl: /^https?:\/\//i.test(String(tab?.url || '')) ? String(tab.url).trim() : '',
    createdAt: Date.now(),
    status: 'pending'
  };
  const result = await chrome.storage.local.get([VOCABULARY_KEY]);
  const vocabulary = Array.isArray(result[VOCABULARY_KEY])
    ? result[VOCABULARY_KEY].filter((item) => item && typeof item === 'object' && item.id)
    : [];
  if (vocabulary.some((item) => getVocabularyDedupKey(item) === getVocabularyDedupKey(entry))) {
    return { ok: true, duplicate: true };
  }
  vocabulary.unshift(entry);
  await chrome.storage.local.set({ [VOCABULARY_KEY]: vocabulary.slice(0, VOCABULARY_LIMIT) });
  return { ok: true, duplicate: false };
}

function flashVocabularyBadge(tabId, duplicate) {
  if (!Number.isInteger(tabId)) return;
  const text = duplicate ? '·' : '✓';
  const color = duplicate ? '#64748b' : '#0f766e';
  chrome.action.setBadgeBackgroundColor({ tabId, color }, () => {});
  chrome.action.setBadgeText({ tabId, text }, () => {});
  setTimeout(() => chrome.action.setBadgeText({ tabId, text: '' }, () => {}), 1400);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const engineId = getContextEngineId(info.menuItemId);
  const isStructuredReader = info.menuItemId === CONTEXT_MENU_STRUCTURED_READER_ID;
  const isSaveVocabulary = info.menuItemId === CONTEXT_MENU_SAVE_VOCABULARY_ID;
  const isRestore = info.menuItemId === CONTEXT_MENU_RESTORE_ID;
  if ((!engineId && !isStructuredReader && !isSaveVocabulary && !isRestore) || !tab?.id) return;

  if (isSaveVocabulary) {
    try {
      const result = await saveContextSelectionToVocabulary(info, tab);
      if (!result.ok) console.warn('Vocabulary context-menu action was not accepted:', result.reason);
      else flashVocabularyBadge(tab.id, result.duplicate);
    } catch (error) {
      console.warn('Vocabulary context-menu action failed:', error);
    }
    return;
  }

  const url = tab.url || '';
  if (!/^https?:|^file:|^chrome-extension:/.test(url)) return;

  try {
    const contentStatus = await ensureContentScript(tab.id);
    if (!contentStatus?.ready) {
      console.warn('Current page needs a refresh before using the updated selection translator.');
      return;
    }
    const settings = await chrome.storage.sync.get([KEY.target]);
    const targetLang = settings[KEY.target] || 'zh-Hans';
    const hasSelection = Boolean(info.selectionText?.trim());
    const response = await chrome.tabs.sendMessage(tab.id,
      isRestore
        ? { type: 'STOP_PAGE_TRANSLATION' }
        : isStructuredReader
          ? { type: 'OPEN_STRUCTURED_PAGE_READER', targetLang }
          : {
              type: hasSelection ? 'TRANSLATE_SELECTION' : 'START_PAGE_TRANSLATION',
              targetLang,
              engineId,
              text: info.selectionText || ''
            });

    if (isRestore) {
      await setRestoreMenuForTab(tab.id, false);
    } else if (!hasSelection) {
      await setRestoreMenuForTab(tab.id, response?.enabled === true);
    }
    if (!response?.ok) {
      console.warn('Context-menu action was not accepted:', response?.error || 'unknown error');
    }
  } catch (e) {
    console.warn('Context-menu action failed:', e);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (/^https?:|^file:/.test(tab?.url || '')) await ensureContentScript(tabId);
  } catch {}
});

// When a tab finishes loading and auto-translate is on, inject and start translation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  try {
    const url = tab?.url || '';
    if (!/^https?:|^file:|^chrome-extension:/.test(url)) {
      await setRestoreMenuForTab(tabId, false);
      return;
    }

    await syncRestoreMenuForTab(tabId);
    const s = await chrome.storage.sync.get([KEY.auto, KEY.target, KEY.whitelist]);
    if (!s[KEY.auto]) return;
    
    // 检查当前网址是否在白名单中
    const whitelistPatterns = s[KEY.whitelist] || [];
    if (isUrlInWhitelist(url, whitelistPatterns)) {
      console.log('当前网址在白名单中，跳过自动翻译:', url);
      return;
    }
    
    const targetLang = s[KEY.target] || 'zh-Hans';
    await chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] });
    const response = await chrome.tabs.sendMessage(tabId, { type: 'START_PAGE_TRANSLATION', targetLang: targetLang });
    await setRestoreMenuForTab(tabId, response?.enabled === true);
  } catch (e) {
    // ignore
  }
});


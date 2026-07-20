# Anwara Translator

<p align="center">
  <img src="icon.png" alt="Anwara Translator icon" width="128" />
</p>

<p align="center">
  <a href="https://github.com/salimongo/Anwara-Translator">Repository</a> |
  <a href="https://github.com/salimongo/Anwara-Translator/issues">Issues</a> |
  <a href="https://github.com/salimongo/Anwara-Translator/releases">Releases</a> |
  <a href="README.md">中文说明</a>
</p>

Anwara Translator is a Chrome and Edge Manifest V3 extension for translating
text, selected passages, and web pages. It combines the browser's built-in
Translator and Language Detector APIs with optional online translation services
and configurable large-language-model providers.

The extension is designed for practical reading: translated pages can retain
paragraphs, headings, lists, tables, links, and citation structure in a separate
bilingual reading view. Translation history and a reading area are stored locally
and can be managed independently.

## Highlights

- Automatic source-language detection with the browser Language Detector API.
- Local browser translation through the built-in Translator API.
- Optional online providers such as Google Cloud, Microsoft Translator, DeepL,
  DeepLX, NiuTrans, Youdao, and Tencent Cloud.
- Optional LLM providers through OpenAI-compatible, Gemini, and Claude-style
  interfaces.
- Manual text translation with source/target language swapping.
- Full-page translation with restore support.
- Selection translation with a small edge indicator, draggable panels, panel
  resizing, pinning, multiple open panels, copy support, and remembered layout.
- Structured reading mode that preserves document blocks and presents bilingual,
  source-only, or translation-only views.
- Reading themes, font selection, font-size controls, table-of-contents support,
  citation navigation, and retranslation with another engine.
- Local translation history and reading-area storage with search, engine/site
  filtering, display-only duplicate merging, selection, date-range, full-clear,
  and an 8-second delete undo.
- Reuse one reader tab per record, plus in-page search, reading progress, and
  local resume position.
- Clearly disable online/LLM retranslation choices until the selected provider is
  configured, rather than sending a request that is known to fail.
- Floating page-translation button and browser context-menu shortcuts.
- Per-site default engine settings and an auto-translation whitelist.
- Chinese and English extension UI, selected automatically from the browser
  locale. Additional locales are documented in [I18N.md](I18N.md).

## Requirements

- Chrome or Edge 138 or later.
- Translator and Language Detector APIs must be available in a secure browser
  context.
- Local translation may download a browser model on first use.
- Online and LLM providers require the credentials and endpoint settings defined
  by those providers. DeepLX and local OpenAI-compatible endpoints may run on
  the local machine.

## Installation

### From a Release

Download a package from [GitHub Releases](https://github.com/salimongo/Anwara-Translator/releases/),
then load it according to the release instructions.

### From Source

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the project directory containing `manifest.json`.
5. Open the extension popup from the browser toolbar.

## Translation Engines

Anwara Translator keeps local, online, and LLM translation as separate choices.
The default engine is selected in Settings and can be overridden for an
individual site. Context-menu entries can invoke a specific engine without
opening the console. Selection translation and the floating button use the
current default unless another route is chosen explicitly.

Provider API keys, tokens, endpoints, models, prompts, and account credentials
are stored in the browser extension's local storage. They are not included in
the source tree or release package.

## Structured Reading

Structured reading extracts readable page blocks and opens them in a dedicated
reader page instead of replacing the current page. Depending on the source
document, the reader can preserve:

- headings and paragraphs;
- lists and tables;
- line breaks and block boundaries;
- page links and citation markers;
- bilingual source/translation alignment where reliable.

The reader supports retranslation with local, online, or LLM engines. Translation
variants are cached locally so switching back to a previously used engine does
not require an unnecessary repeat request.

## Privacy

The project does not collect analytics or send data to a project-owned service.
Local translation stays inside the browser. If an online or LLM provider is
configured, the selected text or page content is sent directly to that provider
according to its service policy.

Review the source code and provider configuration before using the extension with
sensitive material.

## Internationalization

The extension uses Chrome's native Manifest V3 localization system:

- `_locales/zh_CN/messages.json`
- `_locales/en/messages.json`

The UI follows the browser locale. Additional language work is intentionally
tracked separately in [I18N.md](I18N.md) so new locales can be added without
mixing translation content with application behavior.

## Screenshots

![Translator console](image/translator.png)

![Selection translation panel](image/select.png)

## License

This project is licensed under the Apache License 2.0. See [LICENSE.txt](LICENSE.txt)
for the full license text.

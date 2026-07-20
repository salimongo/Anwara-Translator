# Handoff — Translator Reliability and Reader UX

**Updated:** 2026-07-20

## Frozen scope

This pass improves recoverability, reading usability, and local provider-credential persistence. It now also supports multiple independent profiles per provider without changing provider request protocols.

## Multi-profile implementation — 2026-07-20

- `translatorProviderProfiles` and `translatorProviderCredentials` use a provider-profile storage key such as `provider::profile`. `translatorProviderActiveProfileIds` records the one profile actively used by each provider.
- The popup separates **editing** an entry from **using** an entry. New, duplicate, delete, save, and save-and-test operate on the edited profile; the radio control explicitly changes the active profile after readiness validation.
- `background.js`, `contentScript.js`, and `reader.js` pass the full `providerProfileKey`. Page/selection caches and reader translation variants include that key, preventing cache reuse when a different Key or endpoint is selected for the same provider.
- Legacy single-profile records migrate to `<provider>::default`; legacy message field `profileId` remains accepted by the background worker for backwards compatibility.
- `CONTENT_SCRIPT_VERSION` is now `1.6.15`. The selection panel footer aligns service/profile details on the left with a safe cache-status label on the right, and visually separates its action area. Its retranslation control opens local / online / LLM choices upward, uses the current target-language setting, and directly opens the new result instead of returning to the red indicator. Reader-page retranslation also reads the current target-language setting instead of the old record target. Reloading the extension still requires refreshing already-open test pages before selection translation is considered current.
- `translatorSelectionPanelDefaultSize` stores the global default width and height for new selection panels. `translatorSelectionPanelRememberSiteSize` controls whether per-origin width/height is read or written; positions remain remembered. `translatorSelectionPanelUseGlobalDefaultSize` temporarily overrides per-origin sizes without deleting them. The popup can open a disposable in-page size tuner that never saves its drag result unless the user explicitly chooses **保存为全局大小**. The retranslation menu now starts explicitly hidden rather than relying on the `hidden` attribute against an inline flex display.
- The next single live acceptance is: reload the unpacked extension, refresh a normal HTTP(S) page, open the size tuner, resize then close without saving, and confirm a normal selection panel does not inherit that test size. Then save a tuner size, enable global override, and confirm it applies on a second origin. A saved layout for the current origin remains higher priority; the popup validates 240-1600 px wide and 180-1200 px high, restores `360 × 220` by removing the global override, and live content scripts update their fallback when the setting changes.

## Static evidence — multi-profile pass

Run from `E:\skliis\tools\translator-fork` on 2026-07-20:

```powershell
node --check .\popup.js
node --check .\background.js
node --check .\reader.js
node --check .\contentScript.js
Get-Content .\manifest.json -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
git -c safe.directory='E:/skliis/tools/translator-fork' diff --check
```

Passed: syntax, manifest JSON, and diff whitespace checks.

Synthetic checks passed without real credentials:

```text
PASS MULTI_PROFILE_MIGRATION_SYNTHETIC
PASS PROFILE_KEY_CACHE_BOUNDARY
PASS PROFILE_LIST_UI_STATIC
PASS NO_CREDENTIAL_SHAPES_IN_CANDIDATE_FILES
```

## Required live acceptance — multi-profile pass

1. Reload the unpacked extension, refresh a normal web page, open **设置 → 翻译服务配置**, and create two profiles for one configured provider.
2. Edit/save the non-active profile and confirm the radio selection does not change. Then select it with the radio and confirm it remains selected after closing and reopening the popup.
3. Run one selection translation or structured-reader translation with profile A, switch to profile B for the same provider, and rerun the same text. Confirm the second run is not labeled or returned from profile A's cache. Switch back to A and confirm the A cache is reusable.
4. Run **保存并测试** on a non-active profile. It must save/test that profile without silently changing the active profile.
5. Do not paste a Key, token, or query-string credential into screenshots, source, Git, or issue reports. URL query credentials are not yet redacted or split from the endpoint field.

## Completed implementation

- History / reading-area search, filtering, and display-only duplicate merging.
- Eight-second undo for single, batch, and date-range deletions; variant cleanup is deferred until the undo window ends.
- Single-record deletion validates the active archive before creating an undo snapshot and rolls the snapshot back on persistence failure.
- Reuse an existing reader tab for the same record based on the live browser tab list, so service-worker suspension does not create duplicate reader tabs.
- Reader in-page search, progress indicator, and a bounded local resume-position store.
- Reader search now stays in the sticky top bar; the paper controls are compacted, and a disabled-at-top back-to-top control becomes available once the reader scrolls down.
- Reader pages now expose **加入阅读区 / 移出阅读区**. This is the explicit save path for a direct structured-reader session, which intentionally does not auto-add itself to the reading area.
- Repaired the Chinese and English locale entries that briefly rendered new archive/search labels as literal question marks.
- Reader retranslation choices visibly disable when the selected online / LLM provider is not configured.`r`n- Provider service settings and credentials now use separate local extension-storage records. Legacy mixed profiles migrate in place; **保存并测试** persists first and never rolls the entered configuration back after testing.
- Automatic / selection translation toggles restore their previous UI state if injection or storage fails.
- Selection-panel reading-area save failure stays visible and provides retry feedback.
- Archive undo is now a persistent header action during its eight-second window, not a button hidden inside the collapsed management panel.
- Clear-all now arms the same eight-second archive undo and remains in the active archive view; it no longer auto-jumps to the translation home page.
- Content-script revisions are now checked by the popup and service worker. A page that still has an old injected selection handler gets a visible refresh boundary instead of silently using stale history behavior.
- If a fresh selection translation renders but its local-history write fails, the panel exposes **重试保存** rather than silently dropping the record.`r`n- The initial selection / structured translation is seeded as a reader variant using its engine, provider, and language pair, so a later switch away and back can reuse that first result. Content-script revision 1.6.3 forces an old page to refresh before its selection flow can be treated as current.

## Static evidence

Run from `E:\skliis\tools\translator-fork` on 2026-07-19:

```powershell
node --check .\contentScript.js
node --check .\popup.js
node --check .\background.js
node --check .\reader.js
node --check .\i18n.js
Get-Content .\manifest.json -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
Get-Content .\_locales\zh_CN\messages.json -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
Get-Content .\_locales\en\messages.json -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
git -c safe.directory='E:/skliis/tools/translator-fork' -C . diff --check
```

All passed during this pass.

## Live evidence — Vivaldi, 2026-07-20

- Reloaded the unpacked **Anwara Translator v1.6.0** from `vivaldi://extensions/`; Vivaldi exposed the extension as enabled and displayed the toast **已重新加载**.
- Opened the extension popup and its **历史 / 阅读区** tab. The repaired archive/search labels rendered as normal Chinese rather than literal question marks. The active profile contains **0** history records.
- No existing reader record was available for sticky-search, back-to-top, reader-tab reuse, or deletion/undo checks during the first pass.
- **User-confirmed later on 2026-07-20:** deletion exposes the eight-second undo, the undo works, and clear-all remains in the archive rather than jumping to the translation home page.
- **User-confirmed later on 2026-07-20:** after the stale-page boundary fix, selection translation records history correctly once the page is refreshed.
- **User-confirmed later on 2026-07-20:** a direct structured-reader item can be explicitly added to the reading area, and closing/reopening that reader restores the last reading position.

## Unverified — requires Chrome / Edge live check

1. **Passed by user on 2026-07-20:** delete a history record and choose **Undo** within 8 seconds.
2. Try a provider-backed retranslation before and after configuring a valid profile; verify disabled buttons and the actual retranslation request.
3. **Passed by user on 2026-07-20:** opening the same reader record twice reuses and focuses the existing reader tab.
4. **Passed by user on 2026-07-20:** direct structured-reader items can be added to the reading area and recover their last reading position after close/reopen. Sticky search and the up-arrow remain separate visual checks.
5. Toggle automatic translation and selection translation on an injection-restricted page; verify the checkbox returns to its previous state and the failure text is shown.
6. **Passed by user on 2026-07-20:** clear-all stays on the archive view and exposes an eight-second undo. A full browser-restart regression remains optional.
7. **Passed by user on 2026-07-20:** after the stale-page boundary fix, refresh the page and confirm a selection translation appears in history. The explicit storage-failure retry path remains unverified.

## Tomorrow queue — 2026-07-20

### P0 — live acceptance first

Reload the unpacked extension in Edge or Chrome and make one short evidence pass before adding another feature:

1. **Passed by user on 2026-07-20:** on a long structured-reader record, the page-search field remains sticky while scrolling and the up-arrow returns smoothly to the top.
2. **Passed in Vivaldi on 2026-07-20:** Opened **历史翻译与阅读区**; the repaired labels rendered normally rather than as literal question marks.
3. Run the existing deletion safety path once: delete one item, undo it inside eight seconds, then use **清空全部** and confirm the popup remains usable without a browser restart.
4. **Passed by user on 2026-07-20:** reopening the same reader record focuses the existing reader tab.

Capture only a screenshot and exact repro steps for a real failure; do not start a broad UI rewrite from a vague impression.

### P1 — reader polish only after P0

If P0 passes but the reader still feels heavy, make a small visual pass limited to reader.html and reader.css:

- balance the sticky-header search width against the action buttons at wide and narrow widths;
- tune title/paper density only from a live screenshot;
- keep mode, theme, font, and size controls compact; do not move translation/provider logic.

### P2 — archive console cleanup

Passed by user on 2026-07-20: the archive console layout, line-clamped preview cards, grouped selection actions, and 全选 / 取消全选 toggle all behave as intended. Delete/undo, filters, and storage paths remain unchanged.

### Deferred / do not silently reopen

- Citation-directory jump/back-stack behavior remains imperfect and is intentionally deferred.
- Structural translation fidelity, provider expansion, vocabulary management, and screenshot translation are separate feature lines, not part of this UI regression pass.
- Do not stage, commit, or push until the P0 browser checks pass and a privacy review is explicitly requested.

## Next single move

Reload the unpacked extension and open **设置 → 翻译服务配置**. Confirm an existing provider shows the saved fields, edit one non-secret field and see **有未保存的更改**, then choose **保存并测试**. Close and reopen the popup to confirm the profile remains available. Do not paste credentials into issue reports, source files, or Git.

## Candidate commit allowlist

```text
_locales/en/messages.json
_locales/zh_CN/messages.json
background.js
contentScript.js
i18n.js
popup.html
popup.js
reader.css
reader.html
reader.js
README.md
README.en.md
CHANGELOG.md
HANDOFF.md
```

Do **not** stage `E:\skliis\tmp\patch_translator_stage2*.js`, screenshots, release artifacts, browser profiles, or any provider credential data.
 System.Text.UTF8Encoding
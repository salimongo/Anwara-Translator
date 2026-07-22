# Changelog

All notable user-visible changes are recorded here. Dates use local workspace time.

## Unreleased — 2026-07-22

### Added

- The structured reader can save a selected word or sentence into a local vocabulary list with its nearby source/translation context, page title/URL, and capture time. The archive now exposes that vocabulary for search, individual deletion, clear-all, and the same eight-second undo path used by history and reading-area records.
- Vocabulary can now be exported as a local JSON backup and imported from that same backup format. Import previews new, duplicate, and invalid counts before confirmation, then merges only new valid entries without overwriting existing vocabulary or exporting provider configuration/credentials.
- A selected web-page word or phrase can now be saved directly through **Anwara Translator → Add to vocabulary** in the browser context menu. The shortcut records the selected text with its current page title and HTTP(S) URL, rejects duplicates, and gives a brief toolbar-badge acknowledgment.
- A vocabulary entry saved from an imported Markdown reader now keeps only that reader record's ID. Once the document is deliberately added to Reading, the vocabulary card can reopen it through **Open reading** without duplicating its content into vocabulary storage or backups.
- The manual translation source area can import UTF-8 `.txt` and `.md` files into the existing text input. Imported content keeps its line breaks and stays under the user's current source-language, target-language, and engine choices until they explicitly start translation.
- Imported Markdown can now open as a transient structured reader. The parser preserves headings, paragraphs, lists, quotes, fenced code blocks, and simple pipe tables, then uses the selected translation engine through the reader's existing retranslation pipeline. External HTTP(S) and mailto links are kept for the reader's existing safe link-choice flow; same-document heading links such as `[Jump](#section)` now scroll directly to their target heading.

### Changed

- Chinese-target page, selection, and structured-reader translations now apply the same conservative punctuation normalization as manual translation before results enter the translation cache.
- Imported Markdown readers now use their first level-one heading as the document title, falling back to the file name when no such heading exists.
- Vocabulary tools in the toolbar popup now use one compact search-and-actions row followed by the status filter, rather than retaining empty history-management grid rows. Their filter and backup/clear buttons now share explicit line-height and flex alignment in both popup and full-console modes.
- The context-menu vocabulary shortcut is independently controlled by **Settings → Right-click add to vocabulary**. It defaults on, and changing the toggle hides or shows only that menu item immediately.

### Fixed

- Webpage structured reading retains same-page reference targets such as `[1]` instead of silently dropping them during link extraction, so the reader can use its existing citation jump flow.
- In dual-language reading mode, code blocks whose translated text is identical to their source now render once instead of as duplicate blocks. Source-only and translated-only modes remain unchanged.
- Removing an imported Markdown document from the reading area, whether from the reader or the console, now restores its active reader as a session draft before deleting the reading-area copy. Refreshing the open reader no longer loses content or silently creates a history record.
- Vocabulary cards now honor their hidden translated-context state. A source-only entry saved from the webpage context menu no longer renders the misleading `No saved translation context` placeholder line.
- In the full console, expanding one vocabulary card's source context no longer stretches every card in its grid row to the same height.
- The toolbar action popup now closes on ordinary outside focus loss without closing when a local `.txt`, `.md`, or vocabulary-backup file picker is open; selected files continue into their original import flow.

### Safety

- Text import rejects unsupported file types, files over 2 MB, documents over 250,000 characters, empty files, and read failures. Imported text is not auto-translated or auto-saved.

## Unreleased — 2026-07-20

### Added

- A full-console route: the popup opens the same control surface as a top application bar, left-navigation, right-workspace extension tab while preserving the initiating webpage as its operational target. Repeated opens focus the existing full-console tab instead of creating duplicates.
- A global default size for selection-translation panels, a disposable in-page size-tuning panel, and separate controls for remembering each site's size versus forcing the global size on every website.
- Each online or LLM provider now owns an independent configuration-profile list. Profiles can be created, copied, edited, deleted, and explicitly selected as the active profile for that provider.
- The service-profile list uses a radio selection for the profile that actual translation requests use, separate from the profile currently being edited.

### Changed

- Selection-panel sizing now uses the in-page tuner as the primary path: the old compact, standard, and spacious presets were removed. Enabling the global-size override disables the site-size-memory switch without changing its saved value; the disposable tuner exposes only resize, save-as-global-size, and close controls. Reopening that tuner preserves its in-progress geometry; its size-preview surface now fills the entire body while the save/close footer stays pinned to the bottom.
- Provider profile configuration and secrets remain split into separate extension-local storage records for every profile, rather than only once per provider.
- Provider-backed page translation, selection history, structured-reader records, reader retranslation variants, and translation cache keys now include the active provider-profile key. Switching to another profile for the same provider no longer reuses the prior profile's cached result.
- Content-script revision 1.6.15 asks already-open pages to refresh before using profile-aware selection logic and fixes the retranslation menu so it starts closed and explicitly toggles its display state. The selection panel provides a popup menu for local, online, or LLM retranslation; retranslation reads the current target-language setting instead of reusing the old result's target language, and its result opens directly rather than collapsing to the red indicator. Cache evidence remains in an aligned panel footer with a separated action area.

### Compatibility

- Existing single-provider settings migrate to that provider's `default` profile. Older cached variants without a profile key may translate once again after this upgrade; no credential is written to project files.

## Unreleased — 2026-07-19

### Added

- History and reading-area search, engine/site filters, and display-only duplicate merging.
- Eight-second undo after single, batch, or date-range archive deletions.
- Reader-tab reuse for the same record.
- In-page reader search, progress display, and local resume position, with an immediate final save on close, page hide, or tab switch.
- The archive console now separates its title/actions, view tabs, search/filter controls, and destructive bulk-cleanup controls so routine browsing is less crowded.
- Disabled-state guidance for online and LLM retranslation choices that are not configured.
- Persistent reader-page search in the sticky top bar and a back-to-top action for long documents.
- A reader-page add/remove reading-area action, including direct structured-reader sessions that intentionally did not auto-save into the reading area.

### Changed

- Archive deletion now validates the target before arming undo and restores the snapshot if persistence fails.
- Selection-panel failures preserve a visible retry path; reading-area save failures remain visible instead of being overwritten by success UI.
- Automatic and selection-translation toggles roll back their visual state when injection or storage writes fail.
- Archive preview cards now use line-clamped text instead of nested scrollbars; selection actions are grouped with 全选 rather than separated from it.
- The archive selection control now toggles between 全选 and 取消全选 and follows individual checkbox changes.
- The first selection or structured translation is now seeded as a reader translation variant, so returning to the same engine/provider/language pair can reuse it without a second request.
- Content-script revision 1.6.3 now forces pre-cache pages to refresh instead of silently keeping the old selection-history behavior.
- Provider API keys and service secrets now migrate into dedicated local credential storage; Save and Test preserves the entered configuration instead of reverting it after the connection check.

### Fixed

- Avoided relying only on service-worker memory when deciding whether an existing reader tab should be reused.
- Kept translation variants until an archive-delete undo window expires.
- Kept Chinese and English locale additions compact instead of reformatting whole locale files.
- Repaired the newly added Chinese archive/search labels that had been stored as literal question marks.
- Kept the eight-second archive undo action visible in the archive header, even while management controls are collapsed.
- Made clear-all undoable for eight seconds and kept the user in the archive view instead of jumping back to the translation home page.
- Detect stale content scripts after an extension reload instead of silently letting old selection logic keep running.
- Kept a successful selection translation visible when local history persistence fails, with an in-panel retry action rather than silently losing the record.

## Verification

Static verification for this unreleased set is recorded in [HANDOFF.md](HANDOFF.md). Browser interaction remains a manual validation item.

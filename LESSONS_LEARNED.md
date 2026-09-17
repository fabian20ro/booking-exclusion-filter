# Lessons Learned

> Maintained by AI agents. Contains validated, reusable insights.
> **Read at the start of every task. Update at the end of every iteration.**

## How to Use This File

### Reading (Start of Every Task)
Read this before writing any code to avoid repeating known mistakes.

### Writing (End of Every Iteration)
If a new reusable insight was gained, add it to the appropriate category.

### Promotion from Iteration Log
Patterns appearing 2+ times in `ITERATION_LOG.md` should be promoted here.

### Pruning
Obsolete lessons → Archive section at bottom (with date and reason). Never delete.

---

## Booking.com DOM Structure

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Browser Compatibility

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Bookmarklet Constraints

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Extension Behavior

**[2026-09-17] Count the named population** — `savedCount` is the whole saved union,
not visible hotels. Test saved/visible counts that differ, duplicates and zero
results. A happy-path test with equal counts cannot validate this UI contract.

<!-- Format: **[YYYY-MM-DD] Brief title — Explanation -->

**[2026-05-15] Bookmarklet badge cursor parity** — If the saved-count badge is clickable in the extension, keep the bookmarklet's inline CSS showing a pointer cursor too; otherwise the mobile surface hides the same affordance.

**[2026-05-12] README action inventory** — Keep the extension quickstart aligned with the actual toolbar buttons; if the UI gains a button like "Copy non-excluded hotels", the README should name it explicitly.
**[2026-05-12] Mobile/desktop UI parity** — When content.js and bookmarklet.js share an action, mirror the exact user-visible button labels and success messages so the desktop extension and bookmarklet stay consistent.
**[2026-05-13] Mobile install labels** — The mobile install page should use the exact toolbar action labels, not paraphrases, so the preview matches the live bookmarklet UI.
**[2026-05-13] External names as text nodes** — Hotel names come from Booking.com and should be rendered with `textContent` in saved-name lists; avoid `innerHTML` so the hover list stays safe and markup-neutral.
**[2026-05-14] Saved-count live region** — The saved-count/status badge in both surfaces should expose `role=status` with polite, atomic live updates so screen readers hear add/clear count changes.
**[2026-05-14] Saved-count badge parity** — When the saved-count badge already exposes useful state, keep it clickable on every surface and document the interaction so users can reach the saved hotel list without hunting for the hover trigger.
**[2026-05-14] Clickable badge keyboard access** — If a status badge opens a panel or list, make it keyboard-focusable and wire Enter/Space to the same toggle so mouse and keyboard users get the same affordance.
**[2026-05-15] Hover-list refresh after mutations** — When the saved-list panel is open, actions that add or clear entries should rerender the list immediately; otherwise the count can update while the visible panel still shows stale names.
**[2026-05-15] Hover-list visibility state** — If the saved-list panel can be opened from both hover/focus and click, keep the visibility state in one place or resync it on every hide path; stale booleans make the toggle drift from the actual DOM.

## Deployment

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

**[2026-05-16] Mobile install page needs HTTP hosting** — The bookmarklet install page fetches `bookmarklet.js` next to the HTML file, so a local copy needs to be served over HTTP rather than opened as a raw file.

## Code Patterns & Pitfalls

**[2026-09-07] Test shipping code, not copied helpers** — `node tests/core_logic.test.js` executes both complete scripts using the dependency-free `tests/browser_fixture.js` VM harness. Assert through the real `window.__bookingFilter` core or mounted button callbacks; never paste production functions into tests or embed eval-based pseudo-tests in browser assets. Mutation controls must fail when the source normalizer is broken in memory. Bookmarklet tests also disable ES2015 collection APIs to protect the ES5 runtime contract.

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

**[2026-05-11] Explicit no-op feedback** — For idempotent save actions, a success message like "Saved 0 items" reads like a bug; show a dedicated no-op message instead.

---

## Archive

<!-- Format: **[YYYY-MM-DD] Archived [YYYY-MM-DD]** Title — Reason for archival -->

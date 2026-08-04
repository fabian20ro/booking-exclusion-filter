# Iteration Log

> Append-only journal of AI agent work sessions.
> **Add an entry at the end of every iteration.**
> Same issue 2+ times? Promote to `LESSONS_LEARNED.md`.

## Entry Format

---

### [YYYY-MM-DD] Brief Description

**Context:** What was the goal
**What happened:** Key actions, decisions
**Outcome:** Success / partial / failure
**Insight:** (optional) What would you tell the next agent?
**Promoted to Lessons Learned:** Yes / No

---

### [2026-05-15] Bookmarklet badge cursor parity

**Context:** Keep the mobile bookmarklet's saved-count badge visually consistent with the extension's clickable badge.
**What happened:** Added `cursor:pointer` to the bookmarklet inline CSS for `#hotel-list-status` so the saved-count badge clearly reads as interactive on phone/tablet.
**Outcome:** Success
**Insight:** If a badge is clickable everywhere, its hover/cursor affordance should match on every surface that renders it.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-15] Hover-list refresh after saved-list mutations

**Context:** Keep the saved hotel list panel aligned with saved-list changes while it is open.
**What happened:** Updated content.js and bookmarklet.js so Add visible hotels and Clear hotel filter list rerender the hover list when it is visible, preventing stale names after mutations.
**Outcome:** Success
**Insight:** If a panel mirrors mutable state, refresh the open panel on the same mutation path instead of waiting for the user to close and reopen it.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-15] Hover-list visibility state sync

**Context:** Keep the saved hotel list toggle aligned across click, hover, and keyboard access.
**What happened:** Reworked the saved-list toggle in content.js and bookmarklet.js to derive visibility from the DOM state, added aria-expanded / aria-hidden updates, and removed the stale bookmarklet boolean state.
**Outcome:** Success
**Insight:** When the same panel is controlled by multiple interactions, a separate visibility flag can drift unless every hide path updates it.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-13] README action label parity

**Context:** Keep the README quickstart aligned with the live toolbar action labels.
**What happened:** Updated the README step from "Exclude added hotels" to "Toggle dimming" so the docs match the actual button name.
**Outcome:** Success
**Insight:** User-facing docs should mirror the exact action label, not a paraphrase.
**Promoted to Lessons Learned:** No

---
### [2026-05-14] README action label sync

**Context:** Keep the README quickstart aligned with the exact toolbar labels shown in the UI.
**What happened:** Updated the README quickstart to use the literal action names: Add visible hotels, Toggle dimming, Copy non-excluded hotels, and Clear hotel filter list.
**Outcome:** Success
**Insight:** Quickstart copy should mirror the exact UI labels, not leftover shorthand.
**Promoted to Lessons Learned:** No

---
### [2026-05-14] Saved-count badge parity

**Context:** Make the desktop extension easier to use without relying only on the hover trigger.
**What happened:** Added click-to-toggle behavior for the saved-count badge in content.js, matched the affordance in the desktop styling, and documented the interaction in the README for both extension and mobile use.
**Outcome:** Success
**Insight:** When a count badge already exposes useful state, making it interactive on every surface reduces hunting for the saved list.
**Promoted to Lessons Learned:** Yes

---
### [2026-05-14] Keyboard access for saved-count badge

**Context:** Keep the saved-count badge interaction usable for keyboard users, not just pointer users.
**What happened:** Added tabindex + Enter/Space handling to the saved-count badge in content.js and bookmarklet.js, and added matching focus-visible styling in style.css and the bookmarklet inline CSS.
**Outcome:** Success
**Insight:** If a live status badge opens the saved list, it should act like a reachable control too.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-16] Mobile preview badge wording sync

**Context:** Keep the mobile install page preview aligned with the saved-count badge affordance already documented in the README.
**What happened:** Updated the mobile preview copy so it now says "Tap the saved-count badge to see saved hotel names." instead of the shorter "Tap the badge" wording.
**Outcome:** Success
**Insight:** When a user-facing preview mentions a clickable badge, name the exact badge affordance so the install page matches the documented quickstart.
**Promoted to Lessons Learned:** No

---
### [2026-05-16] Mobile install page HTTP hosting note

**Context:** Reduce mobile install friction when users open the bookmarklet page from a local copy.
**What happened:** Updated README.md to note that a local copy of the mobile install page must be served over HTTP because it loads `bookmarklet.js` beside the HTML file.
**Outcome:** Success
**Insight:** If a page fetches a sibling asset, the docs should name the hosting requirement before users hit the failure mode.
**Promoted to Lessons Learned:** Yes

---
### [2026-05-16] Mobile install page HTTP hosting reminder

**Context:** Reduce confusion when users open the bookmarklet install page from a local file.
**What happened:** Added an on-page note under the copy button warning that local copies must be served over HTTP so `bookmarklet.js` can load beside the HTML file.
**Outcome:** Success
**Insight:** If the install page depends on a sibling asset, the warning belongs in the page copy, not only in README.md.
**Promoted to Lessons Learned:** No

---
### [2026-05-17] Bookmarklet copy-all parity

**Context:** Keep the mobile bookmarklet action set aligned with the extension toolbar.
**What happened:** Added the bookmarklet's missing Copy all saved action, shared the bookmarklet copy-list helper between saved and non-excluded copy paths, and updated mobile docs/preview copy to show the extra action.
**Outcome:** Success
**Insight:** When the extension gains an action, verify the bookmarklet button array and mobile install preview, not just the README wording.
**Promoted to Lessons Learned:** No

---
<!-- New entries above this line, most recent first -->
---
### [2026-05-14] Saved-count live region sync

**Context:** Improve accessibility for the saved-count badge in both the extension panel and bookmarklet toolbar.
**What happened:** Added `role=status`, `aria-live=polite`, and `aria-atomic=true` to the shared `hotel-list-status` element in content.js and bookmarklet.js so count changes can be announced.
**Outcome:** Success
**Insight:** Count badges that change after actions should be live regions on both surfaces, not just visually updated text.
**Promoted to Lessons Learned:** Yes

---
### [2026-05-13] Safe saved-name rendering

**Context:** Reduce the risk of HTML injection in the saved hotel-name hover list.
**What happened:** Updated content.js and bookmarklet.js so the saved-name list is built with DOM nodes and `textContent` instead of raw `innerHTML`.
**Outcome:** Success
**Insight:** Treat hotel names as untrusted input even when they come from the page you are filtering.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-13] Mobile install label parity

**Context:** Keep the mobile install page aligned with the live bookmarklet toolbar labels.
**What happened:** Updated the mobile usage grid so it now says "Toggle dimming" and "Clear hotel filter list" instead of paraphrases.
**Outcome:** Success
**Insight:** Preview text should mirror the exact action labels users will tap.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-12] Explicit no-op clear feedback

**Context:** Make the clear-list action say when there was nothing to clear.
**What happened:** Updated content.js and bookmarklet.js so "Clear hotel filter list" now reports "Hotel filter list was already empty." when the saved list is empty, instead of always claiming a clear happened.
**Outcome:** Success
**Insight:** Keep idempotent actions honest in both surfaces.
**Promoted to Lessons Learned:** No

---

### [2026-05-12] Mobile label sync

**Context:** Align mobile install page labels with the extension buttons.
**What happened:** Updated the mobile usage grid to say "Add visible hotels" and "Copy non-excluded hotels" so it matches the toolbar actions.
**Outcome:** Success
**Insight:** Keep visible action labels exact across surfaces.
**Promoted to Lessons Learned:** No

---
2026-05-12 | Bookmarklet sync: aligned mobile labels/messages with the extension for add/copy/clear actions and kept return shape consistent.
2026-05-12 | Docs sync: README extension quickstart now mentions the Copy non-excluded hotels action.
2026-05-11 | UX polish: show explicit no-op message when "Add visible hotels" finds no new names; kept content.js and bookmarklet.js in sync.
2026-05-05 | Refactor: shared core pattern in content.js + bookmarklet.js; Firefox MV3 support via gecko settings in manifest; README install steps updated.
2026-06-06: Performed parity audit between bookmarklet.js and content.js. Found 100% functional parity in core logic, selectors, and interaction handlers.

---

### [2026-08-04] Repository migration

**Context:** Replace the GitHub repository disabled by stale transport state and rename the project.
**What happened:** Published the verified historical refs under `booking-exclusion-filter`, updated the README title and GitHub Pages URL, and intentionally retained the Firefox extension ID and `animalFriendlyList` storage key for compatibility. JavaScript syntax checks passed; the untouched source SHA and migration tree both retain the pre-existing `core_logic.test.js` case-normalization failure (`Hotel B` expected, `hotel b` actual).
**Outcome:** Success
**Insight:** Repository and Pages URLs must move together; stable extension and storage identifiers should not change during a repository-only migration.
**Promoted to Lessons Learned:** No

# Homepage Type and Buttons Implementation Plan

> **For agentic workers:** Execute inline in this session under the user-approved design. No additional delegation required.

**Goal:** Apply the approved typography, flat buttons and dark gallery hierarchy to the existing homepage.

**Architecture:** Add a native CSS refinement layer after craft.css. Keep catalog-generated card markup and static fallback aligned. Preserve JavaScript interaction state and fan geometry.

**Tech Stack:** Existing HTML, CSS, JavaScript and Python sync utility.

---

- [x] Audit and snapshot existing files and rendered homepage.
- [x] Add portfolio-demos/homepage/editorial.css for type tokens, text navigation, flat primary actions, moving tab underline, readable supporting copy, responsive sizes and reduced motion.
- [x] In index.html, load editorial.css, move the unchanged intro description into its own aligned column and remove the nav dot. In catalog.js and static fallback, name the card action 查看产品.
- [x] Run python3 scripts/sync-homepage.py, then python3 scripts/sync-homepage.py --check and git diff --check. Check modified JavaScript syntax.
- [x] Reload the existing homepage tab. Inspect desktop and mobile widths, dark/light modes, product icons, card/footer text and first-screen Dock. Exercise details, tabs, play/stop, keyboard fan, about navigation and focus return.
- [x] Record actual validation in portfolio-demos/homepage/README.md and save final homepage/detail screenshots. Restore default browser dimensions and dark mode.

User-approved scope is reversible local UI refinement. No commit, push or deployment required.

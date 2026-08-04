# Progress: website-redesign

_Last checkpoint: 2026-07-27 14:37_

## Done
- Rebuilt santiagocoelho.github.io as a modern single-page static site (replaced old academicpages Jekyll multi-page theme). Live on `master`, published to GitHub Pages.
- Core files created: `index.html`, `assets/css/style.css`, `assets/js/main.js`, `.nojekyll` (disables Jekyll so index.html is served directly).
- Sections in order: Hero → About → Research → Publications → Talks → Hiring → Contact. Nav has CV link (opens `files/CV_Coelho_current.pdf`).
- Blue/navy color palette (accent `#2563c9`, hero/footer navy `#0b1f3f`). No green remains.
- Hero: name, role ("Assistant Professor · Department of Radiology · NYU Grossman School of Medicine", no "starting Aug 2026"), tagline "Turning MRI into a noninvasive microscope of tissue microstructure", social icons, View publications / Download CV / Get in touch buttons. Background = `files/fullbrain_coronal.jpg` (422 KB) on the right, screen-blend + left→right navy fade, positioned `right -60px top 30px`.
- About: 5-paragraph present-tense bio (lab set up at NYU), with NYU/Radiology/CAI2R links. Highlights card (NIH K99/R00, ISMRM Junior Fellow 2025, Magna Cum Laude 2024/2022 & Summa 2023/2021, PhD Leeds, NYC).
- Research interests: 4 cards — Microstructure imaging (`bi-gem`), Optimal acquisition design (`bi-bullseye`), Inverse problems (`bi-arrow-left-right`), Image reconstruction (`bi-card-image`, copy starts "I develop MRI reconstruction methods"). Custom section lead + per-card copy from user.
- Publications: curated list, top 5 shown + "Read more"/"Read less" toggle. Includes 2026 Nature Comms (Geometry of the cumulant series) and 2025 MRM (What if each voxel...). Two-column layout with sticky `files/fullbrain.png` axial image on the right — transparent bg (no fill/shadow/caption), enlarged (col 380px, img width 112% margin-left -6%), ~1cm gap (`.pub-aside` padding-left: 1cm). Image hidden on mobile (<900px).
- Talks: 12 invited talks, top 5 shown + Read more toggle.
- Contact: email tile (single line, no wrap), location, social icons. No backend form.
- Cleanup: `.DS_Store` gitignored; deleted the research-statement PDF the user pasted in for reading.
- User confirmed final look is good. All work committed and pushed to `master` (latest commit `5ca2a6c`).

## In progress
- Nothing half-built. Work is at a clean, shipped stopping point.

## Next
- (Optional) Delete the merged `redesign-single-page` branch (local + remote) to tidy up.
- (Optional) Prune unused old Jekyll files: `_pages/`, `_publications/`, `_talks/`, `_layouts/`, `_includes/`, `_sass/`, `_data/`, `_portfolio/`, `_posts/`, `_teaching/`, `_drafts/`, `markdown_generator/`, `talkmap*`, `Gemfile`, `_config*.yml`, `CHANGELOG.md`. Verify nothing the new site references breaks first.
- (Optional) Provide a smaller export of `files/fullbrain.png` (currently 5.4 MB) — e.g. ~800px wide — to speed the publications section load; then swap the `src` in `index.html`.

## Resume notes
- Repo root: `/Users/coelhs01/Git/santiagocoelho.github.io`. Working branch is `master` (already merged + pushed). Old branch `redesign-single-page` still exists.
- Deploy model: static via `.nojekyll`. Old URLs (`/publications/`, `/cv/`, `/talks/`) intentionally no longer resolve.
- All content lives inline in `index.html` (not generated from Jekyll collections). Edit HTML directly.
- Hero bg + publications image styling live in `assets/css/style.css` under `/* ---------- Hero ---------- */` (`.hero-bg::after` image, `.hero-bg::before` fade) and `/* ---------- Publications ---------- */` (`.pub-layout`, `.pub-aside`, `.pub-figure img`).
- Read-more toggles: `assets/js/main.js` `wireToggle()` wires `pubToggle`/`pubList` and `talkToggle`/`talkList`; CSS uses `.is-extra` hidden by default, shown via `.show-all`.
- ENV GOTCHA: this session's sandbox blocks many Bash forms — reading files outside the repo, running `python3 -c`/scripts, `brew install`, `open`, backgrounded servers, and some compound commands (`a && b`). PDFs outside the repo can't be read; ask the user to paste text or copy the file into the repo. Commit messages with apostrophes in a heredoc failed — use simple `-m` strings.
- Git pushes work once user has authenticated (credentials cached this session). `files/fullbrain.png` kept re-appearing in the working tree (sync); it IS tracked and needed by the site now — do not gitignore it again.
- Icon set: Bootstrap Icons v1.11 via CDN. Could not verify names against getbootstrap.com (fetch blocked); user visually confirmed all icons render.

# Deploying to Pavlovia

This experiment uses two separate Git repositories:
- **GitHub** (`zarcolmarioa/experiment_jspsych7_pavlovia2021_github_datapipe`) — internal
  testing via GitHub Pages + DataPipe + OSF.
- **Pavlovia** — participant-facing production deployment.

Only three lines in `config.js` need to change between the two deployments.
Everything else is handled automatically at runtime.

---

## 1. Config flags to change for Pavlovia

Open `config.js` and update the three top-level flags:

```javascript
platform:       'pavlovia',   // was 'github'
dev_menu:       false,        // was true
active_variant: 'original_ne', // whichever variant you want to run
```

That is the only code change required.

---

## 2. Pavlovia .gitignore

The Pavlovia repository should exclude files that are only used for internal
testing or analysis. Add the following to `.gitignore` in the Pavlovia repo:

```gitignore
# Developer menu (internal testing only — never deploy to participants)
dev.html
src/dev-menu.js

# All variant files except the one you are deploying.
# Uncomment the line for the active variant and leave the others excluded.
# src/variants/original-ne.js    ← keep this one (comment it out = include it)
src/variants/grayscale.js
src/variants/single-exposure.js
src/variants/salience-control.js
src/variants/part2-dr.js

# Variant registry (only needed for the dev menu)
src/variants/variant-registry.js

# Analysis and documentation (not needed on Pavlovia)
parse_calibration.py
README.md
PAVLOVIA_SETUP.md
data/

# OS and editor artefacts
.DS_Store
Thumbs.db
*.swp
*.swo
.vscode/
.idea/
```

> **Note:** You do not need to exclude `dev.html` and `dev-menu.js` via
> `.gitignore` if you simply never push them to the Pavlovia repository.
> The `.gitignore` approach above is belt-and-braces; what matters is that
> neither file appears in the Pavlovia repo's working tree when you run
> the experiment.

---

## 3. Script tags in index.html

`index.html` always includes both the DataPipe plugin and the Pavlovia
scripts. When running on GitHub Pages the Pavlovia scripts (`jquery` and
`jspsych-7-pavlovia-2021.12.js`) are simply absent from the server and the
browser ignores the 404. When running on Pavlovia the DataPipe plugin loads
but is never called (because `CONFIG.platform === 'pavlovia'`). No manual
commenting or uncommenting is needed.

---

## 4. Full deployment checklist

### GitHub → DataPipe → OSF (testing)

- [ ] `config.js`: `platform: 'github'`, `dev_menu: true`, `active_variant` = variant under test
- [ ] `config.js`: `datapipe.id` set to your DataPipe experiment ID
- [ ] `config.js`: `datapipe.osf_folder` set to the target OSF folder name
- [ ] Push to GitHub; Pages rebuilds automatically (1–2 min)
- [ ] Test via `dev.html` URL for internal review
- [ ] Participants never see `dev.html`; they access `index.html`

### Pavlovia (production)

- [ ] `config.js`: `platform: 'pavlovia'`, `dev_menu: false`, `active_variant` = variant to run
- [ ] Push to Pavlovia repository (ensure `.gitignore` excludes dev files)
- [ ] Set experiment to **Running** in Pavlovia dashboard
- [ ] Verify pilot data arrives in Pavlovia data folder
- [ ] Recruit participants via Prolific / SONA with the Pavlovia experiment URL

---

## 5. Switching variants for a new run

1. Update `active_variant` in `config.js`.
2. If the new variant requires different stimulus image files, ensure those
   files are present in `stimuli/comparisons/`, `stimuli/standards/`, and
   `stimuli/practice/`.
3. Push the updated `config.js` to the relevant repository.
4. No other files need to change.

# NE Task — Setup & Launch Guide

## Project structure

```
experiment/
├── index.html                        ← Open this to run the experiment
├── config.js                         ← ALL parameters you'll ever need to change
├── instructions.js                   ← All participant-facing text (edit to translate)
├── jspsych-7-pavlovia-2021.12.js     ← Pavlovia plugin (do NOT replace)
├── css/
│   └── experiment.css                ← Experiment styles
├── stimuli/
│   ├── standards/                    ← Standard images go here
│   ├── comparisons/                  ← Comparison images go here
│   └── practice/                     ← Practice images go here
├── data/
│   └── .gitkeep
├── lib/                              ← Created by you (see Step 1)
│   └── vendors/
│       ├── jquery-2.2.0.min.js
│       └── jspsych-7.1.2/
│           ├── jspsych.js
│           ├── jspsych.css
│           ├── plugin-fullscreen.js
│           ├── plugin-browser-check.js
│           ├── plugin-preload.js
│           ├── plugin-html-keyboard-response.js
│           ├── plugin-html-slider-response.js
│           ├── plugin-html-button-response.js
│           ├── plugin-survey-text.js
│           ├── plugin-survey-likert.js
│           └── plugin-call-function.js
└── src/
    ├── main.js                       ← Timeline assembler
    ├── calibration/
    │   ├── device-screen.js
    │   ├── resize-card.js
    │   ├── blind-spot.js
    │   ├── gamma.js
    │   └── contrast-screen.js
    └── tasks/
        ├── ne-task.js
        └── questionnaires.js
```

**Note:** On Pavlovia, the `lib/` directory is provided automatically as a virtual
directory — you do NOT need to upload it. You only need to create it locally for
testing (see Step 1).

---

## Step 1 — Download dependencies (for local testing)

### jsPsych 7.1.2

1. Go to: https://github.com/jspsych/jsPsych/releases/tag/jspsych%407.1.2
2. Download the zip file under "Assets"
3. Unzip it. Copy the following files into `lib/vendors/jspsych-7.1.2/`:
   - `jspsych.js`
   - `jspsych.css`
   - `plugin-fullscreen.js`
   - `plugin-browser-check.js`
   - `plugin-preload.js`
   - `plugin-html-keyboard-response.js`
   - `plugin-html-slider-response.js`
   - `plugin-html-button-response.js`
   - `plugin-survey-text.js`
   - `plugin-survey-likert.js`
   - `plugin-call-function.js`

### jQuery 2.2.0

1. Download from: https://code.jquery.com/jquery-2.2.0.min.js
2. Save it as `lib/vendors/jquery-2.2.0.min.js`

---

## Step 2 — Local vs Pavlovia mode

In `config.js`, set the `online` flag:

```javascript
platform: {
  online: false,    // false = local testing, true = Pavlovia
},
```

- **`online: false`** — Pavlovia init/finish trials are skipped. A CSV file is
  downloaded automatically at the end of the experiment.
- **`online: true`** — Pavlovia init/finish trials are included. Data is uploaded
  to Pavlovia's server at the end. Set this before pushing to Pavlovia.

---

## Step 3 — Run the experiment locally

You cannot open `index.html` by double-clicking it. You need a local web server.

### Option A — Python (simplest)

```bash
cd /path/to/experiment
python -m http.server 8000
# Open http://localhost:8000
```

### Option B — VS Code with Live Server extension

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

### Option C — Node.js

```bash
npm install -g serve
cd /path/to/experiment
serve .
```

---

## Step 4 — Check the browser console for errors

Open the developer console while testing:
- **Mac:** `Cmd + Option + J`
- **Windows/Linux:** `F12` → "Console" tab

You should see log messages like `[Experiment] Participant ID: ...` and
`[Platform] Calibration step complete: ...`. Red errors indicate problems.

---

## Step 5 — Add your stimuli

Image naming convention:

**Standards** (in `stimuli/standards/`):
```
std_{image_id}_noise{noise_pct}.jpg
```
Example: `std_p01_noise15.jpg`

**Comparisons** (in `stimuli/comparisons/`):
```
cmp_{image_id}_{valence}_noise{noise_pct}.jpg
```
Example: `cmp_p01_positive_noise10.jpg`

Then add entries to `CONFIG.stimuli.list` in `config.js`:
```javascript
{ id: "p01", valence: "positive", category: "social" },
```

---

## Step 6 — Disable calibration steps during development

In `config.js`, set any step to `false` to skip it:

```javascript
calibration: {
  fullscreen:      false,
  device_screen:   false,
  resize_card:     false,
  blind_spot:      false,
  gamma:           false,
  contrast_screen: false,
  ambient_light:   false,
},
```

Set them all back to `true` before data collection.

---

## Step 7 — Upload to Pavlovia

1. Create a GitLab account at https://gitlab.pavlovia.org
2. Create a new project and push your experiment folder
3. **Important:** Do NOT upload the `lib/` folder — Pavlovia provides it
4. Set `online: true` in `config.js` before pushing
5. In Pavlovia, activate your study and test in "Piloting" mode first

### Prolific integration

Configure your Prolific study URL to pass the participant ID:

```
https://run.pavlovia.org/youruser/yourstudy?participant={{%PROLIFIC_PID%}}
```

The participant ID is detected automatically from URL parameters
(`PROLIFIC_PID`, `participant`, `id`, or `workerId`) and added to every
data row as `participant_id`.

---

## Data output

A CSV is produced at the end (downloaded locally or saved to Pavlovia).
Key columns:

| Column | Description |
|---|---|
| `participant_id` | Detected from URL params or random fallback |
| `trial_type` | `"ne_task"` for NE trials; `"salience_rating"` for post-task ratings |
| `image_id` | Image identifier (e.g., `"p01"`) |
| `valence` | `"positive"` / `"negative"` / `"neutral"` |
| `noise_level` | Noise percentage on comparison image |
| `standard_noise` | Noise percentage on standard image |
| `response` | Raw response (slider position or numeric entry) |
| `response_scaled` | Response centred on 0 |
| `rt` | Reaction time in ms |
| `px_per_mm` | Pixels per mm (credit card calibration) |
| `viewing_distance_cm` | Estimated viewing distance (blind spot task) |
| `estimated_gamma` | Estimated display gamma |
| `contrast_screen_passed` | `true`/`false` |
| `ambient_light` | `"dark"` / `"dim"` / `"bright"` |

---

## Testing checklist

- [ ] `lib/vendors/` created with jspsych 7.1.2 files and jQuery
- [ ] `config.js`: `online: false`
- [ ] Experiment opens at `http://localhost:8000` without console errors
- [ ] All calibration steps run correctly
- [ ] CSV downloads at the end with expected columns
- [ ] Tested in Chrome and Firefox
- [ ] `config.js`: `online: true` before pushing to Pavlovia
- [ ] `lib/` folder NOT pushed to Pavlovia
- [ ] Piloting mode tested on Pavlovia before activating

// =============================================================================
// config.js — Master configuration for the NE (Noise Estimation) Experiment
// Based on Todd et al. (2012), sparse noise procedure
//
// HOW TO USE THIS FILE:
//   This is the ONE file you edit to change experiment parameters, enable or
//   disable calibration steps, switch between task variants, add stimuli, etc.
//   You should not need to touch any other file for routine changes.
// =============================================================================

const CONFIG = {

  // ---------------------------------------------------------------------------
  // EXPERIMENT METADATA
  // Stored in every data row so exported CSVs are self-documenting.
  // ---------------------------------------------------------------------------
  experiment: {
    name:    "NE_Task_ToddReplication",
    version: "0.2.0",
    language: "en",   // "en" = English, "ja" = Japanese
  },

  // ---------------------------------------------------------------------------
  // PLATFORM SETTINGS
  //
  // ---------------------------------------------------------------------------
  // DEPLOYMENT FLAGS
  //   platform:       'local'    — CSV download at end (local development)
  //                   'github'   — DataPipe → OSF save (GitHub Pages testing)
  //                   'pavlovia' — Pavlovia init/finish nodes (production)
  //   dev_menu:       true  — show variant selector before experiment starts
  //                   false — run active_variant directly (participants/Pavlovia)
  //   active_variant: id of the variant to run when dev_menu is false.
  //                   Must match an id in src/variants/variant-registry.js.
  // ---------------------------------------------------------------------------
  platform:       'github',
  dev_menu:       true,
  active_variant: 'original_ne',

  // DataPipe settings (used when platform === 'github').
  // id: the experiment ID from your DataPipe dashboard at pipe.jspsych.org.
  // osf_folder: the OSF folder name configured in your DataPipe project.
  datapipe: {
    id:         "19tHuDezXIOo", // 'YOUR_DATAPIPE_EXPERIMENT_ID',
    osf_folder: 'data_calibration_phase',
  },

  // ---------------------------------------------------------------------------
  // NE TASK (main experiment)
  // Set enabled to false to skip the NE task entirely. Useful when running
  // only the stimulus evaluation pre-experiment or questionnaires.
  // ---------------------------------------------------------------------------
  ne_task: {
    enabled: false,
  },

  // ---------------------------------------------------------------------------
  // CALIBRATION BATTERY
  // Set any item to false to skip it entirely (useful during development).
  // ---------------------------------------------------------------------------
  calibration: {
    fullscreen:              true,   // Enter fullscreen before anything else
    brightness_confirmation: true,   // Ask participant to set brightness to maximum
    device_screen:           true,   // Log pixel ratio, screen size, user agent
    resize_card:             true,   // Physical screen size via credit card method
    blind_spot:              true,   // Viewing distance via blind spot method
    gamma:                   true,   // Gamma estimation via luminance matching (3 repetitions)
    contrast_screen:         true,   // Hidden-digit contrast check
    color_rendering:         true,   // Colour rendering check (red-green, yellow-blue)
    ambient_light:           true,   // Single self-report item about room lighting

    // Gamma calibration visual arrangement.
    // Options:
    //   'split_field'     -- checkerboard LEFT | grey patch RIGHT, shared border
    //                        (default, recommended by Roca-Vila et al. 2013)
    //   'centre_surround' -- one patch is a disc in the centre, the other
    //                        is a ring (annulus) surrounding it
    gamma_arrangement: 'split_field',

    // Centre-surround orientation (only used when gamma_arrangement is
    // 'centre_surround'). Checkerboard as surround is recommended because
    // it reduces the simultaneous contrast illusion bias.
    //   'checker_surround' -- checkerboard ring, adjustable grey disc (recommended)
    //   'grey_surround'    -- adjustable grey ring, checkerboard disc
    gamma_centre_surround_orientation: 'checker_surround',

    // Contrast screen: the digit shown is drawn randomly from this set.
    contrast_digit_pool: [2, 3, 4, 5, 6, 7, 8],

    // Blind spot: maximum acceptable viewing distance in cm.
    // Participants estimated to be further than this will see a warning.
    // Set to null to warn but not exclude.
    blind_spot_max_distance_cm: 100,
  },

  // ---------------------------------------------------------------------------
  // DISPLAY & TIMING  (all times in milliseconds unless noted)
  // Matches Todd et al. procedure by default.
  // ---------------------------------------------------------------------------
  display: {
    // Duration the STANDARD image is shown
    standard_duration: 2000,

    // Duration of the gap between standard and comparison (ISI)
    // Set to 0 to show them back-to-back with no gap (original NE procedure)
    isi_duration: 0,

    // Duration the COMPARISON image is shown before the response prompt.
    // Todd et al.: "an image was presented for 2000 ms followed by a prompt"
    // Set to null for self-paced (response prompt appears with the image).
    comparison_duration: 2000,

    // Fixation cross before each trial (set to 0 to disable)
    fixation_duration: 500,

    // Inter-trial message shown between trials.
    // A brief, unobtrusive message that the next trial is about to start.
    // Set enabled: false to go directly from response to the next fixation.
    inter_trial_message: {
      enabled: true,
      duration: 1500,   // ms to show the message before next trial starts
    },

    // Background colour of the experiment canvas (CSS colour string)
    background_color: "#808080",  // Mid-grey, as is standard for psychophysics

    // Image display size in pixels. Both standard and comparison use this size.
    // Todd et al. used ~13° × 9.5° visual angle; you will convert after
    // calibration. For now, set a sensible pixel default.
    image_width_px:  780,
    image_height_px: 570,
  },

  // ---------------------------------------------------------------------------
  // RESPONSE COLLECTION
  // ---------------------------------------------------------------------------
  response: {
    // "text" matches the original NE experiment in Todd et al. (free numeric entry)
    //   Participants see "Standard = 100" and enter a number estimating the
    //   proportion of noise on the comparison relative to the standard.
    // "slider" matches the sparse noise experiment variant (22-point ordinal scale)
    type: "text",   // "slider" | "text"

    // --- Slider settings (only used when type = "slider") ---
    slider: {
      min:   1,
      max:   22,
      start: 11,    // Starting position (middle of scale)
      step:  1,     // Must be 1 for a 22-point discrete scale
      // Labels displayed at each end of the slider
      labels: ["A lot less noisy", "Same as standard", "A lot more noisy"],
      // Which slider position maps to "same as standard"
      // (used to centre-score responses in analysis)
      midpoint: 11,
    },

    // --- Text input settings (only used when type = "text") ---
    text: {
      // The modulus value shown to participants ("the standard = 100")
      modulus: 100,
      placeholder: "Enter a number",
    },

    // Require a response before the participant can advance?
    required: true,

    // Maximum time allowed for a response (ms). Set to null for unlimited.
    // Todd et al. (2012) does not specify a time limit for the behavioral
    // experiments. 10000 ms (10 seconds) is a reasonable default for online use.
    response_time_limit: 10000,

    // Show a countdown timer during the response window.
    // The timer is subtle (small monospace text). Set to false to hide it
    // entirely (the time limit still applies, but no visible countdown).
    show_timer: true,
  },

  // ---------------------------------------------------------------------------
  // PRACTICE BLOCK
  // A short block of trials shown before the main task so participants can
  // familiarise themselves with the procedure. Todd et al. mention 'a brief
  // practice session' but give no further detail.
  //
  // Set enabled: false to skip the practice block entirely.
  // ---------------------------------------------------------------------------
  practice: {
    enabled: false,    // Set to false to skip practice block

    // Number of practice trials. Each trial is one standard + one comparison.
    // Recommended: 6 trials (one per noise level x two valences: one emotional,
    // one neutral). Minimum meaningful: 3 (one per noise level).
    n_trials: 1,

    // Noise levels used in practice trials (subset of main task levels is fine).
    noise_levels: ['10', '15', '20'],

    // Practice images are separate placeholder files so real stimuli are not
    // seen before the main task. File naming convention:
    //   stimuli/practice/std_practice_{id}_noise{pct}.jpg
    //   stimuli/practice/cmp_practice_{id}_{valence}_noise{pct}.jpg
    // The Python stimulus preparation script generates these automatically.
    // Practice stimulus list.
    // Populated automatically by prepare_stimuli.py via stimuli/stimulus_list.js.
    // Do not edit this manually -- run the Python script instead.
    list: (typeof STIMULUS_LIST !== 'undefined' && STIMULUS_LIST.practice)
      ? STIMULUS_LIST.practice
      : [],  // empty until prepare_stimuli.py has been run

    // Path to practice stimuli (relative to index.html)
    path_standards:   'stimuli/practice/',
    path_comparisons: 'stimuli/practice/',
  },

  // ---------------------------------------------------------------------------
  // NOISE LEVELS
  // Todd et al. sparse noise used 10%, 15%, 20% with standard always at 15%.
  // Values here are used to BUILD the expected stimulus filenames (see below).
  // ---------------------------------------------------------------------------
  noise: {
    // Noise levels applied to COMPARISON images (as percentage strings)
    comparison_levels: ["10", "15", "20"],

    // The noise level of the STANDARD image (always fixed in sparse noise)
    standard_level: "15",
  },

  // ---------------------------------------------------------------------------
  // STIMULUS LISTS
  // Stimuli are loaded from the /stimuli/ folder.
  // File naming convention (edit to match your actual files):
  //   standards/   std_{image_id}_noise{noise_pct}.jpg
  //   comparisons/ cmp_{image_id}_{valence}_noise{noise_pct}.jpg
  //
  // Each entry in stimulus_list defines one unique image.
  // The task builder will automatically expand each image into one trial
  // per noise level (× repetitions).
  //
  // IMPORTANT: Leave this array empty ([]) until you have your image files.
  //            A placeholder set is provided below for testing the task flow.
  // ---------------------------------------------------------------------------
  stimuli: {
    // How many times each image×noise_level combination is repeated.
    // Todd et al. sparse noise: each image shown once per noise level (1 rep).
    // Set to 1 for sparse noise / single exposure variant.
    repetitions: 1,

    // Maximum number of main-task trials to run.
    // Set to null to run the full trial list (default for real data collection).
    // Set to a number (e.g. 10) to cap the list -- useful for quick Pavlovia tests.
    // Trials are drawn from the shuffled list, so the subset is random.
    n_trials: 1,

    // Set to true to present each image only once at ONE noise level (randomly
    // assigned). This implements the "single exposure" variant.
    single_exposure: false,

    // Main stimulus list.
    // Populated automatically by prepare_stimuli.py via stimuli/stimulus_list.js.
    // Do not edit this manually -- run the Python script instead.
    list: (typeof STIMULUS_LIST !== 'undefined' && STIMULUS_LIST.main)
      ? STIMULUS_LIST.main
      : [],  // empty until prepare_stimuli.py has been run

    // Paths (relative to index.html)
    path_standards:    "stimuli/standards/",
    path_comparisons:  "stimuli/comparisons/",
  },

  // ---------------------------------------------------------------------------
  // INSTRUCTIONS TEXT
  // Edit the strings here to change what participants read.
  // HTML is allowed inside these strings.
  // ---------------------------------------------------------------------------
  instructions: {
    welcome: `
      <div class="calibration-card">
        <h2>Welcome</h2>
        <p>Thank you for taking part in this study.</p>
        <p>Please read the following instructions carefully before we begin.</p>
      </div>
    `,

    calibration_intro: `
      <div class="calibration-card">
        <h2>Display Setup</h2>
        <p>Before we begin, we need to check that your display is set up correctly.
           This will only take a few minutes.</p>
        <p>Please make sure you are sitting comfortably in front of your screen,
           that the room is not overly bright, and that you are not using a tablet
           or phone.</p>
      </div>
    `,

    task_intro: `
      <div class="calibration-card">
        <h2>Task Instructions</h2>
        <p>On each trial, you will see <strong>two images</strong> presented
           one after the other.</p>
        <p>The first image is the <strong>Standard</strong>. It is always shown
           at the same level of visual noise (graininess). This standard is
           given an arbitrary value of <strong>100</strong>.</p>
        <p>The second image is the <strong>Comparison</strong>. Your job is to
           estimate the amount of noise on the comparison image
           <em>relative to the standard</em>.</p>
        <p>After the comparison image disappears, enter a <strong>number</strong>
           representing your estimate of the noise level:</p>
        <ul>
          <li>If the comparison looks <strong>less noisy</strong> than the
              standard, enter a number <strong>below 100</strong>
              (e.g., 70, 80)</li>
          <li>If it looks <strong>about the same</strong>, enter
              <strong>100</strong></li>
          <li>If it looks <strong>more noisy</strong>, enter a number
              <strong>above 100</strong> (e.g., 120, 150)</li>
        </ul>
        <p>Focus on the <strong>noisiness (graininess)</strong> of the images,
           not their content.</p>
      </div>
    `,

    task_begin: `
      <div class="calibration-card">
        <h2>Main Task</h2>
        <p>The practice is now complete. The main task will now begin.</p>
        <p>Remember: the standard = <strong>100</strong>. Enter a number
           for how noisy the comparison is relative to the standard.</p>
      </div>
    `,

    end: `
      <div class="calibration-card" style="text-align:center;">
        <h2>Thank You</h2>
        <p>You have completed the task.</p>
        <p>Your responses are being saved. Please wait a moment before closing this window.</p>
      </div>
    `,
  },

  // ---------------------------------------------------------------------------
  // STIMULUS EVALUATION (pre-experimental)
  // A separate group of participants rates each image (without noise) on four
  // dimensions to confirm stimuli are matched across valence categories.
  // Based on Todd et al. (2012).
  // Set enabled: false to skip entirely (default for the main experiment).
  // ---------------------------------------------------------------------------
  stimulus_evaluation: {
    enabled: false,   // Set to true only for the stimulus evaluation study

    // Maximum number of images to show. Set to null to show all images.
    // Set to a small number (e.g. 3) for quick testing.
    n_trials: 1,

    // Path and naming convention for clean (no-noise) images.
    // Default expects files like: stimuli/comparisons/cmp_p01_positive_noise0.jpg
    image_path:   "stimuli/comparisons/",
    image_prefix: "cmp_",
    image_suffix: "_noise10.jpg",
  },

  // ---------------------------------------------------------------------------
  // EMOTIONAL SALIENCE RATING (post-task)
  // After the NE task, participants rate each image for emotional arousal.
  // Set enabled: false to skip entirely.
  // ---------------------------------------------------------------------------
  salience_rating: {
    enabled: false,
    scale_min: 1,
    scale_max: 7,
    label_min: "Not at all emotionally arousing",
    label_max: "Extremely emotionally arousing",
    instruction: `
      <p>You will now see each image again, <strong>without any noise</strong>.</p>
      <p>For each image, please rate how <strong>emotionally arousing</strong> it is
         on a scale from 1 (not at all) to 7 (extremely).</p>
    `,
  },

  // ---------------------------------------------------------------------------
  // QUESTIONNAIRES (post-task)
  // Set enabled to false to skip all questionnaires.
  // Each questionnaire has its own enabled flag.
  // ---------------------------------------------------------------------------
  questionnaires: {
    enabled: false,    // Master switch: false = skip all questionnaires
    names: [
      { id: "cds", enabled: true },    // Cambridge Depersonalization Scale
      // Add more here, e.g.:
      // { id: "phq9", enabled: true },
    ],
  },

};

// =============================================================================
// APPLY VARIANT OVERRIDES
// This runs automatically. Do not edit below this line.
// It reads CONFIG.experiment.task_variant and applies the matching overrides
// from CONFIG._variant_overrides, using dot-notation paths.
// =============================================================================

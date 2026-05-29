// =============================================================================
// src/main.js -- Timeline Assembler
//
// Platform modes (set CONFIG.platform in config.js):
//   'local'    — opens index.html directly; data downloaded as CSV at end
//   'github'   — hosted on GitHub Pages; data saved to OSF via DataPipe
//   'pavlovia' — deployed on Pavlovia; data saved by Pavlovia
//
// Variant selection (set CONFIG.active_variant in config.js):
//   When CONFIG.dev_menu is true:  DevMenu shows a variant selector first.
//   When CONFIG.dev_menu is false: CONFIG.active_variant is run directly.
// =============================================================================

// ---------------------------------------------------------------------------
// Participant ID — read from URL params (Prolific, SONA) or generate locally
// ---------------------------------------------------------------------------
var _participantId = (function () {
  var urlParams = new URLSearchParams(window.location.search);
  var sources   = ['PROLIFIC_PID', 'participant', 'id', 'workerId'];
  for (var i = 0; i < sources.length; i++) {
    var val = urlParams.get(sources[i]);
    if (val) return val;
  }
  return 'local_' + Math.random().toString(36).slice(2, 10);
})();

console.log('[Experiment] Participant ID: ' + _participantId);
console.log('[Experiment] Platform: '       + CONFIG.platform);

// ---------------------------------------------------------------------------
// Initialise jsPsych
// ---------------------------------------------------------------------------
var jsPsych = initJsPsych({

  on_trial_finish: function (data) {
    if (data.trial_type === 'ne_task') {
      console.log(
        '[Trial ' + data.trial_index + '] ' + data.image_id +
        ' | noise: '    + data.noise_level + '%' +
        ' | response: ' + data.response +
        ' | rt: '       + data.rt + 'ms'
      );
    }
  },

  on_finish: function () {
    _removeFullscreenHandler();
    // Local mode only: download CSV directly.
    // GitHub and Pavlovia handle saving through timeline nodes.
    if (CONFIG.platform === 'local') {
      var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      var filename  = CONFIG.experiment.name + '_' + _participantId + '_' + timestamp + '.csv';
      jsPsych.data.get().localSave('csv', filename);
      console.log('[Experiment] Local save: ' + filename);
    }
  },
});

jsPsych.data.addProperties({ participant_id: _participantId });
document.body.style.backgroundColor = CONFIG.display.background_color;

// ---------------------------------------------------------------------------
// Fullscreen banner (shown if participant exits fullscreen mid-experiment)
// ---------------------------------------------------------------------------
var _fullscreenBanner        = null;
var _fullscreenHandlerActive = false;

function _installFullscreenHandler() {
  if (_fullscreenHandlerActive) return;
  _fullscreenHandlerActive = true;
  document.addEventListener('fullscreenchange',       _onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', _onFullscreenChange);
  document.addEventListener('mozfullscreenchange',    _onFullscreenChange);
  document.addEventListener('MSFullscreenChange',     _onFullscreenChange);
}

function _removeFullscreenHandler() {
  document.removeEventListener('fullscreenchange',       _onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', _onFullscreenChange);
  document.removeEventListener('mozfullscreenchange',    _onFullscreenChange);
  document.removeEventListener('MSFullscreenChange',     _onFullscreenChange);
  _fullscreenHandlerActive = false;
  _removeBanner();
}

function _onFullscreenChange() {
  var isFullscreen =
    document.fullscreenElement       ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement    ||
    document.msFullscreenElement;
  if (!isFullscreen) { _showFullscreenBanner(); }
  else               { _removeBanner(); }
}

function _showFullscreenBanner() {
  if (_fullscreenBanner) return;
  _fullscreenBanner = document.createElement('div');
  _fullscreenBanner.style.cssText =
    'position:fixed; top:0; left:0; right:0; z-index:99999;' +
    'background:#1a1a1a; color:#f0ede8; padding:14px 24px;' +
    'display:flex; align-items:center; justify-content:space-between;' +
    'gap:16px; box-shadow:0 2px 12px rgba(0,0,0,0.6);' +
    'font-family:Georgia,serif; font-size:0.95rem;';
  _fullscreenBanner.innerHTML =
    '<span>You have left full-screen mode. ' +
    'For the best results, please return to full screen.</span>' +
    '<button id="fs-reenter-btn" ' +
    'style="padding:8px 20px; background:#f0ede8; color:#1a1a1a;' +
    'border:none; border-radius:3px; font-size:0.9rem;' +
    'font-family:Georgia,serif; cursor:pointer; white-space:nowrap;">' +
    'Return to full screen</button>';
  document.body.appendChild(_fullscreenBanner);
  document.getElementById('fs-reenter-btn').addEventListener('click',
    function () {
      var el  = document.documentElement;
      var req = el.requestFullscreen      ||
                el.webkitRequestFullscreen ||
                el.mozRequestFullScreen    ||
                el.msRequestFullscreen;
      if (req) req.call(el);
    }
  );
}

function _removeBanner() {
  if (_fullscreenBanner) { _fullscreenBanner.remove(); _fullscreenBanner = null; }
}

// ---------------------------------------------------------------------------
// Build calibration nodes (always runs regardless of variant)
// ---------------------------------------------------------------------------
function _buildCalibrationTimeline() {
  var nodes = [];

  // Brightness confirmation (before any calibration steps)
  if (CONFIG.calibration.brightness_confirmation) {
    nodes.push.apply(nodes, BrightnessConfirmation.getNodes(jsPsych));
  }

  // Calibration intro
  nodes.push({
    type: jsPsychHtmlButtonResponse,
    stimulus:
      '<div class="calibration-card">' +
      INSTRUCTIONS.calibration_intro +
      '</div>',
    choices: [INSTRUCTIONS.button_continue],
    button_html: '<button class="ne-continue-btn">%choice%</button>',
    data: { trial_type: 'instruction', instruction_page: 'calibration_intro' },
  });

  // Step 5b: Device & screen check
  if (CONFIG.calibration.device_screen) {
    nodes.push.apply(nodes, DeviceScreenCalibration.getNodes(jsPsych));
  } else {
    nodes.push({
      type: jsPsychCallFunction,
      func: function () {
        jsPsych.data.addProperties({
          screen_width_px:    window.screen.width,
          screen_height_px:   window.screen.height,
          window_width_px:    window.innerWidth,
          window_height_px:   window.innerHeight,
          device_pixel_ratio: window.devicePixelRatio || 1,
        });
      },
    });
  }

  // Step 5c: Credit card resize
  if (CONFIG.calibration.resize_card) {
    nodes.push.apply(nodes, ResizeCardCalibration.getNodes(jsPsych));
  }

  // Step 5d: Blind spot
  if (CONFIG.calibration.blind_spot) {
    nodes.push.apply(nodes, BlindSpotCalibration.getNodes(jsPsych));
  }

  // Step 5e: Gamma calibration
  if (CONFIG.calibration.gamma) {
    nodes.push.apply(nodes, GammaCalibration.getNodes(jsPsych));
  }

  // Step 5f: Contrast screen + ambient light
  if (CONFIG.calibration.contrast_screen) {
    nodes.push.apply(nodes, ContrastScreenCalibration.getNodes(jsPsych));
  }

  // Step 5g: Colour rendering check
  if (CONFIG.calibration.color_rendering) {
    nodes.push.apply(nodes, ColorRenderingCalibration.getNodes(jsPsych));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Build save and finish nodes (platform-dependent)
// ---------------------------------------------------------------------------
function _buildSaveNodes() {
  var nodes = [];

  // Stamp experiment metadata before saving
  nodes.push({
    type: jsPsychCallFunction,
    func: function () {
      _removeFullscreenHandler();
      jsPsych.data.addProperties({
        experiment_name:     CONFIG.experiment.name,
        experiment_version:  CONFIG.experiment.version,
        active_variant:      CONFIG.active_variant,
        experiment_end_time: new Date().toISOString(),
        platform:            CONFIG.platform,
      });
    },
  });

  if (CONFIG.platform === 'github') {
    // DataPipe → OSF
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var datapipeFilename = _participantId + '_' + timestamp + '.csv';
    nodes.push({
      type:          jsPsychPipe,
      action:        'save',
      experiment_id: CONFIG.datapipe.id,
      filename:      datapipeFilename,
      data_string:   function () { return jsPsych.data.get().csv(); },
      on_finish: function (data) {
        console.log('[DataPipe] Save attempted. Success: ' + data.success);
      },
    });

  } else if (CONFIG.platform === 'pavlovia') {
    // Pavlovia finish node
    nodes.push({
      type:    jsPsychPavlovia,
      command: 'finish',
      dataFilter: function (data) {
        console.log(jsPsych.data.get().json());
        return data;
      },
      completedCallback: function () {
        console.log('[Pavlovia] Data submitted successfully.');
      },
    });
  }
  // 'local' mode: on_finish above handles the CSV download — no timeline node needed.

  return nodes;
}

// ---------------------------------------------------------------------------
// Find a variant by id from the registry
// ---------------------------------------------------------------------------
function _findVariant(variantId) {
  for (var i = 0; i < VARIANT_REGISTRY.length; i++) {
    if (VARIANT_REGISTRY[i].id === variantId) {
      return VARIANT_REGISTRY[i];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build and run the full experiment timeline for a given variant id
// ---------------------------------------------------------------------------
function _runExperiment(variantId) {
  var timeline = [];

  console.log('[Experiment] Running variant: ' + variantId);

  // Record which variant was actually launched
  jsPsych.data.addProperties({ active_variant: variantId });

  // 1. Pavlovia init node (must be first — Pavlovia mode only)
  if (CONFIG.platform === 'pavlovia') {
    var pavloviaInfo;
    timeline.push({
      type: jsPsychPavlovia,
      command: 'init',
      setPavloviaInfo: function (info) {
        pavloviaInfo = info;
        console.log('[Pavlovia] Initialised:', info);
      },
    });
  }

  // 2. Fullscreen
  if (CONFIG.calibration.fullscreen) {
    timeline.push({
      type:            jsPsychFullscreen,
      fullscreen_mode: true,
      message:
        '<div class="calibration-card">' +
        '<h2>Full Screen Required</h2>' +
        '<p>This study must be run in full-screen mode.</p>' +
        '<p>Click the button below to enter full screen.<br>' +
        '<span style="font-size:0.85rem; color:#666;">' +
        'You can exit at any time by pressing Escape.' +
        '</span></p>' +
        '</div>',
      button_label: INSTRUCTIONS.button_continue,
      data:         { trial_type: 'fullscreen' },
      on_finish:    function () { _installFullscreenHandler(); },
    });
  }

  // 3. vsync / browser check
  timeline.push({
    type:             jsPsychBrowserCheck,
    inclusion_function: function (data) { return true; },
    exclusion_message:  function (data) { return ''; },
    on_finish: function (data) {
      window._browserRecommended =
        (data.browser === 'chrome' || data.browser === 'edge');
      jsPsych.data.addProperties({ vsync_rate_hz: data.vsync_rate || null });
    },
    data: { trial_type: 'browser_check' },
  });

  // 4. Welcome screen
  timeline.push({
    type:        jsPsychHtmlButtonResponse,
    stimulus:    '<div class="calibration-card">' + INSTRUCTIONS.welcome + '</div>',
    choices:     [INSTRUCTIONS.button_continue],
    button_html: '<button class="ne-continue-btn">%choice%</button>',
    data:        { trial_type: 'instruction', instruction_page: 'welcome' },
  });

  // 5. Calibration battery
  timeline.push.apply(timeline, _buildCalibrationTimeline());

  // 6. Variant task timeline
  var entry = _findVariant(variantId);
  if (entry && entry.module && typeof entry.module.getTimeline === 'function') {
    timeline.push.apply(timeline, entry.module.getTimeline(jsPsych));
  } else {
    console.error('[Experiment] Variant not found or invalid: ' + variantId);
  }

  // 7. End screen
  timeline.push({
    type:           jsPsychHtmlKeyboardResponse,
    stimulus:
      '<div class="calibration-card" style="text-align:center;">' +
      INSTRUCTIONS.end + '</div>',
    choices:        'NO_KEYS',
    trial_duration: 4000,
    data:           { trial_type: 'end_screen' },
  });

  // 8. Save / finish nodes
  timeline.push.apply(timeline, _buildSaveNodes());

  // Run
  jsPsych.run(timeline);
}

// ---------------------------------------------------------------------------
// Entry point — show dev menu or run directly
// ---------------------------------------------------------------------------
if (CONFIG.dev_menu) {
  DevMenu.show(function (selectedVariantId) {
    _runExperiment(selectedVariantId);
  });
} else {
  _runExperiment(CONFIG.active_variant);
}

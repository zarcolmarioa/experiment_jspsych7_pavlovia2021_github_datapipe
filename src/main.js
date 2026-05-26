// =============================================================================
// src/main.js -- Timeline Assembler
//
// Platform modes (set in config.js):
//   local    -- CONFIG.platform.online = false, CONFIG.platform.github = false
//               Opens index.html directly; CSV downloaded at end.
//   github   -- CONFIG.platform.online = false, CONFIG.platform.github = true
//               Hosted on GitHub Pages; data saved to OSF via DataPipe.
//   pavlovia -- CONFIG.platform.online = true,  CONFIG.platform.github = false
//               Deployed on Pavlovia; data saved by Pavlovia.
// =============================================================================

// ---------------------------------------------------------------------------
// Detect participant ID from URL parameters (Prolific, SONA, custom)
// ---------------------------------------------------------------------------
var _participantId = (function () {
  var urlParams = new URLSearchParams(window.location.search);
  var sources = ['PROLIFIC_PID', 'participant', 'id', 'workerId'];
  for (var i = 0; i < sources.length; i++) {
    var val = urlParams.get(sources[i]);
    if (val) return val;
  }
  return 'local_' + Math.random().toString(36).slice(2, 10);
})();

console.log('[Experiment] Participant ID: ' + _participantId);

// ---------------------------------------------------------------------------
// Initialise jsPsych
// ---------------------------------------------------------------------------
var jsPsych = initJsPsych({

  on_trial_finish: function (data) {
    if (data.trial_type === 'ne_task') {
      console.log(
        '[Trial ' + data.trial_index + '] ' + data.image_id +
        ' | noise: ' + data.noise_level + '%' +
        ' | response: ' + data.response +
        ' | rt: ' + data.rt + 'ms'
      );
    }
  },

  on_finish: function () {
    _removeFullscreenHandler();
    // Local mode only: download CSV directly in the browser.
    // GitHub and Pavlovia modes handle saving via their own timeline nodes.
    if (!CONFIG.platform.online && !CONFIG.platform.github) {
      var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      var filename = CONFIG.experiment.name + '_' + _participantId + '_' + timestamp + '.csv';
      jsPsych.data.get().localSave('csv', filename);
      console.log('[Experiment] Data saved to: ' + filename);
    }
  },
});

// Add participant ID to all data rows (once, jsPsych appends it automatically)
jsPsych.data.addProperties({ participant_id: _participantId });

document.body.style.backgroundColor = CONFIG.display.background_color;

// ---------------------------------------------------------------------------
// Create timeline
// ---------------------------------------------------------------------------
var timeline = [];

// ---------------------------------------------------------------------------
// Pavlovia init -- first timeline node (Pavlovia mode only)
// ---------------------------------------------------------------------------
var pavloviaInfo;

if (CONFIG.platform.online) {
  var pavlovia_init = {
    type: jsPsychPavlovia,
    command: "init",
    setPavloviaInfo: function (info) {
      console.log(info);
      pavloviaInfo = info;
    }
  };
  timeline.push(pavlovia_init);
}

// ---------------------------------------------------------------------------
// Fullscreen escape handler
// ---------------------------------------------------------------------------
var _fullscreenBanner = null;
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

  if (!isFullscreen) {
    _showFullscreenBanner();
  } else {
    _removeBanner();
  }
}

function _showFullscreenBanner() {
  if (_fullscreenBanner) return;

  _fullscreenBanner = document.createElement('div');
  _fullscreenBanner.id = 'fullscreen-banner';
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
    'Return to full screen' +
    '</button>';

  document.body.appendChild(_fullscreenBanner);

  document.getElementById('fs-reenter-btn').addEventListener('click',
    function () {
      var el = document.documentElement;
      var req = el.requestFullscreen      ||
                el.webkitRequestFullscreen ||
                el.mozRequestFullScreen    ||
                el.msRequestFullscreen;
      if (req) req.call(el);
    }
  );
}

function _removeBanner() {
  if (_fullscreenBanner) {
    _fullscreenBanner.remove();
    _fullscreenBanner = null;
  }
}

// ---- 1. Fullscreen --------------------------------------------------------
if (CONFIG.calibration.fullscreen) {
  var fullscreen_trial = {
    type: jsPsychFullscreen,
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
    data: { trial_type: 'fullscreen' },
    on_finish: function () {
      _installFullscreenHandler();
    },
  };
  timeline.push(fullscreen_trial);
}

// ---- 2. Browser check -----------------------------------------------------
var browser_check_fn = {
  type: jsPsychCallFunction,
  func: function () {
    var ua       = navigator.userAgent;
    var isChrome = /Chrome/.test(ua) && !/Edg/.test(ua) && !/OPR/.test(ua);
    var isEdge   = /Edg\//.test(ua);
    window._browserRecommended = isChrome || isEdge;
    jsPsych.data.addProperties({
      browser_recommended: window._browserRecommended,
      user_agent: ua,
    });
  },
};
timeline.push(browser_check_fn);

var browser_warning = {
  type: jsPsychHtmlButtonResponse,
  stimulus: function () {
    if (window._browserRecommended) return '<div style="display:none;"></div>';
    return '<div class="ne-warning">' + INSTRUCTIONS.browser_warning + '</div>';
  },
  choices: function () {
    return window._browserRecommended ? ['_skip_'] : [INSTRUCTIONS.button_continue];
  },
  button_html: '<button class="ne-continue-btn">%choice%</button>',
  trial_duration: function () { return window._browserRecommended ? 0 : null; },
  data: { trial_type: 'browser_warning' },
};
timeline.push(browser_warning);

// ---- 3. Welcome -----------------------------------------------------------
var welcome = {
  type: jsPsychHtmlButtonResponse,
  stimulus: '<div class="calibration-card">' + INSTRUCTIONS.welcome + '</div>',
  choices: [INSTRUCTIONS.button_continue],
  button_html: '<button class="ne-continue-btn">%choice%</button>',
  data: { trial_type: 'instruction', instruction_page: 'welcome' },
};
timeline.push(welcome);

// ---- 4. Calibration intro -------------------------------------------------
var anyCalibration =
  CONFIG.calibration.brightness_confirmation ||
  CONFIG.calibration.device_screen ||
  CONFIG.calibration.resize_card   ||
  CONFIG.calibration.blind_spot    ||
  CONFIG.calibration.gamma         ||
  CONFIG.calibration.contrast_screen ||
  CONFIG.calibration.color_rendering;

if (anyCalibration) {
  var calibration_intro = {
    type: jsPsychHtmlButtonResponse,
    stimulus:
      '<div class="calibration-card">' +
      INSTRUCTIONS.calibration_intro + '</div>',
    choices: [INSTRUCTIONS.button_continue],
    button_html: '<button class="ne-continue-btn">%choice%</button>',
    data: { trial_type: 'instruction', instruction_page: 'calibration_intro' },
  };
  timeline.push(calibration_intro);
}

// ---- 5a. Brightness confirmation ------------------------------------------
if (CONFIG.calibration.brightness_confirmation) {
  timeline.push.apply(timeline, BrightnessConfirmation.getNodes(jsPsych));
}

// ---- 5b. Device & screen check --------------------------------------------
if (CONFIG.calibration.device_screen) {
  timeline.push.apply(timeline, DeviceScreenCalibration.getNodes(jsPsych));
} else {
  var screen_info = {
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
  };
  timeline.push(screen_info);
}

// ---- 5b. Credit card resize -----------------------------------------------
if (CONFIG.calibration.resize_card) {
  timeline.push.apply(timeline, ResizeCardCalibration.getNodes(jsPsych));
}

// ---- 5c. Blind spot -------------------------------------------------------
if (CONFIG.calibration.blind_spot) {
  timeline.push.apply(timeline, BlindSpotCalibration.getNodes(jsPsych));
}

// ---- 5d. Gamma calibration ------------------------------------------------
if (CONFIG.calibration.gamma) {
  timeline.push.apply(timeline, GammaCalibration.getNodes(jsPsych));
}

// ---- 5e. Contrast screen + ambient light ----------------------------------
if (CONFIG.calibration.contrast_screen) {
  timeline.push.apply(timeline, ContrastScreenCalibration.getNodes(jsPsych));
}

// ---- 5f. Colour rendering check -------------------------------------------
if (CONFIG.calibration.color_rendering) {
  timeline.push.apply(timeline, ColorRenderingCalibration.getNodes(jsPsych));
}

// ---- 6. Stimulus evaluation (pre-experimental, separate participant group) -
if (CONFIG.stimulus_evaluation && CONFIG.stimulus_evaluation.enabled) {
  timeline.push.apply(timeline, StimulusEvaluation.getNodes(jsPsych));
}

// ---- 7. NE Task -----------------------------------------------------------
if (CONFIG.ne_task.enabled) {
  timeline.push.apply(timeline, NETask.getNodes(jsPsych));
}

// ---- 8. Emotional salience rating -----------------------------------------
if (CONFIG.ne_task.enabled && CONFIG.salience_rating.enabled) {
  timeline.push.apply(timeline, NETask.getSalienceRatingNodes(jsPsych));
}

// ---- 9. Questionnaires ----------------------------------------------------
if (CONFIG.questionnaires.enabled) {
  timeline.push.apply(timeline, Questionnaires.getNodes(jsPsych));
}

// ---- 10. End screen -------------------------------------------------------
var end_screen = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus:
    '<div class="calibration-card" style="text-align:center;">' +
    INSTRUCTIONS.end + '</div>',
  choices: 'NO_KEYS',
  trial_duration: 4000,
  data: { trial_type: 'end_screen' },
};
timeline.push(end_screen);

// ---- 11. Stamp experiment-level properties --------------------------------
var stamp_properties = {
  type: jsPsychCallFunction,
  func: function () {
    _removeFullscreenHandler();
    jsPsych.data.addProperties({
      experiment_name:     CONFIG.experiment.name,
      experiment_version:  CONFIG.experiment.version,
      task_variant:        CONFIG.experiment.task_variant,
      experiment_end_time: new Date().toISOString(),
    });
  },
};
timeline.push(stamp_properties);

// ---- 12. GitHub + DataPipe save -- (GitHub Pages mode only) ---------------
if (CONFIG.platform.github) {
  var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  var datapipe_filename = _participantId + '_' + timestamp + '.csv';

  var save_data = {
    type: jsPsychPipe,
    action: 'save',
    experiment_id: CONFIG.platform.datapipe_experiment_id,
    filename: datapipe_filename,
    data_string: function () { return jsPsych.data.get().csv(); },
    on_finish: function (data) {
      console.log('[DataPipe] Save attempted. Success: ' + data.success);
    },
  };
  timeline.push(save_data);
}

// ---- 13. Pavlovia finish -- last timeline node (Pavlovia mode only) -------
if (CONFIG.platform.online) {
  var pavlovia_finish = {
    type: jsPsychPavlovia,
    command: "finish",
    dataFilter: function(data) {
      console.log(data);
      console.log(jsPsych.data.get().json());
      return data;
    },
    completedCallback: function() {
      console.log('Data successfully submitted to Pavlovia!');
    }
  };
  timeline.push(pavlovia_finish);
}

// ---------------------------------------------------------------------------
// Start the experiment
// ---------------------------------------------------------------------------
jsPsych.run(timeline);

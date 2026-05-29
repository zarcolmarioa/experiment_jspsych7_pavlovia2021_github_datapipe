// =============================================================================
// src/variants/original-ne.js
// Variant: Original NE Task — Todd et al. (2012) Experiment 1
//
// PROCEDURE (Todd et al. 2012, Experiment 1):
//   Colour IAPS images presented at three noise levels (35%, 45%, 55%).
//   The standard image always has 45% noise.
//   Each image × noise level combination is repeated 3 times across the session.
//   Trials are randomly intermixed (Fisher-Yates shuffle).
//
// TIMELINE assembled by getTimeline(jsPsych):
//   1. Pre-task stimulus evaluation (image rating battery)
//   2. NE task (practice block + main block)
//   3. Emotional salience rating (post-task)
//
// All variant-specific parameters live here. Display settings
// (image dimensions, fixation duration, ISI, etc.) are still
// read from global CONFIG so they can be adjusted without touching
// this file.
// =============================================================================

var OriginalNEVariant = (function () {

  // ---------------------------------------------------------------------------
  // Variant-specific trial parameters
  // Passed to NETask.getNodes() and NETask.getSalienceRatingNodes() so that
  // ne-task.js does not read these directly from CONFIG.
  // ---------------------------------------------------------------------------
  var TRIAL_PARAMS = {
    // Noise levels shown on comparison images (%)
    comparison_levels: [35, 45, 55],

    // Noise level on the standard image (%)
    standard_level: 45,

    // How many times each image × noise level combination is shown
    repetitions: 3,

    // false → each image appears at all noise levels (standard NE procedure)
    // true  → each image gets one randomly assigned noise level
    single_exposure: false,

    // null = no trial cap; set to an integer to limit (e.g. for piloting)
    n_trials: null,

    // null = use CONFIG.stimuli.list (default)
    // Provide an explicit array here to use a subset or different image set
    stimuli_list: null,
  };

  // ---------------------------------------------------------------------------
  // Post-task emotional salience rating configuration
  // Passed to NETask.getSalienceRatingNodes()
  // ---------------------------------------------------------------------------
  var SALIENCE_CONFIG = {
    enabled: true,
    instruction: INSTRUCTIONS.salience_rating_intro || '',
    scale_min:   1,
    scale_max:   7,
    label_min:   'Not at all arousing',
    label_max:   'Extremely arousing',
    // null = use CONFIG.stimuli.list; provide explicit list to use a subset
    stimuli_list: null,
  };

  // ---------------------------------------------------------------------------
  // getTimeline(jsPsych) — returns task nodes for this variant
  // Called by main.js after the calibration battery has been appended.
  // Does NOT include calibration or data-save nodes.
  // ---------------------------------------------------------------------------
  function getTimeline(jsPsych) {
    var nodes = [];

    // 1. Pre-task stimulus evaluation
    //    Reads CONFIG.stimulus_evaluation; skip if not enabled.
    nodes.push.apply(nodes, StimulusEvaluation.getNodes(jsPsych));

    // 2. Main NE task (practice + main block)
    nodes.push.apply(nodes, NETask.getNodes(jsPsych, TRIAL_PARAMS));

    // 3. Emotional salience rating (post-task)
    nodes.push.apply(nodes, NETask.getSalienceRatingNodes(jsPsych, SALIENCE_CONFIG));

    return nodes;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    meta: {
      id:                'original_ne',
      label:             'Original NE task',
      description:       'Replication of Todd et al. (2012) Experiment 1. ' +
                         'Colour IAPS images at three noise levels (35/45/55%). ' +
                         'Each image shown three times per noise level.',
      estimated_minutes: 45,
    },
    getTimeline: getTimeline,
  };

})();

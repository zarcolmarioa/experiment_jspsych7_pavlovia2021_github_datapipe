var CalibrationOnlyVariant = (function () {
  function getTimeline(jsPsych) {
    return [];  // calibration battery always runs in main.js; nothing else needed
  }
  return {
    meta: {
      id:                'calibration_only',
      label:             'Calibration battery only',
      description:       'Runs the full calibration battery and ends. ' +
                         'Use this to test timing, instructions, and screen checks.',
      estimated_minutes: 10,
    },
    getTimeline: getTimeline,
  };
})();
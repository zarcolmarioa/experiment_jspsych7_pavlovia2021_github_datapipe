// =============================================================================
// src/calibration/brightness-confirmation.js
// Pre-calibration step: ask participant to set screen brightness to maximum.
//
// The continue button is disabled until the participant ticks the checkbox,
// ensuring they must actively confirm before proceeding.
//
// OUTPUT (jsPsych data):
//   brightness_confirmed  bool  true if the participant ticked the checkbox
//                               before clicking Continue (always true if they
//                               got past the node, but stored for audit trail)
// =============================================================================

const BrightnessConfirmation = (function () {

  function getNodes(jsPsych) {

    const confirmNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {

        const display = jsPsych.getDisplayElement();

        display.innerHTML =
          '<div class="calibration-card" style="text-align:center;">' +

          '<h2>Before we begin &mdash; Screen brightness</h2>' +

          INSTRUCTIONS.calibration_brightness_intro +

          '<div style="margin:28px auto; max-width:520px;">' +

          '<p style="margin:0 0 16px 0; color:#ccc; font-size:0.95rem; text-align:center;">' +
          INSTRUCTIONS.calibration_brightness_checkbox +
          '</p>' +

          '<div style="display:inline-block; position:relative; ' +
          'left:50%; transform:translateX(-50%); white-space:nowrap; ' +
          'margin-top:8px;">' +
          '<input type="checkbox" id="brightness-checkbox" ' +
          'style="width:22px; height:22px; cursor:pointer; vertical-align:middle; ' +
          'accent-color:#555; margin-right:10px;">' +
          '<span style="font-size:1rem; vertical-align:middle; cursor:pointer;">' +
          'I have set my screen brightness to maximum' +
          '</span>' +
          '</div>' +

          '</div>' +

          '<button id="brightness-continue-btn" class="ne-continue-btn" ' +
          'disabled ' +
          'style="opacity:0.35; cursor:not-allowed;">' +
          INSTRUCTIONS.button_continue +
          '</button>' +

          '</div>';

        const checkbox   = document.getElementById('brightness-checkbox');
        const continueBtn = document.getElementById('brightness-continue-btn');

        // Enable / disable the continue button based on checkbox state
        checkbox.addEventListener('change', function () {
          if (checkbox.checked) {
            continueBtn.disabled = false;
            continueBtn.style.opacity  = '1';
            continueBtn.style.cursor   = 'pointer';
          } else {
            continueBtn.disabled = true;
            continueBtn.style.opacity  = '0.35';
            continueBtn.style.cursor   = 'not-allowed';
          }
        });

        continueBtn.addEventListener('click', function () {
          const confirmed = checkbox.checked;
          jsPsych.data.addProperties({ brightness_confirmed: confirmed });
          console.log('[BrightnessConfirmation] confirmed: ' + confirmed);
          display.innerHTML = '';
          done();
        }, { once: true });
      },

      data: { calibration_step: 'brightness_confirmation' },
    };

    return [confirmNode];
  }

  return { getNodes };

})();

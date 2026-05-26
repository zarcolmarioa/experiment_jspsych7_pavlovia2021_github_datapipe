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

          '<div style="margin:28px auto; max-width:480px; text-align:center; ' +
          'background:rgba(255,255,255,0.05); border:1px solid #555; ' +
          'border-radius:6px; padding:18px 24px;">' +

          '<p style="margin:0 0 16px 0; color:#ffffff; font-size:0.95rem;">' +
          INSTRUCTIONS.calibration_brightness_checkbox +
          '</p>' +

          '<label style="display:flex; align-items:center; justify-content:center; gap:14px;' +
          'cursor:pointer; color:#f0ede8; font-size:1rem;">' +
          '<input type="checkbox" id="brightness-checkbox" ' +
          'style="width:22px; height:22px; cursor:pointer; ' +
          'accent-color:#f0ede8; flex-shrink:0;">' +
          '<span>I have set my screen brightness to maximum</span>' +
          '</label>' +

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

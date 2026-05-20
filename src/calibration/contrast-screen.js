// =============================================================================
// src/calibration/contrast-screen.js
// Module 5: Hidden-Digit Contrast Check + Ambient Light Self-Report
//
// CHANGES:
//   - Unlimited attempts (no MAX_ATTEMPTS limit)
//   - Empty-input validation: "Please type a number first" message
//   - No activation button: participant clicks the input field directly
//   - Instruction text tells participant to place cursor in the white box
// =============================================================================

const ContrastScreenCalibration = (function () {

  const CONTRAST_DELTA = 25;

  function _pickDigit() {
    const pool = CONFIG.calibration.contrast_digit_pool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function _renderDigitCanvas(canvasId, digit) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const bg = 128;
    ctx.fillStyle = 'rgb(' + bg + ',' + bg + ',' + bg + ')';
    ctx.fillRect(0, 0, w, h);
    const fg = Math.min(255, bg + CONTRAST_DELTA);
    ctx.fillStyle = 'rgb(' + fg + ',' + fg + ',' + fg + ')';
    ctx.font = 'bold ' + Math.round(h * 0.6) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(digit), w / 2, h / 2);
  }

  function getNodes(jsPsych) {

    window._contrastDigit    = _pickDigit();
    window._contrastAttempts = 0;
    window._contrastPassed   = false;

    // ---- Node 1: instruction (button click) ---------------------------------
    const contrastInstructionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Display Calibration \u2014 Step 4 of 4</h2>' +
        INSTRUCTIONS.calibration_contrast_intro +
        '</div>',
      choices: [INSTRUCTIONS.button_continue],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { calibration_step: 'contrast_instruction' },
    };

    // ---- Node 2: task -------------------------------------------------------
    const contrastTaskNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {
        const display = jsPsych.getDisplayElement();

        display.innerHTML =
          '<div style="text-align:center; padding:20px 0;">' +

          '<canvas id="contrast-canvas" width="320" height="240" ' +
          'style="display:block; margin:0 auto 20px auto;"></canvas>' +

          '<p style="color:#ccc; font-size:0.9rem; margin-bottom:16px;">' +
          'What number do you see? ' +
          'Click the white box below to place your cursor, type the number, ' +
          'then click <strong style="color:#fff;">Submit</strong>.' +
          '</p>' +

          // Input + Submit row
          '<div style="display:flex; justify-content:center; ' +
          'align-items:center; gap:12px;">' +
          '<input id="contrast-input" type="text" inputmode="numeric" ' +
          'pattern="[0-9]" maxlength="1" autocomplete="off" ' +
          'style="width:90px; font-size:2rem; text-align:center; ' +
          'padding:10px; border:2px solid #aaa; border-radius:3px; ' +
          'background:#f0ede8; cursor:text;">' +
          '<button id="contrast-submit-btn" class="ne-continue-btn" ' +
          'style="margin:0; padding:10px 24px;">Submit</button>' +
          '</div>' +

          '<p id="contrast-feedback" ' +
          'style="color:#e63946; margin-top:14px; font-size:0.85rem; ' +
          'min-height:1.4em;"></p>' +

          '</div>';

        // Short delay ensures any keypress from the previous screen has cleared
        setTimeout(function () {
          _renderDigitCanvas('contrast-canvas', window._contrastDigit);

          const input     = document.getElementById('contrast-input');
          const submitBtn = document.getElementById('contrast-submit-btn');
          const feedback  = document.getElementById('contrast-feedback');
          if (!input || !submitBtn) { display.innerHTML = ''; done(); return; }

          // --- Response logic (unlimited attempts) ---
          function processResponse() {
            var val = input.value.trim();

            // Empty input: prompt to type first
            if (val === '') {
              if (feedback) feedback.textContent =
                'Please type a number first, then click Submit.';
              input.focus();
              return;
            }

            var entered = parseInt(val, 10);
            if (isNaN(entered)) {
              if (feedback) feedback.textContent =
                'Please enter a valid number.';
              input.value = '';
              input.focus();
              return;
            }

            window._contrastAttempts++;

            if (entered === window._contrastDigit) {
              window._contrastPassed  = true;
              window._contrastEntered = entered;
              display.innerHTML = '';
              done();
            } else {
              if (feedback) feedback.textContent =
                'That is not correct. Please look carefully and try again.';
              input.value = '';
              input.focus();
            }
          }

          // Primary: Submit button click
          submitBtn.addEventListener('click', processResponse);

          // Convenience: Enter key in input (fires when input already has
          // focus from the participant clicking it)
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); processResponse(); }
          });

        }, 200);
      },
      data: { calibration_step: 'contrast_task' },
    };

    // ---- Node 3: store result -----------------------------------------------
    const contrastStoreNode = {
      type: jsPsychCallFunction,
      func: function () {
        const passed  = window._contrastPassed  || false;
        const shown   = window._contrastDigit   || null;
        const entered = window._contrastEntered || null;

        jsPsych.data.addProperties({
          contrast_screen_passed: passed,
          contrast_digit_shown:   shown,
          contrast_digit_entered: entered,
          contrast_digit_correct: passed,
          contrast_attempts:      window._contrastAttempts || 0,
        });

        console.log('[ContrastScreen] Digit ' + shown +
                    ' | Entered ' + entered +
                    ' | Correct: ' + passed +
                    ' | Attempts: ' + window._contrastAttempts);

        console.log('[Platform] Calibration step complete: calibration_contrast_screen');
      },
    };

    // ---- Part B: Ambient Light ----------------------------------------------
    const ambientLightNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>One Quick Question</h2>' +
        '<p>' + INSTRUCTIONS.calibration_ambient_question + '</p>' +
        '</div>',
      choices: INSTRUCTIONS.calibration_ambient_options,
      button_html: '<button class="ne-continue-btn" style="margin:4px;">%choice%</button>',
      on_finish: function (data) {
        const labels = ['dark', 'dim', 'bright'];
        const ambientLight = labels[data.response] || 'unknown';
        data.ambient_light = ambientLight;
        jsPsych.data.addProperties({ ambient_light: ambientLight });
        console.log('[AmbientLight] ' + ambientLight);
      },
      data: { calibration_step: 'ambient_light' },
    };

    const nodes = [contrastInstructionNode, contrastTaskNode, contrastStoreNode];
    if (CONFIG.calibration.ambient_light) {
      nodes.push(ambientLightNode);
    }
    return nodes;
  }

  return { getNodes };

})();

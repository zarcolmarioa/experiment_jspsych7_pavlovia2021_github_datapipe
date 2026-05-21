// =============================================================================
// src/calibration/contrast-screen.js
// Module 5: Graduated Contrast Check + Ambient Light Self-Report
//
// CONTRAST CHECK:
//   Three sequential checks are presented, each showing a digit hidden inside
//   a mid-grey square at a different contrast level:
//     Check 1: Δ = 20  (easiest)
//     Check 2: Δ = 12
//     Check 3: Δ =  6  (hardest)
//   A fresh digit is drawn for each check.  Participants have a maximum of
//   two attempts per check.  Whether they pass or fail, the next check begins
//   automatically after brief feedback.  Results are stored for all three
//   levels so post-hoc analysis can characterise display quality on a
//   continuous scale rather than as a binary gate.
//
// AMBIENT LIGHT:
//   A single self-report question with three options labelled A, B, C.
//   The descriptions are shown in the question text; the response buttons
//   carry only the corresponding letter.
//
// OUTPUT (jsPsych data):
//   contrast_delta_1/2/3        -- Δ value for each check
//   contrast_digit_shown_1/2/3  -- digit shown
//   contrast_digit_entered_1/2/3 -- last digit entered by participant
//   contrast_correct_1/2/3      -- whether identified correctly (bool)
//   contrast_attempts_1/2/3     -- number of attempts used (1 or 2)
//   contrast_n_correct          -- number of checks passed out of 3
//   ambient_light               -- 'A', 'B', or 'C'
// =============================================================================

const ContrastScreenCalibration = (function () {

  // Three contrast levels from easiest to hardest (Δ from mid-grey 128/255)
  const CONTRAST_LEVELS     = [20, 12, 6];
  const MAX_ATTEMPTS        = 2;

  function _pickDigit() {
    const pool = CONFIG.calibration.contrast_digit_pool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function _renderDigitCanvas(canvas, digit, delta) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    const bg  = 128;
    ctx.fillStyle = 'rgb(' + bg + ',' + bg + ',' + bg + ')';
    ctx.fillRect(0, 0, w, h);
    const fg  = Math.min(255, bg + delta);
    ctx.fillStyle = 'rgb(' + fg + ',' + fg + ',' + fg + ')';
    ctx.font         = 'bold ' + Math.round(h * 0.6) + 'px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(digit), w / 2, h / 2);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC: getNodes
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    // ---- Node 1: instruction ------------------------------------------------
    const instructionNode = {
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

    // ---- Node 2: three sequential contrast checks ---------------------------
    const taskNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {
        const display = jsPsych.getDisplayElement();
        const results = [];

        // Run one contrast check for a given delta.
        // Resolves to { delta, digit, entered, correct, attempts }.
        function runCheck(checkIndex) {
          return new Promise(function (resolve) {
            var delta    = CONTRAST_LEVELS[checkIndex];
            var digit    = _pickDigit();
            var attempts = 0;
            var entered  = null;
            var total    = CONTRAST_LEVELS.length;

            display.innerHTML =
              '<div style="text-align:center; padding:20px 0;">' +

              '<p style="color:#999; font-family:monospace; font-size:0.8rem; ' +
              'margin-bottom:10px;">Check ' + (checkIndex + 1) +
              ' of ' + total + '</p>' +

              '<canvas id="contrast-canvas" width="320" height="240" ' +
              'style="display:block; margin:0 auto 20px auto;"></canvas>' +

              '<p style="color:#ccc; font-size:0.9rem; margin-bottom:16px;">' +
              'What number do you see? ' +
              'Click the white box, type the number, ' +
              'then click <strong style="color:#fff;">Submit</strong>.' +
              '</p>' +

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
              'style="color:#f0ede8; margin-top:14px; font-size:0.85rem; ' +
              'min-height:1.4em;"></p>' +

              '</div>';

            setTimeout(function () {
              var canvas    = document.getElementById('contrast-canvas');
              var input     = document.getElementById('contrast-input');
              var submitBtn = document.getElementById('contrast-submit-btn');
              var feedback  = document.getElementById('contrast-feedback');

              if (!canvas || !input || !submitBtn) {
                resolve({ delta: delta, digit: digit, entered: null,
                          correct: false, attempts: 0 });
                return;
              }

              _renderDigitCanvas(canvas, digit, delta);

              function processResponse() {
                var val = input.value.trim();

                if (val === '') {
                  if (feedback) feedback.textContent =
                    'Please type a number first, then click Submit.';
                  input.focus();
                  return;
                }

                var parsed = parseInt(val, 10);
                if (isNaN(parsed)) {
                  if (feedback) feedback.textContent =
                    'Please enter a valid number.';
                  input.value = '';
                  input.focus();
                  return;
                }

                attempts++;
                entered = parsed;

                // Remove handlers before resolving to prevent double-fire
                submitBtn.removeEventListener('click', onSubmit);
                input.removeEventListener('keydown', onKey);

                if (parsed === digit) {
                  // Correct — advance silently after brief pause
                  if (feedback) feedback.textContent = '';
                  setTimeout(function () {
                    resolve({ delta: delta, digit: digit, entered: entered,
                              correct: true, attempts: attempts });
                  }, 300);

                } else if (attempts >= MAX_ATTEMPTS) {
                  // Used both attempts
                  if (feedback) {
                    feedback.textContent = 'Moving to the next check.';
                  }
                  setTimeout(function () {
                    resolve({ delta: delta, digit: digit, entered: entered,
                              correct: false, attempts: attempts });
                  }, 1000);

                } else {
                  // First attempt wrong, one more try
                  if (feedback) {
                    feedback.textContent = 'Try again.';
                  }
                  input.value = '';
                  input.focus();
                  // Re-attach handlers for the second attempt
                  submitBtn.addEventListener('click', onSubmit);
                  input.addEventListener('keydown', onKey);
                }
              }

              function onSubmit() { processResponse(); }
              function onKey(e) {
                if (e.key === 'Enter') { e.preventDefault(); processResponse(); }
              }

              submitBtn.addEventListener('click', onSubmit);
              input.addEventListener('keydown', onKey);

            }, 200);
          });
        }

        // Run all checks sequentially
        (async function () {
          for (var i = 0; i < CONTRAST_LEVELS.length; i++) {
            var result = await runCheck(i);
            results.push(result);
          }
          window._contrastResults = results;
          display.innerHTML = '';
          done();
        })();
      },

      data: { calibration_step: 'contrast_task' },
    };

    // ---- Node 3: store all contrast results --------------------------------
    const storeNode = {
      type: jsPsychCallFunction,
      func: function () {
        var results = window._contrastResults || [];
        var nCorrect = results.filter(function (r) { return r.correct; }).length;

        var props = { contrast_n_correct: nCorrect };
        results.forEach(function (r, i) {
          var n = i + 1;
          props['contrast_delta_'        + n] = r.delta;
          props['contrast_digit_shown_'  + n] = r.digit;
          props['contrast_digit_entered_'+ n] = r.entered;
          props['contrast_correct_'      + n] = r.correct;
          props['contrast_attempts_'     + n] = r.attempts;
        });

        jsPsych.data.addProperties(props);

        results.forEach(function (r, i) {
          console.log(
            '[ContrastScreen] Check ' + (i + 1) +
            ' Δ=' + r.delta +
            ' | digit=' + r.digit +
            ' | entered=' + r.entered +
            ' | correct=' + r.correct +
            ' | attempts=' + r.attempts
          );
        });
        console.log('[ContrastScreen] Passed ' + nCorrect + ' of ' +
          CONTRAST_LEVELS.length);
        console.log('[Platform] Calibration step complete: calibration_contrast_screen');
      },
    };

    // ---- Node 4: ambient light (A/B/C) --------------------------------------
    const ambientLightNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>One Quick Question</h2>' +
        INSTRUCTIONS.calibration_ambient_question +
        '</div>',
      choices: INSTRUCTIONS.calibration_ambient_options,
      button_html: '<button class="ne-continue-btn" style="margin:4px; ' +
                   'min-width:60px;">%choice%</button>',
      on_finish: function (data) {
        // Map response index to letter label
        const letters    = ['A', 'B', 'C'];
        const ambientLight = letters[data.response] !== undefined
          ? letters[data.response]
          : 'unknown';
        data.ambient_light = ambientLight;
        jsPsych.data.addProperties({ ambient_light: ambientLight });
        console.log('[AmbientLight] ' + ambientLight);
      },
      data: { calibration_step: 'ambient_light' },
    };

    const nodes = [instructionNode, taskNode, storeNode];
    if (CONFIG.calibration.ambient_light) {
      nodes.push(ambientLightNode);
    }
    return nodes;
  }

  return { getNodes };

})();

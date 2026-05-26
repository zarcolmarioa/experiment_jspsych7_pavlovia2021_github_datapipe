// =============================================================================
// src/calibration/color-rendering.js
// Module: Colour Rendering Check
//
// Two sequential checks test whether the display renders colour correctly:
//   Check 1: Red-green axis
//   Check 2: Yellow-blue axis
//
// METHOD:
//   Each check shows a digit rendered in a colour that is luminance-matched
//   to the grey background (RGB 128,128,128). The digit is invisible on a
//   monochrome or severely desaturated display (equal luminance → same grey)
//   and clearly visible on a correctly calibrated colour display.
//
//   The foreground colour for each axis is randomly selected from two
//   complementary options to prevent response pattern reuse:
//     Red-green:   (200, 91, 128) reddish  OR  (26, 180, 128) greenish
//     Yellow-blue: (138,138,  50) yellowish OR (112, 112, 255) bluish
//   All four foreground values have equal perceived luminance to the
//   background (L ≈ 128 via the standard BT.601 formula).
//
//   Two attempts per check; participant continues regardless of outcome.
//   Failures are flagged for post-hoc filtering.
//
// OUTPUT (jsPsych data):
//   color_check_rg_digit_shown    int
//   color_check_rg_digit_entered  int    last digit entered
//   color_check_rg_correct        bool
//   color_check_rg_attempts       int    1 or 2
//   color_check_rg_fg_rgb         str    e.g. '200,91,128'
//   color_check_yb_digit_shown    int
//   color_check_yb_digit_entered  int
//   color_check_yb_correct        bool
//   color_check_yb_attempts       int
//   color_check_yb_fg_rgb         str
//   color_n_correct               int    0, 1, or 2
// =============================================================================

const ColorRenderingCalibration = (function () {

  const BG_RGB = [128, 128, 128];   // neutral grey background (L ≈ 128)
  const MAX_ATTEMPTS = 2;

  // Luminance-balanced foreground colour options for each axis.
  // Both options in each pair have BT.601 luminance ≈ 128, equal to BG_RGB.
  const CHECKS = [
    {
      id:      'rg',
      label:   'red-green',
      fg_options: [
        [200,  91, 128],   // reddish:   L = 0.299×200 + 0.587×91  + 0.114×128 ≈ 128
        [ 26, 180, 128],   // greenish:  L = 0.299×26  + 0.587×180 + 0.114×128 ≈ 128
      ],
    },
    {
      id:      'yb',
      label:   'yellow-blue',
      fg_options: [
        [138, 138,  50],   // yellowish: L = 0.299×138 + 0.587×138 + 0.114×50  ≈ 128
        [112, 112, 255],   // bluish:    L = 0.299×112 + 0.587×112 + 0.114×255 ≈ 128
      ],
    },
  ];

  function _pickDigit() {
    const pool = CONFIG.calibration.contrast_digit_pool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function _pickFg(check) {
    return check.fg_options[Math.floor(Math.random() * check.fg_options.length)];
  }

  function _renderCanvas(canvas, digit, fgRgb) {
    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    // Background
    ctx.fillStyle =
      'rgb(' + BG_RGB[0] + ',' + BG_RGB[1] + ',' + BG_RGB[2] + ')';
    ctx.fillRect(0, 0, w, h);
    // Digit in luminance-matched colour
    ctx.fillStyle =
      'rgb(' + fgRgb[0] + ',' + fgRgb[1] + ',' + fgRgb[2] + ')';
    ctx.font         = 'bold ' + Math.round(h * 0.6) + 'px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(digit), w / 2, h / 2);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    // ---- Node 1: instruction ------------------------------------------------
    const instructionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Display Colour Check</h2>' +
        INSTRUCTIONS.calibration_color_intro +
        '</div>',
      choices: [INSTRUCTIONS.button_continue],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { calibration_step: 'color_rendering_instruction' },
    };

    // ---- Node 2: two sequential colour checks -------------------------------
    const taskNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {

        const display  = jsPsych.getDisplayElement();
        const results  = {};

        // Run one check and resolve to { digit, entered, correct, attempts, fgRgb }
        function runCheck(check) {
          return new Promise(function (resolve) {
            var digit    = _pickDigit();
            var fgRgb    = _pickFg(check);
            var attempts = 0;
            var entered  = null;

            display.innerHTML =
              '<div style="text-align:center; padding:20px 0;">' +

              '<p style="color:#ccc; font-family:monospace; font-size:0.85rem; ' +
              'margin-bottom:6px;">' +
              INSTRUCTIONS.calibration_color_prompt +
              '</p>' +

              '<p style="color:#999; font-family:monospace; font-size:0.75rem; ' +
              'margin-bottom:20px;">' +
              '(' + check.label + ' check)' +
              '</p>' +

              '<canvas id="color-canvas" width="320" height="240" ' +
              'style="display:block; margin:0 auto 20px auto;"></canvas>' +

              '<div style="display:flex; justify-content:center; ' +
              'align-items:center; gap:12px;">' +
              '<input id="color-input" type="text" inputmode="numeric" ' +
              'pattern="[0-9]" maxlength="1" autocomplete="off" ' +
              'style="width:90px; font-size:2rem; text-align:center; ' +
              'padding:10px; border:2px solid #aaa; border-radius:3px; ' +
              'background:#f0ede8; cursor:text;">' +
              '<button id="color-submit-btn" class="ne-continue-btn" ' +
              'style="margin:0; padding:10px 24px;">Submit</button>' +
              '</div>' +

              '<p id="color-feedback" ' +
              'style="color:#f0ede8; margin-top:14px; font-size:0.85rem; ' +
              'min-height:1.4em;"></p>' +

              '</div>';

            setTimeout(function () {
              var canvas    = document.getElementById('color-canvas');
              var input     = document.getElementById('color-input');
              var submitBtn = document.getElementById('color-submit-btn');
              var feedback  = document.getElementById('color-feedback');

              if (!canvas || !input || !submitBtn) {
                resolve({ digit: digit, entered: null, correct: false,
                          attempts: 0, fgRgb: fgRgb });
                return;
              }

              _renderCanvas(canvas, digit, fgRgb);

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

                submitBtn.removeEventListener('click', onSubmit);
                input.removeEventListener('keydown', onKey);

                if (parsed === digit) {
                  if (feedback) feedback.textContent = '';
                  setTimeout(function () {
                    resolve({ digit: digit, entered: entered, correct: true,
                              attempts: attempts, fgRgb: fgRgb });
                  }, 300);
                } else if (attempts >= MAX_ATTEMPTS) {
                  if (feedback) feedback.textContent = 'Moving to the next check.';
                  setTimeout(function () {
                    resolve({ digit: digit, entered: entered, correct: false,
                              attempts: attempts, fgRgb: fgRgb });
                  }, 1000);
                } else {
                  if (feedback) feedback.textContent = 'Try again.';
                  input.value = '';
                  input.focus();
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

        // Run both checks sequentially
        (async function () {
          for (var c = 0; c < CHECKS.length; c++) {
            var result = await runCheck(CHECKS[c]);
            results[CHECKS[c].id] = result;
          }
          window._colorResults = results;
          display.innerHTML = '';
          done();
        })();
      },

      data: { calibration_step: 'color_rendering_task' },
    };

    // ---- Node 3: store results ----------------------------------------------
    const storeNode = {
      type: jsPsychCallFunction,
      func: function () {
        var r   = window._colorResults || {};
        var rg  = r['rg'] || {};
        var yb  = r['yb'] || {};
        var nCorrect =
          (rg.correct ? 1 : 0) + (yb.correct ? 1 : 0);

        jsPsych.data.addProperties({
          color_check_rg_digit_shown:    rg.digit   !== undefined ? rg.digit   : null,
          color_check_rg_digit_entered:  rg.entered !== undefined ? rg.entered : null,
          color_check_rg_correct:        rg.correct !== undefined ? rg.correct : null,
          color_check_rg_attempts:       rg.attempts!== undefined ? rg.attempts: null,
          color_check_rg_fg_rgb:         rg.fgRgb   ? rg.fgRgb.join(',')       : null,
          color_check_yb_digit_shown:    yb.digit   !== undefined ? yb.digit   : null,
          color_check_yb_digit_entered:  yb.entered !== undefined ? yb.entered : null,
          color_check_yb_correct:        yb.correct !== undefined ? yb.correct : null,
          color_check_yb_attempts:       yb.attempts!== undefined ? yb.attempts: null,
          color_check_yb_fg_rgb:         yb.fgRgb   ? yb.fgRgb.join(',')       : null,
          color_n_correct:               nCorrect,
        });

        console.log('[ColorRendering] RG: digit=' + rg.digit +
          ' entered=' + rg.entered + ' correct=' + rg.correct);
        console.log('[ColorRendering] YB: digit=' + yb.digit +
          ' entered=' + yb.entered + ' correct=' + yb.correct);
        console.log('[ColorRendering] n_correct=' + nCorrect + ' of 2');
        console.log('[Platform] Calibration step complete: calibration_color_rendering');
      },
    };

    return [instructionNode, taskNode, storeNode];
  }

  return { getNodes };

})();

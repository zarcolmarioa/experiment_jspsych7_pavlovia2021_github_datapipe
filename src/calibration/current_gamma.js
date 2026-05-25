// =============================================================================
// src/calibration/gamma.js
// Module 4: Gamma Calibration -- Luminance Matching Task
//
// PROCEDURE:
//   Three sequential luminance matches are collected, each using the
//   standard 50% alternating checkerboard (one white pixel per two pixels).
//   This is the validated method recommended by Roca-Vila et al. (2013).
//   Running three repetitions and taking the median reduces noise from a
//   single measurement without introducing any new pattern artifacts.
//
// GAMMA FORMULA (density = 0.50):
//   gamma = log(0.5) / log(grey / 255)
//   The generalised form log(density)/log(grey/255) is kept so the
//   storeNode code is unchanged and backward-compatible with older data.
//
// CHECKERBOARD PATTERN (drawn at physical pixel resolution × devicePixelRatio):
//   density 0.50: standard alternating checkerboard  (x+y) % 2 === 0
//   This is the finest possible binary pattern: each pixel alternates,
//   so the spatial frequency is above the CSF cutoff at normal viewing
//   distances and the pattern appears as a uniform grey.
//
// STARTING GREY VALUE:
//   Randomised per match in [90, 200] so the grey patch is immediately
//   visible against the page background (#808080 = 128/255) and to
//   reduce anchoring bias.
//
// INTERACTION:
//   A plain grey range slider adjusts the grey patch in real time.
//   Arrow keys adjust the slider natively; Confirm button submits.
//   The slider track is uniformly grey with no fill progression.
//
// ARRANGEMENTS (set via CONFIG.calibration.gamma_arrangement):
//   'split_field' (default): Left half checkerboard | Right half grey
//   'centre_surround': Centre disc vs surrounding ring
//
// OUTPUT:
//   window._estimatedGamma   -- median gamma (float or null)
//   jsPsych data properties:
//     gamma_estimate          -- median gamma across all three matches
//     gamma_grey_match_1/2/3  -- grey value confirmed for each match
//     gamma_density_1/2/3     -- checkerboard density (always 0.50)
//     gamma_estimate_1/2/3    -- individual gamma for each match
//     gamma_arrangement_used  -- arrangement name used
// =============================================================================

const GammaCalibration = (function () {

  const PATCH_SIZE_CSS = 220;  // CSS px: size of each patch square
  const DENSITIES      = [0.50, 0.50, 0.50]; // three repetitions of the standard method

  // Centre-surround geometry
  const CS_OUTER_R_CSS = PATCH_SIZE_CSS / 2;
  const CS_INNER_R_CSS = Math.round(CS_OUTER_R_CSS * 0.45);

  // ---------------------------------------------------------------------------
  // DRAWING: fill checkerboard into an ImageData buffer at physical resolution.
  // density: 0.25 | 0.50 | 0.75 (proportion of white pixels)
  // offsetX: left edge of the region in the buffer (physical px)
  // physW, physH: dimensions of the region in physical px
  // ---------------------------------------------------------------------------
  function _fillCheckerboard(imageData, offsetX, physW, physH, density) {
    const px     = imageData.data;
    const totalW = imageData.width;
    for (let y = 0; y < physH; y++) {
      for (let x = 0; x < physW; x++) {
        const i = (y * totalW + (offsetX + x)) * 4;
        let isWhite;
        if (density === 0.25) {
          // 1 white pixel per 2×2 block (top-left corner)
          isWhite = (x % 2 === 0 && y % 2 === 0);
        } else if (density === 0.75) {
          // 3 white pixels per 2×2 block (all except top-left corner)
          isWhite = !(x % 2 === 0 && y % 2 === 0);
        } else {
          // 0.50 and any other value: standard alternating checkerboard
          isWhite = (x + y) % 2 === 0;
        }
        const val = isWhite ? 255 : 0;
        px[i] = px[i + 1] = px[i + 2] = val;
        px[i + 3] = 255;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // DRAWING: split-field arrangement
  // ---------------------------------------------------------------------------
  function _drawSplitField(canvas, greyValue, density) {
    const dpr      = window.devicePixelRatio || 1;
    const physHalf = Math.round(PATCH_SIZE_CSS * dpr);
    const physH    = Math.round(PATCH_SIZE_CSS * dpr);

    canvas.width        = physHalf * 2;
    canvas.height       = physH;
    canvas.style.width  = (PATCH_SIZE_CSS * 2) + 'px';
    canvas.style.height = PATCH_SIZE_CSS + 'px';

    const ctx           = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Left half: checkerboard at requested density (physical pixels)
    const imgData = ctx.createImageData(physHalf * 2, physH);
    _fillCheckerboard(imgData, 0, physHalf, physH, density);

    // Right half: uniform grey
    const g  = greyValue;
    const px = imgData.data;
    for (let y = 0; y < physH; y++) {
      for (let x = 0; x < physHalf; x++) {
        const i = (y * physHalf * 2 + physHalf + x) * 4;
        px[i] = px[i + 1] = px[i + 2] = g;
        px[i + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // ---------------------------------------------------------------------------
  // DRAWING: centre-surround arrangement
  // ---------------------------------------------------------------------------
  function _drawCentreSurround(canvas, greyValue, density) {
    const orientation       = CONFIG.calibration.gamma_centre_surround_orientation
                              || 'checker_surround';
    const checkerIsSurround = (orientation === 'checker_surround');

    const dpr      = window.devicePixelRatio || 1;
    const physSize = Math.round(PATCH_SIZE_CSS * dpr);
    const cx       = PATCH_SIZE_CSS / 2;
    const cy       = PATCH_SIZE_CSS / 2;

    canvas.width        = physSize;
    canvas.height       = physSize;
    canvas.style.width  = PATCH_SIZE_CSS + 'px';
    canvas.style.height = PATCH_SIZE_CSS + 'px';

    const ctx           = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Step 1: fill entire canvas with checkerboard at physical px resolution
    const imgData = ctx.createImageData(physSize, physSize);
    _fillCheckerboard(imgData, 0, physSize, physSize, density);
    ctx.putImageData(imgData, 0, 0);

    // Step 2: switch to CSS-pixel drawing for the uniform grey region
    ctx.scale(dpr, dpr);
    const g = greyValue;
    ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';

    if (checkerIsSurround) {
      // Grey disc in the centre over the checkerboard surround
      ctx.beginPath();
      ctx.arc(cx, cy, CS_INNER_R_CSS, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Grey surround (annulus) over the checkerboard centre disc
      ctx.beginPath();
      ctx.rect(0, 0, PATCH_SIZE_CSS, PATCH_SIZE_CSS);
      ctx.arc(cx, cy, CS_INNER_R_CSS, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    }
  }

  // ---------------------------------------------------------------------------
  // Master draw dispatcher
  // ---------------------------------------------------------------------------
  function _draw(canvas, greyValue, density) {
    const arrangement = CONFIG.calibration.gamma_arrangement || 'split_field';
    if (arrangement === 'centre_surround') {
      _drawCentreSurround(canvas, greyValue, density);
    } else {
      _drawSplitField(canvas, greyValue, density);
    }
  }

  // ---------------------------------------------------------------------------
  // Patch labels for the UI
  // ---------------------------------------------------------------------------
  function _getPatchLabels() {
    const arrangement       = CONFIG.calibration.gamma_arrangement || 'split_field';
    const orientation       = CONFIG.calibration.gamma_centre_surround_orientation
                              || 'checker_surround';
    const checkerIsSurround = (orientation === 'checker_surround');

    if (arrangement === 'split_field') {
      return { fixed: 'FIXED (checkerboard)', adjust: 'ADJUST' };
    }
    return checkerIsSurround
      ? { fixed: 'FIXED (checkerboard surround)', adjust: 'ADJUST (centre disc)'  }
      : { fixed: 'FIXED (checkerboard disc)',     adjust: 'ADJUST (surround ring)' };
  }

  // ---------------------------------------------------------------------------
  // Gamma computation: generalised for arbitrary checkerboard density
  //   gamma = log(density) / log(grey / 255)
  // Returns null if inputs are out of range.
  // ---------------------------------------------------------------------------
  function _computeGamma(greyValue, density) {
    const n = greyValue / 255;
    if (n <= 0 || n >= 1) return null;
    if (density <= 0 || density >= 1) return null;
    return Math.log(density) / Math.log(n);
  }

  function _median(arr) {
    const valid = arr.filter(function (v) { return v !== null; });
    if (valid.length === 0) return null;
    const s = valid.slice().sort(function (a, b) { return a - b; });
    const m = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function _canvasDisplayWidth() {
    return (CONFIG.calibration.gamma_arrangement || 'split_field') === 'split_field'
      ? PATCH_SIZE_CSS * 2
      : PATCH_SIZE_CSS;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC: getNodes
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    const arrangement = CONFIG.calibration.gamma_arrangement || 'split_field';
    const labels      = _getPatchLabels();
    const canvasW     = _canvasDisplayWidth();

    // ---- Node 1: instruction ------------------------------------------------
    const instructionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Display Calibration \u2014 Step 3 of 4</h2>' +
        INSTRUCTIONS.calibration_gamma_intro +
        '</div>',
      choices: [INSTRUCTIONS.calibration_gamma_button],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { calibration_step: 'gamma_instruction' },
    };

    // ---- Node 2: three sequential matches -----------------------------------
    //
    // BROWSER NOTES (unchanged from previous version):
    //   All browsers: visible ← and → buttons adjust the grey value.
    //   Chrome/Edge only: arrow keys on the confirm button also work.
    //   Firefox: arrow keys are NOT used (fullscreen keydown is unreliable).
    //   window._browserRecommended is set by browser_check_fn in main.js.
    const taskNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {

        const display   = jsPsych.getDisplayElement();
        const matches   = [];

        // Neutral slider CSS: uniform grey track, no fill progression,
        // off-white thumb — provides no positional cue to the answer.
        var sliderCSS =
          '<style>' +
          '#gamma-slider{-webkit-appearance:none;-moz-appearance:none;' +
          'appearance:none;width:' + canvasW + 'px;max-width:100%;height:8px;' +
          'background:#666;border-radius:4px;outline:none;cursor:ew-resize;' +
          'border:none;display:block;margin:18px auto 0 auto;}' +
          '#gamma-slider::-webkit-slider-thumb{-webkit-appearance:none;' +
          'appearance:none;width:26px;height:26px;border-radius:50%;' +
          'background:#f0ede8;border:2px solid #333;cursor:ew-resize;' +
          'box-shadow:none;}' +
          '#gamma-slider::-webkit-slider-runnable-track{background:#666;' +
          'height:8px;border-radius:4px;}' +
          '#gamma-slider::-moz-range-thumb{width:26px;height:26px;' +
          'border-radius:50%;background:#f0ede8;border:2px solid #333;' +
          'cursor:ew-resize;box-shadow:none;}' +
          '#gamma-slider::-moz-range-track{background:#666;height:8px;' +
          'border-radius:4px;}' +
          '#gamma-slider::-moz-range-progress{background:#666;}' +
          '</style>';

        // Build label row HTML (identical across matches)
        var labelRow = '';
        if (arrangement === 'split_field') {
          labelRow =
            '<div style="display:flex; width:' + canvasW + 'px; ' +
            'justify-content:space-between; margin-bottom:6px; max-width:100%;">' +
            '<span style="width:' + PATCH_SIZE_CSS + 'px; text-align:center; ' +
            'color:#aaa; font-size:0.75rem; font-family:monospace;">' +
            labels.fixed + '</span>' +
            '<span style="width:' + PATCH_SIZE_CSS + 'px; text-align:center; ' +
            'color:#aaa; font-size:0.75rem; font-family:monospace;">' +
            labels.adjust + '</span>' +
            '</div>';
        } else {
          labelRow =
            '<div style="width:' + canvasW + 'px; text-align:center; ' +
            'margin-bottom:6px; max-width:100%;">' +
            '<span style="color:#aaa; font-size:0.75rem; font-family:monospace;">' +
            labels.fixed + ' / ' + labels.adjust + '</span>' +
            '</div>';
        }

        // Run one match and return a Promise that resolves to {grey, density}
        function runMatch(matchIndex) {
          return new Promise(function (resolve) {
            var density   = DENSITIES[matchIndex];
            // Randomise starting grey in [90, 200]: immediately visible
            // against the #808080 background and reduces anchoring bias.
            var greyValue = 90 + Math.floor(Math.random() * 111);
            var total     = DENSITIES.length;

            display.innerHTML =
              sliderCSS +
              '<div style="text-align:center; padding:20px 0;">' +

              '<p style="color:#999; font-family:monospace; font-size:0.8rem; ' +
              'margin-bottom:6px;">Match ' + (matchIndex + 1) + ' of ' + total + '</p>' +

              '<p style="color:#ccc; font-family:monospace; font-size:0.85rem; ' +
              'margin-bottom:20px; max-width:600px; ' +
              'margin-left:auto; margin-right:auto;">' +
              INSTRUCTIONS.calibration_gamma_prompt +
              '</p>' +

              '<div style="display:inline-block;">' +
              labelRow +
              '<canvas id="gamma-canvas" ' +
              'style="display:block; image-rendering:pixelated; ' +
              'image-rendering:crisp-edges; max-width:100%; ' +
              'border:1px solid #555;">' +
              '</canvas>' +
              '</div>' +

              '<input type="range" id="gamma-slider" ' +
              'min="0" max="255" value="' + greyValue + '">' +

              '<div style="margin-top:20px;">' +
              '<button id="gamma-confirm-btn" class="ne-continue-btn" ' +
              'style="min-width:160px;">' +
              INSTRUCTIONS.calibration_gamma_confirm_button +
              '</button>' +
              '</div>' +

              '<p style="color:#555; font-size:0.75rem; margin-top:10px;">' +
              'Drag the slider or use \u2190 \u2192 keys to adjust \u00b7 ' +
              'Click Confirm when done' +
              '</p>' +

              '</div>';

            var canvas     = document.getElementById('gamma-canvas');
            var slider     = document.getElementById('gamma-slider');
            var btnConfirm = document.getElementById('gamma-confirm-btn');

            if (!canvas || !slider || !btnConfirm) {
              resolve({ grey: greyValue, density: density });
              return;
            }

            _draw(canvas, greyValue, density);

            function onSliderInput() {
              greyValue = parseInt(slider.value, 10);
              _draw(canvas, greyValue, density);
            }

            function onConfirm() {
              slider.removeEventListener('input', onSliderInput);
              slider.removeEventListener('keydown', onSliderKey);
              btnConfirm.removeEventListener('click', onConfirm);
              resolve({ grey: greyValue, density: density });
            }

            function onSliderKey(e) {
              if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                onConfirm();
              }
            }

            slider.addEventListener('input', onSliderInput);
            slider.addEventListener('keydown', onSliderKey);
            btnConfirm.addEventListener('click', onConfirm, { once: true });

            setTimeout(function () { slider.focus(); }, 0);
          });
        }

        // Run all matches sequentially
        (async function () {
          for (var i = 0; i < DENSITIES.length; i++) {
            var result = await runMatch(i);
            matches.push(result);
          }
          window._gammaMatches     = matches;
          window._gammaArrangement = arrangement;
          display.innerHTML = '';
          done();
        })();
      },

      data: { calibration_step: 'gamma_task' },

      on_finish: function (data) {
        data.gamma_matches     = window._gammaMatches;
        data.gamma_arrangement = window._gammaArrangement;
      },
    };

    // ---- Node 3: compute final gamma and store to jsPsych data -------------
    const storeNode = {
      type: jsPsychCallFunction,
      func: function () {
        var matches = window._gammaMatches || [];

        var gammaValues = matches.map(function (m) {
          return _computeGamma(m.grey, m.density);
        });
        var finalGamma = _median(gammaValues);
        window._estimatedGamma = finalGamma;

        var props = {
          gamma_estimate:         finalGamma !== null
                                    ? parseFloat(finalGamma.toFixed(3))
                                    : null,
          gamma_arrangement_used: window._gammaArrangement || 'unknown',
        };

        matches.forEach(function (m, i) {
          var n     = i + 1;
          var gamma = _computeGamma(m.grey, m.density);
          props['gamma_grey_match_' + n] = m.grey;
          props['gamma_density_'   + n] = m.density;
          props['gamma_estimate_'  + n] = gamma !== null
                                            ? parseFloat(gamma.toFixed(3))
                                            : null;
        });

        jsPsych.data.addProperties(props);

        console.log('[Gamma] arrangement: ' + (window._gammaArrangement || 'unknown'));
        matches.forEach(function (m, i) {
          var g = _computeGamma(m.grey, m.density);
          console.log(
            '[Gamma] match ' + (i + 1) + ': density=' + m.density +
            '  grey=' + m.grey + '/255' +
            '  gamma=' + (g !== null ? g.toFixed(3) : 'null')
          );
        });
        console.log('[Gamma] final (median): ' +
          (finalGamma !== null ? finalGamma.toFixed(3) : 'null'));
        console.log('[Platform] Calibration step complete: calibration_gamma');
      },
    };

    return [instructionNode, taskNode, storeNode];
  }

  return { getNodes };

})();

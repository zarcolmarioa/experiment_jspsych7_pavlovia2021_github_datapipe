// =============================================================================
// src/calibration/gamma.js
// Module 4: Gamma Calibration -- Luminance Matching Task
//
// PROCEDURE:
//   Three sequential luminance matches are collected, each using a
//   checkerboard of a different density (proportion of white pixels).
//   The densities used are 0.375, 0.50, and 0.625 — values that the
//   Bayer 4×4 dither matrix can achieve exactly with no rounding error.
//   They are presented in a RANDOMISED ORDER that differs across participants.
//
//   Using three different densities:
//     (a) Reduces noise: the final gamma is the median of three estimates.
//     (b) Probes gamma at different luminance operating points: if the
//         display follows a perfect power law, all three estimates agree;
//         spread indicates non-linearity.
//
// GAMMA FORMULA (generalised for arbitrary density):
//   Checkerboard at density d has average luminance = d in linear space.
//   For the grey patch to match: (grey/255)^gamma = d
//   Solving: gamma = log(d) / log(grey/255)
//   At d = 0.5 this reduces to the standard formula.
//
// CHECKERBOARD PATTERNS (drawn at physical pixel resolution × devicePixelRatio):
//   density 0.50:  standard alternating checkerboard  (x+y) % 2 === 0
//                  finest pattern — above CSF cutoff at normal viewing distance
//   density 0.375: Bayer 4×4 ordered dither, threshold < 6/16
//                  6/16 = 0.375 exactly — no directional stripe artifact
//   density 0.625: Bayer 4×4 ordered dither, threshold < 10/16
//                  10/16 = 0.625 exactly — no directional stripe artifact
//   Legacy (0.25, 0.75): 2×2 block patterns retained for backward compatibility
//
// BAYER 4×4 MATRIX (standard ordered dither, index 0-15):
//    0  8  2 10
//   12  4 14  6
//    3 11  1  9
//   15  7 13  5
//
// STARTING GREY VALUE:
//   Randomised per match in the range [90, 200] to ensure the grey patch is
//   immediately visible against the page background (#808080 = 128/255)
//   and to reduce anchoring bias.
//
// INTERACTION:
//   A plain grey range slider lets participants adjust the grey patch.
//   The slider track is uniformly grey with no fill progression so it
//   provides no positional cue to the correct answer.  Arrow keys also
//   adjust the slider natively.  A Confirm button submits the match.
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
//     gamma_density_1/2/3     -- checkerboard density for each match
//     gamma_estimate_1/2/3    -- individual gamma for each match
//     gamma_arrangement_used  -- arrangement name used
// =============================================================================

const GammaCalibration = (function () {

  const PATCH_SIZE_CSS = 220;  // CSS px: size of each patch square
  const DENSITIES      = [0.375, 0.50, 0.625]; // presented in randomised order

  // Bayer 4×4 ordered dither matrix (values 0–15)
  // For density d: pixel is white if BAYER_4X4[y%4][x%4] < d * 16
  const BAYER_4X4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
  ];

  // Centre-surround geometry
  const CS_OUTER_R_CSS = PATCH_SIZE_CSS / 2;
  const CS_INNER_R_CSS = Math.round(CS_OUTER_R_CSS * 0.45);

  // ---------------------------------------------------------------------------
  // Fisher-Yates shuffle (in-place)
  // ---------------------------------------------------------------------------
  function _shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // ---------------------------------------------------------------------------
  // DRAWING: fill checkerboard into an ImageData buffer at physical resolution.
  // density: proportion of white pixels (0–1)
  // offsetX: left edge of the region in the buffer (physical px)
  // physW, physH: dimensions of the region in physical px
  // ---------------------------------------------------------------------------
  function _fillCheckerboard(imageData, offsetX, physW, physH, density) {
    var px     = imageData.data;
    var totalW = imageData.width;
    var thresh = density * 16;
    for (var y = 0; y < physH; y++) {
      for (var x = 0; x < physW; x++) {
        var i = (y * totalW + (offsetX + x)) * 4;
        var isWhite;
        if (density === 0.50) {
          // Standard alternating checkerboard: finest pattern, above CSF cutoff
          isWhite = (x + y) % 2 === 0;
        } else if (density === 0.25) {
          // Legacy 2×2 block: top-left corner only
          isWhite = (x % 2 === 0 && y % 2 === 0);
        } else if (density === 0.75) {
          // Legacy 2×2 block: all except top-left corner
          isWhite = !(x % 2 === 0 && y % 2 === 0);
        } else {
          // Bayer 4×4 ordered dither: no directional stripe artifact
          // Works for any density; exact for multiples of 1/16
          isWhite = BAYER_4X4[y % 4][x % 4] < thresh;
        }
        var val = isWhite ? 255 : 0;
        px[i] = px[i + 1] = px[i + 2] = val;
        px[i + 3] = 255;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // DRAWING: split-field arrangement
  // ---------------------------------------------------------------------------
  function _drawSplitField(canvas, greyValue, density) {
    var dpr      = window.devicePixelRatio || 1;
    var physHalf = Math.round(PATCH_SIZE_CSS * dpr);
    var physH    = Math.round(PATCH_SIZE_CSS * dpr);

    canvas.width        = physHalf * 2;
    canvas.height       = physH;
    canvas.style.width  = (PATCH_SIZE_CSS * 2) + 'px';
    canvas.style.height = PATCH_SIZE_CSS + 'px';

    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Left half: checkerboard at requested density (physical pixels)
    var imgData = ctx.createImageData(physHalf * 2, physH);
    _fillCheckerboard(imgData, 0, physHalf, physH, density);

    // Right half: uniform grey
    var g  = greyValue;
    var px = imgData.data;
    for (var y = 0; y < physH; y++) {
      for (var x = 0; x < physHalf; x++) {
        var i = (y * physHalf * 2 + physHalf + x) * 4;
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
    var orientation       = CONFIG.calibration.gamma_centre_surround_orientation
                            || 'checker_surround';
    var checkerIsSurround = (orientation === 'checker_surround');

    var dpr      = window.devicePixelRatio || 1;
    var physSize = Math.round(PATCH_SIZE_CSS * dpr);
    var cx       = PATCH_SIZE_CSS / 2;
    var cy       = PATCH_SIZE_CSS / 2;

    canvas.width        = physSize;
    canvas.height       = physSize;
    canvas.style.width  = PATCH_SIZE_CSS + 'px';
    canvas.style.height = PATCH_SIZE_CSS + 'px';

    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Fill entire canvas with checkerboard at physical px resolution
    var imgData = ctx.createImageData(physSize, physSize);
    _fillCheckerboard(imgData, 0, physSize, physSize, density);
    ctx.putImageData(imgData, 0, 0);

    // Overlay the uniform grey region in CSS-pixel space
    ctx.scale(dpr, dpr);
    var g = greyValue;
    ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';

    if (checkerIsSurround) {
      ctx.beginPath();
      ctx.arc(cx, cy, CS_INNER_R_CSS, 0, Math.PI * 2);
      ctx.fill();
    } else {
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
    var arrangement = CONFIG.calibration.gamma_arrangement || 'split_field';
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
    var arrangement       = CONFIG.calibration.gamma_arrangement || 'split_field';
    var orientation       = CONFIG.calibration.gamma_centre_surround_orientation
                            || 'checker_surround';
    var checkerIsSurround = (orientation === 'checker_surround');

    if (arrangement === 'split_field') {
      return { fixed: 'FIXED (checkerboard)', adjust: 'ADJUST' };
    }
    return checkerIsSurround
      ? { fixed: 'FIXED (checkerboard surround)', adjust: 'ADJUST (centre disc)'  }
      : { fixed: 'FIXED (checkerboard disc)',     adjust: 'ADJUST (surround ring)' };
  }

  // ---------------------------------------------------------------------------
  // Gamma computation: generalised for arbitrary density
  // ---------------------------------------------------------------------------
  function _computeGamma(greyValue, density) {
    var n = greyValue / 255;
    if (n <= 0 || n >= 1) return null;
    if (density <= 0 || density >= 1) return null;
    return Math.log(density) / Math.log(n);
  }

  function _median(arr) {
    var valid = arr.filter(function (v) { return v !== null; });
    if (valid.length === 0) return null;
    var s = valid.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
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

    var arrangement = CONFIG.calibration.gamma_arrangement || 'split_field';
    var labels      = _getPatchLabels();
    var canvasW     = _canvasDisplayWidth();

    // ---- Node 1: instruction ------------------------------------------------
    var instructionNode = {
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
    var taskNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {

        var display = jsPsych.getDisplayElement();
        var matches = [];

        // Randomise the density order once per participant
        var shuffledDensities = _shuffle(DENSITIES.slice());

        // Label row above the canvas
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

        // Neutral slider CSS:
        //   - Uniform grey track with NO fill progression on either browser
        //   - White thumb, dark border
        //   - No tooltip, no percentage, no number display
        var sliderCSS =
          '<style>' +
          '#gamma-slider {' +
          '  -webkit-appearance: none;' +
          '  -moz-appearance: none;' +
          '  appearance: none;' +
          '  width: ' + canvasW + 'px;' +
          '  max-width: 100%;' +
          '  height: 8px;' +
          '  background: #666;' +
          '  border-radius: 4px;' +
          '  outline: none;' +
          '  cursor: ew-resize;' +
          '  border: none;' +
          '  display: block;' +
          '  margin: 18px auto 0 auto;' +
          '}' +
          // Chrome / Safari / Edge: thumb
          '#gamma-slider::-webkit-slider-thumb {' +
          '  -webkit-appearance: none;' +
          '  appearance: none;' +
          '  width: 26px;' +
          '  height: 26px;' +
          '  border-radius: 50%;' +
          '  background: #f0ede8;' +
          '  border: 2px solid #333;' +
          '  cursor: ew-resize;' +
          '  box-shadow: none;' +
          '}' +
          // Chrome / Safari / Edge: track — uniform grey, no blue fill
          '#gamma-slider::-webkit-slider-runnable-track {' +
          '  background: #666;' +
          '  height: 8px;' +
          '  border-radius: 4px;' +
          '}' +
          // Firefox: thumb
          '#gamma-slider::-moz-range-thumb {' +
          '  width: 26px;' +
          '  height: 26px;' +
          '  border-radius: 50%;' +
          '  background: #f0ede8;' +
          '  border: 2px solid #333;' +
          '  cursor: ew-resize;' +
          '  box-shadow: none;' +
          '}' +
          // Firefox: track
          '#gamma-slider::-moz-range-track {' +
          '  background: #666;' +
          '  height: 8px;' +
          '  border-radius: 4px;' +
          '}' +
          // Firefox: filled portion before thumb — matches track so no visible progress
          '#gamma-slider::-moz-range-progress {' +
          '  background: #666;' +
          '}' +
          '</style>';

        // Run one match for a given shuffled density index
        function runMatch(matchIndex) {
          return new Promise(function (resolve) {
            var density   = shuffledDensities[matchIndex];
            // Randomise starting grey in [90, 200] so the patch is immediately
            // visible against the page background (#808080 = 128) and to
            // reduce anchoring bias across participants.
            var greyValue = 90 + Math.floor(Math.random() * 111);
            var total     = shuffledDensities.length;

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
              'border: 1px solid #555;">' +
              '</canvas>' +
              '</div>' +

              // Slider — no readout, no labels, no value display.
              // Initial value set from the randomised greyValue.
              '<input type="range" id="gamma-slider" ' +
              'min="0" max="255" value="' + greyValue + '">' +

              '<div style="margin-top:20px;">' +
              '<button id="gamma-confirm-btn" class="ne-continue-btn" ' +
              'style="min-width:160px;">' +
              INSTRUCTIONS.calibration_gamma_confirm_button +
              '</button>' +
              '</div>' +

              '<p style="color:#555; font-size:0.75rem; margin-top:10px;">' +
              'Drag the slider or use \u2190 \u2192 keys to adjust &middot; ' +
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

            // Slider adjusts the grey patch in real time
            function onSliderInput() {
              greyValue = parseInt(slider.value, 10);
              _draw(canvas, greyValue, density);
            }

            function onConfirm() {
              slider.removeEventListener('input', onSliderInput);
              btnConfirm.removeEventListener('click', onConfirm);
              slider.removeEventListener('keydown', onSliderKey);
              resolve({ grey: greyValue, density: density });
            }

            // Space on the slider or confirm button submits
            function onSliderKey(e) {
              if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                onConfirm();
              }
            }

            slider.addEventListener('input', onSliderInput);
            slider.addEventListener('keydown', onSliderKey);
            btnConfirm.addEventListener('click', onConfirm, { once: true });

            // Focus the slider so arrow keys work immediately
            setTimeout(function () { slider.focus(); }, 0);
          });
        }

        // Run all matches in randomised order
        (async function () {
          for (var i = 0; i < shuffledDensities.length; i++) {
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
    var storeNode = {
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
          props['gamma_density_'   + n]  = m.density;
          props['gamma_estimate_'  + n]  = gamma !== null
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

// =============================================================================
// src/calibration/gamma.js
// Module 4: Gamma Calibration -- Luminance Matching Task
//
// PROCEDURE:
//   Three sequential luminance matches are collected, each using a
//   checkerboard of a different density (proportion of white pixels):
//     Match 1: density 0.25  (25% white, 75% black)
//     Match 2: density 0.50  (50% white, 50% black) -- standard
//     Match 3: density 0.75  (75% white, 25% black)
//
//   Using three different densities:
//     (a) Reduces noise: the final gamma is the median of three estimates
//         rather than a single measurement.
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
// CHECKERBOARD PATTERNS (2×2 block at physical pixel level):
//   density 0.25: white only at top-left corner of each 2×2 block
//                  i.e. x%2==0 && y%2==0
//   density 0.50: standard alternating checkerboard  (x+y)%2==0
//   density 0.75: all except top-left corner of each 2×2 block
//                  i.e. !(x%2==0 && y%2==0)
//   All patterns are drawn at physical pixel resolution (×devicePixelRatio)
//   for accurate spatial averaging on HiDPI displays.
//
// ARRANGEMENTS (set via CONFIG.calibration.gamma_arrangement):
//   'split_field' (default):
//     Left half: checkerboard  |  Right half: adjustable grey
//     Recommended by Roca-Vila et al. (2013, Displays) for online use.
//   'centre_surround':
//     Centre disc vs surrounding ring (see orientation config).
//
// INTERACTION:
//   ← and → buttons on all browsers; arrow keys on Chrome/Edge as shortcut.
//   Firefox is detected via window._browserRecommended (set in main.js).
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
  const INITIAL_GREY   = 128;  // starting grey value (reset for each match)
  const DENSITIES      = [0.25, 0.50, 0.75]; // checkerboard densities (3 matches)

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
      return { fixed: 'FIXED (checkerboard)', adjust: 'ADJUST \u2190 \u2192' };
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
        const isFirefox = !window._browserRecommended;
        const matches   = [];

        var arrowBtnStyle =
          'width:52px; height:52px; font-size:1.4rem; ' +
          'background:#444; color:#fff; border:2px solid #888; ' +
          'border-radius:4px; cursor:pointer; ' +
          'font-family:Georgia,serif; line-height:1; ' +
          'display:inline-flex; align-items:center; justify-content:center;';

        var keyHint = isFirefox
          ? 'Click \u2190 \u2192 to adjust \u00b7 Click Confirm when done'
          : '\u2190 \u2192 keys or buttons to adjust \u00b7 Space or Confirm button when done';

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
            var density    = DENSITIES[matchIndex];
            var greyValue  = INITIAL_GREY;
            var total      = DENSITIES.length;

            display.innerHTML =
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
              'image-rendering:crisp-edges; max-width:100%;">' +
              '</canvas>' +
              '</div>' +

              '<p id="gamma-readout" ' +
              'style="color:#888; margin-top:14px; font-size:0.75rem; ' +
              'font-family:monospace;">' +
              'Grey value: ' + INITIAL_GREY +
              '</p>' +

              '<div style="display:flex; align-items:center; justify-content:center; ' +
              'gap:16px; margin-top:16px;">' +

              '<button id="gamma-left-btn" style="' + arrowBtnStyle + '">' +
              '\u2190' +
              '</button>' +

              '<button id="gamma-confirm-btn" class="ne-continue-btn" ' +
              'style="min-width:160px;">' +
              INSTRUCTIONS.calibration_gamma_confirm_button +
              '</button>' +

              '<button id="gamma-right-btn" style="' + arrowBtnStyle + '">' +
              '\u2192' +
              '</button>' +

              '</div>' +

              '<p style="color:#555; font-size:0.75rem; margin-top:10px;">' +
              keyHint +
              '</p>' +

              '</div>';

            var canvas     = document.getElementById('gamma-canvas');
            var btnLeft    = document.getElementById('gamma-left-btn');
            var btnRight   = document.getElementById('gamma-right-btn');
            var btnConfirm = document.getElementById('gamma-confirm-btn');
            var readout    = document.getElementById('gamma-readout');

            if (!canvas || !btnConfirm) {
              resolve({ grey: INITIAL_GREY, density: density });
              return;
            }

            _draw(canvas, greyValue, density);

            function adjustGrey(delta) {
              greyValue = Math.max(0, Math.min(255, greyValue + delta));
              _draw(canvas, greyValue, density);
              if (readout) readout.textContent = 'Grey value: ' + greyValue;
            }

            function onConfirm() {
              btnLeft.removeEventListener('click', onLeft);
              btnRight.removeEventListener('click', onRight);
              btnConfirm.removeEventListener('click', onConfirm);
              if (!isFirefox) btnConfirm.removeEventListener('keydown', onKey);
              resolve({ grey: greyValue, density: density });
            }

            function onLeft()  { adjustGrey(-1); }
            function onRight() { adjustGrey(+1); }

            btnLeft.addEventListener('click',  onLeft);
            btnRight.addEventListener('click', onRight);
            btnConfirm.addEventListener('click', onConfirm, { once: true });

            function onKey(e) {
              if      (e.code === 'ArrowLeft')                   { e.preventDefault(); adjustGrey(-1); }
              else if (e.code === 'ArrowRight')                  { e.preventDefault(); adjustGrey(+1); }
              else if (e.code === 'Space' || e.key === ' ')      { e.preventDefault(); btnConfirm.click(); }
            }

            if (!isFirefox) {
              btnConfirm.addEventListener('keydown', onKey);
              setTimeout(function () { btnConfirm.focus(); }, 0);
            }
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

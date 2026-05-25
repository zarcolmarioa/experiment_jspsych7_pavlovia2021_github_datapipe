// =============================================================================
// src/calibration/gamma.js
// Module 4: Gamma Calibration -- Luminance Matching Task
//
// ARRANGEMENTS (set via CONFIG.calibration.gamma_arrangement):
//
//   'split_field' (default):
//     Left half: checkerboard  |  Right half: adjustable grey
//     Both halves share a hard vertical border, no gap.
//     Recommended by Roca-Vila et al. (2013, Displays) for online use.
//
//   'centre_surround':
//     One patch is a filled disc in the centre of the canvas.
//     The other is a ring (annulus) surrounding it, sharing a circular border.
//     Orientation set via CONFIG.calibration.gamma_centre_surround_orientation:
//       'checker_surround' (recommended): checkerboard ring, grey disc centre
//       'grey_surround':                  grey ring, checkerboard disc centre
//     Note: centre-surround introduces a simultaneous contrast bias when the
//     surround is uniform grey. Using checkerboard as the surround minimises
//     this because its spatial average is close to mid-grey.
//
// FOCUS STRATEGY:
//   Uses a persistent confirm button for keyboard input (no claimViaClick).
//   The canvas shows a "click to begin" overlay. The participant's click
//   grants the canvas natural keyboard focus (100% reliable cross-browser).
//   Arrow keys then adjust the grey value; Space confirms the match.
//
// PHYSICS:
//   Checkerboard = 50% black + 50% white at physical pixel level.
//   Effective physical luminance = 0.5 in linear light space.
//   Display gamma encodes: L = (V/255)^gamma  where V is digital value.
//   For grey patch to match: (grey/255)^gamma = 0.5
//   Solving: gamma = log(0.5) / log(grey/255)
//
//   DPI: checkerboard drawn at PHYSICAL pixel resolution (times devicePixelRatio)
//   to get true 1-physical-pixel alternation on Retina/HiDPI displays.
//
// OUTPUT:
//   window._estimatedGamma   -- float or null
//   window._gammaFlag        -- 'ok' | 'out_of_range' | 'invalid'
//   jsPsych data: estimated_gamma, gamma_grey_match_value, gamma_flag,
//                 gamma_arrangement_used
// =============================================================================

const GammaCalibration = (function () {

  const PATCH_SIZE_CSS  = 220;  // CSS px: size of each patch square
  const INITIAL_GREY    = 128;  // starting grey value (0-255)

  // Centre-surround geometry
  // Outer radius = half of PATCH_SIZE_CSS; inner (disc) radius = 40% of that
  const CS_OUTER_R_CSS  = PATCH_SIZE_CSS / 2;
  const CS_INNER_R_CSS  = Math.round(CS_OUTER_R_CSS * 0.45);

  // ============================================================
  // DRAWING: SPLIT-FIELD
  // ============================================================

  // Draw checkerboard into left half of an ImageData buffer.
  // physW and physH are the physical pixel dimensions of ONE half.
  function _fillCheckerboard(imageData, offsetX, physW, physH) {
    const px = imageData.data;
    const totalW = imageData.width; // full canvas width in physical px
    for (let y = 0; y < physH; y++) {
      for (let x = 0; x < physW; x++) {
        const i   = (y * totalW + (offsetX + x)) * 4;
        const val = (x + y) % 2 === 0 ? 255 : 0;
        px[i] = px[i+1] = px[i+2] = val;
        px[i+3] = 255;
      }
    }
  }

  function _drawSplitField(canvas, greyValue) {
    const dpr      = window.devicePixelRatio || 1;
    const physHalf = Math.round(PATCH_SIZE_CSS * dpr);
    const physH    = Math.round(PATCH_SIZE_CSS * dpr);

    canvas.width        = physHalf * 2;
    canvas.height       = physH;
    canvas.style.width  = (PATCH_SIZE_CSS * 2) + 'px';
    canvas.style.height = PATCH_SIZE_CSS + 'px';

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Left half: checkerboard (physical pixels, no ctx.scale)
    const imgData = ctx.createImageData(physHalf * 2, physH);
    _fillCheckerboard(imgData, 0, physHalf, physH);

    // Right half: uniform grey
    const g = greyValue;
    const px = imgData.data;
    for (let y = 0; y < physH; y++) {
      for (let x = 0; x < physHalf; x++) {
        const i = (y * physHalf * 2 + physHalf + x) * 4;
        px[i] = px[i+1] = px[i+2] = g;
        px[i+3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // ============================================================
  // DRAWING: CENTRE-SURROUND
  // ============================================================
  // Canvas is PATCH_SIZE_CSS x PATCH_SIZE_CSS (square).
  // Centre disc radius = CS_INNER_R_CSS, drawn at CSS-pixel level.
  // Surround annulus fills the rest.
  // The checkerboard is drawn at physical pixel resolution everywhere
  // it appears, using an off-screen canvas clipped by the appropriate shape.

  function _drawCentreSurround(canvas, greyValue) {
    const orientation = CONFIG.calibration.gamma_centre_surround_orientation
                        || 'checker_surround';
    const checkerIsSurround = (orientation === 'checker_surround');

    const dpr      = window.devicePixelRatio || 1;
    const physSize = Math.round(PATCH_SIZE_CSS * dpr);
    const cx       = PATCH_SIZE_CSS / 2;   // CSS px centre
    const cy       = PATCH_SIZE_CSS / 2;

    canvas.width        = physSize;
    canvas.height       = physSize;
    canvas.style.width  = PATCH_SIZE_CSS + 'px';
    canvas.style.height = PATCH_SIZE_CSS + 'px';

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // -- Step 1: fill entire canvas with checkerboard at physical px --
    const imgData = ctx.createImageData(physSize, physSize);
    _fillCheckerboard(imgData, 0, physSize, physSize);
    ctx.putImageData(imgData, 0, 0);

    // -- Step 2: switch to CSS-pixel drawing for the uniform grey region --
    // ctx.scale so subsequent draws use CSS coordinates
    ctx.scale(dpr, dpr);

    const g = greyValue;
    ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';

    if (checkerIsSurround) {
      // Checkerboard is SURROUND -> grey disc in CENTRE
      ctx.beginPath();
      ctx.arc(cx, cy, CS_INNER_R_CSS, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Grey is SURROUND -> checker disc in CENTRE
      // Paint grey over everything, then punch out the centre circle
      // to reveal the checkerboard underneath.
      // We do this by filling with grey EXCEPT the disc region.
      // Canvas doesn't have a subtract operation directly, so we use
      // an even-odd winding rule fill with two paths:
      //   outer rect + inner circle = annulus
      ctx.beginPath();
      ctx.rect(0, 0, PATCH_SIZE_CSS, PATCH_SIZE_CSS); // outer rect
      ctx.arc(cx, cy, CS_INNER_R_CSS, 0, Math.PI * 2, true); // inner circle (counterclockwise = hole)
      ctx.fill('evenodd');
    }
  }

  // ============================================================
  // MASTER DRAW FUNCTION
  // Calls the appropriate drawing function based on CONFIG flag.
  // ============================================================
  function _draw(canvas, greyValue) {
    const arrangement = CONFIG.calibration.gamma_arrangement || 'split_field';
    if (arrangement === 'centre_surround') {
      _drawCentreSurround(canvas, greyValue);
    } else {
      _drawSplitField(canvas, greyValue);
    }
  }

  // ============================================================
  // LABELS for the two patches
  // ============================================================
  function _getPatchLabels() {
    const arrangement   = CONFIG.calibration.gamma_arrangement || 'split_field';
    const orientation   = CONFIG.calibration.gamma_centre_surround_orientation
                          || 'checker_surround';
    const checkerIsSurround = (orientation === 'checker_surround');

    if (arrangement === 'split_field') {
      return { fixed: 'FIXED (checkerboard)', adjust: 'ADJUST \u2190 \u2192' };
    }
    // centre_surround
    if (checkerIsSurround) {
      return { fixed: 'FIXED (checkerboard surround)', adjust: 'ADJUST (centre disc)' };
    }
    return { fixed: 'FIXED (checkerboard disc)', adjust: 'ADJUST (surround ring)' };
  }

  // ============================================================
  // GAMMA COMPUTATION
  // ============================================================
  function _computeGamma(greyValue) {
    const n = greyValue / 255;
    if (n <= 0 || n >= 1) return null;
    return Math.log(0.5) / Math.log(n);
  }

  // ============================================================
  // CANVAS SIZE for layout labels
  // ============================================================
  function _canvasDisplayWidth() {
    const arrangement = CONFIG.calibration.gamma_arrangement || 'split_field';
    return arrangement === 'split_field'
      ? PATCH_SIZE_CSS * 2
      : PATCH_SIZE_CSS;
  }

  // ============================================================
  // PUBLIC: getNodes
  // ============================================================
  function getNodes(jsPsych) {

    const arrangement = CONFIG.calibration.gamma_arrangement || 'split_field';
    const labels      = _getPatchLabels();
    const canvasW     = _canvasDisplayWidth();

    // ---- Node 1: instruction (button click to advance) ----------------------
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

    // ---- Node 2: matching task (jsPsychCallFunction owns the DOM) -----------
    //
    // INTERACTION STRATEGY:
    //   All browsers: visible ← and → buttons adjust the grey value.
    //   Chrome/Edge only: arrow keys on the confirm button also work.
    //   Firefox: arrow keys are NOT used at all. Firefox in fullscreen mode
    //   does not reliably fire keydown on any element after programmatic
    //   focus, regardless of how focus is set. Visible buttons are the only
    //   cross-browser solution that works in all tested environments.
    //
    //   Firefox is detected via window._browserRecommended (set in main.js).
    //   On all browsers the visible buttons are shown. On Chrome/Edge the
    //   confirm button also has a keydown handler for arrow keys as a shortcut.
    const taskNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {

        const display   = jsPsych.getDisplayElement();
        const isFirefox = !window._browserRecommended; // set in main.js

        // Build label row
        let labelRow = '';
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

        // Arrow button style -- compact, square
        var arrowBtnStyle =
          'width:52px; height:52px; font-size:1.4rem; ' +
          'background:#444; color:#fff; border:2px solid #888; ' +
          'border-radius:4px; cursor:pointer; ' +
          'font-family:Georgia,serif; line-height:1; ' +
          'display:inline-flex; align-items:center; justify-content:center;';

        var keyHint = isFirefox
          ? 'Click \u2190 \u2192 to adjust \u00b7 Click Confirm when done'
          : '\u2190 \u2192 keys or buttons to adjust \u00b7 Space or Confirm button when done';

        display.innerHTML =
          '<div style="text-align:center; padding:20px 0;">' +

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

          // Control row: ← button  |  Confirm button  |  → button
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

        const canvas     = document.getElementById('gamma-canvas');
        const btnLeft    = document.getElementById('gamma-left-btn');
        const btnRight   = document.getElementById('gamma-right-btn');
        const btnConfirm = document.getElementById('gamma-confirm-btn');
        const readout    = document.getElementById('gamma-readout');

        if (!canvas || !btnConfirm) {
          window._gammaGreyMatch = INITIAL_GREY;
          display.innerHTML = '';
          done();
          return;
        }

        let greyValue = INITIAL_GREY;
        _draw(canvas, greyValue);

        function adjustGrey(delta) {
          greyValue = Math.max(0, Math.min(255, greyValue + delta));
          _draw(canvas, greyValue);
          if (readout) readout.textContent = 'Grey value: ' + greyValue;
        }

        function confirm() {
          btnLeft.removeEventListener('click', onLeft);
          btnRight.removeEventListener('click', onRight);
          btnConfirm.removeEventListener('click', onConfirm);
          btnConfirm.removeEventListener('keydown', onKey);
          window._gammaGreyMatch   = greyValue;
          window._gammaArrangement = arrangement;
          display.innerHTML = '';
          done();
        }

        // Button click handlers (work on ALL browsers)
        function onLeft()    { adjustGrey(-1); }
        function onRight()   { adjustGrey(+1); }
        function onConfirm() { confirm(); }

        btnLeft.addEventListener('click',  onLeft);
        btnRight.addEventListener('click', onRight);
        btnConfirm.addEventListener('click', onConfirm, { once: true });

        // Keyboard handler on confirm button (Chrome/Edge only shortcut)
        // Firefox: we skip this and rely entirely on button clicks
        function onKey(e) {
          if (e.code === 'ArrowLeft')                      { e.preventDefault(); adjustGrey(-1); }
          else if (e.code === 'ArrowRight')                { e.preventDefault(); adjustGrey(+1); }
          else if (e.code === 'Space' || e.key === ' ')    { e.preventDefault(); btnConfirm.click(); }
        }

        if (!isFirefox) {
          btnConfirm.addEventListener('keydown', onKey);
          setTimeout(function () { btnConfirm.focus(); }, 0);
        }
      },

      data: { calibration_step: 'gamma_task' },

      on_finish: function (data) {
        data.gamma_grey_match  = window._gammaGreyMatch;
        data.gamma_arrangement = window._gammaArrangement;
      },
    };

    // ---- Node 3: compute gamma, store, incremental save --------------------
    const storeNode = {
      type: jsPsychCallFunction,
      func: function () {
        const greyMatch = (window._gammaGreyMatch !== undefined)
          ? window._gammaGreyMatch
          : INITIAL_GREY;

        const gamma   = _computeGamma(greyMatch);
        window._estimatedGamma = gamma;

        const range   = CONFIG.calibration.gamma_exclusion_range;
        let gammaFlag = 'ok';
        if (gamma === null) {
          gammaFlag = 'invalid';
        } else if (range && (gamma < range[0] || gamma > range[1])) {
          gammaFlag = 'out_of_range';
        }
        window._gammaFlag = gammaFlag;

        console.log(
          '[Gamma] arrangement: ' + (window._gammaArrangement || 'unknown') +
          '  grey match: ' + greyMatch +
          '/255  gamma: ' + (gamma ? gamma.toFixed(3) : 'null') +
          '  flag: ' + gammaFlag
        );

        jsPsych.data.addProperties({
          estimated_gamma:          gamma !== null ? parseFloat(gamma.toFixed(3)) : null,
          gamma_grey_match_value:   greyMatch,
          gamma_flag:               gammaFlag,
          gamma_arrangement_used:   window._gammaArrangement || 'unknown',
        });

        console.log('[Platform] Calibration step complete: calibration_gamma');
      },
    };

    // ---- Node 4: out-of-range warning (button advance) ---------------------
    const warningNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        if (window._gammaFlag === 'ok') return '<div style="display:none;"></div>';
        return '<div class="ne-warning">' +
          INSTRUCTIONS.calibration_gamma_warning + '</div>';
      },
      choices: function () {
        return window._gammaFlag === 'ok'
          ? ['_skip_']
          : [INSTRUCTIONS.button_continue];
      },
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      trial_duration: function () {
        return window._gammaFlag === 'ok' ? 0 : null;
      },
      data: { calibration_step: 'gamma_warning' },
    };

    return [instructionNode, taskNode, storeNode, warningNode];
  }

  return { getNodes };

})();

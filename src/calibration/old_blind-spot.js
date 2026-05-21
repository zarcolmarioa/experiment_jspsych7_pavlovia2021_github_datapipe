// =============================================================================
// src/calibration/blind-spot.js
// Module 3: Viewing Distance Estimation -- Blind Spot Method
//
// RESPONSE MECHANISM:
//   The primary response mechanism is a VISIBLE BUTTON that the participant
//   clicks. No keyboard shortcuts are used.
//
// TRIAL FLOW:
//   1. Button appears labelled "Start trial"
//   2. Participant clicks button -> dot animation starts, button changes
//      to "Dot disappeared"
//   3. When dot disappears participant clicks button -> response recorded
//   4. Brief feedback, then repeat from step 1 for next trial
//
// CANVAS SIZING:
//   Canvas width computed from viewport at runtime so it works on all screens.
//
// GEOMETRY:
//   viewing_distance_mm = offset_mm / tan(BLIND_SPOT_RAD)
//   offset_mm = offset_css_px / px_per_mm
// =============================================================================

const BlindSpotCalibration = (function () {

  const BLIND_SPOT_DEG = 15.5;
  const BLIND_SPOT_RAD = BLIND_SPOT_DEG * (Math.PI / 180);
  const N_REPETITIONS  = 5;
  const DOT_STEP_CSS   = 4;   // CSS px per animation frame (~60fps)
  const DOT_RADIUS_CSS = 10;  // CSS px
  const FIX_SIZE_CSS   = 22;  // CSS px, fixation square side
  const CANVAS_H_CSS   = 140; // CSS px, fixed height
  const FIX_X_FRACTION = 0.12; // fixation at 12% of canvas width

  // ---------------------------------------------------------------------------
  // Internal: compute canvas CSS width from viewport
  // ---------------------------------------------------------------------------
  function _getCanvasWidth() {
    return Math.max(400, Math.min(window.innerWidth - 40, 860));
  }

  // ---------------------------------------------------------------------------
  // Internal: DPI-aware canvas setup. Returns ctx (CSS px coordinate space).
  // ---------------------------------------------------------------------------
  function _setupCanvas(canvas, widthCSS) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width        = widthCSS * dpr;
    canvas.height       = CANVAS_H_CSS * dpr;
    canvas.style.width  = widthCSS + 'px';
    canvas.style.height = CANVAS_H_CSS + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  // ---------------------------------------------------------------------------
  // Internal: draw the fixation square
  // ---------------------------------------------------------------------------
  function _drawFixation(ctx, fixX) {
    const midY = CANVAS_H_CSS / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 3;
    ctx.strokeRect(
      fixX - FIX_SIZE_CSS / 2,
      midY - FIX_SIZE_CSS / 2,
      FIX_SIZE_CSS, FIX_SIZE_CSS
    );
  }

  // ---------------------------------------------------------------------------
  // Internal: draw the "ready to start" canvas state
  // ---------------------------------------------------------------------------
  function _drawReady(ctx, canvasW, fixX, trialNum, total) {
    const midY = CANVAS_H_CSS / 2;
    ctx.clearRect(0, 0, canvasW, CANVAS_H_CSS);
    _drawFixation(ctx, fixX);
    ctx.fillStyle    = '#cccccc';
    ctx.font         = '13px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Trial ' + trialNum + ' of ' + total +
      '  \u2014  Close left eye, look at the square',
      canvasW / 2, midY + 48
    );
  }

  // ---------------------------------------------------------------------------
  // Internal: run one trial using a visible response button.
  //
  // Flow:
  //   - btn shows "Start trial" label
  //   - user clicks -> dot animation starts, btn shows "Dot disappeared"
  //   - user clicks -> offset recorded, animation stops
  //   - resolves with offset (CSS px from fixation) or null on timeout
  // ---------------------------------------------------------------------------
  function _runOneTrial(canvas, ctx, canvasW, fixX, responseBtn) {
    return new Promise(function (resolve) {
      const midY = CANVAS_H_CSS / 2;
      let dotX   = fixX + FIX_SIZE_CSS / 2 + DOT_RADIUS_CSS + 4;
      let animId = null;
      let phase  = 'waiting'; // 'waiting' | 'running' | 'done'

      function onBtnClick() {
        if (phase === 'waiting') {
          // Transition: start animation
          phase = 'running';
          responseBtn.textContent = INSTRUCTIONS.calibration_blindspot_response_button;
          responseBtn.disabled = false;
          setTimeout(function () {
            animId = requestAnimationFrame(animate);
          }, 200);

        } else if (phase === 'running') {
          // Transition: record response
          phase = 'done';
          cancelAnimationFrame(animId);
          responseBtn.removeEventListener('click', onBtnClick);
          // Draw fixation only (dot gone) as visual feedback
          ctx.clearRect(0, 0, canvasW, CANVAS_H_CSS);
          _drawFixation(ctx, fixX);
          resolve(dotX - fixX);
        }
      }

      function animate() {
        dotX += DOT_STEP_CSS;
        if (dotX > canvasW - DOT_RADIUS_CSS - 10) {
          // Timeout -- dot reached edge with no response
          cancelAnimationFrame(animId);
          responseBtn.removeEventListener('click', onBtnClick);
          phase = 'done';
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, canvasW, CANVAS_H_CSS);
        _drawFixation(ctx, fixX);
        ctx.beginPath();
        ctx.arc(dotX, midY, DOT_RADIUS_CSS, 0, Math.PI * 2);
        ctx.fillStyle = '#e63946';
        ctx.fill();
        animId = requestAnimationFrame(animate);
      }

      // Wire up button handler (click only, no keyboard)
      responseBtn.addEventListener('click', onBtnClick);

      // Set initial button state
      responseBtn.textContent = INSTRUCTIONS.calibration_blindspot_next_button;
      responseBtn.disabled    = false;
    });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------
  function _computeDistance(medianPx, pxPerMm) {
    if (!pxPerMm || pxPerMm <= 0) return null;
    return (medianPx / pxPerMm) / Math.tan(BLIND_SPOT_RAD) / 10; // cm
  }

  function _median(arr) {
    const s = arr.slice().sort(function (a, b) { return a - b; });
    const m = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // ---------------------------------------------------------------------------
  // Public: getNodes
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    // ---- Node 1: instruction (button click to advance) ----------------------
    const instructionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Display Calibration \u2014 Step 2 of 4</h2>' +
        INSTRUCTIONS.calibration_blindspot_intro +
        '</div>',
      choices: [INSTRUCTIONS.calibration_blindspot_button],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { calibration_step: 'blind_spot_instruction' },
    };

    // ---- Node 2: task (jsPsychCallFunction owns DOM) ------------------------
    const taskNode = {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {
        const display = jsPsych.getDisplayElement();
        const canvasW = _getCanvasWidth();
        const fixX    = Math.round(canvasW * FIX_X_FRACTION);

        display.innerHTML =
          '<div style="text-align:center; padding:20px 0;">' +

          '<p style="color:#ccc; font-size:0.9rem; ' +
          'max-width:' + canvasW + 'px; ' +
          'margin:0 auto 14px auto; line-height:1.6;">' +
          'Close your <strong style="color:#fff;">left eye</strong>. ' +
          'Keep your right eye fixed on the ' +
          '<strong style="color:#fff;">white square</strong>. ' +
          'Use the button below ' +
          'to start each trial, then click it again as soon as the red dot ' +
          '<strong style="color:#fff;">disappears</strong>.' +
          '</p>' +

          // Canvas
          '<canvas id="bs-canvas" ' +
          'style="display:block; margin:0 auto; background:#808080;"></canvas>' +

          // Response button
          '<div style="margin-top:16px;">' +
          '<button id="bs-btn" class="ne-continue-btn" ' +
          'style="min-width:240px; font-size:1rem;">' +
          INSTRUCTIONS.calibration_blindspot_next_button +
          '</button>' +
          '</div>' +

          '</div>';

        const canvas = document.getElementById('bs-canvas');
        const btn    = document.getElementById('bs-btn');

        if (!canvas || !btn) {
          console.error('[BlindSpot] DOM injection failed.');
          window._blindSpotOffsets = [];
          display.innerHTML = '';
          done();
          return;
        }

        const ctx     = _setupCanvas(canvas, canvasW);
        const offsets = [];

        // Draw initial ready state
        _drawReady(ctx, canvasW, fixX, 1, N_REPETITIONS);

        // Run all trials sequentially
        (async function runTrials() {
          for (let i = 0; i < N_REPETITIONS; i++) {
            _drawReady(ctx, canvasW, fixX, i + 1, N_REPETITIONS);

            const offset = await _runOneTrial(canvas, ctx, canvasW, fixX, btn);

            if (offset !== null && offset > 0) {
              offsets.push(offset);
            }

            // Brief inter-trial pause (shown after every trial, including the last)
            btn.disabled = true;
            ctx.clearRect(0, 0, canvasW, CANVAS_H_CSS);
            _drawFixation(ctx, fixX);
            ctx.fillStyle    = '#aaaaaa';
            ctx.font         = '13px monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            if (i < N_REPETITIONS - 1) {
              ctx.fillText(
                'Good. Next trial in a moment...',
                canvasW / 2, CANVAS_H_CSS / 2 + 48
              );
            } else {
              ctx.fillText(
                'Good. All trials complete.',
                canvasW / 2, CANVAS_H_CSS / 2 + 48
              );
            }
            await new Promise(function (r) { setTimeout(r, 900); });
          }

          window._blindSpotOffsets = offsets;
          display.innerHTML = '';
          done();
        })();
      },

      data: { calibration_step: 'blind_spot_task' },
      on_finish: function (data) {
        data.blind_spot_offsets_px = window._blindSpotOffsets || [];
      },
    };

    // ---- Node 3: compute & store --------------------------------------------
    const storeNode = {
      type: jsPsychCallFunction,
      func: function () {
        const offsets = window._blindSpotOffsets || [];
        const pxPerMm = window._pxPerMm || null;

        if (offsets.length === 0) {
          console.warn('[BlindSpot] No valid measurements.');
          window._viewingDistanceCm = null;
          window._blindSpotTooFar   = false;
          return;
        }

        const medianPx = _median(offsets);
        const distCm   = _computeDistance(medianPx, pxPerMm);
        window._viewingDistanceCm = distCm;

        const maxDist = CONFIG.calibration.blind_spot_max_distance_cm;
        window._blindSpotTooFar =
          maxDist !== null && distCm !== null && distCm > maxDist;

        console.log('[BlindSpot] Offsets: ' + offsets.join(', '));
        console.log('[BlindSpot] Median: ' + medianPx.toFixed(1) + ' css px');
        if (distCm !== null) {
          console.log('[BlindSpot] Distance: ' + distCm.toFixed(1) + ' cm');
        }

        jsPsych.data.addProperties({
          viewing_distance_cm:  distCm !== null ? Math.round(distCm) : null,
          blind_spot_median_px: Math.round(medianPx),
          blind_spot_n_valid:   offsets.length,
        });

        if (pxPerMm && distCm) {
          const degPerPx = (Math.atan(1 / (pxPerMm * distCm * 10)) * 180) / Math.PI;
          window._degPerPx = degPerPx;
          jsPsych.data.addProperties({
            deg_per_px: parseFloat(degPerPx.toFixed(5)),
          });
          console.log('[BlindSpot] deg/css-px: ' + degPerPx.toFixed(5));
        }

        console.log('[Platform] Calibration step complete: calibration_blind_spot');
      },
    };

    // ---- Node 4: too-far warning (button advance) ---------------------------
    const warningNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        if (!window._blindSpotTooFar) return '<div style="display:none;"></div>';
        const dist = window._viewingDistanceCm;
        return '<div class="ne-warning">' +
          INSTRUCTIONS.calibration_blindspot_too_far
            .replace('{distance}', dist ? Math.round(dist) : '??') +
          '</div>';
      },
      choices: function () {
        return window._blindSpotTooFar ? [INSTRUCTIONS.button_continue] : ['_skip_'];
      },
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      trial_duration: function () { return window._blindSpotTooFar ? null : 0; },
      data: { calibration_step: 'blind_spot_warning' },
    };

    return [instructionNode, taskNode, storeNode, warningNode];
  }

  return { getNodes };

})();

// =============================================================================
// src/calibration/resize-card.js
// Module 2: Physical Screen Size Estimation -- Credit Card Method
//
// We do NOT use the jsPsych resize plugin because it constrains aspect ratio.
// Instead we build a custom canvas-based resizer with two independent handles:
//   - A right-edge handle to adjust width
//   - A bottom-edge handle to adjust height
//
// This lets participants match a landscape credit card (85.6 x 53.98 mm)
// without being forced to maintain any particular aspect ratio.
//
// PROCEDURE:
//   Every participant completes the task TWICE.  After the first attempt
//   the aspect ratio (width / height) is checked against the expected ratio
//   for a credit card (1.585).  If the ratio falls outside a tolerance band
//   of ±0.20 (i.e. outside [1.385, 1.785]), card_ratio_warning is flagged
//   for post-hoc quality control.  All participants then see a neutral
//   instruction and perform the task a second time.  Results from both
//   attempts are stored; the final px_per_mm is the average of the two.
//
// Output stored on window and added to jsPsych data:
//   window._pxPerMm         -- final averaged pixels per mm
//   jsPsych data properties:
//     px_per_mm, screen_width_mm, screen_height_mm,
//     card_match_width_px,   card_match_height_px   (attempt 2)
//     card_match_width_px_1, card_match_height_px_1 (attempt 1)
//     card_aspect_ratio_1,   card_aspect_ratio_2
//     card_ratio_warning
// =============================================================================

const ResizeCardCalibration = (function () {

  // ISO/IEC 7810 ID-1 standard card dimensions in mm
  const CARD_WIDTH_MM  = 85.6;
  const CARD_HEIGHT_MM = 53.98;

  // Expected width-to-height aspect ratio of a standard credit card
  const CARD_EXPECTED_RATIO = CARD_WIDTH_MM / CARD_HEIGHT_MM;  // ≈ 1.585

  // Acceptable deviation from the expected ratio (±0.20)
  // Ratios outside [1.385, 1.785] suggest only one handle was dragged.
  const RATIO_TOLERANCE = 0.20;

  // Starting size of the on-screen rectangle in pixels
  const INIT_WIDTH_PX  = 300;
  const INIT_HEIGHT_PX = 180;

  // Minimum and maximum allowed sizes (prevents absurd values)
  const MIN_PX = 80;
  const MAX_PX = 700;

  // Handle size in pixels (the draggable zones)
  const HANDLE_SIZE = 18;

  // ---------------------------------------------------------------------------
  // Internal: run the interactive resize task
  // Returns a Promise that resolves to { widthPx, heightPx } when confirmed.
  // containerId: id of the DOM element that will hold the resize widget.
  // ---------------------------------------------------------------------------
  function _runResizeTask(containerId) {
    return new Promise(function (resolve) {

      const container = document.getElementById(containerId);
      if (!container) {
        resolve({ widthPx: INIT_WIDTH_PX, heightPx: INIT_HEIGHT_PX });
        return;
      }

      // ---- State
      let rectW = INIT_WIDTH_PX;
      let rectH = INIT_HEIGHT_PX;
      let dragging = null;   // null | "right" | "bottom"
      let dragStartX, dragStartY, dragStartW, dragStartH;

      // ---- Build DOM
      container.style.cssText = 'position:relative; display:inline-block; user-select:none;';

      // The card rectangle
      const card = document.createElement('div');
      card.style.cssText =
        'position:relative; background:#d4c9a8; border:3px solid #555; ' +
        'border-radius:6px; cursor:default;';

      // Right-edge handle (adjusts width)
      const handleR = document.createElement('div');
      handleR.title = 'Drag to adjust width';
      handleR.style.cssText =
        'position:absolute; right:-' + (HANDLE_SIZE / 2) + 'px; top:50%; ' +
        'transform:translateY(-50%); ' +
        'width:' + HANDLE_SIZE + 'px; height:40px; ' +
        'background:#333; border-radius:4px; cursor:ew-resize; ' +
        'display:flex; align-items:center; justify-content:center;';
      handleR.innerHTML =
        '<span style="color:#aaa; font-size:14px; pointer-events:none;">&#8596;</span>';

      // Bottom-edge handle (adjusts height)
      const handleB = document.createElement('div');
      handleB.title = 'Drag to adjust height';
      handleB.style.cssText =
        'position:absolute; bottom:-' + (HANDLE_SIZE / 2) + 'px; left:50%; ' +
        'transform:translateX(-50%); ' +
        'height:' + HANDLE_SIZE + 'px; width:40px; ' +
        'background:#333; border-radius:4px; cursor:ns-resize; ' +
        'display:flex; align-items:center; justify-content:center;';
      handleB.innerHTML =
        '<span style="color:#aaa; font-size:14px; pointer-events:none;">&#8597;</span>';

      // Label inside the card
      const label = document.createElement('div');
      label.style.cssText =
        'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); ' +
        'font-family:Georgia,serif; font-size:13px; color:#666; text-align:center; ' +
        'pointer-events:none; white-space:nowrap;';

      // Confirm button (below the card)
      const btn = document.createElement('button');
      btn.textContent = INSTRUCTIONS.calibration_resize_confirm;
      btn.style.cssText =
        'display:block; margin:32px auto 0 auto; padding:12px 32px; ' +
        'background:#333; color:#fff; border:none; border-radius:4px; ' +
        'font-size:1rem; font-family:Georgia,serif; cursor:pointer;';
      btn.addEventListener('mouseover', function () { btn.style.background = '#555'; });
      btn.addEventListener('mouseout',  function () { btn.style.background = '#333'; });

      card.appendChild(handleR);
      card.appendChild(handleB);
      card.appendChild(label);
      container.appendChild(card);
      container.appendChild(btn);

      // ---- Render function
      function render() {
        card.style.width  = rectW + 'px';
        card.style.height = rectH + 'px';
        label.innerHTML =
          'Resize to match your card<br>' +
          '<span style="font-size:11px; color:#999;">' +
          rectW + ' &times; ' + rectH + ' px</span>';
      }

      render();

      // ---- Drag logic
      function onMouseDown(e, axis) {
        e.preventDefault();
        dragging   = axis;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartW = rectW;
        dragStartH = rectH;
      }

      function onMouseMove(e) {
        if (!dragging) return;
        if (dragging === 'right') {
          rectW = Math.max(MIN_PX, Math.min(MAX_PX, dragStartW + (e.clientX - dragStartX)));
        } else if (dragging === 'bottom') {
          rectH = Math.max(MIN_PX, Math.min(MAX_PX, dragStartH + (e.clientY - dragStartY)));
        }
        render();
      }

      function onMouseUp() { dragging = null; }

      handleR.addEventListener('mousedown', function (e) { onMouseDown(e, 'right'); });
      handleB.addEventListener('mousedown', function (e) { onMouseDown(e, 'bottom'); });
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);

      // ---- Confirm
      btn.addEventListener('click', function () {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
        resolve({ widthPx: rectW, heightPx: rectH });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Internal: build a resize trial node for a given attempt number.
  // Uses a unique containerId per attempt to avoid DOM conflicts.
  // ---------------------------------------------------------------------------
  function _makeResizeNode(jsPsych, attemptNumber) {
    const containerId = 'resize-card-container-' + attemptNumber;
    return {
      type: jsPsychHtmlKeyboardResponse,
      stimulus:
        '<div style="text-align:center;">' +
        '<p style="color:#ddd; margin-bottom:24px; font-family:monospace; font-size:0.85rem;">' +
        'Drag the handles to match your card, then click the button below.' +
        '</p>' +
        '<div id="' + containerId + '" style="display:inline-block;"></div>' +
        '</div>',
      choices: 'NO_KEYS',
      trial_duration: null,
      on_start: function () {
        // Wait a tick for the DOM to render before running the resize task.
        setTimeout(function () {
          _runResizeTask(containerId).then(function (result) {
            if (attemptNumber === 1) {
              window._resizeAttempt1 = result;
            } else {
              window._resizeAttempt2 = result;
            }
            jsPsych.finishTrial({
              calibration_step: 'resize_card_task',
              resize_attempt:   attemptNumber,
              resize_width_px:  result.widthPx,
              resize_height_px: result.heightPx,
            });
          });
        }, 80);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Public: returns jsPsych timeline node array
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    // ---- Node 1: initial instruction --------------------------------------
    const instructionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Display Calibration &mdash; Step 1 of 4</h2>' +
        INSTRUCTIONS.calibration_resize_intro +
        '</div>',
      choices: [INSTRUCTIONS.calibration_resize_button],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { calibration_step: 'resize_card_instruction' },
    };

    // ---- Node 2: first resize attempt ------------------------------------
    const resizeNode1 = _makeResizeNode(jsPsych, 1);

    // ---- Node 3: evaluate first attempt, log aspect ratio flag -----------
    const evalNode1 = {
      type: jsPsychCallFunction,
      func: function () {
        const r1    = window._resizeAttempt1;
        const ratio = r1.widthPx / r1.heightPx;
        const outsideTolerance =
          ratio < (CARD_EXPECTED_RATIO - RATIO_TOLERANCE) ||
          ratio > (CARD_EXPECTED_RATIO + RATIO_TOLERANCE);

        window._cardAspectRatio1   = ratio;
        window._cardRatioWarning   = outsideTolerance;

        console.log(
          '[ResizeCard] Attempt 1 — width: ' + r1.widthPx + 'px, height: ' + r1.heightPx + 'px' +
          ', ratio: ' + ratio.toFixed(3) +
          ' (expected: ' + CARD_EXPECTED_RATIO.toFixed(3) + ')' +
          (outsideTolerance ? ' — outside tolerance [flagged]' : ' — within tolerance')
        );
      },
    };

    // ---- Node 4: neutral retry instruction --------------------------------
    // Shown to ALL participants regardless of first-attempt quality.
    const retryInstructionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Display Calibration &mdash; Step 1 of 4 (second measurement)</h2>' +
        INSTRUCTIONS.calibration_resize_retry +
        '</div>',
      choices: [INSTRUCTIONS.calibration_resize_button],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { calibration_step: 'resize_card_retry_instruction' },
    };

    // ---- Node 5: second resize attempt ------------------------------------
    const resizeNode2 = _makeResizeNode(jsPsych, 2);

    // ---- Node 6: compute and store final results --------------------------
    // px_per_mm is the average of both attempts (each attempt itself averaged
    // across width and height axes).
    const storeNode = {
      type: jsPsychCallFunction,
      func: function () {
        const r1 = window._resizeAttempt1;
        const r2 = window._resizeAttempt2;

        if (!r1 || !r2) {
          console.warn('[ResizeCard] Missing attempt data.');
          return;
        }

        // px/mm from each attempt: average the width-derived and height-derived values
        const pxPerMm1 = (r1.widthPx / CARD_WIDTH_MM + r1.heightPx / CARD_HEIGHT_MM) / 2;
        const pxPerMm2 = (r2.widthPx / CARD_WIDTH_MM + r2.heightPx / CARD_HEIGHT_MM) / 2;

        // Final px/mm: average across both attempts
        const pxPerMmFinal = (pxPerMm1 + pxPerMm2) / 2;
        window._pxPerMm = pxPerMmFinal;

        const ratio2      = r2.widthPx / r2.heightPx;
        const screenW     = window.screen.width;
        const screenH     = window.screen.height;

        jsPsych.data.addProperties({
          px_per_mm:              parseFloat(pxPerMmFinal.toFixed(3)),
          // Second (final) attempt
          card_match_width_px:    r2.widthPx,
          card_match_height_px:   r2.heightPx,
          // Both attempts for quality control
          card_match_width_px_1:  r1.widthPx,
          card_match_height_px_1: r1.heightPx,
          card_aspect_ratio_1:    parseFloat(window._cardAspectRatio1.toFixed(3)),
          card_match_width_px_2:  r2.widthPx,
          card_match_height_px_2: r2.heightPx,
          card_aspect_ratio_2:    parseFloat(ratio2.toFixed(3)),
          card_ratio_warning:     window._cardRatioWarning,
          screen_width_mm:        Math.round(screenW / pxPerMmFinal),
          screen_height_mm:       Math.round(screenH / pxPerMmFinal),
        });

        console.log('[ResizeCard] Attempt 1 — ' + pxPerMm1.toFixed(3) + ' px/mm');
        console.log('[ResizeCard] Attempt 2 — ' + pxPerMm2.toFixed(3) + ' px/mm');
        console.log('[ResizeCard] Final averaged px/mm: ' + pxPerMmFinal.toFixed(3));
        console.log(
          '[ResizeCard] Estimated screen: ' +
          Math.round(screenW / pxPerMmFinal) + ' mm × ' +
          Math.round(screenH / pxPerMmFinal) + ' mm'
        );
        console.log('[Platform] Calibration step complete: calibration_resize_card');
      },
    };

    return [
      instructionNode,
      resizeNode1,
      evalNode1,
      retryInstructionNode,
      resizeNode2,
      storeNode,
    ];
  }

  return { getNodes };

})();

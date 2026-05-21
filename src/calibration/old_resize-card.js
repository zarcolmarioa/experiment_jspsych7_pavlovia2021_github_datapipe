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
// Output stored on window and added to jsPsych data:
//   window._pxPerMm         -- pixels per mm (derived from width match)
//   jsPsych data properties: px_per_mm, screen_width_mm, screen_height_mm
// =============================================================================

const ResizeCardCalibration = (function () {

  // ISO/IEC 7810 ID-1 standard card dimensions in mm
  const CARD_WIDTH_MM  = 85.6;
  const CARD_HEIGHT_MM = 53.98;

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
  // ---------------------------------------------------------------------------
  function _runResizeTask(containerId) {
    return new Promise(function (resolve) {

      const container = document.getElementById(containerId);
      if (!container) { resolve({ widthPx: INIT_WIDTH_PX, heightPx: INIT_HEIGHT_PX }); return; }

      // ---- State
      let rectW = INIT_WIDTH_PX;
      let rectH = INIT_HEIGHT_PX;
      let dragging = null;   // null | "right" | "bottom"
      let dragStartX, dragStartY, dragStartW, dragStartH;

      // ---- Build DOM
      container.style.cssText = "position:relative; display:inline-block; user-select:none;";

      // The card rectangle
      const card = document.createElement("div");
      card.style.cssText =
        "position:relative; background:#d4c9a8; border:3px solid #555; " +
        "border-radius:6px; cursor:default;";

      // Right-edge handle (adjusts width)
      const handleR = document.createElement("div");
      handleR.title = "Drag to adjust width";
      handleR.style.cssText =
        "position:absolute; right:-" + (HANDLE_SIZE/2) + "px; top:50%; " +
        "transform:translateY(-50%); " +
        "width:" + HANDLE_SIZE + "px; height:40px; " +
        "background:#333; border-radius:4px; cursor:ew-resize; " +
        "display:flex; align-items:center; justify-content:center;";
      handleR.innerHTML = '<span style="color:#aaa; font-size:14px; pointer-events:none;">&#8596;</span>';

      // Bottom-edge handle (adjusts height)
      const handleB = document.createElement("div");
      handleB.title = "Drag to adjust height";
      handleB.style.cssText =
        "position:absolute; bottom:-" + (HANDLE_SIZE/2) + "px; left:50%; " +
        "transform:translateX(-50%); " +
        "height:" + HANDLE_SIZE + "px; width:40px; " +
        "background:#333; border-radius:4px; cursor:ns-resize; " +
        "display:flex; align-items:center; justify-content:center;";
      handleB.innerHTML = '<span style="color:#aaa; font-size:14px; pointer-events:none;">&#8597;</span>';

      // Label inside the card
      const label = document.createElement("div");
      label.style.cssText =
        "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); " +
        "font-family:Georgia,serif; font-size:13px; color:#666; text-align:center; " +
        "pointer-events:none; white-space:nowrap;";

      // Confirm button (below the card)
      const btn = document.createElement("button");
      btn.textContent = INSTRUCTIONS.calibration_resize_confirm;
      btn.style.cssText =
        "display:block; margin:32px auto 0 auto; padding:12px 32px; " +
        "background:#333; color:#fff; border:none; border-radius:4px; " +
        "font-size:1rem; font-family:Georgia,serif; cursor:pointer;";
      btn.addEventListener("mouseover",  function () { btn.style.background = "#555"; });
      btn.addEventListener("mouseout",   function () { btn.style.background = "#333"; });

      card.appendChild(handleR);
      card.appendChild(handleB);
      card.appendChild(label);
      container.appendChild(card);
      container.appendChild(btn);

      // ---- Render function
      function render() {
        card.style.width  = rectW + "px";
        card.style.height = rectH + "px";
        label.innerHTML =
          "Resize to match your card<br>" +
          '<span style="font-size:11px; color:#999;">' +
          rectW + " &times; " + rectH + " px</span>";
      }

      render();

      // ---- Drag logic
      function onMouseDown(e, axis) {
        e.preventDefault();
        dragging    = axis;
        dragStartX  = e.clientX;
        dragStartY  = e.clientY;
        dragStartW  = rectW;
        dragStartH  = rectH;
      }

      function onMouseMove(e) {
        if (!dragging) return;
        if (dragging === "right") {
          const newW = dragStartW + (e.clientX - dragStartX);
          rectW = Math.max(MIN_PX, Math.min(MAX_PX, newW));
        } else if (dragging === "bottom") {
          const newH = dragStartH + (e.clientY - dragStartY);
          rectH = Math.max(MIN_PX, Math.min(MAX_PX, newH));
        }
        render();
      }

      function onMouseUp() { dragging = null; }

      handleR.addEventListener("mousedown", function (e) { onMouseDown(e, "right"); });
      handleB.addEventListener("mousedown", function (e) { onMouseDown(e, "bottom"); });
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup",   onMouseUp);

      // ---- Confirm
      btn.addEventListener("click", function () {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup",   onMouseUp);
        resolve({ widthPx: rectW, heightPx: rectH });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Public: returns jsPsych timeline node array
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    // Node 1: instruction
    const instructionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Display Calibration -- Step 1 of 4</h2>' +
        INSTRUCTIONS.calibration_resize_intro +
        '</div>',
      choices: [INSTRUCTIONS.calibration_resize_button],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { calibration_step: "resize_card_instruction" },
    };

    // Node 2: the custom resize task
    const resizeNode = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus:
        '<div style="text-align:center;">' +
        '<p style="color:#ddd; margin-bottom:24px; font-family:monospace; font-size:0.85rem;">' +
        'Drag the handles to match your card, then click the button below.' +
        '</p>' +
        '<div id="resize-card-container" style="display:inline-block;"></div>' +
        '</div>',
      choices: "NO_KEYS",
      trial_duration: null,
      on_start: function () {
        // Wait a tick for DOM to render before running the resize task
        setTimeout(function () {
          _runResizeTask("resize-card-container").then(function (result) {
            window._resizeResult = result;
            jsPsych.finishTrial({
              calibration_step:    "resize_card_task",
              resize_width_px:     result.widthPx,
              resize_height_px:    result.heightPx,
            });
          });
        }, 80);
      },
    };

    // Node 3: compute and store px/mm ratio
    const storeNode = {
      type: jsPsychCallFunction,
      func: function () {
        const result = window._resizeResult;
        if (!result) {
          console.warn("[ResizeCard] No resize result found.");
          window._pxPerMm = null;
          return;
        }

        // Derive px/mm from BOTH width and height matches, then average them.
        // Using the average reduces error from imprecise dragging on either axis.
        const pxPerMmFromWidth  = result.widthPx  / CARD_WIDTH_MM;
        const pxPerMmFromHeight = result.heightPx / CARD_HEIGHT_MM;
        const pxPerMm = (pxPerMmFromWidth + pxPerMmFromHeight) / 2;

        window._pxPerMm = pxPerMm;

        const screenW = window.screen.width;
        const screenH = window.screen.height;
        const screenWidthMm  = screenW / pxPerMm;
        const screenHeightMm = screenH / pxPerMm;

        jsPsych.data.addProperties({
          px_per_mm:        parseFloat(pxPerMm.toFixed(3)),
          card_match_width_px:  result.widthPx,
          card_match_height_px: result.heightPx,
          screen_width_mm:  Math.round(screenWidthMm),
          screen_height_mm: Math.round(screenHeightMm),
        });

        console.log(
          "[ResizeCard] Width match: " + result.widthPx + "px = " + CARD_WIDTH_MM + "mm" +
          " -> " + pxPerMmFromWidth.toFixed(3) + " px/mm"
        );
        console.log(
          "[ResizeCard] Height match: " + result.heightPx + "px = " + CARD_HEIGHT_MM + "mm" +
          " -> " + pxPerMmFromHeight.toFixed(3) + " px/mm"
        );
        console.log("[ResizeCard] Average px/mm: " + pxPerMm.toFixed(3));
        console.log(
          "[ResizeCard] Estimated screen: " +
          Math.round(screenWidthMm) + "mm x " + Math.round(screenHeightMm) + "mm"
        );
        // Incremental save
        console.log('[Platform] Calibration step complete: calibration_resize_card');
      },
    };

    return [instructionNode, resizeNode, storeNode];
  }

  return { getNodes };

})();

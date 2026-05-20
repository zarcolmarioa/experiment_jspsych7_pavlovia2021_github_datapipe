// =============================================================================
// src/calibration/device-screen.js
// Module 1 of the calibration battery: Device & Screen Screening
//
// What it does:
//   - Queries JavaScript for device/screen properties
//   - Logs them to jsPsych data (so they appear in every exported row)
//   - Checks for mobile/touch-only devices and excludes (hard stop)
//   - Warns if viewport is narrower than the minimum required (780 px)
//   - Warns if colour depth is below 24-bit
//   - Re-measures viewport width after the zoom warning is dismissed
//   - Uses feature detection rather than user-agent sniffing where possible
//
// Output added to jsPsych.data.addProperties():
//   screen_width_px, screen_height_px, window_width_px, window_height_px,
//   device_pixel_ratio, viewport_screen_ratio, viewport_meets_minimum,
//   is_fullscreen, touch_points, user_agent, browser_language,
//   platform (deprecated but informative), color_depth_bits,
//   warn_viewport_small, warn_color_depth,
//   viewport_width_post_zoom_warning, viewport_meets_minimum_after
//   (last two only logged when the zoom warning is shown)
// =============================================================================

const DeviceScreenCalibration = (function () {

  // Minimum viewport width (px) needed to display stimuli without overflow.
  const MIN_VIEWPORT_WIDTH = 780;

  // ---------------------------------------------------------------------------
  // Internal: collect all device/screen metrics
  // Returns a plain object — safe to pass to jsPsych.data.addProperties()
  // ---------------------------------------------------------------------------
  function _collectMetrics() {
    const innerW  = window.innerWidth;
    const screenW = window.screen.width;
    return {
      screen_width_px:        screenW,
      screen_height_px:       window.screen.height,
      window_width_px:        innerW,
      window_height_px:       window.innerHeight,
      device_pixel_ratio:     window.devicePixelRatio || 1,
      viewport_screen_ratio:  parseFloat((innerW / screenW).toFixed(3)),
      viewport_meets_minimum: innerW >= MIN_VIEWPORT_WIDTH,
      is_fullscreen:          !!document.fullscreenElement,
      touch_points:           navigator.maxTouchPoints || 0,
      user_agent:             navigator.userAgent,
      browser_language:       navigator.language,
      // navigator.platform is deprecated but still informative for logging
      platform:               navigator.platform || 'unknown',
      color_depth_bits:       window.screen.colorDepth,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: evaluate metrics and return warning/exclusion flags
  // Returns {
  //   touch_excluded:      bool   -- hard exclusion, participant cannot continue
  //   warn_viewport_small: bool   -- soft warning, viewport < MIN_VIEWPORT_WIDTH
  //   warn_color_depth:    bool   -- soft warning, colour depth < 24-bit
  // }
  // ---------------------------------------------------------------------------
  function _checkEligibility(metrics) {
    // Hard exclusion: touch-only devices (no fine pointer = no mouse/trackpad).
    // maxTouchPoints > 0 alone is not enough; many laptops have touch screens.
    // We additionally verify the absence of a fine pointer.
    const touchOnly =
      metrics.touch_points > 0 &&
      !window.matchMedia('(pointer: fine)').matches;

    // Soft warning: viewport narrower than the minimum needed for stimuli.
    const warnViewport = metrics.window_width_px < MIN_VIEWPORT_WIDTH;

    // Soft warning: colour depth below 24-bit (can occur in remote desktop
    // sessions or when the participant has manually reduced colour depth).
    const warnColorDepth = metrics.color_depth_bits < 24;

    if (warnViewport) {
      console.warn('[DeviceScreen] Viewport too narrow: ' +
        metrics.window_width_px + 'px (minimum: ' + MIN_VIEWPORT_WIDTH + 'px)');
    }
    if (warnColorDepth) {
      console.warn('[DeviceScreen] Colour depth below 24-bit: ' +
        metrics.color_depth_bits + '-bit');
    }
    if (!touchOnly && !warnViewport && !warnColorDepth) {
      console.log('[DeviceScreen] All checks passed.');
    }

    return {
      touch_excluded:      touchOnly,
      warn_viewport_small: warnViewport,
      warn_color_depth:    warnColorDepth,
    };
  }

  // ---------------------------------------------------------------------------
  // Public: returns a jsPsych timeline node array
  // Designed to be spread into the main timeline:
  //   timeline.push.apply(timeline, DeviceScreenCalibration.getNodes(jsPsych))
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    // ---- Node 1: collect metrics, evaluate checks, store to jsPsych data --
    const collectNode = {
      type: jsPsychCallFunction,
      func: function () {
        const metrics = _collectMetrics();
        const checks  = _checkEligibility(metrics);

        // Merge warning flags into the metrics object so all properties
        // are written to jsPsych data in a single call.
        metrics.warn_viewport_small = checks.warn_viewport_small;
        metrics.warn_color_depth    = checks.warn_color_depth;

        // Store on jsPsych data so all subsequent trial rows include them.
        jsPsych.data.addProperties(metrics);

        // Also stash on window so subsequent nodes can read the flags.
        window._deviceMetrics        = metrics;
        window._deviceTouchExcluded  = checks.touch_excluded;
        window._warnViewport         = checks.warn_viewport_small;
        window._warnColorDepth       = checks.warn_color_depth;

        console.log('[DeviceScreen] Metrics collected:', metrics);
        console.log('[Platform] Calibration step complete: calibration_device_screen');
      },
    };

    // ---- Node 2: hard exclusion screen (touch-only devices) ---------------
    // Participant is shown an exclusion message and cannot advance.
    // All other participants pass through this node instantly (0 ms duration).
    const exclusionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        if (window._deviceTouchExcluded) {
          return '<div class="ne-warning">' + INSTRUCTIONS.device_excluded + '</div>';
        }
        return '<div style="display:none"></div>';
      },
      choices: function () {
        // No button for excluded participants — they are stuck (soft exclusion).
        return window._deviceTouchExcluded ? [] : ['_skip_'];
      },
      trial_duration: function () {
        return window._deviceTouchExcluded ? null : 0;
      },
      data: { calibration_step: 'device_screen_exclusion' },
    };

    // ---- Node 3: soft warning — viewport too narrow -----------------------
    // Shown only when window_width_px < MIN_VIEWPORT_WIDTH.
    // After the participant clicks Continue, viewport width is re-measured
    // so we can tell whether they acted on the instruction.
    const zoomWarningNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        if (!window._warnViewport) return '<div style="display:none"></div>';
        return '<div class="ne-warning">' +
          INSTRUCTIONS.warn_zoom
            .replace('{width}', window.innerWidth) +
          '</div>';
      },
      choices: function () {
        return window._warnViewport ? [INSTRUCTIONS.button_continue] : ['_skip_'];
      },
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      trial_duration: function () {
        return window._warnViewport ? null : 0;
      },
      on_finish: function (data) {
        // Re-measure viewport after the participant has had a chance to
        // reduce their browser zoom. Stored for post-hoc quality control.
        const widthAfter  = window.innerWidth;
        const meetsAfter  = widthAfter >= MIN_VIEWPORT_WIDTH;
        data.viewport_width_post_zoom_warning = widthAfter;
        data.viewport_meets_minimum_after     = meetsAfter;
        jsPsych.data.addProperties({
          viewport_width_post_zoom_warning: widthAfter,
          viewport_meets_minimum_after:     meetsAfter,
        });
        console.log('[DeviceScreen] Viewport after zoom warning: ' +
          widthAfter + 'px (meets minimum: ' + meetsAfter + ')');
      },
      data: { calibration_step: 'device_screen_zoom_warning' },
    };

    // ---- Node 4: soft warning — colour depth below 24-bit ----------------
    // Shown only when color_depth_bits < 24.
    // Participant may continue regardless — logged for post-hoc filtering.
    const colorDepthWarningNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        if (!window._warnColorDepth) return '<div style="display:none"></div>';
        return '<div class="ne-warning">' +
          INSTRUCTIONS.warn_color_depth
            .replace('{depth}', window.screen.colorDepth) +
          '</div>';
      },
      choices: function () {
        return window._warnColorDepth ? [INSTRUCTIONS.button_continue] : ['_skip_'];
      },
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      trial_duration: function () {
        return window._warnColorDepth ? null : 0;
      },
      data: { calibration_step: 'device_screen_color_depth_warning' },
    };

    return [collectNode, exclusionNode, zoomWarningNode, colorDepthWarningNode];
  }

  // Public API
  return { getNodes };

})();
